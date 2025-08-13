import re
import logging
from typing import List, Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class RomanianLanguageOptimizer:
    """Service for optimizing AI responses for Romanian language"""
    
    def __init__(self):
        # Romanian-specific legal terms and their corrections
        self.legal_terms = {
            'taxe': ['taxă', 'impozit', 'contribuție', 'cotizație'],
            'impozite': ['impozit', 'taxă', 'contribuție fiscală'],
            'clădiri': ['clădire', 'construcție', 'imobil'],
            'terenuri': ['teren', 'parcelă', 'suprafață'],
            'vehicule': ['vehicul', 'autovehicul', 'mașină', 'auto'],
            'primărie': ['primăria', 'municipalitate', 'consiliu local'],
            'scutire': ['scutire', 'exonerare', 'reducere', 'diminuare'],
            'plată': ['plată', 'achitare', 'virament', 'încasare'],
            'termene': ['termen', 'scadență', 'deadline', 'dată limită'],
        }
        
        # Common grammar patterns to fix
        self.grammar_fixes = {
            # Plural agreements
            r'\btaxele sunt\b': 'taxele sunt',
            r'\bimpozitele este\b': 'impozitele sunt',
            r'\bdocumentele este\b': 'documentele sunt',
            
            # Proper case usage
            r'\bprimaria\b': 'Primăria',
            r'\bconsiliul local\b': 'Consiliul Local',
            r'\bcodul fiscal\b': 'Codul Fiscal',
            r'\bhotărârea consiliului local\b': 'Hotărârea Consiliului Local',
            
            # Currency formatting
            r'(\d+)\s*lei': r'\1 lei',
            r'(\d+)\s*ron': r'\1 RON',
            
            # Date formatting
            r'(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})': r'\1.\2.\3',
        }
        
        # Romanian diacritics corrections
        self.diacritics_map = {
            'ă': ['a'],
            'â': ['a'],
            'î': ['i'],
            'ș': ['s'],
            'ț': ['t'],
        }
        
        # Formal addressing patterns
        self.formal_patterns = {
            'you': ['dumneavoastră', 'dvs.'],
            'your': ['dumneavoastră', 'dvs.'],
        }
        
        # Romanian months
        self.months = {
            'ianuarie': '01', 'februarie': '02', 'martie': '03', 'aprilie': '04',
            'mai': '05', 'iunie': '06', 'iulie': '07', 'august': '08',
            'septembrie': '09', 'octombrie': '10', 'noiembrie': '11', 'decembrie': '12'
        }

    def optimize_response(self, response_text: str, context: Dict[str, Any] = None) -> str:
        """
        Optimize AI response for Romanian language and legal context
        """
        try:
            optimized = response_text
            
            # Apply basic Romanian optimizations
            optimized = self._fix_grammar(optimized)
            optimized = self._enhance_formality(optimized)
            optimized = self._fix_legal_terminology(optimized)
            optimized = self._format_numbers_and_dates(optimized)
            optimized = self._add_romanian_politeness(optimized)
            
            # Apply context-specific optimizations
            if context:
                optimized = self._apply_context_optimizations(optimized, context)
            
            return optimized.strip()
            
        except Exception as e:
            logger.error(f"Error optimizing Romanian response: {e}")
            return response_text  # Return original if optimization fails
    
    def _fix_grammar(self, text: str) -> str:
        """Fix common Romanian grammar issues"""
        result = text
        
        for pattern, replacement in self.grammar_fixes.items():
            result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
        
        # Fix article agreements
        result = re.sub(r'\bun taxă\b', 'o taxă', result, flags=re.IGNORECASE)
        result = re.sub(r'\bun impozit\b', 'un impozit', result, flags=re.IGNORECASE)
        result = re.sub(r'\bun primărie\b', 'o primărie', result, flags=re.IGNORECASE)
        
        # Fix verb agreements with collective nouns
        result = re.sub(r'\bprimăria sunt\b', 'primăria este', result, flags=re.IGNORECASE)
        result = re.sub(r'\bconsiliul sunt\b', 'consiliul este', result, flags=re.IGNORECASE)
        
        return result
    
    def _enhance_formality(self, text: str) -> str:
        """Enhance formality level appropriate for official communications"""
        result = text
        
        # Replace informal greetings
        informal_greetings = {
            r'\bsalut\b': 'Bună ziua',
            r'\bhai\b': 'Bună ziua',
            r'\bce mai faci\b': 'Cum vă pot ajuta',
        }
        
        for pattern, replacement in informal_greetings.items():
            result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
        
        # Ensure formal addressing
        result = re.sub(r'\bte pot\b', 'vă pot', result, flags=re.IGNORECASE)
        result = re.sub(r'\bte ajut\b', 'vă ajut', result, flags=re.IGNORECASE)
        result = re.sub(r'\bai nevoie\b', 'aveți nevoie', result, flags=re.IGNORECASE)
        
        return result
    
    def _fix_legal_terminology(self, text: str) -> str:
        """Fix and standardize legal terminology"""
        result = text
        
        # Standardize legal document names
        legal_docs = {
            r'\bhcl\b': 'HCL',
            r'\bhotărârea consiliului local\b': 'Hotărârea Consiliului Local',
            r'\bcodul fiscal\b': 'Codul Fiscal',
            r'\bogc\b': 'OGC',  # Ordonanța Guvernului
            r'\bordonanța guvernului\b': 'Ordonanța Guvernului',
        }
        
        for pattern, replacement in legal_docs.items():
            result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
        
        # Fix tax terminology
        result = re.sub(r'\btaxa pe clădire\b', 'taxa pe clădiri', result, flags=re.IGNORECASE)
        result = re.sub(r'\bimpozitul pe venit\b', 'impozitul pe venituri', result, flags=re.IGNORECASE)
        result = re.sub(r'\btaxa auto\b', 'taxa pentru autovehicule', result, flags=re.IGNORECASE)
        
        return result
    
    def _format_numbers_and_dates(self, text: str) -> str:
        """Format numbers, currency, and dates according to Romanian standards"""
        result = text
        
        # Format currency
        result = re.sub(r'(\d+)\s*RON', r'\1 RON', result)
        result = re.sub(r'(\d+)\s*lei', r'\1 lei', result)
        
        # Format percentages
        result = re.sub(r'(\d+(?:\.\d+)?)\s*%', r'\1%', result)
        result = re.sub(r'(\d+(?:,\d+)?)\s*procente', r'\1%', result)
        
        # Format dates (DD.MM.YYYY format)
        result = re.sub(r'(\d{1,2})[/-](\d{1,2})[/-](\d{4})', r'\1.\2.\3', result)
        
        # Format large numbers with thousand separators
        def format_number(match):
            number = match.group(1)
            if len(number) > 3:
                # Add thousand separators (Romanian uses . for thousands)
                return '{:,}'.format(int(number)).replace(',', '.')
            return number
        
        result = re.sub(r'\b(\d{4,})\b(?!\.\d)', format_number, result)
        
        return result
    
    def _add_romanian_politeness(self, text: str) -> str:
        """Add appropriate Romanian politeness markers"""
        result = text
        
        # Add polite endings if missing
        endings = ['vă rog', 'vă mulțumesc', 'cu stimă', 'toate cele bune']
        
        # Check if any polite ending exists
        has_polite_ending = any(ending in result.lower() for ending in endings)
        
        if not has_polite_ending and len(result) > 50:
            # Add appropriate ending based on context
            if 'întrebare' in result.lower() or '?' in result:
                result += '\n\nVă rog să mă contactați dacă aveți alte întrebări.'
            elif 'informații' in result.lower() or 'detalii' in result.lower():
                result += '\n\nSper că aceste informații vă sunt utile.'
            else:
                result += '\n\nVă mulțumesc pentru înțelegere.'
        
        return result
    
    def _apply_context_optimizations(self, text: str, context: Dict[str, Any]) -> str:
        """Apply optimizations based on context"""
        result = text
        
        # Municipality-specific optimizations
        if 'municipality_name' in context:
            municipality_name = context['municipality_name']
            
            # Replace generic references with specific municipality name
            result = re.sub(r'\bprimăria\b(?!\s+' + re.escape(municipality_name) + ')', 
                          f'Primăria {municipality_name}', result, flags=re.IGNORECASE)
        
        # Category-specific optimizations
        if 'category' in context:
            category = context['category'].lower()
            
            if category == 'fiscal':
                # Add specific fiscal context
                result = self._add_fiscal_context(result)
            elif category == 'urbanism':
                result = self._add_urbanism_context(result)
        
        return result
    
    def _add_fiscal_context(self, text: str) -> str:
        """Add fiscal-specific context and terminology"""
        result = text
        
        # Ensure proper fiscal terminology
        fiscal_terms = {
            'taxa': 'taxa locală',
            'impozit': 'impozitul local',
            'contribuție': 'contribuția locală',
        }
        
        # Only replace if not already contextualized
        for term, replacement in fiscal_terms.items():
            if term in result.lower() and 'local' not in result.lower():
                result = re.sub(rf'\b{term}\b', replacement, result, flags=re.IGNORECASE, count=1)
        
        return result
    
    def _add_urbanism_context(self, text: str) -> str:
        """Add urbanism-specific context and terminology"""
        result = text
        
        # Add urbanism context
        urbanism_terms = {
            'autorizație': 'autorizația de construire',
            'certificat': 'certificatul de urbanism',
        }
        
        for term, replacement in urbanism_terms.items():
            if term in result.lower() and 'urbanism' not in result.lower():
                result = re.sub(rf'\b{term}\b', replacement, result, flags=re.IGNORECASE, count=1)
        
        return result
    
    def validate_response_quality(self, response: str) -> Dict[str, Any]:
        """Validate the quality of Romanian response"""
        issues = []
        score = 100
        
        # Check for common issues
        if re.search(r'\b(you|your)\b', response.lower()):
            issues.append("Contains English pronouns")
            score -= 20
        
        if not re.search(r'\b(dumneavoastră|dvs\.)\b', response.lower()):
            issues.append("Missing formal addressing")
            score -= 10
        
        if len(response.split()) < 10:
            issues.append("Response too short")
            score -= 15
        
        if not re.search(r'[.!?]$', response.strip()):
            issues.append("Missing sentence ending")
            score -= 5
        
        # Check for legal context appropriateness
        if any(word in response.lower() for word in ['taxe', 'impozite', 'primărie']):
            if not re.search(r'\b(conform|potrivit|în baza)\b', response.lower()):
                issues.append("Missing legal reference context")
                score -= 10
        
        return {
            'score': max(0, score),
            'issues': issues,
            'is_acceptable': score >= 70
        }
    
    def get_romanian_stopwords(self) -> List[str]:
        """Get Romanian stopwords for text processing"""
        return settings.ROMANIAN_STOPWORDS
    
    def preprocess_query(self, query: str) -> str:
        """Preprocess user query for better understanding"""
        processed = query.lower().strip()
        
        # Expand common abbreviations
        abbreviations = {
            'hcl': 'hotărârea consiliului local',
            'ogc': 'ordonanța guvernului',
            'cf': 'codul fiscal',
            'civ': 'codul civil',
        }
        
        for abbr, expansion in abbreviations.items():
            processed = re.sub(rf'\b{abbr}\b', expansion, processed)
        
        # Normalize diacritics for search (but preserve in response)
        diacritics_normalize = {
            'ă': 'a', 'â': 'a', 'î': 'i', 'ș': 's', 'ț': 't'
        }
        
        normalized = processed
        for diacritic, replacement in diacritics_normalize.items():
            normalized = normalized.replace(diacritic, replacement)
        
        return normalized