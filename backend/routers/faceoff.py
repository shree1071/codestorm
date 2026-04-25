from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from services.database import db
from services.llm import llm_service

router = APIRouter()

class FaceOffRequest(BaseModel):
    question: str
    models: Optional[List[str]] = None  # Default: all 3

class ModelResponse(BaseModel):
    content: str
    model: str
    citations: List[str]

class FaceOffResponse(BaseModel):
    question: str
    responses: Dict[str, ModelResponse]
    analysis: Dict[str, str]

@router.post("/{notebook_id}/faceoff", response_model=FaceOffResponse)
async def model_faceoff(notebook_id: str, request: FaceOffRequest):
    """
    Get responses from multiple models simultaneously
    Returns responses from Claude, GPT-4, and Gemini + agreement analysis
    """
    # Get notebook
    notebook = await db.get_notebook(notebook_id)
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
    
    # Get sources from separate table
    sources = await db.get_sources(notebook_id)
    if not sources:
        raise HTTPException(status_code=400, detail="No sources in notebook. Add sources first.")
    
    # Default to all 3 models
    models = request.models or ["gpt-4", "claude", "gemini"]
    
    # Get multi-model responses
    result = await llm_service.multi_model_chat(
        user_message=request.question,
        sources=sources,
        models=models
    )
    
    # Format responses
    formatted_responses = {}
    for model, response in result["responses"].items():
        formatted_responses[model] = ModelResponse(
            content=response["content"],
            model=response["model"],
            citations=response["citations"]
        )
    
    return FaceOffResponse(
        question=request.question,
        responses=formatted_responses,
        analysis=result["analysis"]
    )
