'use client'

import { useState } from 'react'
import { Search, Sparkles, CheckCircle2, Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { tavilySearch } from '@/lib/tavily'

export default function ResearchPanel({ notebookId, onSourcesAdded }) {
  const [topic, setTopic] = useState('')
  const [depth, setDepth] = useState('deep')
  const [researching, setResearching] = useState(false)
  const [progress, setProgress] = useState(0)
  const [steps, setSteps] = useState([])
  const [sources, setSources] = useState([])
  const [answer, setAnswer] = useState('')
  const [addingSource, setAddingSource] = useState(null)

  const addSourceToNotebook = async (source) => {
    try {
      setAddingSource(source.url)
      await api.addUrlSource(notebookId, source.url)
      setSteps(prev => [...prev, `✅ Added "${source.title}" to sources`])
      onSourcesAdded?.()
    } catch (error) {
      console.error('Error adding source:', error)
      setSteps(prev => [...prev, `❌ Failed to add source: ${error.message}`])
    } finally {
      setAddingSource(null)
    }
  }

  const startResearch = async () => {
    if (!topic.trim()) return

    setResearching(true)
    setProgress(0)
    setSteps([])
    setSources([])
    setAnswer('')

    try {
      // Show searching step
      setSteps(['🔍 Searching the web with Tavily...'])
      setProgress(20)

      // Determine search parameters based on depth
      const searchParams = {
        quick: { maxResults: 5, searchDepth: 'basic' },
        deep: { maxResults: 10, searchDepth: 'advanced' },
        expert: { maxResults: 15, searchDepth: 'advanced' }
      }[depth] || { maxResults: 10, searchDepth: 'advanced' }

      // Call Tavily directly from frontend
      const result = await tavilySearch(topic, {
        ...searchParams,
        includeAnswer: true,
        includeRawContent: false
      })

      if (result.status === 'error') {
        throw new Error(result.error)
      }

      // Show analyzing step
      setSteps(prev => [...prev, `📄 Found ${result.results?.length || 0} results`])
      setProgress(60)

      // Format sources for display
      const formattedSources = (result.results || []).map(r => ({
        title: r.title,
        url: r.url,
        summary: r.content,
        credibility_score: Math.round(r.score * 10), // Convert 0-1 score to 1-10
        fulltext: r.content
      }))

      setSources(formattedSources)
      setAnswer(result.answer || '')
      setProgress(100)
      setSteps(prev => [...prev, `✅ Research complete! Found ${formattedSources.length} sources`])
      setResearching(false)

    } catch (error) {
      console.error('Research error:', error)
      setSteps(prev => [...prev, `❌ Error: ${error.message}`])
      setResearching(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Research Input */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Deep Research Agent
          </CardTitle>
          <CardDescription>
            AI autonomously searches the web and finds high-quality sources for you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="e.g., Impact of AI on Jobs in India"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !researching && startResearch()}
              disabled={researching}
              className="flex-1"
            />
            <select
              value={depth}
              onChange={(e) => setDepth(e.target.value)}
              disabled={researching}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="quick">Quick (30s)</option>
              <option value="deep">Deep (2min)</option>
              <option value="expert">Expert (5min)</option>
            </select>
            <Button
              onClick={startResearch}
              disabled={researching || !topic.trim()}
              className="bg-gradient-to-r from-blue-500 to-purple-600"
            >
              {researching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Researching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Research
                </>
              )}
            </Button>
          </div>

          {/* Progress Bar */}
          {researching && (
            <div className="space-y-2">
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">{progress}%</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Thinking Steps */}
      {steps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Agent Thinking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  {researching && idx === steps.length - 1 ? (
                    <Loader2 className="w-4 h-4 mt-0.5 animate-spin text-primary flex-shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                  )}
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Answer */}
      {answer && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{answer}</p>
          </CardContent>
        </Card>
      )}

      {/* Sources Found */}
      {sources.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Sources Found ({sources.length})</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {sources.map((source, idx) => (
              <Card key={idx} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{source.title}</CardTitle>
                    <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full flex-shrink-0">
                      {source.credibility_score}/10
                    </span>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {source.summary}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline truncate block"
                  >
                    {source.url}
                  </a>
                  <Button
                    onClick={() => addSourceToNotebook(source)}
                    disabled={addingSource === source.url}
                    size="sm"
                    className="w-full"
                    variant="outline"
                  >
                    {addingSource === source.url ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3 mr-2" />
                        Add to Sources
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
