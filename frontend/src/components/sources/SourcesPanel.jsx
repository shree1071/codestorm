'use client'

import { useState } from 'react'
import { Plus, Link, FileText, Youtube, Trash2, ExternalLink, Github } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'

export default function SourcesPanel({ notebookId, sources, onRefresh }) {
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // URL source
  const [url, setUrl] = useState('')
  
  // YouTube source
  const [youtubeUrl, setYoutubeUrl] = useState('')
  
  // GitHub source
  const [githubUrl, setGithubUrl] = useState('')
  
  // Text source
  const [textTitle, setTextTitle] = useState('')
  const [textContent, setTextContent] = useState('')
  
  // PDF source
  const [pdfFile, setPdfFile] = useState(null)

  const addUrlSource = async () => {
    if (!url.trim()) return
    setLoading(true)
    try {
      await api.addUrlSource(notebookId, url)
      setUrl('')
      setAddDialogOpen(false)
      onRefresh()
    } catch (error) {
      console.error('Failed to add URL:', error)
      alert('Failed to add URL source')
    } finally {
      setLoading(false)
    }
  }

  const addTextSource = async () => {
    if (!textTitle.trim() || !textContent.trim()) return
    setLoading(true)
    try {
      await api.addTextSource(notebookId, textTitle, textContent)
      setTextTitle('')
      setTextContent('')
      setAddDialogOpen(false)
      onRefresh()
    } catch (error) {
      console.error('Failed to add text:', error)
      alert('Failed to add text source')
    } finally {
      setLoading(false)
    }
  }

  const addPdfSource = async () => {
    if (!pdfFile) return
    setLoading(true)
    try {
      await api.addPdfSource(notebookId, pdfFile)
      setPdfFile(null)
      setAddDialogOpen(false)
      onRefresh()
    } catch (error) {
      console.error('Failed to add PDF:', error)
      alert('Failed to add PDF source')
    } finally {
      setLoading(false)
    }
  }

  const addYoutubeSource = async () => {
    if (!youtubeUrl.trim()) return
    setLoading(true)
    try {
      await api.addYoutubeSource(notebookId, youtubeUrl)
      setYoutubeUrl('')
      setAddDialogOpen(false)
      onRefresh()
    } catch (error) {
      console.error('Failed to add YouTube:', error)
      alert('Failed to add YouTube source')
    } finally {
      setLoading(false)
    }
  }

  const addGithubSource = async () => {
    if (!githubUrl.trim()) return
    setLoading(true)
    try {
      await api.addGithubSource(notebookId, githubUrl)
      setGithubUrl('')
      setAddDialogOpen(false)
      onRefresh()
    } catch (error) {
      console.error('Failed to add GitHub:', error)
      alert('Failed to add GitHub source')
    } finally {
      setLoading(false)
    }
  }

  const deleteSource = async (sourceId) => {
    if (!confirm('Delete this source?')) return
    try {
      await api.deleteSource(notebookId, sourceId)
      onRefresh()
    } catch (error) {
      console.error('Failed to delete source:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Add Source Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Sources</h2>
          <p className="text-muted-foreground">{sources.length} sources in this notebook</p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Source
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Source</DialogTitle>
              <DialogDescription>
                Add a URL, PDF, YouTube video, GitHub repo, or paste text
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="url" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="url">URL</TabsTrigger>
                <TabsTrigger value="pdf">PDF</TabsTrigger>
                <TabsTrigger value="youtube">YouTube</TabsTrigger>
                <TabsTrigger value="github">GitHub</TabsTrigger>
                <TabsTrigger value="text">Text</TabsTrigger>
              </TabsList>
              
              <TabsContent value="url" className="space-y-4">
                <Input
                  placeholder="https://example.com/article"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <Button onClick={addUrlSource} disabled={loading || !url.trim()}>
                  {loading ? 'Adding...' : 'Add URL'}
                </Button>
              </TabsContent>
              
              <TabsContent value="pdf" className="space-y-4">
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setPdfFile(e.target.files[0])}
                />
                <Button onClick={addPdfSource} disabled={loading || !pdfFile}>
                  {loading ? 'Uploading...' : 'Upload PDF'}
                </Button>
              </TabsContent>
              
              <TabsContent value="youtube" className="space-y-4">
                <Input
                  placeholder="https://youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                />
                <Button onClick={addYoutubeSource} disabled={loading || !youtubeUrl.trim()}>
                  {loading ? 'Adding...' : 'Add YouTube Video'}
                </Button>
              </TabsContent>
              
              <TabsContent value="github" className="space-y-4">
                <Input
                  placeholder="https://github.com/owner/repo"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Add a GitHub repository or specific file URL
                </p>
                <Button onClick={addGithubSource} disabled={loading || !githubUrl.trim()}>
                  {loading ? 'Adding...' : 'Add GitHub Source'}
                </Button>
              </TabsContent>
              
              <TabsContent value="text" className="space-y-4">
                <Input
                  placeholder="Title"
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                />
                <textarea
                  placeholder="Paste your text here..."
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  className="w-full h-40 px-3 py-2 border rounded-md"
                />
                <Button onClick={addTextSource} disabled={loading || !textTitle.trim() || !textContent.trim()}>
                  {loading ? 'Adding...' : 'Add Text'}
                </Button>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sources List */}
      {sources.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No sources yet</p>
            <p className="text-muted-foreground text-center mb-4">
              Add sources manually or use the Research tab to find them automatically
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sources.map((source) => (
            <Card key={source.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1">
                    {source.type === 'url' && <Link className="w-4 h-4 mt-1 flex-shrink-0" />}
                    {source.type === 'pdf' && <FileText className="w-4 h-4 mt-1 flex-shrink-0" />}
                    {source.type === 'youtube' && <Youtube className="w-4 h-4 mt-1 flex-shrink-0" />}
                    {source.type === 'github' && <Github className="w-4 h-4 mt-1 flex-shrink-0" />}
                    {source.type === 'text' && <FileText className="w-4 h-4 mt-1 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base line-clamp-2">{source.title}</CardTitle>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {source.credibility_score && (
                      <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                        {source.credibility_score}/10
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteSource(source.id)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="line-clamp-3">
                  {source.summary || 'No summary available'}
                </CardDescription>
              </CardHeader>
              {source.url && (
                <CardContent>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1 truncate"
                  >
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{source.url}</span>
                  </a>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
