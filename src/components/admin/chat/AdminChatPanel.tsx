'use client'

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/core/conversation'
import { Message, MessageAvatar, MessageContent } from '@/components/ai-elements/core/message'
import { Response } from '@/components/ai-elements/core/response'
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
} from '@/components/ai-elements/interactive/prompt-input'
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning/reasoning'
import { Task, TaskTrigger, TaskContent, TaskItem, TaskItemFile } from '@/components/ai-elements/reasoning/task'
import { Source, Sources, SourcesContent, SourcesTrigger } from '@/components/ai-elements/sources/sources'
import {
  InlineCitation,
  InlineCitationText,
  InlineCitationCard,
  InlineCitationCardTrigger,
  InlineCitationCardBody,
  InlineCitationCarousel,
  InlineCitationCarouselHeader,
  InlineCitationCarouselContent,
  InlineCitationCarouselItem,
  InlineCitationCarouselPrev,
  InlineCitationCarouselNext,
  InlineCitationCarouselIndex,
} from '@/components/ai-elements/sources/inline-citation'
import { CodeBlock } from '@/components/ai-elements/content/code-block'
import { WebPreview } from '@/components/ai-elements/content/web-preview'
import { Actions, Action } from '@/components/ai-elements/interactive/actions'
import { Tool, ToolContent, ToolHeader } from '@/components/ai-elements/tools/tool'
import { useAdminChat } from '@/hooks/useAdminChat'
import { useLiveApi } from '@/hooks/useLiveApi'
import { useCamera } from '@/hooks/useCamera'
import { useScreenShare } from '@/hooks/useScreenShare'
import { AdminChatActions } from './AdminChatActions'
import { AdminVoiceTranscript } from './AdminVoiceTranscript'
import { AdminChatHistory } from './AdminChatHistory'
import { AdminWebcamPreview } from './AdminWebcamPreview'
import { AdminScreenSharePreview } from './AdminScreenSharePreview'
import { LiveWaveform } from '@/components/ui/live-waveform'
import { toast } from 'sonner'
import { MessageSquare, RotateCcwIcon, X, Loader2 } from 'lucide-react'
import { nanoid } from 'nanoid'
import type { Message as ChatMessage } from '@/types/core'

const models = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' },
]

interface AdminChatPanelProps {
  className?: string
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AdminChatPanel({ className, isOpen: controlledIsOpen, onOpenChange }: AdminChatPanelProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  
  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen
  const setIsOpen = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open)
    } else {
      setInternalIsOpen(open)
    }
  }
  const [selectedModel, setSelectedModel] = useState(models[0].id)

  // Session ID state for history switching
  const [sessionId, setSessionId] = useState(() => {
    if (typeof window === 'undefined') return 'admin-default'
    const stored = localStorage.getItem('admin-session-id')
    if (stored) return stored
    const newId = `admin-${nanoid()}`
    localStorage.setItem('admin-session-id', newId)
    return newId
  })

  const { messages, isLoading, isStreaming, sendMessage, clearMessages, isLoadingHistory } = useAdminChat({
    sessionId
  })

  // Transcript state
  const [userPartialTranscript, setUserPartialTranscript] = useState('')
  const [userFinalTranscript, setUserFinalTranscript] = useState('')
  const [aiPartialTranscript, setAiPartialTranscript] = useState('')
  const [aiFinalTranscript, setAiFinalTranscript] = useState('')

  // Multimodal hooks
  const liveApi = useLiveApi({
    sessionId,
    onPartialTranscript: (text) => setUserPartialTranscript(text),
    onFinalTranscript: (text) => {
      setUserFinalTranscript(text)
      void sendMessage(text)
    },
    onOutputTranscript: (text, isFinal) => {
      if (isFinal) {
        setAiFinalTranscript(text)
        // Don't send AI responses back as messages - they're already in the chat
      } else {
        setAiPartialTranscript(text)
      }
    }
  })
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Voice state
  const [isVoiceLoading, setIsVoiceLoading] = useState(false)

  // Webcam hook and state
  const webcam = useCamera({
    sessionId,
    sendRealtimeInput: liveApi.sendRealtimeInput,
    sendContextUpdate: liveApi.sendContextUpdate,
    enableAutoCapture: liveApi.isSessionActive,
    captureInterval: 3000,
    onCapture: async (blob, _imageData) => {
      try {
        setIsWebcamLoading(true)
        // Send webcam analysis with admin header
        const formData = new FormData()
        formData.append('webcamCapture', blob, `webcam-${Date.now()}.jpg`)
        const response = await fetch('/api/tools/webcam', {
          method: 'POST',
          headers: {
            'x-intelligence-session-id': sessionId,
            'x-admin-query': 'true', // Admin mode flag
          },
          body: formData,
        })
        if (!response.ok) {
          toast.error('Webcam analysis failed')
          return
        }
        const data = await response.json().catch(() => ({}))
        const analysis = data?.analysis || data?.output?.analysis
        if (analysis) {
          // Add analysis to chat context or send as message
          await sendMessage(`[Webcam Analysis] ${analysis}`)
        } else {
          toast.error('No analysis received')
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Webcam error')
      } finally {
        setIsWebcamLoading(false)
      }
    },
  })
  const [isWebcamLoading, setIsWebcamLoading] = useState(false)

  // Screenshare hook and state
  const screenShare = useScreenShare({
    sessionId,
    sendRealtimeInput: liveApi.sendRealtimeInput,
    sendContextUpdate: liveApi.sendContextUpdate,
    enableAutoCapture: liveApi.isSessionActive,
    captureInterval: 3000,
    onCapture: async (_blob, imageData) => {
      try {
        setIsScreenShareLoading(true)
        // Send screen analysis with admin header
        const body = {
          image: imageData || '',
          type: 'screen',
          context: {
            prompt: 'Analyze this screen in admin context',
            trigger: 'manual',
          },
        }
        const response = await fetch('/api/tools/screen', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-intelligence-session-id': sessionId,
            'x-admin-query': 'true', // Admin mode flag
          },
          body: JSON.stringify(body),
        })
        if (!response.ok) {
          toast.error('Screen analysis failed')
          return
        }
        const data = await response.json().catch(() => ({}))
        const analysis = data?.output?.analysis || data?.analysis
        if (analysis) {
          // Add analysis to chat context or send as message
          await sendMessage(`[Screen Analysis] ${analysis}`)
        } else {
          toast.error('No analysis received')
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Screen share error')
      } finally {
        setIsScreenShareLoading(false)
      }
    },
  })
  const [isScreenShareLoading, setIsScreenShareLoading] = useState(false)

  const handleSubmit = useCallback(async (message: { text?: string; files?: unknown[] }, event: React.FormEvent) => {
    event.preventDefault()
    const text = message.text?.trim() || ''
    if (!text || isLoading || isStreaming) return
    await sendMessage(text)
    // Clear form after submit
    if (event.currentTarget instanceof HTMLFormElement) {
      event.currentTarget.reset()
    }
  }, [isLoading, isStreaming, sendMessage])

  const handleReset = useCallback(() => {
    clearMessages()
    // Reset form if drawer is open
    const form = document.querySelector('form[class*="PromptInput"]') as HTMLFormElement
    if (form) {
      form.reset()
    }
  }, [clearMessages])

  const handleSessionChange = useCallback((newSessionId: string) => {
    localStorage.setItem('admin-session-id', newSessionId)
    setSessionId(newSessionId)
    // Reload messages by updating sessionId
  }, [])

  const chatStatus = isStreaming ? 'streaming' : isLoading ? 'submitted' : undefined

  // File upload handler
  const handleFileUpload = useCallback(() => {
    if (!fileInputRef.current) return
    fileInputRef.current.value = ''
    fileInputRef.current.click()
  }, [])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = e.target.files ? Array.from(e.target.files) : []
      if (!files.length || !sessionId) return
      const res = await liveApi.uploadAttachments(files, sessionId)
      if (!res.ok) {
        toast.error(res.error || 'Upload failed')
        return
      }
      const count = res.attachments?.length || files.length
      toast.success(`Uploaded ${count} file${count === 1 ? '' : 's'}`)
      if (res.prompt) {
        // Send server-provided prompt (e.g., extracted from docs)
        await sendMessage(res.prompt)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload error')
    }
  }, [liveApi, sessionId, sendMessage])

  // Voice toggle
  const handleVoiceToggle = useCallback(async () => {
    try {
      setIsVoiceLoading(true)
      if (liveApi.isSessionActive) {
        await liveApi.stopSession()
        // Clear transcripts when session ends
        setUserPartialTranscript('')
        setUserFinalTranscript('')
        setAiPartialTranscript('')
        setAiFinalTranscript('')
      } else {
        await liveApi.startSession()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Voice session error')
    } finally {
      setIsVoiceLoading(false)
    }
  }, [liveApi])

  // Webcam toggle
  const handleWebcamToggle = useCallback(async () => {
    try {
      setIsWebcamLoading(true)
      await webcam.toggleCamera()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Webcam error')
    } finally {
      setIsWebcamLoading(false)
    }
  }, [webcam])

  // Webcam manual capture
  const handleWebcamCapture = useCallback(async () => {
    try {
      setIsWebcamLoading(true)
      await webcam.captureFrame()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Webcam capture error')
    } finally {
      setIsWebcamLoading(false)
    }
  }, [webcam])

  // Screenshare toggle
  const handleScreenShareToggle = useCallback(async () => {
    try {
      setIsScreenShareLoading(true)
      await screenShare.toggleScreenShare()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Screen share error')
    } finally {
      setIsScreenShareLoading(false)
    }
  }, [screenShare])

  // Screenshare manual capture
  const handleScreenShareCapture = useCallback(async () => {
    try {
      setIsScreenShareLoading(true)
      await screenShare.captureFrame()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Screen share capture error')
    } finally {
      setIsScreenShareLoading(false)
    }
  }, [screenShare])

  return (
    <div className={className}>
      {/* Floating button - only show when drawer is closed */}
      {!isOpen && (
        <Button
          variant="default"
          size="lg"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-30"
          aria-label="Open admin chat"
        >
          <MessageSquare className="size-6" />
          {messages.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground text-primary text-xs font-bold">
              {messages.length}
            </span>
          )}
        </Button>
      )}

      {/* Bottom drawer - ChatGPT-style interface */}
      {isOpen && (
        <>
          {/* Backdrop - must be before drawer for proper layering */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          {/* Drawer */}
          <div
            className={cn(
              "fixed bottom-0 left-0 right-0 top-0 z-50 bg-card shadow-lg transition-transform duration-300 ease-in-out",
              "flex h-screen"
            )}
          >
            {/* History Sidebar */}
            <AdminChatHistory
              currentSessionId={sessionId}
              onSessionSelect={handleSessionChange}
            />

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col w-full min-w-0 overflow-hidden">
              {/* Header - matching shadcn.ai pattern */}
              <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-green-500" />
                    <span className="font-medium text-sm">Admin AI Assistant</span>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <span className="text-muted-foreground text-xs">
                    {models.find(m => m.id === selectedModel)?.name}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-8 px-2"
                >
                  <RotateCcwIcon className="size-4" />
                  <span className="ml-1">Reset</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8"
                  aria-label="Close chat"
                >
                  <X className="size-4" />
                </Button>
              </div>

              {/* Conversation Area - using shadcn.ai pattern */}
              <Conversation className="flex-1 w-full min-w-0 overflow-hidden">
                <ConversationContent className="w-full max-w-full min-w-0">
                  {isLoadingHistory && messages.length === 0 ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Loading chat history...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <ConversationEmptyState
                      title="Admin Chat Assistant"
                      description="Ask about system stats, visitor data, API endpoints, or anything else"
                      icon={<MessageSquare className="size-12 text-muted-foreground" />}
                      className="w-full max-w-full min-w-0"
                    />
                  ) : (
                    <div className="space-y-4 w-full max-w-full min-w-0">
                      {messages.map((message: ChatMessage) => {
                        const metadata = message.metadata || {}
                        const isLastMessage = message.id === messages[messages.length - 1]?.id
                        const isStreamingMessage = isStreaming && isLastMessage

                        return (
                          <Message key={message.id} from={message.role}>
                            <MessageAvatar 
                              src={message.role === 'assistant' ? '/api/avatar/ai' : '/api/avatar/user'}
                              name={message.role === 'assistant' ? 'F.B/c AI' : 'You'}
                            />
                            <MessageContent>
                              {message.role === 'assistant' ? (
                                <>
                                  <Response>{message.content}</Response>
                                  
                                  {/* Inline Citations */}
                                  {Array.isArray(metadata.inlineCitations) && metadata.inlineCitations.length > 0 && (
                                    <InlineCitation className="mt-1">
                                      <InlineCitationText>See citations</InlineCitationText>
                                      <InlineCitationCard>
                                        <InlineCitationCardTrigger
                                          sources={metadata.inlineCitations.map((c: { url?: string }) => c.url).filter(Boolean) as string[]}
                                        />
                                        <InlineCitationCardBody>
                                          <InlineCitationCarousel>
                                            <InlineCitationCarouselHeader>
                                              <InlineCitationCarouselPrev />
                                              <InlineCitationCarouselIndex />
                                              <InlineCitationCarouselNext />
                                            </InlineCitationCarouselHeader>
                                            <InlineCitationCarouselContent>
                                              {metadata.inlineCitations.map((c: { title?: string; url?: string; text?: string }, idx: number) => (
                                                <InlineCitationCarouselItem key={idx}>
                                                  <Response className="text-[12px] font-medium">{c.title || c.url}</Response>
                                                  {c.url && (
                                                    <a className="text-[11px] text-primary underline" href={c.url} target="_blank" rel="noreferrer">
                                                      {c.url}
                                                    </a>
                                                  )}
                                                  {c.text && <Response className="text-[11px] text-muted-foreground mt-1">{c.text}</Response>}
                                                </InlineCitationCarouselItem>
                                              ))}
                                            </InlineCitationCarouselContent>
                                          </InlineCitationCarousel>
                                        </InlineCitationCardBody>
                                      </InlineCitationCard>
                                    </InlineCitation>
                                  )}

                                  {/* Reasoning */}
                                  {metadata.reasoning && (
                                    <Reasoning isStreaming={isStreamingMessage}>
                                      <ReasoningTrigger />
                                      <ReasoningContent>
                                        {typeof metadata.reasoning === 'string' ? metadata.reasoning : 'AI reasoning process'}
                                      </ReasoningContent>
                                    </Reasoning>
                                  )}

                                  {/* Sources */}
                                  {Array.isArray(metadata.sources) && metadata.sources.length > 0 && (
                                    <Sources>
                                      <SourcesTrigger count={metadata.sources.length} />
                                      <SourcesContent>
                                        {metadata.sources.map((source: { title?: string; url?: string; id?: string }, idx: number) => (
                                          <Source key={source.id || idx} href={source.url || '#'} title={source.title || 'Source'}>
                                            {source.title || source.url}
                                          </Source>
                                        ))}
                                      </SourcesContent>
                                    </Sources>
                                  )}

                                  {/* Code Blocks */}
                                  {Array.isArray(metadata.codeBlocks) && metadata.codeBlocks.map((block: { id: string; code: string; language: string; showLineNumbers?: boolean }) => (
                                    <CodeBlock
                                      key={block.id}
                                      code={block.code}
                                      language={block.language}
                                      showLineNumbers={block.showLineNumbers}
                                    />
                                  ))}

                                  {/* Tools */}
                                  {Array.isArray(metadata.tools) && metadata.tools.map((tool: { name: string; type: string; state: string; output?: unknown }) => {
                                    const outputText = tool.output 
                                      ? (typeof tool.output === 'string' ? tool.output : JSON.stringify(tool.output, null, 2))
                                      : null
                                    
                                    return (
                                      <Tool key={tool.name}>
                                        <ToolHeader 
                                          type={tool.type as any} 
                                          state={tool.state as any}
                                        />
                                        {outputText && (
                                          <ToolContent>
                                            <div>{outputText}</div>
                                          </ToolContent>
                                        )}
                                      </Tool>
                                    )
                                  })}

                                  {/* Tasks */}
                                  {Array.isArray(metadata.tasks) && metadata.tasks.map((task: { title: string; description?: string; files?: Array<{ name: string }> }, idx: number) => (
                                    <Task key={idx}>
                                      <TaskTrigger title={task.title} />
                                      <TaskContent>
                                        {task.description && <TaskItem>{task.description}</TaskItem>}
                                        {Array.isArray(task.files) && task.files.length > 0 && (
                                          <div className="flex flex-wrap gap-1">
                                            {task.files.map((f, i: number) => (
                                              <TaskItemFile key={i}>{f.name}</TaskItemFile>
                                            ))}
                                          </div>
                                        )}
                                      </TaskContent>
                                    </Task>
                                  ))}

                                  {/* Web Preview */}
                                  {metadata.webPreview?.url && (
                                    <WebPreview defaultUrl={metadata.webPreview.url}>
                                      <div className="p-2 text-[12px]">
                                        <Response className="font-medium">{metadata.webPreview.title}</Response>
                                        {metadata.webPreview.description && (
                                          <Response className="text-muted-foreground">{metadata.webPreview.description}</Response>
                                        )}
                                        <a className="text-primary underline" href={metadata.webPreview.url} target="_blank" rel="noreferrer">
                                          {metadata.webPreview.url}
                                        </a>
                                      </div>
                                    </WebPreview>
                                  )}

                                  {/* Images */}
                                  {Array.isArray(metadata.images) && metadata.images.length > 0 && (
                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                      {metadata.images.map((img: { base64?: string; mediaType?: string; alt?: string }, idx: number) => (
                                        img.base64 ? (
                                          <img
                                            key={idx}
                                            src={`data:${img.mediaType || 'image/png'};base64,${img.base64}`}
                                            alt={img.alt || 'Generated image'}
                                            className="rounded-md border"
                                          />
                                        ) : null
                                      ))}
                                    </div>
                                  )}

                                  {/* Actions */}
                                  {Array.isArray(metadata.actions) && metadata.actions.length > 0 && (
                                    <Actions className="mt-2">
                                      {metadata.actions.map((action: { label?: string; tooltip?: string }, idx: number) => (
                                        <Action key={idx} title={action.tooltip} aria-label={action.label}>
                                          {action.label}
                                        </Action>
                                      ))}
                                    </Actions>
                                  )}
                                </>
                              ) : (
                                <Response>{message.content}</Response>
                              )}
                            </MessageContent>
                          </Message>
                        )
                      })}
                    </div>
                  )}
                </ConversationContent>
                <ConversationScrollButton />
              </Conversation>

            {/* Input Area - using PromptInput from shadcn.ai */}
            <div className="border-t bg-background p-4 space-y-3 w-full max-w-full min-w-0 overflow-hidden">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              
              {/* Voice UI - only shown when voice is active */}
              {liveApi.isSessionActive && (
                <div className="space-y-2 w-full max-w-full min-w-0">
                  {/* Waveform */}
                  <div className="w-full max-w-full h-16 overflow-hidden min-w-0">
                    <LiveWaveform
                      active={liveApi.isRecording}
                      processing={liveApi.isProcessing || (liveApi.isSessionActive && !liveApi.isRecording)}
                      stream={liveApi.micStream ?? undefined}
                      mode="static"
                      barWidth={3}
                      barGap={1}
                      barRadius={1.5}
                      height={64}
                      fadeEdges={true}
                      sensitivity={1.2}
                      barColor={liveApi.isRecording ? 'hsl(var(--primary))' : 'hsl(var(--accent))'}
                      className="rounded-lg border bg-card w-full max-w-full"
                    />
                  </div>
                  
                  {/* Live Transcripts */}
                  <div className="w-full max-w-full min-w-0">
                    <AdminVoiceTranscript
                      userTranscript={userFinalTranscript}
                      userPartialTranscript={userPartialTranscript}
                      aiTranscript={aiFinalTranscript}
                      aiPartialTranscript={aiPartialTranscript}
                      isUserSpeaking={liveApi.isRecording}
                      isAiSpeaking={liveApi.isProcessing}
                    />
                  </div>
                </div>
              )}

              {/* Webcam Preview - only shown when webcam is active */}
              {webcam.isActive && (
                <AdminWebcamPreview
                  camera={webcam}
                  isActive={webcam.isActive}
                  className="w-full"
                />
              )}

              {/* Screen Share Preview - only shown when screen share is active */}
              {screenShare.isActive && (
                <AdminScreenSharePreview
                  screenShare={screenShare}
                  isActive={screenShare.isActive}
                  className="w-full"
                />
              )}
              
              <div className="w-full max-w-full min-w-0 overflow-hidden">
                <PromptInput onSubmit={handleSubmit} className="w-full max-w-full">
                <PromptInputTextarea
                  placeholder="Ask about stats, visitors, endpoints, or anything else..."
                />
                <PromptInputToolbar>
                  <PromptInputTools>
                    <AdminChatActions
                      onFileUpload={handleFileUpload}
                      isVoiceActive={liveApi.isSessionActive}
                      onVoiceToggle={handleVoiceToggle}
                      isVoiceLoading={isVoiceLoading}
                      isWebcamActive={webcam.isActive}
                      onWebcamToggle={handleWebcamToggle}
                      isWebcamLoading={isWebcamLoading}
                      onWebcamCapture={handleWebcamCapture}
                      isScreenShareActive={screenShare.isActive}
                      onScreenShareToggle={handleScreenShareToggle}
                      isScreenShareLoading={isScreenShareLoading}
                      onScreenShareCapture={handleScreenShareCapture}
                    />
                    <PromptInputModelSelect value={selectedModel} onValueChange={setSelectedModel}>
                      <PromptInputModelSelectTrigger>
                        <PromptInputModelSelectValue />
                      </PromptInputModelSelectTrigger>
                      <PromptInputModelSelectContent>
                        {models.map((model) => (
                          <PromptInputModelSelectItem key={model.id} value={model.id}>
                            {model.name}
                          </PromptInputModelSelectItem>
                        ))}
                      </PromptInputModelSelectContent>
                    </PromptInputModelSelect>
                  </PromptInputTools>
                  <PromptInputSubmit status={chatStatus} disabled={isLoading || isStreaming} />
                </PromptInputToolbar>
              </PromptInput>
              </div>
            </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
