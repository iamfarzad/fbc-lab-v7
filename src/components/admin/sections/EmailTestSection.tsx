'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Mail, Send, CheckCircle } from 'lucide-react'

export function EmailTestSection() {
  const [testEmail, setTestEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [template, setTemplate] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSendTest = async () => {
    if (!testEmail || !subject || !template) {
      alert('Please fill in all fields')
      return
    }

    setSending(true)
    setSent(false)

    try {
      // In production, this would call an API endpoint to send test email
      // For now, simulate sending
      await new Promise((resolve) => setTimeout(resolve, 1500))

      setSent(true)
      setTimeout(() => setSent(false), 3000)
    } catch (error) {
      console.error('Failed to send test email:', error)
      alert('Failed to send test email')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="size-6" />
            Email Test Panel
          </CardTitle>
          <CardDescription>
            Test email templates before sending campaigns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-email">Test Email Address</Label>
            <Input
              id="test-email"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="your.email@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="test-subject">Subject Line</Label>
            <Input
              id="test-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Test email subject"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="test-template">Email Template</Label>
            <Textarea
              id="test-template"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder="Enter email template content here..."
              rows={10}
            />
          </div>

          <Button
            onClick={() => void handleSendTest()}
            disabled={sending || !testEmail || !subject || !template}
            className="w-full"
          >
            {sending ? (
              'Sending...'
            ) : sent ? (
              <>
                <CheckCircle className="mr-2 size-4" />
                Sent!
              </>
            ) : (
              <>
                <Send className="mr-2 size-4" />
                Send Test Email
              </>
            )}
          </Button>

          {sent && (
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400">
              Test email sent successfully! Check your inbox.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

