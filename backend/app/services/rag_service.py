import logging
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from app.models.document import DocumentChunk, Document
from app.models.municipality import Municipality
from app.services.embedding_service import EmbeddingService
from app.services.ollama_service import OllamaService
from app.core.config import settings

logger = logging.getLogger(__name__)

class RAGService:
    """Retrieval-Augmented Generation service for legislative documents"""
    
    def __init__(
        self,
        embedding_service: EmbeddingService,
        ollama_service: OllamaService
    ):
        self.embedding_service = embedding_service
        self.ollama_service = ollama_service
        self.similarity_threshold = settings.SIMILARITY_THRESHOLD
        self.max_results = settings.MAX_RESULTS
    
    async def search_relevant_chunks(
        self,
        db: AsyncSession,
        query: str,
        municipality_id: str,
        limit: int = None
    ) -> List[Tuple[DocumentChunk, float]]:
        """Search for relevant document chunks using vector similarity"""
        try:
            # Generate embedding for the query
            query_embedding = await self.embedding_service.encode_text(query)
            
            # Search for similar chunks in the database
            limit = limit or self.max_results
            
            # Using pgvector cosine similarity
            similarity_query = select(
                DocumentChunk,
                DocumentChunk.embedding.cosine_distance(query_embedding).label("distance")
            ).where(
                and_(
                    DocumentChunk.municipality_id == municipality_id,
                    DocumentChunk.embedding.cosine_distance(query_embedding) < (1 - self.similarity_threshold)
                )
            ).options(
                selectinload(DocumentChunk.document)
            ).order_by(
                DocumentChunk.embedding.cosine_distance(query_embedding)
            ).limit(limit)
            
            result = await db.execute(similarity_query)
            chunks_with_distance = result.all()
            
            # Convert distance to similarity score (cosine distance = 1 - cosine similarity)
            chunks_with_similarity = [
                (chunk, 1 - distance) for chunk, distance in chunks_with_distance
            ]
            
            logger.info(f"Found {len(chunks_with_similarity)} relevant chunks for query in municipality {municipality_id}")
            return chunks_with_similarity
            
        except Exception as e:
            logger.error(f"Failed to search relevant chunks: {e}")
            return []
    
    async def generate_response(
        self,
        db: AsyncSession,
        question: str,
        municipality_id: str,
        conversation_history: List[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Generate a response using RAG"""
        try:
            # Get municipality info
            municipality_query = select(Municipality).where(Municipality.id == municipality_id)
            result = await db.execute(municipality_query)
            municipality = result.scalar_one_or_none()
            
            if not municipality:
                raise ValueError(f"Municipality {municipality_id} not found")
            
            # Search for relevant chunks
            relevant_chunks = await self.search_relevant_chunks(
                db, question, municipality_id
            )
            
            if not relevant_chunks:
                return {
                    "response": "Îmi pare rău, dar nu am găsit informații relevante pentru întrebarea dumneavoastră în documentele disponibile. Vă rog să reformulați întrebarea sau să contactați direct primăria pentru informații suplimentare.",
                    "sources": [],
                    "confidence": 0.0
                }
            
            # Prepare context from relevant chunks
            context_parts = []
            sources = []
            
            for chunk, similarity in relevant_chunks:
                context_parts.append(f"[Document: {chunk.document.original_filename}]\n{chunk.content}")
                
                source_info = {
                    "document_id": str(chunk.document_id),
                    "document_name": chunk.document.original_filename,
                    "page_number": chunk.page_number,
                    "chunk_index": chunk.chunk_index,
                    "similarity": similarity,
                    "content_preview": chunk.content[:200] + "..." if len(chunk.content) > 200 else chunk.content
                }
                sources.append(source_info)
            
            context = "\n\n---\n\n".join(context_parts)
            
            # Generate response using Ollama
            response_text = await self.ollama_service.generate_legislative_response(
                question=question,
                context=context,
                municipality_name=municipality.name
            )
            
            # Calculate average confidence based on similarity scores
            avg_confidence = sum(sim for _, sim in relevant_chunks) / len(relevant_chunks)
            
            return {
                "response": response_text,
                "sources": sources,
                "confidence": avg_confidence,
                "municipality": {
                    "id": str(municipality.id),
                    "name": municipality.name
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to generate RAG response: {e}")
            return {
                "response": "A apărut o eroare la procesarea întrebării dumneavoastră. Vă rog să încercați din nou sau să contactați suportul tehnic.",
                "sources": [],
                "confidence": 0.0,
                "error": str(e)
            }
    
    async def get_document_statistics(
        self,
        db: AsyncSession,
        municipality_id: str
    ) -> Dict[str, Any]:
        """Get statistics about documents for a municipality"""
        try:
            # Count total documents
            total_docs_query = select(Document).where(
                Document.municipality_id == municipality_id
            )
            total_docs_result = await db.execute(total_docs_query)
            total_documents = len(total_docs_result.all())
            
            # Count processed documents
            processed_docs_query = select(Document).where(
                and_(
                    Document.municipality_id == municipality_id,
                    Document.is_processed == True
                )
            )
            processed_docs_result = await db.execute(processed_docs_query)
            processed_documents = len(processed_docs_result.all())
            
            # Count total chunks
            total_chunks_query = select(DocumentChunk).where(
                DocumentChunk.municipality_id == municipality_id
            )
            total_chunks_result = await db.execute(total_chunks_query)
            total_chunks = len(total_chunks_result.all())
            
            return {
                "total_documents": total_documents,
                "processed_documents": processed_documents,
                "total_chunks": total_chunks,
                "processing_percentage": (processed_documents / total_documents * 100) if total_documents > 0 else 0
            }
            
        except Exception as e:
            logger.error(f"Failed to get document statistics: {e}")
            return {
                "total_documents": 0,
                "processed_documents": 0,
                "total_chunks": 0,
                "processing_percentage": 0
            }
    
    async def reindex_municipality_documents(
        self,
        db: AsyncSession,
        municipality_id: str
    ) -> bool:
        """Reindex all documents for a municipality (regenerate embeddings)"""
        try:
            # Get all chunks for the municipality
            chunks_query = select(DocumentChunk).where(
                DocumentChunk.municipality_id == municipality_id
            )
            result = await db.execute(chunks_query)
            chunks = result.scalars().all()
            
            if not chunks:
                logger.info(f"No chunks found for municipality {municipality_id}")
                return True
            
            logger.info(f"Reindexing {len(chunks)} chunks for municipality {municipality_id}")
            
            # Process chunks in batches
            batch_size = 50
            for i in range(0, len(chunks), batch_size):
                batch = chunks[i:i + batch_size]
                
                # Generate new embeddings
                texts = [chunk.content for chunk in batch]
                embeddings = await self.embedding_service.encode_texts(texts)
                
                # Update chunks with new embeddings
                for chunk, embedding in zip(batch, embeddings):
                    chunk.embedding = embedding
                
                await db.commit()
                logger.info(f"Processed batch {i//batch_size + 1}/{(len(chunks) + batch_size - 1)//batch_size}")
            
            logger.info(f"Successfully reindexed all chunks for municipality {municipality_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to reindex documents for municipality {municipality_id}: {e}")
            await db.rollback()
            return False