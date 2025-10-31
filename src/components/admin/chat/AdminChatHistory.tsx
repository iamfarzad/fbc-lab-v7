'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { MessageSquare, History, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { adminChatService } from '@/core/admin/admin-chat-service'
import { format } from 'date-fns'
import { ADMIN_CONFIG } from '@/config/constants'

interface AdminChatHistoryProps {
  currentSessionId: string
  onSessionSelect: (sessionId: string) => void
  className?: string
}

export function AdminChatHistory({ 
  currentSessionId, 
  onSessionSelect,
  className 
}: AdminChatHistoryProps) {
  const [sessions, setSessions] = useState<Array<{
    id: string
    session_name: string
    last_activity: string
    messageCount: number
  }>>([])
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      setIsLoading(true)
      const sessionList = await adminChatService.getAdminSessions(ADMIN_CONFIG.ADMIN_ID, 50)
      
      // For each session, get message count
      const sessionsWithCounts = await Promise.all(
        sessionList.map(async (session) => {
          const context = await adminChatService.getConversationContext(session.id || '', '')
          return {
            id: session.id,
            session_name: session.session_name || `Session ${new Date(session.last_activity || session.created_at || '').toLocaleDateString()}`,
            last_activity: session.last_activity || session.created_at || new Date().toISOString(),
            messageCount: context.messages.length
          }
        })
      )
      
      setSessions(sessionsWithCounts)
    } catch (error) {
      console.error('Failed to load chat sessions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this chat session?')) return

    try {
      await adminChatService.deleteSession(sessionId)
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      
      // If deleting current session, create new one
      if (sessionId === currentSessionId) {
        const newSessionId = `admin-${Date.now()}`
        localStorage.setItem('admin-session-id', newSessionId)
        onSessionSelect(newSessionId)
      }
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
  }

  const handleNewChat = () => {
    const newSessionId = `admin-${Date.now()}`
    localStorage.setItem('admin-session-id', newSessionId)
    onSessionSelect(newSessionId)
  }

  if (isCollapsed) {
    return (
      <div className={cn("border-r bg-muted/30 flex flex-col items-center py-2 gap-2", className)}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(false)}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNewChat}
          className="h-8 w-8"
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("border-r bg-muted/30 flex flex-col w-64", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Chat History</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(true)}
          className="h-6 w-6"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* New Chat Button */}
      <div className="p-2 border-b">
        <Button
          variant="outline"
          size="sm"
          onClick={handleNewChat}
          className="w-full justify-start gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Sessions List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              Loading history...
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              No previous chats
            </div>
          ) : (
            sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => onSessionSelect(session.id)}
                className={cn(
                  "w-full text-left p-2 rounded-md hover:bg-muted transition-colors group",
                  session.id === currentSessionId && "bg-muted"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {session.session_name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>{session.messageCount} messages</span>
                      <Separator orientation="vertical" className="h-3" />
                      <span>{format(new Date(session.last_activity), 'MMM d, h:mm a')}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleDeleteSession(session.id, e)}
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

