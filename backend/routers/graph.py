"""
Knowledge Graph Router - LightRAG Integration
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
from services.lightrag_service import lightrag_service
from services.database import db

router = APIRouter()


class GraphBuildRequest(BaseModel):
    rebuild: Optional[bool] = False


class GraphQueryRequest(BaseModel):
    question: str
    mode: Optional[str] = "mix"  # naive, local, global, hybrid, mix


class GraphQueryResponse(BaseModel):
    answer: str
    mode: str
    context: Optional[str] = None


@router.get("/{notebook_id}/graph/stats")
async def get_graph_stats(notebook_id: str):
    """Get knowledge graph statistics"""
    try:
        stats = lightrag_service.get_stats(notebook_id)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")


@router.post("/{notebook_id}/graph/build")
async def build_knowledge_graph(
    notebook_id: str,
    request: GraphBuildRequest,
    background_tasks: BackgroundTasks
):
    """
    Build knowledge graph from all sources
    
    This runs in the background and can take a while for large documents.
    """
    try:
        # Get notebook
        notebook = await db.get_notebook(notebook_id)
        if not notebook:
            raise HTTPException(status_code=404, detail="Notebook not found")
        
        # Get all sources
        sources = await db.get_sources(notebook_id)
        if not sources:
            raise HTTPException(status_code=400, detail="No sources to build graph from")
        
        print(f"[DEBUG] Building graph from {len(sources)} sources")
        
        # Prepare documents for LightRAG
        documents = []
        for source in sources:
            # Get content from source (try fulltext first, then summary)
            content = source.get('fulltext') or source.get('content') or source.get('summary', '')
            if content:
                print(f"[DEBUG] Adding source: {source.get('title')} ({len(content)} chars)")
                documents.append({
                    'content': content,
                    'metadata': {
                        'title': source.get('title', 'Unknown'),
                        'source_id': source.get('id'),
                        'type': source.get('type')
                    }
                })
        
        if not documents:
            raise HTTPException(status_code=400, detail="No content found in sources")
        
        print(f"[DEBUG] Prepared {len(documents)} documents for graph building")
        
        # Build graph immediately (not in background for now to debug)
        try:
            if request.rebuild:
                result = await lightrag_service.rebuild_graph(notebook_id, documents)
            else:
                result = await lightrag_service.insert_batch(notebook_id, documents)
            print(f"[DEBUG] Graph build result: {result}")
        except Exception as e:
            print(f"[ERROR] Graph build error: {e}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Graph build failed: {str(e)}")
        
        return {
            "status": "completed",
            "message": f"Built knowledge graph from {len(documents)} sources",
            "source_count": len(documents)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[ERROR] Failed to build graph: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to build graph: {str(e)}")


@router.get("/{notebook_id}/graph/data")
async def get_graph_data(notebook_id: str):
    """
    Get graph data for visualization
    
    Returns nodes (entities) and edges (relationships)
    """
    try:
        if not lightrag_service.has_graph(notebook_id):
            return {
                "nodes": [],
                "edges": [],
                "stats": {
                    "entity_count": 0,
                    "relationship_count": 0
                }
            }
        
        graph_data = lightrag_service.get_graph_data(notebook_id)
        return graph_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get graph data: {str(e)}")


@router.post("/{notebook_id}/graph/query", response_model=GraphQueryResponse)
async def query_with_graph(notebook_id: str, request: GraphQueryRequest):
    """
    Query using graph-enhanced RAG
    
    Modes:
    - naive: Simple vector search (no graph)
    - local: Entity-focused search
    - global: Community-level search
    - hybrid: Combines local + global
    - mix: Reranked hybrid (best performance, recommended)
    """
    try:
        # Validate mode
        valid_modes = ["naive", "local", "global", "hybrid", "mix"]
        if request.mode not in valid_modes:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid mode. Must be one of: {', '.join(valid_modes)}"
            )
        
        # Check if graph exists
        if not lightrag_service.has_graph(notebook_id):
            raise HTTPException(
                status_code=400,
                detail="Knowledge graph not built yet. Build it first using POST /graph/build"
            )
        
        # Query with graph
        answer = await lightrag_service.query(
            notebook_id=notebook_id,
            question=request.question,
            mode=request.mode,
            only_need_context=False
        )
        
        return GraphQueryResponse(
            answer=answer,
            mode=request.mode
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


@router.delete("/{notebook_id}/graph")
async def delete_graph(notebook_id: str):
    """Delete knowledge graph for a notebook"""
    try:
        result = lightrag_service.delete_graph(notebook_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete graph: {str(e)}")


@router.post("/{notebook_id}/graph/add-source")
async def add_source_to_graph(notebook_id: str, source_id: str, background_tasks: BackgroundTasks):
    """
    Add a single source to existing knowledge graph
    
    Use this when a new source is added to incrementally update the graph
    """
    try:
        # Get source
        sources = await db.get_sources(notebook_id)
        source = next((s for s in sources if s['id'] == source_id), None)
        
        if not source:
            raise HTTPException(status_code=404, detail="Source not found")
        
        content = source.get('fulltext') or source.get('content') or source.get('summary', '')
        if not content:
            raise HTTPException(status_code=400, detail="Source has no content")
        
        # Add to graph in background
        async def add_to_graph():
            try:
                await lightrag_service.insert_document(
                    notebook_id=notebook_id,
                    content=content,
                    metadata={
                        'title': source.get('title', 'Unknown'),
                        'source_id': source_id,
                        'type': source.get('type')
                    }
                )
            except Exception as e:
                print(f"Error adding source to graph: {e}")
        
        background_tasks.add_task(add_to_graph)
        
        return {
            "status": "processing",
            "message": f"Adding source to knowledge graph in background"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add source: {str(e)}")
