import dynamic from 'next/dynamic'

// Client-only dynamic components for sections that reference browser APIs
export const WorkSectionLazy = dynamic(
  () => import('./WorkSection').then(mod => ({ default: mod.WorkSection })),
  { ssr: false }
)
export const WorkshopsSectionLazy = dynamic(
  () => import('./WorkshopsSection').then(mod => ({ default: mod.WorkshopsSection })),
  { ssr: false }
)
export const MultimodalChatLazy = dynamic(
  () => import('./chat/ChatInterface').then(mod => ({ default: mod.ChatInterface })),
  { ssr: false }
)
