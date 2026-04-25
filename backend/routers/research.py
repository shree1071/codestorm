from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
import json
from services.database import db

router = APIRouter()

# DEPRECATED: Research is now handled directly from frontend via Tavily
# This endpoint is kept for backward compatibility but should not be used
# See frontend/src/lib/tavily.js for the new implementation

class ResearchRequest(BaseModel):
    topic: str
    depth: Optional[str] = "deep"  # quick, deep, expert

@router.get("/{notebook_id}/research")
async def start_research(notebook_id: str, topic: str, depth: str = "deep"):
    """
    DEPRECATED: Use Tavily directly from frontend
    
    This endpoint is no longer maintained. Research is now performed
    client-side using the Tavily API for better performance.
    
    See: frontend/src/lib/tavily.js
    """
    raise HTTPException(
        status_code=410,
        detail="This endpoint is deprecated. Use Tavily directly from frontend. See ARCHITECTURE.md"
    )


class ResearchHistoryResponse(BaseModel):
    id: str
    notebook_id: str
    topic: str
    depth: str
    status: str
    sources_found: int
    created_at: str

@router.get("/{notebook_id}/research/history", response_model=List[ResearchHistoryResponse])
async def get_research_history(notebook_id: str):
    """
    Get research history for a notebook
    Like Google search history - shows all past research queries
    """
    history = await db.get_research_history(notebook_id)
    return [ResearchHistoryResponse(**item) for item in history]

@router.delete("/{notebook_id}/research/history")
async def clear_research_history(notebook_id: str):
    """Clear all research history for a notebook"""
    await db.clear_research_history(notebook_id)
    return {"message": "Research history cleared"}

@router.delete("/{notebook_id}/research/history/{history_id}")
async def delete_research_history_item(notebook_id: str, history_id: str):
    """Delete a specific research history item"""
    await db.delete_research_history_item(history_id)
    return {"message": "Research history item deleted"}

@router.post("/{notebook_id}/research/history/{history_id}/rerun")
async def rerun_research(notebook_id: str, history_id: str):
    """
    Re-run a previous research query
    Redirects to the research endpoint with the same parameters
    """
    history_item = await db.get_research_history_item(history_id)
    if not history_item:
        raise HTTPException(status_code=404, detail="Research history not found")
    
    # Return the parameters to re-run
    return {
        "topic": history_item["topic"],
        "depth": history_item["depth"],
        "message": "Use these parameters to start research again"
    }
