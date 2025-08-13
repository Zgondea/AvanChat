import logging
import asyncio
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, text
from sqlalchemy.orm import selectinload

from app.models.document import DocumentChunk, Document
from app.models.municipality import Municipality
from app.services.embedding_service import EmbeddingService
from app.services.ollama_service import OllamaService
from app.services.smart_cache_service import SmartCacheService
from app.core.config import settings

logger = logging.getLogger(__name__)

class AdvancedRAGService:
    """Advanced RAG service with hybrid search capabilities"""
    
    def __init__(
        self,
        embedding_service: EmbeddingService,
        ollama_service: OllamaService
    ):
        self.embedding_service = embedding_service
        self.ollama_service = ollama_service
        self.max_results = settings.MAX_RESULTS
        self.cache_service = SmartCacheService()
    
    async def hybrid_search(
        self,
        db: AsyncSession,
        query: str,
        municipality_id: str,
        limit: int = None
    ) -> List[Tuple[DocumentChunk, float]]:
        """Advanced hybrid search combining multiple strategies"""
        try:
            limit = limit or self.max_results
            
            # 1. Keyword search (exact matches)
            keyword_chunks = await self._keyword_search(db, query, municipality_id, limit)
            
            # 2. Semantic search (vector similarity)
            semantic_chunks = await self._semantic_search(db, query, municipality_id, limit)
            
            # 3. Fuzzy text search (PostgreSQL full-text)
            fuzzy_chunks = await self._fuzzy_search(db, query, municipality_id, limit)
            
            # 4. Combine and rank results
            combined_results = self._combine_search_results(
                keyword_chunks, semantic_chunks, fuzzy_chunks
            )
            
            logger.info(f"Hybrid search found {len(combined_results)} relevant chunks")
            return combined_results[:limit]
            
        except Exception as e:
            logger.error(f"Hybrid search failed: {e}")
            return []
    
    async def _keyword_search(
        self,
        db: AsyncSession,
        query: str,
        municipality_id: str,
        limit: int
    ) -> List[Tuple[DocumentChunk, float]]:
        """Exact keyword matching search"""
        try:
            # Split query into keywords
            keywords = query.lower().split()
            results = []
            
            for keyword in keywords:
                if len(keyword) > 2:  # Skip very short words
                    # Search for exact keyword matches
                    keyword_query = select(DocumentChunk).where(
                        and_(
                            DocumentChunk.municipality_id == municipality_id,
                            DocumentChunk.content.ilike(f"%{keyword}%")
                        )
                    ).options(selectinload(DocumentChunk.document)).limit(limit)
                    
                    result = await db.execute(keyword_query)
                    chunks = result.scalars().all()
                    
                    # Calculate keyword density as score
                    for chunk in chunks:
                        content_lower = chunk.content.lower()
                        keyword_count = content_lower.count(keyword.lower())
                        density = keyword_count / len(content_lower.split()) if content_lower else 0
                        results.append((chunk, min(0.9, density * 10)))  # Cap at 0.9
            
            return results
            
        except Exception as e:
            logger.error(f"Keyword search failed: {e}")
            return []
    
    async def _semantic_search(
        self,
        db: AsyncSession,
        query: str,
        municipality_id: str,
        limit: int
    ) -> List[Tuple[DocumentChunk, float]]:
        """Vector similarity search"""
        try:
            # Generate embedding for the query
            query_embedding = await self.embedding_service.encode_text(query)
            
            # Use cosine similarity with relaxed threshold
            similarity_query = select(
                DocumentChunk,
                DocumentChunk.embedding.cosine_distance(query_embedding).label("distance")
            ).where(
                and_(
                    DocumentChunk.municipality_id == municipality_id,
                    DocumentChunk.embedding.cosine_distance(query_embedding) < 0.8  # More relaxed
                )
            ).options(
                selectinload(DocumentChunk.document)
            ).order_by(
                DocumentChunk.embedding.cosine_distance(query_embedding)
            ).limit(limit)
            
            result = await db.execute(similarity_query)
            chunks_with_distance = result.all()
            
            # Convert distance to similarity score
            results = [(chunk, 1 - distance) for chunk, distance in chunks_with_distance]
            return results
            
        except Exception as e:
            logger.error(f"Semantic search failed: {e}")
            return []
    
    async def _fuzzy_search(
        self,
        db: AsyncSession,
        query: str,
        municipality_id: str,
        limit: int
    ) -> List[Tuple[DocumentChunk, float]]:
        """PostgreSQL full-text search with fuzzy matching"""
        try:
            # Create search terms for PostgreSQL full-text search
            search_terms = ' | '.join(query.split())  # OR search
            
            fuzzy_query = text("""
                SELECT c.*, 
                       ts_rank(to_tsvector('romanian', c.content), plainto_tsquery('romanian', :search_terms)) as rank
                FROM document_chunks c
                WHERE c.municipality_id = :municipality_id
                  AND to_tsvector('romanian', c.content) @@ plainto_tsquery('romanian', :search_terms)
                ORDER BY rank DESC
                LIMIT :limit
            """)
            
            result = await db.execute(fuzzy_query, {
                'search_terms': query,
                'municipality_id': municipality_id,
                'limit': limit
            })
            
            results = []
            for row in result:
                # Get the full DocumentChunk object
                chunk_query = select(DocumentChunk).where(DocumentChunk.id == row.id).options(
                    selectinload(DocumentChunk.document)
                )
                chunk_result = await db.execute(chunk_query)
                chunk = chunk_result.scalar_one_or_none()
                
                if chunk:
                    results.append((chunk, float(row.rank)))
            
            return results
            
        except Exception as e:
            logger.error(f"Fuzzy search failed: {e}")
            return []
    
    def _combine_search_results(
        self,
        keyword_results: List[Tuple[DocumentChunk, float]],
        semantic_results: List[Tuple[DocumentChunk, float]],
        fuzzy_results: List[Tuple[DocumentChunk, float]]
    ) -> List[Tuple[DocumentChunk, float]]:
        """Combine and rank results from different search strategies"""
        
        # Create a dict to combine scores for same chunks
        chunk_scores = {}
        
        # Add keyword results with high weight
        for chunk, score in keyword_results:
            chunk_id = chunk.id
            if chunk_id not in chunk_scores:
                chunk_scores[chunk_id] = {'chunk': chunk, 'scores': []}
            chunk_scores[chunk_id]['scores'].append(('keyword', score * 2.0))  # High weight
        
        # Add semantic results with medium weight
        for chunk, score in semantic_results:
            chunk_id = chunk.id
            if chunk_id not in chunk_scores:
                chunk_scores[chunk_id] = {'chunk': chunk, 'scores': []}
            chunk_scores[chunk_id]['scores'].append(('semantic', score * 1.0))  # Normal weight
        
        # Add fuzzy results with medium weight
        for chunk, score in fuzzy_results:
            chunk_id = chunk.id
            if chunk_id not in chunk_scores:
                chunk_scores[chunk_id] = {'chunk': chunk, 'scores': []}
            chunk_scores[chunk_id]['scores'].append(('fuzzy', score * 1.5))  # Higher weight
        
        # Calculate combined scores
        final_results = []
        for chunk_id, data in chunk_scores.items():
            chunk = data['chunk']
            scores = data['scores']
            
            # Weighted average with boost for multiple search matches
            total_score = sum(score for _, score in scores)
            match_bonus = len(scores) * 0.1  # Bonus for being found by multiple methods
            final_score = (total_score + match_bonus) / len(scores)
            
            final_results.append((chunk, min(1.0, final_score)))  # Cap at 1.0
        
        # Sort by final score descending
        final_results.sort(key=lambda x: x[1], reverse=True)
        return final_results
    
    async def generate_response(
        self,
        db: AsyncSession,
        question: str,
        municipality_id: str,
        conversation_history: List[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Generate response using advanced RAG with intelligent caching"""
        try:
            # Initialize cache if needed
            if not self.cache_service.redis_client:
                await self.cache_service.initialize()
            
            # 1. Check cache first (fastest path)
            cached_response = await self.cache_service.get_cached_response(
                question, municipality_id
            )
            
            if cached_response:
                # Return cached response with cache info
                cached_response["response_time"] = "instant (cached)"
                return cached_response
            
            # 2. No cache hit - proceed with full RAG pipeline
            # Get municipality info
            municipality_query = select(Municipality).where(Municipality.id == municipality_id)
            result = await db.execute(municipality_query)
            municipality = result.scalar_one_or_none()
            
            if not municipality:
                raise ValueError(f"Municipality {municipality_id} not found")
            
            # Use hybrid search for better results
            relevant_chunks = await self.hybrid_search(
                db, question, municipality_id
            )
            
            if not relevant_chunks:
                return {
                    "response": "Îmi pare rău, dar nu am găsit informații relevante pentru întrebarea dumneavoastră în documentele disponibile. Vă rog să reformulați întrebarea sau să contactați direct primăria pentru informații suplimentare.",
                    "sources": [],
                    "confidence": 0.0
                }
            
            # Prepare enhanced context
            context_parts = []
            sources = []
            
            for chunk, similarity in relevant_chunks:
                # Enhanced context with metadata
                chunk_context = f"""
[Document: {chunk.document.original_filename}, Pagina: {chunk.page_number or 'N/A'}]
Relevanță: {similarity:.2%}
Conținut: {chunk.content}
"""
                context_parts.append(chunk_context)
                
                source_info = {
                    "document_id": str(chunk.document_id),
                    "document_name": chunk.document.original_filename,
                    "page_number": chunk.page_number,
                    "chunk_index": chunk.chunk_index,
                    "similarity": similarity,
                    "content_preview": chunk.content[:200] + "..." if len(chunk.content) > 200 else chunk.content,
                    "search_strategy": "hybrid"
                }
                sources.append(source_info)
            
            context = "\n\n---\n\n".join(context_parts)
            
            # Enhanced system prompt
            enhanced_prompt = f"""Ești un asistent AI expert în legislația fiscală românească. 

INSTRUCȚIUNI IMPORTANTE:
1. Răspunde DOAR pe baza informațiilor din contextul furnizat
2. Dacă informația există în context, răspunde detaliat și precis
3. Citează întotdeauna sursa (document, pagină) 
4. Dacă nu găsești informația exactă, spune clar că nu ai suficiente detalii
5. Răspunde în română, concis dar complet
6. Folosește numerotarea și structurarea pentru claritate

Context legislativ disponibil:
{context[:3000]}  

Municipalitate: {municipality.name}
"""
            
            # Generate response
            response_text = await self.ollama_service.generate_legislative_response(
                question=question,
                context=enhanced_prompt,
                municipality_name=municipality.name
            )
            
            # Calculate average confidence
            avg_confidence = sum(sim for _, sim in relevant_chunks) / len(relevant_chunks)
            
            # Prepare response
            response_data = {
                "response": response_text,
                "sources": sources,
                "confidence": avg_confidence,
                "municipality": {
                    "id": str(municipality.id),
                    "name": municipality.name
                },
                "search_strategy": "hybrid_advanced",
                "response_time": "generated (new)"
            }
            
            # 3. Cache the response for future use
            await self.cache_service.cache_response(
                question, municipality_id, response_data
            )
            
            return response_data
            
        except Exception as e:
            logger.error(f"Failed to generate advanced RAG response: {e}")
            return {
                "response": "A apărut o eroare la procesarea întrebării dumneavoastră. Vă rog să încercați din nou sau să contactați suportul tehnic.",
                "sources": [],
                "confidence": 0.0,
                "error": str(e)
            }