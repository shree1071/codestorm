from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import List, Dict, Any

router = APIRouter()

class SearchResult(BaseModel):
    type: str  # source, note, chat_message
    id: str
    notebook_id: str
    title: str
    content: str
    url: str = None
    created_at: str

@router.get("/search", response_model=List[SearchResult])
async def search(q: str = Query(..., min_length=1)):
    """Full-text search across all notebooks"""
    # This would use PostgreSQL full-text search or Neo4j
    # Placeholder for now
    return []
