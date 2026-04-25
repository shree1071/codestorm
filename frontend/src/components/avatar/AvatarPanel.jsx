'use client'

import { useState } from 'react'
import { Video, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'

export default function AvatarPanel({ notebookId, notebookTitle, sources }) {
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState(null)

  const createSession = async () => {
    if (sources.length === 0) {
      alert('Add sources first before creating an avatar session')
      return
    }

    setLoading(true)
    try {
      const data = await api.createAvatarSession(notebookId)
      setSession(data)
    } catch (error) {
      console.error('Failed to create avatar session:', error)
      alert('Failed to create avatar session')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-purple-50 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            Talk to Your Research
          </CardTitle>
          <CardDescription>
            Have a face-to-face video conversation with an AI expert who has read all your sources
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!session ? (
            <Button
              onClick={createSession}
              disabled={loading || sources.length === 0}
              size="lg"
              className="w-full bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating Session...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Start Conversation with Expert
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800 font-medium mb-2">
                  ✓ Session Created
                </p>
                <p className="text-xs text-green-700">
                  Your AI expert is ready to discuss: {notebookTitle}
                </p>
              </div>
              <Button
                onClick={() => window.open(session.conversation_url, '_blank')}
                size="lg"
                className="w-full"
              >
                <Video className="w-5 h-5 mr-2" />
                Open Video Conversation
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Features */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Real-Time Conversation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Talk naturally with an AI avatar that responds in real-time with voice and video
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Full Context Loaded</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              The avatar has read all {sources.length} sources and can cite them in conversation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ask Anything</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Get explanations, clarifications, and insights about your research topic
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Natural Interaction</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No typing needed - just talk like you would with a real expert
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Info */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-medium mb-1">This is the WOW moment</p>
              <p className="text-sm text-muted-foreground">
                No other NotebookLM alternative has this feature. You're not just chatting with text - 
                you're having a real video conversation with an AI expert who knows your research inside out.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
