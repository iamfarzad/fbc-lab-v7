import { logger } from '@/src/lib/logger';
import { vercelCache, CACHE_CONFIGS } from '@/src/lib/vercel-cache';

export interface RoleProfile {
  title: string;
  department: string;
  seniority: 'entry' | 'mid' | 'senior' | 'executive' | 'founder';
  responsibilities: string[];
  skills: string[];
  industry: string;
  companySize?: string;
}

export interface RoleDetectionResult {
  detectedRole: RoleProfile;
  confidence: number;
  reasoning: string[];
  alternativeRoles: RoleProfile[];
  sources: string[];
  metadata: {
    processingTime: number;
    dataQuality: 'high' | 'medium' | 'low';
    completeness: number;
  };
}

export interface RoleContext {
  email: string;
  name?: string;
  companyUrl?: string;
  companyName?: string;
  industry?: string;
  companySize?: string;
  currentRole?: string;
  sessionId?: string;
}

export class EnhancedRoleDetector {
  private rolePatterns: Map<string, RoleProfile[]> = new Map();
  private industryKeywords: Map<string, string[]> = new Map();

  constructor() {
    this.initializeRolePatterns();
    this.initializeIndustryKeywords();
  }

  private initializeRolePatterns() {
    // Technology roles
    this.rolePatterns.set('technology', [
      {
        title: 'Software Engineer',
        department: 'Engineering',
        seniority: 'mid',
        responsibilities: ['Code development', 'System architecture', 'Code reviews'],
        skills: ['Programming', 'Problem solving', 'System design'],
        industry: 'Technology'
      },
      {
        title: 'Senior Software Engineer',
        department: 'Engineering',
        seniority: 'senior',
        responsibilities: ['Team leadership', 'Architecture design', 'Mentoring'],
        skills: ['Leadership', 'Architecture', 'Mentoring', 'Programming'],
        industry: 'Technology'
      },
      {
        title: 'Engineering Manager',
        department: 'Engineering',
        seniority: 'senior',
        responsibilities: ['Team management', 'Project planning', 'Stakeholder communication'],
        skills: ['Management', 'Planning', 'Communication', 'Technical leadership'],
        industry: 'Technology'
      },
      {
        title: 'CTO',
        department: 'Technology',
        seniority: 'executive',
        responsibilities: ['Technology strategy', 'Team building', 'Innovation'],
        skills: ['Strategy', 'Leadership', 'Innovation', 'Technical vision'],
        industry: 'Technology'
      },
      {
        title: 'CEO',
        department: 'Executive',
        seniority: 'executive',
        responsibilities: ['Company strategy', 'Fundraising', 'Team building', 'Business development'],
        skills: ['Strategy', 'Leadership', 'Business development', 'Fundraising'],
        industry: 'Technology'
      },
      {
        title: 'Founder',
        department: 'Executive',
        seniority: 'founder',
        responsibilities: ['Company building', 'Product vision', 'Team assembly', 'Strategy'],
        skills: ['Entrepreneurship', 'Vision', 'Leadership', 'Strategy'],
        industry: 'Technology'
      }
    ]);

    // Marketing roles
    this.rolePatterns.set('marketing', [
      {
        title: 'Marketing Manager',
        department: 'Marketing',
        seniority: 'mid',
        responsibilities: ['Campaign management', 'Brand strategy', 'Market analysis'],
        skills: ['Marketing strategy', 'Campaign management', 'Analytics'],
        industry: 'Marketing'
      },
      {
        title: 'Growth Marketer',
        department: 'Marketing',
        seniority: 'mid',
        responsibilities: ['Growth strategies', 'User acquisition', 'Conversion optimization'],
        skills: ['Growth hacking', 'Analytics', 'Experimentation'],
        industry: 'Marketing'
      }
    ]);

    // Sales roles
    this.rolePatterns.set('sales', [
      {
        title: 'Sales Representative',
        department: 'Sales',
        seniority: 'entry',
        responsibilities: ['Lead generation', 'Client meetings', 'Sales presentations'],
        skills: ['Communication', 'Relationship building', 'Product knowledge'],
        industry: 'Sales'
      },
      {
        title: 'Account Executive',
        department: 'Sales',
        seniority: 'mid',
        responsibilities: ['Account management', 'Contract negotiation', 'Relationship management'],
        skills: ['Account management', 'Negotiation', 'Communication'],
        industry: 'Sales'
      }
    ]);
  }

  private initializeIndustryKeywords() {
    this.industryKeywords.set('technology', [
      'software', 'tech', 'development', 'programming', 'engineering', 'developer',
      'platform', 'application', 'system', 'digital', 'innovation', 'startup'
    ]);

    this.industryKeywords.set('finance', [
      'finance', 'financial', 'banking', 'investment', 'fintech', 'trading',
      'wealth management', 'insurance', 'payments'
    ]);

    this.industryKeywords.set('healthcare', [
      'healthcare', 'medical', 'health', 'clinical', 'patient', 'pharma',
      'biotechnology', 'wellness', 'fitness'
    ]);

    this.industryKeywords.set('education', [
      'education', 'learning', 'teaching', 'school', 'university', 'academic',
      'training', 'edtech', 'e-learning'
    ]);
  }

  async detectRole(context: RoleContext): Promise<RoleDetectionResult> {
    const startTime = Date.now();
    const requestId = `role_detect_${Date.now()}`;

    logger.info('Starting enhanced role detection', {
      requestId,
      email: context.email,
      hasName: !!context.name,
      hasCompany: !!context.companyName
    });

    try {
      // Check cache first
      const cacheKey = `role_detection_${context.email}_${context.companyName || 'unknown'}`;
      const cached = await vercelCache.get<RoleDetectionResult>('intelligence', cacheKey);

      if (cached) {
        logger.debug('Using cached role detection', { requestId, cacheKey });
        return cached;
      }

      // Multi-step role detection process
      const detectionSteps = await Promise.all([
        this.analyzeEmailPatterns(context),
        this.analyzeCompanySignals(context),
        this.analyzeBehavioralPatterns(context),
        this.analyzeIndustryContext(context)
      ]);

      // Combine results with weighted scoring
      const combinedResult = this.combineDetectionResults(detectionSteps);

      // Apply confidence calibration
      const calibratedResult = this.calibrateConfidence(combinedResult, context);

      // Cache the result
      await vercelCache.set('intelligence', cacheKey, calibratedResult, {
        ttl: CACHE_CONFIGS.INTELLIGENCE.ttl,
        tags: ['role_detection', 'intelligence']
      });

      const processingTime = Date.now() - startTime;
      calibratedResult.metadata.processingTime = processingTime;

      logger.info('Enhanced role detection completed', {
        requestId,
        detectedRole: calibratedResult.detectedRole.title,
        confidence: calibratedResult.confidence,
        processingTime
      });

      return calibratedResult;

    } catch (error) {
      logger.error('Enhanced role detection failed', error instanceof Error ? error : new Error('Unknown error'), {
        requestId,
        email: context.email,
        type: 'role_detection_error'
      });

      // Return fallback result
      return this.getFallbackRoleResult(context, Date.now() - startTime);
    }
  }

  private async analyzeEmailPatterns(context: RoleContext): Promise<Partial<RoleDetectionResult>> {
    const { email, name } = context;
    const emailDomain = email.split('@')[1]?.toLowerCase() || '';
    const emailLocal = email.split('@')[0]?.toLowerCase() || '';

    // Analyze email patterns for role indicators
    const patterns = {
      founder: /\b(founder|ceo|owner|president)\b/i,
      executive: /\b(cto|cto|vp|vice.president|director|head|chief)\b/i,
      manager: /\b(manager|mgr|lead|senior|sr)\b/i,
      developer: /\b(dev|eng|engineer|tech|software)\b/i,
      sales: /\b(sales|bd|business.development|account)\b/i,
      marketing: /\b(market|growth|product|pm)\b/i
    };

    const matches: string[] = [];
    const reasoning: string[] = [];

    for (const [role, pattern] of Object.entries(patterns)) {
      if (pattern.test(emailLocal) || pattern.test(name || '')) {
        matches.push(role);
        reasoning.push(`Email/name pattern suggests ${role} role`);
      }
    }

    // Company size indicators from domain
    let companySize = 'unknown';
    if (emailDomain.includes('gmail.com') || emailDomain.includes('yahoo.com')) {
      companySize = 'small'; // Likely startup or individual
      reasoning.push('Personal email domain suggests small company or startup');
    } else if (this.isFortune500Company(emailDomain)) {
      companySize = 'enterprise';
      reasoning.push('Fortune 500 company domain detected');
    }

    return {
      confidence: matches.length * 0.2, // Base confidence from pattern matches
      reasoning,
      sources: ['email_pattern_analysis'],
      metadata: {
        processingTime: 0,
        dataQuality: matches.length > 0 ? 'high' : 'medium',
        completeness: 0.6
      }
    };
  }

  private async analyzeCompanySignals(context: RoleContext): Promise<Partial<RoleDetectionResult>> {
    const { companyName, companyUrl, industry } = context;
    const reasoning: string[] = [];
    let confidence = 0;

    // Analyze company website for role indicators
    if (companyUrl) {
      try {
        // In a real implementation, you would fetch the company website
        // For now, we'll use URL pattern analysis
        const urlLower = companyUrl.toLowerCase();

        if (urlLower.includes('startup') || urlLower.includes('tech')) {
          confidence += 0.3;
          reasoning.push('Company URL suggests technology startup');
        }

        if (urlLower.includes('consulting') || urlLower.includes('agency')) {
          confidence += 0.2;
          reasoning.push('Company URL suggests consulting/agency business');
        }
      } catch (error) {
        logger.warn('Company URL analysis failed', { companyUrl, error: error instanceof Error ? error.message : 'Unknown' });
      }
    }

    // Industry-based role probability
    if (industry) {
      const industryRoles = this.getIndustryRoleProbabilities(industry);
      confidence += industryRoles.confidence;
      reasoning.push(...industryRoles.reasoning);
    }

    return {
      confidence,
      reasoning,
      sources: ['company_analysis'],
      metadata: {
        processingTime: 0,
        dataQuality: companyUrl ? 'high' : 'medium',
        completeness: 0.7
      }
    };
  }

  private async analyzeBehavioralPatterns(context: RoleContext): Promise<Partial<RoleDetectionResult>> {
    // This would analyze conversation patterns, tool usage, etc.
    // For now, return basic behavioral indicators
    return {
      confidence: 0.1,
      reasoning: ['Behavioral analysis pending implementation'],
      sources: ['behavioral_analysis'],
      metadata: {
        processingTime: 0,
        dataQuality: 'low',
        completeness: 0.3
      }
    };
  }

  private async analyzeIndustryContext(context: RoleContext): Promise<Partial<RoleDetectionResult>> {
    const { companyName, industry } = context;
    const reasoning: string[] = [];

    // Industry-specific role detection
    if (industry) {
      const industryLower = industry.toLowerCase();
      let detectedIndustry = '';

      for (const [industryKey, keywords] of this.industryKeywords.entries()) {
        if (keywords.some(keyword => industryLower.includes(keyword))) {
          detectedIndustry = industryKey;
          reasoning.push(`Industry keywords detected: ${industryKey}`);
          break;
        }
      }

      if (detectedIndustry) {
        const roles = this.rolePatterns.get(detectedIndustry) || [];
        if (roles.length > 0) {
          return {
            confidence: 0.4,
            reasoning,
            sources: ['industry_analysis'],
            metadata: {
              processingTime: 0,
              dataQuality: 'high',
              completeness: 0.8
            }
          };
        }
      }
    }

    return {
      confidence: 0.1,
      reasoning: ['Limited industry context available'],
      sources: ['industry_analysis'],
      metadata: {
        processingTime: 0,
        dataQuality: 'medium',
        completeness: 0.4
      }
    };
  }

  private combineDetectionResults(steps: Partial<RoleDetectionResult>[]): RoleDetectionResult {
    // Combine confidence scores with weights
    const weights = [0.4, 0.3, 0.2, 0.1]; // Email, Company, Behavioral, Industry
    const totalConfidence = steps.reduce((sum, step, index) =>
      sum + ((step.confidence || 0) * weights[index]), 0
    );

    // Combine reasoning
    const allReasoning = steps.flatMap(step => step.reasoning || []);
    const allSources = steps.flatMap(step => step.sources || []);

    // Select best role (this is simplified - in reality would use ML)
    const defaultRole: RoleProfile = {
      title: 'Business Professional',
      department: 'General',
      seniority: 'mid',
      responsibilities: ['General business activities'],
      skills: ['Communication', 'Problem solving'],
      industry: 'General Business'
    };

    return {
      detectedRole: defaultRole,
      confidence: Math.min(totalConfidence, 1.0),
      reasoning: allReasoning,
      alternativeRoles: [],
      sources: allSources,
      metadata: {
        processingTime: 0,
        dataQuality: totalConfidence > 0.7 ? 'high' : totalConfidence > 0.4 ? 'medium' : 'low',
        completeness: steps.reduce((sum, step) => sum + (step.metadata?.completeness || 0), 0) / steps.length
      }
    };
  }

  private calibrateConfidence(result: RoleDetectionResult, context: RoleContext): RoleDetectionResult {
    let { confidence } = result;

    // Boost confidence for known patterns
    if (context.email.includes('founder') || context.email.includes('ceo')) {
      confidence = Math.min(confidence + 0.3, 1.0);
      result.reasoning.push('Email pattern strongly indicates leadership role');
    }

    // Reduce confidence for generic domains
    if (context.email.includes('gmail.com') && !context.companyName) {
      confidence = Math.max(confidence - 0.2, 0.1);
      result.reasoning.push('Generic email domain reduces confidence');
    }

    // Boost confidence with company information
    if (context.companyName && context.companyUrl) {
      confidence = Math.min(confidence + 0.2, 1.0);
      result.reasoning.push('Company information available increases confidence');
    }

    return {
      ...result,
      confidence
    };
  }

  private getIndustryRoleProbabilities(industry: string): { confidence: number; reasoning: string[] } {
    const industryLower = industry.toLowerCase();
    const reasoning: string[] = [];

    // Simple keyword-based industry detection
    if (industryLower.includes('tech') || industryLower.includes('software')) {
      reasoning.push('Technology industry detected');
      return { confidence: 0.6, reasoning };
    }

    if (industryLower.includes('finance') || industryLower.includes('fintech')) {
      reasoning.push('Finance industry detected');
      return { confidence: 0.5, reasoning };
    }

    if (industryLower.includes('health') || industryLower.includes('medical')) {
      reasoning.push('Healthcare industry detected');
      return { confidence: 0.5, reasoning };
    }

    reasoning.push('General industry - no specific patterns detected');
    return { confidence: 0.2, reasoning };
  }

  private isFortune500Company(domain: string): boolean {
    // This would typically check against a database of Fortune 500 companies
    // For now, return false (would need actual implementation)
    return false;
  }

  private getFallbackRoleResult(context: RoleContext, processingTime: number): RoleDetectionResult {
    return {
      detectedRole: {
        title: 'Business Professional',
        department: 'General',
        seniority: 'mid',
        responsibilities: ['General business activities'],
        skills: ['Communication', 'Problem solving'],
        industry: 'General Business'
      },
      confidence: 0.1,
      reasoning: ['Fallback role due to detection error'],
      alternativeRoles: [],
      sources: ['fallback'],
      metadata: {
        processingTime,
        dataQuality: 'low',
        completeness: 0.2
      }
    };
  }

  // Public method to get role suggestions for UI
  async getRoleSuggestions(partialInput: string, limit: number = 5): Promise<RoleProfile[]> {
    const suggestions: RoleProfile[] = [];

    for (const roles of this.rolePatterns.values()) {
      const matchingRoles = roles.filter(role =>
        role.title.toLowerCase().includes(partialInput.toLowerCase()) ||
        role.department.toLowerCase().includes(partialInput.toLowerCase())
      );

      suggestions.push(...matchingRoles.slice(0, limit - suggestions.length));
      if (suggestions.length >= limit) break;
    }

    return suggestions.slice(0, limit);
  }

  // Method to update role patterns based on feedback
  updateRolePattern(role: string, feedback: 'correct' | 'incorrect', actualRole?: RoleProfile) {
    // This would implement machine learning feedback loop
    // For now, just log the feedback
    logger.info('Role detection feedback received', {
      role,
      feedback,
      actualRole: actualRole?.title,
      type: 'role_feedback'
    });
  }
}

// Export singleton instance
export const enhancedRoleDetector = new EnhancedRoleDetector();
