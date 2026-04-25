'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import ResearchPanel from '@/components/research/ResearchPanel'
import SourcesPanel from '@/components/sources/SourcesPanel'
import ChatPanel from '@/components/chat/ChatPanel'
import FaceOffPanel from '@/components/faceoff/FaceOffPanel'
import AvatarPanel from '@/components/avatar/AvatarPanel'
import OutputsPanel from '@/components/outputs/OutputsPanel'

export default function NotebookPage() {
  const params = useParams()
  const router = useRouter()
  const [notebook, setNotebook] = useState(null)
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('research')

  useEffect(() => {
    loadNotebook()
  }, [params.id])

  const loadNotebook = async () => {
    try {
      const [notebookData, sourcesData] = await Promise.all([
        api.getNotebook(params.id),
        api.getSources(params.id)
      ])
      setNotebook(notebookData)
      setSources(sourcesData)
    } catch (error) {
      console.error('Failed to load notebook:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshSources = async () => {
    const sourcesData = await api.getSources(params.id)
    setSources(sourcesData)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading notebook...</p>
        </div>
      </div>
    )
  }

  if (!notebook) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg mb-4">Notebook not found</p>
          <Button onClick={() => router.push('/')}>Go Home</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">{notebook.title}</h1>
                  <p className="text-xs text-muted-foreground">
                    {sources.length} sources
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="research">Research</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="faceoff">Face-Off</TabsTrigger>
            <TabsTrigger value="avatar">Avatar</TabsTrigger>
            <TabsTrigger value="outputs">Outputs</TabsTrigger>
          </TabsList>

          <TabsContent value="research" className="mt-0">
            <ResearchPanel 
              notebookId={params.id} 
              onSourcesAdded={refreshSources}
            />
          </TabsContent>

          <TabsContent value="sources" className="mt-0">
            <SourcesPanel 
              notebookId={params.id}
              sources={sources}
              onRefresh={refreshSources}
            />
          </TabsContent>

          <TabsContent value="chat" className="mt-0">
            <ChatPanel 
              notebookId={params.id}
              sources={sources}
            />
          </TabsContent>

          <TabsContent value="faceoff" className="mt-0">
            <FaceOffPanel 
              notebookId={params.id}
              sources={sources}
            />
          </TabsContent>

          <TabsContent value="avatar" className="mt-0">
            <AvatarPanel 
              notebookId={params.id}
              notebookTitle={notebook.title}
              sources={sources}
            />
          </TabsContent>

          <TabsContent value="outputs" className="mt-0">
            <OutputsPanel 
              notebookId={params.id}
              sources={sources}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
