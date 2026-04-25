from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from services.database import db
from services.llm import llm_service

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    model: Optional[str] = "gpt-4"

class ChatResponse(BaseModel):
    content: str
    model: str
    citations: List[str]

class ChatMessage(BaseModel):
    id: str
    role: str
    content: str
    model: Optional[str]
    citations: Optional[List[str]]
    created_at: str

@router.post("/{notebook_id}/chat", response_model=ChatResponse)
async def send_message(notebook_id: str, request: ChatRequest):
    """Send a chat message"""
    # Get notebook and sources
    notebook = await db.get_notebook(notebook_id)
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
    
    # Get sources from separate table
    sources = await db.get_sources(notebook_id)
    print(f"DEBUG: Found {len(sources)} sources")
    if sources:
        print(f"DEBUG: First source keys: {sources[0].keys()}")
        print(f"DEBUG: First source summary length: {len(sources[0].get('summary', ''))}")
    
    if not sources:
        raise HTTPException(status_code=400, detail="No sources in notebook. Add sources first.")
    
    # Get chat history
    history = await db.get_chat_history(notebook_id)
    chat_history = [
        {"role": msg["role"], "content": msg["content"]}
        for msg in history[-10:]  # Last 10 messages
    ]
    
    # Get response from LLM
    response = await llm_service.chat_with_context(
        user_message=request.message,
        sources=sources,
        chat_history=chat_history,
        model=request.model
    )
    
    # Save user message
    await db.create_message(
        notebook_id=notebook_id,
        role="user",
        content=request.message,
        model=None
    )
    
    # Save assistant response
    await db.create_message(
        notebook_id=notebook_id,
        role="assistant",
        content=response["content"],
        model=response["model"],
        citations=response["citations"]
    )
    
    return ChatResponse(
        content=response["content"],
        model=response["model"],
        citations=response["citations"]
    )

@router.get("/{notebook_id}/chat/history", response_model=List[ChatMessage])
async def get_chat_history(notebook_id: str):
    """Get chat history"""
    history = await db.get_chat_history(notebook_id)
    return [ChatMessage(**msg) for msg in history]

@router.delete("/{notebook_id}/chat/history")
async def clear_chat_history(notebook_id: str):
    """Clear chat history"""
    await db.clear_chat_history(notebook_id)
    return {"message": "Chat history cleared"}
