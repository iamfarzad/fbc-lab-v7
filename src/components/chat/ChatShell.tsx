import { ReactNode } from 'react'
import { ChatContainer } from './components/ChatContainer'

interface ChatShellProps {
  chatState: { isOpen: boolean; isExpanded: boolean; isMinimized: boolean; theme?: 'default' | 'mono' }
  minimized: ReactNode
  expanded: ReactNode
  overlays?: ReactNode
}

export function ChatShell({ chatState, minimized, expanded, overlays }: ChatShellProps) {
  return (
    <>
      <ChatContainer chatState={chatState}>
        {chatState.isMinimized ? minimized : expanded}
      </ChatContainer>
      {overlays}
    </>
  )
}
