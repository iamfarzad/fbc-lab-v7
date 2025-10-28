"use client";

import { Message as MessageView, MessageAvatar, MessageContent } from "@/components/ai-elements/core/message";
import { Artifact, ArtifactContent, ArtifactHeader, ArtifactTitle } from "@/components/ai-elements/content/artifact";
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
import type { Message as MessageType } from "@/types/core";
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
import { SummaryArtifact } from "@/components/chat/artifacts";

interface LiveChatMessagesProps {
  messages: MessageType[];
  className?: string;
}

export function LiveChatMessages({ messages, className }: LiveChatMessagesProps) {
  return (
    <div className={className}>
      {messages.map((m) => {
        const from = m.role;
        const meta = m.metadata || {};
        return (
          <MessageView key={m.id} from={from}>
            <MessageAvatar />
            <MessageContent>
              {/* Context usage / cost banner (if available) */}
              {FEATURE_FLAGS.SHOW_USAGE_CARD && meta.contextUsage && (
                <div className="mb-1 flex items-center gap-1">
                  <Context
                    usedTokens={meta.contextUsage.usedTokens}
                    maxTokens={meta.contextUsage.maxTokens}
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
                    modelId={meta.contextUsage.modelId as any}
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
              )}

              {m.content && <p>{m.content}</p>}

              {/* Inline citations */}
              {Array.isArray(meta.inlineCitations) && meta.inlineCitations.length > 0 && (
                <InlineCitation className="mt-1">
                  <InlineCitationText>See citations</InlineCitationText>
                  <InlineCitationCard>
                    <InlineCitationCardTrigger
                      sources={meta.inlineCitations.map((c:any)=>c.url).filter(Boolean)}
                    />
                    <InlineCitationCardBody>
                      <InlineCitationCarousel>
                        <InlineCitationCarouselHeader>
                          <InlineCitationCarouselPrev />
                          <InlineCitationCarouselIndex />
                          <InlineCitationCarouselNext />
                        </InlineCitationCarouselHeader>
                        <InlineCitationCarouselContent>
                          {meta.inlineCitations.map((c:any, idx:number) => (
                            <InlineCitationCarouselItem key={idx}>
                              <div className="text-[12px] font-medium">{c.title || c.url}</div>
                              <a className="text-[11px] text-blue-600 underline" href={c.url} target="_blank" rel="noreferrer">
                                {c.url}
                              </a>
                              {c.text && <div className="text-[11px] text-muted-foreground mt-1">{c.text}</div>}
                            </InlineCitationCarouselItem>
                          ))}
                        </InlineCitationCarouselContent>
                      </InlineCitationCarousel>
                    </InlineCitationCardBody>
                  </InlineCitationCard>
                </InlineCitation>
              )}

              {meta.reasoning && (
                <Reasoning>
                  <ReasoningTrigger />
                  <ReasoningContent>{meta.reasoning}</ReasoningContent>
                </Reasoning>
              )}

              {meta.chainOfThought && (
                <ChainOfThought>
                  <ChainOfThoughtHeader>Thinking Process</ChainOfThoughtHeader>
                  <ChainOfThoughtContent>
                    {meta.chainOfThought.steps.map((step, idx) => (
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
                    const summaryContent =
                      typeof a.content === "string"
                        ? a.content
                        : JSON.stringify(a.content, null, 2);
                    if (sessionId && typeof summaryContent === "string") {
                      return (
                        <SummaryArtifact
                          key={a.id}
                          content={summaryContent}
                          sessionId={sessionId}
                          leadEmail={
                            (a.metadata?.leadEmail as string | undefined) ??
                            (meta as any)?.leadEmail
                          }
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
                        {typeof a.content === "string"
                          ? a.content
                          : JSON.stringify(a.content, null, 2)}
                      </ArtifactContent>
                    </Artifact>
                  );
                })}

              {Array.isArray(meta.tools) &&
                meta.tools.map((t) => {
                  const stateMap: Record<string, 'input-streaming' | 'input-available' | 'output-available' | 'output-error'> = {
                    running: 'input-available',
                    complete: 'output-available',
                    error: 'output-error',
                  };
                  const mapped = stateMap[t.state] ?? 'output-available';
                  return (
                    <Tool key={t.name}>
                      <ToolHeader type={t.type as any} state={mapped} />
                      <ToolContent>
                        {t.output && typeof t.output === "object"
                          ? JSON.stringify(t.output, null, 2)
                          : String(t.output ?? "")}
                      </ToolContent>
                    </Tool>
                  );
                })}

              {/* Tasks */}
              {Array.isArray(meta.tasks) && meta.tasks.length > 0 && (
                <div className="mt-1 space-y-1">
                  {meta.tasks.map((task:any, idx:number) => (
                    <Task key={idx}>
                      <TaskTrigger title={task.title} />
                      <TaskContent>
                        {task.description && (
                          <TaskItem>{task.description}</TaskItem>
                        )}
                        {Array.isArray(task.files) && task.files.length>0 && (
                          <div className="flex flex-wrap gap-1">
                            {task.files.map((f:any, i:number) => (
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
                      <div className="font-medium">{meta.webPreview.title}</div>
                      {meta.webPreview.description && (
                        <div className="text-muted-foreground">{meta.webPreview.description}</div>
                      )}
                      <a className="text-blue-600 underline" href={meta.webPreview.url} target="_blank" rel="noreferrer">
                        {meta.webPreview.url}
                      </a>
                    </div>
                  </WebPreview>
                </div>
              )}

              {/* Images */}
              {Array.isArray(meta.images) && meta.images.length>0 && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {meta.images.map((img:any, idx:number) => (
                    <img key={idx} src={img.url} alt={img.alt || ''} className="rounded-md border" />
                  ))}
                </div>
              )}

              {/* Actions */}
              {Array.isArray(meta.actions) && meta.actions.length>0 && (
                <Actions className="mt-2">
                  {meta.actions.map((a:any, idx:number) => (
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
