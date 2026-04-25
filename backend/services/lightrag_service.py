"""
LightRAG Service - Knowledge Graph Generation and Graph-Enhanced RAG
Adapted from lightrag-notebook implementation
"""
import os
import json
from pathlib import Path
from typing import Dict, List, Optional
from lightrag import LightRAG, QueryParam
from lightrag.utils import EmbeddingFunc
from google import genai
import asyncio
import numpy as np

class LightRAGService:
    def __init__(self, base_dir: str = "./lightrag_data"):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(exist_ok=True)
        self.instances: Dict[str, LightRAG] = {}
        
        # Get Gemini API key from environment
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        if not self.gemini_api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
    
    def _get_client(self):
        """Create a new Gemini client (don't store to avoid pickle issues)"""
        return genai.Client(api_key=self.gemini_api_key)
    
    async def _gemini_llm_complete(
        self, prompt, system_prompt=None, history_messages=[], **kwargs
    ) -> str:
        """Wrapper for Gemini LLM completion"""
        full_prompt = ""
        if system_prompt:
            full_prompt += f"{system_prompt}\n\n"
        
        for msg in history_messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            full_prompt += f"{role}: {content}\n"
        
        full_prompt += f"\n{prompt}"
        
        client = self._get_client()
        response = client.models.generate_content(
            model="models/gemini-2.5-flash",
            contents=full_prompt
        )
        return response.text
    
    async def _gemini_embedding_func(self, texts: list[str]) -> list[list[float]]:
        """Wrapper for Gemini embeddings"""
        client = self._get_client()
        embeddings = []
        for text in texts:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda t=text: client.models.embed_content(
                    model="models/gemini-embedding-2",
                    contents=t
                )
            )
            embeddings.append(result.embeddings[0].values)
        
        return np.array(embeddings)
    
    def _get_working_dir(self, notebook_id: str) -> str:
        """Get working directory for a notebook"""
        working_dir = self.base_dir / notebook_id
        working_dir.mkdir(exist_ok=True)
        return str(working_dir)
    
    def get_or_create(self, notebook_id: str) -> LightRAG:
        """Get or create LightRAG instance for a notebook"""
        if notebook_id not in self.instances:
            working_dir = self._get_working_dir(notebook_id)
            
            # Initialize LightRAG with Gemini
            self.instances[notebook_id] = LightRAG(
                working_dir=working_dir,
                llm_model_func=self._gemini_llm_complete,
                embedding_func=EmbeddingFunc(
                    embedding_dim=3072,  # gemini-embedding-2 uses 3072 dimensions
                    max_token_size=8192,
                    func=self._gemini_embedding_func
                ),
            )
        
        return self.instances[notebook_id]
    
    def has_graph(self, notebook_id: str) -> bool:
        """Check if a knowledge graph exists for this notebook"""
        working_dir = self._get_working_dir(notebook_id)
        # Check for either graphml or entity JSON files
        graph_file = Path(working_dir) / "graph_chunk_entity_relation.graphml"
        entities_file = Path(working_dir) / "kv_store_full_entities.json"
        return graph_file.exists() or entities_file.exists()
    
    async def insert_document(self, notebook_id: str, content: str, metadata: dict = None):
        """Insert a document into the knowledge graph"""
        rag = self.get_or_create(notebook_id)
        
        # Initialize storages if needed
        await rag.initialize_storages()
        
        # Add metadata as prefix if provided
        if metadata:
            content = f"[Source: {metadata.get('title', 'Unknown')}]\n\n{content}"
        
        # Insert document (this will extract entities and relationships)
        await rag.ainsert(content)
        
        return {"status": "success"}
    
    async def insert_batch(self, notebook_id: str, documents: List[dict]):
        """Insert multiple documents"""
        rag = self.get_or_create(notebook_id)
        await rag.initialize_storages()
        
        # Prepare documents with metadata
        contents = []
        for doc in documents:
            content = doc.get('content', '')
            metadata = doc.get('metadata', {})
            if metadata:
                content = f"[Source: {metadata.get('title', 'Unknown')}]\n\n{content}"
            contents.append(content)
        
        # Batch insert
        combined_content = "\n\n---\n\n".join(contents)
        await rag.ainsert(combined_content)
        
        return {"status": "success", "count": len(documents)}
    
    async def query(
        self, 
        notebook_id: str, 
        question: str, 
        mode: str = "mix",
        only_need_context: bool = False
    ):
        """Query using graph-enhanced RAG"""
        rag = self.get_or_create(notebook_id)
        await rag.initialize_storages()
        
        # Query modes: naive, local, global, hybrid, mix
        result = await rag.aquery(
            question,
            param=QueryParam(
                mode=mode,
                only_need_context=only_need_context,
                enable_rerank=False
            )
        )
        
        return result
    
    def get_graph_data(self, notebook_id: str) -> dict:
        """Get graph data for visualization"""
        working_dir = self._get_working_dir(notebook_id)
        
        # Read graph files
        entities_file = Path(working_dir) / "kv_store_full_entities.json"
        relations_file = Path(working_dir) / "kv_store_full_relations.json"
        
        nodes = []
        edges = []
        
        # Load entities
        if entities_file.exists():
            with open(entities_file, 'r', encoding='utf-8') as f:
                entities_data = json.load(f)
                for entity_name, entity_info in entities_data.items():
                    if isinstance(entity_info, dict):
                        nodes.append({
                            "id": entity_name,
                            "name": entity_name,
                            "type": entity_info.get("entity_type", "unknown"),
                            "description": entity_info.get("description", ""),
                            "importance": len(entity_info.get("source_id", "").split(","))
                        })
        
        # Load relationships
        if relations_file.exists():
            with open(relations_file, 'r', encoding='utf-8') as f:
                relations_data = json.load(f)
                for rel_key, rel_info in relations_data.items():
                    if isinstance(rel_info, dict):
                        edges.append({
                            "source": rel_info.get("src_id", ""),
                            "target": rel_info.get("tgt_id", ""),
                            "type": rel_info.get("description", "related_to"),
                            "weight": rel_info.get("weight", 1.0)
                        })
        
        return {
            "nodes": nodes,
            "edges": edges,
            "stats": {
                "entity_count": len(nodes),
                "relationship_count": len(edges)
            }
        }
    
    def get_stats(self, notebook_id: str) -> dict:
        """Get statistics about the knowledge graph"""
        if not self.has_graph(notebook_id):
            return {
                "exists": False,
                "entity_count": 0,
                "relationship_count": 0
            }
        
        graph_data = self.get_graph_data(notebook_id)
        return {
            "exists": True,
            "entity_count": len(graph_data["nodes"]),
            "relationship_count": len(graph_data["edges"])
        }
    
    async def rebuild_graph(self, notebook_id: str, documents: List[dict]):
        """Rebuild the entire knowledge graph"""
        # Clear existing graph
        working_dir = self._get_working_dir(notebook_id)
        
        # Remove old instance
        if notebook_id in self.instances:
            del self.instances[notebook_id]
        
        # Clear graph files
        for file in Path(working_dir).glob("*.json"):
            file.unlink()
        for file in Path(working_dir).glob("*.graphml"):
            file.unlink()
        
        # Rebuild with all documents
        return await self.insert_batch(notebook_id, documents)
    
    def delete_graph(self, notebook_id: str):
        """Delete knowledge graph for a notebook"""
        working_dir = self._get_working_dir(notebook_id)
        
        # Remove instance
        if notebook_id in self.instances:
            del self.instances[notebook_id]
        
        # Delete all files
        import shutil
        if Path(working_dir).exists():
            shutil.rmtree(working_dir)
        
        return {"status": "deleted"}


# Global instance
lightrag_service = LightRAGService()
