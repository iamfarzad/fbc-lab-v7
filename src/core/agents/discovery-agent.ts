import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import type { AgentContext, ChatMessage, ChainOfThoughtStep, AgentResult, FunnelStage } from './types'
import { GEMINI_MODELS } from '@/config/constants'
import { PHRASE_BANK } from '@/core/chat/conversation-phrases'

/**
 * Discovery Agent - Systematically qualifies leads through conversation
 * 
 * Covers 6 categories: goals, pain, data, readiness, budget, success
 * Uses conversation flow to steer questions naturally
 * Multimodal-aware: references voice, screen, webcam, uploads
 */
export async function discoveryAgent(
  messages: ChatMessage[],
  context: AgentContext
): Promise<AgentResult> {
  const { intelligenceContext, conversationFlow, multimodalContext, voiceActive } = context

  const steps: ChainOfThoughtStep[] = []

  // CRITICAL FIX: Exit detection at start of discovery agent
  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  if (lastUserMessage) {
    const exitIntent = detectExitInMessage(lastUserMessage.content);
    
    if (exitIntent === 'BOOKING') {
      return {
        output: "Absolutely! I'll send you our calendar link. What time zone are you in?",
        agent: 'Discovery Agent (Booking Mode)',
        metadata: { 
          stage: 'BOOKING_REQUESTED' as FunnelStage, 
          triggerBooking: true,
          action: 'show_calendar_widget'
        }
      };
    }
    
    if (exitIntent === 'WRAP_UP') {
      const recap = generateRecap(conversationFlow);
      return {
        output: `Got it. Quick recap: ${recap}. Sound right? Let's schedule a call with Farzad to map this out.`,
        agent: 'Discovery Agent (Wrap-up Mode)',
        metadata: { 
          stage: 'WRAP_UP' as FunnelStage, 
          triggerBooking: true
        }
      };
    }
  }

  // Step 1: Analyze conversation flow
  steps.push({
    label: 'Analyzing conversation flow',
    description: conversationFlow ? `Covered: ${formatConversationStatus(conversationFlow)}` : 'Starting discovery',
    status: 'complete',
    timestamp: Date.now()
  })

  // Build system prompt with all context
  let systemPrompt = `You are F.B/c Discovery AI - a lead qualification specialist.

INTELLIGENCE CONTEXT:
${intelligenceContext?.name ? `Lead: ${intelligenceContext.name}` : ''}
${intelligenceContext?.company?.name ? `Company: ${intelligenceContext.company.name}` : ''}
${intelligenceContext?.company?.industry ? `Industry: ${intelligenceContext.company.industry}` : ''}
${intelligenceContext?.person?.role ? `Role: ${intelligenceContext.person.role}` : ''}

YOUR MISSION:
Systematically discover lead's needs across 6 categories:
1. GOALS - What are they trying to achieve?
2. PAIN - What's broken/frustrating?
3. DATA - Where is their data? How organized?
4. READINESS - Team buy-in? Change management?
5. BUDGET - Timeline? Investment range?
6. SUCCESS - What metrics matter?

CONVERSATION FLOW STATUS:
${conversationFlow ? formatConversationStatus(conversationFlow) : 'Starting discovery'}

MULTIMODAL AWARENESS:`

  if (multimodalContext?.hasRecentImages) {
    systemPrompt += `\n- Screen/webcam active: Reference specific elements naturally`
    if (multimodalContext.recentAnalyses.length > 0) {
      systemPrompt += `\n  Recent analysis: ${multimodalContext.recentAnalyses[0].substring(0, 150)}...`
    }
  }

  if (multimodalContext?.hasRecentUploads) {
    systemPrompt += `\n- Documents uploaded: Reference insights from uploaded docs`
  }

  if (voiceActive) {
    systemPrompt += `\n- Voice active: Keep responses concise for voice playback (2 sentences max)`
  }

  systemPrompt += `

STYLE:
- Sound like a sharp, friendly consultant (no fluff)
- Two sentences max per turn
- Ask ONE focused question at a time
- Mirror user's language and build on latest turn
- Natural integration of multimodal context:
  ✅ GOOD: "I noticed your dashboard shows revenue declining..."
  ❌ BAD: "Based on the screen share tool output..."

NEXT QUESTION:
${conversationFlow?.recommendedNext ? `Focus on: ${conversationFlow.recommendedNext}` : 'Start with goals'}
${conversationFlow?.recommendedNext && PHRASE_BANK[conversationFlow.recommendedNext] 
  ? `Suggested phrasing: "${PHRASE_BANK[conversationFlow.recommendedNext][0]}"` 
  : ''}

${conversationFlow?.shouldOfferRecap 
  ? 'Deliver a two-sentence recap of what you learned, then ask your next question.' 
  : ''}`

  // Step 2: Check for question fatigue
  const consecutiveQuestions = countConsecutiveQuestions(messages);
  const shouldOfferRecap = consecutiveQuestions >= 3 || (conversationFlow?.shouldOfferRecap === true);
  
  if (shouldOfferRecap) {
    const recap = generateRecap(conversationFlow);
    return {
      output: `I've asked quite a few questions. Let me recap what I've learned: ${recap}. Does this sound right? And would you like to schedule a deeper dive with Farzad?`,
      agent: 'Discovery Agent (Recap Mode)',
      metadata: { 
        stage: 'DISCOVERY', 
        triggerBooking: true,
        recapProvided: true
      }
    };
  }

  // Step 3: Identify knowledge gaps
  const categoriesCovered = conversationFlow 
    ? Object.values(conversationFlow.covered).filter(Boolean).length 
    : 0
  const nextCategory = conversationFlow?.recommendedNext || 'goals'
  
  steps.push({
    label: 'Identifying knowledge gaps',
    description: `${categoriesCovered}/6 categories covered. Next: ${nextCategory}`,
    status: 'complete',
    timestamp: Date.now()
  })

  // Step 4: Formulate strategic question
  steps.push({
    label: 'Formulating strategic question',
    description: `Targeting ${nextCategory} discovery`,
    status: 'active',
    timestamp: Date.now()
  })

  const result = await generateText({
    model: google(GEMINI_MODELS.DEFAULT_CHAT),
    messages,
    system: systemPrompt,
    temperature: 0.7
  })

  // Mark the currently active step as complete (guard against missing index)
  const activeIdx = steps.findIndex(s => s.status === 'active')
  if (activeIdx >= 0) {
    steps[activeIdx].status = 'complete'
  }

  // Step 5: Incorporate multimodal context
  if (multimodalContext?.hasRecentImages || multimodalContext?.hasRecentAudio || multimodalContext?.hasRecentUploads) {
    steps.push({
      label: 'Incorporating multimodal context',
      description: [
        multimodalContext.hasRecentImages && 'screen/webcam',
        multimodalContext.hasRecentAudio && 'voice',
        multimodalContext.hasRecentUploads && 'uploads'
      ].filter(Boolean).join(', ') + ' detected',
      status: 'complete',
      timestamp: Date.now()
    })
  }

  return {
    output: result.text,
    agent: 'Discovery Agent',
    model: GEMINI_MODELS.DEFAULT_CHAT,
    metadata: {
      stage: 'DISCOVERY' as FunnelStage,
      chainOfThought: { steps },
      categoriesCovered,
      recommendedNext: conversationFlow?.recommendedNext || null,
      multimodalUsed: multimodalContext?.hasRecentImages || multimodalContext?.hasRecentAudio
    }
  }
}

// CRITICAL FIX: Exit detection helper
function detectExitInMessage(content: string): 'BOOKING' | 'WRAP_UP' | 'FRUSTRATION' | 'MINIMAL' | 'CONTINUE' {
  if (!content) return 'CONTINUE';
  
  const lowerContent = content.toLowerCase().trim();
  
  // Booking patterns
  const bookingPatterns = [
    /let'?s (just )?book/i,
    /schedule (a|the) (call|meeting|workshop)/i,
    /set up (a|the) (call|meeting)/i,
    /book (a|the) (call|meeting|workshop)/i,
    /calendar/i,
    /when can we/i
  ];
  
  if (bookingPatterns.some(pattern => pattern.test(lowerContent))) {
    return 'BOOKING';
  }
  
  // Wrap-up patterns
  const wrapUpPatterns = [
    /let'?s wrap/i,
    /move on/i,
    /that'?s enough/i,
    /wrap it up(?!.*talk|.*speak|.*call|.*meeting)/i, // Only if not followed by talk/speak/call/meeting
    /move forward/i
  ];
  
  if (wrapUpPatterns.some(pattern => pattern.test(lowerContent))) {
    return 'WRAP_UP';
  }
  
  // Frustration patterns
  const frustrationPatterns = [
    /stop asking/i,
    /i don'?t want to answer/i,
    /for fuck'?s sake/i,
    /this is ridiculous/i,
    /enough already/i
  ];
  
  if (frustrationPatterns.some(pattern => pattern.test(lowerContent))) {
    return 'FRUSTRATION';
  }
  
  // Minimal response patterns
  const minimalPatterns = [
    /^(nothing|nope|no|not sure|i don'?t know)$/i,
    /^.{1,4}$/ // 1-4 characters
  ];
  
  if (minimalPatterns.some(pattern => pattern.test(lowerContent))) {
    return 'MINIMAL';
  }
  
  return 'CONTINUE';
}

// Count consecutive questions from assistant
function countConsecutiveQuestions(messages: ChatMessage[]): number {
  let count = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role === 'assistant' && message.content.includes('?')) {
      count++;
    } else if (message.role === 'user') {
      break; // Stop counting when we hit a user message
    }
  }
  return count;
}

// Generate recap from conversation flow
function generateRecap(conversationFlow: any): string {
  if (!conversationFlow?.evidence) return 'We discussed your AI needs and challenges.';
  
  const categories = ['goals', 'pain', 'data', 'readiness', 'budget', 'success'];
  const coveredCategories = categories.filter(cat => conversationFlow.covered?.[cat]);
  
  if (coveredCategories.length === 0) return 'We just started discussing your AI needs.';
  
  const recapParts = coveredCategories.map(cat => {
    const evidence = conversationFlow.evidence[cat]?.[0] || '';
    return `${cat}: ${evidence.substring(0, 100)}${evidence.length > 100 ? '...' : ''}`;
  });
  
  return recapParts.join('; ');
}

function formatConversationStatus(flow: any): string {
  const categories = ['goals', 'pain', 'data', 'readiness', 'budget', 'success']
  const covered = categories.filter(cat => flow.covered[cat])
  const pending = categories.filter(cat => !flow.covered[cat])
  
  return `
Covered (${covered.length}/6): ${covered.join(', ')}
Pending: ${pending.join(', ')}
Total user turns: ${flow.totalUserTurns || 0}
${flow.recommendedNext ? `Next recommended: ${flow.recommendedNext}` : 'All categories covered'}
`
}
