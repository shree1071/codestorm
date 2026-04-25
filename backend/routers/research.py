from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import json
from services.agent import research_agent
from services.database import db

router = APIRouter()

class ResearchRequest(BaseModel):
    topic: str
    depth: Optional[str] = "deep"  # quick, deep, expert

@router.get("/{notebook_id}/research")
async def start_research(notebook_id: str, topic: str, depth: str = "deep"):
    """
    Start deep research on a topic
    Returns SSE stream of progress updates
    """
    # Verify notebook exists
    notebook = await db.get_notebook(notebook_id)
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
    
    # Save research query to history
    research_history = await db.create_research_history(
        notebook_id=notebook_id,
        topic=topic,
        depth=depth,
        status="running"
    )
    history_id = research_history["id"]
    
    async def event_stream():
        """Stream research progress as SSE"""
        sources_found = 0
        try:
            async for update in research_agent.research(topic, depth):
                # Send as SSE event
                yield f"data: {json.dumps(update)}\n\n"
                
                # If source found, save to database
                if update["type"] == "source":
                    source = update["source"]
                    await db.create_source(
                        notebook_id=notebook_id,
                        source_type="url",
                        title=source["title"],
                        url=source["url"],
                        summary=source["summary"],
                        fulltext=source["fulltext"],
                        credibility_score=source["credibility_score"]
                    )
                    sources_found += 1
                
                # If complete, update history
                if update["type"] == "complete":
                    await db.update_research_history(
                        history_id=history_id,
                        status="completed",
                        sources_found=sources_found
                    )
        except Exception as e:
            # Update history with error
            await db.update_research_history(
                history_id=history_id,
                status="failed",
                sources_found=sources_found
            )
            error_update = {
                "type": "error",
                "message": f"Research failed: {str(e)}",
                "progress": 0
            }
            yield f"data: {json.dumps(error_update)}\n\n"
    
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
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
