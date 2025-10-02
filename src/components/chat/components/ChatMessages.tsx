import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader } from "@/components/ai-elements/loader";
import { ChatMessage } from "../types/chatTypes";
import { EnhancedChatMessage } from "@/types/chat-enhanced";
import { cn } from "@/lib/utils";
import { MessageCircle, ExternalLink, Sparkles, Code2, ListTree, AlertTriangle } from "lucide-react";
import {
  Artifact as ArtifactCard,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactDescription,
  ArtifactContent
} from "@/components/ai-elements/artifact";
// Additional AI elements for enhanced functionality
import {
  Actions,
  Action
} from "@/components/ai-elements/actions";
import {
  Message,
  MessageContent,
  MessageAvatar
} from "@/components/ai-elements/message";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent
} from "@/components/ai-elements/reasoning";
import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source
} from "@/components/ai-elements/sources";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput
} from "@/components/ai-elements/tool";
import {
  CodeBlock,
  CodeBlockCopyButton
} from "@/components/ai-elements/code-block";
import {
  Context,
  ContextTrigger,
  ContextContent,
  ContextContentHeader,
  ContextContentBody,
  ContextContentFooter
} from "@/components/ai-elements/context";
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
  ChainOfThoughtContent
} from "@/components/ai-elements/chain-of-thought";
import {
  Image
} from "@/components/ai-elements/image";
import {
  InlineCitation
} from "@/components/ai-elements/inline-citation";
import {
  Task,
  TaskItem,
  TaskItemFile
} from "@/components/ai-elements/task";
import {
  WebPreview,
  WebPreviewBody,
  WebPreviewUrl
} from "@/components/ai-elements/web-preview";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton
} from "@/components/ai-elements/conversation";
import type { ResearchSummary } from "../hooks/useChatMessages";
import { CHAT_CONSTANTS } from "../constants/chatConstants";
import { ChatSuggestions } from "./ChatSuggestions";
import { ChatTermsAcceptance } from "./ChatTermsAcceptance";

type StreamedArtifact = {
  id: string;
  type: string;
  status?: string;
  payload?: Record<string, any> | null;
  createdAt?: number;
  updatedAt?: number;
  version?: number;
  progress?: number;
  error?: string;
};

const MESSAGE_PRESENTATION = {
  user: {
    label: "You",
    icon: MessageCircle,
  },
  assistant: {
    label: "Assistant",
    icon: Sparkles,
  },
} as const satisfies Record<EnhancedChatMessage["role"], {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}>;

interface ChatMessagesProps {
  messages: ChatMessage[];
  enhancedMessages: EnhancedChatMessage[];
  researchSummaries: ResearchSummary[];
  isLoading: boolean;
  contextReady: boolean;
  currentContext: {
    company?: { name?: string };
    person?: { fullName?: string; role?: string };
  } | null;
  hasAcceptedTerms: boolean;
  onSendMessage: (message: string) => void;
  aiElements?: {
    showReasoning: boolean;
    showSources: boolean;
    showActions: boolean;
    showCodeBlocks: boolean;
    showArtifacts: boolean;
    showImages: boolean;
    showInlineCitations: boolean;
    showSuggestions: boolean;
    showTasks: boolean;
    showWebPreview: boolean;
    enableReactions: boolean;
    enableReadReceipts: boolean;
    enableTypingIndicators: boolean;
  };
  isExpanded?: boolean;
  isMinimized?: boolean;
  artifacts: StreamedArtifact[];
  // Terms acceptance props
  name?: string;
  email?: string;
  agreed?: boolean;
  onNameChange?: (name: string) => void;
  onEmailChange?: (email: string) => void;
  onAgreedChange?: (agreed: boolean) => void;
  onAcceptTerms?: () => void;
}

export function ChatMessages({
  messages,
  enhancedMessages,
  researchSummaries,
  isLoading,
  contextReady,
  currentContext,
  hasAcceptedTerms,
  onSendMessage,
  aiElements,
  isExpanded = false,
  isMinimized = false,
  artifacts,
  name,
  email,
  agreed,
  onNameChange,
  onEmailChange,
  onAgreedChange,
  onAcceptTerms,
}: ChatMessagesProps) {
  // Don't render messages in minimized state
  if (isMinimized) {
    return null;
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
      <Conversation className="h-full">
        <ConversationContent
          className={cn(
            "px-6 sm:px-8 py-6 space-y-6 min-h-full",
            isExpanded ? "mx-auto w-full max-w-3xl" : ""
          )}
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full space-y-6">
              <ConversationEmptyState
                title={`Welcome to F.B/c AI${contextReady && currentContext?.person?.fullName ? `, ${currentContext.person.fullName}` : ''}`}
                description={contextReady
                  ? `I'm here to help you navigate AI strategy and implementation. Based on your ${currentContext?.company?.name || 'organization'}, I can provide tailored guidance.`
                  : 'Gathering company intelligence tailored to you...'}
                icon={<MessageCircle className="h-6 w-6 text-muted-foreground" />}
              />

              {!hasAcceptedTerms ? (
                <ChatTermsAcceptance
                  name={name || ''}
                  email={email || ''}
                  agreed={agreed || false}
                  onNameChange={onNameChange || (() => {})}
                  onEmailChange={onEmailChange || (() => {})}
                  onAgreedChange={onAgreedChange || (() => {})}
                  onAcceptTerms={onAcceptTerms || (() => {})}
                />
              ) : (
                <ChatSuggestions
                  suggestions={CHAT_CONSTANTS.DEFAULT_SUGGESTIONS}
                  contextReady={contextReady}
                  currentContext={currentContext}
                  onSendMessage={onSendMessage}
                />
              )}
            </div>
          ) : (
            enhancedMessages.map((message) => {
              const meta = MESSAGE_PRESENTATION[message.role];
              const Icon = meta.icon;
              const isUserMessage = message.role === "user";
              
              // Use the user's name from terms acceptance for user messages
              const userLabel = isUserMessage && name ? name : meta.label;

              return (
                <Message
                  key={message.id}
                  from={message.role}
                  className={cn(
                    "font-mono",
                    isUserMessage ? "flex justify-end" : "flex justify-start"
                  )}
                >
                  <MessageContent
                    variant="flat"
                    className={cn(
                      "max-w-[80%] space-y-4 px-0 py-0 text-[13px] leading-relaxed rounded-none",
                      "group-[.is-assistant]:mx-0 group-[.is-assistant]:bg-transparent group-[.is-assistant]:border-0 group-[.is-assistant]:shadow-none group-[.is-assistant]:rounded-none",
                      "group-[.is-user]:ml-auto group-[.is-user]:bg-transparent group-[.is-user]:border-0 group-[.is-user]:shadow-none group-[.is-user]:rounded-none"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center gap-2 text-[11px] uppercase tracking-[0.35em] text-muted-foreground/60",
                        isUserMessage && "justify-end"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 text-muted-foreground/70" />
                      <span>{userLabel}</span>
                    </div>

                    <div
                      className={cn(
                        "whitespace-pre-wrap text-[13px] leading-relaxed",
                        isUserMessage
                          ? "text-[hsl(var(--foreground))]"
                          : "text-[hsl(var(--muted-foreground))]"
                      )}
                    >
                      {message.content}
                    </div>

                    <div className="space-y-3">
                      {/* Reasoning Display */}
                      {aiElements?.showReasoning && message.metadata?.reasoning && (
                        <Reasoning isStreaming={isLoading} defaultOpen={false}>
                          <ReasoningTrigger />
                          <ReasoningContent>{message.metadata.reasoning}</ReasoningContent>
                        </Reasoning>
                      )}

                      {/* Chain of Thought Display */}
                      {message.metadata?.chainOfThought && (
                        <ChainOfThought defaultOpen={false}>
                          <ChainOfThoughtHeader>AI Thinking Process</ChainOfThoughtHeader>
                          <ChainOfThoughtContent>
                            {message.metadata.chainOfThought.steps?.map((step, index) => (
                              <ChainOfThoughtStep
                                key={index}
                                label={step.label}
                                description={step.description}
                                status={step.status}
                                icon={step.icon}
                              >
                                {step.content}
                              </ChainOfThoughtStep>
                            ))}
                          </ChainOfThoughtContent>
                        </ChainOfThought>
                      )}

                      {/* Sources Display */}
                      {aiElements?.showSources && message.metadata?.sources && message.metadata.sources.length > 0 && (
                        <Sources>
                          <SourcesTrigger count={message.metadata.sources.length} />
                          <SourcesContent>
                            {message.metadata.sources.map((source, index) => (
                              <Source key={index} href={source.url} title={source.title}>
                                {source.title}
                              </Source>
                            ))}
                          </SourcesContent>
                        </Sources>
                      )}

                      {/* Tool Usage Display */}
                      {aiElements?.showActions && message.metadata?.tools && message.metadata.tools.length > 0 && (
                        <div className="space-y-2">
                          {message.metadata.tools.map((tool, index) => (
                            <Tool key={index} defaultOpen={false}>
                              <ToolHeader title={tool.name} type={tool.type} state={tool.state} />
                              <ToolContent>
                                {tool.input && <ToolInput input={tool.input} />}
                                {tool.output && <ToolOutput output={tool.output} errorText={tool.error} />}
                              </ToolContent>
                            </Tool>
                          ))}
                        </div>
                      )}

                      {/* Code Blocks */}
                      {aiElements?.showCodeBlocks && message.metadata?.codeBlocks && message.metadata.codeBlocks.length > 0 && (
                        <div className="space-y-2">
                          {message.metadata.codeBlocks.map((codeBlock, index) => (
                            <CodeBlock
                              key={index}
                              code={codeBlock.code}
                              language={codeBlock.language}
                              showLineNumbers={codeBlock.showLineNumbers}
                            >
                              <CodeBlockCopyButton />
                            </CodeBlock>
                          ))}
                        </div>
                      )}

                      {/* Context Usage Display */}
                      {message.metadata?.contextUsage && (
                        <Context
                          usedTokens={message.metadata.contextUsage.usedTokens}
                          maxTokens={message.metadata.contextUsage.maxTokens}
                          usage={message.metadata.contextUsage.usage}
                          modelId={message.metadata.contextUsage.modelId}
                        >
                          <ContextTrigger />
                          <ContextContent>
                            <ContextContentHeader />
                            <ContextContentBody>
                              <div className="space-y-2">
                                <div className="text-xs text-muted-foreground">
                                  Context: {message.metadata.contextUsage.usedTokens} / {message.metadata.contextUsage.maxTokens} tokens
                                </div>
                              </div>
                            </ContextContentBody>
                            <ContextContentFooter />
                          </ContextContent>
                        </Context>
                      )}

                      {/* Images Display */}
                      {aiElements?.showImages && message.metadata?.images && message.metadata.images.length > 0 && (
                        <div className="space-y-2">
                          {message.metadata.images.map((image, index) => (
                            <Image
                              key={index}
                              base64={image.base64}
                              mediaType={image.mediaType}
                              alt={image.alt || `Generated image ${index + 1}`}
                              className="rounded-lg border"
                            />
                          ))}
                        </div>
                      )}

                      {/* Inline Citations */}
                      {aiElements?.showInlineCitations && message.metadata?.inlineCitations && message.metadata.inlineCitations.length > 0 && (
                        <div className="space-y-1">
                          {message.metadata.inlineCitations.map((citation, index) => (
                            <InlineCitation key={index} href={citation.url} title={citation.title}>
                              {citation.text}
                            </InlineCitation>
                          ))}
                        </div>
                      )}

                      {/* Tasks Display */}
                      {aiElements?.showTasks && message.metadata?.tasks && message.metadata.tasks.length > 0 && (
                        <Task defaultOpen={false}>
                          <div className="space-y-2">
                            {message.metadata.tasks.map((task, index) => (
                              <TaskItem key={index} status={task.status}>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{task.title}</span>
                                  {task.files && task.files.length > 0 && (
                                    <div className="flex gap-1">
                                      {task.files.map((file, fileIndex) => (
                                        <TaskItemFile key={fileIndex}>{file.name}</TaskItemFile>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                {task.description && (
                                  <p className="text-sm text-muted-foreground">{task.description}</p>
                                )}
                              </TaskItem>
                            ))}
                          </div>
                        </Task>
                      )}

                      {/* Web Preview */}
                      {aiElements?.showWebPreview && message.metadata?.webPreview && (
                        <WebPreview>
                          <WebPreviewUrl value={message.metadata.webPreview.url} readOnly />
                          <WebPreviewBody
                            src={message.metadata.webPreview.url}
                            title={message.metadata.webPreview.title}
                          />
                        </WebPreview>
                      )}

                      {/* Message Actions */}
                      {aiElements?.showActions && (
                        <Actions>
                          <Action tooltip="Copy message">Copy</Action>
                          <Action tooltip="Regenerate response">Regenerate</Action>
                        </Actions>
                      )}
                    </div>
                  </MessageContent>
                </Message>
              );
            })
          )}

          {aiElements?.showArtifacts && artifacts.length > 0 && (
            <section className={cn("space-y-5", isExpanded ? "mx-auto w-full max-w-3xl" : "")}
            >
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.35em] text-muted-foreground/75">
                <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--accent))]" />
                <h3>AI Generated Insights</h3>
              </div>

              <div className="grid gap-4">
                {artifacts.map((artifact) => (
                  <ArtifactCardView key={`${artifact.id}-${artifact.version ?? '1'}`} artifact={artifact} />
                ))}
              </div>
            </section>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-6 space-y-3">
              <div className="flex items-center gap-2 rounded-full border border-border/40 bg-card/80 px-4 py-2 text-xs text-muted-foreground shadow-[0_12px_32px_-24px_rgba(12,18,26,0.35)]">
                <div className="flex items-center gap-1">
                  <div className="h-1 w-1 rounded-full bg-[hsl(var(--accent))] animate-pulse"></div>
                  <div className="h-1.5 w-1 rounded-full bg-[hsl(var(--accent))] animate-pulse" style={{animationDelay: '0.2s'}}></div>
                  <div className="h-1 w-1 rounded-full bg-[hsl(var(--accent))] animate-pulse" style={{animationDelay: '0.4s'}}></div>
                </div>
                <span className="tracking-[0.3em] uppercase">AI Thinking</span>
              </div>
              <Loader />
            </div>
          )}

          <div id="messages-end" />
        </ConversationContent>
        <ConversationScrollButton className="shadow-md" />
      </Conversation>
    </div>
  );
}

interface ArtifactCardViewProps {
  artifact: StreamedArtifact;
}

const statusTone: Record<string, string> = {
  complete: 'bg-emerald-500/10 text-emerald-500',
  streaming: 'bg-sky-500/10 text-sky-500',
  loading: 'bg-amber-500/10 text-amber-500',
  error: 'bg-red-500/10 text-red-500'
};

function ArtifactCardView({ artifact }: ArtifactCardViewProps) {
  const { type, status = 'complete', payload, createdAt, error } = artifact;

  const createdLabel = createdAt
    ? new Date(createdAt).toLocaleString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        month: 'short',
        day: 'numeric'
      })
    : null;

  const tone = statusTone[status] ?? 'bg-muted text-muted-foreground';

  const renderContent = () => {
    if (!payload) {
      return <p className="text-sm text-muted-foreground">No data available.</p>;
    }

    if (typeof payload === 'string') {
      return <p className="text-sm whitespace-pre-wrap text-muted-foreground">{payload}</p>;
    }

    if (type.includes('research') || 'combinedAnswer' in payload || 'urlsUsed' in payload) {
      return <ResearchArtifactContent payload={payload as Record<string, any>} />;
    }

    if (type.includes('code') || payload.code || payload.snippet) {
      return <CodeArtifactContent payload={payload as Record<string, any>} />;
    }

    if (type.includes('tool') || payload.toolCallId || payload.actions) {
      return <ToolArtifactContent payload={payload as Record<string, any>} />;
    }

    return <GenericArtifactContent payload={payload as Record<string, any>} />;
  };

  return (
    <ArtifactCard className="rounded-[24px] border border-border/40 bg-card/95 shadow-[0_36px_90px_-70px_rgba(12,18,26,0.55)]">
      <ArtifactHeader className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          {type.includes('code') ? (
            <Code2 className="h-4 w-4 text-primary" />
          ) : type.includes('research') ? (
            <Sparkles className="h-4 w-4 text-primary" />
          ) : type.includes('tool') ? (
            <ListTree className="h-4 w-4 text-primary" />
          ) : (
            <MessageCircle className="h-4 w-4 text-primary" />
          )}
          <ArtifactTitle className="capitalize">
            {type.replace(/-/g, ' ')}
          </ArtifactTitle>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {createdLabel && (
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {createdLabel}
            </span>
          )}
          <Badge className={`text-[11px] ${tone}`}>{status}</Badge>
        </div>
      </ArtifactHeader>
      <ArtifactContent className="space-y-3">
        {error && (
          <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-500">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
        {renderContent()}
      </ArtifactContent>
    </ArtifactCard>
  );
}

interface ArtifactContentProps {
  payload: Record<string, any>;
}

function ResearchArtifactContent({ payload }: ArtifactContentProps) {
  const {
    query,
    combinedAnswer,
    summary,
    urlsUsed,
    citationCount,
    searchGroundingUsed,
    urlContextUsed
  } = payload;

  const answer = combinedAnswer ?? summary;
  return (
    <div className="space-y-3">
      {query && (
        <ArtifactDescription className="text-xs uppercase tracking-wide text-muted-foreground/80">
          Query: <span className="font-medium normal-case text-foreground">{query}</span>
        </ArtifactDescription>
      )}
      {answer && (
        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
          {answer}
        </p>
      )}
      {(citationCount || searchGroundingUsed || urlContextUsed) && (
        <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground uppercase tracking-wide">
          {typeof citationCount === 'number' && (
            <Badge variant="outline" className="border-border/40 bg-background/60">
              Citations: {citationCount}
            </Badge>
          )}
          {typeof searchGroundingUsed === 'number' && (
            <Badge variant="outline" className="border-border/40 bg-background/60">
              Search Grounding: {searchGroundingUsed}
            </Badge>
          )}
          {typeof urlContextUsed === 'number' && (
            <Badge variant="outline" className="border-border/40 bg-background/60">
              URL Context: {urlContextUsed}
            </Badge>
          )}
        </div>
      )}
      {Array.isArray(urlsUsed) && urlsUsed.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/80">
            Sources
          </p>
          <ul className="space-y-1 text-sm">
            {urlsUsed.map((url: string, index: number) => (
              <li key={`${url}-${index}`} className="flex items-start gap-2">
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 text-muted-foreground/60" />
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary-foreground hover:underline"
                >
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CodeArtifactContent({ payload }: ArtifactContentProps) {
  const code = payload.code ?? payload.snippet ?? '';
  const language = payload.language ?? payload.runtime ?? 'code';
  const description = payload.description ?? payload.summary;
  return (
    <div className="space-y-2">
      <Badge variant="outline" className="border-border/40 bg-background/60 font-mono text-[11px]">
        {language.toUpperCase()}
      </Badge>
      {description && (
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      <pre className="max-h-64 overflow-auto rounded-md border border-border/40 bg-muted/40 p-3 text-xs font-mono leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function ToolArtifactContent({ payload }: ArtifactContentProps) {
  const { toolCallId, name, result, actions } = payload;
  return (
    <div className="space-y-2 text-sm text-muted-foreground">
      <div className="flex flex-wrap gap-2">
        {toolCallId && (
          <Badge variant="outline" className="border-border/40 bg-background/60 text-[11px] uppercase tracking-wide">
            Call ID: {toolCallId}
          </Badge>
        )}
        {name && (
          <Badge variant="outline" className="border-border/40 bg-background/60 text-[11px] uppercase tracking-wide">
            Tool: {name}
          </Badge>
        )}
      </div>
      {result && (
        <GenericArtifactContent payload={{ result }} />
      )}
      {Array.isArray(actions) && actions.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground/70">Actions</p>
          <ul className="space-y-1">
            {actions.map((action: Record<string, any>, index: number) => (
              <li key={`${action.id ?? index}`} className="rounded-md border border-border/40 bg-muted/20 px-3 py-2 text-xs">
                {action.label || action.type || 'Action'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function GenericArtifactContent({ payload }: ArtifactContentProps) {
  const jsonPreview = useMemo(() => JSON.stringify(payload, null, 2), [payload]);
  return (
    <pre className="max-h-64 overflow-auto rounded-md border border-border/30 bg-muted/40 p-3 text-xs text-muted-foreground">
      {jsonPreview}
    </pre>
  );
}
