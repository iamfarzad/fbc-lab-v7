'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Shield, ShieldAlert, ShieldCheck, RefreshCw, EyeOff } from 'lucide-react'

interface SecurityCheck {
  check: string
  status: string
  description: string
}

interface SecurityAudit {
  timestamp: string
  security_checks: SecurityCheck[]
  recent_audits?: Array<{
    id: string
    session_id: string
    event: string
    details: any
    timestamp: string
  }>
  audit_statistics?: {
    total_recent: number
    event_counts: Record<string, number>
    last_audit: string | null
  }
  rls_status?: Array<{ table: string; rls_enabled: boolean }>
  overall_security: string
}

interface PublicAccessTest {
  test: string
  status: string
  error: string | null
  data_accessible: number
}

interface AccessTestResult {
  timestamp: string
  public_access_tests: PublicAccessTest[]
  summary: {
    public_blocked: string
    message: string
  }
}

export function SecurityAuditSection() {
  const [auditResult, setAuditResult] = useState<SecurityAudit | null>(null)
  const [accessTestResult, setAccessTestResult] = useState<AccessTestResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('audit')

  const runSecurityAudit = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/security-audit')
      if (response.ok) {
        const data = await response.json()
        setAuditResult(data)
      }
    } catch (error) {
      console.error('Security audit failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const testPublicAccess = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/security-audit', {
        method: 'POST'
      })
      if (response.ok) {
        const data = await response.json()
        setAccessTestResult(data)
        setActiveTab('access')
      }
    } catch (error) {
      console.error('Public access test failed:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void runSecurityAudit()
  }, [])

  const getStatusIcon = (status: string) => {
    if (status.includes('✅')) return <ShieldCheck className="size-4 text-green-600" />
    if (status.includes('❌')) return <ShieldAlert className="size-4 text-red-600" />
    return <Shield className="size-4 text-yellow-600" />
  }

  const getStatusVariant = (status: string): 'default' | 'destructive' | 'secondary' | 'outline' => {
    if (status.includes('✅')) return 'default'
    if (status.includes('❌')) return 'destructive'
    return 'secondary'
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="size-6" />
                Security Audit Dashboard
              </CardTitle>
              <CardDescription>
                Monitor security status and audit trails for compliance
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => void runSecurityAudit()}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                <RefreshCw className={`mr-2 size-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh Audit
              </Button>
              <Button
                onClick={() => void testPublicAccess()}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                <EyeOff className={`mr-2 size-4 ${loading ? 'animate-spin' : ''}`} />
                Test Public Access
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="audit">Security Audit</TabsTrigger>
          <TabsTrigger value="access">Public Access Test</TabsTrigger>
          <TabsTrigger value="policies">RLS Status</TabsTrigger>
          {auditResult?.recent_audits && auditResult.recent_audits.length > 0 && (
            <TabsTrigger value="logs">Recent Audit Logs</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="audit" className="space-y-4">
          {loading && !auditResult ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="size-8 animate-spin rounded-full border-b-2 border-primary" />
              </CardContent>
            </Card>
          ) : auditResult ? (
            <>
              <Alert>
                <Shield className="size-4" />
                <AlertDescription>
                  <strong>Overall Security Status:</strong> {auditResult.overall_security}
                  {auditResult.overall_security.includes('SECURE') ? (
                    <span className="ml-2 text-green-600">✅ All security checks passed</span>
                  ) : (
                    <span className="ml-2 text-red-600">⚠️ Review needed</span>
                  )}
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader>
                  <CardTitle>Security Checks</CardTitle>
                  <CardDescription>Verification of security policies and configurations</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Check</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditResult.security_checks.map((check, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{check.check}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(check.status)}>
                              <span className="mr-1">{getStatusIcon(check.status)}</span>
                              {check.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{check.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {auditResult.audit_statistics && (
                <Card>
                  <CardHeader>
                    <CardTitle>Audit Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Recent Entries</div>
                        <div className="text-2xl font-bold">{auditResult.audit_statistics.total_recent}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Event Types</div>
                        <div className="text-2xl font-bold">
                          {Object.keys(auditResult.audit_statistics.event_counts).length}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Last Audit</div>
                        <div className="text-sm">
                          {auditResult.audit_statistics.last_audit
                            ? new Date(auditResult.audit_statistics.last_audit).toLocaleString()
                            : 'Never'}
                        </div>
                      </div>
                    </div>
                    {Object.keys(auditResult.audit_statistics.event_counts).length > 0 && (
                      <div className="mt-4">
                        <div className="text-sm font-medium mb-2">Event Counts</div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(auditResult.audit_statistics.event_counts).map(([event, count]) => (
                            <Badge key={event} variant="outline">
                              {event}: {count}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No audit data available. Click "Refresh Audit" to run security checks.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="access" className="space-y-4">
          {loading && !accessTestResult ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="size-8 animate-spin rounded-full border-b-2 border-primary" />
              </CardContent>
            </Card>
          ) : accessTestResult ? (
            <>
              <Alert>
                <Shield className="size-4" />
                <AlertDescription>
                  <strong>Public Access Status:</strong> {accessTestResult.summary.public_blocked}
                  <div className="mt-2 text-sm">{accessTestResult.summary.message}</div>
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader>
                  <CardTitle>Public Access Tests</CardTitle>
                  <CardDescription>Verification that public users cannot access sensitive data</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Test</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accessTestResult.public_access_tests.map((test, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{test.test}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(test.status)}>
                              {test.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {test.error ? (
                              <span className="text-muted-foreground">{test.error}</span>
                            ) : (
                              <span className="text-red-600">❌ Data accessible (vulnerable)</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No access test results. Click "Test Public Access" to verify RLS policies.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          {auditResult?.rls_status ? (
            <Card>
              <CardHeader>
                <CardTitle>Row Level Security Status</CardTitle>
                <CardDescription>RLS enabled status for sensitive tables</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Table</TableHead>
                      <TableHead>RLS Enabled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditResult.rls_status.map((rls, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{rls.table}</TableCell>
                        <TableCell>
                          <Badge variant={rls.rls_enabled ? 'default' : 'destructive'}>
                            {rls.rls_enabled ? '✅ Enabled' : '❌ Disabled'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                RLS status information not available. Run security audit to check.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {auditResult?.recent_audits && auditResult.recent_audits.length > 0 && (
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Audit Logs</CardTitle>
                <CardDescription>Latest security events and audit trail entries</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Session ID</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditResult.recent_audits.slice(0, 20).map((audit) => (
                      <TableRow key={audit.id}>
                        <TableCell className="text-sm">
                          {new Date(audit.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {audit.session_id.substring(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{audit.event}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {JSON.stringify(audit.details).substring(0, 50)}...
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

