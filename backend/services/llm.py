"""
LiteLLM wrapper for multi-model support
Supports Claude, GPT-4, and Gemini
"""
import os
from typing import List, Dict, Any, Optional
import litellm
from litellm import acompletion

class LLMService:
    def __init__(self):
        # OpenRouter provides unified access to all models
        openrouter_key = os.getenv("OPENROUTER_API_KEY")
        
        # Set API keys (use OpenRouter for all if available)
        litellm.openai_key = openrouter_key or os.getenv("OPENAI_API_KEY")
        litellm.anthropic_key = openrouter_key or os.getenv("ANTHROPIC_API_KEY")
        litellm.gemini_key = os.getenv("GOOGLE_API_KEY")
        
        # Model mappings - using OpenRouter format
        if openrouter_key:
            # OpenRouter model names
            self.models = {
                "gpt-4": "openai/gpt-4-turbo",
                "claude": "anthropic/claude-3.5-sonnet",
                "gemini": "google/gemini-2.5-flash"
            }
            # Set base URL for OpenRouter
            litellm.api_base = "https://openrouter.ai/api/v1"
        else:
            # Direct API model names
            self.models = {
                "gpt-4": "gpt-4-turbo-preview",
                "claude": "claude-3-opus-20240229",
                "gemini": "gemini-2.5-flash"
            }
    
    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: str = "gpt-4",
        temperature: float = 0.7,
        max_tokens: int = 1000
    ) -> Dict[str, Any]:
        """
        Send chat completion request
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model identifier (gpt-4, claude, gemini)
            temperature: Sampling temperature
            max_tokens: Max response tokens
        
        Returns:
            Dict with 'content' and 'model' keys
        """
        model_name = self.models.get(model, model)
        
        response = await acompletion(
            model=model_name,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        return {
            "content": response.choices[0].message.content,
            "model": model_name,
            "usage": response.usage.model_dump() if response.usage else None
        }
    
    async def chat_with_context(
        self,
        user_message: str,
        sources: List[Dict[str, Any]],
        chat_history: List[Dict[str, str]] = None,
        model: str = "gpt-4"
    ) -> Dict[str, Any]:
        """
        Chat with source context
        
        Args:
            user_message: User's question
            sources: List of source dicts with 'title', 'summary', 'fulltext'
            chat_history: Previous messages
            model: Model to use
        
        Returns:
            Dict with 'content', 'citations', and 'model'
        """
        # Limit to first 3 sources to save tokens
        limited_sources = sources[:3]
        
        # Build context from sources
        context = self._build_context(limited_sources)
        
        # Build messages
        messages = [
            {
                "role": "system",
                "content": f"""Answer based on these sources. Cite with [1], [2], etc.

{context}"""
            }
        ]
        
        # Add chat history (only last 2 messages to save tokens)
        if chat_history:
            messages.extend(chat_history[-2:])
        
        # Add user message
        messages.append({
            "role": "user",
            "content": user_message
        })
        
        # Get response
        response = await self.chat(messages, model=model)
        
        # Extract citations
        citations = self._extract_citations(response["content"], limited_sources)
        
        return {
            "content": response["content"],
            "citations": citations,
            "model": response["model"]
        }
    
    async def multi_model_chat(
        self,
        user_message: str,
        sources: List[Dict[str, Any]],
        models: List[str] = None
    ) -> Dict[str, Any]:
        """
        Get responses from multiple models simultaneously
        
        Args:
            user_message: User's question
            sources: Source context
            models: List of models (default: all 3)
        
        Returns:
            Dict with responses from each model + agreement analysis
        """
        if models is None:
            models = ["gpt-4", "claude", "gemini"]
        
        # Get responses from all models in parallel
        import asyncio
        tasks = [
            self.chat_with_context(user_message, sources, model=model)
            for model in models
        ]
        responses = await asyncio.gather(*tasks)
        
        # Analyze agreement/disagreement
        analysis = await self._analyze_agreement(
            user_message,
            {model: resp for model, resp in zip(models, responses)}
        )
        
        return {
            "responses": {
                model: resp for model, resp in zip(models, responses)
            },
            "analysis": analysis
        }
    
    def _build_context(self, sources: List[Dict[str, Any]]) -> str:
        """Build context string from sources"""
        context_parts = []
        max_chars_per_source = 500  # Limit each source to ~125 tokens
        
        for idx, source in enumerate(sources, 1):
            # Prefer summary over fulltext to save tokens
            summary = source.get('summary', '')
            
            # Use only summary, truncated
            if summary:
                content = summary[:max_chars_per_source]
            else:
                fulltext = source.get('fulltext', '')
                content = fulltext[:max_chars_per_source] + "..." if fulltext else 'No content'
            
            context_parts.append(f"[{idx}] {source.get('title', 'Untitled')}: {content}")
        
        return "\n\n".join(context_parts)
    
    def _extract_citations(
        self,
        content: str,
        sources: List[Dict[str, Any]]
    ) -> List[str]:
        """Extract citation numbers from response"""
        import re
        citations = re.findall(r'\[(\d+)\]', content)
        cited_sources = []
        for cite_num in set(citations):
            idx = int(cite_num) - 1
            if 0 <= idx < len(sources):
                cited_sources.append(sources[idx].get("url", ""))
        return cited_sources
    
    async def _analyze_agreement(
        self,
        question: str,
        responses: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze where models agree and disagree"""
        # Build comparison prompt
        comparison_text = "\n\n".join([
            f"{model.upper()} says:\n{resp['content']}"
            for model, resp in responses.items()
        ])
        
        analysis_prompt = f"""Compare these three AI model responses to the question: "{question}"

{comparison_text}

Provide:
1. AGREEMENTS: What all models agree on (bullet points)
2. DISAGREEMENTS: Where models differ (bullet points)
3. CONFIDENCE: Which model seems most confident and why

Be concise and specific."""
        
        analysis_response = await self.chat(
            messages=[{"role": "user", "content": analysis_prompt}],
            model="gpt-4",
            temperature=0.3
        )
        
        return {
            "content": analysis_response["content"],
            "model": "gpt-4"
        }

# Singleton instance
llm_service = LLMService()
