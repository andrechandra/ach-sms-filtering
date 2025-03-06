'use client'

import { useState } from 'react'
import { Shield, History, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { checkMessage } from '@/lib/ai-service'
import { MessageHistory } from '@/components/message-history'

export type Message = {
  id: string
  text: string
  result: {
    isScam: boolean
    confidence: number
    explanation: string
  } | null
  timestamp: Date
}

export function SmsFilter() {
  const [message, setMessage] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [currentResult, setCurrentResult] = useState<Message['result']>(null)
  const [history, setHistory] = useState<Message[]>([])

  const handleAnalyze = async () => {
    if (!message.trim()) {
      toast('Empty message', {
        description: 'Please enter an SMS message to analyze.',
        action: {
          label: 'Undo',
          onClick: () => console.log('Undo'),
        },
      })
      return
    }

    setAnalyzing(true)
    try {
      const result = await checkMessage(message)

      const newMessage: Message = {
        id: Date.now().toString(),
        text: message,
        result,
        timestamp: new Date(),
      }

      setCurrentResult(result)
      setHistory((prev) => [newMessage, ...prev])

      toast(
        result.isScam ? 'Potential scam detected!' : 'Message appears safe',
        {
          description: result.isScam
            ? 'This message has characteristics of a scam. Be cautious!'
            : 'This message appears to be legitimate.',
          action: {
            label: 'Undo',
            onClick: () => console.log('Undo'),
          },
        }
      )
    } catch (error) {
      console.error('Analysis error:', error)
      toast('Analysis failed', {
        description: 'Unable to analyze the message. Please try again.',
        action: {
          label: 'Undo',
          onClick: () => console.log('Undo'),
        },
      })
    } finally {
      setAnalyzing(false)
    }
  }

  const handleClear = () => {
    setMessage('')
    setCurrentResult(null)
  }

  const clearHistory = () => {
    setHistory([])
    toast('History cleared', {
      description: 'All analyzed messages have been removed from history.',
    })
  }

  return (
    <div className="w-full flex flex-col lg:flex-row gap-6">
      {/* Left Section: SMS Analysis */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            SMS Analysis
          </CardTitle>
          <CardDescription className="text-left">
            Enter an SMS message to check if it&apos;s potentially a scam
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Paste your SMS message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            className="resize-none mb-4"
          />

          {currentResult && (
            <div className="mt-6 p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-lg font-medium">Analysis Result:</h3>
                <Badge
                  variant={currentResult.isScam ? 'destructive' : 'outline'}
                  className="ml-auto"
                >
                  {currentResult.isScam ? 'Potential Scam' : 'Likely Safe'}
                </Badge>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Confidence:
                </span>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${currentResult.isScam ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${currentResult.confidence}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">
                  {currentResult.confidence}%
                </span>
              </div>

              <p className="text-left text-sm mt-3">
                <span className="font-medium">Explanation: </span>
                {currentResult.explanation}
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={analyzing || !message}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
          <Button onClick={handleAnalyze} disabled={analyzing || !message}>
            {analyzing ? 'Analyzing...' : 'Analyze Message'}
          </Button>
        </CardFooter>
      </Card>

      {/* Right Section: Message History */}
      <div className="w-full lg:w-1/3">
        <Tabs defaultValue="history">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Message History
            </TabsTrigger>
          </TabsList>
          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Recent Messages</CardTitle>
                  {history.length > 0 && (
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={clearHistory}
                      className="h-8"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <MessageHistory messages={history} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
