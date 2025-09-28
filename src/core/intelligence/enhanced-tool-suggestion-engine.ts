import { logger } from '@/src/lib/logger';
import { vercelCache, CACHE_CONFIGS } from '@/src/lib/vercel-cache';

export interface ToolCapability {
  id: string;
  name: string;
  description: string;
  category: 'analysis' | 'communication' | 'productivity' | 'development' | 'research' | 'automation';
  requiredContext: string[];
  triggers: string[];
  confidence: number;
  estimatedTime: number; // in seconds
  complexity: 'low' | 'medium' | 'high';
}

export interface ToolSuggestion {
  tool: ToolCapability;
  confidence: number;
  reasoning: string[];
  contextMatch: number;
  urgency: 'low' | 'medium' | 'high';
  suggestedParameters?: Record<string, any>;
}

export interface ToolSuggestionResult {
  suggestions: ToolSuggestion[];
  primarySuggestion?: ToolSuggestion;
  reasoning: string[];
  metadata: {
    processingTime: number;
    contextQuality: 'high' | 'medium' | 'low';
    suggestionCount: number;
  };
}

export interface SuggestionContext {
  message: string;
  intent?: string;
  userRole?: string;
  conversationHistory?: string[];
  currentContext?: Record<string, any>;
  availableTools?: string[];
  sessionId?: string;
  timestamp: Date;
}

export class EnhancedToolSuggestionEngine {
  private availableTools: ToolCapability[] = [];
  private toolTriggers: Map<string, string[]> = new Map();
  private contextPatterns: Map<string, RegExp[]> = new Map();

  constructor() {
    this.initializeAvailableTools();
    this.initializeToolTriggers();
    this.initializeContextPatterns();
  }

  private initializeAvailableTools() {
    this.availableTools = [
      // Analysis Tools
      {
        id: 'analyze_image',
        name: 'Image Analysis',
        description: 'Analyze images for content, text, and insights',
        category: 'analysis',
        requiredContext: ['image_data', 'analysis_request'],
        triggers: ['analyze image', 'what is in this image', 'describe picture', 'image analysis'],
        confidence: 0.9,
        estimatedTime: 30,
        complexity: 'medium'
      },
      {
        id: 'web_search',
        name: 'Web Search',
        description: 'Search the web for current information and latest updates',
        category: 'research',
        requiredContext: ['search_query', 'information_request'],
        triggers: ['search for', 'find information', 'look up', 'research', 'latest news'],
        confidence: 0.8,
        estimatedTime: 15,
        complexity: 'low'
      },
      {
        id: 'document_analysis',
        name: 'Document Analysis',
        description: 'Analyze PDF, Word, and other documents for key insights',
        category: 'analysis',
        requiredContext: ['document_data', 'analysis_request'],
        triggers: ['analyze document', 'read pdf', 'document insights', 'summarize document'],
        confidence: 0.85,
        estimatedTime: 45,
        complexity: 'high'
      },

      // Communication Tools
      {
        id: 'send_email',
        name: 'Email Composition',
        description: 'Compose and send professional emails',
        category: 'communication',
        requiredContext: ['recipient', 'subject', 'content'],
        triggers: ['send email', 'compose message', 'write email', 'contact'],
        confidence: 0.7,
        estimatedTime: 60,
        complexity: 'medium'
      },
      {
        id: 'schedule_meeting',
        name: 'Meeting Scheduler',
        description: 'Schedule meetings and send calendar invites',
        category: 'productivity',
        requiredContext: ['participants', 'time', 'duration'],
        triggers: ['schedule meeting', 'set up call', 'book time', 'calendar invite'],
        confidence: 0.75,
        estimatedTime: 30,
        complexity: 'medium'
      },

      // Development Tools
      {
        id: 'code_review',
        name: 'Code Review',
        description: 'Review code for quality, security, and performance',
        category: 'development',
        requiredContext: ['code_snippet', 'language', 'review_type'],
        triggers: ['review code', 'check code', 'code quality', 'security audit'],
        confidence: 0.8,
        estimatedTime: 90,
        complexity: 'high'
      },
      {
        id: 'generate_code',
        name: 'Code Generation',
        description: 'Generate code snippets and functions',
        category: 'development',
        requiredContext: ['requirements', 'language', 'framework'],
        triggers: ['generate code', 'write function', 'create script', 'code example'],
        confidence: 0.75,
        estimatedTime: 60,
        complexity: 'medium'
      },

      // Research Tools
      {
        id: 'lead_research',
        name: 'Lead Research',
        description: 'Research companies and individuals for business development',
        category: 'research',
        requiredContext: ['email', 'name', 'company'],
        triggers: ['research lead', 'find contact', 'company research', 'background check'],
        confidence: 0.9,
        estimatedTime: 120,
        complexity: 'high'
      },
      {
        id: 'market_analysis',
        name: 'Market Analysis',
        description: 'Analyze market trends and competitive landscape',
        category: 'analysis',
        requiredContext: ['market', 'competitors', 'trends'],
        triggers: ['market analysis', 'competitive research', 'industry trends', 'market research'],
        confidence: 0.8,
        estimatedTime: 180,
        complexity: 'high'
      },

      // Automation Tools
      {
        id: 'workflow_automation',
        name: 'Workflow Automation',
        description: 'Automate repetitive tasks and processes',
        category: 'automation',
        requiredContext: ['workflow_steps', 'trigger_conditions'],
        triggers: ['automate workflow', 'create automation', 'schedule task', 'recurring task'],
        confidence: 0.7,
        estimatedTime: 300,
        complexity: 'high'
      },
      {
        id: 'data_processing',
        name: 'Data Processing',
        description: 'Process and transform data automatically',
        category: 'automation',
        requiredContext: ['data_source', 'transformation_rules'],
        triggers: ['process data', 'transform data', 'data pipeline', 'etl process'],
        confidence: 0.75,
        estimatedTime: 150,
        complexity: 'high'
      },

      // Productivity Tools
      {
        id: 'task_management',
        name: 'Task Management',
        description: 'Create, assign, and track tasks',
        category: 'productivity',
        requiredContext: ['task_description', 'assignees', 'deadline'],
        triggers: ['create task', 'assign task', 'track progress', 'todo list'],
        confidence: 0.8,
        estimatedTime: 20,
        complexity: 'low'
      },
      {
        id: 'note_taking',
        name: 'Note Taking',
        description: 'Capture and organize notes and ideas',
        category: 'productivity',
        requiredContext: ['content', 'category', 'tags'],
        triggers: ['take notes', 'capture idea', 'record thoughts', 'brainstorm'],
        confidence: 0.85,
        estimatedTime: 15,
        complexity: 'low'
      },

      // Communication Tools
      {
        id: 'translation',
        name: 'Translation',
        description: 'Translate text between languages',
        category: 'communication',
        requiredContext: ['text', 'target_language', 'source_language'],
        triggers: ['translate', 'convert language', 'language translation', 'multilingual'],
        confidence: 0.9,
        estimatedTime: 10,
        complexity: 'low'
      },
      {
        id: 'summarization',
        name: 'Content Summarization',
        description: 'Summarize long content into key points',
        category: 'productivity',
        requiredContext: ['content', 'length_preference', 'focus_areas'],
        triggers: ['summarize', 'key points', 'main ideas', 'condense', 'tl;dr'],
        confidence: 0.85,
        estimatedTime: 25,
        complexity: 'medium'
      }
    ];
  }

  private initializeToolTriggers() {
    // Technical triggers
    this.toolTriggers.set('technical', [
      'code', 'programming', 'development', 'api', 'database', 'server', 'debug', 'error', 'bug'
    ]);

    // Business triggers
    this.toolTriggers.set('business', [
      'meeting', 'client', 'project', 'deadline', 'presentation', 'proposal', 'contract', 'sales'
    ]);

    // Research triggers
    this.toolTriggers.set('research', [
      'research', 'find', 'search', 'information', 'data', 'analysis', 'report', 'study'
    ]);

    // Communication triggers
    this.toolTriggers.set('communication', [
      'email', 'message', 'call', 'contact', 'discuss', 'talk', 'speak', 'write'
    ]);
  }

  private initializeContextPatterns() {
    // Time-sensitive patterns
    this.contextPatterns.set('urgent', [
      /\b(urgent|asap|emergency|critical|immediately|deadline|due)\b/i,
      /\b(tomorrow|today|now|quickly|rush)\b/i
    ]);

    // Complex task patterns
    this.contextPatterns.set('complex', [
      /\b(complex|difficult|challenging|advanced|detailed|comprehensive)\b/i,
      /\b(research|analysis|strategy|planning|architecture|design)\b/i
    ]);

    // Simple task patterns
    this.contextPatterns.set('simple', [
      /\b(simple|quick|basic|easy|fast)\b/i,
      /\b(lookup|find|search|check|get)\b/i
    ]);
  }

  async suggestTools(context: SuggestionContext): Promise<ToolSuggestionResult> {
    const startTime = Date.now();
    const requestId = `tool_suggest_${Date.now()}`;

    logger.info('Starting enhanced tool suggestion', {
      requestId,
      messageLength: context.message.length,
      hasIntent: !!context.intent,
      hasRole: !!context.userRole
    });

    try {
      // Check cache first
      const cacheKey = `tool_suggestions_${this.hashMessage(context.message)}_${context.intent || 'no_intent'}`;
      const cached = await vercelCache.get<ToolSuggestionResult>('intelligence', cacheKey);

      if (cached) {
        logger.debug('Using cached tool suggestions', { requestId, cacheKey });
        return cached;
      }

      // Multi-layered tool analysis
      const analysisResults = await Promise.all([
        this.analyzeIntentMatching(context),
        this.analyzeKeywordTriggers(context),
        this.analyzeContextualRelevance(context),
        this.analyzeComplexityAndUrgency(context)
      ]);

      // Combine and rank suggestions
      const combinedResult = this.combineToolAnalysis(analysisResults);

      // Apply advanced filtering and ranking
      const finalResult = this.applyAdvancedFiltering(combinedResult, context);

      // Cache the result
      await vercelCache.set('intelligence', cacheKey, finalResult, {
        ttl: CACHE_CONFIGS.INTELLIGENCE.ttl,
        tags: ['tool_suggestions', 'intelligence']
      });

      const processingTime = Date.now() - startTime;
      finalResult.metadata.processingTime = processingTime;

      logger.info('Enhanced tool suggestion completed', {
        requestId,
        suggestionCount: finalResult.suggestions.length,
        primaryTool: finalResult.primarySuggestion?.tool.name,
        processingTime
      });

      return finalResult;

    } catch (error) {
      logger.error('Enhanced tool suggestion failed', error instanceof Error ? error : new Error('Unknown error'), {
        requestId,
        messageLength: context.message.length,
        type: 'tool_suggestion_error'
      });

      // Return fallback result
      return this.getFallbackToolResult(context, Date.now() - startTime);
    }
  }

  private async analyzeIntentMatching(context: SuggestionContext): Promise<Partial<ToolSuggestionResult>> {
    const { message, intent } = context;
    const messageLower = message.toLowerCase();

    if (!intent) {
      return {
        suggestions: [],
        reasoning: ['No intent provided for matching']
      };
    }

    // Map intents to tool categories
    const intentToolMapping: Record<string, string[]> = {
      information_request: ['web_search', 'document_analysis', 'summarization'],
      problem_solving: ['code_review', 'document_analysis', 'market_analysis'],
      decision_making: ['market_analysis', 'lead_research', 'data_processing'],
      collaboration: ['schedule_meeting', 'send_email', 'task_management'],
      analysis: ['analyze_image', 'document_analysis', 'market_analysis', 'data_processing'],
      creative: ['generate_code', 'note_taking', 'summarization'],
      transactional: ['send_email', 'schedule_meeting', 'task_management'],
      social: ['send_email', 'schedule_meeting']
    };

    const suggestedToolIds = intentToolMapping[intent] || [];
    const suggestions: ToolSuggestion[] = [];

    for (const toolId of suggestedToolIds) {
      const tool = this.availableTools.find(t => t.id === toolId);
      if (tool) {
        const confidence = this.calculateIntentMatchConfidence(intent, tool, messageLower);
        suggestions.push({
          tool,
          confidence,
          reasoning: [`Matches intent: ${intent}`, `Tool category: ${tool.category}`],
          contextMatch: 0.8,
          urgency: 'medium'
        });
      }
    }

    return {
      suggestions,
      reasoning: [`Intent-based matching for: ${intent}`]
    };
  }

  private async analyzeKeywordTriggers(context: SuggestionContext): Promise<Partial<ToolSuggestionResult>> {
    const { message } = context;
    const messageLower = message.toLowerCase();

    const suggestions: ToolSuggestion[] = [];
    const reasoning: string[] = [];

    // Check direct tool triggers
    for (const tool of this.availableTools) {
      const matches = tool.triggers.filter(trigger =>
        messageLower.includes(trigger.toLowerCase())
      );

      if (matches.length > 0) {
        const confidence = matches.length * 0.3; // Base confidence from trigger matches
        suggestions.push({
          tool,
          confidence,
          reasoning: [`Direct trigger matches: ${matches.join(', ')}`],
          contextMatch: 0.9,
          urgency: 'high'
        });
        reasoning.push(`Found ${matches.length} trigger matches for ${tool.name}`);
      }
    }

    // Check contextual triggers
    for (const [contextType, keywords] of this.toolTriggers.entries()) {
      const matches = keywords.filter(keyword =>
        messageLower.includes(keyword.toLowerCase())
      );

      if (matches.length > 0) {
        // Find tools that match this context
        const contextTools = this.availableTools.filter(tool =>
          this.isToolRelevantForContext(tool, contextType)
        );

        for (const tool of contextTools) {
          const existingSuggestion = suggestions.find(s => s.tool.id === tool.id);
          if (existingSuggestion) {
            existingSuggestion.confidence += 0.2;
            existingSuggestion.reasoning.push(`Context match: ${contextType}`);
          } else {
            suggestions.push({
              tool,
              confidence: 0.4,
              reasoning: [`Context match: ${contextType}`, `Keywords: ${matches.join(', ')}`],
              contextMatch: 0.7,
              urgency: 'medium'
            });
          }
        }
      }
    }

    return {
      suggestions,
      reasoning
    };
  }

  private async analyzeContextualRelevance(context: SuggestionContext): Promise<Partial<ToolSuggestionResult>> {
    const { message, userRole, conversationHistory = [] } = context;
    const suggestions: ToolSuggestion[] = [];

    // Role-based tool suggestions
    if (userRole) {
      const roleTools = this.getToolsForRole(userRole);
      for (const tool of roleTools) {
        const relevance = this.calculateRoleRelevance(userRole, tool);
        if (relevance > 0.3) {
          suggestions.push({
            tool,
            confidence: relevance,
            reasoning: [`Role-based suggestion for: ${userRole}`],
            contextMatch: relevance,
            urgency: 'medium'
          });
        }
      }
    }

    // Conversation history analysis
    if (conversationHistory.length > 0) {
      const conversationContext = this.analyzeConversationContext(conversationHistory);
      const contextTools = this.getToolsForConversationContext(conversationContext);

      for (const tool of contextTools) {
        suggestions.push({
          tool,
          confidence: 0.5,
          reasoning: [`Conversation context: ${conversationContext}`],
          contextMatch: 0.6,
          urgency: 'low'
        });
      }
    }

    return {
      suggestions,
      reasoning: ['Contextual relevance analysis completed']
    };
  }

  private async analyzeComplexityAndUrgency(context: SuggestionContext): Promise<Partial<ToolSuggestionResult>> {
    const { message } = context;
    const messageLower = message.toLowerCase();

    // Analyze complexity
    const complexityPatterns = this.contextPatterns.get('complex') || [];
    const simplePatterns = this.contextPatterns.get('simple') || [];
    const urgentPatterns = this.contextPatterns.get('urgent') || [];

    const isComplex = complexityPatterns.some(pattern => pattern.test(message));
    const isSimple = simplePatterns.some(pattern => pattern.test(message));
    const isUrgent = urgentPatterns.some(pattern => pattern.test(message));

    // Adjust tool suggestions based on complexity and urgency
    const complexityMultiplier = isComplex ? 1.2 : isSimple ? 0.8 : 1.0;
    const urgencyMultiplier = isUrgent ? 1.3 : 1.0;

    return {
      reasoning: [
        `Complexity: ${isComplex ? 'high' : isSimple ? 'low' : 'medium'}`,
        `Urgency: ${isUrgent ? 'high' : 'normal'}`,
        `Applied multipliers: complexity=${complexityMultiplier}, urgency=${urgencyMultiplier}`
      ]
    };
  }

  private combineToolAnalysis(analyses: Partial<ToolSuggestionResult>[]): ToolSuggestionResult {
    // Combine all suggestions
    const allSuggestions = analyses.flatMap(analysis => analysis.suggestions || []);

    // Group by tool ID and combine scores
    const toolGroups = new Map<string, ToolSuggestion[]>();

    for (const suggestion of allSuggestions) {
      const existing = toolGroups.get(suggestion.tool.id) || [];
      existing.push(suggestion);
      toolGroups.set(suggestion.tool.id, existing);
    }

    // Combine suggestions for each tool
    const combinedSuggestions: ToolSuggestion[] = [];

    for (const [toolId, toolSuggestions] of toolGroups.entries()) {
      const tool = toolSuggestions[0].tool;
      const avgConfidence = toolSuggestions.reduce((sum, s) => sum + s.confidence, 0) / toolSuggestions.length;
      const allReasoning = toolSuggestions.flatMap(s => s.reasoning);
      const avgContextMatch = toolSuggestions.reduce((sum, s) => sum + s.contextMatch, 0) / toolSuggestions.length;

      // Determine urgency based on highest urgency in group
      const urgencyLevels = toolSuggestions.map(s => s.urgency);
      const urgencyScores = { low: 1, medium: 2, high: 3 };
      const maxUrgencyScore = Math.max(...urgencyLevels.map(u => urgencyScores[u]));
      const urgency = maxUrgencyScore >= 3 ? 'high' : maxUrgencyScore >= 2 ? 'medium' : 'low';

      combinedSuggestions.push({
        tool,
        confidence: Math.min(avgConfidence, 1.0),
        reasoning: allReasoning,
        contextMatch: avgContextMatch,
        urgency
      });
    }

    // Sort by combined confidence
    combinedSuggestions.sort((a, b) => b.confidence - a.confidence);

    // Select primary suggestion (highest confidence)
    const primarySuggestion = combinedSuggestions.length > 0 ? combinedSuggestions[0] : undefined;

    // Combine all reasoning
    const allReasoning = analyses.flatMap(analysis => analysis.reasoning || []);

    return {
      suggestions: combinedSuggestions.slice(0, 5), // Top 5 suggestions
      primarySuggestion,
      reasoning: allReasoning,
      metadata: {
        processingTime: 0,
        contextQuality: combinedSuggestions.length > 0 ? 'high' : 'medium',
        suggestionCount: combinedSuggestions.length
      }
    };
  }

  private applyAdvancedFiltering(result: ToolSuggestionResult, context: SuggestionContext): ToolSuggestionResult {
    const { availableTools = [] } = context;

    // Filter out unavailable tools
    if (availableTools.length > 0) {
      result.suggestions = result.suggestions.filter(suggestion =>
        availableTools.includes(suggestion.tool.id)
      );
    }

    // Boost confidence for tools that match user role
    if (context.userRole) {
      for (const suggestion of result.suggestions) {
        const roleBoost = this.calculateRoleBoost(context.userRole, suggestion.tool);
        suggestion.confidence = Math.min(suggestion.confidence + roleBoost, 1.0);
        if (roleBoost > 0) {
          suggestion.reasoning.push(`Role relevance boost: +${roleBoost.toFixed(2)}`);
        }
      }
    }

    // Re-sort after filtering and boosting
    result.suggestions.sort((a, b) => b.confidence - a.confidence);

    // Update primary suggestion
    result.primarySuggestion = result.suggestions.length > 0 ? result.suggestions[0] : undefined;

    return result;
  }

  private calculateIntentMatchConfidence(intent: string, tool: ToolCapability, message: string): number {
    // Base confidence from intent mapping
    let confidence = 0.6;

    // Boost for exact keyword matches
    const matchingTriggers = tool.triggers.filter(trigger =>
      message.includes(trigger.toLowerCase())
    );

    confidence += matchingTriggers.length * 0.1;

    // Adjust based on tool complexity vs intent complexity
    const intentComplexity = this.getIntentComplexity(intent);
    const complexityMatch = intentComplexity === tool.complexity ? 0.2 : 0;

    return Math.min(confidence + complexityMatch, 1.0);
  }

  private getIntentComplexity(intent: string): 'low' | 'medium' | 'high' {
    const complexityMap: Record<string, 'low' | 'medium' | 'high'> = {
      information_request: 'low',
      social: 'low',
      problem_solving: 'medium',
      decision_making: 'medium',
      collaboration: 'medium',
      analysis: 'high',
      creative: 'high',
      transactional: 'medium'
    };

    return complexityMap[intent] || 'medium';
  }

  private isToolRelevantForContext(tool: ToolCapability, contextType: string): boolean {
    // Define which tools are relevant for different contexts
    const contextToolMap: Record<string, string[]> = {
      technical: ['analyze_image', 'code_review', 'generate_code', 'document_analysis'],
      business: ['send_email', 'schedule_meeting', 'lead_research', 'market_analysis', 'task_management'],
      research: ['web_search', 'lead_research', 'market_analysis', 'document_analysis'],
      communication: ['send_email', 'schedule_meeting', 'translation', 'summarization']
    };

    return contextToolMap[contextType]?.includes(tool.id) || false;
  }

  private getToolsForRole(role: string): ToolCapability[] {
    // Role-based tool recommendations
    const roleToolMap: Record<string, string[]> = {
      developer: ['code_review', 'generate_code', 'analyze_image', 'document_analysis'],
      manager: ['task_management', 'schedule_meeting', 'send_email', 'market_analysis'],
      executive: ['lead_research', 'market_analysis', 'schedule_meeting', 'workflow_automation'],
      analyst: ['document_analysis', 'market_analysis', 'data_processing', 'summarization'],
      designer: ['analyze_image', 'note_taking', 'summarization', 'generate_code']
    };

    const toolIds = roleToolMap[role.toLowerCase()] || [];
    return this.availableTools.filter(tool => toolIds.includes(tool.id));
  }

  private calculateRoleRelevance(role: string, tool: ToolCapability): number {
    const roleTools = this.getToolsForRole(role);
    return roleTools.some(t => t.id === tool.id) ? 0.3 : 0;
  }

  private analyzeConversationContext(history: string[]): string {
    const recentMessages = history.slice(-3).join(' ').toLowerCase();

    if (recentMessages.includes('code') || recentMessages.includes('development')) {
      return 'technical';
    }
    if (recentMessages.includes('meeting') || recentMessages.includes('schedule')) {
      return 'coordination';
    }
    if (recentMessages.includes('research') || recentMessages.includes('analysis')) {
      return 'research';
    }

    return 'general';
  }

  private getToolsForConversationContext(contextType: string): ToolCapability[] {
    const contextMap: Record<string, string[]> = {
      technical: ['code_review', 'generate_code', 'analyze_image'],
      coordination: ['schedule_meeting', 'task_management', 'send_email'],
      research: ['web_search', 'lead_research', 'document_analysis']
    };

    const toolIds = contextMap[contextType] || [];
    return this.availableTools.filter(tool => toolIds.includes(tool.id));
  }

  private hashMessage(message: string): string {
    // Simple hash for cache keys
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private getFallbackToolResult(context: SuggestionContext, processingTime: number): ToolSuggestionResult {
    return {
      suggestions: [],
      reasoning: ['Tool suggestion failed, using fallback'],
      metadata: {
        processingTime,
        contextQuality: 'low',
        suggestionCount: 0
      }
    };
  }

  // Public method to get available tools for UI
  getAvailableTools(category?: string): ToolCapability[] {
    if (category) {
      return this.availableTools.filter(tool => tool.category === category);
    }
    return this.availableTools;
  }

  // Method to update tool effectiveness based on usage feedback
  updateToolEffectiveness(toolId: string, feedback: 'effective' | 'ineffective', usageContext: string) {
    logger.info('Tool effectiveness feedback received', {
      toolId,
      feedback,
      usageContext,
      type: 'tool_feedback'
    });

    // This would implement machine learning feedback loop
    // For now, just log for future analysis
  }

  // Helper method to calculate role-based confidence boost
  private calculateRoleBoost(role: string, tool: ToolCapability): number {
    const roleTools = this.getToolsForRole(role);
    return roleTools.some(t => t.id === tool.id) ? 0.3 : 0;
  }
}

// Export singleton instance
export const enhancedToolSuggestionEngine = new EnhancedToolSuggestionEngine();
