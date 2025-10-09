import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ai-elements/core/loader";
import { ChatMessage } from "../types/chatTypes";
import { EnhancedChatMessage } from "@/types/chat-enhanced";
import { cn } from "@/lib/utils";
import { MessageCircle, ExternalLink, Sparkles, Code2, ListTree, AlertTriangle, Copy, RotateCw, Search } from "lucide-react";
import {
  Artifact as ArtifactCard,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactDescription,
  ArtifactContent
} from "@/components/ai-elements/content/artifact";
// Additional AI elements for enhanced functionality
import {
  Actions,
  Action
} from "@/components/ai-elements/interactive/actions";
import {
  Message,
  MessageContent,
  MessageAvatar
} from "@/components/ai-elements/core/message";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent
} from "@/components/ai-elements/reasoning/reasoning";
import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source
} from "@/components/ai-elements/sources/sources";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput
} from "@/components/ai-elements/tools/tool";
import {
  CodeBlock,
  CodeBlockCopyButton
} from "@/components/ai-elements/content/code-block";
import {
  Context,
  ContextTrigger,
  ContextContent,
  ContextContentHeader,
  ContextContentBody,
  ContextContentFooter
} from "@/components/ai-elements/sources/context";
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
  ChainOfThoughtContent
} from "@/components/ai-elements/reasoning/chain-of-thought";
import {
  Image
} from "@/components/ai-elements/content/image";
import {
  InlineCitation
} from "@/components/ai-elements/sources/inline-citation";
import {
  Task,
  TaskItem,
  TaskItemFile
} from "@/components/ai-elements/reasoning/task";
import {
  WebPreview,
  WebPreviewBody,
  WebPreviewUrl
} from "@/components/ai-elements/content/web-preview";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton
} from "@/components/ai-elements/core/conversation";
import {
  Response
} from "@/components/ai-elements/core/response";
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
  const followUpSuggestion = useMemo(() => {
    for (let index = enhancedMessages.length - 1; index >= 0; index--) {
      const message = enhancedMessages[index];
      if (message.role !== "assistant") continue;
      const followUp = message.metadata?.followUp;
      if (typeof followUp === "string" && followUp.trim().length > 0) {
        return followUp.trim();
      }
    }
    return null;
  }, [enhancedMessages]);
  // Don't render messages in minimized state
  if (isMinimized) {
    return null;
  }

  return (
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
              title={`Hey ${contextReady && currentContext?.person?.fullName ? currentContext.person.fullName : 'there'}, welcome in.`}
              description={contextReady
                ? `I'm F.B/c - Farzad's AI sidekick. Voice, screen share, uploads... use whatever helps and tell me what nudged you to reach out.`
                : 'Give me a second while I grab a bit of context, then we’ll dive in.'}
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
                suggestions={[...CHAT_CONSTANTS.DEFAULT_SUGGESTIONS]}
                contextReady={contextReady}
                currentContext={currentContext}
                onSendMessage={onSendMessage}
              />
            )}
          </div>
        ) : (
          <>
          {enhancedMessages.map((message) => {
            const meta = MESSAGE_PRESENTATION[message.role];
            const Icon = meta.icon;
            const isUserMessage = message.role === "user";

            // Use the user's name from terms acceptance for user messages
            const userLabel = isUserMessage && name ? name : meta.label;

            const rawResearchSummary = message.metadata?.researchSummary as unknown;
            const researchSummary = rawResearchSummary && typeof rawResearchSummary === 'object'
              ? (rawResearchSummary as Record<string, any>)
              : rawResearchSummary && typeof rawResearchSummary === 'string'
                ? { combinedAnswer: rawResearchSummary }
                : null;
            const researchError = typeof researchSummary?.error === 'string' ? researchSummary.error : null;
            const showResearchSummary = Boolean(
              researchSummary &&
              !researchError &&
              (
                (typeof researchSummary.combinedAnswer === 'string' && researchSummary.combinedAnswer.trim().length > 0) ||
                typeof researchSummary.citationCount === 'number' ||
                typeof researchSummary.searchGroundingUsed === 'number' ||
                typeof researchSummary.urlContextUsed === 'number'
              )
            );

            const researchBadges = [
              typeof researchSummary?.citationCount === 'number'
                ? `Citations: ${researchSummary.citationCount}`
                : null,
              typeof researchSummary?.searchGroundingUsed === 'number'
                ? `Search Grounding: ${researchSummary.searchGroundingUsed}`
                : null,
              typeof researchSummary?.urlContextUsed === 'number'
                ? `URL Context: ${researchSummary.urlContextUsed}`
                : null,
            ].filter(Boolean) as string[];

            return (
              <Message
                key={message.id}
                from={message.role}
              >
                {/* Avatar */}
                <MessageAvatar name={isUserMessage ? name || "You" : "AI"} />
                
                <MessageContent
                  variant="flat"
                  className={cn(
                    "space-y-2",
                    // Monochrome themes: terminal aesthetic
                    "[.monochrome_&]:rounded-none",
                    "[.monochrome_&]:border-l-2",
                    isUserMessage 
                      ? "[.monochrome_&]:border-[hsl(0,0%,85%)]"
                      : "[.monochrome_&]:border-[hsl(0,0%,15%)]",
                  )}
                >
                  {/* Terminal prompt - only in monochrome */}
                  <div className="hidden [.monochrome_&]:block text-[11px] font-mono text-muted-foreground">
                    {isUserMessage ? (
                      <span>user@fbc:~$ </span>
                    ) : (
                      <span>[F.B/c AI] </span>
                    )}
                  </div>

                  <div className={cn(
                    "text-[13px] leading-relaxed",
                    "[.monochrome_&]:font-mono",
                  )}>
                    <Response>{message.content}</Response>
                    
                    {/* Blinking cursor - only for assistant in monochrome */}
                    {!isUserMessage && (
                      <span className="hidden [.monochrome_&]:inline-block w-2 h-4 bg-current animate-pulse ml-1 align-middle" />
                    )}
                  </div>

                  <div className="space-y-2">
                      {/* Reasoning Display */}
                      {aiElements?.showReasoning && message.metadata?.reasoning && (
                        <Reasoning isStreaming={isLoading} defaultOpen={false}>
                          <ReasoningTrigger />
                          <ReasoningContent>{message.metadata.reasoning}</ReasoningContent>
                        </Reasoning>
                      )}

                      {aiElements?.showReasoning && showResearchSummary && (
                        <Reasoning isStreaming={false} defaultOpen={false}>
                          <ReasoningTrigger>
                            <Search className="h-3.5 w-3.5" />
                            <span>Research findings</span>
                          </ReasoningTrigger>
                          <ReasoningContent>
                            <div className="space-y-2 text-sm text-muted-foreground">
                              {typeof researchSummary?.combinedAnswer === 'string' && researchSummary.combinedAnswer.trim().length > 0 && (
                                <p className="leading-relaxed whitespace-pre-wrap">
                                  {researchSummary.combinedAnswer}
                                </p>
                              )}
                              {researchBadges.length > 0 && (
                                <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-wide">
                                  {researchBadges.map((label) => (
                                    <Badge key={label} variant="outline" className="border-border/40 bg-background/60">
                                      {label}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </ReasoningContent>
                        </Reasoning>
                      )}

                      {aiElements?.showReasoning && researchError && (
                        <Reasoning isStreaming={false} defaultOpen={false}>
                          <ReasoningTrigger>
                            <Search className="h-3.5 w-3.5" />
                            <span>Research unavailable</span>
                          </ReasoningTrigger>
                          <ReasoningContent>
                            <p className="text-sm text-muted-foreground">
                              {researchError}
                            </p>
                          </ReasoningContent>
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
                                status={step.status as any}
                                icon={step.icon as any}
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
                          <SourcesTrigger {...({ count: message.metadata.sources.length } as any)} />
                          <SourcesContent>
                            {message.metadata.sources.map((source, index) => (
                              <Source key={index} href={source.url} title={source.title}>
                                <div className="flex items-start gap-1.5 text-left">
                                  <ExternalLink className="mt-0.5 h-3 w-3 text-muted-foreground/70" />
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-medium text-foreground text-[12px] leading-snug">
                                      {source.title}
                                    </span>
                                    {(source.description || source.snippet) && (
                                      <span className="text-[11px] text-muted-foreground leading-snug">
                                        {source.description || source.snippet}
                                      </span>
                                    )}
                                  </div>
                                </div>
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
                              <ToolHeader title={tool.name} type={tool.type as any} state={tool.state as any} />
                              <ToolContent>
                                {tool.input && <ToolInput input={tool.input} />}
                                {tool.output && <ToolOutput output={tool.output} errorText={tool.error || ''} />}
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
                          usage={message.metadata.contextUsage.usage as any}
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
                              {...({ ...image, uint8Array: new Uint8Array(0) } as any)}
                              className="rounded-lg border"
                            />
                          ))}
                        </div>
                      )}

                      {/* Inline Citations */}
                      {aiElements?.showInlineCitations && message.metadata?.inlineCitations && message.metadata.inlineCitations.length > 0 && (
                        <div className="space-y-1">
                          {message.metadata.inlineCitations.map((citation, index) => (
                            <InlineCitation key={index} {...(citation as any)}>
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
                              <TaskItem key={index} {...({ status: task.status } as any)}>
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
                          <Action tooltip="Copy message">
                            <Copy className="h-3 w-3" />
                          </Action>
                          <Action tooltip="Regenerate response">
                            <RotateCw className="h-3 w-3" />
                          </Action>
                        </Actions>
                      )}
                    </div>
                  </MessageContent>
                </Message>
            );
          })}
          {followUpSuggestion && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="mt-2 text-xs tracking-wide"
                onClick={() => onSendMessage(followUpSuggestion)}
              >
                {followUpSuggestion}
              </Button>
            </div>
          )}
          </>
        )}

          {aiElements?.showArtifacts && artifacts.length > 0 && (
            <section className={cn("space-y-2", isExpanded ? "mx-auto w-full max-w-3xl" : "")}
            >
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                <Sparkles className="h-3 w-3 text-[hsl(var(--accent))]" />
                <h3>AI Generated Insights</h3>
              </div>

              <div className="grid gap-2">
                {artifacts.map((artifact) => (
                  <ArtifactCardView key={`${artifact.id}-${artifact.version ?? '1'}`} artifact={artifact} />
                ))}
              </div>
            </section>
          )}

          {isLoading && (
            <div className="flex items-start gap-3 max-w-[80%]">
              <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-card/80 px-3 py-2 text-xs text-muted-foreground shadow-sm">
                <div className="flex items-center gap-1">
                  <div className="h-1 w-1 rounded-full bg-[hsl(var(--accent))] animate-pulse"></div>
                  <div className="h-1.5 w-1 rounded-full bg-[hsl(var(--accent))] animate-pulse" style={{animationDelay: '0.2s'}}></div>
                  <div className="h-1 w-1 rounded-full bg-[hsl(var(--accent))] animate-pulse" style={{animationDelay: '0.4s'}}></div>
                </div>
                <span className="tracking-[0.3em] uppercase">AI Thinking</span>
              </div>
            </div>
          )}
      </ConversationContent>
      <ConversationScrollButton className="shadow-md" />
    </Conversation>
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
    <ArtifactCard className="rounded-md border border-border/50 bg-muted/30 shadow-none">
      <ArtifactHeader className="flex flex-wrap items-center gap-1.5">
        <div className="flex items-center gap-1.5">
          {type.includes('code') ? (
            <Code2 className="h-3 w-3 text-primary" />
          ) : type.includes('research') ? (
            <Sparkles className="h-3 w-3 text-primary" />
          ) : type.includes('tool') ? (
            <ListTree className="h-3 w-3 text-primary" />
          ) : (
            <MessageCircle className="h-3 w-3 text-primary" />
          )}
          <ArtifactTitle className="capitalize text-[13px]">
            {type.replace(/-/g, ' ')}
          </ArtifactTitle>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {createdLabel && (
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {createdLabel}
            </span>
          )}
          <Badge className={`text-[10px] h-4 px-1.5 ${tone}`}>{status}</Badge>
        </div>
      </ArtifactHeader>
      <ArtifactContent className="space-y-1.5">
        {error && (
          <div className="flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/5 p-2 text-[13px] text-red-500">
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
    <div className="space-y-2">
      {query && (
        <ArtifactDescription className="text-[11px] uppercase tracking-wide text-muted-foreground/80">
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
