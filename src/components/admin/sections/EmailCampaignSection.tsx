'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Mail, Plus, RefreshCw, Trash2, Edit } from 'lucide-react'

interface EmailCampaign {
  id: string
  name: string
  subject: string
  template: string
  target_segment: string | null
  status: string
  sent_count: number
  total_recipients: number
  opened_count?: number
  clicked_count?: number
  scheduled_at: string | null
  created_at: string
  updated_at: string
}

export function EmailCampaignSection() {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    template: '',
    target_segment: '',
    scheduled_at: '',
  })

  const fetchCampaigns = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/email-campaigns')
      if (response.ok) {
        const data = await response.json()
        setCampaigns(data)
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchCampaigns()
  }, [])

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/admin/email-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          subject: formData.subject,
          template: formData.template,
          target_segment: formData.target_segment || null,
          scheduled_at: formData.scheduled_at || null,
        }),
      })

      if (response.ok) {
        setIsCreateDialogOpen(false)
        setFormData({ name: '', subject: '', template: '', target_segment: '', scheduled_at: '' })
        void fetchCampaigns()
      }
    } catch (error) {
      console.error('Failed to create campaign:', error)
    }
  }

  const handleUpdate = async () => {
    if (!selectedCampaign) return

    try {
      const response = await fetch('/api/admin/email-campaigns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedCampaign.id,
          ...formData,
        }),
      })

      if (response.ok) {
        setIsEditDialogOpen(false)
        setSelectedCampaign(null)
        void fetchCampaigns()
      }
    } catch (error) {
      console.error('Failed to update campaign:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return

    try {
      const response = await fetch(`/api/admin/email-campaigns?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        void fetchCampaigns()
      }
    } catch (error) {
      console.error('Failed to delete campaign:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'secondary',
      scheduled: 'outline',
      sending: 'default',
      sent: 'default',
      cancelled: 'destructive',
    }
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>
  }

  if (loading && campaigns.length === 0) {
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
                <Mail className="size-6" />
                Email Campaign Manager
              </CardTitle>
              <CardDescription>
                Create and manage email campaigns for lead nurturing
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => void fetchCampaigns()}>
                <RefreshCw className="mr-2 size-4" />
                Refresh
              </Button>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 size-4" />
                    New Campaign
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Email Campaign</DialogTitle>
                    <DialogDescription>
                      Set up a new email campaign for lead nurturing
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Campaign Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Weekly Follow-up"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">Email Subject</Label>
                      <Input
                        id="subject"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        placeholder="e.g., Let's discuss your AI needs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="template">Email Template</Label>
                      <Textarea
                        id="template"
                        value={formData.template}
                        onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                        placeholder="Email content template..."
                        rows={6}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="target_segment">Target Segment</Label>
                      <Select
                        value={formData.target_segment}
                        onValueChange={(value) => setFormData({ ...formData, target_segment: value })}
                      >
                        <SelectTrigger id="target_segment">
                          <SelectValue placeholder="Select target segment" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high-score-leads">High Score Leads (70+)</SelectItem>
                          <SelectItem value="recent-leads">Recent Leads (7 days)</SelectItem>
                          <SelectItem value="no-meeting-leads">No Meeting Booked</SelectItem>
                          <SelectItem value="all-leads">All Active Leads</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scheduled_at">Schedule (Optional)</Label>
                      <Input
                        id="scheduled_at"
                        type="datetime-local"
                        value={formData.scheduled_at}
                        onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                      />
                    </div>
                    <Button onClick={() => void handleCreate()} className="w-full">
                      Create Campaign
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No campaigns yet. Create your first campaign to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell>{campaign.subject}</TableCell>
                    <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                    <TableCell>{campaign.total_recipients}</TableCell>
                    <TableCell>{campaign.sent_count}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(campaign.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCampaign(campaign)
                            setFormData({
                              name: campaign.name,
                              subject: campaign.subject,
                              template: campaign.template,
                              target_segment: campaign.target_segment || '',
                              scheduled_at: campaign.scheduled_at || '',
                            })
                            setIsEditDialogOpen(true)
                          }}
                        >
                          <Edit className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(campaign.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Campaign</DialogTitle>
                <DialogDescription>
                  Update campaign details
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Campaign Name</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-subject">Email Subject</Label>
                  <Input
                    id="edit-subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-template">Email Template</Label>
                  <Textarea
                    id="edit-template"
                    value={formData.template}
                    onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                    rows={6}
                  />
                </div>
                <Button onClick={() => void handleUpdate()} className="w-full">
                  Update Campaign
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  )
}

