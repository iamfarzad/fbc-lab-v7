import { NextRequest, NextResponse } from 'next/server';
import { GoogleGroundingProvider } from '@/core/intelligence/providers/search/google-grounding';
import { ContextStorage } from '@/core/context/context-storage';
import { usageLimiter } from '@/src/lib/usage-limits';

const groundingProvider = new GoogleGroundingProvider();
const contextStorage = new ContextStorage();

// Helper: Detect generic email providers
function isGenericEmail(email: string): boolean {
  const genericDomains = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com', 'proton.me', 'protonmail.com'];
  const domain = email.split('@')[1]?.toLowerCase();
  return genericDomains.includes(domain);
}

// Helper: Detect country from research text
function detectCountryFromText(text: string): string {
  const lowerText = text.toLowerCase();
  
  // Nordic countries
  if (lowerText.includes('norway') || lowerText.includes('norwegian') || lowerText.includes('.no')) return 'norway';
  if (lowerText.includes('sweden') || lowerText.includes('swedish') || lowerText.includes('.se')) return 'sweden';
  if (lowerText.includes('denmark') || lowerText.includes('danish') || lowerText.includes('.dk')) return 'denmark';
  if (lowerText.includes('finland') || lowerText.includes('finnish') || lowerText.includes('.fi')) return 'finland';
  
  // Europe
  if (lowerText.includes('united kingdom') || lowerText.includes('uk') || lowerText.includes('britain') || lowerText.includes('.uk')) return 'uk';
  if (lowerText.includes('germany') || lowerText.includes('german') || lowerText.includes('.de')) return 'germany';
  if (lowerText.includes('france') || lowerText.includes('french') || lowerText.includes('.fr')) return 'france';
  if (lowerText.includes('netherlands') || lowerText.includes('dutch') || lowerText.includes('.nl')) return 'netherlands';
  
  // North America
  if (lowerText.includes('united states') || lowerText.includes('usa') || lowerText.includes('us ') || lowerText.includes('america')) return 'usa';
  if (lowerText.includes('canada') || lowerText.includes('canadian') || lowerText.includes('.ca')) return 'canada';
  
  // Default
  return 'unknown';
}

// Helper: Get appropriate public registry source by country
function getPublicRegistrySource(country: string, domain: string): string {
  const registries: Record<string, string> = {
    'norway': 'Proff.no or Brønnøysundregistrene',
    'sweden': 'Allabolag.se or Bolagsverket',
    'denmark': 'CVR.dk (Central Business Register)',
    'finland': 'Finder.fi or Ytj.fi (Business Information System)',
    'uk': 'Companies House UK',
    'germany': 'Handelsregister or Bundesanzeiger',
    'france': 'Infogreffe or INSEE Sirene',
    'netherlands': 'KVK (Kamer van Koophandel)',
    'usa': 'SEC EDGAR or state business registry',
    'canada': 'Corporations Canada or provincial registry',
  };
  
  return registries[country] || `public company registry for ${domain}`;
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, sessionId } = await req.json();
    
    if (!email || !sessionId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // CHECK: Valid business email required (cost protection)
    if (isGenericEmail(email)) {
      console.log(`⚠️ Generic email detected: ${email}, skipping company research`);
      // Only do basic research for generic emails
      const enrichedContext = {
        email,
        name,
        research_timestamp: Date.now(),
        research_status: 'skipped',
        reason: 'Generic email - business email required for full research'
      };
      await contextStorage.store(sessionId, enrichedContext as any);
      return NextResponse.json({ 
        success: true,
        message: 'Business email required for full context research. Conversation will proceed with limited context.'
      });
    }
    
    // CHECK: Research limit (cost protection)
    const limitCheck = await usageLimiter.checkLimit(sessionId, 'research');
    if (!limitCheck.allowed) {
      return NextResponse.json({ 
        error: limitCheck.reason,
        limit_reached: true 
      }, { status: 429 });
    }
    
    // Check existing context - don't re-research if fresh (within 7 days)
    const existingContext = await contextStorage.get(sessionId);
    if ((existingContext as any)?.research_timestamp) {
      const age = Date.now() - (existingContext as any).research_timestamp;
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (age < sevenDays) {
        console.log(`✅ Using cached research (age: ${Math.floor(age / 86400000)} days)`);
        return NextResponse.json({ success: true, cached: true });
      }
    }
    
    // Track research usage
    await usageLimiter.trackUsage(sessionId, 'research');
    
    console.log(`🔍 Starting comprehensive background research for ${name} (${email})`);
    
    // Extract company domain from email
    const emailDomain = email.split('@')[1];
    
    // First, detect company location to query the right public registry
    const locationQuery = `${emailDomain} company location and headquarters country`;
    const locationResult = await groundingProvider.groundedAnswer(locationQuery);
    const companyCountry = detectCountryFromText(locationResult?.text || '');
    
    // Get the appropriate registry URL based on country
    const registrySource = getPublicRegistrySource(companyCountry, emailDomain);
    
    console.log(`📍 Detected location: ${companyCountry}, using registry: ${registrySource}`);
    
    // Consultant-focused research queries (what you need to know)
    const queries = [
      // PRIOR to conversation - Professional profile
      `${name} professional background, current role, career history, LinkedIn profile`,
      
      // PRIOR - Company intelligence (geo-specific public registries)
      `${emailDomain} company information from ${registrySource}: organization number, revenue, employees, industry code, board members, financial data, founding date`,
      
      // PRIOR - Company overview
      `${emailDomain} business overview: products, services, market position, recent news, website`,
      
      // PRIOR - Business context
      `${name} at ${emailDomain}: role, responsibilities, seniority level, professional activities`,
      
      // DURING conversation - Potential needs
      `Common challenges and needs in ${emailDomain} industry for AI consulting and automation`,
      
      // AFTER conversation prep - Relevant case studies
      `AI consulting success stories and case studies in ${emailDomain} industry`
    ];
    
    // Run comprehensive research in parallel
    const results = await Promise.allSettled(
      queries.map(q => groundingProvider.groundedAnswer(q))
    );
    
    // Structure the research results by consultant needs
    const successfulResults = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map(r => r.value);
    
    const [
      professionalProfile,
      companyIntelligence, 
      companyOverview,
      roleContext,
      industryChallenges,
      relevantCaseStudies
    ] = successfulResults;
    
    // Store enriched context with structured data
    const enrichedContext = {
      email,
      name,
      company_domain: emailDomain,
      company_country: companyCountry,
      research_timestamp: Date.now(),
      research_status: 'completed',
      
      // PRIOR conversation - Know your client
      professional_profile: {
        summary: professionalProfile?.text || '',
        citations: professionalProfile?.citations || [],
      },
      company_context: {
        summary: companyIntelligence?.text || '',
        citations: companyIntelligence?.citations || [],
      },
      company_overview: {
        summary: companyOverview?.text || '',
        citations: companyOverview?.citations || [],
      },
      role_context: {
        summary: roleContext?.text || '',
        citations: roleContext?.citations || [],
      },
      
      // DURING conversation - Tailor your approach  
      industry_insights: {
        challenges: industryChallenges?.text || '',
        citations: industryChallenges?.citations || [],
      },
      
      // AFTER conversation - Follow-up material
      relevant_cases: {
        summary: relevantCaseStudies?.text || '',
        citations: relevantCaseStudies?.citations || [],
      },
      
      // Raw research for debugging
      raw_research: successfulResults
    };
    
    await contextStorage.store(sessionId, enrichedContext as any);
    
    console.log(`✅ Comprehensive research completed for ${name}`);
    console.log(`   - Professional profile: ${professionalProfile?.citations?.length || 0} sources`);
    console.log(`   - Company intel: ${companyIntelligence?.citations?.length || 0} sources`);
    console.log(`   - Role context: ${roleContext?.citations?.length || 0} sources`);
    
    return NextResponse.json({ 
      success: true,
      summary: {
        name,
        company: emailDomain,
        country: companyCountry,
        sources_gathered: successfulResults.reduce((acc, r) => acc + (r.citations?.length || 0), 0)
      }
    });
  } catch (error) {
    console.error('Background research error:', error);
    // Store minimal context so conversation can proceed
    try {
      const { name, email, sessionId } = await req.json();
      await contextStorage.store(sessionId, {
        email,
        name,
        research_status: 'failed',
        research_error: error instanceof Error ? error.message : String(error),
        research_timestamp: Date.now()
      } as any);
    } catch (storageError) {
      console.error('Failed to store error context:', storageError);
    }
    return NextResponse.json({ 
      success: false, 
      error: 'Research failed, conversation will proceed with limited context' 
    }, { status: 500 });
  }
}

