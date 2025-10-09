type ConversationCategory = 'goals' | 'pain' | 'data' | 'readiness' | 'budget' | 'success'

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
}

export function pickFollowUp(category: ConversationCategory, seed = 0): string {
  const options = PHRASE_BANK[category]
  if (!options || options.length === 0) return 'Tell me more.'
  const index = Math.abs(Math.floor(seed)) % options.length
  return options[index]
}
