import { logger } from '@/src/lib/logger';
import { vercelCache, CACHE_CONFIGS } from '@/src/lib/vercel-cache';

export interface IntentCategory {
  id: string;
  name: string;
  description: string;
  confidence: number;
  subcategories?: IntentCategory[];
  keywords: string[];
  contextPatterns: string[];
}

export interface IntentClassificationResult {
  primaryIntent: IntentCategory;
  confidence: number;
  alternativeIntents: IntentCategory[];
  reasoning: string[];
  context: {
    urgency: 'low' | 'medium' | 'high' | 'critical';
    complexity: 'simple' | 'moderate' | 'complex';
    sentiment: 'positive' | 'neutral' | 'negative';
    requiresAction: boolean;
  };
  suggestedActions: string[];
  metadata: {
    processingTime: number;
    tokensUsed?: number;
    model?: string;
  };
}

export interface IntentContext {
  message: string;
  sessionId?: string;
  userId?: string;
  conversationHistory?: string[];
  currentContext?: Record<string, any>;
  timestamp: Date;
}

export class AdvancedIntentClassifier {
  private intentCategories: IntentCategory[] = [];
  private nlpPatterns: Map<string, RegExp[]> = new Map();

  constructor() {
    this.initializeIntentCategories();
    this.initializeNLPPatterns();
  }

  private initializeIntentCategories() {
    this.intentCategories = [
      {
        id: 'information_request',
        name: 'Information Request',
        description: 'User is asking for information, data, or explanations',
        confidence: 0,
        keywords: ['what', 'how', 'when', 'where', 'why', 'explain', 'tell me', 'information', 'details'],
        contextPatterns: ['question_words', 'learning_intent', 'curiosity_markers']
      },
      {
        id: 'problem_solving',
        name: 'Problem Solving',
        description: 'User needs help with a problem, issue, or challenge',
        confidence: 0,
        keywords: ['help', 'issue', 'problem', 'error', 'fix', 'solve', 'troubleshoot', 'stuck'],
        contextPatterns: ['frustration_indicators', 'urgency_markers', 'technical_terms']
      },
      {
        id: 'decision_making',
        name: 'Decision Making',
        description: 'User needs guidance on making choices or decisions',
        confidence: 0,
        keywords: ['should', 'choose', 'decide', 'option', 'alternative', 'recommend', 'advice'],
        contextPatterns: ['comparison_words', 'pros_cons', 'uncertainty_markers']
      },
      {
        id: 'collaboration',
        name: 'Collaboration',
        description: 'User wants to work together or coordinate',
        confidence: 0,
        keywords: ['work together', 'collaborate', 'team', 'meeting', 'schedule', 'coordinate'],
        contextPatterns: ['team_indicators', 'meeting_requests', 'coordination_words']
      },
      {
        id: 'analysis',
        name: 'Analysis',
        description: 'User wants data analysis, insights, or reporting',
        confidence: 0,
        keywords: ['analyze', 'report', 'data', 'metrics', 'insights', 'trends', 'statistics'],
        contextPatterns: ['analytical_terms', 'data_requests', 'reporting_indicators']
      },
      {
        id: 'creative',
        name: 'Creative',
        description: 'User is engaged in creative work or brainstorming',
        confidence: 0,
        keywords: ['create', 'design', 'brainstorm', 'idea', 'concept', 'innovate', 'build'],
        contextPatterns: ['creative_markers', 'innovation_terms', 'design_indicators']
      },
      {
        id: 'transactional',
        name: 'Transactional',
        description: 'User wants to complete a transaction or business process',
        confidence: 0,
        keywords: ['buy', 'purchase', 'order', 'payment', 'invoice', 'contract', 'agreement'],
        contextPatterns: ['business_terms', 'transactional_language', 'commercial_indicators']
      },
      {
        id: 'social',
        name: 'Social',
        description: 'User is engaging in social interaction or casual conversation',
        confidence: 0,
        keywords: ['hello', 'hi', 'thanks', 'chat', 'talk', 'social', 'casual'],
        contextPatterns: ['greeting_words', 'social_markers', 'casual_tone']
      }
    ];
  }

  private initializeNLPPatterns() {
    // Question patterns
    this.nlpPatterns.set('question_words', [
      /\b(what|how|when|where|why|who|which|whose|whom)\b/i,
      /\?$/, // Ends with question mark
      /\b(can you|could you|would you|do you|are you|is it)\b/i
    ]);

    // Urgency patterns
    this.nlpPatterns.set('urgency_markers', [
      /\b(urgent|asap|emergency|critical|immediately|right now|quickly)\b/i,
      /\b(!!!|‼️)/, // Multiple exclamation marks
      /\b(deadline|due date|by tomorrow|by today)\b/i
    ]);

    // Frustration patterns
    this.nlpPatterns.set('frustration_indicators', [
      /\b(damn|shit|crap|frustrating|annoying|terrible|awful)\b/i,
      /\b(not working|broken|failed|error|bug|issue)\b/i,
      /\b(!!!|😤|😠|😡)/ // Anger emojis
    ]);

    // Technical patterns
    this.nlpPatterns.set('technical_terms', [
      /\b(error|bug|exception|crash|debug|code|program|software)\b/i,
      /\b(api|endpoint|database|server|client|framework)\b/i,
      /\b(function|method|class|variable|algorithm)\b/i
    ]);

    // Business patterns
    this.nlpPatterns.set('business_terms', [
      /\b(meeting|call|presentation|proposal|contract|agreement)\b/i,
      /\b(client|customer|partner|vendor|supplier|stakeholder)\b/i,
      /\b(revenue|profit|sales|marketing|strategy|plan)\b/i
    ]);
  }

  async classifyIntent(context: IntentContext): Promise<IntentClassificationResult> {
    const startTime = Date.now();
    const requestId = `intent_classify_${Date.now()}`;

    logger.info('Starting advanced intent classification', {
      requestId,
      messageLength: context.message.length,
      hasHistory: !!context.conversationHistory?.length
    });

    try {
      // Check cache first
      const cacheKey = `intent_classification_${this.hashMessage(context.message)}_${context.sessionId || 'no_session'}`;
      const cached = await vercelCache.get<IntentClassificationResult>('intelligence', cacheKey);

      if (cached) {
        logger.debug('Using cached intent classification', { requestId, cacheKey });
        return cached;
      }

      // Multi-layered intent analysis
      const analysisResults = await Promise.all([
        this.analyzeKeywordPatterns(context),
        this.analyzeContextualPatterns(context),
        this.analyzeConversationalFlow(context),
        this.analyzeSentimentAndTone(context)
      ]);

      // Combine and rank intents
      const combinedResult = this.combineIntentAnalysis(analysisResults);

      // Apply advanced classification logic
      const finalResult = this.applyAdvancedClassification(combinedResult, context);

      // Cache the result
      await vercelCache.set('intelligence', cacheKey, finalResult, {
        ttl: CACHE_CONFIGS.INTELLIGENCE.ttl,
        tags: ['intent_classification', 'intelligence']
      });

      const processingTime = Date.now() - startTime;
      finalResult.metadata.processingTime = processingTime;

      logger.info('Advanced intent classification completed', {
        requestId,
        primaryIntent: finalResult.primaryIntent.name,
        confidence: finalResult.confidence,
        processingTime
      });

      return finalResult;

    } catch (error) {
      logger.error('Advanced intent classification failed', error instanceof Error ? error : new Error('Unknown error'), {
        requestId,
        messageLength: context.message.length,
        type: 'intent_classification_error'
      });

      // Return fallback result
      return this.getFallbackIntentResult(context, Date.now() - startTime);
    }
  }

  private async analyzeKeywordPatterns(context: IntentContext): Promise<Partial<IntentClassificationResult>> {
    const { message } = context;
    const messageLower = message.toLowerCase();

    // Score each intent category based on keyword matches
    const intentScores = this.intentCategories.map(category => {
      let score = 0;
      const matchedKeywords: string[] = [];

      // Direct keyword matches
      category.keywords.forEach(keyword => {
        if (messageLower.includes(keyword.toLowerCase())) {
          score += 1;
          matchedKeywords.push(keyword);
        }
      });

      // Pattern-based matches
      category.contextPatterns.forEach(patternKey => {
        const patterns = this.nlpPatterns.get(patternKey) || [];
        patterns.forEach(pattern => {
          if (pattern.test(message)) {
            score += 0.5;
          }
        });
      });

      return {
        category,
        score,
        matchedKeywords
      };
    });

    // Sort by score and get top intents
    intentScores.sort((a, b) => b.score - a.score);
    const topIntent = intentScores[0];

    if (!topIntent || topIntent.score === 0) {
      return {
        confidence: 0,
        reasoning: ['No clear keyword patterns detected'],
        suggestedActions: ['Ask clarifying questions']
      };
    }

    const reasoning = [
      `Keyword analysis: ${topIntent.matchedKeywords.join(', ')}`,
      `Pattern score: ${topIntent.score.toFixed(2)}`
    ];

    return {
      primaryIntent: topIntent.category,
      confidence: Math.min(topIntent.score / 5, 1), // Normalize to 0-1
      reasoning,
      suggestedActions: this.getSuggestedActions(topIntent.category.id),
      context: {
        urgency: this.detectUrgency(message),
        complexity: this.detectComplexity(message),
        sentiment: this.detectSentiment(message),
        requiresAction: this.requiresAction(topIntent.category.id)
      }
    };
  }

  private async analyzeContextualPatterns(context: IntentContext): Promise<Partial<IntentClassificationResult>> {
    const { message, conversationHistory = [] } = context;
    void message

    // Analyze conversation flow
    if (conversationHistory.length > 0) {
      const recentMessages = conversationHistory.slice(-3); // Last 3 messages
      const contextClues = this.extractContextClues(recentMessages);

      // Adjust intent based on conversation context
      if (contextClues.includes('follow_up')) {
        return {
          confidence: 0.3,
          reasoning: ['Follow-up conversation detected'],
          context: { urgency: 'medium', complexity: 'moderate', sentiment: 'neutral', requiresAction: true }
        };
      }

      if (contextClues.includes('technical_discussion')) {
        return {
          confidence: 0.4,
          reasoning: ['Technical conversation context detected'],
          context: { urgency: 'low', complexity: 'complex', sentiment: 'neutral', requiresAction: false }
        };
      }
    }

    return {
      confidence: 0.1,
      reasoning: ['Limited contextual information available']
    };
  }

  private async analyzeConversationalFlow(context: IntentContext): Promise<Partial<IntentClassificationResult>> {
    const { message } = context;

    // Analyze message patterns
    const hasQuestions = /\?/.test(message);
    const hasExclamations = /!/.test(message);
    const wordCount = message.split(' ').length;

    const flowAnalysis: Partial<IntentClassificationResult> = {
      confidence: 0,
      reasoning: [],
      context: {
        urgency: 'low',
        complexity: 'simple',
        sentiment: 'neutral',
        requiresAction: false
      }
    };

    // Long, detailed messages suggest complex intent
    if (wordCount > 50) {
      flowAnalysis.confidence += 0.2;
      flowAnalysis.reasoning.push('Detailed message suggests complex intent');
      flowAnalysis.context.complexity = 'complex';
    }

    // Questions suggest information-seeking
    if (hasQuestions) {
      flowAnalysis.confidence += 0.3;
      flowAnalysis.reasoning.push('Question format suggests information request');
      flowAnalysis.context.requiresAction = true;
    }

    // Exclamations suggest urgency or frustration
    if (hasExclamations) {
      flowAnalysis.confidence += 0.2;
      flowAnalysis.reasoning.push('Exclamations suggest urgency or emphasis');
      flowAnalysis.context.urgency = 'high';
    }

    // Short messages might be casual or urgent
    if (wordCount < 10) {
      flowAnalysis.reasoning.push('Brief message format');
      if (hasExclamations) {
        flowAnalysis.context.urgency = 'high';
      } else {
        flowAnalysis.context.urgency = 'low';
      }
    }

    return flowAnalysis;
  }

  private async analyzeSentimentAndTone(context: IntentContext): Promise<Partial<IntentClassificationResult>> {
    const { message } = context;

    // Simple sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'perfect', 'love', 'like', 'thanks', 'thank you'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'problem', 'issue', 'error', 'fail'];

    const messageLower = message.toLowerCase();
    const positiveCount = positiveWords.filter(word => messageLower.includes(word)).length;
    const negativeCount = negativeWords.filter(word => messageLower.includes(word)).length;

    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    let confidence = 0;

    if (positiveCount > negativeCount) {
      sentiment = 'positive';
      confidence = Math.min(positiveCount * 0.2, 0.8);
    } else if (negativeCount > positiveCount) {
      sentiment = 'negative';
      confidence = Math.min(negativeCount * 0.2, 0.8);
    }

    return {
      confidence,
      context: {
        urgency: negativeCount > 0 ? 'high' : 'low',
        complexity: 'simple',
        sentiment,
        requiresAction: negativeCount > 0
      },
      reasoning: [`Sentiment analysis: ${sentiment} (${positiveCount} positive, ${negativeCount} negative words)`]
    };
  }

  private combineIntentAnalysis(analyses: Partial<IntentClassificationResult>[]): IntentClassificationResult {
    // Find the intent with highest confidence across all analyses
    const allIntents = analyses
      .map(analysis => analysis.primaryIntent)
      .filter(intent => intent !== undefined) as IntentCategory[];

    if (allIntents.length === 0) {
      // Fallback to information request
      const fallbackIntent = this.intentCategories.find(cat => cat.id === 'information_request')!;
      return {
        primaryIntent: fallbackIntent,
        confidence: 0.1,
        alternativeIntents: [],
        reasoning: ['No clear intent detected, defaulting to information request'],
        context: {
          urgency: 'low',
          complexity: 'simple',
          sentiment: 'neutral',
          requiresAction: false
        },
        suggestedActions: ['Ask for clarification'],
        metadata: { processingTime: 0 }
      };
    }

    // Weight the confidences and select best intent
    const intentWeights = analyses.map(analysis => analysis.confidence || 0);
    const bestIntentIndex = intentWeights.indexOf(Math.max(...intentWeights));

    const primaryIntent = allIntents[bestIntentIndex];
    const totalConfidence = intentWeights.reduce((sum, weight) => sum + weight, 0) / analyses.length;

    // Get alternative intents
    const alternativeIntents = allIntents
      .filter((intent, index) => index !== bestIntentIndex)
      .slice(0, 3);

    // Combine reasoning
    const allReasoning = analyses.flatMap(analysis => analysis.reasoning || []);

    // Combine context information
    const contexts = analyses.map(analysis => analysis.context).filter(Boolean);
    const combinedContext = contexts.length > 0 ? this.combineContexts(contexts) : {
      urgency: 'low' as const,
      complexity: 'simple' as const,
      sentiment: 'neutral' as const,
      requiresAction: false
    };

    // Combine suggested actions
    const allActions = analyses.flatMap(analysis => analysis.suggestedActions || []);
    const suggestedActions = [...new Set(allActions)].slice(0, 5);

    return {
      primaryIntent,
      confidence: Math.min(totalConfidence, 1.0),
      alternativeIntents,
      reasoning: allReasoning,
      context: combinedContext,
      suggestedActions,
      metadata: { processingTime: 0 }
    };
  }

  private applyAdvancedClassification(result: IntentClassificationResult, context: IntentContext): IntentClassificationResult {
    const { message } = context;
    let { confidence, reasoning } = result;

    // Boost confidence for clear patterns
    if (message.includes('?') && message.length > 20) {
      confidence = Math.min(confidence + 0.2, 1.0)
      reasoning = [...reasoning, 'Clear question format boosts confidence']
    }

    // Adjust based on message length and complexity
    const wordCount = message.split(' ').length;
    if (wordCount > 100) {
      confidence = Math.min(confidence + 0.1, 1.0)
      reasoning = [...reasoning, 'Detailed message suggests clear intent']
    } else if (wordCount < 5) {
      confidence = Math.max(confidence - 0.1, 0.1)
      reasoning = [...reasoning, 'Brief message reduces confidence']
    }

    // Check for mixed signals
    const hasQuestion = /\?/.test(message);
    const hasExclamation = /!/.test(message);
    const hasTechnicalTerms = /\b(error|bug|code|api|server)\b/i.test(message);

    if (hasQuestion && hasTechnicalTerms) {
      confidence = Math.min(confidence + 0.15, 1.0);
      reasoning = [...reasoning, 'Technical question pattern detected']
    }

    if (!hasQuestion && hasExclamation) {
      reasoning = [...reasoning, 'Exclamatory tone detected; potential urgency noted']
    }

    return {
      ...result,
      confidence,
      reasoning
    };
  }

  private combineContexts(contexts: NonNullable<IntentClassificationResult['context']>[]): IntentClassificationResult['context'] {
    // Combine urgency levels
    const urgencyLevels = contexts.map(c => c.urgency);
    const urgencyScores = { low: 1, medium: 2, high: 3, critical: 4 };
    const avgUrgencyScore = urgencyLevels.reduce((sum, level) => sum + urgencyScores[level], 0) / urgencyLevels.length;
    const urgency = avgUrgencyScore >= 3 ? 'high' : avgUrgencyScore >= 2 ? 'medium' : 'low';

    // Combine complexity
    const complexityLevels = contexts.map(c => c.complexity);
    const complexityScores = { simple: 1, moderate: 2, complex: 3 };
    const avgComplexityScore = complexityLevels.reduce((sum, level) => sum + complexityScores[level], 0) / complexityLevels.length;
    const complexity = avgComplexityScore >= 2.5 ? 'complex' : avgComplexityScore >= 1.5 ? 'moderate' : 'simple';

    // Combine sentiment
    const sentimentLevels = contexts.map(c => c.sentiment);
    const positiveCount = sentimentLevels.filter(s => s === 'positive').length;
    const negativeCount = sentimentLevels.filter(s => s === 'negative').length;
    const sentiment = positiveCount > negativeCount ? 'positive' : negativeCount > positiveCount ? 'negative' : 'neutral';

    // Combine requires action
    const requiresAction = contexts.some(c => c.requiresAction);

    return {
      urgency,
      complexity,
      sentiment,
      requiresAction
    };
  }

  private detectUrgency(message: string): 'low' | 'medium' | 'high' | 'critical' {
    const urgencyPatterns = this.nlpPatterns.get('urgency_markers') || [];
    const hasUrgency = urgencyPatterns.some(pattern => pattern.test(message));

    if (hasUrgency) return 'high';

    const frustrationPatterns = this.nlpPatterns.get('frustration_indicators') || [];
    const hasFrustration = frustrationPatterns.some(pattern => pattern.test(message));

    if (hasFrustration) return 'medium';

    return 'low';
  }

  private detectComplexity(message: string): 'simple' | 'moderate' | 'complex' {
    const wordCount = message.split(' ').length;
    const hasTechnicalTerms = this.nlpPatterns.get('technical_terms')?.some(pattern => pattern.test(message)) || false;

    if (wordCount > 100 || hasTechnicalTerms) return 'complex';
    if (wordCount > 30) return 'moderate';
    return 'simple';
  }

  private detectSentiment(message: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'perfect', 'love', 'like', 'thanks'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'problem', 'issue', 'error'];

    const messageLower = message.toLowerCase();
    const positiveCount = positiveWords.filter(word => messageLower.includes(word)).length;
    const negativeCount = negativeWords.filter(word => messageLower.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private requiresAction(intentId: string): boolean {
    const actionRequiredIntents = ['problem_solving', 'decision_making', 'collaboration', 'transactional'];
    return actionRequiredIntents.includes(intentId);
  }

  private getSuggestedActions(intentId: string): string[] {
    const actionMap: Record<string, string[]> = {
      information_request: ['Provide requested information', 'Ask for clarification if needed'],
      problem_solving: ['Diagnose the issue', 'Provide step-by-step solution', 'Offer alternatives'],
      decision_making: ['Present options clearly', 'Provide pros/cons analysis', 'Ask clarifying questions'],
      collaboration: ['Schedule meeting if needed', 'Clarify next steps', 'Assign tasks'],
      analysis: ['Gather relevant data', 'Perform analysis', 'Present findings'],
      creative: ['Encourage ideation', 'Provide inspiration', 'Help refine concepts'],
      transactional: ['Guide through process', 'Provide necessary information', 'Follow up'],
      social: ['Engage in conversation', 'Be friendly and helpful']
    };

    return actionMap[intentId] || ['Respond helpfully'];
  }

  private extractContextClues(messages: string[]): string[] {
    const clues: string[] = [];

    for (const message of messages) {
      const messageLower = message.toLowerCase();

      if (messageLower.includes('follow up') || messageLower.includes('following up')) {
        clues.push('follow_up');
      }

      if (messageLower.includes('technical') || messageLower.includes('code') || messageLower.includes('api')) {
        clues.push('technical_discussion');
      }

      if (messageLower.includes('meeting') || messageLower.includes('call') || messageLower.includes('schedule')) {
        clues.push('coordination');
      }
    }

    return clues;
  }

  private hashMessage(message: string): string {
    // Simple hash for cache keys
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private getFallbackIntentResult(context: IntentContext, processingTime: number): IntentClassificationResult {
    const fallbackIntent = this.intentCategories.find(cat => cat.id === 'information_request')!;

    return {
      primaryIntent: fallbackIntent,
      confidence: 0.1,
      alternativeIntents: [],
      reasoning: ['Classification failed, using fallback intent'],
      context: {
        urgency: 'low',
        complexity: 'simple',
        sentiment: 'neutral',
        requiresAction: false
      },
      suggestedActions: ['Ask user to clarify their intent'],
      metadata: {
        processingTime,
        model: 'fallback'
      }
    };
  }

  // Public method to get intent suggestions for UI
  async getIntentSuggestions(partialInput: string, limit: number = 3): Promise<IntentCategory[]> {
    return this.intentCategories
      .filter(category =>
        category.name.toLowerCase().includes(partialInput.toLowerCase()) ||
        category.keywords.some(keyword => keyword.toLowerCase().includes(partialInput.toLowerCase()))
      )
      .slice(0, limit);
  }

  // Method to update intent patterns based on feedback
  updateIntentPattern(intentId: string, feedback: 'correct' | 'incorrect', userMessage: string) {
    logger.info('Intent classification feedback received', {
      intentId,
      feedback,
      messageLength: userMessage.length,
      type: 'intent_feedback'
    });

    // This would implement machine learning feedback loop
    // For now, just log for future analysis
  }
}

// Export singleton instance
export const advancedIntentClassifier = new AdvancedIntentClassifier();
