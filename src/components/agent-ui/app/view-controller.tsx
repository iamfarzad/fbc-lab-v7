'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from '@/components/agent-ui/app/session-context';
import { SessionView, type SessionInsights } from '@/components/agent-ui/app/session-view';
import { TermsOverlay } from '@/components/agent-ui/app/terms-overlay';
import { useChatIntelligence, type ResearchSnapshot, type ResearchSection } from '@/components/chat/hooks/useChatIntelligence';

const MAX_SUMMARY_LENGTH = 220;

function truncate(text: string | undefined, max: number): string | undefined {
  if (!text) return undefined;
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

function collectSources(snapshot: ResearchSnapshot | null): Array<{ id: string; title: string; url: string; description?: string }> {
  if (!snapshot) return [];
  const seen = new Map<string, { id: string; title: string; url: string; description?: string }>();
  const push = (section?: ResearchSection | null) => {
    if (!section?.citations) return;
    for (const cite of section.citations) {
      if (!cite.url) continue;
      if (!seen.has(cite.url)) {
        seen.set(cite.url, {
          id: `source-${seen.size + 1}`,
          url: cite.url,
          title: cite.title || cite.url,
          description: cite.description,
        });
      }
    }
  };

  push(snapshot.professionalProfile);
  push(snapshot.companyContext);
  push(snapshot.companyOverview);
  push(snapshot.roleContext);
  push(snapshot.industryInsights);
  push(snapshot.relevantCases);

  return Array.from(seen.values());
}

function buildChainOfThought(snapshot: ResearchSnapshot | null, leadName: string, companyName: string): SessionInsights['chainOfThought'] {
  if (!snapshot) {
    return [{
      id: 'collecting',
      label: 'Preparing personalised briefing…',
      description: 'Gathering public records and recent updates',
      status: 'active',
    }];
  }

  const steps = [] as SessionInsights['chainOfThought'];

  steps.push({
    id: 'profile',
    label: `Profile check: ${leadName}`,
    description: truncate(snapshot.professionalProfile?.summary, MAX_SUMMARY_LENGTH) || 'Still collecting professional background',
    status: snapshot.professionalProfile ? 'complete' : 'pending',
  });

  steps.push({
    id: 'company',
    label: `Company intel: ${companyName}`,
    description: truncate(snapshot.companyContext?.summary || snapshot.companyOverview?.summary, MAX_SUMMARY_LENGTH) || 'Scanning company registry and recent news',
    status: snapshot.companyContext || snapshot.companyOverview ? 'complete' : 'pending',
  });

  steps.push({
    id: 'role',
    label: 'Role & responsibilities',
    description: truncate(snapshot.roleContext?.summary, MAX_SUMMARY_LENGTH) || 'Mapping responsibilities from public presence',
    status: snapshot.roleContext ? 'complete' : 'pending',
  });

  steps.push({
    id: 'industry',
    label: 'Industry needs',
    description: truncate(snapshot.industryInsights?.summary, MAX_SUMMARY_LENGTH) || 'Identifying current industry challenges',
    status: snapshot.industryInsights ? 'complete' : 'pending',
  });

  steps.push({
    id: 'cases',
    label: 'Relevant case studies',
    description: truncate(snapshot.relevantCases?.summary, MAX_SUMMARY_LENGTH) || 'Lining up best-fit case studies',
    status: snapshot.relevantCases ? 'complete' : 'pending',
  });

  return steps;
}

function buildWelcomeReasoning(snapshot: ResearchSnapshot | null, companyName: string): string | undefined {
  if (!snapshot) return undefined;

  const sections: string[] = [];
  if (snapshot.companyContext?.summary) sections.push(`• ${snapshot.companyContext.summary}`);
  if (snapshot.roleContext?.summary) sections.push(`• Role focus: ${snapshot.roleContext.summary}`);
  if (snapshot.industryInsights?.summary) sections.push(`• Industry outlook: ${snapshot.industryInsights.summary}`);
  if (snapshot.relevantCases?.summary) sections.push(`• Cases worth referencing: ${snapshot.relevantCases.summary}`);

  if (sections.length === 0) return undefined;
  return [`I refreshed the research brief for ${companyName}:`, ...sections].join('\n');
}

function transformInsights(snapshot: ResearchSnapshot | null, leadName: string, companyName: string): SessionInsights | null {
  if (!snapshot) return null;

  return {
    chainOfThought: buildChainOfThought(snapshot, leadName, companyName),
    sources: collectSources(snapshot),
    summary: buildWelcomeReasoning(snapshot, companyName),
  };
}

export function ViewController({ forceTermsReset }: { forceTermsReset?: boolean }) {
  const { sessionId, isSessionActive, startSession, error } = useSession();
  const {
    hasAcceptedTerms,
    currentContext,
    agreed,
    name,
    email,
    setAgreed,
    setName,
    setEmail,
    handleTermsAcceptance,
    researchSnapshot,
    researchStatus,
  } = useChatIntelligence(sessionId, { forceTermsReset });

  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const hasSentWelcomeRef = useRef(false);

  const leadName = name?.trim() || email?.split('@')[0] || 'there';
  const firstName = leadName.split(/\s+/)[0] || leadName;
  const companyName = (currentContext?.company as any)?.name || (email?.split('@')[1] || 'your team');

  const hasStartedRef = useRef(false);
  useEffect(() => {
    if (hasAcceptedTerms && !isSessionActive && !hasStartedRef.current) {
      hasStartedRef.current = true;
      startSession().catch((err) => {
        console.warn('Failed to auto-start session', err);
        hasStartedRef.current = false; // Reset on error so we can retry
      });
    }
    // Reset flag when terms are not accepted
    if (!hasAcceptedTerms) {
      hasStartedRef.current = false;
    }
  }, [hasAcceptedTerms, isSessionActive, startSession]);

  useEffect(() => {
    if (hasAcceptedTerms) {
      setShowWelcomeBanner(true);
    } else {
      setShowWelcomeBanner(false);
      hasSentWelcomeRef.current = false;
    }
  }, [hasAcceptedTerms]);

  // Welcome injection moved into SessionView to use the same chat instance

  const insights = useMemo(() => transformInsights(researchSnapshot, firstName, companyName), [researchSnapshot, firstName, companyName]);

  return (
    <SessionView
      termsOverlay={
        <TermsOverlay
          open={!hasAcceptedTerms}
          name={name}
          email={email}
          agreed={agreed}
          onNameChange={setName}
          onEmailChange={setEmail}
          onAgreedChange={setAgreed}
          onAcceptTerms={handleTermsAcceptance}
          error={error}
        />
      }
      hasAcceptedTerms={hasAcceptedTerms}
      researchStatus={researchStatus}
      researchInsights={insights}
      intelligenceContext={currentContext}
      leadName={firstName}
      leadEmail={email}
      companyName={companyName}
      showWelcomeBanner={showWelcomeBanner && hasAcceptedTerms}
      onDismissWelcome={() => setShowWelcomeBanner(false)}
    />
  );
}
