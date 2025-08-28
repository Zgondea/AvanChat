import aiohttp
import asyncio
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import logging
from typing import Dict, Optional, List
import re
from datetime import datetime

logger = logging.getLogger(__name__)

class WebScrapingService:
    def __init__(self):
        self.session = None
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }

    async def initialize(self):
        """Initialize aiohttp session"""
        if not self.session:
            timeout = aiohttp.ClientTimeout(total=600)  # 10 minutes for large documents like ANAF
            self.session = aiohttp.ClientSession(
                headers=self.headers,
                timeout=timeout
            )

    async def close(self):
        """Close aiohttp session"""
        if self.session:
            await self.session.close()
            self.session = None

    async def extract_content_from_url(self, url: str) -> Dict[str, any]:
        """
        Extract content from a URL
        
        Returns:
            Dict containing:
            - content: Extracted text content
            - title: Page title
            - metadata: Additional metadata
            - year: Detected year from content/URL
            - success: Boolean indicating success
            - error: Error message if failed
        """
        try:
            await self.initialize()
            
            logger.info(f"Extracting content from URL: {url}")
            
            async with self.session.get(url) as response:
                if response.status != 200:
                    return {
                        'success': False,
                        'error': f'HTTP {response.status}: {response.reason}',
                        'content': '',
                        'title': '',
                        'metadata': {},
                        'year': None
                    }
                
                html_content = await response.text()
                soup = BeautifulSoup(html_content, 'html.parser')
                
                # Extract title
                title_element = soup.find('title')
                title = title_element.get_text().strip() if title_element else 'Untitled'
                
                # Remove script and style elements
                for script in soup(["script", "style", "nav", "footer", "header", "aside", "form"]):
                    script.decompose()
                
                # Special processing for legal/fiscal documents
                content = self._extract_structured_legal_content(soup, url)
                
                if not content:
                    # Fallback to general extraction
                    content_selectors = [
                        'main', 'article', '.content', '#content', 
                        '.post-content', '.entry-content', '.article-content'
                    ]
                    
                    main_content = None
                    for selector in content_selectors:
                        main_content = soup.select_one(selector)
                        if main_content:
                            break
                    
                    if not main_content:
                        main_content = soup.find('body') or soup
                    
                    # Extract text content with better structure preservation
                    content = self._extract_structured_text(main_content)
                
                # Clean up content
                content = re.sub(r'\n\s*\n', '\n\n', content)  # Remove multiple empty lines
                content = re.sub(r'[ \t]+', ' ', content)  # Remove extra spaces
                
                # Extract year from content or URL
                year = self._extract_year(content, url, title)
                
                # Extract metadata
                metadata = {
                    'url': url,
                    'domain': urlparse(url).netloc,
                    'extracted_at': datetime.utcnow().isoformat(),
                    'content_length': len(content),
                    'language': self._detect_language(content)
                }
                
                # Extract meta description
                meta_desc = soup.find('meta', attrs={'name': 'description'})
                if meta_desc:
                    metadata['description'] = meta_desc.get('content', '')
                
                logger.info(f"Successfully extracted {len(content)} characters from {url}")
                
                return {
                    'success': True,
                    'error': None,
                    'content': content,
                    'title': title,
                    'metadata': metadata,
                    'year': year
                }
                
        except asyncio.TimeoutError:
            error_msg = f"Timeout while accessing {url}"
            logger.error(error_msg)
            return {
                'success': False,
                'error': error_msg,
                'content': '',
                'title': '',
                'metadata': {},
                'year': None
            }
            
        except Exception as e:
            error_msg = f"Error extracting content from {url}: {str(e)}"
            logger.error(error_msg)
            return {
                'success': False,
                'error': error_msg,
                'content': '',
                'title': '',
                'metadata': {},
                'year': None
            }

    def _extract_year(self, content: str, url: str, title: str) -> Optional[int]:
        """Extract year from content, URL, or title"""
        current_year = datetime.now().year
        
        # Look for years in URL first
        url_years = re.findall(r'20\d{2}', url)
        if url_years:
            years = [int(y) for y in url_years if 2010 <= int(y) <= current_year]
            if years:
                return max(years)  # Return the most recent year
        
        # Look for years in title
        title_years = re.findall(r'20\d{2}', title)
        if title_years:
            years = [int(y) for y in title_years if 2010 <= int(y) <= current_year]
            if years:
                return max(years)
        
        # Look for years in content (first few paragraphs)
        content_preview = content[:2000]  # First 2000 characters
        content_years = re.findall(r'20\d{2}', content_preview)
        if content_years:
            years = [int(y) for y in content_years if 2010 <= int(y) <= current_year]
            if years:
                # Return the most frequent year, or the most recent if tie
                from collections import Counter
                year_counts = Counter(years)
                most_common_year = year_counts.most_common(1)[0][0]
                return most_common_year
        
        return None

    def _detect_language(self, content: str) -> str:
        """Simple language detection based on common words"""
        romanian_words = ['și', 'cu', 'în', 'de', 'la', 'pe', 'pentru', 'din', 'că', 'dacă', 'sau']
        english_words = ['and', 'the', 'of', 'to', 'in', 'for', 'with', 'on', 'at', 'by']
        
        content_lower = content.lower()
        
        romanian_count = sum(1 for word in romanian_words if f' {word} ' in content_lower)
        english_count = sum(1 for word in english_words if f' {word} ' in content_lower)
        
        if romanian_count > english_count:
            return 'ro'
        elif english_count > 0:
            return 'en'
        else:
            return 'unknown'

    async def validate_url(self, url: str) -> Dict[str, any]:
        """Validate if URL is accessible and returns basic info"""
        try:
            await self.initialize()
            
            async with self.session.head(url) as response:
                return {
                    'valid': response.status == 200,
                    'status': response.status,
                    'content_type': response.headers.get('Content-Type', ''),
                    'content_length': response.headers.get('Content-Length'),
                    'last_modified': response.headers.get('Last-Modified')
                }
                
        except Exception as e:
            return {
                'valid': False,
                'status': 0,
                'error': str(e)
            }

    def calculate_priority(self, url: str, title: str, content: str, year: Optional[int]) -> int:
        """
        Calculate document priority based on various factors
        Higher number = higher priority
        
        Priority factors:
        - Year (more recent = higher priority)
        - Content quality/length
        - Title relevance
        - Source reliability
        """
        priority = 1
        current_year = datetime.now().year
        
        # Year-based priority (most important factor)
        if year:
            if year == current_year:
                priority += 10  # Current year
            elif year == current_year - 1:
                priority += 8   # Previous year
            elif year >= current_year - 2:
                priority += 5   # Last 2 years
            elif year >= current_year - 5:
                priority += 3   # Last 5 years
            else:
                priority += 1   # Older documents
        
        # Content length priority
        content_length = len(content)
        if content_length > 10000:
            priority += 3
        elif content_length > 5000:
            priority += 2
        elif content_length > 1000:
            priority += 1
        
        # Source reliability (based on domain)
        domain = urlparse(url).netloc.lower()
        if any(gov in domain for gov in ['gov.ro', 'parlament.ro', 'anaf.ro']):
            priority += 5  # Official government sources
        elif 'primaria' in domain or 'consiliul' in domain:
            priority += 3  # Local government
        elif any(edu in domain for edu in ['.edu', '.ac.']):
            priority += 2  # Educational institutions
        
        # Title relevance
        if any(keyword in title.lower() for keyword in ['fiscal', 'cod', 'lege', 'ordonanță']):
            priority += 2
        
        return min(priority, 20)  # Cap at 20

    def _extract_structured_legal_content(self, soup, url: str) -> str:
        """Extract structured content from legal/fiscal documents"""
        content_parts = []
        
        # Check if this is a legal document (ANAF, legal sites, etc.)
        domain = urlparse(url).netloc.lower()
        if not any(legal_domain in domain for legal_domain in ['anaf.ro', 'legal', 'fiscal', 'lege', 'cod']):
            return None
        
        # Look for structured legal content
        legal_selectors = [
            # Articles and paragraphs
            '.stilArticol', '.stilParagraf', '.stilCapitol',
            # Generic legal structure
            '[class*="articol"]', '[class*="paragraf"]', '[class*="capitol"]',
            # Headings and content
            'h1, h2, h3, h4, h5, h6', 'p', 'div.content', 'div.text'
        ]
        
        found_elements = []
        for selector in legal_selectors:
            elements = soup.select(selector)
            found_elements.extend(elements)
        
        if not found_elements:
            return None
        
        # Process elements to maintain structure
        current_article = None
        current_content = []
        
        for element in found_elements:
            text = element.get_text(strip=True)
            if not text:
                continue
                
            # Check if this is an article header
            if ('ART.' in text or 'ARTICOL' in text) and len(text) < 200:
                # Save previous article content
                if current_article and current_content:
                    content_parts.append(f"{current_article}\n{' '.join(current_content)}\n")
                
                current_article = text
                current_content = []
            elif current_article:
                # Add content to current article
                current_content.append(text)
            else:
                # Add standalone content
                content_parts.append(text)
        
        # Add final article
        if current_article and current_content:
            content_parts.append(f"{current_article}\n{' '.join(current_content)}\n")
        
        return '\n\n'.join(content_parts) if content_parts else None

    def _extract_structured_text(self, element) -> str:
        """Extract text while preserving structure better"""
        content_parts = []
        
        # Process different types of elements
        for child in element.children:
            if hasattr(child, 'name'):
                if child.name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                    # Headers
                    text = child.get_text(strip=True)
                    if text:
                        content_parts.append(f"\n{text}\n")
                elif child.name in ['p', 'div']:
                    # Paragraphs and divs
                    text = child.get_text(strip=True)
                    if text:
                        content_parts.append(text)
                elif child.name in ['ul', 'ol']:
                    # Lists
                    list_items = []
                    for li in child.find_all('li'):
                        item_text = li.get_text(strip=True)
                        if item_text:
                            list_items.append(f"• {item_text}")
                    if list_items:
                        content_parts.append('\n'.join(list_items))
                elif child.name == 'table':
                    # Tables - extract as structured text
                    table_text = self._extract_table_content(child)
                    if table_text:
                        content_parts.append(table_text)
                else:
                    # Other elements
                    text = child.get_text(strip=True)
                    if text:
                        content_parts.append(text)
            else:
                # Text nodes
                text = str(child).strip()
                if text:
                    content_parts.append(text)
        
        return '\n'.join(content_parts)

    def _extract_table_content(self, table_element) -> str:
        """Extract content from HTML tables in a readable format"""
        table_parts = []
        
        for row in table_element.find_all('tr'):
            cells = []
            for cell in row.find_all(['td', 'th']):
                cell_text = cell.get_text(strip=True)
                if cell_text:
                    cells.append(cell_text)
            
            if cells:
                table_parts.append(' | '.join(cells))
        
        return '\n'.join(table_parts) if table_parts else None