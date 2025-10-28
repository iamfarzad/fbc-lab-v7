# AI Elements Text Rendering Guidelines

## 🎯 CORE PRINCIPLE: Use AI Elements for Structured Content Only

**AI Elements are for structured message content, NOT all text in the application.**

Based on [official Vercel AI SDK patterns](https://ai-sdk.dev/elements/examples/chatbot).

## ✅ Use AI Elements For (Structured Content)

### Message Content and AI Responses
```typescript
// ✅ CORRECT - Actual chat messages
<MessageContent>
  <Response>{messageText}</Response>
</MessageContent>

// ✅ CORRECT - AI-generated structured content
<Sources>
  <SourcesTrigger count={sources.length} />
  <SourcesContent>
    {sources.map(source => <Source {...source} />)}
  </SourcesContent>
</Sources>
```

### AI-Generated Content Components
```typescript
// ✅ CORRECT - Reasoning, sources, tools
<Reasoning duration={duration}>
  <ReasoningTrigger />
  <ReasoningContent>{reasoningText}</ReasoningContent>
</Reasoning>

<Tools>
  <Tool name="search">
    <ToolContent>{toolOutput}</ToolContent>
  </Tool>
</Tools>
```

## ❌ Use Basic HTML For (UI Elements)

### Button Text and Labels
```typescript
// ✅ CORRECT - Basic HTML for UI chrome
<button className="text-sm text-muted-foreground">
  Chain of Thought
</button>

// ❌ WRONG - Over-application of ai-elements
<button>
  <Response>Chain of Thought</Response>
</button>
```

### Status Indicators and Loading Messages
```typescript
// ✅ CORRECT - Basic HTML for status/loading
<div className="flex gap-2 text-sm text-muted-foreground">
  Searching for profiles...
</div>

<div className="w-full p-4">
  Thought for 4 seconds
</div>

// ❌ WRONG - Over-application of ai-elements
<Response>Searching for profiles...</Response>
<Response>Thought for 4 seconds</Response>
```

### Form Elements and Labels
```typescript
// ✅ CORRECT - Basic HTML for forms and labels
<input placeholder="Type something..." />
<label htmlFor="email">Email Address</label>
<span className="font-medium">You:</span>

// ❌ WRONG - Over-application of ai-elements
<Response>Type something...</Response>
<Response>Email Address</Response>
<Response>You:</Response>
```

## 📋 Decision Framework

When deciding whether to use ai-elements or basic HTML, ask:

1. **Is this structured AI-generated content?** → Use ai-elements
2. **Is this part of a chat message?** → Use ai-elements  
3. **Is this reasoning, sources, or tool output?** → Use ai-elements
4. **Is this UI chrome, buttons, labels, or status text?** → Use basic HTML

## ✅ Correct Usage Patterns

### 1. Chat Message Content
```typescript
import { Response } from "@/components/ai-elements/core/response";
import { MessageContent } from "@/components/ai-elements/core/message";

// For actual chat messages
<MessageContent>
  <Response>{messageText}</Response>
</MessageContent>
```

### 2. AI-Generated Structured Content
```typescript
// Citations and sources
<Response className="text-[12px] font-medium">{citation.title}</Response>

// Tool outputs
<ToolContent>
  {serializeToText(toolOutput, 'tool-output')}
</ToolContent>
```

### 3. UI Elements (Basic HTML)
```typescript
// Status messages
<span className="text-muted-foreground">Processing...</span>

// Button text
<button className="flex items-center gap-2">
  Chain of Thought
</button>

// Form labels
<label htmlFor="input">Enter message</label>
```

### 4. Using Text Utilities
```typescript
import { serializeToText, shouldRenderContent } from "@/lib/text-utils";

// Only for structured content serialization
{shouldRenderContent(content) && (
  <Response>{serializeToText(content, 'component-name')}</Response>
)}
```

## 🏗️ Architecture Overview

### AI Elements Components (Structured Content)
- **`Response`** - Main text content renderer for messages (supports markdown, rich content)
- **`MessageContent`** - Container for message content with variants  
- **`Sources`** - Citations and reference display
- **`Reasoning`** - AI reasoning and thought process display
- **`Tools`** - Tool inputs, outputs, and results
- **`Artifacts`** - Structured AI-generated content

### Basic HTML Elements (UI Chrome)
- **Standard HTML tags** - `<p>`, `<div>`, `<span>`, `<button>`, `<label>`, etc.
- **Form elements** - `<input>`, `<textarea>`, `<select>`, etc.
- **Navigation** - `<nav>`, `<a>`, menu items, etc.
- **Status indicators** - Loading messages, error states, notifications

### Text Processing Utilities
- **`src/lib/text-utils.ts`** - Centralized text serialization and processing
- **`serializeToText()`** - Convert objects to display strings
- **`shouldRenderContent()`** - Check if content should be rendered

## 📋 Development Checklist

Before creating any text-displaying component:

- [ ] Is this structured AI content? → Use ai-elements (`Response`, `Sources`, etc.)
- [ ] Is this a chat message? → Use `MessageContent` + `Response`
- [ ] Is this UI chrome (buttons, labels, status)? → Use basic HTML
- [ ] Do I need object serialization? → Use `serializeToText()` from `text-utils.ts`
- [ ] Is this a loading/status message? → Use basic HTML with appropriate semantic tags

## 🚨 Code Review Guidelines

### Avoid These Patterns
- Using `Response` for button text, form labels, or status messages
- Using basic HTML for actual chat message content
- Duplicate text serialization logic (use centralized `text-utils.ts`)
- Mixing ai-elements and basic HTML within the same content block unnecessarily

### Encourage These Patterns
- AI elements for structured message content and AI-generated data
- Basic HTML for UI chrome, navigation, and form elements
- Consistent use of text utilities for object serialization
- Clear separation between structured content and interface elements

## 🛠️ Migration Guide

### Over-Applied AI Elements → Basic HTML
```typescript
// ❌ Over-application (fix this)
<Response>Loading...</Response>
<Response>You:</Response>
<button><Response>Submit</Response></button>

// ✅ Correct basic HTML
<span>Loading...</span>
<span>You:</span>
<button>Submit</button>
```

### Basic HTML → AI Elements (for message content)
```typescript
// ❌ Using basic HTML for message content
<div className="chat-message">
  <p>{message.content}</p>
</div>

// ✅ Use ai-elements for structured content
<MessageContent className="chat-message">
  <Response>{message.content}</Response>
</MessageContent>
```

### Mixed Content Example
```typescript
// ✅ Proper separation
<div className="chat-container">
  <span className="timestamp">{timestamp}</span>  {/* UI chrome */}
  <MessageContent>
    <Response>{messageContent}</Response>  {/* Structured content */}
  </MessageContent>
  <button className="retry-btn">Retry</button>  {/* UI chrome */}
</div>
```

## 📚 Reference Documentation

- **Official Patterns**: [AI SDK Elements Examples](https://ai-sdk.dev/elements/examples/chatbot)
- **Pattern Analysis**: `AI_ELEMENTS_OFFICIAL_PATTERNS.md`
- **Over-Application Audit**: `AI_ELEMENTS_OVER_APPLICATION_AUDIT.md`
- **Text Utilities**: `src/lib/text-utils.ts`
- **AI Elements Index**: `src/components/ai-elements/index.ts`

## 🎯 Benefits of Proper Usage

- ✅ **Aligned with Official Patterns** - Follows Vercel's implementation
- ✅ **Reduced Complexity** - No over-engineering of simple UI elements
- ✅ **Better Performance** - Basic HTML is faster for static content
- ✅ **Clearer Architecture** - Clear separation of concerns
- ✅ **Maintainable Code** - Easier to understand and modify
- ✅ **Proper Semantics** - Right tool for the right job

## 🔧 Troubleshooting

### When to Use AI Elements
- Actual chat message content
- Citations, sources, references
- AI reasoning and thought processes
- Tool outputs and results
- Artifacts and structured AI content

### When to Use Basic HTML
- Button text and labels
- Form inputs and placeholders
- Status messages and loading states
- Navigation and UI chrome
- Error messages and notifications

### Common Migration Issues
1. **Over-application** - Check if you're wrapping UI elements unnecessarily
2. **Under-application** - Ensure message content uses ai-elements
3. **Mixed patterns** - Be consistent within the same content area
4. **Styling conflicts** - Preserve existing classes during migration

---

**Follow the official AI SDK patterns: AI Elements for structured content, basic HTML for UI elements.**
