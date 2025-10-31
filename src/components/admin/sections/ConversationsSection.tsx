'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface Conversation {
  id: string
  name: string | null
  email: string | null
  summary: string | null
  leadScore: number | null
  createdAt: string
}

interface ConversationsSectionProps {
  conversations: Conversation[]
  loading?: boolean
}

export function ConversationsSection({ conversations, loading }: ConversationsSectionProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredConversations = conversations.filter(conv => 
    !searchTerm || 
    conv.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.summary?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading && conversations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Conversations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            Loading conversations...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Recent Conversations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            {filteredConversations.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                {searchTerm ? 'No conversations match your search' : 'No conversations found'}
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <div key={conv.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold">{conv.name ?? 'Anonymous'}</h4>
                      <p className="text-sm text-muted-foreground">{conv.email ?? 'No email'}</p>
                      {conv.summary && (
                        <p className="mt-2 text-sm">{conv.summary}</p>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">
                        {new Date(conv.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {conv.leadScore !== null && (
                      <Badge variant={conv.leadScore >= 7 ? 'default' : 'secondary'}>
                        Score: {conv.leadScore}/10
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

