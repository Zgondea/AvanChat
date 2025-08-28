import asyncio
import logging
import os
import re
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
    
    async def process_text_content(
        self,
        text_content: str,
        document_id: str,
        municipality_id: str,
        source_name: str = "web_content"
    ) -> List[Dict[str, Any]]:
        """Process text content directly (for URLs) and return chunks with embeddings"""
        try:
            if not text_content:
                raise ValueError("No text content provided")
            
            # Split into chunks
            chunks = await self._split_into_chunks(text_content)
            if not chunks:
                raise ValueError("No chunks created from text content")
            
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
                        "source": source_name,
                        **chunk.get("metadata", {})
                    }
                }
                processed_chunks.append(processed_chunk)
            
            logger.info(f"Processed text content for document {document_id}: {len(processed_chunks)} chunks created")
            return processed_chunks
            
        except Exception as e:
            logger.error(f"Failed to process text content for document {document_id}: {e}")
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
        """Split text into chunks with improved legal document handling"""
        if not text.strip():
            return []
        
        # Check if this appears to be a legal document
        is_legal = self._is_legal_document(text)
        
        if is_legal:
            # Use legal-specific chunking
            chunks = self._split_legal_document(text)
        else:
            # Use original word-based chunking for other documents
            chunks = self._split_word_based(text)
        
        return chunks if chunks else self._split_word_based(text)

    def _is_legal_document(self, text: str) -> bool:
        """Check if text appears to be a legal document"""
        legal_indicators = ['ART.', 'ARTICOL', 'CAPITOL', 'TITLU', 'Codul fiscal', 'Legea', 'ORDONANȚĂ']
        text_sample = text[:3000].upper()  # Check first 3000 characters
        
        legal_count = sum(1 for indicator in legal_indicators if indicator in text_sample)
        return legal_count >= 2

    def _split_legal_document(self, text: str) -> List[Dict[str, Any]]:
        """Split legal documents by articles and logical sections"""
        chunks = []
        
        # Split by articles first - improved regex
        article_pattern = r'(ART\.\s*\d+[^\n]*\n(?:[^\n]*\n)*?)(?=ART\.\s*\d+|CAPITOL|TITLU|$)'
        articles = re.findall(article_pattern, text, re.DOTALL | re.IGNORECASE)
        
        if not articles:
            # Fallback: try different patterns
            article_pattern = r'((?:ART\.|ARTICOL)\s*[^.]*\.(?:[^A][^R][^T][^.])*?)(?=(?:ART\.|ARTICOL)|$)'
            articles = re.findall(article_pattern, text, re.DOTALL | re.IGNORECASE)
        
        if articles and len(articles) > 1:  # Only use if we found multiple articles
            for i, article in enumerate(articles):
                article = article.strip()
                if len(article) > 50:  # Skip very short matches
                    # If article is too long, split it further
                    if len(article) > 2000:
                        sub_chunks = self._split_long_article(article)
                        for j, sub_chunk in enumerate(sub_chunks):
                            chunks.append({
                                "content": sub_chunk.strip(),
                                "page_number": 1,
                                "metadata": {
                                    "article_number": i + 1,
                                    "sub_chunk": j + 1 if len(sub_chunks) > 1 else None,
                                    "document_type": "legal_article",
                                    "word_count": len(sub_chunk.split())
                                }
                            })
                    else:
                        chunks.append({
                            "content": article,
                            "page_number": 1,
                            "metadata": {
                                "article_number": i + 1,
                                "document_type": "legal_article",
                                "word_count": len(article.split())
                            }
                        })
        
        return chunks

    def _split_long_article(self, article: str) -> List[str]:
        """Split long articles into smaller coherent chunks"""
        chunks = []
        
        # Try to split by numbered paragraphs first: (1), (2), etc.
        paragraphs = re.split(r'\n\s*\(\d+\)', article)
        
        if len(paragraphs) > 1:
            current_chunk = ""
            for i, paragraph in enumerate(paragraphs):
                paragraph = paragraph.strip()
                if not paragraph:
                    continue
                    
                # Add paragraph number back if not first paragraph
                if i > 0:
                    paragraph = f"({i}) {paragraph}"
                
                # If adding this paragraph would make chunk too long, save current and start new
                if len(current_chunk) + len(paragraph) > 1800 and current_chunk:
                    chunks.append(current_chunk)
                    current_chunk = paragraph
                else:
                    if current_chunk:
                        current_chunk += "\n" + paragraph
                    else:
                        current_chunk = paragraph
            
            # Add final chunk
            if current_chunk:
                chunks.append(current_chunk)
        
        # If no good paragraph splits, fall back to sentence-based splitting
        if not chunks or len(chunks) == 1:
            return self._split_by_sentences(article, 1800)
        
        return chunks

    def _split_by_sentences(self, text: str, max_length: int) -> List[str]:
        """Split text by sentences, keeping chunks under max_length"""
        # Split on sentence endings
        sentences = re.split(r'(?<=[.!?])\s+', text)
        chunks = []
        current_chunk = ""
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
                
            if len(current_chunk) + len(sentence) > max_length and current_chunk:
                chunks.append(current_chunk)
                current_chunk = sentence
            else:
                if current_chunk:
                    current_chunk += " " + sentence
                else:
                    current_chunk = sentence
        
        if current_chunk:
            chunks.append(current_chunk)
        
        return chunks if chunks else [text]

    def _split_word_based(self, text: str) -> List[Dict[str, Any]]:
        """Original word-based chunking for general documents"""
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