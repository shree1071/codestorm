'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Loader2, Bot, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'

export default function ChatPanel({ notebookId, sources }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [model, setModel] = useState('gpt-4')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    loadHistory()
  }, [notebookId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadHistory = async () => {
    try {
      const history = await api.getChatHistory(notebookId)
      setMessages(history)
    } catch (error) {
      console.error('Failed to load chat history:', error)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    if (sources.length === 0) {
      alert('Add sources first before chatting')
      return
    }

    const userMessage = input
    setInput('')
    setLoading(true)

    // Add user message optimistically
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    }])

    try {
      const response = await api.sendMessage(notebookId, userMessage, model)
      
      // Add assistant response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.content,
        model: response.model,
        citations: response.citations,
        created_at: new Date().toISOString()
      }])
    } catch (error) {
      console.error('Failed to send message:', error)
      alert('Failed to send message')
    } finally {
      setLoading(false)
    }
  }

  const clearHistory = async () => {
    if (!confirm('Clear all chat history?')) return
    try {
      await api.clearChatHistory(notebookId)
      setMessages([])
    } catch (error) {
      console.error('Failed to clear history:', error)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-16rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">Chat with Notebook</h2>
          <p className="text-sm text-muted-foreground">
            Ask questions about your {sources.length} sources
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background text-sm"
          >
            <option value="gpt-4">GPT-4</option>
            <option value="claude">Claude</option>
            <option value="gemini">Gemini</option>
          </select>
          <Button variant="outline" size="sm" onClick={clearHistory}>
            Clear History
          </Button>
        </div>
      </div>

      {/* Messages */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Start a conversation</p>
              <p className="text-muted-foreground">
                Ask questions about your sources and I'll answer with citations
              </p>
            </div>
          ) : (
            <>
              {messages.map((message, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    {message.citations && message.citations.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <p className="text-xs opacity-70 mb-1">Sources:</p>
                        {message.citations.map((citation, cidx) => (
                          <a
                            key={cidx}
                            href={citation}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs opacity-70 hover:opacity-100 block truncate"
                          >
                            [{cidx + 1}] {citation}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Input */}
      <div className="flex gap-2 mt-4">
        <Input
          placeholder="Ask a question about your sources..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          disabled={loading || sources.length === 0}
          className="flex-1"
        />
        <Button
          onClick={sendMessage}
          disabled={loading || !input.trim() || sources.length === 0}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  )
}
