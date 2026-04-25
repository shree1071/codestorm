"""
Tavus AI Avatar service
Creates conversational video avatar sessions
"""
import os
import httpx
from typing import Dict, Any, List

class TavusService:
    def __init__(self):
        self.api_key = os.getenv("TAVUS_API_KEY")
        self.base_url = "https://tavusapi.com/v2"
        self.headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json"
        }
    
    async def create_session(
        self,
        notebook_title: str,
        sources: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Create Tavus conversation session with source context
        
        Args:
            notebook_title: Title of notebook
            sources: List of sources to load into avatar context
        
        Returns:
            Dict with session_id, conversation_url, status
        """
        # Build context for avatar
        context = self._build_context(notebook_title, sources)
        
        # Create conversation session
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/conversations",
                headers=self.headers,
                json={
                    "replica_id": os.getenv("TAVUS_REPLICA_ID", "default"),
                    "conversation_name": f"Research: {notebook_title}",
                    "conversational_context": context,
                    "properties": {
                        "max_call_duration": 600,  # 10 minutes
                        "participant_left_timeout": 60,
                        "enable_recording": False
                    }
                }
            )
            response.raise_for_status()
            data = response.json()
        
        return {
            "session_id": data.get("conversation_id"),
            "conversation_url": data.get("conversation_url"),
            "status": data.get("status", "active")
        }
    
    def _build_context(
        self,
        notebook_title: str,
        sources: List[Dict[str, Any]]
    ) -> str:
        """Build context string for avatar"""
        context_parts = [
            f"You are an expert research assistant discussing: {notebook_title}",
            "",
            "You have access to the following research sources:",
            ""
        ]
        
        for idx, source in enumerate(sources[:10], 1):  # Top 10 sources
            context_parts.append(
                f"{idx}. {source.get('title', 'Untitled')}\n"
                f"   Summary: {source.get('summary', 'No summary')}\n"
                f"   URL: {source.get('url', 'N/A')}"
            )
        
        context_parts.extend([
            "",
            "Instructions:",
            "- Answer questions based on these sources",
            "- Cite sources by number when relevant",
            "- Be conversational and engaging",
            "- If information is not in sources, say so clearly",
            "- Provide actionable insights when possible"
        ])
        
        return "\n".join(context_parts)

# Singleton instance
tavus_service = TavusService()
