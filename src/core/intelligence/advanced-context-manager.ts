import { logger } from '@/src/lib/logger';
import { vercelCache, CACHE_CONFIGS } from '@/src/lib/vercel-cache';

export interface ConversationContext {
  sessionId: string;
  userId?: string;
  messages: ConversationMessage[];
  entities: ConversationEntity[];
  topics: ConversationTopic[];
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  priority: 'low' | 'medium' | 'high';
  lastUpdated: Date;
  metadata: {
    messageCount: number;
    duration: number; // in minutes
    complexity: 'simple' | 'moderate' | 'complex';
    businessValue: 'low' | 'medium' | 'high';
  };
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  intent?: string;
  entities: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  importance: number; // 0-1 score
}

export interface ConversationEntity {
  id: string;
  type: 'person' | 'organization' | 'location' | 'product' | 'concept' | 'date' | 'email';
  value: string;
  confidence: number;
  context: string;
  firstMentioned: Date;
  lastMentioned: Date;
  frequency: number;
}

export interface ConversationTopic {
  id: string;
  name: string;
  keywords: string[];
  relevance: number;
  firstMentioned: Date;
  lastMentioned: Date;
  messageCount: number;
  category: 'business' | 'technical' | 'personal' | 'general';
}

export interface ContextUpdate {
  type: 'message' | 'entity' | 'topic' | 'summary' | 'metadata';
  data: unknown;
  timestamp: Date;
  importance: number;
}

export class AdvancedContextManager {
  private activeContexts: Map<string, ConversationContext> = new Map();
  private contextHistory: Map<string, ConversationContext[]> = new Map();
  private entityPatterns: Map<string, RegExp[]> = new Map();
  private topicKeywords: Map<string, string[]> = new Map();

  constructor() {
    this.initializeEntityPatterns();
    this.initializeTopicKeywords();
  }

  private initializeEntityPatterns() {
    // Email patterns
    this.entityPatterns.set('email', [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
    ]);

    // Person name patterns (simplified)
    this.entityPatterns.set('person', [
      /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, // First Last
      /\b[A-Z][a-z]+\b/g // Single names
    ]);

    // Organization patterns
    this.entityPatterns.set('organization', [
      /\b(Inc|Ltd|LLC|Corp|Corporation|Company|LLP|LP)\b/gi,
      /\b[A-Z][A-Za-z0-9\s&.-]+(?:Inc|Ltd|LLC|Corp|Corporation|Company)\b/gi
    ]);

    // Date patterns
    this.entityPatterns.set('date', [
      /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, // MM/DD/YYYY
      /\b\d{4}-\d{2}-\d{2}\b/g, // YYYY-MM-DD
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi
    ]);

    // Product patterns
    this.entityPatterns.set('product', [
      /\b[A-Z][A-Za-z0-9\s.-]+\b/g // Generic product patterns
    ]);
  }

  private initializeTopicKeywords() {
    // Business topics
    this.topicKeywords.set('business', [
      'meeting', 'project', 'client', 'sales', 'revenue', 'strategy', 'plan', 'growth',
      'marketing', 'business', 'company', 'team', 'management', 'leadership'
    ]);

    // Technical topics
    this.topicKeywords.set('technical', [
      'code', 'development', 'api', 'database', 'server', 'software', 'programming',
      'framework', 'deployment', 'debug', 'error', 'bug', 'feature', 'functionality'
    ]);

    // Personal topics
    this.topicKeywords.set('personal', [
      'family', 'friends', 'hobby', 'weekend', 'vacation', 'personal', 'life',
      'relationship', 'home', 'house', 'car', 'pet', 'health', 'fitness'
    ]);

    // General topics
    this.topicKeywords.set('general', [
      'weather', 'news', 'current events', 'general', 'discussion', 'chat',
      'conversation', 'talk', 'speak', 'communicate'
    ]);
  }

  async updateContext(sessionId: string, update: ContextUpdate): Promise<ConversationContext> {
    const startTime = Date.now();
    const requestId = `context_update_${Date.now()}`;

    logger.info('Starting advanced context update', {
      requestId,
      sessionId,
      updateType: update.type,
      importance: update.importance
    });

    try {
      // Get or create context
      let context = this.activeContexts.get(sessionId);

      if (!context) {
        context = await this.createNewContext(sessionId);
        this.activeContexts.set(sessionId, context);
      }

      // Apply update based on type
      switch (update.type) {
        case 'message':
          context = await this.updateWithMessage(context, update.data as ConversationMessage);
          break;
        case 'entity':
          context = await this.updateWithEntity(context, update.data as ConversationEntity);
          break;
        case 'topic':
          context = await this.updateWithTopic(context, update.data as ConversationTopic);
          break;
        case 'summary':
          context = await this.updateWithSummary(context, update.data as string);
          break;
        case 'metadata':
          context = await this.updateWithMetadata(context, update.data as Partial<ConversationContext['metadata']>);
          break;
      }

      // Update timestamp
      context.lastUpdated = new Date();

      // Store updated context
      this.activeContexts.set(sessionId, context);

      // Add to history (keep last 10 contexts)
      const history = this.contextHistory.get(sessionId) || [];
      history.push(context);
      if (history.length > 10) {
        history.shift(); // Remove oldest
      }
      this.contextHistory.set(sessionId, history);

      const processingTime = Date.now() - startTime;

      logger.info('Advanced context update completed', {
        requestId,
        sessionId,
        messageCount: context.messages.length,
        entityCount: context.entities.length,
        topicCount: context.topics.length,
        processingTime
      });

      return context;

    } catch (error) {
      logger.error('Advanced context update failed', error instanceof Error ? error : new Error('Unknown error'), {
        requestId,
        sessionId,
        updateType: update.type,
        type: 'context_update_error'
      });

      throw error;
    }
  }

  private async updateWithMessage(context: ConversationContext, message: ConversationMessage): Promise<ConversationContext> {
    // Add message to context
    context.messages.push(message);
    context.metadata.messageCount++;

    // Extract entities from message
    const entities = this.extractEntities(message.content);
    for (const entity of entities) {
      await this.addOrUpdateEntity(context, entity);
    }

    // Update topics based on message content
    const topics = this.extractTopics(message.content);
    for (const topic of topics) {
      await this.addOrUpdateTopic(context, topic);
    }

    // Update context metadata
    context = await this.updateContextMetadata(context);

    return context;
  }

  private async updateWithEntity(context: ConversationContext, entity: ConversationEntity): Promise<ConversationContext> {
    await this.addOrUpdateEntity(context, entity);
    return context;
  }

  private async updateWithTopic(context: ConversationContext, topic: ConversationTopic): Promise<ConversationContext> {
    await this.addOrUpdateTopic(context, topic);
    return context;
  }

  private async updateWithSummary(context: ConversationContext, summary: string): Promise<ConversationContext> {
    context.summary = summary;
    return context;
  }

  private async updateWithMetadata(context: ConversationContext, metadata: Partial<ConversationContext['metadata']>): Promise<ConversationContext> {
    context.metadata = { ...context.metadata, ...metadata };
    return context;
  }

  private async addOrUpdateEntity(context: ConversationContext, newEntity: ConversationEntity): Promise<void> {
    const existingEntity = context.entities.find(e => e.value === newEntity.value && e.type === newEntity.type);

    if (existingEntity) {
      // Update existing entity
      existingEntity.frequency++;
      existingEntity.lastMentioned = new Date();
      existingEntity.confidence = Math.max(existingEntity.confidence, newEntity.confidence);
    } else {
      // Add new entity
      context.entities.push(newEntity);
    }
  }

  private async addOrUpdateTopic(context: ConversationContext, newTopic: ConversationTopic): Promise<void> {
    const existingTopic = context.topics.find(t => t.name === newTopic.name);

    if (existingTopic) {
      // Update existing topic
      existingTopic.relevance = Math.max(existingTopic.relevance, newTopic.relevance);
      existingTopic.lastMentioned = new Date();
      existingTopic.messageCount++;
    } else {
      // Add new topic
      context.topics.push(newTopic);
    }
  }

  private extractEntities(content: string): ConversationEntity[] {
    const entities: ConversationEntity[] = [];

    // Extract emails
    const emailMatches = content.match(this.entityPatterns.get('email')?.[0] || /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g) || [];
    for (const email of emailMatches) {
      entities.push({
        id: `email_${email}`,
        type: 'email',
        value: email,
        confidence: 0.9,
        context: content.substring(Math.max(0, content.indexOf(email) - 20), content.indexOf(email) + email.length + 20),
        firstMentioned: new Date(),
        lastMentioned: new Date(),
        frequency: 1
      });
    }

    // Extract person names (simplified)
    const nameMatches = content.match(this.entityPatterns.get('person')?.[0] || /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g) || [];
    for (const name of nameMatches) {
      if (!emailMatches.some((email: string) => email.includes(name.toLowerCase()))) { // Avoid email matches
        entities.push({
          id: `person_${name}`,
          type: 'person',
          value: name,
          confidence: 0.7,
          context: content.substring(Math.max(0, content.indexOf(name) - 20), content.indexOf(name) + name.length + 20),
          firstMentioned: new Date(),
          lastMentioned: new Date(),
          frequency: 1
        });
      }
    }

    // Extract organizations
    const orgMatches = content.match(this.entityPatterns.get('organization')?.[1] || /\b[A-Z][A-Za-z0-9\s&.-]+(?:Inc|Ltd|LLC|Corp|Corporation|Company)\b/gi) || [];
    for (const org of orgMatches) {
      entities.push({
        id: `org_${org}`,
        type: 'organization',
        value: org,
        confidence: 0.8,
        context: content.substring(Math.max(0, content.indexOf(org) - 20), content.indexOf(org) + org.length + 20),
        firstMentioned: new Date(),
        lastMentioned: new Date(),
        frequency: 1
      });
    }

    return entities;
  }

  private extractTopics(content: string): ConversationTopic[] {
    const topics: ConversationTopic[] = [];
    const contentLower = content.toLowerCase();

    // Check each topic category
    for (const [category, keywords] of this.topicKeywords.entries()) {
      const matches = keywords.filter(keyword => contentLower.includes(keyword.toLowerCase()));

      if (matches.length > 0) {
        const topicName = this.generateTopicName(category, matches);
        const relevance = matches.length * 0.2; // Base relevance from keyword matches

        topics.push({
          id: `topic_${category}_${Date.now()}`,
          name: topicName,
          keywords: matches,
          relevance,
          firstMentioned: new Date(),
          lastMentioned: new Date(),
          messageCount: 1,
          category: category as 'business' | 'technical' | 'personal' | 'general'
        });
      }
    }

    return topics;
  }

  private generateTopicName(category: string, keywords: string[]): string {
    // Generate a descriptive topic name based on keywords
    if (keywords.length === 0) return category;

    // Use the most relevant keyword as the topic name
    const primaryKeyword = keywords[0];
    return `${category}: ${primaryKeyword}`;
  }

  private async updateContextMetadata(context: ConversationContext): Promise<ConversationContext> {
    const now = new Date();
    const startTime = context.messages.length > 0 ? context.messages[0].timestamp : now;
    const duration = (now.getTime() - startTime.getTime()) / (1000 * 60); // minutes

    // Calculate complexity based on entities and topics
    const entityCount = context.entities.length;
    const topicCount = context.topics.length;
    const avgMessageLength = context.messages.reduce((sum, msg) => sum + msg.content.length, 0) / context.messages.length;

    let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
    if (entityCount > 10 || topicCount > 5 || avgMessageLength > 200) {
      complexity = 'complex';
    } else if (entityCount > 5 || topicCount > 2 || avgMessageLength > 100) {
      complexity = 'moderate';
    }

    // Calculate business value based on business entities and topics
    const businessEntities = context.entities.filter(e => e.type === 'organization' || e.type === 'email').length;
    const businessTopics = context.topics.filter(t => t.category === 'business').length;

    let businessValue: 'low' | 'medium' | 'high' = 'low';
    if (businessEntities > 3 || businessTopics > 2) {
      businessValue = 'high';
    } else if (businessEntities > 1 || businessTopics > 0) {
      businessValue = 'medium';
    }

    // Update priority based on business value and complexity
    let priority: 'low' | 'medium' | 'high' = 'low';
    if (businessValue === 'high' || complexity === 'complex') {
      priority = 'high';
    } else if (businessValue === 'medium' || complexity === 'moderate') {
      priority = 'medium';
    }

    context.metadata = {
      messageCount: context.messages.length,
      duration,
      complexity,
      businessValue
    };

    context.priority = priority;

    return context;
  }

  private async createNewContext(sessionId: string): Promise<ConversationContext> {
    return {
      sessionId,
      messages: [],
      entities: [],
      topics: [],
      summary: 'New conversation started',
      sentiment: 'neutral',
      priority: 'low',
      lastUpdated: new Date(),
      metadata: {
        messageCount: 0,
        duration: 0,
        complexity: 'simple',
        businessValue: 'low'
      }
    };
  }

  // Public methods for context management
  async getContext(sessionId: string): Promise<ConversationContext | null> {
    return this.activeContexts.get(sessionId) || null;
  }

  async getContextHistory(sessionId: string): Promise<ConversationContext[]> {
    return this.contextHistory.get(sessionId) || [];
  }

  async clearContext(sessionId: string): Promise<void> {
    this.activeContexts.delete(sessionId);
    this.contextHistory.delete(sessionId);

    logger.info('Context cleared', { sessionId, type: 'context_cleared' });
  }

  async getContextSummary(sessionId: string): Promise<string | null> {
    const context = await this.getContext(sessionId);
    if (!context) return null;

    // Generate a summary of the conversation
    const entitySummary = context.entities.length > 0
      ? `Discussed ${context.entities.length} entities including: ${context.entities.slice(0, 3).map(e => e.value).join(', ')}`
      : 'No specific entities discussed';

    const topicSummary = context.topics.length > 0
      ? `Covered ${context.topics.length} topics: ${context.topics.slice(0, 3).map(t => t.name).join(', ')}`
      : 'General conversation';

    const metadataSummary = `Conversation duration: ${Math.round(context.metadata.duration)} minutes, Priority: ${context.priority}`;

    return `${entitySummary}. ${topicSummary}. ${metadataSummary}.`;
  }

  async getRelevantContext(sessionId: string, query: string): Promise<ConversationMessage[]> {
    const context = await this.getContext(sessionId);
    if (!context) return [];

    const queryLower = query.toLowerCase();

    // Find messages relevant to the query
    return context.messages.filter(message => {
      const contentLower = message.content.toLowerCase();
      const entityMatch = message.entities.some(entity => contentLower.includes(entity.toLowerCase()));
      const topicMatch = context.topics.some(topic =>
        topic.keywords.some(keyword => contentLower.includes(keyword.toLowerCase()))
      );

      return contentLower.includes(queryLower) || entityMatch || topicMatch;
    });
  }

  async mergeContexts(sessionIds: string[]): Promise<ConversationContext> {
    const contexts = await Promise.all(
      sessionIds.map(id => this.getContext(id))
    );

    const validContexts = contexts.filter((ctx): ctx is ConversationContext => ctx !== null);

    if (validContexts.length === 0) {
      throw new Error('No valid contexts to merge');
    }

    // Create merged context
    const mergedContext: ConversationContext = {
      sessionId: `merged_${Date.now()}`,
      messages: validContexts.flatMap(ctx => ctx.messages),
      entities: this.mergeEntities(validContexts.flatMap(ctx => ctx.entities)),
      topics: this.mergeTopics(validContexts.flatMap(ctx => ctx.topics)),
      summary: `Merged conversation from ${validContexts.length} sessions`,
      sentiment: this.calculateMergedSentiment(validContexts),
      priority: this.calculateMergedPriority(validContexts),
      lastUpdated: new Date(),
      metadata: this.calculateMergedMetadata(validContexts)
    };

    return mergedContext;
  }

  private mergeEntities(entities: ConversationEntity[]): ConversationEntity[] {
    const entityMap = new Map<string, ConversationEntity>();

    for (const entity of entities) {
      const key = `${entity.type}_${entity.value}`;
      const existing = entityMap.get(key);

      if (existing) {
        existing.frequency += entity.frequency;
        existing.lastMentioned = new Date(Math.max(existing.lastMentioned.getTime(), entity.lastMentioned.getTime()));
        existing.confidence = Math.max(existing.confidence, entity.confidence);
      } else {
        entityMap.set(key, { ...entity });
      }
    }

    return Array.from(entityMap.values());
  }

  private mergeTopics(topics: ConversationTopic[]): ConversationTopic[] {
    const topicMap = new Map<string, ConversationTopic>();

    for (const topic of topics) {
      const existing = topicMap.get(topic.name);

      if (existing) {
        existing.relevance = Math.max(existing.relevance, topic.relevance);
        existing.lastMentioned = new Date(Math.max(existing.lastMentioned.getTime(), topic.lastMentioned.getTime()));
        existing.messageCount += topic.messageCount;
      } else {
        topicMap.set(topic.name, { ...topic });
      }
    }

    return Array.from(topicMap.values());
  }

  private calculateMergedSentiment(contexts: ConversationContext[]): 'positive' | 'neutral' | 'negative' {
    const sentiments = contexts.map(ctx => ctx.sentiment);
    const positiveCount = sentiments.filter(s => s === 'positive').length;
    const negativeCount = sentiments.filter(s => s === 'negative').length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private calculateMergedPriority(contexts: ConversationContext[]): 'low' | 'medium' | 'high' {
    const priorities = contexts.map(ctx => ctx.priority);
    const priorityScores = { low: 1, medium: 2, high: 3 };
    const avgScore = priorities.reduce((sum, p) => sum + priorityScores[p], 0) / priorities.length;

    if (avgScore >= 2.5) return 'high';
    if (avgScore >= 1.5) return 'medium';
    return 'low';
  }

  private calculateMergedMetadata(contexts: ConversationContext[]): ConversationContext['metadata'] {
    const totalMessages = contexts.reduce((sum, ctx) => sum + ctx.metadata.messageCount, 0);
    const totalDuration = contexts.reduce((sum, ctx) => sum + ctx.metadata.duration, 0);

    // Calculate complexity based on combined metrics
    const avgComplexityScore = contexts.reduce((sum, ctx) => {
      const scores = { simple: 1, moderate: 2, complex: 3 };
      return sum + scores[ctx.metadata.complexity];
    }, 0) / contexts.length;

    const complexity = avgComplexityScore >= 2.5 ? 'complex' : avgComplexityScore >= 1.5 ? 'moderate' : 'simple';

    // Calculate business value
    const avgBusinessScore = contexts.reduce((sum, ctx) => {
      const scores = { low: 1, medium: 2, high: 3 };
      return sum + scores[ctx.metadata.businessValue];
    }, 0) / contexts.length;

    const businessValue = avgBusinessScore >= 2.5 ? 'high' : avgBusinessScore >= 1.5 ? 'medium' : 'low';

    return {
      messageCount: totalMessages,
      duration: totalDuration,
      complexity,
      businessValue
    };
  }

  // Cache context for performance
  async cacheContext(sessionId: string): Promise<void> {
    const context = this.activeContexts.get(sessionId);
    if (context) {
      await vercelCache.set('context', sessionId, context, {
        ttl: CACHE_CONFIGS.CONTEXT.ttl,
        tags: ['context', 'conversation']
      });

      logger.debug('Context cached', { sessionId, type: 'context_cached' });
    }
  }

  async getCachedContext(sessionId: string): Promise<ConversationContext | null> {
    const cached = await vercelCache.get<ConversationContext>('context', sessionId);
    if (cached) {
      this.activeContexts.set(sessionId, cached);
      logger.debug('Context loaded from cache', { sessionId, type: 'context_cache_hit' });
    }
    return cached;
  }
}

// Export singleton instance
export const advancedContextManager = new AdvancedContextManager();
