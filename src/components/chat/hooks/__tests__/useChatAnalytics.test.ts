import { renderHook, waitFor } from "@testing-library/react";

import type { UnifiedMessage } from "@/core/chat/unified-types";

import {
  logConversationMilestone,
} from "@/lib/analytics/chat-flow";
import {
  detectSafetyCategory,
  logSafetyEvent,
} from "@/lib/analytics/safety";

import {
  useChatAnalytics,
} from "../useChatAnalytics";
import type { ConversationFlowState } from "../useConversationFlow";
import { useConversationFlow } from "../useConversationFlow";

jest.mock("../useConversationFlow", () => ({
  useConversationFlow: jest.fn(),
}));

jest.mock("@/lib/analytics/chat-flow", () => ({
  logConversationMilestone: jest.fn(),
}));

jest.mock("@/lib/analytics/safety", () => ({
  detectSafetyCategory: jest.fn(),
  logSafetyEvent: jest.fn(),
}));

const mockUseConversationFlow = useConversationFlow as jest.MockedFunction<typeof useConversationFlow>;
const mockLogConversationMilestone = logConversationMilestone as jest.MockedFunction<typeof logConversationMilestone>;
const mockDetectSafetyCategory = detectSafetyCategory as jest.MockedFunction<typeof detectSafetyCategory>;
const mockLogSafetyEvent = logSafetyEvent as jest.MockedFunction<typeof logSafetyEvent>;

const buildConversationFlow = (
  overrides: Partial<ConversationFlowState> = {}
): ConversationFlowState => ({
  covered: {
    goals: false,
    pain: false,
    data: false,
    readiness: false,
    budget: false,
    success: false,
  },
  recommendedNext: null,
  evidence: {},
  insights: {},
  coverageOrder: [],
  totalUserTurns: 0,
  firstUserTimestamp: null,
  latestUserTimestamp: null,
  shouldOfferRecap: false,
  ...overrides,
});

describe("useChatAnalytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConversationFlow.mockReturnValue(buildConversationFlow());
    mockDetectSafetyCategory.mockReturnValue(null);
  });

  it("updates context and logs conversation milestones for new categories", async () => {
    const mockConversationFlow = buildConversationFlow({
      covered: {
        goals: true,
        pain: false,
        data: false,
        readiness: false,
        budget: false,
        success: false,
      },
      coverageOrder: [
        {
          category: "goals",
          firstTurnIndex: 0,
          firstMessageId: "m-user-1",
          firstTimestamp: 2000,
        },
      ],
      totalUserTurns: 1,
      firstUserTimestamp: 1000,
      latestUserTimestamp: 2000,
      recommendedNext: "pain",
    });
    mockUseConversationFlow.mockReturnValue(mockConversationFlow);

    const updateContext = jest.fn();
    const messages: UnifiedMessage[] = [
      {
        id: "m-user-1",
        role: "user",
        content: "Let's talk through our goals today.",
        timestamp: new Date(1000),
      },
    ];

    const { result } = renderHook(() =>
      useChatAnalytics({
        sessionId: "session-1",
        messages,
        updateContext,
      })
    );

    expect(result.current.conversationFlow).toBe(mockConversationFlow);

    await waitFor(() => {
      expect(updateContext).toHaveBeenCalledWith({
        sessionId: "session-1",
        conversationFlow: mockConversationFlow,
      });
    });

    await waitFor(() => {
      expect(mockLogConversationMilestone).toHaveBeenCalledTimes(1);
    });

    expect(mockLogConversationMilestone).toHaveBeenCalledWith({
      sessionId: "session-1",
      category: "goals",
      firstTurnIndex: 0,
      firstMessageId: "m-user-1",
      firstTimestamp: 2000,
      elapsedMs: 1000,
    });
  });

  it("logs safety events for the latest user message only once", async () => {
    const mockConversationFlow = buildConversationFlow();
    mockUseConversationFlow.mockReturnValue(mockConversationFlow);
    mockDetectSafetyCategory.mockReturnValue("self_harm");

    const updateContext = jest.fn();
    const messages: UnifiedMessage[] = [
      {
        id: "m-user-2",
        role: "user",
        content: "I feel like hurting myself",
        timestamp: new Date(),
      },
    ];

    const { rerender } = renderHook(
      (props: Parameters<typeof useChatAnalytics>[0]) => useChatAnalytics(props),
      {
        initialProps: {
          sessionId: "session-2",
          messages,
          updateContext,
        },
      }
    );

    await waitFor(() => {
      expect(mockLogSafetyEvent).toHaveBeenCalledTimes(1);
    });

    rerender({
      sessionId: "session-2",
      messages,
      updateContext,
    });

    await waitFor(() => {
      expect(mockLogSafetyEvent).toHaveBeenCalledTimes(1);
    });
  });
});
