import type { Message } from '@/components/sms-filter'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

export function MessageHistory({ messages }: { messages: Message[] }) {
  if (messages.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <p>No messages analyzed yet.</p>
        <p className="text-sm mt-2">Messages you analyze will appear here.</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-[calc(100vh-24rem)]">
      <div className="space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className="p-3 rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex gap-1 items-center">
                {message.result?.isScam ? (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                <Badge
                  variant={message.result?.isScam ? 'destructive' : 'outline'}
                  className="ml-1"
                >
                  {message.result?.isScam ? 'Scam' : 'Safe'}
                </Badge>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 text-s">
                {message.timestamp.toLocaleTimeString()}{' '}
                {message.timestamp.toLocaleDateString()}
              </span>
            </div>

            <p className="text-left text-sm line-clamp-2 mb-1">
              {message.text}
            </p>

            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center">
              <span>Confidence: {message.result?.confidence}%</span>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
