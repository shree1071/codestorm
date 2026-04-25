# LightRAG Integration Plan for Synapse

## Vision
Integrate LightRAG's knowledge graph capabilities into Synapse to automatically generate and visualize knowledge graphs from sources, enabling graph-based RAG queries.

## What LightRAG Provides

### 1. Knowledge Graph Generation
- Automatic entity extraction from documents
- Relationship mapping between entities
- Hierarchical graph structure (entities → relationships → communities)

### 2. Advanced RAG Modes
- **Naive**: Traditional vector search
- **Local**: Entity-focused search
- **Global**: Community-level search  
- **Hybrid**: Combined approach
- **Mix**: Reranked hybrid (best performance)

### 3. Graph Visualization
- Interactive knowledge graph explorer
- Node filtering and search
- Subgraph extraction
- Multiple layout algorithms

## Architecture Integration

### Backend Components

```
synapse/backend/
├── services/
│   ├── lightrag_service.py      # LightRAG wrapper
│   └── graph_service.py          # Graph operations
├── routers/
│   └── graph.py                  # Graph API endpoints
└── requirements.txt              # Add lightrag-hku
```

### Frontend Components

```
synapse/frontend/src/
├── components/
│   └── graph/
│       ├── GraphPanel.jsx        # Main graph UI
│       ├── GraphVisualization.jsx # D3/Cytoscape viz
│       └── GraphControls.jsx     # Filters, search
└── lib/
    └── graph.js                  # Graph API client
```

## Implementation Phases

### Phase 1: Basic Integration (Week 1)

#### Backend Setup
1. Install LightRAG
```bash
cd synapse/backend
pip install lightrag-hku
```

2. Create LightRAG Service
```python
# services/lightrag_service.py
from lightrag import LightRAG, QueryParam
from lightrag.llm import openai_complete_if_cache

class LightRAGService:
    def __init__(self, working_dir, llm_model, embedding_model):
        self.rag = LightRAG(
            working_dir=working_dir,
            llm_model_func=openai_complete_if_cache,
            llm_model_name=llm_model,
            embedding_func=EmbeddingFunc(
                embedding_dim=1536,
                max_token_size=8192,
                func=lambda texts: openai_embedding(texts)
            )
        )
    
    async def insert_document(self, content, metadata):
        """Add document to knowledge graph"""
        await self.rag.ainsert(content)
    
    async def query(self, question, mode="mix"):
        """Query with graph-enhanced RAG"""
        return await self.rag.aquery(
            question,
            param=QueryParam(mode=mode)
        )
    
    def get_graph_data(self):
        """Export graph for visualization"""
        return self.rag.export_graph()
```

3. Create Graph Router
```python
# routers/graph.py
@router.post("/{notebook_id}/graph/build")
async def build_knowledge_graph(notebook_id: str):
    """Build knowledge graph from all sources"""
    sources = await db.get_sources(notebook_id)
    
    # Initialize LightRAG for this notebook
    rag = lightrag_service.get_or_create(notebook_id)
    
    # Insert all sources
    for source in sources:
        await rag.insert_document(
            content=source['content'],
            metadata={'source_id': source['id']}
        )
    
    return {"status": "success", "entities": count}

@router.get("/{notebook_id}/graph/data")
async def get_graph_data(notebook_id: str):
    """Get graph data for visualization"""
    rag = lightrag_service.get(notebook_id)
    return rag.get_graph_data()

@router.post("/{notebook_id}/graph/query")
async def graph_query(notebook_id: str, request: GraphQueryRequest):
    """Query using graph-enhanced RAG"""
    rag = lightrag_service.get(notebook_id)
    result = await rag.query(
        question=request.question,
        mode=request.mode  # naive, local, global, hybrid, mix
    )
    return {"answer": result, "mode": request.mode}
```

#### Frontend Setup

4. Create Graph Panel Component
```jsx
// components/graph/GraphPanel.jsx
export default function GraphPanel({ notebookId, sources }) {
  const [graphData, setGraphData] = useState(null)
  const [building, setBuilding] = useState(false)
  const [queryMode, setQueryMode] = useState('mix')

  const buildGraph = async () => {
    setBuilding(true)
    await api.buildKnowledgeGraph(notebookId)
    await loadGraph()
    setBuilding(false)
  }

  const loadGraph = async () => {
    const data = await api.getGraphData(notebookId)
    setGraphData(data)
  }

  return (
    <div className="space-y-6">
      {/* Build Graph Section */}
      <Card>
        <CardHeader>
          <CardTitle>Knowledge Graph</CardTitle>
          <CardDescription>
            Automatically extract entities and relationships from your sources
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={buildGraph} disabled={building || sources.length === 0}>
            {building ? 'Building Graph...' : 'Build Knowledge Graph'}
          </Button>
        </CardContent>
      </Card>

      {/* Graph Visualization */}
      {graphData && (
        <GraphVisualization data={graphData} />
      )}

      {/* Graph Query */}
      <GraphQueryPanel 
        notebookId={notebookId}
        mode={queryMode}
        onModeChange={setQueryMode}
      />
    </div>
  )
}
```

### Phase 2: Visualization (Week 2)

5. Implement Graph Visualization
```jsx
// components/graph/GraphVisualization.jsx
import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

export default function GraphVisualization({ data }) {
  const svgRef = useRef()

  useEffect(() => {
    if (!data) return

    const svg = d3.select(svgRef.current)
    const width = 1200
    const height = 800

    // Create force simulation
    const simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.edges).id(d => d.id))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))

    // Draw edges
    const link = svg.append('g')
      .selectAll('line')
      .data(data.edges)
      .join('line')
      .attr('stroke', '#999')
      .attr('stroke-width', 2)

    // Draw nodes
    const node = svg.append('g')
      .selectAll('circle')
      .data(data.nodes)
      .join('circle')
      .attr('r', d => d.importance * 10)
      .attr('fill', d => getNodeColor(d.type))
      .call(drag(simulation))

    // Add labels
    const label = svg.append('g')
      .selectAll('text')
      .data(data.nodes)
      .join('text')
      .text(d => d.name)
      .attr('font-size', 12)

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y)

      node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)

      label
        .attr('x', d => d.x + 15)
        .attr('y', d => d.y + 5)
    })
  }, [data])

  return (
    <Card>
      <CardContent className="p-0">
        <svg ref={svgRef} width="100%" height="800" />
      </CardContent>
    </Card>
  )
}
```

### Phase 3: Advanced Features (Week 3)

6. Graph-Enhanced Chat
```python
# Modify chat.py to use graph mode
@router.post("/{notebook_id}/chat")
async def send_message(notebook_id: str, request: ChatRequest):
    # Check if graph exists
    if lightrag_service.has_graph(notebook_id):
        # Use graph-enhanced RAG
        response = await lightrag_service.query(
            notebook_id=notebook_id,
            question=request.message,
            mode="mix"  # Best performance
        )
    else:
        # Fall back to traditional RAG
        response = await llm_service.chat_with_context(...)
    
    return response
```

7. Incremental Graph Updates
```python
# When new source is added
@router.post("/{notebook_id}/sources/url")
async def add_url_source(notebook_id: str, url: str):
    # Add source to database
    source = await db.create_source(...)
    
    # Update knowledge graph incrementally
    if lightrag_service.has_graph(notebook_id):
        await lightrag_service.insert_document(
            notebook_id=notebook_id,
            content=source['content'],
            metadata={'source_id': source['id']}
        )
    
    return source
```

## Database Schema Updates

```sql
-- Track graph build status
CREATE TABLE knowledge_graphs (
  id UUID PRIMARY KEY,
  notebook_id UUID REFERENCES notebooks(id),
  status TEXT, -- 'building', 'ready', 'error'
  entity_count INTEGER,
  relationship_count INTEGER,
  last_built TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Store graph metadata
CREATE TABLE graph_entities (
  id UUID PRIMARY KEY,
  notebook_id UUID REFERENCES notebooks(id),
  entity_name TEXT,
  entity_type TEXT,
  importance FLOAT,
  source_ids TEXT[], -- Which sources mention this entity
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE graph_relationships (
  id UUID PRIMARY KEY,
  notebook_id UUID REFERENCES notebooks(id),
  source_entity TEXT,
  target_entity TEXT,
  relationship_type TEXT,
  strength FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## UI/UX Design

### Graph Tab Layout

```
┌─────────────────────────────────────────────────┐
│ Knowledge Graph                                  │
│ ┌─────────────────────────────────────────────┐ │
│ │ Build Graph  │ Rebuild │ Export │ Settings  │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ ┌─────────────────────────────────────────────┐ │
│ │                                              │ │
│ │         [Graph Visualization]               │ │
│ │                                              │ │
│ │  • Interactive nodes                        │ │
│ │  • Zoom/Pan                                 │ │
│ │  • Click to explore                         │ │
│ │  • Filter by entity type                    │ │
│ │                                              │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ ┌─────────────────────────────────────────────┐ │
│ │ Graph Query                                  │ │
│ │ [Question input]                            │ │
│ │ Mode: ○ Naive ○ Local ○ Global ● Mix       │ │
│ │ [Ask Question]                              │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

## Key Features to Implement

### 1. Automatic Graph Building
- Build graph when sources are added
- Show progress indicator
- Cache graph data

### 2. Interactive Visualization
- Click nodes to see details
- Hover for quick info
- Filter by entity type
- Search entities
- Zoom and pan

### 3. Graph-Enhanced Queries
- Toggle between traditional and graph RAG
- Show which entities were used
- Visualize query path through graph

### 4. Graph Analytics
- Most important entities
- Strongest relationships
- Community detection
- Entity co-occurrence

### 5. Export Options
- Export as GraphML
- Export as JSON
- Export visualization as PNG
- Export entity list as CSV

## Performance Considerations

1. **Lazy Loading**: Build graph only when requested
2. **Caching**: Cache graph data in database
3. **Incremental Updates**: Update graph when sources change
4. **Pagination**: Limit visible nodes for large graphs
5. **Background Processing**: Build graph asynchronously

## Benefits for Students

1. **Visual Learning**: See connections between concepts
2. **Concept Discovery**: Find related topics automatically
3. **Study Maps**: Export graph as study guide
4. **Better Recall**: Graph structure aids memory
5. **Research Navigation**: Follow entity relationships

## Benefits for Developers

1. **Code Understanding**: Map code dependencies
2. **API Discovery**: See API relationships
3. **Documentation**: Auto-generate architecture diagrams
4. **Debugging**: Trace relationships
5. **Knowledge Base**: Build team knowledge graph

## Next Steps

1. ✅ Install LightRAG in backend
2. ✅ Create basic graph service
3. ✅ Add graph API endpoints
4. ✅ Create Graph Panel component
5. ✅ Implement basic visualization
6. ✅ Add graph query mode
7. ✅ Integrate with chat
8. ✅ Add export functionality

## Estimated Timeline

- **Week 1**: Backend integration + basic API
- **Week 2**: Frontend visualization + UI
- **Week 3**: Advanced features + optimization
- **Week 4**: Testing + documentation

## Dependencies

```txt
# Backend
lightrag-hku>=1.4.0
networkx>=3.0
```

```json
// Frontend
{
  "d3": "^7.8.5",
  "cytoscape": "^3.28.1",
  "react-cytoscapejs": "^2.0.0"
}
```

This integration would make Synapse significantly more powerful for understanding complex documents and research materials!
