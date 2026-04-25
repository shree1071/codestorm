'use client'

import { useState } from 'react'
import { FileText, Headphones, Brain, CreditCard, Loader2, Download, Play, Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'

export default function OutputsPanel({ notebookId, sources }) {
  const [loading, setLoading] = useState({})
  const [outputs, setOutputs] = useState({})
  const [audioPlaying, setAudioPlaying] = useState(false)

  const generateOutput = async (type, generator) => {
    if (sources.length === 0) {
      alert('Add sources first')
      return
    }

    setLoading(prev => ({ ...prev, [type]: true }))
    try {
      const data = await generator()
      setOutputs(prev => ({ ...prev, [type]: data }))
    } catch (error) {
      console.error(`Failed to generate ${type}:`, error)
      alert(`Failed to generate ${type}`)
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Outputs</h2>
        <p className="text-muted-foreground">
          Generate study materials and podcasts from your sources
        </p>
      </div>

      <Tabs defaultValue="podcast" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="podcast">Podcast</TabsTrigger>
          <TabsTrigger value="quiz">Quiz</TabsTrigger>
          <TabsTrigger value="study">Study Guide</TabsTrigger>
          <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
        </TabsList>

        {/* Podcast */}
        <TabsContent value="podcast" className="space-y-4">
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Headphones className="w-5 h-5 text-primary" />
                Generate Podcast
              </CardTitle>
              <CardDescription>
                Two-speaker conversational podcast with real TTS audio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Format</label>
                  <select className="w-full px-3 py-2 border rounded-md bg-background">
                    <option value="deep_dive">Deep Dive (10 min)</option>
                    <option value="quick_brief">Quick Brief (3 min)</option>
                    <option value="debate">Debate Format</option>
                    <option value="interview">Interview Style</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Length</label>
                  <select className="w-full px-3 py-2 border rounded-md bg-background">
                    <option value="short">Short (3 min)</option>
                    <option value="medium">Medium (10 min)</option>
                    <option value="long">Long (20 min)</option>
                  </select>
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800 font-medium mb-1">
                  🚧 Coming Soon
                </p>
                <p className="text-xs text-yellow-700">
                  Podcast generation with ElevenLabs TTS will be added soon. For now, use the Avatar feature for voice conversations!
                </p>
              </div>
              <Button
                disabled
                className="w-full"
                variant="outline"
              >
                <Headphones className="w-4 h-4 mr-2" />
                Generate Podcast (Coming Soon)
              </Button>

              {outputs.podcast && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-medium">Podcast Ready</p>
                        <p className="text-sm text-muted-foreground">
                          Duration: {Math.floor(outputs.podcast.duration / 60)}:{(outputs.podcast.duration % 60).toString().padStart(2, '0')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          {audioPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>
                        <Button size="sm" variant="outline">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <audio
                      controls
                      className="w-full"
                      src={outputs.podcast.audio_url}
                    />
                  </div>
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm font-medium mb-2">Script</p>
                    <div className="text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
                      {outputs.podcast.script}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quiz */}
        <TabsContent value="quiz" className="space-y-4">
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                Generate Quiz
              </CardTitle>
              <CardDescription>
                10 multiple-choice questions to test understanding
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => generateOutput('quiz', () => api.generateQuiz(notebookId))}
                disabled={loading.quiz || sources.length === 0}
                className="w-full"
              >
                {loading.quiz ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Quiz...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Generate Quiz
                  </>
                )}
              </Button>

              {outputs.quiz?.questions && (
                <div className="space-y-4 mt-4">
                  {outputs.quiz.questions.map((q, idx) => (
                    <Card key={idx}>
                      <CardHeader>
                        <CardTitle className="text-base">
                          {idx + 1}. {q.question}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {q.options.map((option, oidx) => (
                          <div
                            key={oidx}
                            className={`p-2 rounded border ${
                              option.startsWith(q.correct_answer)
                                ? 'bg-green-50 border-green-200'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm">{option}</p>
                          </div>
                        ))}
                        <p className="text-sm text-muted-foreground pt-2 border-t">
                          {q.explanation}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Study Guide */}
        <TabsContent value="study" className="space-y-4">
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Generate Study Guide
              </CardTitle>
              <CardDescription>
                Comprehensive study guide with key concepts and summaries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => generateOutput('study', () => api.generateStudyGuide(notebookId))}
                disabled={loading.study || sources.length === 0}
                className="w-full"
              >
                {loading.study ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Study Guide...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Study Guide
                  </>
                )}
              </Button>

              {outputs.study?.sections && (
                <div className="space-y-4 mt-4">
                  {outputs.study.sections.map((section, idx) => (
                    <Card key={idx}>
                      <CardHeader>
                        <CardTitle className="text-base">{section.heading}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-sm">{section.content}</p>
                        {section.key_points && (
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            {section.key_points.map((point, pidx) => (
                              <li key={pidx}>{point}</li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Flashcards */}
        <TabsContent value="flashcards" className="space-y-4">
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Generate Flashcards
              </CardTitle>
              <CardDescription>
                20 flashcards for quick review and memorization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => generateOutput('flashcards', () => api.generateFlashcards(notebookId))}
                disabled={loading.flashcards || sources.length === 0}
                className="w-full"
              >
                {loading.flashcards ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Flashcards...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Generate Flashcards
                  </>
                )}
              </Button>

              {outputs.flashcards?.flashcards && (
                <div className="grid gap-4 md:grid-cols-2 mt-4">
                  {outputs.flashcards.flashcards.map((card, idx) => (
                    <Card key={idx} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardHeader>
                        <CardTitle className="text-sm">{card.front}</CardTitle>
                        {card.category && (
                          <CardDescription className="text-xs">{card.category}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{card.back}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
