/**
 * 🧠 UNIFIED CAPABILITY REGISTRY
 * Single source of truth for AI capabilities - ensures the AI knows exactly what it can do
 */

export interface AICapability {
  id: string
  name: string
  description: string
  category: 'analysis' | 'generation' | 'interaction' | 'research' | 'automation'
  availability: 'always' | 'contextual' | 'premium'
  triggerKeywords: string[]
  examples: string[]
  apiEndpoint?: string
  requirements?: {
    sessionId?: boolean
    userEmail?: boolean
    multimodal?: boolean
  }
}

// 🎯 COMPLETE CAPABILITY DEFINITIONS
export const AI_CAPABILITIES: Record<string, AICapability> = {
  // 💰 Financial Analysis
  roi: {
    id: 'roi',
    name: 'ROI Calculator',
    description: 'Calculate return on investment with detailed financial analysis including payback period and net profit projections',
    category: 'analysis',
    availability: 'always',
    triggerKeywords: ['roi', 'return on investment', 'calculate', 'profit', 'financial', 'payback'],
    examples: [
      'Calculate ROI for a $10k automation project',
      'What\'s the payback period for this investment?',
      'Help me analyze the financial impact'
    ],
    apiEndpoint: '/api/tools/roi'
  },

  // 🔍 Research & Analysis  
  search: {
    id: 'search',
    name: 'Grounded Web Search', 
    description: 'Search the web for current information and provide grounded, cited answers',
    category: 'research',
    availability: 'always',
    triggerKeywords: ['search', 'find', 'research', 'latest', 'current', 'news'],
    examples: [
      'Search for latest AI automation trends',
      'Find information about company X',
      'What are current market conditions?'
    ],
    apiEndpoint: '/api/tools/search'
  },

  leadResearch: {
    id: 'leadResearch',
    name: 'Lead Research',
    description: 'Automatically research companies and contacts using their email/domain',
    category: 'research', 
    availability: 'contextual',
    triggerKeywords: ['company', 'research lead', 'background', 'profile'],
    examples: [
      'Research this company for me',
      'What can you tell me about their background?'
    ],
    requirements: { sessionId: true, userEmail: true }
  },

  // 📄 Document Processing
  doc: {
    id: 'doc',
    name: 'Document Analysis',
    description: 'Analyze uploaded documents, PDFs, and files for insights and summaries',
    category: 'analysis',
    availability: 'always', 
    triggerKeywords: ['document', 'pdf', 'analyze', 'upload', 'file'],
    examples: [
      'Analyze this contract for key terms',
      'Summarize this business plan',
      'Extract insights from this report'
    ],
    apiEndpoint: '/api/tools/doc'
  },

  // 🎭 Multimodal Capabilities
  voice: {
    id: 'voice',
    name: 'Voice Chat',
    description: 'Real-time voice conversations with transcription and natural speech responses',
    category: 'interaction',
    availability: 'always',
    triggerKeywords: ['voice', 'speak', 'talk', 'audio', 'microphone'],
    examples: [
      'Let\'s have a voice conversation',
      'I want to speak instead of type',
      'Enable voice mode'
    ],
    apiEndpoint: '/api/gemini-live',
    requirements: { multimodal: true }
  },

  webcam: {
    id: 'webcam',
    name: 'Webcam Capture',
    description: 'Capture and analyze images from your webcam in real-time',
    category: 'interaction',
    availability: 'always',
    triggerKeywords: ['webcam', 'camera', 'photo', 'capture', 'see'],
    examples: [
      'Take a photo and analyze it',
      'Show me what you can see',
      'Capture this with webcam'
    ],
    apiEndpoint: '/api/tools/webcam',
    requirements: { multimodal: true }
  },

  screenShare: {
    id: 'screenShare', 
    name: 'Screen Share Analysis',
    description: 'Share your screen for real-time analysis and workflow optimization',
    category: 'analysis',
    availability: 'always',
    triggerKeywords: ['screen', 'share', 'workflow', 'process', 'audit'],
    examples: [
      'Analyze my workflow process',
      'Share screen for feedback', 
      'Review this interface'
    ],
    apiEndpoint: '/api/tools/screen',
    requirements: { multimodal: true }
  },

  image: {
    id: 'image',
    name: 'Image Analysis', 
    description: 'Analyze uploaded images for content, objects, text, and business insights',
    category: 'analysis',
    availability: 'always',
    triggerKeywords: ['image', 'picture', 'analyze', 'upload', 'visual'],
    examples: [
      'Analyze this business chart',
      'What do you see in this image?',
      'Extract text from this screenshot'
    ],
    apiEndpoint: '/api/tools/webcam'
  },

  // 🎥 Content Generation
  video2app: {
    id: 'video2app',
    name: 'Video to App Generator',
    description: 'Convert video content (YouTube links) into interactive app blueprints and code',
    category: 'generation',
    availability: 'always',
    triggerKeywords: ['video', 'youtube', 'app', 'generate', 'blueprint', 'code'],
    examples: [
      'Turn this YouTube video into an app',
      'Generate app from video tutorial',
      'Create blueprint from this demo'
    ],
    apiEndpoint: '/api/video-to-app'
  },

  codeGen: {
    id: 'codeGen',
    name: 'Code Generation',
    description: 'Generate code, components, and technical blueprints based on requirements',
    category: 'generation', 
    availability: 'always',
    triggerKeywords: ['code', 'generate', 'component', 'build', 'create', 'blueprint'],
    examples: [
      'Generate a React component',
      'Create a database schema',
      'Build a function for this'
    ]
  },

  // 🌐 Communication  
  translate: {
    id: 'translate',
    name: 'Translation',
    description: 'Translate text between multiple languages with context awareness',
    category: 'automation',
    availability: 'always', 
    triggerKeywords: ['translate', 'language', 'español', 'français', 'deutsch'],
    examples: [
      'Translate this to Spanish',
      'Convert to French',
      'What does this mean in English?'
    ],
    apiEndpoint: '/api/tools/translate'
  },

  meetings: {
    id: 'meetings',
    name: 'Meeting Scheduler',
    description: 'Schedule consultations and meetings via integrated calendar system',
    category: 'automation',
    availability: 'always',
    triggerKeywords: ['meeting', 'schedule', 'book', 'appointment', 'call', 'consultation'],
    examples: [
      'Book a consultation call',
      'Schedule a meeting',
      'Set up a discovery session'
    ],
    apiEndpoint: '/api/meetings/book'
  },

  exportPdf: {
    id: 'exportPdf',
    name: 'PDF Generation',
    description: 'Generate professional PDF summaries and reports from conversations',
    category: 'automation',
    availability: 'contextual',
    triggerKeywords: ['pdf', 'export', 'summary', 'report', 'document'],
    examples: [
      'Generate a PDF summary',
      'Export our conversation',
      'Create a report'
    ],
    apiEndpoint: '/api/chat/unified',
    requirements: { sessionId: true }
  },

  // 📊 Advanced Analysis
  calculate: {
    id: 'calculate', 
    name: 'Custom Calculations',
    description: 'Perform complex business calculations and financial modeling',
    category: 'analysis',
    availability: 'always',
    triggerKeywords: ['calculate', 'math', 'formula', 'compute', 'numbers'],
    examples: [
      'Calculate monthly recurring revenue',
      'Compute customer acquisition cost',
      'What\'s the break-even point?'
    ],
    apiEndpoint: '/api/tools/calc'
  },

  urlContext: {
    id: 'urlContext',
    name: 'URL Context Analysis', 
    description: 'Analyze websites and URLs for business context and insights',
    category: 'research',
    availability: 'always',
    triggerKeywords: ['website', 'url', 'analyze site', 'company website'],
    examples: [
      'Analyze this company website',
      'What can you tell me about their site?',
      'Review this landing page'
    ],
    apiEndpoint: '/api/tools/url'
  }
}

// 🎯 CAPABILITY CATEGORIES
export const CAPABILITY_CATEGORIES = {
  analysis: {
    name: 'Analysis & Research',
    description: 'Deep analysis of data, documents, and business metrics',
    color: 'blue'
  },
  generation: {
    name: 'Content Generation', 
    description: 'Create code, apps, and content from inputs',
    color: 'purple'
  },
  interaction: {
    name: 'Interactive Tools',
    description: 'Real-time voice, video, and screen interaction',
    color: 'green'
  },
  research: {
    name: 'Research & Discovery',
    description: 'Find and analyze information about people and companies', 
    color: 'orange'
  },
  automation: {
    name: 'Business Automation',
    description: 'Automate workflows and business processes',
    color: 'red'
  }
} as const

// 🧠 CAPABILITY DISCOVERY FUNCTIONS
export function getAvailableCapabilities(context?: {
  hasSessionId?: boolean
  hasUserEmail?: boolean  
  supportsMultimodal?: boolean
}): AICapability[] {
  return Object.values(AI_CAPABILITIES).filter(cap => {
    if (cap.availability === 'premium') return false // Not implemented yet
    
    if (cap.requirements) {
      if (cap.requirements.sessionId && !context?.hasSessionId) return false
      if (cap.requirements.userEmail && !context?.hasUserEmail) return false
      if (cap.requirements.multimodal && !context?.supportsMultimodal) return false
    }
    
    return true
  })
}

export function getCapabilityByKeyword(keyword: string): AICapability[] {
  const matches: AICapability[] = []
  const lowerKeyword = keyword.toLowerCase()
  
  Object.values(AI_CAPABILITIES).forEach(cap => {
    if (cap.triggerKeywords.some(trigger => 
      trigger.toLowerCase().includes(lowerKeyword) || 
      lowerKeyword.includes(trigger.toLowerCase())
    )) {
      matches.push(cap)
    }
  })
  
  return matches
}

export function formatCapabilitiesForPrompt(capabilities: AICapability[]): string {
  const byCategory = capabilities.reduce((acc, cap) => {
    (acc[cap.category] ??= []).push(cap)
    return acc
  }, {} as Record<string, AICapability[]>)

  let prompt = "\n## YOUR AVAILABLE TOOLS & CAPABILITIES\n"
  
  Object.entries(byCategory).forEach(([category, caps]) => {
    const categoryInfo = CAPABILITY_CATEGORIES[category as keyof typeof CAPABILITY_CATEGORIES]
    if (!categoryInfo) return; // Guard against undefined category
    prompt += `\n### ${categoryInfo.name}\n`
    
    caps.forEach(cap => {
      prompt += `- **${cap.name}**: ${cap.description}\n`
      if (cap.examples.length > 0) {
        prompt += `  Examples: "${cap.examples[0]}", "${cap.examples[1] || cap.examples[0]}"\n`
      }
    })
  })
  
  prompt += `\n**When users mention these keywords or ask for help, proactively suggest the relevant tool!**\n`
  
  return prompt
}

// 🎯 EXPORT FOR SYSTEM PROMPT INTEGRATION
export function getCapabilityAwareSystemPrompt(context?: {
  hasSessionId?: boolean
  hasUserEmail?: boolean
  supportsMultimodal?: boolean
  leadContext?: any
}): string {
  const availableCapabilities = getAvailableCapabilities(context)
  const capabilityPrompt = formatCapabilitiesForPrompt(availableCapabilities)
  
  return capabilityPrompt
}
