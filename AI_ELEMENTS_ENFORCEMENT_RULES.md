# AI Elements Text Rendering Enforcement Rules

## 🔴 CRITICAL RULE: AI-Elements Only Policy

**ALL text content in this application MUST use ai-elements components for rendering. No exceptions.**

## ❌ Forbidden Patterns

### Never Use Basic HTML for Text Content
```typescript
// ❌ FORBIDDEN - Basic HTML tags for message/chat content
<p>{message}</p>
<div>{content}</div>
<span>{text}</span>

// ✅ REQUIRED - ai-elements components
<Response>{content}</Response>
<MessageContent><Response>{content}</Response></MessageContent>
```

### Never Create Direct Text Rendering Components
```typescript
// ❌ FORBIDDEN - Custom text rendering
export function MyTextComponent({ text }) {
  return <div className="text-sm">{text}</div>
}

// ✅ REQUIRED - Use ai-elements with custom styling
export function MyTextComponent({ text }) {
  return (
    <MessageContent className="text-sm">
      <Response>{text}</Response>
    </MessageContent>
  )
}
```

### Never Bypass AI-Elements for "Simple" Text
```typescript
// ❌ FORBIDDEN - Even simple text must use ai-elements
{isLoading ? "Loading..." : <Response>{content}</Response>}

// ✅ REQUIRED - All text through ai-elements
{isLoading ? <Response>Loading...</Response> : <Response>{content}</Response>}
```

## ✅ Required Usage Patterns

### 1. Basic Message Content
```typescript
import { Response } from "@/components/ai-elements/core/response";

// For simple text content
<Response>{messageText}</Response>
```

### 2. Structured Message Display
```typescript
import { MessageContent } from "@/components/ai-elements/core/message";
import { Response } from "@/components/ai-elements/core/response";

<MessageContent variant="contained">
  <Response>{messageContent}</Response>
</MessageContent>
```

### 3. Complex Content with Styling
```typescript
<MessageContent className="custom-styling">
  <Response className="preserve-whitespace">{complexContent}</Response>
</MessageContent>
```

### 4. Using Text Utilities
```typescript
import { serializeToText, shouldRenderContent } from "@/lib/text-utils";

{shouldRenderContent(content) && (
  <Response>{serializeToText(content, 'component-name')}</Response>
)}
```

## 🏗️ Unified Text Rendering Architecture

### Core Components
- **`Response`** - Main text content renderer (supports markdown, rich content)
- **`MessageContent`** - Container for message content with variants
- **`MessageAvatar`** - Avatar component for message senders
- **Text Utilities** - `src/lib/text-utils.ts` for content processing

### Component Hierarchy
```
Message (container)
├── MessageAvatar (sender info)
└── MessageContent (content wrapper)
    ├── Response (main text content)
    ├── Artifact (structured content)
    ├── Sources (citations/references)
    ├── Reasoning (AI reasoning display)
    └── Tools (tool outputs)
```

### Styling System
- **Global Styles**: `src/components/ai-elements/theme-overrides.css`
- **Variants**: Use `variant` props on components
- **Custom Classes**: Apply via `className` prop while preserving ai-elements structure

## 📋 Development Checklist

Before creating any text-displaying component:

- [ ] Does this display text content? → Use ai-elements
- [ ] Is this a message or chat content? → Use `MessageContent` + `Response`
- [ ] Do I need custom styling? → Use `className` with ai-elements components  
- [ ] Do I need text processing? → Use utilities from `src/lib/text-utils.ts`
- [ ] Is this complex content? → Check for specialized ai-elements (Artifact, Sources, etc.)

## 🚨 Code Review Requirements

### Automatic Rejections
- Any PR introducing basic HTML tags (`<p>`, `<div>`, `<span>`) for text content
- Custom text rendering components that bypass ai-elements
- Duplicate text serialization logic (use `text-utils.ts`)

### Required Approvals
- All text-displaying components must use ai-elements
- Custom styling must preserve ai-elements structure
- New text utilities must be added to `text-utils.ts`

## 🛠️ Migration Guide

### When You Find Violations
1. **Identify the violation** (basic HTML, custom text rendering)
2. **Import ai-elements components** (`Response`, `MessageContent`, etc.)
3. **Replace with proper ai-elements structure**
4. **Preserve existing styling** via `className` props
5. **Use text utilities** for content processing
6. **Test thoroughly** - ensure no regression

### Example Migration
```typescript
// ❌ Before (violation)
<div className="chat-message">
  <span className="user-name">{user.name}:</span>
  <p className="message-text">{message.content}</p>
</div>

// ✅ After (compliant)
<MessageContent className="chat-message">
  <span className="user-name">{user.name}:</span>
  <Response className="message-text">{message.content}</Response>
</MessageContent>
```

## 📚 Reference Documentation

- **AI Elements Index**: `src/components/ai-elements/index.ts`
- **Text Utilities**: `src/lib/text-utils.ts`
- **Theme Overrides**: `src/components/ai-elements/theme-overrides.css`
- **Migration Analysis**: `AI_ELEMENTS_MIGRATION_ANALYSIS.md`

## 🎯 Benefits of This Architecture

- ✅ **Consistent Theming** - All text uses unified styling system
- ✅ **Rich Content Support** - Automatic markdown, citations, reasoning
- ✅ **Maintainable Code** - Single source of truth for text rendering
- ✅ **Accessibility** - Built-in ARIA support and keyboard navigation
- ✅ **Performance** - Optimized rendering with proper memoization
- ✅ **Extensibility** - Easy to add new text features globally

## 🔧 Troubleshooting

### Common Issues
1. **Type Errors** - Ensure proper imports from `@/components/ai-elements/`
2. **Styling Issues** - Check if custom classes conflict with ai-elements CSS
3. **Content Not Rendering** - Use `shouldRenderContent()` utility
4. **Serialization Errors** - Use `serializeToText()` for complex objects

### Getting Help
- Check existing ai-elements usage in `LiveChatMessages.tsx`
- Review `text-utils.ts` for content processing functions  
- Consult `theme-overrides.css` for styling patterns
- Test changes with `pnpm type-check` and `pnpm lint`

---

**Remember: This is not optional. ALL text content MUST use ai-elements. No exceptions.**
