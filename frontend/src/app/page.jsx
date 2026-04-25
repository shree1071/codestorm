'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, BookOpen, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { api } from '@/lib/api'

export default function Home() {
  const router = useRouter()
  const [notebooks, setNotebooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newNotebookTitle, setNewNotebookTitle] = useState('')

  useEffect(() => {
    loadNotebooks()
  }, [])

  const loadNotebooks = async () => {
    try {
      const data = await api.listNotebooks()
      setNotebooks(data)
    } catch (error) {
      console.error('Failed to load notebooks:', error)
    } finally {
      setLoading(false)
    }
  }

  const createNotebook = async () => {
    if (!newNotebookTitle.trim()) return
    
    setCreating(true)
    try {
      const notebook = await api.createNotebook(newNotebookTitle)
      router.push(`/notebook/${notebook.id}`)
    } catch (error) {
      console.error('Failed to create notebook:', error)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Synapse
                </h1>
                <p className="text-xs text-muted-foreground">AI Research Notebook</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            NotebookLM gives you one brain.
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Synapse gives you many.
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            AI-powered research that finds sources for you, lets you talk to an expert avatar,
            and compares answers from Claude, GPT-4, and Gemini simultaneously.
          </p>
        </div>

        {/* Create New Notebook */}
        <div className="max-w-2xl mx-auto mb-12">
          <Card className="border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create New Notebook
              </CardTitle>
              <CardDescription>
                Start researching any topic with AI-powered source discovery
              </CardDescription>
              <div className="flex gap-2 pt-4">
                <Input
                  placeholder="e.g., Impact of AI on Jobs in India"
                  value={newNotebookTitle}
                  onChange={(e) => setNewNotebookTitle(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && createNotebook()}
                  className="flex-1"
                />
                <Button 
                  onClick={createNotebook} 
                  disabled={creating || !newNotebookTitle.trim()}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  {creating ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Notebooks List */}
        <div className="max-w-4xl mx-auto">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Your Notebooks
          </h3>
          
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading notebooks...
            </div>
          ) : notebooks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No notebooks yet. Create your first one above!
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {notebooks.map((notebook) => (
                <Card
                  key={notebook.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => router.push(`/notebook/${notebook.id}`)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{notebook.title}</CardTitle>
                    <CardDescription>
                      {notebook.source_count} sources • Created {new Date(notebook.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
