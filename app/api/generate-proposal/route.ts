import { NextRequest, NextResponse } from 'next/server';
import { respond } from '@/lib/api/response'
import { ContextStorage } from '@/core/context/context-storage';
import { usageLimiter } from '@/src/lib/usage-limits';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { CONTACT_CONFIG, GEMINI_MODELS } from '@/config/constants';

const contextStorage = new ContextStorage();

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    
    // Get conversation context
    const context = await contextStorage.get(sessionId);
    const usage = await usageLimiter.getUsage(sessionId);
    
    if (!context || !usage) {
      return respond.notFound('Session not found');
    }
    
    console.log('📄 Generating proposal for:', context.name);
    
    // Generate proposal content using AI
    const proposalPrompt = `Based on this consulting conversation, generate a personalized proposal in markdown format:

CLIENT PROFILE:
- Name: ${(context as any).name || 'Not specified'}
- Email: ${context.email}
- Company: ${(context as any).company_domain || 'Not specified'}
- Industry: ${typeof (context as any).company_context?.summary === 'string' ? (context as any).company_context.summary : 'Not specified'}
- Role: ${typeof (context as any).role_context?.summary === 'string' ? (context as any).role_context.summary : 'Not specified'}

CONVERSATION INSIGHTS:
- Messages exchanged: ${usage.messages_sent}
- Voice time: ${Math.floor(usage.voice_minutes_used)} minutes
- Screen share used: ${usage.screen_minutes_used > 0 ? 'Yes' : 'No'}
- Research performed: ${usage.research_calls_used} queries

DISCOVERED CONTEXT:
${typeof (context as any).industry_insights?.challenges === 'string' ? (context as any).industry_insights.challenges : 'General AI consulting needs'}

Generate a professional proposal with these sections:

# Your Personalized AI Strategy Proposal

## Executive Summary
- Who ${context.name} is (based on research)
- Key challenges we identified in our conversation
- How F.B/c can help

## Recommended Solution
Choose one based on conversation depth:
- **AI Strategy Workshop (1-day, in-person)** - Best for exploring AI opportunities
- **Custom AI Implementation (4-8 weeks)** - Best for specific use case identified
- **AI Readiness Assessment (2 weeks)** - Best for early-stage exploration

Include timeline and expected outcomes.

## Your Company Context
${typeof (context as any).company_overview?.summary === 'string' ? (context as any).company_overview.summary : 'Brief overview based on available information'}

## Next Steps
1. Book a 30-minute strategy call: [${CONTACT_CONFIG.SCHEDULING.BOOKING_URL}](${CONTACT_CONFIG.SCHEDULING.BOOKING_URL})
2. Email: ${CONTACT_CONFIG.SUPPORT_EMAIL}
3. Website: ${CONTACT_CONFIG.WEBSITE_URL.replace(/^https?:\/\//, '')}

---

*This proposal was generated based on our ${usage.messages_sent}-message conversation and ${Math.floor(usage.session_duration_minutes || 0)} minutes of interaction.*

Format as clean, professional markdown. Be concise and specific.`;

    const model = google(GEMINI_MODELS.FLASH_EXP);
    const result = await generateText({
      model,
      prompt: proposalPrompt,
      temperature: 0.7
    });

    const proposalText = result.text;
    
    // Return as downloadable markdown file
    const blob = Buffer.from(proposalText, 'utf-8');
    
    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': `attachment; filename="FBC-Proposal-${context.name?.replace(/\s+/g, '-') || 'Client'}.md"`
      }
    });
  } catch (error) {
    console.error('Proposal generation error:', error);
    return respond.serverError('Failed to generate proposal', { details: error instanceof Error ? error.message : String(error) })
  }
}
