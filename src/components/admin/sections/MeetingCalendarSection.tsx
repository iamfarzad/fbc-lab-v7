'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Calendar, Clock, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns'

interface Meeting {
  id: string
  conversation_id: string | null
  lead_email: string
  lead_name: string | null
  title: string
  description: string | null
  scheduled_at: string
  duration_minutes: number
  status: string
  meeting_link: string | null
  location: string | null
  timezone: string
  participant_count?: number
}

export function MeetingCalendarSection() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [formData, setFormData] = useState({
    lead_email: '',
    lead_name: '',
    title: '',
    description: '',
    scheduled_at: '',
    duration_minutes: '30',
    meeting_link: '',
    location: '',
    timezone: 'UTC',
  })

  const fetchMeetings = async () => {
    setLoading(true)
    try {
      const startOfMonthStr = startOfMonth(currentMonth).toISOString()
      const endOfMonthStr = endOfMonth(currentMonth).toISOString()
      const response = await fetch(
        `/api/admin/meetings?start_date=${startOfMonthStr}&end_date=${endOfMonthStr}`
      )
      if (response.ok) {
        const data = await response.json()
        setMeetings(data)
      }
    } catch (error) {
      console.error('Failed to fetch meetings:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchMeetings()
  }, [currentMonth])

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/admin/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_email: formData.lead_email,
          lead_name: formData.lead_name || null,
          title: formData.title,
          description: formData.description || null,
          scheduled_at: formData.scheduled_at,
          duration_minutes: parseInt(formData.duration_minutes, 10),
          meeting_link: formData.meeting_link || null,
          location: formData.location || null,
          timezone: formData.timezone,
        }),
      })

      if (response.ok) {
        setIsCreateDialogOpen(false)
        setSelectedDate(null)
        setFormData({
          lead_email: '',
          lead_name: '',
          title: '',
          description: '',
          scheduled_at: '',
          duration_minutes: '30',
          meeting_link: '',
          location: '',
          timezone: 'UTC',
        })
        void fetchMeetings()
      }
    } catch (error) {
      console.error('Failed to create meeting:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this meeting?')) return

    try {
      const response = await fetch(`/api/admin/meetings?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        void fetchMeetings()
      }
    } catch (error) {
      console.error('Failed to delete meeting:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      scheduled: 'default',
      confirmed: 'default',
      cancelled: 'destructive',
      completed: 'secondary',
      no_show: 'destructive',
    }
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>
  }

  const getMeetingsForDate = (date: Date) => {
    return meetings.filter((meeting) => isSameDay(new Date(meeting.scheduled_at), date))
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
  
  // Pad calendar with previous/next month days
  const firstDayOfWeek = monthStart.getDay()
  const daysBeforeMonth: Date[] = []
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    daysBeforeMonth.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), -i))
  }
  
  const lastDayOfWeek = monthEnd.getDay()
  const daysAfterMonth: Date[] = []
  for (let i = 1; i <= 6 - lastDayOfWeek; i++) {
    daysAfterMonth.push(new Date(monthEnd.getFullYear(), monthEnd.getMonth() + 1, i))
  }
  
  const allDays = [...daysBeforeMonth, ...daysInMonth, ...daysAfterMonth]

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  if (loading && meetings.length === 0) {
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
                <Calendar className="size-6" />
                Meeting Calendar
              </CardTitle>
              <CardDescription>
                Schedule and manage consultations with leads
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => void fetchMeetings()}>
                <RefreshCw className="mr-2 size-4" />
                Refresh
              </Button>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => {
                    if (selectedDate) {
                      const dateTimeLocal = format(selectedDate, "yyyy-MM-dd'T'HH:mm")
                      setFormData({ ...formData, scheduled_at: dateTimeLocal })
                    }
                  }}>
                    <Plus className="mr-2 size-4" />
                    New Meeting
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Schedule Meeting</DialogTitle>
                    <DialogDescription>
                      Create a new consultation meeting
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="lead-email">Lead Email *</Label>
                        <Input
                          id="lead-email"
                          type="email"
                          value={formData.lead_email}
                          onChange={(e) => setFormData({ ...formData, lead_email: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lead-name">Lead Name</Label>
                        <Input
                          id="lead-name"
                          value={formData.lead_name}
                          onChange={(e) => setFormData({ ...formData, lead_name: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="meeting-title">Title *</Label>
                      <Input
                        id="meeting-title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g., AI Consulting Call"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="meeting-description">Description</Label>
                      <Textarea
                        id="meeting-description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="scheduled-at">Date & Time *</Label>
                        <Input
                          id="scheduled-at"
                          type="datetime-local"
                          value={formData.scheduled_at}
                          onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="duration">Duration (minutes)</Label>
                        <Input
                          id="duration"
                          type="number"
                          value={formData.duration_minutes}
                          onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                          min="15"
                          step="15"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="meeting-link">Meeting Link</Label>
                        <Input
                          id="meeting-link"
                          value={formData.meeting_link}
                          onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                          placeholder="Zoom/Google Meet URL"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          placeholder="Physical or virtual location"
                        />
                      </div>
                    </div>
                    <Button onClick={() => void handleCreate()} className="w-full" disabled={!formData.lead_email || !formData.title || !formData.scheduled_at}>
                      Schedule Meeting
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Calendar Navigation */}
          <div className="mb-6 flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
              ← Previous
            </Button>
            <h3 className="text-lg font-semibold">
              {format(currentMonth, 'MMMM yyyy')}
            </h3>
            <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
              Next →
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="mb-6">
            <div className="grid grid-cols-7 gap-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
              {allDays.map((day, idx) => {
                const dayMeetings = getMeetingsForDate(day)
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
                const isTodayDate = isToday(day)

                return (
                  <div
                    key={idx}
                    className={`
                      min-h-24 rounded-md border p-2
                      ${!isCurrentMonth ? 'bg-muted/30' : ''}
                      ${isTodayDate ? 'ring-2 ring-primary' : ''}
                      cursor-pointer hover:bg-accent
                    `}
                    onClick={() => {
                      setSelectedDate(day)
                      const dateTimeLocal = format(day, "yyyy-MM-dd'T'HH:mm")
                      setFormData({ ...formData, scheduled_at: dateTimeLocal })
                      setIsCreateDialogOpen(true)
                    }}
                  >
                    <div className={`text-sm font-medium ${isCurrentMonth ? '' : 'text-muted-foreground'}`}>
                      {format(day, 'd')}
                    </div>
                    <div className="mt-1 space-y-1">
                      {dayMeetings.slice(0, 2).map((meeting) => (
                        <div
                          key={meeting.id}
                          className="truncate rounded bg-primary/10 px-1 text-xs text-primary"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {format(new Date(meeting.scheduled_at), 'HH:mm')} {meeting.title.substring(0, 15)}
                        </div>
                      ))}
                      {dayMeetings.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayMeetings.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Upcoming Meetings List */}
          <div className="mt-6">
            <h3 className="mb-4 text-lg font-semibold">Upcoming Meetings</h3>
            {meetings.filter((m) => new Date(m.scheduled_at) >= new Date()).length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No upcoming meetings scheduled
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meetings
                    .filter((m) => new Date(m.scheduled_at) >= new Date())
                    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
                    .slice(0, 10)
                    .map((meeting) => (
                      <TableRow key={meeting.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="size-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">
                                {format(new Date(meeting.scheduled_at), 'MMM d, yyyy')}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {format(new Date(meeting.scheduled_at), 'h:mm a')}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{meeting.title}</TableCell>
                        <TableCell>
                          <div>
                            <div>{meeting.lead_name || 'Unknown'}</div>
                            <div className="text-sm text-muted-foreground">{meeting.lead_email}</div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(meeting.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="size-4 text-muted-foreground" />
                            {meeting.duration_minutes} min
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {meeting.meeting_link && (
                              <Button variant="ghost" size="sm" asChild>
                                <a href={meeting.meeting_link} target="_blank" rel="noopener noreferrer">
                                  Join
                                </a>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(meeting.id)}
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

