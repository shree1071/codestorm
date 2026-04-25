from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from services.database import db

router = APIRouter()

class NotebookCreate(BaseModel):
    title: str

class NotebookUpdate(BaseModel):
    title: str

class NotebookResponse(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str
    source_count: int = 0

@router.post("", response_model=NotebookResponse)
async def create_notebook(notebook: NotebookCreate):
    """Create a new notebook"""
    result = await db.create_notebook(notebook.title)
    return NotebookResponse(
        id=result["id"],
        title=result["title"],
        created_at=result["created_at"],
        updated_at=result["updated_at"],
        source_count=0
    )

@router.get("", response_model=List[NotebookResponse])
async def list_notebooks():
    """List all notebooks"""
    notebooks = await db.list_notebooks()
    return [
        NotebookResponse(
            id=nb["id"],
            title=nb["title"],
            created_at=nb["created_at"],
            updated_at=nb["updated_at"],
            source_count=nb.get("sources", [{}])[0].get("count", 0) if nb.get("sources") else 0
        )
        for nb in notebooks
    ]

@router.get("/{notebook_id}", response_model=NotebookResponse)
async def get_notebook(notebook_id: str):
    """Get notebook by ID"""
    notebook = await db.get_notebook(notebook_id)
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
    
    return NotebookResponse(
        id=notebook["id"],
        title=notebook["title"],
        created_at=notebook["created_at"],
        updated_at=notebook["updated_at"],
        source_count=len(notebook.get("sources", []))
    )

@router.put("/{notebook_id}", response_model=NotebookResponse)
async def update_notebook(notebook_id: str, notebook: NotebookUpdate):
    """Update notebook title"""
    result = await db.update_notebook(notebook_id, notebook.title)
    return NotebookResponse(
        id=result["id"],
        title=result["title"],
        created_at=result["created_at"],
        updated_at=result["updated_at"],
        source_count=0
    )

@router.delete("/{notebook_id}")
async def delete_notebook(notebook_id: str):
    """Delete notebook"""
    await db.delete_notebook(notebook_id)
    return {"message": "Notebook deleted successfully"}
