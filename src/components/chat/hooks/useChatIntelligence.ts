import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { CHAT_CONSTANTS } from "../constants/chatConstants";

type Citation = {
  url: string;
  title?: string;
  description?: string;
};

export type ResearchSection = {
  summary: string;
  citations: Citation[];
  [key: string]: unknown;
};

export interface ResearchSnapshot {
  status: 'pending' | 'completed' | 'skipped' | 'failed';
  completedAt?: number | null;
  professionalProfile?: ResearchSection | null;
  companyContext?: ResearchSection | null;
  companyOverview?: ResearchSection | null;
  roleContext?: ResearchSection | null;
  industryInsights?: ResearchSection | null;
  relevantCases?: ResearchSection | null;
}

export function useChatIntelligence(id?: string | null, options?: { forceTermsReset?: boolean }) {
  const [contextReady, setContextReady] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentContext, setCurrentContext] = useState<{
    company?: { name?: string; industry?: string };
    person?: { fullName?: string; role?: string };
  } | null>(null);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([...CHAT_CONSTANTS.DEFAULT_SUGGESTIONS]);
  const [researchSnapshot, setResearchSnapshot] = useState<ResearchSnapshot | null>(null);
  const [researchStatus, setResearchStatus] = useState<'idle' | 'loading' | 'ready' | 'skipped' | 'error'>('idle');

  const sessionIdRef = useRef<string>(id ?? crypto.randomUUID());
  const hasInitialisedRef = useRef(false);

  useEffect(() => {
    if (id && sessionIdRef.current !== id) {
      sessionIdRef.current = id;
    }
  }, [id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('fbc-terms-accepted') === 'true';
      setHasAcceptedTerms(stored);
    } catch (error) {
      console.warn('Unable to read stored terms acceptance', error);
    }
  }, []);

  // Fetch suggestions from API
  const fetchSuggestions = useCallback(async () => {
    try {
      const response = await fetch('/api/intelligence/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionIdRef.current })
      });

      if (!response.ok) {
        setSuggestions([...CHAT_CONSTANTS.DEFAULT_SUGGESTIONS]);
        return;
      }

      const data = await response.json();
      const raw = Array.isArray(data?.suggestions) ? data.suggestions : data?.output?.suggestions;
      if (!Array.isArray(raw) || raw.length === 0) {
        setSuggestions([...CHAT_CONSTANTS.DEFAULT_SUGGESTIONS]);
        return;
      }

      setSuggestions(
        raw.map((item: any) =>
          (item?.label || item?.text || '').toString().trim() || 'Ask another question'
        )
      );
    } catch (error) {
      console.warn('Suggestion fetch failed', error);
      setSuggestions([...CHAT_CONSTANTS.DEFAULT_SUGGESTIONS]);
    }
  }, []);

  // Initialize AI session
  const initialiseSession = useCallback(async () => {
    if (hasInitialisedRef.current || !hasAcceptedTerms) return;

    try {
      setContextReady(false);
      const response = await fetch('/api/intelligence/session-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          email: email || 'anonymous@example.com',
          consentGiven: true
        })
      });

      if (!response.ok) {
        console.warn('Failed to initialise intelligence session', await response.text());
        return;
      }
      const data = await response.json();
      sessionIdRef.current = data.sessionId || sessionIdRef.current;
      hasInitialisedRef.current = true;

      const nextContextReady = Boolean(data.contextReady);
      setContextReady(nextContextReady);

      if (data.context) {
        setCurrentContext({
          company: data.context.company ? {
            name: data.context.company.name,
            industry: data.context.company.industry
          } : undefined,
          person: data.context.person ? { fullName: data.context.person.fullName, role: data.context.role } : undefined
        });
      }

      await fetchSuggestions();
    } catch (error) {
      console.warn('Session initialisation failed', error);
    }
  }, [hasAcceptedTerms, email, fetchSuggestions]);

  // Handle terms acceptance
  const handleTermsAcceptance = useCallback(async () => {
    if (!agreed || !email.trim() || !name.trim()) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      console.warn('Invalid email format');
      return;
    }

    // Store acceptance in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('fbc-terms-accepted', 'true');
    }

    setHasAcceptedTerms(true);
    setAgreed(false);

    // Initialize session if not already done
    if (!hasInitialisedRef.current) {
      await initialiseSession();
    }

    // Initialize usage limits for this session
    const { usageLimiter } = await import('@/src/lib/usage-limits');
    await usageLimiter.initSession(sessionIdRef.current, email.trim());

    // Trigger background context research (non-blocking)
    console.log('🔍 Triggering background research...');
    fetch('/api/research/initial-context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name: name.trim(), 
        email: email.trim(), 
        sessionId: sessionIdRef.current 
      })
    }).then(res => {
      if (res.ok) {
        console.log('✅ Background research initiated successfully');
        setResearchStatus(prev => (prev === 'ready' || prev === 'skipped') ? prev : 'loading');
      } else {
        console.warn('⚠️ Background research failed, continuing with limited context');
        setResearchStatus('error');
      }
    }).catch(err => {
      console.warn('⚠️ Background research failed:', err);
      setResearchStatus('error');
    });

    toast.success('Welcome to F.B/c AI! Your personalized consultation begins now.');
  }, [agreed, email, name, initialiseSession]);

  // Initialize session when chat opens or terms are accepted
  useEffect(() => {
    if (hasAcceptedTerms) {
      void initialiseSession();
      if (researchStatus === 'idle') {
        setResearchStatus('loading');
      }
    }
  }, [hasAcceptedTerms, initialiseSession, researchStatus]);

  // Optional forced reset (e.g., /live?forceTerms=1 for demos)
  useEffect(() => {
    if (!options?.forceTermsReset) return;
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('fbc-terms-accepted', 'false');
      }
      setHasAcceptedTerms(false);
      setAgreed(false);
      setName('');
      setEmail('');
      hasInitialisedRef.current = false;
      setContextReady(false);
      setResearchSnapshot(null);
      setResearchStatus('idle');
    } catch {}
  }, [options?.forceTermsReset]);

  const fetchResearchSnapshot = useCallback(async (): Promise<'pending' | 'ready' | 'skipped' | 'error'> => {
    try {
      const response = await fetch('/api/intelligence/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionIdRef.current })
      });

      if (response.status === 404) {
        return 'pending';
      }

      if (!response.ok) {
        console.warn('Failed to fetch research snapshot', await response.text());
        return 'error';
      }

      const data = await response.json();
      const payload = data?.context ?? {};

      if (payload.lead) {
        setCurrentContext(prev => ({
          company: prev?.company,
          person: prev?.person,
          ...('company' in payload && payload.company ? { company: payload.company } : {}),
          ...('person' in payload && payload.person ? { person: payload.person } : {}),
        }));
      }

      if (payload.research) {
        const snapshot: ResearchSnapshot = {
          status: payload.research.status || 'pending',
          completedAt: payload.research.completedAt ?? null,
          professionalProfile: payload.research.professionalProfile || null,
          companyContext: payload.research.companyContext || null,
          companyOverview: payload.research.companyOverview || null,
          roleContext: payload.research.roleContext || null,
          industryInsights: payload.research.industryInsights || null,
          relevantCases: payload.research.relevantCases || null,
        };
        setResearchSnapshot(snapshot);

        if (snapshot.status === 'completed') {
          setContextReady(true);
          return 'ready';
        }

        if (snapshot.status === 'skipped') {
          setContextReady(true);
          return 'skipped';
        }
      }

      return 'pending';
    } catch (error) {
      console.warn('Research snapshot fetch failed', error);
      return 'error';
    }
  }, []);

  useEffect(() => {
    if (!hasAcceptedTerms) return;

    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;
      const status = await fetchResearchSnapshot();
      if (cancelled) return;

      if (status === 'ready') {
        setResearchStatus('ready');
        return;
      }

      if (status === 'skipped') {
        setResearchStatus('skipped');
        return;
      }

      if (status === 'error') {
        if (attempts >= 3) {
          setResearchStatus('error');
          return;
        }
      }

      if (attempts < 6) {
        window.setTimeout(poll, 3500);
      } else if (status === 'pending') {
        setResearchStatus('loading');
      }
    };

    if (researchStatus === 'idle' || researchStatus === 'loading') {
      poll();
    }

    return () => {
      cancelled = true;
    };
  }, [hasAcceptedTerms, fetchResearchSnapshot, researchStatus]);

  return {
    contextReady,
    currentContext,
    hasAcceptedTerms,
    suggestions,
    agreed,
    name,
    email,
    sessionId: sessionIdRef.current,
    setAgreed,
    setName,
    setEmail,
    handleTermsAcceptance,
    researchSnapshot,
    researchStatus,
  };
}
