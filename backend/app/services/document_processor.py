import asyncio
import logging
import os
from typing import List, Dict, Any, Optional
from pathlib import Path
import uuid

import pypdf
import docx
from io import BytesIO

from app.core.config import settings
from app.services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)

class DocumentProcessor:
    """Service for processing and chunking documents"""
    
    def __init__(self, embedding_service: EmbeddingService):
        self.embedding_service = embedding_service
        self.chunk_size = settings.CHUNK_SIZE
        self.chunk_overlap = settings.CHUNK_OVERLAP
    
    async def process_document(
        self,
        file_path: str,
        document_id: str,
        municipality_id: str
    ) -> List[Dict[str, Any]]:
        """Process a document and return chunks with embeddings"""
        try:
            # Extract text from document
            text_content = await self._extract_text(file_path)
            if not text_content:
                raise ValueError("No text content extracted from document")
            
            # Split into chunks
            chunks = await self._split_into_chunks(text_content)
            if not chunks:
                raise ValueError("No chunks created from document")
            
            # Generate embeddings for chunks
            chunk_texts = [chunk["content"] for chunk in chunks]
            embeddings = await self.embedding_service.encode_texts(chunk_texts)
            
            # Combine chunks with embeddings
            processed_chunks = []
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                processed_chunk = {
                    "document_id": document_id,
                    "municipality_id": municipality_id,
                    "content": chunk["content"],
                    "embedding": embedding,
                    "chunk_index": i,
                    "page_number": chunk.get("page_number"),
                    "chunk_metadata": {
                        "char_count": len(chunk["content"]),
                        "word_count": len(chunk["content"].split()),
                        "source_file": os.path.basename(file_path),
                        **chunk.get("metadata", {})
                    }
                }
                processed_chunks.append(processed_chunk)
            
            logger.info(f"Processed document {document_id}: {len(processed_chunks)} chunks created")
            return processed_chunks
            
        except Exception as e:
            logger.error(f"Failed to process document {file_path}: {e}")
            raise
    
    async def _extract_text(self, file_path: str) -> str:
        """Extract text from various document formats"""
        file_extension = Path(file_path).suffix.lower()
        
        try:
            if file_extension == '.pdf':
                return await self._extract_text_from_pdf(file_path)
            elif file_extension in ['.doc', '.docx']:
                return await self._extract_text_from_docx(file_path)
            elif file_extension == '.txt':
                return await self._extract_text_from_txt(file_path)
            else:
                raise ValueError(f"Unsupported file format: {file_extension}")
                
        except Exception as e:
            logger.error(f"Failed to extract text from {file_path}: {e}")
            raise
    
    async def _extract_text_from_pdf(self, file_path: str) -> str:
        """Extract text from PDF file"""
        def extract_pdf_text():
            text_content = []
            try:
                with open(file_path, 'rb') as file:
                    pdf_reader = pypdf.PdfReader(file)
                    for page_num, page in enumerate(pdf_reader.pages):
                        try:
                            page_text = page.extract_text()
                            if page_text.strip():
                                # Add page marker for reference
                                text_content.append(f"[Pagina {page_num + 1}]\n{page_text}\n")
                        except Exception as e:
                            logger.warning(f"Failed to extract text from page {page_num + 1}: {e}")
                            continue
                    
                return "\n".join(text_content)
            except Exception as e:
                logger.error(f"Error reading PDF file {file_path}: {e}")
                raise
        
        # Run in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, extract_pdf_text)
    
    async def _extract_text_from_docx(self, file_path: str) -> str:
        """Extract text from DOCX file"""
        def extract_docx_text():
            try:
                doc = docx.Document(file_path)
                paragraphs = []
                for para in doc.paragraphs:
                    if para.text.strip():
                        paragraphs.append(para.text)
                return "\n".join(paragraphs)
            except Exception as e:
                logger.error(f"Error reading DOCX file {file_path}: {e}")
                raise
        
        # Run in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, extract_docx_text)
    
    async def _extract_text_from_txt(self, file_path: str) -> str:
        """Extract text from TXT file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                return file.read()
        except UnicodeDecodeError:
            # Try with different encoding
            with open(file_path, 'r', encoding='latin-1') as file:
                return file.read()
    
    async def _split_into_chunks(self, text: str) -> List[Dict[str, Any]]:
        """Split text into overlapping chunks optimized for performance"""
        if not text.strip():
            return []
        
        # Simple word-based chunking for better performance
        words = text.split()
        chunks = []
        current_chunk = []
        page_number = None
        
        i = 0
        while i < len(words):
            word = words[i]
            
            # Extract page number if present
            if word == "[Pagina" and i + 1 < len(words):
                try:
                    page_number = int(words[i + 1].rstrip("]"))
                    i += 2  # Skip page marker
                    continue
                except (IndexError, ValueError):
                    pass
            
            current_chunk.append(word)
            
            # If chunk is full, create it and start new one
            if len(current_chunk) >= self.chunk_size:
                chunk_content = " ".join(current_chunk).strip()
                if chunk_content:
                    chunks.append({
                        "content": chunk_content,
                        "page_number": page_number,
                        "metadata": {"word_count": len(current_chunk)}
                    })
                
                # Start new chunk with overlap
                if self.chunk_overlap > 0 and len(current_chunk) > self.chunk_overlap:
                    current_chunk = current_chunk[-self.chunk_overlap:]
                else:
                    current_chunk = []
            
            i += 1
        
        # Add final chunk if not empty
        if current_chunk:
            chunk_content = " ".join(current_chunk).strip()
            if chunk_content:
                chunks.append({
                    "content": chunk_content,
                    "page_number": page_number,
                    "metadata": {"word_count": len(current_chunk)}
                })
        
        return chunks
    
    def _split_into_sentences(self, text: str) -> List[str]:
        """Split text into sentences (Romanian-aware)"""
        import re
        
        # Romanian sentence endings
        sentence_endings = r'[.!?]+\s+'
        
        # Split but keep the ending punctuation
        sentences = re.split(f'({sentence_endings})', text)
        
        # Recombine sentences with their endings
        combined_sentences = []
        for i in range(0, len(sentences) - 1, 2):
            sentence = sentences[i]
            if i + 1 < len(sentences):
                sentence += sentences[i + 1].strip()
            
            if sentence.strip():
                combined_sentences.append(sentence.strip())
        
        # Handle case where text doesn't end with sentence ending
        if len(sentences) % 2 == 1 and sentences[-1].strip():
            combined_sentences.append(sentences[-1].strip())
        
        return combined_sentences
    
    def get_supported_formats(self) -> List[str]:
        """Get list of supported document formats"""
        return ['.pdf', '.doc', '.docx', '.txt']
    
    def validate_file_format(self, filename: str) -> bool:
        """Validate if file format is supported"""
        file_extension = Path(filename).suffix.lower()
        return file_extension in self.get_supported_formats()