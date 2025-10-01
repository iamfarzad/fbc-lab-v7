import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader } from "@/components/ai-elements/loader";
// Removed EnhancedMessage import - using AI SDK artifacts instead
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton
} from "@/components/ai-elements/conversation";
import { ChatMessage } from "../types/chatTypes";
import { EnhancedChatMessage } from "@/types/chat-enhanced";
import { MessageCircle, FileText, ExternalLink, Sparkles, Code2, ListTree, AlertTriangle } from "lucide-react";
import { useArtifacts } from "@ai-sdk-tools/artifacts/client";
import {
  Artifact as ArtifactCard,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactDescription,
  ArtifactContent
} from "@/components/ai-elements/artifact";
import type { ExportSummaryRequest, ResearchSummary } from "../hooks/useChatMessages";
import { CHAT_CONSTANTS } from "../constants/chatConstants";

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
  onOpenMeeting: () => void;
  sessionId: string;
  onExportSummary: (request: ExportSummaryRequest) => void;
  aiElements: any;
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
  onOpenMeeting,
  sessionId,
  onExportSummary,
  aiElements,
}: ChatMessagesProps) {
  const artifactsState = useArtifacts();

  const streamedArtifacts = artifactsState.artifacts as StreamedArtifact[] | undefined;

  const derivedResearchArtifacts = useMemo<StreamedArtifact[]>(() =>
    researchSummaries.map((summary) => ({
      id: `research-${summary.messageId}`,
      type: "research-summary",
      status: "complete",
      payload: {
        ...summary,
        urlsUsed: summary.urlsUsed
      },
      createdAt: summary.timestamp.getTime(),
      updatedAt: summary.timestamp.getTime(),
      version: 1
    })),
    [researchSummaries]
  );

  const artifactCards = useMemo<StreamedArtifact[]>(() => {
    if (streamedArtifacts && streamedArtifacts.length > 0) {
      return streamedArtifacts;
    }
    return derivedResearchArtifacts;
  }, [streamedArtifacts, derivedResearchArtifacts]);

  const exportArtifacts = useMemo(() => (streamedArtifacts && streamedArtifacts.length > 0
    ? streamedArtifacts
    : derivedResearchArtifacts
  ), [streamedArtifacts, derivedResearchArtifacts]);

  const handleExportClick = () => {
    if (!sessionId) return;
    onExportSummary({
      sessionId,
      artifacts: exportArtifacts,
      research: researchSummaries
    });
  };

  return (
    <div className="flex-1 overflow-hidden relative">
      <Conversation className="h-full">
        <ConversationContent className="px-6 py-8 space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full space-y-6">
              <ConversationEmptyState
                title={`Welcome to F.B/c AI${contextReady && currentContext?.person?.fullName ? `, ${currentContext.person.fullName}` : ''}`}
                description={contextReady
                  ? `I'm here to help you navigate AI strategy and implementation. Based on your ${currentContext?.company?.name || 'organization'}, I can provide tailored guidance.`
                  : 'Gathering company intelligence tailored to you...'}
                icon={<MessageCircle className="h-6 w-6 text-muted-foreground" />}
              />

              {/* Show suggestions only after terms acceptance */}
              {hasAcceptedTerms && (
                <div className="max-w-md mx-auto">
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    What would you like to explore today?
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {contextReady && currentContext?.person?.role && (
                      <button
                        onClick={() => onSendMessage(`As ${currentContext.person.role} at ${currentContext.company?.name}, what AI strategy would you recommend?`)}
                        className={`w-full text-left p-3 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors ${CHAT_CONSTANTS.STYLING.HOVER_SCALE} ${CHAT_CONSTANTS.STYLING.INTERACTIVE}`}
                      >
                        🤖 AI strategy for {currentContext.person.role}s
                      </button>
                    )}
                    <button
                      onClick={() => onSendMessage('What AI consulting services do you offer?')}
                      className="w-full text-left p-3 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors"
                    >
                      💼 Consulting services overview
                    </button>
                    <button
                      onClick={() => onSendMessage('Tell me about your workshops')}
                      className="w-full text-left p-3 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors"
                    >
                      🎓 Workshop and training options
                    </button>
                    <button
                      onClick={() => onSendMessage('How can AI help my business?')}
                      className="w-full text-left p-3 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors"
                    >
                      🚀 AI implementation guidance
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Use simple message rendering instead of EnhancedMessage to avoid infinite loops
            enhancedMessages.map((message) => (
              <div key={message.id} className="p-4 border rounded-lg">
                <div className="font-medium text-sm text-muted-foreground mb-2">
                  {message.role === 'user' ? 'You' : 'Assistant'}
                </div>
                <div className="text-sm">{message.content}</div>
                {message.metadata?.sources && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Research: {message.metadata.sources.length || 0} sources
                  </div>
                )}
              </div>
            ))
          )}

          {artifactCards.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  AI Generated Insights
                </h3>
              </div>

              <div className="grid gap-4">
                {artifactCards.map((artifact) => (
                  <ArtifactCardView key={`${artifact.id}-${artifact.version ?? '1'}`} artifact={artifact} />
                ))}
              </div>
            </section>
          )}

          {messages.length > 0 && (
            <div className={`rounded-2xl border border-border/60 ${CHAT_CONSTANTS.STYLING.CARD} p-4 text-sm text-muted-foreground`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">Ready to explore next steps?</p>
                  <p>Book a live strategy session with Farzad to map out your AI roadmap.</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={onOpenMeeting} className="sm:self-start">
                    Schedule a call
                  </Button>
                  <Button
                    onClick={handleExportClick}
                    variant="outline"
                    className="sm:self-start"
                    disabled={!sessionId}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Export Summary
                  </Button>
                </div>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex justify-center py-6">
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
    <ArtifactCard className={`border-border/60 ${CHAT_CONSTANTS.STYLING.GLASS}`}>
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
