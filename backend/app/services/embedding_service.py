import asyncio
import logging
from typing import List, Optional, Any
import numpy as np
from sentence_transformers import SentenceTransformer
import torch
from app.core.config import settings

logger = logging.getLogger(__name__)

class EmbeddingService:
    """Service for generating embeddings using sentence-transformers"""
    
    def __init__(self):
        self.model_name = settings.EMBEDDING_MODEL
        self.model: Optional[SentenceTransformer] = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
    async def initialize(self):
        """Initialize the embedding model"""
        try:
            logger.info(f"Loading embedding model {self.model_name} on {self.device}")
            
            # Run model loading in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            self.model = await loop.run_in_executor(
                None,
                lambda: SentenceTransformer(self.model_name, device=self.device)
            )
            
            # Test the model
            test_embedding = await self.encode_text("test")
            logger.info(f"Embedding model loaded successfully. Dimension: {len(test_embedding)}")
            
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            raise Exception(f"Failed to initialize embedding service: {str(e)}")
    
    async def close(self):
        """Clean up resources"""
        if self.model:
            # Clear GPU memory if using CUDA
            if self.device == "cuda":
                torch.cuda.empty_cache()
            self.model = None
    
    async def encode_text(self, text: str) -> List[float]:
        """Encode a single text into embedding"""
        if not self.model:
            raise Exception("Embedding model not initialized")
        
        try:
            # Run encoding in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            embedding = await loop.run_in_executor(
                None,
                lambda: self.model.encode([text], convert_to_tensor=False)[0]
            )
            
            return embedding.tolist()
            
        except Exception as e:
            logger.error(f"Failed to encode text: {e}")
            raise Exception(f"Failed to generate embedding: {str(e)}")
    
    async def encode_texts(self, texts: List[str]) -> List[List[float]]:
        """Encode multiple texts into embeddings with batching"""
        if not self.model:
            raise Exception("Embedding model not initialized")
        
        try:
            # Process in smaller batches to avoid memory issues
            batch_size = 32
            all_embeddings = []
            
            for i in range(0, len(texts), batch_size):
                batch_texts = texts[i:i + batch_size]
                logger.info(f"Processing embedding batch {i//batch_size + 1}/{(len(texts) + batch_size - 1)//batch_size}")
                
                # Run encoding in thread pool to avoid blocking
                loop = asyncio.get_event_loop()
                batch_embeddings = await loop.run_in_executor(
                    None,
                    lambda: self.model.encode(batch_texts, convert_to_tensor=False, show_progress_bar=False)
                )
                
                all_embeddings.extend([emb.tolist() for emb in batch_embeddings])
            
            return all_embeddings
            
        except Exception as e:
            logger.error(f"Failed to encode texts: {e}")
            raise Exception(f"Failed to generate embeddings: {str(e)}")
    
    async def similarity_search(
        self,
        query_embedding: List[float],
        candidate_embeddings: List[List[float]],
        threshold: float = None
    ) -> List[tuple[int, float]]:
        """Calculate similarity between query and candidates"""
        if threshold is None:
            threshold = settings.SIMILARITY_THRESHOLD
        
        try:
            query_emb = np.array(query_embedding)
            candidate_embs = np.array(candidate_embeddings)
            
            # Calculate cosine similarity
            similarities = np.dot(candidate_embs, query_emb) / (
                np.linalg.norm(candidate_embs, axis=1) * np.linalg.norm(query_emb)
            )
            
            # Get results above threshold
            results = []
            for idx, sim in enumerate(similarities):
                if sim >= threshold:
                    results.append((idx, float(sim)))
            
            # Sort by similarity (descending)
            results.sort(key=lambda x: x[1], reverse=True)
            
            # Limit results
            return results[:settings.MAX_RESULTS]
            
        except Exception as e:
            logger.error(f"Failed to calculate similarity: {e}")
            return []
    
    def preprocess_text_for_embedding(self, text: str) -> str:
        """Preprocess text before embedding (Romanian-specific)"""
        if not text:
            return ""
        
        # Basic cleaning
        text = text.strip()
        
        # Remove excessive whitespace
        import re
        text = re.sub(r'\s+', ' ', text)
        
        # Remove very short texts
        if len(text.split()) < 3:
            return ""
        
        # Romanian-specific preprocessing could be added here
        # For now, keep it simple as sentence-transformers handles most cases
        
        return text
    
    async def get_embedding_dimension(self) -> int:
        """Get the dimension of embeddings produced by the model"""
        if not self.model:
            raise Exception("Embedding model not initialized")
        
        # Test with a simple text
        test_embedding = await self.encode_text("test")
        return len(test_embedding)