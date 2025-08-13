import logging
import hashlib
import json
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import redis.asyncio as redis
from app.core.config import settings
from app.services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)

class SmartCacheService:
    """Intelligent cache system for chat responses with similarity matching"""
    
    def __init__(self):
        self.redis_client = None
        self.embedding_service = None
        self.cache_ttl = 86400 * 7  # 7 days
        self.similarity_threshold = 0.85  # High similarity for cache hits
        
    async def initialize(self):
        """Initialize Redis connection and embedding service"""
        try:
            self.redis_client = redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
            await self.redis_client.ping()
            
            self.embedding_service = EmbeddingService()
            if not self.embedding_service.model:
                await self.embedding_service.initialize()
                
            logger.info("Smart cache service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize smart cache: {e}")
            self.redis_client = None
    
    def _generate_cache_key(self, question: str, municipality_id: str) -> str:
        """Generate cache key from question and municipality"""
        # Normalize question for better cache hits
        normalized = question.lower().strip()
        
        # Create hash from normalized question + municipality
        content = f"{normalized}:{municipality_id}"
        return f"chat_cache:{hashlib.md5(content.encode()).hexdigest()}"
    
    def _generate_embedding_key(self, municipality_id: str) -> str:
        """Generate key for storing question embeddings"""
        return f"question_embeddings:{municipality_id}"
    
    async def get_cached_response(
        self, 
        question: str, 
        municipality_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get cached response for identical or similar questions
        Returns None if no suitable cache entry found
        """
        if not self.redis_client:
            return None
            
        try:
            # 1. Check for exact match first (fastest)
            exact_key = self._generate_cache_key(question, municipality_id)
            cached_response = await self.redis_client.get(exact_key)
            
            if cached_response:
                logger.info(f"Cache HIT (exact): {question[:50]}...")
                result = json.loads(cached_response)
                result["cache_type"] = "exact"
                return result
            
            # 2. Check for similar questions using embeddings
            similar_response = await self._find_similar_cached_question(
                question, municipality_id
            )
            
            if similar_response:
                logger.info(f"Cache HIT (similar): {question[:50]}...")
                similar_response["cache_type"] = "similar"
                return similar_response
                
            logger.info(f"Cache MISS: {question[:50]}...")
            return None
            
        except Exception as e:
            logger.error(f"Error retrieving from cache: {e}")
            return None
    
    async def _find_similar_cached_question(
        self, 
        question: str, 
        municipality_id: str
    ) -> Optional[Dict[str, Any]]:
        """Find cached responses for similar questions using embeddings"""
        try:
            # Get embedding for current question
            question_embedding = await self.embedding_service.encode_text(question)
            
            # Get all cached question embeddings for this municipality
            embeddings_key = self._generate_embedding_key(municipality_id)
            cached_embeddings = await self.redis_client.hgetall(embeddings_key)
            
            best_similarity = 0.0
            best_cache_key = None
            
            # Compare with all cached question embeddings
            for cache_key, embedding_json in cached_embeddings.items():
                try:
                    cached_embedding = json.loads(embedding_json)["embedding"]
                    
                    # Calculate cosine similarity
                    similarity = self._cosine_similarity(
                        question_embedding, cached_embedding
                    )
                    
                    if similarity > best_similarity and similarity >= self.similarity_threshold:
                        best_similarity = similarity
                        best_cache_key = cache_key
                        
                except Exception as e:
                    logger.warning(f"Error processing cached embedding: {e}")
                    continue
            
            # If we found a similar question, return its cached response
            if best_cache_key:
                cached_response = await self.redis_client.get(best_cache_key)
                if cached_response:
                    result = json.loads(cached_response)
                    result["similarity_score"] = best_similarity
                    logger.info(f"Found similar cached question with {best_similarity:.2%} similarity")
                    return result
            
            return None
            
        except Exception as e:
            logger.error(f"Error finding similar cached questions: {e}")
            return None
    
    def _cosine_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """Calculate cosine similarity between two embeddings"""
        import math
        
        dot_product = sum(a * b for a, b in zip(embedding1, embedding2))
        magnitude1 = math.sqrt(sum(a * a for a in embedding1))
        magnitude2 = math.sqrt(sum(a * a for a in embedding2))
        
        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0
            
        return dot_product / (magnitude1 * magnitude2)
    
    async def cache_response(
        self,
        question: str,
        municipality_id: str,
        response_data: Dict[str, Any]
    ) -> bool:
        """Cache a response for future use"""
        if not self.redis_client:
            return False
            
        try:
            # Generate cache key
            cache_key = self._generate_cache_key(question, municipality_id)
            
            # Prepare response data for caching
            cache_data = {
                **response_data,
                "cached_at": datetime.utcnow().isoformat(),
                "original_question": question,
                "municipality_id": municipality_id
            }
            
            # Cache the response
            await self.redis_client.setex(
                cache_key,
                self.cache_ttl,
                json.dumps(cache_data, ensure_ascii=False)
            )
            
            # Store question embedding for similarity matching
            await self._cache_question_embedding(question, municipality_id, cache_key)
            
            logger.info(f"Cached response for: {question[:50]}...")
            return True
            
        except Exception as e:
            logger.error(f"Error caching response: {e}")
            return False
    
    async def _cache_question_embedding(
        self,
        question: str,
        municipality_id: str,
        cache_key: str
    ) -> bool:
        """Cache question embedding for similarity matching"""
        try:
            # Generate embedding for the question
            question_embedding = await self.embedding_service.encode_text(question)
            
            # Store embedding with metadata
            embedding_data = {
                "embedding": question_embedding,
                "question": question,
                "cached_at": datetime.utcnow().isoformat()
            }
            
            # Store in Redis hash for this municipality
            embeddings_key = self._generate_embedding_key(municipality_id)
            await self.redis_client.hset(
                embeddings_key,
                cache_key,
                json.dumps(embedding_data, ensure_ascii=False)
            )
            
            # Set TTL on the embeddings hash
            await self.redis_client.expire(embeddings_key, self.cache_ttl)
            
            return True
            
        except Exception as e:
            logger.error(f"Error caching question embedding: {e}")
            return False
    
    async def get_cache_stats(self, municipality_id: str) -> Dict[str, Any]:
        """Get cache statistics for a municipality"""
        if not self.redis_client:
            return {"error": "Cache not available"}
            
        try:
            embeddings_key = self._generate_embedding_key(municipality_id)
            cached_questions_count = await self.redis_client.hlen(embeddings_key)
            
            # Get memory info
            memory_info = await self.redis_client.info("memory")
            
            return {
                "cached_questions": cached_questions_count,
                "municipality_id": municipality_id,
                "cache_ttl_hours": self.cache_ttl // 3600,
                "similarity_threshold": self.similarity_threshold,
                "memory_used_mb": round(memory_info.get("used_memory", 0) / 1024 / 1024, 2)
            }
            
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {"error": str(e)}
    
    async def clear_cache(self, municipality_id: Optional[str] = None) -> bool:
        """Clear cache for specific municipality or all cache"""
        if not self.redis_client:
            return False
            
        try:
            if municipality_id:
                # Clear cache for specific municipality
                embeddings_key = self._generate_embedding_key(municipality_id)
                
                # Get all cache keys for this municipality
                cached_embeddings = await self.redis_client.hgetall(embeddings_key)
                
                # Delete individual response caches
                if cached_embeddings:
                    await self.redis_client.delete(*cached_embeddings.keys())
                
                # Delete embeddings hash
                await self.redis_client.delete(embeddings_key)
                
                logger.info(f"Cleared cache for municipality: {municipality_id}")
            else:
                # Clear all cache
                await self.redis_client.flushdb()
                logger.info("Cleared all cache")
                
            return True
            
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")
            return False
    
    async def close(self):
        """Close Redis connection"""
        if self.redis_client:
            await self.redis_client.close()
            
    async def healthcheck(self) -> Dict[str, Any]:
        """Check cache service health"""
        if not self.redis_client:
            return {"status": "unhealthy", "error": "Redis not connected"}
            
        try:
            await self.redis_client.ping()
            return {"status": "healthy", "redis_connected": True}
        except Exception as e:
            return {"status": "unhealthy", "error": str(e)}