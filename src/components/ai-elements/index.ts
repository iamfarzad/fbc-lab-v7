// ============================================
// Vercel AI Elements - Organized Exports
// Official Docs: https://ai-sdk.dev/elements/overview
// GitHub: https://github.com/vercel/ai-elements
// ============================================

// Core Conversation Components
// Use these for basic chat UI
export * from './core/conversation'
export * from './core/message'
export * from './core/response'
export * from './core/loader'

// Interactive Components
// Use these for user actions
export * from './interactive/actions'
export * from './interactive/suggestion'
export * from './interactive/prompt-input'
export * from './interactive/open-in-chat'

// Reasoning & Thinking
// Auto-rendered in Response, or use standalone
export * from './reasoning/chain-of-thought'
export * from './reasoning/reasoning'
export * from './reasoning/task'

// Content Display
// Auto-rendered in Response component
export * from './content/code-block'
export * from './content/image'
export * from './content/artifact'
export * from './content/web-preview'

// Sources & Citations
// Auto-rendered in Response
export * from './sources/sources'
export * from './sources/inline-citation'
export * from './sources/context'

// Tool Visualization
export * from './tools/tool'
export * from './tools/branch'

