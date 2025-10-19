type ConversationCategory = 'goals' | 'pain' | 'data' | 'readiness' | 'budget' | 'success' | 'transition' | 'booking' | 'acknowledgment' | 'recap' | 'pivot'

type PhraseBank = Record<ConversationCategory, string[]>

export const PHRASE_BANK: PhraseBank = {
  goals: [
    "What’s the bigger picture you’re chasing right now?",
    "If this works exactly how you want, what changes for you?",
    "Are you aiming to grow revenue, operate leaner, or get your time back?",
  ],
  pain: [
    "Walk me through the part of the day that makes you wince.",
    "Where’s the workflow that keeps breaking or getting pushed?",
    "If you could stop doing one repetitive thing tomorrow, what would it be?",
  ],
  data: [
    "When you need customer or ops data, where does it live right now?",
    "Is everything tucked in a system, or are you spelunking through sheets and inboxes?",
    "If I asked your team for last quarter’s numbers, could they pull it in five minutes?",
  ],
  readiness: [
    "Who on your side is going to champion this and keep it alive?",
    "How does your crew respond when new tooling shows up?",
    "Are you picturing this as your secret weapon or something the whole team touches?",
  ],
  budget: [
    "Let’s talk guardrails—are we in test-the-water range or full build mode?",
    "Timeline-wise, is this ‘we needed it yesterday’ or ‘do it right this quarter’?",
    "What’s the level of spend that still feels sane for the outcome you want?",
  ],
  success: [
    "What metric tells you this was worth it six months from now?",
    "How will you know this AI move actually helped, not just felt cool?",
    "If we nail this, what’s the first win you’ll brag about?",
  ],
  transition: [
    "Based on what you've shared, let me lay out a quick path forward.",
    "I've got a clearer picture now. Here's what I'd suggest next:",
    "Let me connect the dots on what you've told me.",
    "I'm seeing a pattern here. Let me propose next steps.",
  ],
  booking: [
    "Perfect! Let's get you on Farzad's calendar. What time zone are you in?",
    "Great—I'll pull up our scheduling link. Any time constraints this week?",
    "Excellent. I'll open our calendar widget right here. Pick what works for you.",
    "Let's lock in a time. I'll show you Farzad's availability.",
  ],
  acknowledgment: [
    "Totally fair—let me stop drilling and just give you options.",
    "I hear you. Let's skip to what matters: next steps.",
    "No problem. Let me pivot to actionable next steps.",
    "Got it. Let me wrap this up and get you moving forward.",
  ],
  recap: [
    "Quick recap: [SUMMARY]. Sound right?",
    "Let me make sure I've got this: [SUMMARY]. Did I miss anything?",
    "Here's what I've gathered: [SUMMARY]. Does this align with your thinking?",
    "Before we move forward, let me confirm: [SUMMARY]. Accurate?",
  ],
  pivot: [
    "No worries—let's come back to that. What about [DIFFERENT_TOPIC]?",
    "Fair enough. Let's switch gears to [DIFFERENT_TOPIC].",
    "Got it. Let's explore [DIFFERENT_TOPIC] instead.",
    "No problem. What about [DIFFERENT_TOPIC]—is that more relevant?",
  ],
}

export function pickFollowUp(category: ConversationCategory, seed = 0): string {
  const options = PHRASE_BANK[category]
  if (!options || options.length === 0) return 'Tell me more.'
  const index = Math.abs(Math.floor(seed)) % options.length
  return options[index]
}

// CRITICAL FIX: Helper function to detect minimal responses
export function isMinimalResponse(content: string): boolean {
  if (!content) return false;
  
  const trimmed = content.trim();
  const minimalPatterns = [
    /^(nothing|nope|no|not sure|i don'?t know)$/i,
    /^.{1,4}$/ // 1-4 characters
  ];
  
  return minimalPatterns.some(pattern => pattern.test(trimmed));
}
