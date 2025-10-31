'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Eye, Building, Mail, FileText, AlertCircle, Clock, XCircle, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// Helper functions
const formatResearchData = (researchJson: any) => {
  if (!researchJson) return null

  const company = researchJson.company || {}
  const person = researchJson.person || {}
  const intelligence = researchJson.intelligence || {}

  return {
    companyName: company.name || 'Unknown',
    industry: company.industry || 'Unknown',
    role: person.role || 'Unknown',
    keywords: intelligence.keywords || [],
    confidence: intelligence.confidence || 0
  }
}

const getRetryStatus = (retries: number | null | undefined) => {
  if (!retries || retries === 0) return { variant: 'default' as const, label: 'No retries' }
  if (retries >= 3) return { variant: 'destructive' as const, label: `${retries} retries` }
  return { variant: 'outline' as const, label: `${retries} retries` }
}

interface FailedConversation {
  failed_id?: string | null
  failed_at?: string | null
  retries?: number | null
  failure_reason?: string | null
  conversation_id?: string | null
  name?: string | null
  email?: string | null
  summary?: string | null
  lead_score?: number | null
  research_json?: any
  pdf_url?: string | null
  email_status?: string | null
  conversation_created_at?: string | null
}

export function FailedConversationsSection() {
  const [failedConversations, setFailedConversations] = useState<FailedConversation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedConversation, setSelectedConversation] = useState<FailedConversation | null>(null)
  const [minScoreFilter, setMinScoreFilter] = useState<number | null>(null)

  useEffect(() => {
    void fetchFailedConversations()
  }, [minScoreFilter])

  const fetchFailedConversations = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (minScoreFilter !== null) {
        params.set('minScore', minScoreFilter.toString())
      }

      const response = await fetch(`/api/admin/failed-conversations?${params}`)
      if (response.ok) {
        const data = await response.json()
        setFailedConversations(data)
      }
    } catch (error) {
      console.error('Failed to fetch failed conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatResearchData = (researchJson: any) => {
    if (!researchJson) return null

    const company = researchJson.company || {}
    const person = researchJson.person || {}
    const intelligence = researchJson.intelligence || {}

    return {
      companyName: company.name || 'Unknown',
      industry: company.industry || 'Unknown',
      role: person.role || 'Unknown',
      keywords: intelligence.keywords || [],
      confidence: intelligence.confidence || 0
    }
  }

  const getFailureReasonDisplay = (reason: string | null | undefined) => {
    if (!reason) return 'Unknown error'

    // Truncate long error messages
    if (reason.length > 50) {
      return reason.substring(0, 50) + '...'
    }

    return reason
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="size-8 animate-spin rounded-full border-b-2 border-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="size-5 text-red-500" />
                Failed Conversations
              </CardTitle>
              <CardDescription>
                View failed email deliveries with complete lead context and failure details
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Select
                value={minScoreFilter?.toString() || 'all'}
                onValueChange={(value) => setMinScoreFilter(value === 'all' ? null : parseInt(value, 10))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by score" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All scores</SelectItem>
                  <SelectItem value="70">70+ (High)</SelectItem>
                  <SelectItem value="50">50+ (Medium)</SelectItem>
                  <SelectItem value="30">30+ (Low)</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => void fetchFailedConversations()} variant="outline" size="sm">
                <RefreshCw className="mr-2 size-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {failedConversations.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No failed conversations found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Failed At</TableHead>
                  <TableHead>Failure Reason</TableHead>
                  <TableHead>Retries</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failedConversations.map((failedConv) => {
                  const researchData = formatResearchData(failedConv.research_json)
                  const retryStatus = getRetryStatus(failedConv.retries)

                  return (
                    <TableRow key={failedConv.failed_id || failedConv.conversation_id || Math.random()}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarFallback>
                              {(failedConv.name || failedConv.email || 'U')[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{failedConv.name || 'Unknown'}</div>
                            <div className="text-sm text-muted-foreground">{failedConv.email || 'No email'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{researchData?.companyName || 'Unknown'}</div>
                          <div className="text-sm text-muted-foreground">{researchData?.industry || 'Unknown'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={failedConv.lead_score && failedConv.lead_score > 70 ? 'default' : 'secondary'}>
                          {failedConv.lead_score || 0}/100
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {failedConv.failed_at ? (
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(failedConv.failed_at), { addSuffix: true })}
                          </span>
                        ) : (
                          'Unknown'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-48">
                          <div className="text-sm font-medium text-red-600 truncate">
                            {getFailureReasonDisplay(failedConv.failure_reason)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={retryStatus.variant}>
                          {retryStatus.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedConversation(failedConv)}
                            >
                              <Eye className="size-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Failed Conversation Details</DialogTitle>
                            </DialogHeader>
                            {selectedConversation && (
                              <FailedConversationDetails conversation={selectedConversation} />
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function FailedConversationDetails({ conversation }: { conversation: FailedConversation }) {
  const researchData = formatResearchData(conversation.research_json)

  return (
    <div className="space-y-6">
      {/* Failure Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="size-5 text-red-500" />
            Failure Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Failed At</div>
              <div className="mt-1">
                {conversation.failed_at
                  ? new Date(conversation.failed_at).toLocaleString()
                  : 'Unknown'}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Retries</div>
              <div className="mt-1">{conversation.retries ?? 0}</div>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Failure Reason</div>
            <div className="mt-1 rounded-md bg-destructive/10 p-3 text-sm">
              {conversation.failure_reason || 'Unknown error'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lead Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="size-5" />
            Lead Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Name</div>
              <div className="mt-1">{conversation.name || 'Unknown'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Email</div>
              <div className="mt-1">{conversation.email || 'No email'}</div>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Lead Score</div>
            <div className="mt-1">
              <Badge variant={conversation.lead_score && conversation.lead_score > 70 ? 'default' : 'secondary'}>
                {conversation.lead_score || 0}/100
              </Badge>
            </div>
          </div>
          {conversation.summary && (
            <div>
              <div className="text-sm font-medium text-muted-foreground">Summary</div>
              <div className="mt-1 text-sm">{conversation.summary}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Research Data */}
      {researchData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="size-5" />
              Research Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Company</div>
                <div className="mt-1">{researchData.companyName}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Industry</div>
                <div className="mt-1">{researchData.industry}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Role</div>
                <div className="mt-1">{researchData.role}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Confidence</div>
                <div className="mt-1">{researchData.confidence}%</div>
              </div>
            </div>
            {researchData.keywords.length > 0 && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Keywords</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {researchData.keywords.map((keyword: string, idx: number) => (
                    <Badge key={idx} variant="outline">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* PDF Link */}
      {conversation.pdf_url && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              Generated PDF
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <a href={conversation.pdf_url} target="_blank" rel="noopener noreferrer">
                <FileText className="mr-2 size-4" />
                View PDF
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Timestamps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-5" />
            Timestamps
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {conversation.conversation_created_at && (
            <div>
              <span className="font-medium text-muted-foreground">Conversation Created: </span>
              {new Date(conversation.conversation_created_at).toLocaleString()}
            </div>
          )}
          {conversation.failed_at && (
            <div>
              <span className="font-medium text-muted-foreground">Failed At: </span>
              {new Date(conversation.failed_at).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

