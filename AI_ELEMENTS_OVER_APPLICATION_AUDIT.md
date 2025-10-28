# AI Elements Over-Application Audit

This document catalogs instances where we've over-applied ai-elements to UI elements that should use basic HTML according to official patterns.

## 🚨 Violations Found

### 1. Status Messages and Loading States
**File: `src/components/agent-ui/app/session-view.tsx`**

❌ **Lines 247, 249, 259, 260**: Status messages wrapped in Response
```typescript
// CURRENT (wrong)
<Response className="inline">Tailoring your briefing…</Response>
<Response className="mt-2 text-[11px] text-muted-foreground">
  Pulling public records, team info, and recent updates so we can hit the ground running.
</Response>
<Response className="font-medium text-foreground">Limited briefing</Response>
<Response className="mt-1 text-muted-foreground">
  Using the details you provided. Share a business email next time for deeper research.
</Response>

// SHOULD BE (correct)
<span>Tailoring your briefing…</span>
<p className="mt-2 text-[11px] text-muted-foreground">
  Pulling public records, team info, and recent updates so we can hit the ground running.
</p>
<span className="font-medium text-foreground">Limited briefing</span>
<p className="mt-1 text-muted-foreground">
  Using the details you provided. Share a business email next time for deeper research.
</p>
```

### 2. UI Labels and Identifiers
**File: `src/components/agent-ui/app/live-captions.tsx`**

❌ **Lines 25, 33**: UI labels "You:" and "Assistant:" wrapped in Response
```typescript
// CURRENT (wrong)
<MessageContent className="px-2 py-1">
  <Response className="font-medium mr-1 inline">You:</Response>
  <Response className="inline opacity-90">{userText}</Response>
</MessageContent>

// SHOULD BE (correct)
<div className="px-2 py-1">
  <span className="font-medium mr-1">You:</span>
  <span className="opacity-90">{userText}</span>
</div>
```

### 3. Data Display (Non-Message Content)
**File: `src/components/admin/AdminDashboard.tsx`**

❌ **Lines 545, 547, 549**: Email addresses, summaries, and timestamps wrapped in Response
```typescript
// CURRENT (wrong)
<Response className="text-sm text-muted-foreground">{conv.email ?? 'No email'}</Response>
<Response className="mt-2 text-sm">{conv.summary}</Response>
<Response className="mt-2 text-xs text-muted-foreground">
  {new Date(conv.createdAt).toLocaleString()}
</Response>

// SHOULD BE (correct)
<p className="text-sm text-muted-foreground">{conv.email ?? 'No email'}</p>
<p className="mt-2 text-sm">{conv.summary}</p>
<p className="mt-2 text-xs text-muted-foreground">
  {new Date(conv.createdAt).toLocaleString()}
</p>
```

## ✅ Correct Usage (Keep As-Is)

### 1. Message Content
**File: `src/components/agent-ui/app/LiveChatMessages.tsx`**

✅ **Line 102**: Actual message content correctly wrapped in Response
```typescript
// CORRECT - This is structured message content
{shouldRenderContent(m.content) && <Response>{serializeToText(m.content, 'LiveChatMessages-content')}</Response>}
```

### 2. Citation and Source Content
**File: `src/components/agent-ui/app/LiveChatMessages.tsx`**

✅ **Lines 122, 125**: Citation titles and text correctly wrapped in Response
```typescript
// CORRECT - This is structured AI content
<Response className="text-[12px] font-medium">{c.title || c.url}</Response>
{c.text && <Response className="text-[11px] text-muted-foreground mt-1">{c.text}</Response>}
```

## 📊 Summary

### Over-Applications to Fix: 8 instances
- **3 instances** in `session-view.tsx` (status messages)
- **2 instances** in `live-captions.tsx` (UI labels)
- **3 instances** in `AdminDashboard.tsx` (data display)

### Correct Usages to Preserve
- Message content in `LiveChatMessages.tsx`
- Citation and source content
- Tool outputs and results
- Reasoning and structured AI content

## 🎯 Pattern Analysis

### What We Over-Applied To:
1. **Status indicators** ("Tailoring your briefing…", "Limited briefing")
2. **UI labels** ("You:", "Assistant:")
3. **Data fields** (emails, timestamps, summaries in admin views)
4. **Loading messages** (processing states)

### What We Correctly Applied To:
1. **Actual chat messages** (user and AI message content)
2. **AI-generated structured content** (citations, sources)
3. **Tool outputs and results**
4. **Reasoning content**

This audit confirms we need to revert UI elements to basic HTML while preserving ai-elements for structured message content, exactly as shown in the official examples.
