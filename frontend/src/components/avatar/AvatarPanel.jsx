'use client'

import { useState, useRef } from 'react'
import { Video, Loader2, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createTavusSession, endTavusConversation } from '@/lib/tavus'

export default function AvatarPanel({ notebookTitle, sources }) {
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState(null)
  const [isActive, setIsActive] = useState(false)
  const iframeRef = useRef(null)

  const createSession = async () => {
    setLoading(true)
    try {
      const data = await createTavusSession(notebookTitle, sources || [])
      setSession(data)
      setIsActive(true)
    } catch (error) {
      console.error('Failed to create avatar session:', error)
      alert(`Failed to create avatar session:\n\n${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const endSession = async () => {
    if (session?.sessionId) {
      try {
        await endTavusConversation(session.sessionId)
      } catch (error) {
        console.error('Error ending session:', error)
      }
    }
    setSession(null)
    setIsActive(false)
  }

  return (
    <div className="space-y-6">
      {/* Embedded Video Conversation */}
      {isActive && session?.conversationUrl ? (
        <Card className="border-2 border-primary">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5 text-primary" />
                Live Conversation
              </CardTitle>
              <CardDescription>
                Talking with AI expert about: {notebookTitle}
              </CardDescription>
            </div>
            <Button
              onClick={endSession}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              End Session
            </Button>
          </CardHeader>
          <CardContent>
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                ref={iframeRef}
                src={session.conversationUrl}
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                allow="camera; microphone; autoplay; display-capture"
                style={{ border: 'none' }}
              />
            </div>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>Tip:</strong> Allow camera and microphone access for the best experience. 
                The AI can see and hear you for natural conversation.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
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
              <div className="space-y-3">
                {sources.length === 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800 font-medium mb-1">
                      💡 Tip: Add sources for better conversations
                    </p>
                    <p className="text-xs text-blue-700">
                      You can start now with a general expert, or add sources in the <span className="font-semibold">Sources</span> tab for topic-specific knowledge
                    </p>
                  </div>
                )}
                <Button
                  onClick={createSession}
                  disabled={loading}
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
              </div>
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
                  {sources.length > 0 
                    ? `The avatar has read all ${sources.length} sources and can cite them in conversation`
                    : 'Start with a general expert, or add sources for specialized knowledge'}
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
        </>
      )}
    </div>
  )
}
