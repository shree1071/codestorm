from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from services.database import db
from services.llm import llm_service
from prompts import quiz, study_guide

router = APIRouter()

class OutputResponse(BaseModel):
    id: str
    type: str
    content: Dict[str, Any]
    created_at: str

@router.post("/{notebook_id}/outputs/quiz", response_model=OutputResponse)
async def generate_quiz(notebook_id: str):
    """Generate quiz from sources"""
    notebook = await db.get_notebook(notebook_id)
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
    
    sources = notebook.get("sources", [])
    if not sources:
        raise HTTPException(status_code=400, detail="No sources in notebook")
    
    # Generate quiz using LLM
    quiz_content = await quiz.generate_quiz(sources)
    
    # Save to database
    output = await db.create_output(
        notebook_id=notebook_id,
        output_type="quiz",
        content=quiz_content
    )
    
    return OutputResponse(**output)

@router.post("/{notebook_id}/outputs/study-guide", response_model=OutputResponse)
async def generate_study_guide(notebook_id: str):
    """Generate study guide from sources"""
    notebook = await db.get_notebook(notebook_id)
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
    
    sources = notebook.get("sources", [])
    if not sources:
        raise HTTPException(status_code=400, detail="No sources in notebook")
    
    # Generate study guide
    guide_content = await study_guide.generate_study_guide(sources)
    
    # Save to database
    output = await db.create_output(
        notebook_id=notebook_id,
        output_type="study_guide",
        content=guide_content
    )
    
    return OutputResponse(**output)

@router.post("/{notebook_id}/outputs/flashcards", response_model=OutputResponse)
async def generate_flashcards(notebook_id: str):
    """Generate flashcards from sources"""
    notebook = await db.get_notebook(notebook_id)
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
    
    sources = notebook.get("sources", [])
    if not sources:
        raise HTTPException(status_code=400, detail="No sources in notebook")
    
    # Generate flashcards
    from prompts.flashcards import generate_flashcards
    flashcard_content = await generate_flashcards(sources)
    
    # Save to database
    output = await db.create_output(
        notebook_id=notebook_id,
        output_type="flashcards",
        content=flashcard_content
    )
    
    return OutputResponse(**output)

@router.get("/{notebook_id}/outputs", response_model=List[OutputResponse])
async def get_outputs(notebook_id: str, output_type: str = None):
    """Get all outputs for notebook"""
    outputs = await db.get_outputs(notebook_id, output_type)
    return [OutputResponse(**output) for output in outputs]
