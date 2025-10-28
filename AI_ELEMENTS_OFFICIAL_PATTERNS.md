# AI Elements Official Usage Patterns

Based on the official Vercel AI SDK Elements chatbot example from [ai-sdk.dev/elements/examples/chatbot](https://ai-sdk.dev/elements/examples/chatbot), this document outlines the correct usage patterns for ai-elements components.

## 🎯 Core Principle

**AI Elements are for structured message content, NOT all text in the application.**

## ✅ Use AI Elements For (Structured Content)

### 1. Message Content
```jsx
<MessageContent>
  <Response>{messageText}</Response>
</MessageContent>
```

### 2. AI-Generated Content Components
- **Sources**: `<Sources>`, `<SourcesContent>`, `<Source>`
- **Reasoning**: `<Reasoning>`, `<ReasoningContent>`, `<ReasoningTrigger>`
- **Tools**: Tool inputs, outputs, and results
- **Artifacts**: Structured AI-generated content
- **Citations**: Inline citations and references

### 3. Conversation Structure
- **Branch**: `<Branch>`, `<BranchMessages>`, `<BranchSelector>`
- **Message**: `<Message>`, `<MessageAvatar>`
- **Conversation**: `<Conversation>`, `<ConversationContent>`

## ❌ Use Basic HTML For (UI Elements)

### 1. Button Text and Labels
```jsx
// ✅ CORRECT (from official example)
<button class="flex w-full items-center gap-2 text-muted-foreground text-sm">
  Chain of Thought
</button>

// ❌ WRONG (our over-application)
<button>
  <Response>Chain of Thought</Response>
</button>
```

### 2. Status Indicators and Loading Messages
```jsx
// ✅ CORRECT (from official example)
<div class="flex gap-2 text-sm text-muted-foreground fade-in-0 slide-in-from-top-2 animate-in">
  Searching for profiles for Hayden Bleasel www.x.com www.instagram.com www.github.com
</div>

// ❌ WRONG (our over-application)
<Response>Searching for profiles...</Response>
```

### 3. Thinking Duration and Processing States
```jsx
// ✅ CORRECT (from official example)
<div class="w-full p-4" style="height: 300px;">
  Thought for 4 seconds
</div>

// ❌ WRONG (our over-application)
<Response>Thought for 4 seconds</Response>
```

### 4. Form Labels and Placeholders
```jsx
// ✅ CORRECT
<input placeholder="Type something..." />
<label>Email Address</label>

// ❌ WRONG (our over-application)
<Response>Type something...</Response>
<Response>Email Address</Response>
```

### 5. Navigation and UI Chrome
```jsx
// ✅ CORRECT
<span>Close</span>
<div>Settings</div>
<p>Welcome message</p>

// ❌ WRONG (our over-application)
<Response>Close</Response>
<Response>Settings</Response>
<Response>Welcome message</Response>
```

## 📋 Decision Framework

When deciding whether to use ai-elements or basic HTML, ask:

1. **Is this structured AI-generated content?** → Use ai-elements
2. **Is this part of a chat message?** → Use ai-elements
3. **Is this reasoning, sources, or tool output?** → Use ai-elements
4. **Is this UI chrome, buttons, labels, or status text?** → Use basic HTML

## 🔍 Official Example Analysis

From the [official chatbot example](https://ai-sdk.dev/elements/examples/chatbot):

### AI Elements Usage
```jsx
<Message from={message.from}>
  <div>
    {message.sources?.length && (
      <Sources>
        <SourcesTrigger count={message.sources.length} />
        <SourcesContent>
          {message.sources.map((source) => (
            <Source href={source.href} title={source.title} />
          ))}
        </SourcesContent>
      </Sources>
    )}
    {message.reasoning && (
      <Reasoning duration={message.reasoning.duration}>
        <ReasoningTrigger />
        <ReasoningContent>
          {message.reasoning.content}
        </ReasoningContent>
      </Reasoning>
    )}
    <MessageContent>
      <Response>{version.content}</Response>
    </MessageContent>
  </div>
  <MessageAvatar name={message.name} src={message.avatar} />
</Message>
```

### Basic HTML Usage
```jsx
<Suggestions className="px-4">
  {suggestions.map((suggestion) => (
    <Suggestion onClick={() => handleSuggestionClick(suggestion)}>
      {suggestion}  {/* Basic text, not wrapped in Response */}
    </Suggestion>
  ))}
</Suggestions>
```

## 🎯 Key Takeaways

1. **AI Elements are specialized** - They're designed for structured AI content, not general UI
2. **Basic HTML is perfectly acceptable** - For buttons, labels, status text, and UI chrome
3. **Separation of concerns** - AI Elements handle AI content, HTML handles interface
4. **Official examples are the authority** - Follow Vercel's implementation patterns
5. **Don't over-engineer** - Not everything needs to be wrapped in ai-elements

This approach reduces complexity while maintaining the power of ai-elements for their intended purpose: rendering sophisticated AI-generated content.
