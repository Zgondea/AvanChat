import httpx
import asyncio
import logging
from typing import Dict, Any, Optional, List
from app.core.config import settings

logger = logging.getLogger(__name__)

class OllamaService:
    """Service for interacting with Ollama API"""
    
    def __init__(self):
        self.base_url = settings.OLLAMA_URL
        self.model = settings.OLLAMA_MODEL
        self.client = httpx.AsyncClient(timeout=120.0)
        
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()
    
    async def is_ready(self) -> bool:
        """Check if Ollama service is ready"""
        try:
            response = await self.client.get(f"{self.base_url}/api/version")
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"Ollama service not ready: {e}")
            return False
    
    async def wait_for_ready(self, max_attempts: int = 30, delay: int = 2):
        """Wait for Ollama service to be ready"""
        for attempt in range(max_attempts):
            if await self.is_ready():
                logger.info("Ollama service is ready")
                return True
            logger.info(f"Waiting for Ollama service... (attempt {attempt + 1}/{max_attempts})")
            await asyncio.sleep(delay)
        
        raise Exception("Ollama service failed to start within timeout")
    
    async def list_models(self) -> List[Dict[str, Any]]:
        """List available models"""
        try:
            response = await self.client.get(f"{self.base_url}/api/tags")
            response.raise_for_status()
            data = response.json()
            return data.get("models", [])
        except Exception as e:
            logger.error(f"Failed to list models: {e}")
            return []
    
    async def pull_model(self, model_name: str) -> bool:
        """Pull a model from Ollama registry"""
        try:
            logger.info(f"Pulling model {model_name}...")
            async with self.client.stream(
                "POST",
                f"{self.base_url}/api/pull",
                json={"name": model_name}
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line:
                        # Parse progress updates
                        try:
                            import json
                            data = json.loads(line)
                            if "status" in data:
                                logger.info(f"Pull progress: {data['status']}")
                        except json.JSONDecodeError:
                            pass
            
            logger.info(f"Successfully pulled model {model_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to pull model {model_name}: {e}")
            return False
    
    async def ensure_model_ready(self) -> bool:
        """Ensure the required model is available"""
        # Wait for Ollama service
        await self.wait_for_ready()
        
        # Check if model exists
        models = await self.list_models()
        model_names = [model.get("name", "") for model in models]
        
        if self.model not in model_names:
            logger.info(f"Model {self.model} not found, pulling...")
            if not await self.pull_model(self.model):
                raise Exception(f"Failed to pull model {self.model}")
        else:
            logger.info(f"Model {self.model} already available")
        
        return True
    
    async def generate_completion(
        self,
        prompt: str,
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        temperature: float = 0.1,
        max_tokens: Optional[int] = None,
        stream: bool = False
    ) -> str:
        """Generate text completion"""
        try:
            payload = {
                "model": model or self.model,
                "prompt": prompt,
                "stream": stream,
                "options": {
                    "temperature": temperature,
                    "num_predict": max_tokens or settings.MAX_TOKENS,
                }
            }
            
            if system_prompt:
                payload["system"] = system_prompt
            
            response = await self.client.post(
                f"{self.base_url}/api/generate",
                json=payload
            )
            response.raise_for_status()
            
            result = response.json()
            return result.get("response", "")
            
        except Exception as e:
            logger.error(f"Failed to generate completion: {e}")
            raise Exception(f"Failed to generate response: {str(e)}")
    
    async def generate_chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.1,
        max_tokens: Optional[int] = None
    ) -> str:
        """Generate chat completion using chat API"""
        try:
            payload = {
                "model": model or self.model,
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "num_predict": max_tokens or settings.MAX_TOKENS,
                }
            }
            
            response = await self.client.post(
                f"{self.base_url}/api/chat",
                json=payload
            )
            response.raise_for_status()
            
            result = response.json()
            return result.get("message", {}).get("content", "")
            
        except Exception as e:
            logger.error(f"Failed to generate chat completion: {e}")
            raise Exception(f"Failed to generate response: {str(e)}")
    
    async def generate_legislative_response(
        self,
        question: str,
        context: str,
        municipality_name: str = ""
    ) -> str:
        """Generate a response specifically for legislative questions"""
        
        system_prompt = f"""Ești asistent AI pentru legislația fiscală românească. 

REGULI:
1. Răspunde în română, concis
2. Folosește doar informațiile din context
3. Citează sursa
4. Maximum 2-3 paragrafe

Context:
{context[:2000]}

Municipalitate: {municipality_name}
"""
        
        user_message = f"Întrebare: {question}"
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]
        
        return await self.generate_chat_completion(
            messages=messages,
            temperature=0.1,
            max_tokens=256
        )