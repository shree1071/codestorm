'use client'

import { useState, useEffect, useRef } from 'react'
import { Network, Maximize2, Minimize2, RefreshCw, Search, Sparkles, Loader2, Info, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'

export default function GraphPanel({ notebookId, sources }) {
  const canvasRef = useRef(null)
  const [graphData, setGraphData] = useState({ nodes: [], edges: [], stats: {} })
  const [graphStats, setGraphStats] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [loading, setLoading] = useState(false)
  const [building, setBuilding] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [queryMode, setQueryMode] = useState('mix')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState(null)
  const [querying, setQuerying] = useState(false)
  const animationRef = useRef(null)
  const [simulation, setSimulation] = useState(null)
  const [filteredNodes, setFilteredNodes] = useState([])
  const [filteredEdges, setFilteredEdges] = useState([])

  // Load graph data on mount
  useEffect(() => {
    loadGraphData()
    loadGraphStats()
  }, [notebookId])

  // Filter nodes based on search
  useEffect(() => {
    if (!searchTerm) {
      setFilteredNodes(graphData.nodes)
      setFilteredEdges(graphData.edges)
    } else {
      const term = searchTerm.toLowerCase()
      const filtered = graphData.nodes.filter(node => 
        node.name?.toLowerCase().includes(term) ||
        node.description?.toLowerCase().includes(term) ||
        node.type?.toLowerCase().includes(term)
      )
      const filteredIds = new Set(filtered.map(n => n.id))
      const edges = graphData.edges.filter(e => 
        filteredIds.has(e.source) && filteredIds.has(e.target)
      )
      setFilteredNodes(filtered)
      setFilteredEdges(edges)
    }
  }, [searchTerm, graphData])

  useEffect(() => {
    if (filteredNodes.length > 0) {
      startSimulation()
      drawGraph()
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [filteredNodes, filteredEdges])

  const loadGraphData = async () => {
    setLoading(true)
    try {
      const data = await api.getGraphData(notebookId)
      setGraphData(data)
      if (data.nodes.length > 0) {
        initializeNodePositions(data.nodes)
      }
    } catch (error) {
      console.error('Failed to load graph data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadGraphStats = async () => {
    try {
      const stats = await api.getGraphStats(notebookId)
      setGraphStats(stats)
    } catch (error) {
      console.error('Failed to load graph stats:', error)
    }
  }

  const buildGraph = async () => {
    if (sources.length === 0) {
      alert('Add sources first before building the knowledge graph')
      return
    }
    
    setBuilding(true)
    try {
      await api.buildGraph(notebookId, false)
      // Poll for completion
      setTimeout(() => {
        loadGraphData()
        loadGraphStats()
        setBuilding(false)
      }, 5000)
    } catch (error) {
      console.error('Failed to build graph:', error)
      alert('Failed to build graph: ' + error.message)
      setBuilding(false)
    }
  }

  const queryGraph = async () => {
    if (!question.trim()) return
    
    setQuerying(true)
    setAnswer(null)
    try {
      const result = await api.queryGraph(notebookId, question, queryMode)
      setAnswer(result)
    } catch (error) {
      console.error('Failed to query graph:', error)
      alert('Failed to query: ' + error.message)
    } finally {
      setQuerying(false)
    }
  }

  const initializeNodePositions = (nodes) => {
    const canvas = canvasRef.current
    const width = canvas?.width || 800
    const height = canvas?.height || 600
    
    nodes.forEach((node, idx) => {
      node.x = Math.random() * width
      node.y = Math.random() * height
      node.vx = 0
      node.vy = 0
      node.radius = 15 + (node.importance || 1) * 5
    })
  }

  const startSimulation = () => {
    setSimulation({
      alpha: 1,
      alphaDecay: 0.02,
      velocityDecay: 0.4
    })
  }

  const applyForces = () => {
    if (!simulation || simulation.alpha < 0.01) return

    const canvas = canvasRef.current
    if (!canvas) return

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2

    filteredNodes.forEach(node => {
      const dx = centerX - node.x
      const dy = centerY - node.y
      node.vx += dx * 0.001 * simulation.alpha
      node.vy += dy * 0.001 * simulation.alpha

      filteredNodes.forEach(other => {
        if (node.id !== other.id) {
          const dx = node.x - other.x
          const dy = node.y - other.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const force = (node.radius + other.radius) * 2 / dist
          node.vx += (dx / dist) * force * simulation.alpha
          node.vy += (dy / dist) * force * simulation.alpha
        }
      })
    })

    filteredEdges.forEach(edge => {
      const source = filteredNodes.find(n => n.id === edge.source)
      const target = filteredNodes.find(n => n.id === edge.target)
      if (source && target) {
        const dx = target.x - source.x
        const dy = target.y - source.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const force = (dist - 100) * (edge.weight || 0.5) * 0.1
        const fx = (dx / dist) * force * simulation.alpha
        const fy = (dy / dist) * force * simulation.alpha
        source.vx += fx
        source.vy += fy
        target.vx -= fx
        target.vy -= fy
      }
    })

    filteredNodes.forEach(node => {
      node.vx *= simulation.velocityDecay
      node.vy *= simulation.velocityDecay
      node.x += node.vx
      node.y += node.vy
    })

    simulation.alpha *= (1 - simulation.alphaDecay)
  }

  const drawGraph = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    filteredEdges.forEach(edge => {
      const source = filteredNodes.find(n => n.id === edge.source)
      const target = filteredNodes.find(n => n.id === edge.target)
      if (source && target) {
        ctx.beginPath()
        ctx.moveTo(source.x, source.y)
        ctx.lineTo(target.x, target.y)
        ctx.globalAlpha = (edge.weight || 0.5) * 0.6
        ctx.stroke()
        ctx.globalAlpha = 1
      }
    })

    filteredNodes.forEach(node => {
      const isSelected = selectedNode?.id === node.id
      
      ctx.beginPath()
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
      
      const importance = node.importance || 1
      const hue = Math.min(importance * 30, 240)
      ctx.fillStyle = `hsl(${hue}, 70%, 60%)`
      ctx.fill()
      
      if (isSelected) {
        ctx.strokeStyle = '#1e40af'
        ctx.lineWidth = 3
        ctx.stroke()
      }

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 11px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const label = node.name?.length > 20 ? node.name.substring(0, 20) + '...' : node.name
      ctx.fillText(label || 'Unknown', node.x, node.y)
    })

    applyForces()
    animationRef.current = requestAnimationFrame(drawGraph)
  }

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const clickedNode = filteredNodes.find(node => {
      const dx = x - node.x
      const dy = y - node.y
      return Math.sqrt(dx * dx + dy * dy) <= node.radius
    })

    setSelectedNode(clickedNode || null)
  }

  const resetSimulation = () => {
    filteredNodes.forEach(node => {
      node.x = Math.random() * (canvasRef.current?.width || 800)
      node.y = Math.random() * (canvasRef.current?.height || 600)
      node.vx = 0
      node.vy = 0
    })
    startSimulation()
  }

  const getNodeConnections = (nodeId) => {
    return filteredEdges.filter(e => e.source === nodeId || e.target === nodeId)
  }

  const getConnectedNodes = (nodeId) => {
    const connections = getNodeConnections(nodeId)
    const connectedIds = new Set()
    connections.forEach(e => {
      if (e.source === nodeId) connectedIds.add(e.target)
      if (e.target === nodeId) connectedIds.add(e.source)
    })
    return Array.from(connectedIds).map(id => 
      filteredNodes.find(n => n.id === id)
    ).filter(Boolean)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-16rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Network className="w-6 h-6" />
            Knowledge Graph
          </h2>
          <p className="text-sm text-muted-foreground">
            {graphStats?.exists ? (
              `${graphStats.entity_count} entities, ${graphStats.relationship_count} relationships`
            ) : (
              'AI-powered knowledge graph from your sources'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!graphStats?.exists && sources.length > 0 && (
            <Button onClick={buildGraph} disabled={building}>
              {building ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Building...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Build Graph
                </>
              )}
            </Button>
          )}
          {graphStats?.exists && (
            <>
              <Button variant="outline" size="sm" onClick={loadGraphData} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={resetSimulation}>
                Reset Layout
              </Button>
            </>
          )}
        </div>
      </div>

      {!graphStats?.exists ? (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Network className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No Knowledge Graph Yet</p>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              Build an AI-powered knowledge graph to extract entities, relationships, and insights from your sources
            </p>
            {sources.length === 0 ? (
              <p className="text-sm text-amber-600">Add sources first to build the graph</p>
            ) : (
              <Button onClick={buildGraph} disabled={building}>
                {building ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Building Graph...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Build Knowledge Graph
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="visualize" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="visualize">Visualize</TabsTrigger>
            <TabsTrigger value="query">Query</TabsTrigger>
          </TabsList>

          <TabsContent value="visualize" className="flex-1 flex gap-4 mt-0">
            <Card className="flex-1">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Entity Graph</CardTitle>
                  <Input
                    placeholder="Search entities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-48 h-8"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0 h-[calc(100%-5rem)]">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredNodes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <Search className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No entities found</p>
                  </div>
                ) : (
                  <canvas
                    ref={canvasRef}
                    onClick={handleCanvasClick}
                    className="w-full h-full cursor-pointer"
                  />
                )}
              </CardContent>
            </Card>

            <div className="w-80 space-y-4 overflow-y-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Graph Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Entities</span>
                    <Badge variant="secondary">{graphData.nodes.length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Relationships</span>
                    <Badge variant="secondary">{graphData.edges.length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Visible</span>
                    <Badge variant="secondary">{filteredNodes.length}</Badge>
                  </div>
                </CardContent>
              </Card>

              {selectedNode && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Selected Entity</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Name</p>
                      <p className="text-sm font-medium">{selectedNode.name}</p>
                    </div>
                    {selectedNode.type && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Type</p>
                        <Badge variant="outline">{selectedNode.type}</Badge>
                      </div>
                    )}
                    {selectedNode.description && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Description</p>
                        <p className="text-sm">{selectedNode.description}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Connections</p>
                      <Badge>{getNodeConnections(selectedNode.id).length}</Badge>
                    </div>
                    {getConnectedNodes(selectedNode.id).length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Connected To</p>
                        <div className="flex flex-wrap gap-1">
                          {getConnectedNodes(selectedNode.id).slice(0, 5).map(node => (
                            <Badge key={node.id} variant="secondary" className="text-xs">
                              {node.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="query" className="flex-1 mt-0">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle>Graph-Enhanced Query</CardTitle>
                <CardDescription>
                  Ask questions and get answers powered by the knowledge graph
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Query Mode</label>
                  <Select value={queryMode} onValueChange={setQueryMode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mix">Mix (Recommended)</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="local">Local</SelectItem>
                      <SelectItem value="global">Global</SelectItem>
                      <SelectItem value="naive">Naive</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Mix mode combines entity-level and community-level search for best results
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Question</label>
                  <Textarea
                    placeholder="Ask a question about your sources..."
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button onClick={queryGraph} disabled={querying || !question.trim()}>
                  {querying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Querying...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Query Graph
                    </>
                  )}
                </Button>

                {answer && (
                  <Card className="flex-1 overflow-auto">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Answer
                        <Badge variant="outline" className="ml-auto">{answer.mode}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{answer.answer}</p>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
