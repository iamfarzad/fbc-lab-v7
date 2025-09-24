# AI Elements + AI SDK Tools Integration

This project now includes:
- **[AI Elements](https://github.com/vercel/ai-elements)** - A component library built on top of shadcn/ui to help you build AI-native applications faster
- **[AI SDK Tools](https://github.com/midday-ai/ai-sdk-tools)** - Essential utilities for AI development:
  - **@ai-sdk-tools/store** - Global state management that eliminates prop drilling
  - **@ai-sdk-tools/devtools** - Development tools for debugging AI applications
  - **@ai-sdk-tools/artifacts** - Advanced streaming interfaces for structured data

## Backend Verification Checklist

Use the script in `scripts/verify-backend.mjs` to exercise the critical intelligence and chat endpoints without running the full Next.js server.

```bash
# Ensure `.env.local` contains valid credentials before running:
#   GOOGLE_GENERATIVE_AI_API_KEY=<your real key>
#   NEXT_PUBLIC_SUPABASE_URL=<https://project.supabase.co>
#   SUPABASE_SERVICE_ROLE_KEY=<service role key>

node scripts/verify-backend.mjs
```

The script performs three checks and prints the response for each:

1. `/api/intelligence/session-init` – provision a session and run lead research (falls back to in-memory storage if Supabase env vars are not set).
2. `/api/intelligence/suggestions` – fetch tool suggestions for the same session.
3. `/api/chat/unified` – send a sample prompt through the Gemini pipeline. This **requires** `GOOGLE_GENERATIVE_AI_API_KEY`; the call fails fast with a 503 if the key is missing.

If your Supabase credentials are blank the script still succeeds because `ContextStorage` falls back to a shared in-memory map during local verification.

## What's Included

### Installed Components
- **Conversation**: Container for chat conversations with auto-scroll
- **Message**: Individual chat messages with avatars
- **Response**: Formatted AI response display
- **PromptInput**: Advanced input component with model selection
- **CodeBlock**: Syntax-highlighted code display with copy functionality
- **Reasoning**: Display AI reasoning and thought processes
- **Actions**: Interactive action buttons for AI responses
- **Suggestion**: Quick action suggestions
- **Loader**: Loading states for AI operations
- **Task**: Task completion tracking
- **Tool**: Tool usage visualization
- **Context**: Display context consumption
- **Sources**: Source attribution component
- **Branch**: Branch visualization for conversation flows
- **ChainOfThought**: Display AI reasoning and thought processes
- **Image**: AI-generated image display component
- **InlineCitation**: Inline source citations
- **OpenInChat**: Open in chat button for a message
- **WebPreview**: Embedded web page previews
- **Artifact**: Display a code or document

### Pages
- **Main Chat** (`/`): Simple chat interface using AI Elements
- **Demo Page** (`/demo`): Comprehensive showcase of all AI Elements components

## Usage Examples

### Basic Chat Interface with Global State
```tsx
import { useChat, useChatMessages, useChatStatus } from '@ai-sdk-tools/store';
import { DefaultChatTransport } from 'ai';
import {
  Conversation,
  ConversationContent,
  Message,
  MessageContent,
  Response,
} from '@/components/ai-elements/conversation';

export default function ChatInterface() {
  // Initialize chat with global state management
  useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat'
    })
  });

  // Access state from anywhere without prop drilling
  const messages = useChatMessages();
  const status = useChatStatus();

  return (
    <Conversation>
      <ConversationContent>
        {messages.map((message, index) => (
          <Message key={index} from={message.role}>
            <MessageContent>
              <Response>{message.content}</Response>
            </MessageContent>
          </Message>
        ))}
      </ConversationContent>
    </Conversation>
  );
}
```

### Global State Access (No Prop Drilling!)
```tsx
// Any component can access chat state directly
import { useChatMessages, useChatStatus, useChatActions } from '@ai-sdk-tools/store';

export default function ChatSidebar() {
  const messages = useChatMessages();
  const status = useChatStatus();
  const { sendMessage } = useChatActions();
  
  return (
    <div>
      <p>Messages: {messages.length}</p>
      <p>Status: {status}</p>
      <button onClick={() => sendMessage({ text: 'Hello!' })}>
        Send Message
      </button>
    </div>
  );
}
```

### Structured Artifacts for Advanced Streaming
```tsx
import { artifact, useArtifact } from '@ai-sdk-tools/artifacts';
import { z } from 'zod';

// Define artifact schema
const AnalyticsData = artifact('analytics', z.object({
  title: z.string(),
  totalUsers: z.number(),
  metrics: z.array(z.object({
    date: z.string(),
    users: z.number(),
  })),
}));

// Use in component
export default function Dashboard() {
  const { data, status, progress } = useArtifact(AnalyticsData);
  
  return (
    <div>
      <h2>{data?.title}</h2>
      {status === 'loading' && <div>Loading... {progress * 100}%</div>}
      {data?.metrics.map(metric => (
        <div key={metric.date}>{metric.date}: {metric.users} users</div>
      ))}
    </div>
  );
}
```

### Development Tools
```tsx
// Add to your layout for development debugging
import { AISDKDevtools } from '@ai-sdk-tools/devtools';

export default function Layout({ children }) {
  return (
    <html>
      <body>
        {children}
        {process.env.NODE_ENV === 'development' && <AISDKDevtools />}
      </body>
    </html>
  );
}
```

### Code Block with Syntax Highlighting
```tsx
import { CodeBlock } from '@/components/ai-elements/code-block';

<CodeBlock
  language="typescript"
  code={`function example() {
  return "Hello World";
}`}
/>
```

### AI Reasoning Display
```tsx
import { Reasoning } from '@/components/ai-elements/reasoning';

<Reasoning>
  <p>I analyzed your request and provided a comprehensive response based on the context.</p>
</Reasoning>
```

### Quick Actions and Suggestions
```tsx
import { Actions, Suggestion } from '@/components/ai-elements';

<Actions>
  <Button variant="outline" size="sm">Copy Code</Button>
  <Button variant="outline" size="sm">Save to Favorites</Button>
</Actions>

<div className="flex gap-2">
  <Suggestion>Add TypeScript types</Suggestion>
  <Suggestion>Implement drag & drop</Suggestion>
</div>
```

## API Integration

The project includes a chat API route at `/api/chat` that integrates with Google's Gemini model:

```typescript
// app/api/chat/route.ts
import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: google('gemini-1.5-flash-latest'),
    messages,
    temperature: 0.7,
    maxTokens: 1024,
  });

  return result.toDataStreamResponse();
}
```

## Customization

All AI Elements components are fully customizable and can be modified in the `src/components/ai-elements/` directory. They use Tailwind CSS for styling and follow the shadcn/ui design system.

## Development

To start the development server:
```bash
pnpm dev:all
```

To see all AI Elements in action, visit `/demo` after starting the server.

## Key Benefits

### AI SDK Tools
- **@ai-sdk-tools/store**: No prop drilling, optimized re-renders, global state management
- **@ai-sdk-tools/devtools**: Development debugging tools for AI applications
- **@ai-sdk-tools/artifacts**: Structured streaming for dashboards, analytics, and complex data
- **Zero Breaking Changes**: Drop-in replacement for `@ai-sdk/react`
- **TypeScript Support**: Full type safety throughout

### AI Elements
- **Production Ready**: Battle-tested components for AI applications
- **Customizable**: Built on shadcn/ui with Tailwind CSS
- **Accessible**: WCAG compliant components
- **Modern**: React 18+ with concurrent features

## Resources

- [AI Elements Documentation](https://ai-sdk.dev/elements/overview)
- [AI SDK Tools Repository](https://github.com/midday-ai/ai-sdk-tools)
- [AI SDK Tools Website](https://ai-sdk-tools.dev)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [AI SDK Documentation](https://sdk.vercel.ai/)
