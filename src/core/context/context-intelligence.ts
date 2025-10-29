/**
 * Context Intelligence Utilities
 * 
 * Extracted from AdvancedContextManager to add entity extraction,
 * sentiment analysis, priority scoring, and context merging to MultimodalContextManager.
 * 
 * Originally from: src/core/intelligence/advanced-context-manager.ts
 */

export interface ExtractedEntity {
  id: string
  type: 'person' | 'organization' | 'location' | 'product' | 'concept' | 'date' | 'email'
  value: string
  confidence: number
  context: string
  firstMentioned: Date
  lastMentioned: Date
  frequency: number
}

export interface ExtractedTopic {
  id: string
  name: string
  keywords: string[]
  relevance: number
  firstMentioned: Date
  lastMentioned: Date
  messageCount: number
  category: 'business' | 'technical' | 'personal' | 'general'
}

export type Sentiment = 'positive' | 'neutral' | 'negative'
export type Priority = 'low' | 'medium' | 'high'
export type Complexity = 'simple' | 'moderate' | 'complex'
export type BusinessValue = 'low' | 'medium' | 'high'

/**
 * Entity extraction patterns and utilities
 */
class EntityExtractor {
  private entityPatterns = new Map<string, RegExp[]>()

  constructor() {
    this.initializePatterns()
  }

  private initializePatterns() {
    // Email patterns
    this.entityPatterns.set('email', [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
    ])

    // Person name patterns (simplified)
    this.entityPatterns.set('person', [
      /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, // First Last
      /\b[A-Z][a-z]+\b/g // Single names
    ])

    // Organization patterns
    this.entityPatterns.set('organization', [
      /\b(Inc|Ltd|LLC|Corp|Corporation|Company|LLP|LP)\b/gi,
      /\b[A-Z][A-Za-z0-9\s&.-]+(?:Inc|Ltd|LLC|Corp|Corporation|Company)\b/gi
    ])

    // Date patterns
    this.entityPatterns.set('date', [
      /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, // MM/DD/YYYY
      /\b\d{4}-\d{2}-\d{2}\b/g, // YYYY-MM-DD
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi
    ])

    // Product patterns
    this.entityPatterns.set('product', [
      /\b[A-Z][A-Za-z0-9\s.-]+\b/g // Generic product patterns
    ])
  }

  extractEntities(content: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = []
    const now = new Date()

    // Extract emails
    const emailMatches = content.match(this.entityPatterns.get('email')?.[0] || /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g) || []
    for (const email of emailMatches) {
      entities.push({
        id: `email_${email}`,
        type: 'email',
        value: email,
        confidence: 0.9,
        context: this.extractContext(content, email, 20),
        firstMentioned: now,
        lastMentioned: now,
        frequency: 1
      })
    }

    // Extract person names (simplified)
    const nameMatches = content.match(this.entityPatterns.get('person')?.[0] || /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g) || []
    for (const name of nameMatches) {
      if (!emailMatches.some((email: string) => email.includes(name.toLowerCase()))) {
        entities.push({
          id: `person_${name}`,
          type: 'person',
          value: name,
          confidence: 0.7,
          context: this.extractContext(content, name, 20),
          firstMentioned: now,
          lastMentioned: now,
          frequency: 1
        })
      }
    }

    // Extract organizations
    const orgMatches = content.match(this.entityPatterns.get('organization')?.[1] || /\b[A-Z][A-Za-z0-9\s&.-]+(?:Inc|Ltd|LLC|Corp|Corporation|Company)\b/gi) || []
    for (const org of orgMatches) {
      entities.push({
        id: `org_${org}`,
        type: 'organization',
        value: org,
        confidence: 0.8,
        context: this.extractContext(content, org, 20),
        firstMentioned: now,
        lastMentioned: now,
        frequency: 1
      })
    }

    return entities
  }

  private extractContext(content: string, match: string, contextSize: number): string {
    const index = content.indexOf(match)
    if (index === -1) return ''
    return content.substring(Math.max(0, index - contextSize), index + match.length + contextSize)
  }
}

/**
 * Topic extraction with category classification
 */
class TopicExtractor {
  private topicKeywords = new Map<string, string[]>()

  constructor() {
    this.initializeKeywords()
  }

  private initializeKeywords() {
    // Business topics
    this.topicKeywords.set('business', [
      'meeting', 'project', 'client', 'sales', 'revenue', 'strategy', 'plan', 'growth',
      'marketing', 'business', 'company', 'team', 'management', 'leadership'
    ])

    // Technical topics
    this.topicKeywords.set('technical', [
      'code', 'development', 'api', 'database', 'server', 'software', 'programming',
      'framework', 'deployment', 'debug', 'error', 'bug', 'feature', 'functionality'
    ])

    // Personal topics
    this.topicKeywords.set('personal', [
      'family', 'friends', 'hobby', 'weekend', 'vacation', 'personal', 'life',
      'relationship', 'home', 'house', 'car', 'pet', 'health', 'fitness'
    ])

    // General topics
    this.topicKeywords.set('general', [
      'weather', 'news', 'current events', 'general', 'discussion', 'chat',
      'conversation', 'talk', 'speak', 'communicate'
    ])
  }

  extractTopics(content: string): ExtractedTopic[] {
    const topics: ExtractedTopic[] = []
    const contentLower = content.toLowerCase()

    for (const [category, keywords] of this.topicKeywords.entries()) {
      const matches = keywords.filter(keyword => contentLower.includes(keyword.toLowerCase()))

      if (matches.length > 0) {
        const topicName = this.generateTopicName(category, matches)
        const relevance = matches.length * 0.2

        topics.push({
          id: `topic_${category}_${Date.now()}`,
          name: topicName,
          keywords: matches,
          relevance,
          firstMentioned: new Date(),
          lastMentioned: new Date(),
          messageCount: 1,
          category: category as 'business' | 'technical' | 'personal' | 'general'
        })
      }
    }

    return topics
  }

  private generateTopicName(category: string, keywords: string[]): string {
    if (keywords.length === 0) return category
    return `${category}: ${keywords[0]}`
  }
}

/**
 * Sentiment analysis (simple keyword-based)
 */
export function analyzeSentiment(content: string): Sentiment {
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'happy', 'pleased', 'satisfied']
  const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'disappointed', 'frustrated', 'angry', 'sad', 'unhappy']

  const lowerContent = content.toLowerCase()
  const positiveCount = positiveWords.filter(word => lowerContent.includes(word)).length
  const negativeCount = negativeWords.filter(word => lowerContent.includes(word)).length

  if (positiveCount > negativeCount) return 'positive'
  if (negativeCount > positiveCount) return 'negative'
  return 'neutral'
}

/**
 * Calculate complexity based on message metrics
 */
export function calculateComplexity(
  entityCount: number,
  topicCount: number,
  avgMessageLength: number
): Complexity {
  if (entityCount > 10 || topicCount > 5 || avgMessageLength > 200) {
    return 'complex'
  } else if (entityCount > 5 || topicCount > 2 || avgMessageLength > 100) {
    return 'moderate'
  }
  return 'simple'
}

/**
 * Calculate business value based on business-related entities and topics
 */
export function calculateBusinessValue(
  businessEntityCount: number,
  businessTopicCount: number
): BusinessValue {
  if (businessEntityCount > 3 || businessTopicCount > 2) {
    return 'high'
  } else if (businessEntityCount > 1 || businessTopicCount > 0) {
    return 'medium'
  }
  return 'low'
}

/**
 * Calculate priority based on business value and complexity
 */
export function calculatePriority(
  businessValue: BusinessValue,
  complexity: Complexity
): Priority {
  if (businessValue === 'high' || complexity === 'complex') {
    return 'high'
  } else if (businessValue === 'medium' || complexity === 'moderate') {
    return 'medium'
  }
  return 'low'
}

// Singleton instances
const entityExtractor = new EntityExtractor()
const topicExtractor = new TopicExtractor()

/**
 * Extract entities from text content
 */
export function extractEntities(content: string): ExtractedEntity[] {
  return entityExtractor.extractEntities(content)
}

/**
 * Extract topics from text content
 */
export function extractTopics(content: string): ExtractedTopic[] {
  return topicExtractor.extractTopics(content)
}

/**
 * Merge entities, combining frequencies and confidence
 */
export function mergeEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
  const entityMap = new Map<string, ExtractedEntity>()

  for (const entity of entities) {
    const key = `${entity.type}_${entity.value}`
    const existing = entityMap.get(key)

    if (existing) {
      existing.frequency += entity.frequency
      existing.lastMentioned = new Date(Math.max(
        existing.lastMentioned.getTime(),
        entity.lastMentioned.getTime()
      ))
      existing.confidence = Math.max(existing.confidence, entity.confidence)
    } else {
      entityMap.set(key, { ...entity })
    }
  }

  return Array.from(entityMap.values())
}

/**
 * Merge topics, combining relevance and message counts
 */
export function mergeTopics(topics: ExtractedTopic[]): ExtractedTopic[] {
  const topicMap = new Map<string, ExtractedTopic>()

  for (const topic of topics) {
    const existing = topicMap.get(topic.name)

    if (existing) {
      existing.relevance = Math.max(existing.relevance, topic.relevance)
      existing.lastMentioned = new Date(Math.max(
        existing.lastMentioned.getTime(),
        topic.lastMentioned.getTime()
      ))
      existing.messageCount += topic.messageCount
    } else {
      topicMap.set(topic.name, { ...topic })
    }
  }

  return Array.from(topicMap.values())
}

