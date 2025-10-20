import { useEffect, useRef } from "react";

import type { UnifiedContext, UnifiedMessage } from "@/core/chat/unified-types";
import {
  logConversationMilestone,
} from "@/lib/analytics/chat-flow";
import {
  detectSafetyCategory,
  logSafetyEvent,
} from "@/lib/analytics/safety";

import {
  type ConversationCategory,
  type ConversationFlowState,
  useConversationFlow,
} from "./useConversationFlow";

interface UseChatAnalyticsOptions {
  sessionId: string;
  messages: UnifiedMessage[];
  updateContext: (context: Partial<UnifiedContext>) => void;
}

interface UseChatAnalyticsResult {
  conversationFlow: ConversationFlowState;
}

/**
 * Isolates chat analytics side effects (conversation coverage and safety logging)
 * so the primary `useChatMessages` hook can focus on view-model responsibilities.
 */
export function useChatAnalytics({
  sessionId,
  messages,
  updateContext,
}: UseChatAnalyticsOptions): UseChatAnalyticsResult {
  const conversationFlow = useConversationFlow(messages);
  const loggedCategoriesRef = useRef<Set<ConversationCategory>>(new Set());
  const safetyLoggedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    updateContext({
      sessionId,
      conversationFlow,
    });
  }, [conversationFlow, sessionId, updateContext]);

  useEffect(() => {
    if (!conversationFlow.coverageOrder.length) return;

    for (const insight of conversationFlow.coverageOrder) {
      if (loggedCategoriesRef.current.has(insight.category)) continue;
      loggedCategoriesRef.current.add(insight.category);

      const elapsedMs =
        insight.firstTimestamp && conversationFlow.firstUserTimestamp
          ? insight.firstTimestamp - conversationFlow.firstUserTimestamp
          : null;

      logConversationMilestone({
        sessionId,
        category: insight.category,
        firstTurnIndex: insight.firstTurnIndex,
        firstMessageId: insight.firstMessageId,
        firstTimestamp: insight.firstTimestamp,
        elapsedMs,
      });
    }
  }, [
    conversationFlow.coverageOrder,
    conversationFlow.firstUserTimestamp,
    sessionId,
  ]);

  useEffect(() => {
    const userMessages = messages.filter((message) => message.role === "user");
    if (userMessages.length === 0) return;

    const latest = userMessages[userMessages.length - 1];
    if (safetyLoggedRef.current.has(latest.id)) return;

    const category = detectSafetyCategory(latest.content.toLowerCase());
    if (!category) return;

    safetyLoggedRef.current.add(latest.id);
    logSafetyEvent({
      sessionId,
      category,
      messageId: latest.id,
      messageSnippet: latest.content.slice(0, 200),
      timestamp: Date.now(),
    });
  }, [messages, sessionId]);

  return { conversationFlow };
}

