"""
InsForge database service for structured data storage
Uses InsForge REST API for database operations
"""
import os
from typing import List, Dict, Any, Optional
import httpx
import json

class DatabaseService:
    def __init__(self):
        self.base_url = os.getenv("INSFORGE_URL")
        self.anon_key = os.getenv("INSFORGE_ANON_KEY")
        
        self.headers = {
            "Authorization": f"Bearer {self.anon_key}",
            "Content-Type": "application/json"
        }
    
    async def _request(self, method: str, table: str, data: Any = None, filters: Dict[str, str] = None, prefer: str = None):
        """Make HTTP request to InsForge database API"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{self.base_url}/api/database/records/{table}"
            
            # Add query parameters for filters
            if filters:
                params = "&".join([f"{k}={v}" for k, v in filters.items()])
                url = f"{url}?{params}"
            
            headers = self.headers.copy()
            if prefer:
                headers["Prefer"] = prefer
            
            response = await client.request(method, url, headers=headers, json=data)
            response.raise_for_status()
            
            if response.status_code == 204:
                return None
            return response.json()
    
    # Notebooks
    async def create_notebook(self, title: str) -> Dict[str, Any]:
        data = [{
            "title": title
        }]
        result = await self._request("POST", "notebooks", data=data, prefer="return=representation")
        return result[0] if result else None
    
    async def list_notebooks(self) -> List[Dict[str, Any]]:
        result = await self._request("GET", "notebooks", filters={"order": "updated_at.desc"})
        return result or []
    
    async def get_notebook(self, notebook_id: str) -> Optional[Dict[str, Any]]:
        result = await self._request("GET", "notebooks", filters={"id": f"eq.{notebook_id}"})
        return result[0] if result else None
    
    async def update_notebook(self, notebook_id: str, title: str) -> Dict[str, Any]:
        data = {"title": title}
        result = await self._request("PATCH", "notebooks", data=data, filters={"id": f"eq.{notebook_id}"}, prefer="return=representation")
        return result[0] if result else None
    
    async def delete_notebook(self, notebook_id: str):
        await self._request("DELETE", "notebooks", filters={"id": f"eq.{notebook_id}"})
    
    # Sources
    async def create_source(
        self,
        notebook_id: str,
        source_type: str,
        title: str,
        url: Optional[str] = None,
        summary: Optional[str] = None,
        fulltext: Optional[str] = None,
        credibility_score: Optional[int] = None
    ) -> Dict[str, Any]:
        data = [{
            "notebook_id": notebook_id,
            "type": source_type,
            "title": title,
            "url": url,
            "summary": summary,
            "fulltext": fulltext,
            "credibility_score": credibility_score
        }]
        result = await self._request("POST", "sources", data=data, prefer="return=representation")
        return result[0] if result else None
    
    async def get_sources(self, notebook_id: str) -> List[Dict[str, Any]]:
        result = await self._request("GET", "sources", filters={"notebook_id": f"eq.{notebook_id}", "order": "created_at.desc"})
        return result or []
    
    async def delete_source(self, source_id: str):
        await self._request("DELETE", "sources", filters={"id": f"eq.{source_id}"})
    
    # Chat Messages
    async def create_message(
        self,
        notebook_id: str,
        role: str,
        content: str,
        model: Optional[str] = None,
        citations: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        data = [{
            "notebook_id": notebook_id,
            "role": role,
            "content": content,
            "model": model,
            "citations": citations
        }]
        result = await self._request("POST", "chat_messages", data=data, prefer="return=representation")
        return result[0] if result else None
    
    async def get_chat_history(self, notebook_id: str) -> List[Dict[str, Any]]:
        result = await self._request("GET", "chat_messages", filters={"notebook_id": f"eq.{notebook_id}", "order": "created_at.asc"})
        return result or []
    
    async def clear_chat_history(self, notebook_id: str):
        await self._request("DELETE", "chat_messages", filters={"notebook_id": f"eq.{notebook_id}"})
    
    # Outputs
    async def create_output(
        self,
        notebook_id: str,
        output_type: str,
        content: Dict[str, Any],
        audio_url: Optional[str] = None
    ) -> Dict[str, Any]:
        data = [{
            "notebook_id": notebook_id,
            "type": output_type,
            "content": content,
            "audio_url": audio_url
        }]
        result = await self._request("POST", "outputs", data=data, prefer="return=representation")
        return result[0] if result else None
    
    async def get_outputs(self, notebook_id: str, output_type: Optional[str] = None) -> List[Dict[str, Any]]:
        filters = {"notebook_id": f"eq.{notebook_id}", "order": "created_at.desc"}
        if output_type:
            filters["type"] = f"eq.{output_type}"
        result = await self._request("GET", "outputs", filters=filters)
        return result or []
    
    # Notes
    async def create_note(self, notebook_id: str, content: str, pinned: bool = False) -> Dict[str, Any]:
        data = [{
            "notebook_id": notebook_id,
            "content": content,
            "pinned": pinned
        }]
        result = await self._request("POST", "notes", data=data, prefer="return=representation")
        return result[0] if result else None
    
    async def get_notes(self, notebook_id: str) -> List[Dict[str, Any]]:
        result = await self._request("GET", "notes", filters={"notebook_id": f"eq.{notebook_id}", "order": "pinned.desc,created_at.desc"})
        return result or []

    # Research History
    async def create_research_history(
        self,
        notebook_id: str,
        topic: str,
        depth: str,
        status: str = "running"
    ) -> Dict[str, Any]:
        data = [{
            "notebook_id": notebook_id,
            "topic": topic,
            "depth": depth,
            "status": status,
            "sources_found": 0
        }]
        result = await self._request("POST", "research_history", data=data, prefer="return=representation")
        return result[0] if result else None

    async def update_research_history(
        self,
        history_id: str,
        status: str,
        sources_found: int
    ) -> Dict[str, Any]:
        data = {
            "status": status,
            "sources_found": sources_found
        }
        result = await self._request("PATCH", "research_history", data=data, filters={"id": f"eq.{history_id}"}, prefer="return=representation")
        return result[0] if result else None
    
    async def get_research_history(self, notebook_id: str) -> List[Dict[str, Any]]:
        result = await self._request("GET", "research_history", filters={"notebook_id": f"eq.{notebook_id}", "order": "created_at.desc"})
        return result or []
    
    async def get_research_history_item(self, history_id: str) -> Optional[Dict[str, Any]]:
        result = await self._request("GET", "research_history", filters={"id": f"eq.{history_id}"})
        return result[0] if result else None
    
    async def clear_research_history(self, notebook_id: str):
        await self._request("DELETE", "research_history", filters={"notebook_id": f"eq.{notebook_id}"})
    
    async def delete_research_history_item(self, history_id: str):
        await self._request("DELETE", "research_history", filters={"id": f"eq.{history_id}"})


# Singleton instance
db = DatabaseService()
