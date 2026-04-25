from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional
from services.database import db
from services.ingestion import ingestion_service

router = APIRouter()

class SourceResponse(BaseModel):
    id: str
    notebook_id: str
    type: str
    title: str
    url: Optional[str]
    summary: Optional[str]
    credibility_score: Optional[int]
    created_at: str

class URLSourceRequest(BaseModel):
    url: str

class TextSourceRequest(BaseModel):
    title: str
    content: str

class YouTubeSourceRequest(BaseModel):
    url: str

class GitHubSourceRequest(BaseModel):
    url: str

@router.get("/{notebook_id}/sources", response_model=List[SourceResponse])
async def get_sources(notebook_id: str):
    """Get all sources for a notebook"""
    sources = await db.get_sources(notebook_id)
    return [SourceResponse(**source) for source in sources]

@router.post("/{notebook_id}/sources/url", response_model=SourceResponse)
async def add_url_source(notebook_id: str, request: URLSourceRequest):
    """Add URL source"""
    try:
        # Extract content from URL
        extracted = await ingestion_service.extract_url(request.url)
        
        # Save to database
        source = await db.create_source(
            notebook_id=notebook_id,
            source_type="url",
            title=extracted["title"],
            url=request.url,
            summary=extracted["summary"],
            fulltext=extracted["content"],
            credibility_score=extracted.get("credibility_score", 5)
        )
        
        return SourceResponse(**source)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract URL: {str(e)}")

@router.post("/{notebook_id}/sources/pdf", response_model=SourceResponse)
async def add_pdf_source(
    notebook_id: str,
    file: UploadFile = File(...)
):
    """Upload PDF source"""
    try:
        # Read PDF content
        pdf_bytes = await file.read()
        
        # Extract text from PDF
        extracted = await ingestion_service.extract_pdf(pdf_bytes, file.filename)
        
        # Save to database
        source = await db.create_source(
            notebook_id=notebook_id,
            source_type="pdf",
            title=extracted["title"],
            url=None,
            summary=extracted["summary"],
            fulltext=extracted["content"],
            credibility_score=7  # PDFs generally credible
        )
        
        return SourceResponse(**source)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")

@router.post("/{notebook_id}/sources/youtube", response_model=SourceResponse)
async def add_youtube_source(notebook_id: str, request: YouTubeSourceRequest):
    """Add YouTube video source"""
    try:
        # Extract transcript
        extracted = await ingestion_service.extract_youtube(request.url)
        
        # Save to database
        source = await db.create_source(
            notebook_id=notebook_id,
            source_type="youtube",
            title=extracted["title"],
            url=request.url,
            summary=extracted["summary"],
            fulltext=extracted["transcript"],
            credibility_score=6
        )
        
        return SourceResponse(**source)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract YouTube: {str(e)}")

@router.post("/{notebook_id}/sources/text", response_model=SourceResponse)
async def add_text_source(notebook_id: str, request: TextSourceRequest):
    """Add plain text source"""
    try:
        # Generate summary
        summary = await ingestion_service.summarize_text(request.content)
        
        # Save to database
        source = await db.create_source(
            notebook_id=notebook_id,
            source_type="text",
            title=request.title,
            url=None,
            summary=summary,
            fulltext=request.content,
            credibility_score=5
        )
        
        return SourceResponse(**source)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add text: {str(e)}")

@router.post("/{notebook_id}/sources/github", response_model=SourceResponse)
async def add_github_source(notebook_id: str, request: GitHubSourceRequest):
    """Add GitHub repository or file source"""
    try:
        # Extract content from GitHub
        extracted = await ingestion_service.extract_github(request.url)
        
        # Save to database
        source = await db.create_source(
            notebook_id=notebook_id,
            source_type="github",
            title=extracted["title"],
            url=request.url,
            summary=extracted["summary"],
            fulltext=extracted["content"],
            credibility_score=extracted.get("credibility_score", 8)
        )
        
        return SourceResponse(**source)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract GitHub: {str(e)}")

@router.delete("/{notebook_id}/sources/{source_id}")
async def delete_source(notebook_id: str, source_id: str):
    """Delete a source"""
    await db.delete_source(source_id)
    return {"message": "Source deleted successfully"}
