import { lazy } from 'react'

// Lazy loaded components for better performance
export const WorkSectionLazy = lazy(() => import('./WorkSection').then(mod => ({ default: mod.WorkSection })))
export const WorkshopsSectionLazy = lazy(() => import('./WorkshopsSection').then(mod => ({ default: mod.WorkshopsSection })))
export const MultimodalChatLazy = lazy(() => import('./chat/ChatInterface').then(mod => ({ default: mod.ChatInterface })))
