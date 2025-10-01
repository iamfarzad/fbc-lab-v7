import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { CHAT_CONSTANTS } from "../constants/chatConstants";

export function useChatIntelligence(id?: string | null) {
  const [contextReady, setContextReady] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [email, setEmail] = useState('');
  const [currentContext, setCurrentContext] = useState<{
    company?: { name?: string };
    person?: { fullName?: string; role?: string };
  } | null>(null);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fbc-terms-accepted') === 'true';
    }
    return false;
  });
  const [suggestions, setSuggestions] = useState<string[]>([...CHAT_CONSTANTS.DEFAULT_SUGGESTIONS]);

  const sessionIdRef = useRef<string>(id || '');
  const hasInitialisedRef = useRef(false);

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
      hasInitialisedRef.current = true;
      setContextReady(true);

      // Set current context from session data
      if (data.context) {
        setCurrentContext({
          company: data.context.company ? { name: data.context.company.name } : undefined,
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
    if (!agreed || !email.trim()) return;

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

    toast.success('Welcome to F.B/c AI! Your personalized consultation begins now.');
  }, [agreed, email, initialiseSession]);

  // Initialize session when chat opens or terms are accepted
  useEffect(() => {
    if (hasAcceptedTerms) {
      void initialiseSession();
    }
  }, [hasAcceptedTerms, initialiseSession]);

  return {
    contextReady,
    currentContext,
    hasAcceptedTerms,
    suggestions,
    agreed,
    email,
    sessionId: sessionIdRef.current,
    setAgreed,
    setEmail,
    handleTermsAcceptance,
  };
}

