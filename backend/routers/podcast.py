from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
from services.database import db
from services.tts import tts_service
import os

router = APIRouter()

class PodcastRequest(BaseModel):
    format: Optional[str] = "deep_dive"  # deep_dive, quick_brief, debate, interview
    length: Optional[str] = "medium"  # short (3min), medium (10min), long (20min)

class PodcastResponse(BaseModel):
    id: str
    script: str
    audio_url: str
    duration: int
    format: str

@router.post("/{notebook_id}/podcast/generate", response_model=PodcastResponse)
async def generate_podcast(notebook_id: str, request: PodcastRequest):
    """
    Generate podcast from notebook sources
    Returns script + real audio file
    """
    # Get notebook and sources
    notebook = await db.get_notebook(notebook_id)
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
    
    sources = notebook.get("sources", [])
    if not sources:
        raise HTTPException(status_code=400, detail="No sources in notebook. Add sources first.")
    
    try:
        # Generate podcast script and audio
        podcast = await tts_service.generate_podcast(
            notebook_title=notebook["title"],
            sources=sources,
            format=request.format,
            length=request.length
        )
        
        # Save to database
        output = await db.create_output(
            notebook_id=notebook_id,
            output_type="podcast",
            content={
                "script": podcast["script"],
                "format": request.format,
                "length": request.length,
                "duration": podcast["duration"]
            },
            audio_url=podcast["audio_url"]
        )
        
        return PodcastResponse(
            id=output["id"],
            script=podcast["script"],
            audio_url=podcast["audio_url"],
            duration=podcast["duration"],
            format=request.format
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate podcast: {str(e)}")

@router.get("/{notebook_id}/podcast/audio/{filename}")
async def get_podcast_audio(notebook_id: str, filename: str):
    """Stream podcast audio file"""
    audio_path = os.path.join("audio_output", filename)
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail="Audio file not found")
    
    return FileResponse(
        audio_path,
        media_type="audio/mpeg",
        filename=filename
    )
