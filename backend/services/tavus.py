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
        Create Tavus persona/conversation session with source context
        
        Args:
            notebook_title: Title of notebook
            sources: List of sources to load into avatar context
        
        Returns:
            Dict with session_id, conversation_url, status
        """
        # Build context for avatar
        context = self._build_context(notebook_title, sources)
        
        # Create persona with custom system prompt
        async with httpx.AsyncClient(timeout=30.0) as client:
            # First, create or get persona
            persona_response = await client.post(
                f"{self.base_url}/personas",
                headers=self.headers,
                json={
                    "persona_name": f"Research Assistant: {notebook_title[:50]}",
                    "default_replica_id": os.getenv("TAVUS_REPLICA_ID", "r12345"),
                    "system_prompt": context
                }
            )
            persona_response.raise_for_status()
            persona_data = persona_response.json()
            
            persona_id = persona_data.get("persona_id")
            
            # Create conversation with this persona
            conversation_response = await client.post(
                f"{self.base_url}/conversations",
                headers=self.headers,
                json={
                    "persona_id": persona_id,
                    "conversation_name": f"Research: {notebook_title}",
                    "properties": {
                        "max_call_duration": 600,  # 10 minutes
                        "participant_left_timeout": 60,
                        "enable_recording": False
                    }
                }
            )
            conversation_response.raise_for_status()
            conversation_data = conversation_response.json()
        
        return {
            "session_id": conversation_data.get("conversation_id"),
            "conversation_url": conversation_data.get("conversation_url"),
            "status": conversation_data.get("status", "active"),
            "persona_id": persona_id
        }
    
    def _build_context(
        self,
        notebook_title: str,
        sources: List[Dict[str, Any]]
    ) -> str:
        """Build system prompt for Tavus persona"""
        context_parts = [
            "<identity>",
            f"You are an expert research assistant for the topic: {notebook_title}",
            "You have deep knowledge of the research sources provided to you.",
            "</identity>",
            "",
            "<knowledge_base>",
            "You have access to the following research sources:",
            ""
        ]
        
        for idx, source in enumerate(sources[:10], 1):  # Top 10 sources
            context_parts.append(
                f"Source {idx}: {source.get('title', 'Untitled')}\n"
                f"Type: {source.get('type', 'unknown')}\n"
                f"Summary: {source.get('summary', 'No summary available')}\n"
                f"URL: {source.get('url', 'N/A')}\n"
            )
        
        context_parts.extend([
            "</knowledge_base>",
            "",
            "<instructions>",
            "- Answer questions based on the research sources provided",
            "- Always cite sources by number when referencing information (e.g., 'According to Source 3...')",
            "- Be conversational, warm, and engaging",
            "- If information is not in your sources, clearly state that",
            "- Provide actionable insights and connections between sources when relevant",
            "- Help users understand complex topics by breaking them down",
            "- Ask clarifying questions if the user's query is ambiguous",
            "</instructions>",
            "",
            "<personality>",
            "- Knowledgeable but approachable",
            "- Enthusiastic about the research topic",
            "- Patient and thorough in explanations",
            "- Proactive in suggesting related insights",
            "</personality>"
        ])
        
        return "\n".join(context_parts)

# Singleton instance
tavus_service = TavusService()
