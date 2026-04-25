'use client'

import { useState } from 'react'
import { Zap, Trophy, Clock, Loader2, Sparkles, CheckCircle2, Download, Copy, MessageSquare, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { callModel, MODELS } from '@/lib/openrouter'

export default function FaceOffPanel({ sources, notebookId, onUseInChat }) {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState({})
  const [selectedWinner, setSelectedWinner] = useState(null)
  const [notes, setNotes] = useState({})
  const [showComparison, setShowComparison] = useState(false)

  const startFaceOff = async () => {
    if (!question.trim()) return

    setLoading(true)
    setResults({})
    setSelectedWinner(null)
    setNotes({})
    setShowComparison(false)

    const modelKeys = Object.keys(MODELS)
    
    // Initialize results with loading state
    const initialResults = {}
    modelKeys.forEach(key => {
      initialResults[key] = {
        model: key,
        modelName: MODELS[key].name,
        provider: MODELS[key].provider,
        color: MODELS[key].color,
        icon: MODELS[key].icon,
        status: 'loading',
        response: '',
        responseTime: 0,
        tokens: 0
      }
    })
    setResults(initialResults)

    // Call all models in parallel and update as they complete
    const promises = modelKeys.map(async (key) => {
      const model = MODELS[key]
      const startTime = Date.now()
      
      try {
        const result = await callModel(model.id, question, sources || [])
        const endTime = Date.now()
        
        setResults(prev => ({
          ...prev,
          [key]: {
            model: key,
            modelName: model.name,
            provider: model.provider,
            color: model.color,
            icon: model.icon,
            response: result.content,
            responseTime: endTime - startTime,
            tokens: result.usage?.total_tokens || 0,
            status: 'success'
          }
        }))
      } catch (error) {
        const endTime = Date.now()
        setResults(prev => ({
          ...prev,
          [key]: {
            model: key,
            modelName: model.name,
            provider: model.provider,
            color: model.color,
            icon: model.icon,
            response: `Error: ${error.message}`,
            responseTime: endTime - startTime,
            tokens: 0,
            status: 'error'
          }
        }))
      }
    })

    await Promise.all(promises)
    setLoading(false)
  }

  const selectWinner = (modelKey) => {
    setSelectedWinner(modelKey)
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  const useInChat = () => {
    if (!selectedWinner || !results[selectedWinner]) return
    const winner = results[selectedWinner]
    if (onUseInChat) {
      onUseInChat(question, winner.response, winner.modelName)
    }
    alert(`Added ${winner.modelName}'s answer to chat!`)
  }

  const exportComparison = () => {
    const markdown = `# Face-Off Comparison

**Question:** ${question}

**Winner:** ${selectedWinner ? results[selectedWinner].modelName : 'Not selected'}

---

${Object.values(results).map(r => `
## ${r.icon} ${r.modelName} (${r.provider})
**Speed:** ${r.responseTime}ms | **Tokens:** ${r.tokens}

${r.response}

${notes[r.model] ? `**Notes:** ${notes[r.model]}` : ''}

---
`).join('\n')}

**Generated:** ${new Date().toLocaleString()}
`
    
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `faceoff-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const generateComparison = () => {
    const successResults = Object.values(results).filter(r => r.status === 'success')
    if (successResults.length < 2) return null

    // Find common points
    const responses = successResults.map(r => r.response.toLowerCase())
    
    return {
      fastest: successResults.reduce((prev, curr) => 
        prev.responseTime < curr.responseTime ? prev : curr
      ),
      longest: successResults.reduce((prev, curr) => 
        prev.response.length > curr.response.length ? prev : curr
      ),
      mostTokens: successResults.reduce((prev, curr) => 
        prev.tokens > curr.tokens ? prev : curr
      )
    }
  }

  const comparison = showComparison ? generateComparison() : null
  const resultsList = Object.values(results)
  const hasResults = resultsList.length > 0

  // Question templates
  const templates = [
    "Explain [concept] in simple terms",
    "What are the pros and cons of [topic]?",
    "Summarize the key points from my sources",
    "Compare and contrast [A] vs [B]",
    "What are 3 different perspectives on [topic]?"
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-orange-50 to-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            AI Model Face-Off
          </CardTitle>
          <CardDescription>
            Compare 3 AI models side-by-side. Export comparisons, add notes, and use the best answer in your chat.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Input
              placeholder="e.g., What are the key findings from my sources?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !loading && startFaceOff()}
              disabled={loading}
              className="text-base"
            />
            
            {/* Quick Templates */}
            {!hasResults && (
              <div className="flex flex-wrap gap-2">
                {templates.map((template, idx) => (
                  <button
                    key={idx}
                    onClick={() => setQuestion(template)}
                    className="text-xs px-2 py-1 rounded-md bg-white border hover:bg-gray-50 transition-colors"
                  >
                    {template}
                  </button>
                ))}
              </div>
            )}

            <Button
              onClick={startFaceOff}
              disabled={loading || !question.trim()}
              size="lg"
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Models Racing...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 mr-2" />
                  Start Face-Off
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {hasResults && !loading && (
        <div className="flex gap-2">
          <Button
            onClick={useInChat}
            disabled={!selectedWinner}
            variant="default"
            className="flex-1"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Use Winner in Chat
          </Button>
          <Button
            onClick={exportComparison}
            variant="outline"
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Comparison
          </Button>
          <Button
            onClick={() => setShowComparison(!showComparison)}
            variant="outline"
          >
            <FileText className="w-4 h-4 mr-2" />
            {showComparison ? 'Hide' : 'Show'} Analysis
          </Button>
        </div>
      )}

      {/* Comparison Analysis */}
      {showComparison && comparison && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-base">Comparison Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span><strong>Fastest:</strong> {comparison.fastest.modelName} ({comparison.fastest.responseTime}ms)</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span><strong>Most Detailed:</strong> {comparison.longest.modelName} ({comparison.longest.response.length} chars)</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span><strong>Most Tokens:</strong> {comparison.mostTokens.modelName} ({comparison.mostTokens.tokens} tokens)</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Side-by-Side Results */}
      {hasResults && (
        <div className="grid gap-4 md:grid-cols-3">
          {resultsList.map((result) => (
            <Card 
              key={result.model}
              className={`border-2 transition-all ${
                selectedWinner === result.model
                  ? 'border-yellow-400 shadow-lg ring-2 ring-yellow-200' 
                  : result.status === 'error'
                  ? 'border-red-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{result.icon}</span>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {result.modelName}
                        {selectedWinner === result.model && (
                          <Trophy className="w-4 h-4 text-yellow-600" />
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs">{result.provider}</CardDescription>
                    </div>
                  </div>
                </div>
                <div className={`h-1 rounded-full bg-gradient-to-r ${result.color} mt-2`} />
              </CardHeader>
              
              <CardContent className="space-y-3">
                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {result.status === 'loading' ? '...' : `${result.responseTime}ms`}
                  </div>
                  {result.tokens > 0 && (
                    <div>{result.tokens} tokens</div>
                  )}
                </div>

                {/* Response */}
                <div className="min-h-[300px] max-h-[400px] overflow-y-auto">
                  {result.status === 'loading' ? (
                    <div className="flex items-center justify-center h-[300px]">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className={`prose prose-sm max-w-none text-sm ${
                      result.status === 'error' ? 'text-red-600' : ''
                    }`}>
                      {result.response}
                    </div>
                  )}
                </div>

                {/* Notes */}
                {result.status === 'success' && (
                  <Textarea
                    placeholder="Add notes about this response..."
                    value={notes[result.model] || ''}
                    onChange={(e) => setNotes(prev => ({ ...prev, [result.model]: e.target.value }))}
                    className="text-xs min-h-[60px]"
                  />
                )}

                {/* Action Buttons */}
                {result.status === 'success' && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => selectWinner(result.model)}
                      variant={selectedWinner === result.model ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1"
                    >
                      {selectedWinner === result.model ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Best
                        </>
                      ) : (
                        <>
                          <Trophy className="w-3 h-3 mr-1" />
                          Select
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => copyToClipboard(result.response)}
                      variant="outline"
                      size="sm"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Ask Another Question */}
      {hasResults && !loading && (
        <Button
          onClick={() => {
            setResults({})
            setQuestion('')
            setSelectedWinner(null)
            setNotes({})
            setShowComparison(false)
          }}
          variant="outline"
          className="w-full"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Ask Another Question
        </Button>
      )}

      {/* Info */}
      {!hasResults && (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium mb-1">How it works</p>
                <p className="text-sm text-muted-foreground mb-3">
                  All 3 models receive your question simultaneously and race to provide answers. 
                  Compare their responses side-by-side, add notes, and select the best one.
                  {sources.length > 0 
                    ? ` They all have access to your ${sources.length} sources.`
                    : ' Add sources for more informed answers!'}
                </p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>✓ Export comparisons as markdown for study notes</p>
                  <p>✓ Add annotations to remember why one answer is better</p>
                  <p>✓ Use the winner directly in your chat conversation</p>
                  <p>✓ See objective metrics: speed, detail, token usage</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
