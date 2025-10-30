"use client";

import { Message as MessageView, MessageAvatar, MessageContent } from "@/components/ai-elements/core/message";
import { Response } from "@/components/ai-elements/core/response";
import { Artifact, ArtifactContent, ArtifactHeader, ArtifactTitle } from "@/components/ai-elements/content/artifact";
import { serializeToText, mapToolState, shouldRenderContent } from "@/lib/text-utils";
import { Sources, SourcesContent, SourcesTrigger, Source } from "@/components/ai-elements/sources/sources";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning/reasoning";
import { ChainOfThought, ChainOfThoughtContent, ChainOfThoughtHeader, ChainOfThoughtStep } from "@/components/ai-elements/reasoning/chain-of-thought";
import { CodeBlock } from "@/components/ai-elements/content/code-block";
import { Tool, ToolContent, ToolHeader } from "@/components/ai-elements/tools/tool";
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
} from "@/components/ai-elements/sources/inline-citation";
import { Actions, Action } from "@/components/ai-elements/interactive/actions";
import { Task, TaskTrigger, TaskContent, TaskItem, TaskItemFile } from "@/components/ai-elements/reasoning/task";
import { WebPreview } from "@/components/ai-elements/content/web-preview";
import type { Message as MessageType, MessageMetadata } from "@/types/core";
import { FEATURE_FLAGS } from '@/config/constants'
import {
  Context,
  ContextTrigger,
  ContextContent,
  ContextContentHeader,
  ContextContentBody,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  ContextContentFooter,
} from "@/components/ai-elements/sources/context";
import { StageVisualization } from "@/components/ai-elements/sources/stage-visualization";
import { SummaryArtifact } from "@/components/chat/artifacts";

interface LiveChatMessagesProps {
  messages: MessageType[];
  className?: string;
}

export function LiveChatMessages({ messages, className }: LiveChatMessagesProps) {
  return (
    <div className={className} data-testid="live-chat-messages">
      {messages.map((m) => {
        const from = m.role;
        const meta = (m.metadata ?? {}) as Partial<MessageMetadata>;
        return (
          <MessageView key={m.id} from={from}>
            <MessageAvatar />
            <MessageContent>
              {/* Context usage / cost banner (if available) */}
              {(() => {
                if (!FEATURE_FLAGS.SHOW_USAGE_CARD || !meta.contextUsage || typeof meta.contextUsage !== 'object') {
                  return null;
                }
                
                return (
                  <div className="mb-1 flex items-center gap-1">
                    <Context
                      usedTokens={meta.contextUsage?.usedTokens ?? 0}
                      maxTokens={meta.contextUsage?.maxTokens ?? 0}
                      usage={{
                        // Map to LanguageModelUsage shape expected by Context components
                        inputTokens: (meta.usage as any)?.promptTokens ?? 0,
                        outputTokens: (meta.usage as any)?.completionTokens ?? 0,
                        totalTokens:
                          (meta.usage as any)?.totalTokens ??
                          (((meta.usage as any)?.promptTokens ?? 0) + ((meta.usage as any)?.completionTokens ?? 0)),
                        reasoningTokens: (meta.usage as any)?.reasoningTokens ?? 0,
                        cachedInputTokens: (meta.usage as any)?.cachedInputTokens ?? 0,
                      }}
                      modelId={meta.contextUsage?.modelId ?? ''}
                    >
                      <ContextTrigger />
                      <ContextContent>
                        <ContextContentHeader />
                        <ContextContentBody>
                          <ContextInputUsage />
                          <ContextOutputUsage />
                          <ContextReasoningUsage />
                        </ContextContentBody>
                        <ContextContentFooter />
                      </ContextContent>
                    </Context>
                  </div>
                );
              })()}

              {/* Stage visualization (if agent metadata is available) */}
              {meta.agent && (meta as any).stage && (
                <div className="mb-2">
                  <StageVisualization 
                    currentStage={String((meta as any).stage)}
                    agent={meta.agent}
                  />
                </div>
              )}

              {shouldRenderContent(m.content) && <Response>{serializeToText(m.content, 'LiveChatMessages-content')}</Response>}

              {/* Inline citations */}
              {Array.isArray(meta.inlineCitations) && meta.inlineCitations.length > 0 && (
                <InlineCitation className="mt-1">
                  <InlineCitationText>See citations</InlineCitationText>
                  <InlineCitationCard>
                    <InlineCitationCardTrigger
                      sources={meta.inlineCitations.map((c)=>c.url).filter(Boolean)}
                    />
                    <InlineCitationCardBody>
                      <InlineCitationCarousel>
                        <InlineCitationCarouselHeader>
                          <InlineCitationCarouselPrev />
                          <InlineCitationCarouselIndex />
                          <InlineCitationCarouselNext />
                        </InlineCitationCarouselHeader>
                        <InlineCitationCarouselContent>
                          {meta.inlineCitations.map((c, idx:number) => (
                            <InlineCitationCarouselItem key={idx}>
                              <Response className="text-[12px] font-medium">{c.title || c.url}</Response>
                              <a className="text-[11px] text-primary underline" href={c.url} target="_blank" rel="noreferrer">
                                {c.url}
                              </a>
                              {c.text && <Response className="text-[11px] text-muted-foreground mt-1">{c.text}</Response>}
                            </InlineCitationCarouselItem>
                          ))}
                        </InlineCitationCarouselContent>
                      </InlineCitationCarousel>
                    </InlineCitationCardBody>
                  </InlineCitationCard>
                </InlineCitation>
              )}

              {/* AI Elements reasoning components - designed to show AI thinking to users */}
              {meta.reasoning && (
                <Reasoning>
                  <ReasoningTrigger />
                  <ReasoningContent>{meta.reasoning}</ReasoningContent>
                </Reasoning>
              )}

              {meta.chainOfThought && (
                <ChainOfThought>
                  <ChainOfThoughtHeader>Research Process</ChainOfThoughtHeader>
                  <ChainOfThoughtContent>
                    {meta.chainOfThought.steps.map((step, idx: number) => (
                      <ChainOfThoughtStep
                        key={idx}
                        label={step.label}
                        description={step.description}
                        status={step.status}
                      />
                    ))}
                  </ChainOfThoughtContent>
                </ChainOfThought>
              )}

              {Array.isArray(meta.sources) && meta.sources.length > 0 && (
                <Sources>
                  <SourcesTrigger count={meta.sources.length} />
                  <SourcesContent>
                    {meta.sources.map((s) => (
                      <Source key={s.id} href={s.url} title={s.title} />
                    ))}
                  </SourcesContent>
                </Sources>
              )}

              {Array.isArray(meta.codeBlocks) &&
                meta.codeBlocks.map((b) => (
                  <CodeBlock
                    key={b.id}
                    code={b.code}
                    language={b.language}
                    showLineNumbers={b.showLineNumbers}
                  />
                ))}

              {Array.isArray(meta.artifacts) &&
                meta.artifacts.map((a) => {
                  const artifactTitle = a.title || a.type;
                  if (a.type === "summary") {
                    const sessionId =
                      (a.metadata?.sessionId as string | undefined) ??
                      (meta as any)?.sessionId;
                    const summaryContent = serializeToText(a.content, 'artifact-summary-content');
                    if (sessionId && typeof summaryContent === "string") {
                      return (
                        <SummaryArtifact
                          key={a.id}
                          content={summaryContent}
                          sessionId={sessionId}
                          leadEmail={(a.metadata?.leadEmail as string | undefined) ?? (meta as any)?.leadEmail}
                          gdprNotice={a.metadata?.gdprNotice as
                            | {
                                message: string;
                                dataRetained: string[];
                                dataDeleted: string[];
                              }
                            | undefined}
                        />
                      );
                    }
                    // Fall back to generic artifact if session ID missing
                  }

                  return (
                    <Artifact key={a.id}>
                      <ArtifactHeader>
                        <ArtifactTitle>{artifactTitle}</ArtifactTitle>
                      </ArtifactHeader>
                      <ArtifactContent>
                        <Response>{serializeToText(a.content, 'artifact-content')}</Response>
                      </ArtifactContent>
                    </Artifact>
                  );
                })}

              {Array.isArray(meta.tools) &&
                meta.tools.map((t) => {
                  const mapped = mapToolState(t.state);
                  const outputText = serializeToText(t.output, 'LiveChatMessages-tool-output');
                  
                  return (
                    <Tool key={t.name}>
                      <ToolHeader type={t.type as any} state={mapped} />
                      <ToolContent>
                        {outputText}
                      </ToolContent>
                    </Tool>
                  );
                })}

              {/* Tasks */}
              {Array.isArray(meta.tasks) && meta.tasks.length>0 && (
                <div className="mt-1 space-y-1">
                  {meta.tasks.map((task, idx:number) => (
                    <Task key={idx}>
                      <TaskTrigger title={task.title} />
                      <TaskContent>
                        {task.description && (
                          <TaskItem>{task.description}</TaskItem>
                        )}
                        {Array.isArray(task.files) && task.files.length>0 && (
                          <div className="flex flex-wrap gap-1">
                            {task.files.map((f, i:number) => (
                              <TaskItemFile key={i}>{f.name}</TaskItemFile>
                            ))}
                          </div>
                        )}
                      </TaskContent>
                    </Task>
                  ))}
                </div>
              )}

              {/* Web preview */}
              {meta.webPreview?.url && (
                <div className="mt-2">
                  <WebPreview defaultUrl={meta.webPreview.url}>
                    <div className="p-2 text-[12px]">
                      <Response className="font-medium">{meta.webPreview.title}</Response>
                      {meta.webPreview.description && (
                        <Response className="text-muted-foreground">{meta.webPreview.description}</Response>
                      )}
                      <a className="text-primary underline" href={meta.webPreview.url} target="_blank" rel="noreferrer">
                        {meta.webPreview.url}
                      </a>
                    </div>
                  </WebPreview>
                </div>
              )}

              {/* Images */}
              {Array.isArray(meta.images) && meta.images.length>0 && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {meta.images.map((img, idx:number) => (
                    <img 
                      key={idx} 
                      src={img.base64 ? `data:${img.mediaType};base64,${img.base64}` : ''} 
                      alt={img.alt || ''} 
                      className="rounded-md border" 
                    />
                  ))}
                </div>
              )}

              {/* Actions */}
              {Array.isArray(meta.actions) && meta.actions.length>0 && (
                <Actions className="mt-2">
                  {meta.actions.map((a, idx:number) => (
                    <Action key={idx} title={a.tooltip} aria-label={a.label}>
                      {a.label}
                    </Action>
                  ))}
                </Actions>
              )}
            </MessageContent>
          </MessageView>
        );
      })}
    </div>
  );
}
