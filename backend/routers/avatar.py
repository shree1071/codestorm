from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.database import db

router = APIRouter()

# DEPRECATED: Avatar sessions are now created directly from frontend via Tavus
# This endpoint is kept for backward compatibility but should not be used
# See frontend/src/lib/tavus.js for the new implementation

class AvatarSessionResponse(BaseModel):
    session_id: str
    conversation_url: str
    status: str

@router.post("/{notebook_id}/avatar/session", response_model=AvatarSessionResponse)
async def create_avatar_session(notebook_id: str):
    """
    DEPRECATED: Use Tavus directly from frontend
    
    This endpoint is no longer maintained. Avatar sessions are now created
    client-side using the Tavus API for better performance and reduced backend load.
    
    See: frontend/src/lib/tavus.js
    """
    raise HTTPException(
        status_code=410,
        detail="This endpoint is deprecated. Use Tavus directly from frontend. See ARCHITECTURE.md"
    )

@router.get("/{notebook_id}/avatar/session")
async def get_avatar_session(notebook_id: str):
    """
    DEPRECATED: Avatar session management moved to frontend
    """
    raise HTTPException(
        status_code=410,
        detail="This endpoint is deprecated. Avatar sessions are managed client-side."
    )
