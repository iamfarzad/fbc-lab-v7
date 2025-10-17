# Admin Dashboard Data Flow Analysis

**Date:** October 17, 2025  
**Status:** ⚠️ SCHEMA MISMATCH IDENTIFIED

---

## Current State

### What Admin Dashboard Queries

**File:** `app/api/admin/conversations/route.ts`

```typescript
// Admin queries THIS table:
const { data } = await supabase
  .from('conversations')  // ← Different table!
  .select('*')
```

**Expects these columns:**
- `id` (primary key)
- `session_id`
- `lead_id`
- `name`
- `email`
- `summary`
- `lead_score`
- `research_json`
- `pdf_url` ← Looking for PDFs here
- `email_status`
- `email_retries`
- `created_at`

### What We've Been Storing To

**File:** `src/core/context/multimodal-context.ts`

```typescript
// Our implementation writes to THIS table:
await this.contextStorage.store(sessionId, {
  session_id: sessionId,
  email: context.leadContext.email,
  name: context.leadContext.name,
  company_context: context.leadContext.company,
  multimodal_context: context,  // Full multimodal data
  pdf_url: uploadData.path,  // We add this
  pdf_generated_at: new Date().toISOString()  // And this
})

// Goes to:
supabase.from('conversation_contexts')  // ← Different table!
```

**Has these columns:**
- `session_id` (primary key)
- `email`
- `name`
- `company_context`
- `person_context`
- `role`
- `role_confidence`
- `intent_data`
- `ai_capabilities_shown`
- `last_user_message`
- `company_url`
- `multimodal_context` ← Our full context
- `pdf_url` ← We added this
- `pdf_generated_at` ← We added this
- `created_at`
- `updated_at`

---

## The Problem: Schema Mismatch

### Two Separate Systems

**System 1: `conversations` table** (what admin expects)
- Purpose: High-level conversation tracking
- Related to: `leads` table (has lead_id foreign key)
- Contains: Summary, lead score, PDF URL, email status
- **Admin dashboard queries THIS** ❌

**System 2: `conversation_contexts` table** (what we built)
- Purpose: Session context and multimodal data
- Standalone: No lead_id (uses session_id as key)
- Contains: Multimodal context, WAL data, PDF URLs
- **Our code writes to THIS** ✅

### Result

**Admin dashboard shows:** Empty or outdated data  
**Our PDFs stored in:** conversation_contexts (admin can't see them)  
**Multimodal context stored in:** conversation_contexts (admin can't access)

---

## What Admin Can See NOW

### ✅ Currently Accessible

1. **Stats** (`/api/admin/stats`)
   - Queries: `lead_summaries` table
   - Shows: Total leads, conversion rate, avg lead score
   - Works independently

2. **Logs** (`/admin/logs`)
   - Queries: `logs` table
   - Shows: Production logs
   - Works fine

3. **Conversations** (`/api/admin/conversations`)
   - Queries: `conversations` table
   - **PROBLEM:** This table is likely empty or stale
   - Our new data is in `conversation_contexts`

### ❌ Currently NOT Accessible

1. **Multimodal Context**
   - Stored in: `conversation_contexts.multimodal_context`
   - Admin query: Looks at `conversations` table
   - **Not accessible**

2. **Generated PDFs**
   - Stored in: `conversation_contexts.pdf_url`
   - Admin query: Looks at `conversations.pdf_url`
   - **Not accessible**

3. **Voice Transcripts**
   - Stored in: `conversation_contexts.multimodal_context.audioContext[]`
   - Admin has no way to view

4. **Visual Analyses**
   - Stored in: `conversation_contexts.multimodal_context.visualContext[]`
   - Admin has no way to view

5. **Uploaded Files**
   - Stored in: `conversation_contexts.multimodal_context.uploadContext[]`
   - Admin has no way to view

6. **WAL Entries**
   - Stored in: `wal_log` table
   - Admin has no query for this

7. **Audit Trail**
   - Stored in: `audit_log` table
   - Admin has no query for this

---

## Data Flow Diagram (Current Reality)

```
┌──────────────────────────────────────────────────────────┐
│           USER INTERACTION                               │
└─────────────────┬────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────────────────┐
│   MultimodalContextManager                               │
│   - Text, voice, webcam, screen, files                   │
│   - Stores to: conversation_contexts table               │
│   - Stores to: wal_log table                             │
│   - Stores to: audit_log table                           │
│   - Stores to: conversation-pdfs bucket                  │
└─────────────────┬────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────────────────┐
│          SUPABASE STORAGE                                │
│                                                          │
│  ┌─────────────────────────────────────┐                │
│  │ conversation_contexts               │                │
│  │ - session_id                        │                │
│  │ - email, name, company              │                │
│  │ - multimodal_context (JSONB) ✅     │                │
│  │ - pdf_url ✅                        │                │
│  │ - pdf_generated_at ✅               │                │
│  └─────────────────────────────────────┘                │
│                                                          │
│  ┌─────────────────────────────────────┐                │
│  │ conversations                       │                │
│  │ - id, session_id, lead_id           │                │
│  │ - stage, status                     │                │
│  │ - metadata                          │                │
│  │ - NO multimodal_context ❌          │                │
│  │ - NO pdf_url in schema ❌           │                │
│  └─────────────────────────────────────┘                │
│                                                          │
│  ┌─────────────────────────────────────┐                │
│  │ wal_log ✅ NEW                      │                │
│  └─────────────────────────────────────┘                │
│                                                          │
│  ┌─────────────────────────────────────┐                │
│  │ audit_log ✅ NEW                    │                │
│  └─────────────────────────────────────┘                │
│                                                          │
│  ┌─────────────────────────────────────┐                │
│  │ Storage: conversation-pdfs ✅        │                │
│  └─────────────────────────────────────┘                │
└─────────────────┬────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────────────────┐
│         ADMIN DASHBOARD                                  │
│                                                          │
│  /api/admin/conversations                                │
│  ↓                                                       │
│  SELECT * FROM conversations ❌                          │
│  - Missing: multimodal_context                           │
│  - Missing: pdf_url (wrong table)                        │
│  - Missing: voice, visual, uploads                       │
│                                                          │
│  /api/admin/stats                                        │
│  ↓                                                       │
│  SELECT * FROM lead_summaries ✅                         │
│  - Works fine (independent system)                       │
└──────────────────────────────────────────────────────────┘

DISCONNECT: Admin queries conversations, we write to conversation_contexts
```

---

## What Admin SHOULD Be Able To See

For proper follow-up and client management, admin needs:

### 1. Conversation List
- ✅ Name, email, company
- ✅ Session ID
- ✅ Created/updated timestamps
- ❌ PDF URL (in wrong table)
- ❌ Modalities used
- ❌ Message count
- ❌ Lead score

### 2. Conversation Details (drill-down)
- ❌ Full conversation history
- ❌ Voice transcripts
- ❌ Screen share analyses
- ❌ Uploaded files
- ❌ Multimodal summary

### 3. PDF Access
- ✅ PDF URL (but in conversation_contexts, not conversations)
- ❌ Direct download button
- ❌ Preview in dashboard
- ❌ Email resend capability

### 4. Audit & Compliance
- ❌ Audit log view
- ❌ PII detection events
- ❌ Data deletion requests
- ❌ WAL status

### 5. Analytics
- ❌ Modality usage stats
- ❌ Voice conversation duration
- ❌ Screen share frequency
- ❌ File upload patterns

---

## Solutions: Bridging the Gap

### Option 1: Use conversation_contexts for Admin (Recommended)

**Change admin API to query the correct table:**

```typescript
// app/api/admin/conversations/route.ts
const { data } = await supabase
  .from('conversation_contexts')  // ← Change to this
  .select('session_id, email, name, company_context, pdf_url, pdf_generated_at, multimodal_context, created_at, updated_at')
  .gte('created_at', startDate.toISOString())
  .order('created_at', { ascending: false })
```

**Pros:**
- ✅ Simple one-line change
- ✅ Admin sees all new data immediately
- ✅ Multimodal context accessible
- ✅ PDF URLs accessible

**Cons:**
- ❌ No lead_id (would need to join with leads table)
- ❌ Different schema than expected

### Option 2: Sync conversation_contexts → conversations

**Create a sync function to copy data:**

```typescript
// After archiving to conversation_contexts
async function syncToConversationsTable(sessionId: string) {
  const context = await contextStorage.get(sessionId)
  
  // Create or update conversations table entry
  await supabase.from('conversations').upsert({
    session_id: sessionId,
    lead_id: findLeadId(context.email),  // Lookup lead
    stage: 'completed',
    status: 'archived',
    metadata: {
      modalitiesUsed: context.multimodal_context.metadata.modalitiesUsed,
      totalMessages: context.multimodal_context.conversationHistory.length,
      pdfUrl: context.pdf_url
    },
    updated_at: new Date().toISOString()
  })
}
```

**Pros:**
- ✅ Maintains existing admin dashboard code
- ✅ Admin sees data in expected table
- ✅ Can relate to leads table

**Cons:**
- ❌ Data duplication
- ❌ Extra sync logic
- ❌ Potential sync failures

### Option 3: Create Admin-Specific API (Best Practice)

**New endpoint that joins both tables:**

```typescript
// app/api/admin/conversations-enhanced/route.ts
export async function GET(request: NextRequest) {
  // Query conversation_contexts with full data
  const { data: contexts } = await supabase
    .from('conversation_contexts')
    .select(`
      session_id,
      email,
      name,
      company_context,
      pdf_url,
      pdf_generated_at,
      multimodal_context,
      created_at,
      updated_at
    `)
    .order('created_at', { ascending: false })
  
  // Enhance with modality stats
  const enhanced = contexts.map(ctx => ({
    sessionId: ctx.session_id,
    email: ctx.email,
    name: ctx.name,
    company: ctx.company_context,
    pdfUrl: ctx.pdf_url,
    pdfGeneratedAt: ctx.pdf_generated_at,
    createdAt: ctx.created_at,
    // Extract from multimodal_context
    modalitiesUsed: ctx.multimodal_context?.metadata?.modalitiesUsed || [],
    totalMessages: ctx.multimodal_context?.conversationHistory?.length || 0,
    voiceTranscripts: ctx.multimodal_context?.audioContext?.length || 0,
    visualCaptures: ctx.multimodal_context?.visualContext?.length || 0,
    filesUploaded: ctx.multimodal_context?.uploadContext?.length || 0,
    lastActivity: ctx.multimodal_context?.metadata?.lastUpdated
  }))
  
  return respond.ok(enhanced)
}
```

**Pros:**
- ✅ Clean separation of concerns
- ✅ Admin gets exactly what it needs
- ✅ Can add computed fields
- ✅ Backward compatible

**Cons:**
- ❌ Requires updating admin dashboard component

---

## Recommended Implementation

**Phase 13: Admin Dashboard Integration** (NEXT)

### Step 1: Create Enhanced Admin API

Create: `app/api/admin/multimodal-conversations/route.ts`

```typescript
export async function GET(request: NextRequest) {
  const authResult = await adminAuthMiddleware(request)
  if (authResult) return authResult

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || '30d'
  const search = searchParams.get('search') || ''

  const supabase = getSupabaseService()
  
  let query = supabase
    .from('conversation_contexts')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (search) {
    query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`)
  }
  
  const { data, error } = await query
  
  if (error) {
    return respond.error('Failed to fetch conversations', 500)
  }
  
  // Transform for admin UI
  const conversations = data.map(ctx => ({
    sessionId: ctx.session_id,
    email: ctx.email,
    name: ctx.name,
    company: ctx.company_context,
    pdfUrl: ctx.pdf_url,
    pdfGeneratedAt: ctx.pdf_generated_at,
    createdAt: ctx.created_at,
    
    // Multimodal stats
    modalities: ctx.multimodal_context?.metadata?.modalitiesUsed || [],
    messageCount: ctx.multimodal_context?.conversationHistory?.length || 0,
    voiceCount: ctx.multimodal_context?.audioContext?.length || 0,
    visualCount: ctx.multimodal_context?.visualContext?.length || 0,
    uploadCount: ctx.multimodal_context?.uploadContext?.length || 0,
    totalTokens: ctx.multimodal_context?.metadata?.totalTokens || 0,
    
    // Quick access to recent content
    lastMessage: ctx.multimodal_context?.conversationHistory?.slice(-1)[0]?.content || '',
    hasVoice: (ctx.multimodal_context?.audioContext?.length || 0) > 0,
    hasVisual: (ctx.multimodal_context?.visualContext?.length || 0) > 0,
    hasUploads: (ctx.multimodal_context?.uploadContext?.length || 0) > 0,
  }))
  
  return respond.ok(conversations)
}
```

### Step 2: Add Conversation Detail API

Create: `app/api/admin/conversation-detail/[sessionId]/route.ts`

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const authResult = await adminAuthMiddleware(request)
  if (authResult) return authResult

  const supabase = getSupabaseService()
  
  const { data, error } = await supabase
    .from('conversation_contexts')
    .select('*')
    .eq('session_id', params.sessionId)
    .single()
  
  if (error || !data) {
    return respond.notFound('Conversation not found')
  }
  
  // Return full multimodal context for detailed view
  return respond.ok({
    sessionId: data.session_id,
    leadInfo: {
      email: data.email,
      name: data.name,
      company: data.company_context
    },
    pdfUrl: data.pdf_url,
    pdfGeneratedAt: data.pdf_generated_at,
    
    // Full multimodal data
    conversationHistory: data.multimodal_context?.conversationHistory || [],
    voiceTranscripts: data.multimodal_context?.audioContext || [],
    visualAnalyses: data.multimodal_context?.visualContext || [],
    uploadedFiles: data.multimodal_context?.uploadContext || [],
    
    metadata: data.multimodal_context?.metadata || {},
    
    createdAt: data.created_at,
    updatedAt: data.updated_at
  })
}
```

### Step 3: Add PDF Download Helper

Create: `app/api/admin/download-pdf/[sessionId]/route.ts`

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const authResult = await adminAuthMiddleware(request)
  if (authResult) return authResult

  const supabase = getSupabaseService()
  
  // Get PDF URL from conversation_contexts
  const { data: context } = await supabase
    .from('conversation_contexts')
    .select('pdf_url')
    .eq('session_id', params.sessionId)
    .single()
  
  if (!context?.pdf_url) {
    return respond.notFound('PDF not found for this session')
  }
  
  // Download from storage
  const { data: pdfBlob, error } = await supabase.storage
    .from('conversation-pdfs')
    .download(context.pdf_url)
  
  if (error || !pdfBlob) {
    return respond.error('Failed to download PDF', 500)
  }
  
  // Return as file download
  return new NextResponse(pdfBlob, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="conversation-${params.sessionId}.pdf"`
    }
  })
}
```

### Step 4: Add Audit Log API

Create: `app/api/admin/audit-log/route.ts`

```typescript
export async function GET(request: NextRequest) {
  const authResult = await adminAuthMiddleware(request)
  if (authResult) return authResult

  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')
  const event = searchParams.get('event')
  
  const supabase = getSupabaseService()
  
  let query = supabase
    .from('audit_log')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(100)
  
  if (sessionId) {
    query = query.eq('session_id', sessionId)
  }
  
  if (event) {
    query = query.eq('event', event)
  }
  
  const { data, error } = await query
  
  if (error) {
    return respond.error('Failed to fetch audit log', 500)
  }
  
  return respond.ok(data)
}
```

### Step 5: Update AdminDashboard Component

Add new sections:

```typescript
// src/components/admin/AdminDashboard.tsx

// Add to navigation:
{
  id: 'multimodal', 
  label: 'Multimodal Sessions', 
  icon: Video, 
  description: 'View voice, screen, and file interactions'
},
{
  id: 'audit', 
  label: 'Audit Trail', 
  icon: Shield, 
  description: 'Security and compliance logs'
}

// New component for multimodal view
function MultimodalConversationsView() {
  const [conversations, setConversations] = useState([])
  
  useEffect(() => {
    fetch('/api/admin/multimodal-conversations')
      .then(r => r.json())
      .then(setConversations)
  }, [])
  
  return (
    <div className="space-y-4">
      {conversations.map(conv => (
        <Card key={conv.sessionId}>
          <CardHeader>
            <CardTitle>{conv.name} ({conv.email})</CardTitle>
            <div className="flex gap-2">
              {conv.modalities.map(m => (
                <Badge key={m}>{m}</Badge>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <strong>Messages:</strong> {conv.messageCount}
              </div>
              <div>
                <strong>Voice:</strong> {conv.voiceCount}
              </div>
              <div>
                <strong>Visual:</strong> {conv.visualCount}
              </div>
              <div>
                <strong>Files:</strong> {conv.uploadCount}
              </div>
            </div>
            
            {conv.pdfUrl && (
              <Button 
                onClick={() => downloadPDF(conv.sessionId)}
                className="mt-4"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            )}
            
            <Button 
              variant="outline"
              onClick={() => viewDetails(conv.sessionId)}
              className="mt-4 ml-2"
            >
              View Full Details
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

---

## Quick Fix (Minimal Changes)

**If you want admin to work TODAY with minimal changes:**

### 1. Update Admin Conversations API

```typescript
// app/api/admin/conversations/route.ts
// Line 72-76, replace:
let query = (supabase as any)
  .from('conversations')  // OLD
  .select('*')

// With:
let query = (supabase as any)
  .from('conversation_contexts')  // NEW
  .select('session_id as id, email, name, company_context, pdf_url, created_at, updated_at, multimodal_context')
```

### 2. Update Response Mapping

```typescript
// Line 89-100, update:
const conversations: ConversationResponse[] = (data ?? []).map((conv: any) => ({
  id: conv.session_id,  // Changed from conv.id
  name: conv.name,
  email: conv.email,
  summary: extractSummary(conv.multimodal_context),  // Extract from multimodal
  leadScore: null,  // Not in this table
  researchJson: null,
  pdfUrl: conv.pdf_url,  // Now available!
  emailStatus: null,
  emailRetries: null,
  createdAt: conv.created_at
}))

function extractSummary(multimodalContext: any): string | null {
  const history = multimodalContext?.conversationHistory || []
  if (history.length === 0) return null
  return `${history.length} messages across ${multimodalContext?.metadata?.modalitiesUsed?.join(', ') || 'text'}`
}
```

---

## What Admin Gets After Fix

### Conversations Tab

**Now shows:**
- ✅ All sessions from conversation_contexts
- ✅ Name, email, company
- ✅ PDF URL (can download)
- ✅ Session timestamps
- ✅ Modality summary (extracted from multimodal_context)

**Example row:**
```
Name: John Smith
Email: john.smith@testcorp.com
Summary: 45 messages across text, audio, image
PDF: ✓ Download
Created: Oct 17, 2025 14:23
```

### Conversation Detail (if built)

**Would show:**
- Voice transcripts (all)
- Screen analyses (all)
- Uploaded files (all)
- Full message history
- Metadata and timestamps

---

## Current Admin Data Flow (After Fix)

```
Admin Dashboard
  ↓
GET /api/admin/conversations
  ↓
SELECT * FROM conversation_contexts ✅
  ↓
Returns:
  - sessionId, email, name, company ✅
  - pdf_url ✅ (can download)
  - multimodal_context ✅ (extract stats)
  - modalitiesUsed, messageCount ✅
  ↓
Admin sees comprehensive list
  ↓
Click "Download PDF"
  ↓
GET /api/admin/download-pdf/[sessionId]
  ↓
Downloads from Supabase Storage ✅
  ↓
Admin reviews PDF for follow-up
```

---

## New Admin Capabilities (After Full Implementation)

### 1. Multimodal Conversation Browser
- Filter by modality (voice only, screen share, file uploads)
- Sort by message count, token usage, duration
- Search by email, name, company

### 2. Conversation Replay
- View full conversation history
- Play voice transcripts (if audio stored)
- View screen capture analyses
- Download uploaded files

### 3. Audit & Compliance Dashboard
- View all PII detection events
- Track data deletion requests
- Monitor WAL sync status
- Export audit trail for compliance reviews

### 4. Analytics & Insights
- Most used modalities
- Average voice conversation length
- File upload patterns
- Screen share usage by industry/company size

---

## Summary

### Current Situation (Before Fix)

**Admin queries:** `conversations` table  
**We write to:** `conversation_contexts` table  
**Result:** Admin sees nothing from new system ❌

### After Minimal Fix

**Admin queries:** `conversation_contexts` table  
**We write to:** `conversation_contexts` table  
**Result:** Admin sees all data ✅

### After Full Enhancement

**Admin has:**
- Multimodal conversation browser ✅
- PDF download capability ✅
- Conversation detail view ✅
- Audit log monitoring ✅
- Compliance reporting ✅
- Analytics dashboard ✅

---

## Action Items

### Immediate (Critical)
- [ ] Update `/api/admin/conversations` to query `conversation_contexts`
- [ ] Test admin dashboard shows conversations
- [ ] Verify PDF download works

### Short-term (This Week)
- [ ] Create `/api/admin/multimodal-conversations` with enhanced data
- [ ] Create `/api/admin/download-pdf/[sessionId]`
- [ ] Create `/api/admin/audit-log`
- [ ] Update AdminDashboard component to use new APIs

### Long-term (Phase 2)
- [ ] Build conversation replay UI
- [ ] Add voice transcript playback
- [ ] Create analytics dashboard for modality usage
- [ ] Build compliance reporting tools

---

## Quick Test

After implementing the minimal fix:

```bash
# 1. Generate a PDF (Test 15)
# 2. Check Supabase conversation_contexts has row
# 3. Open admin dashboard: http://localhost:3000/admin
# 4. Go to "Conversations" tab
# 5. Should see your session with PDF download button
```

**If you see it → Admin integration working!** ✅

