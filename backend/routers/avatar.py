from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.database import db
from services.tavus import tavus_service

router = APIRouter()

class AvatarSessionResponse(BaseModel):
    session_id: str
    conversation_url: str
    status: str

@router.post("/{notebook_id}/avatar/session", response_model=AvatarSessionResponse)
async def create_avatar_session(notebook_id: str):
    """
    Create Tavus avatar conversation session
    Avatar is pre-loaded with all notebook sources
    """
    # Get notebook and sources
    notebook = await db.get_notebook(notebook_id)
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
    
    sources = notebook.get("sources", [])
    if not sources:
        raise HTTPException(status_code=400, detail="No sources in notebook. Add sources first.")
    
    # Create Tavus session with source context
    try:
        session = await tavus_service.create_session(
            notebook_title=notebook["title"],
            sources=sources
        )
        
        return AvatarSessionResponse(
            session_id=session["session_id"],
            conversation_url=session["conversation_url"],
            status=session["status"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create avatar session: {str(e)}")

@router.get("/{notebook_id}/avatar/session")
async def get_avatar_session(notebook_id: str):
    """Get active avatar session for notebook"""
    # This would retrieve from database if we're storing sessions
    # For now, return placeholder
    return {"message": "No active session"}
