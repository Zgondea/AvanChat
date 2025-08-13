import httpx
import json
from typing import List, Dict, Any, Optional
import numpy as np
import os
import asyncio
import torch
from transformers import AutoModelForQuestionAnswering, AutoTokenizer

class AIService:
    # Knowledge graph demo: entități și relații juridice
    knowledge_graph = {
        "tva": {
            "cota_standard": "Cota standard de TVA în România este 19%.",
            "cote_reduse": "Cotele reduse de TVA sunt 9% și 5% pentru anumite bunuri și servicii."
        },
        "impozit": {
            "profit": "Impozitul pe profit este 16%.",
            "microîntreprinderi": "Impozitul pe venitul microîntreprinderilor este 1% sau 3% în funcție de condiții."
        }
    }

    @staticmethod
    def normalize_text(text):
        import re
        # Normalizează spații, elimină caractere ciudate, corectează diacritice simple
        text = re.sub(r'\s+', ' ', text)
        text = text.replace('ţ', 'ț').replace('ş', 'ș').replace('Ţ', 'Ț').replace('Ş', 'Ș')
        text = text.replace('„', '"').replace('”', '"').replace('’', "'")
        text = text.strip()
        return text
    def __init__(self):
        self.ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
        self.model_name = "llama2"
        self.romanian_model_name = "readerbench/jurBERT-base"
        self.initialized = False
        self.romanian_model = None
        self.romanian_tokenizer = None
        self.use_romanian_model = os.getenv("USE_ROMANIAN_MODEL", "true").lower() == "true"
        
    async def initialize(self):
        """Initialize the AI service components"""
        try:
            if self.use_romanian_model:
                print("🇷🇴 Initializing Romanian model...")
                await self._init_romanian_model()
            else:
                # Check if Ollama is running
                await self._ensure_ollama_model()
            
            self.initialized = True
            print("✅ AI Service initialized successfully")
            
        except Exception as e:
            print(f"❌ Failed to initialize AI Service: {e}")
            print(f"🔄 Falling back to Ollama...")
            try:
                await self._ensure_ollama_model()
                self.use_romanian_model = False
                self.initialized = True
                print("✅ AI Service initialized with Ollama fallback")
            except Exception as fallback_error:
                print(f"❌ Fallback also failed: {fallback_error}")
                # Continue without AI for now
    
    async def _init_romanian_model(self):
        """Initialize the Romanian model"""
        try:
            # Load model and tokenizer
            print(f"📥 Loading Romanian model: {self.romanian_model_name}")
            self.romanian_tokenizer = AutoTokenizer.from_pretrained(self.romanian_model_name)
            
            # Use CPU for now (can switch to GPU if available)
            device = "cuda" if torch.cuda.is_available() else "cpu"
            print(f"🖥️ Using device: {device}")
            
            self.romanian_model = AutoModelForQuestionAnswering.from_pretrained(
                self.romanian_model_name,
                torch_dtype=torch.float32,  # jurBERT works better with float32
                low_cpu_mem_usage=True
            )
            
            if device == "cpu":
                self.romanian_model = self.romanian_model.to("cpu")
            
            print("✅ Romanian model loaded successfully")
            
        except Exception as e:
            print(f"❌ Failed to load Romanian model: {e}")
            raise e
    
    async def _ensure_ollama_model(self):
        """Ensure the model is available in Ollama"""
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                # Check if Ollama is running
                response = await client.get(f"{self.ollama_url}/api/tags")
                if response.status_code == 200:
                    models = response.json().get("models", [])
                    model_exists = any(model["name"].startswith(self.model_name) for model in models)
                    
                    if not model_exists:
                        print(f"⚠️ Model {self.model_name} not found. Please pull it manually.")
                    else:
                        print(f"✅ Model {self.model_name} available")
                        
            except Exception as e:
                print(f"⚠️ Ollama not available: {e}")
    
    def generate_embedding(self, text: str) -> List[float]:
        """Generate simple embedding for text (fallback without sentence-transformers)"""
        # Simple hash-based embedding as fallback
        import hashlib
        hash_obj = hashlib.sha256(text.encode())
        hash_hex = hash_obj.hexdigest()
        
        # Convert to 384-dim vector
        embedding = []
        for i in range(0, len(hash_hex), 2):
            val = int(hash_hex[i:i+2], 16) / 255.0  # Normalize to 0-1
            embedding.append(val)
        
        # Pad or trim to 384 dimensions
        while len(embedding) < 384:
            embedding.extend(embedding[:384-len(embedding)])
        embedding = embedding[:384]
        
        return embedding
    
    async def generate_response(self, query: str, context_chunks: List[Dict[str, Any]], municipality_name: str) -> str:
        # Fallback universal pentru orice tip de întrebare
        def fallback_fragment():
            if context_chunks:
                chunk = context_chunks[0]
                doc_name = chunk.get('document_name', 'Document necunoscut')
                page_num = chunk.get('page_number', 'N/A')
                content = self.normalize_text(chunk['content'])
                short_content = content[:300].rstrip()
                return f"• {short_content}...\n  Sursa: {doc_name}, pagina {page_num}"
            else:
                return "Nu am găsit surse relevante."
        # Căutare în knowledge graph
        kg_response = None
        q_lower = query.lower()
        if "tva" in q_lower:
            if "standard" in q_lower or "cota" in q_lower:
                kg_response = self.knowledge_graph["tva"].get("cota_standard")
            elif "redus" in q_lower or "reducere" in q_lower:
                kg_response = self.knowledge_graph["tva"].get("cote_reduse")
        if "impozit" in q_lower:
            if "profit" in q_lower:
                kg_response = self.knowledge_graph["impozit"].get("profit")
            elif "micro" in q_lower:
                kg_response = self.knowledge_graph["impozit"].get("microîntreprinderi")

        # Dacă găsește un fapt relevant în grafic, îl returnează augmentat cu fragmentul RAG
        # Optimizare pentru întrebări de tip 'cum se calculează'
        q_lower = query.lower()
        if 'cum se calculeaza' in q_lower or 'cum se determină' in q_lower or 'calcul' in q_lower:
            # Caută formule sau pași de calcul în fragmente
            # Extrage doar propoziții care conțin formule reale (semnul '=', cifre, procente, structură matematică)
            import re
            formula_pattern = re.compile(r'(\d+\s*[%=]|=|\d+\s*lei|\d+\s*RON|\d+\s*x|\d+\s*/|\d+\s*\*)')
            # Extrage cuvinte-cheie din întrebare
            keywords = re.findall(r'\w+', query.lower())
            for chunk in context_chunks[:3]:
                content = self.normalize_text(chunk['content'])
                content = re.sub(r'\s+', ' ', content)
                content = re.sub(r'([a-zA-Z])\s+([ăîâșțĂÎÂȘȚ])', r'\1\2', content)
                content = re.sub(r'([ăîâșțĂÎÂȘȚ])\s+([a-zA-Z])', r'\1\2', content)
                content = content.replace(' .', '.').replace(' ,', ',').replace(' ;', ';')
                content = content.replace(' :', ':').replace(' ?', '?').replace(' !', '!')
                content = content.replace('„', '"').replace('”', '"').replace('’', "'")
                content = content.replace('ţ', 'ț').replace('ş', 'ș').replace('Ţ', 'Ț').replace('Ş', 'Ș')
                sentences = re.split(r'(?<=[.!?])\s+', content)
                for sentence in sentences:
                    # Extrage doar dacă există semne matematice/cifre relevante și cuvinte-cheie din întrebare
                    sentence_lc = sentence.lower()
                    if formula_pattern.search(sentence) and any(kw in sentence_lc for kw in keywords):
                        doc_name = chunk.get('document_name', 'Document necunoscut')
                        page_num = chunk.get('page_number', 'N/A')
                        sentence_fmt = sentence.strip().capitalize()
                        return f"Formulă/Explicație: {sentence_fmt}\nSursa: {doc_name}, pagina {page_num}"
            # Dacă nu găsește formulă, returnează ca înainte
            sources = []
            for chunk in context_chunks[:2]:
                doc_name = chunk.get('document_name', 'Document necunoscut')
                page_num = chunk.get('page_number', 'N/A')
                long_content = self.normalize_text(chunk['content'])[:500].rstrip()
                sources.append(f"• {long_content}...\n  Sursa: {doc_name}, pagina {page_num}")
            sources_text = "\n".join(sources) if sources else "Nu am găsit surse relevante."
            return f"Explicație relevantă:\n{sources_text}"
        elif kg_response:
            kg_response_fmt = self.normalize_text(kg_response)
            # Dacă răspunsul KG conține un procent, returnează doar fraza scurtă
            if "%" in kg_response_fmt:
                return kg_response_fmt
            else:
                return f"{kg_response_fmt}\n\nSurse relevante:\n{fallback_fragment()}"
        else:
            return f"Surse relevante:\n{fallback_fragment()}"
        """Generate response using Romanian model or Ollama"""
        if not self.initialized:
            return "Ne pare rău, serviciul AI nu este încă disponibil. Vă rugăm să încercați mai târziu."


        # Optimizare: selectează până la 5 fragmente relevante pentru întrebări fiscale
        keywords = ["tva", "procent", "cota", "impozit", "%", "taxa", "taxe", "valoare"]
        def is_relevant(chunk):
            text = chunk['content'].lower()
            has_keyword = any(kw in text for kw in keywords)
            has_digit = any(c.isdigit() for c in text)
            return has_keyword and has_digit

        # Prioritizează fragmente cu cuvinte cheie și cifre
        relevant_chunks = [chunk for chunk in context_chunks if is_relevant(chunk)]
        # Dacă nu găsește nimic relevant, folosește contextul original
        if relevant_chunks:
            context_to_use = relevant_chunks[:5]
        else:
            context_to_use = context_chunks[:5]

        # RAG simplu: returnează direct cele mai relevante fragmente din documente
        if not context_to_use:
            return "Nu am găsit informații relevante în documentele disponibile pentru a răspunde la întrebarea dumneavoastră."

        responses = []
        for chunk in context_to_use[:3]:
            doc_name = chunk.get('document_name', 'Document necunoscut')
            page_num = chunk.get('page_number', 'N/A')
            responses.append(f"{chunk['content'].strip()}\n\n*Sursa: {doc_name}, pagina {page_num}*")

        return "\n\n---\n\n".join(responses)
    
    async def _generate_with_romanian_model(self, query: str, context_chunks: List[Dict[str, Any]], municipality_name: str) -> str:
        """Generate response using Romanian jurBERT QA model"""
        try:
            if not context_chunks:
                return "Nu am găsit informații relevante în documentele disponibile pentru a răspunde la întrebarea dumneavoastră."

            # Use the most relevant chunk as context for QA
            best_chunk = context_chunks[0]  # Already sorted by relevance
            context = best_chunk['content']

            # Prepare inputs for Question Answering
            inputs = self.romanian_tokenizer(
                query,
                context,
                add_special_tokens=True,
                return_tensors="pt",
                max_length=512,
                truncation=True,
                return_offsets_mapping=True,
                padding=True
            )

            # Get answer from model
            with torch.no_grad():
                outputs = self.romanian_model(**{k: v for k, v in inputs.items() if k != 'offset_mapping'})

            # Extract answer
            answer_start_scores = outputs.start_logits
            answer_end_scores = outputs.end_logits

            answer_start = torch.argmax(answer_start_scores)
            answer_end = torch.argmax(answer_end_scores) + 1

            # Decode answer
            answer = self.romanian_tokenizer.convert_tokens_to_string(
                self.romanian_tokenizer.convert_ids_to_tokens(inputs["input_ids"][0][answer_start:answer_end])
            )

            # Clean up the answer
            answer = answer.strip()

            # Postprocesare: dacă răspunsul nu conține cifre sau cuvinte cheie, returnează direct fragmentul relevant
            keywords = ["tva", "procent", "cota", "impozit", "%", "taxa", "taxe", "valoare"]
            has_keyword = any(kw in answer.lower() for kw in keywords)
            has_digit = any(c.isdigit() for c in answer)
            if not (has_keyword and has_digit):
                # Caută cel mai relevant fragment care conține cuvinte cheie și cifre
                for chunk in context_chunks:
                    text = chunk['content'].lower()
                    if any(kw in text for kw in keywords) and any(c.isdigit() for c in text):
                        doc_name = chunk.get('document_name', 'Document necunoscut')
                        page_num = chunk.get('page_number', 'N/A')
                        return f"{chunk['content'].strip()}\n\n*Sursa: {doc_name}, pagina {page_num}*"

            # If answer is too short or empty, provide context-based response
            if len(answer.split()) < 3:
                # Combine information from multiple chunks
                combined_info = []
                for chunk in context_chunks[:2]:
                    doc_name = chunk.get('document_name', 'Document necunoscut')
                    page_num = chunk.get('page_number', 'N/A')
                    combined_info.append(f"Conform {doc_name} (pag. {page_num}): {chunk['content'][:200]}...")

                response = f"Bazându-mă pe documentele disponibile:\n\n" + "\n\n".join(combined_info)
                return response

            # Format final response with source
            doc_name = best_chunk.get('document_name', 'Document necunoscut')
            page_num = best_chunk.get('page_number', 'N/A')

            return f"{answer}\n\n*Sursa: {doc_name}, pagina {page_num}*"

        except Exception as e:
            print(f"❌ Error with Romanian jurBERT model: {e}")
            return "Ne pare rău, am întâmpinat o problemă tehnică. Vă rugăm să încercați din nou."
    
    async def _generate_with_ollama(self, query: str, context_chunks: List[Dict[str, Any]], municipality_name: str) -> str:
        """Generate response using Ollama"""
        # Prepare context
        context = "\n\n".join([
            f"Document: {chunk.get('document_name', 'Document necunoscut')}\n"
            f"Pagina: {chunk.get('page_number', 'N/A')}\n"
            f"Conținut: {chunk['content']}"
            for chunk in context_chunks[:3]
        ])

        # Prompt explicit pentru răspunsuri fiscale
        prompt = f"""
Ești un asistent AI pentru {municipality_name}. Răspunde în română la întrebarea despre legislația fiscală.

Context documente:
{context}

Întrebare: {query}

Instrucțiuni speciale:
- Dacă întrebarea este despre cota de TVA, răspunde direct cu valoarea actuală (ex: Cota standard de TVA în România este 19%).
- Dacă întrebarea este despre taxe, impozite sau procente, răspunsul trebuie să fie clar, concis și să conțină valoarea numerică exactă.
- Dacă nu găsești răspunsul, spune "Nu am găsit informații exacte în documentele disponibile."

Răspuns scurt și clar în română:
"""

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.ollama_url}/api/generate",
                    json={
                        "model": self.model_name,
                        "prompt": prompt,
                        "stream": False,
                        "options": {"temperature": 0.3, "max_tokens": 500}
                    }
                )

                if response.status_code == 200:
                    result = response.json()
                    return result.get("response", "").strip()
                else:
                    return "Ne pare rău, nu pot genera un răspuns în acest moment."

        except Exception as e:
            print(f"❌ Error generating response: {e}")
            return "Ne pare rău, am întâmpinat o problemă tehnică. Vă rugăm să încercați din nou."
    
    def extract_sources(self, context_chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract source information from context chunks"""
        sources = []
        for chunk in context_chunks:
            sources.append({
                "document_name": chunk.get('document_name', 'Document necunoscut'),
                "page_number": chunk.get('page_number', 'N/A'),
                "similarity_score": round(chunk.get('similarity_score', 0.0), 3),
                "snippet": chunk['content'][:200] + "..." if len(chunk['content']) > 200 else chunk['content']
            })
        return sources