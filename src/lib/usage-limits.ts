export interface SessionUsage {
  sessionId: string;
  email: string;
  started_at: number;
  
  // Message limits
  messages_sent: number;
  max_messages: number;  // 50 messages per session
  
  // Voice limits
  voice_minutes_used: number;
  max_voice_minutes: number;  // 10 minutes per session
  voice_started_at?: number;
  
  // Screen share limits
  screen_minutes_used: number;
  max_screen_minutes: number;  // 5 minutes per session
  screen_started_at?: number;
  
  // Webcam limits
  webcam_minutes_used: number;
  max_webcam_minutes: number;  // 3 minutes per session
  webcam_started_at?: number;
  
  // Research limits
  research_calls_used: number;
  max_research_calls: number;  // 3 research calls per session
  
  // Total session duration
  session_duration_minutes: number;
  max_session_duration: number;  // 30 minutes total session
}

export const DEFAULT_LIMITS: Omit<SessionUsage, 'sessionId' | 'email' | 'started_at'> = {
  messages_sent: 0,
  max_messages: 50,
  
  voice_minutes_used: 0,
  max_voice_minutes: 10,
  
  screen_minutes_used: 0,
  max_screen_minutes: 5,
  
  webcam_minutes_used: 0,
  max_webcam_minutes: 3,
  
  research_calls_used: 0,
  max_research_calls: 3,
  
  session_duration_minutes: 0,
  max_session_duration: 30
};

export class UsageLimiter {
  private storage: Map<string, SessionUsage> = new Map();
  
  async initSession(sessionId: string, email: string): Promise<SessionUsage> {
    const usage: SessionUsage = {
      sessionId,
      email,
      started_at: Date.now(),
      ...DEFAULT_LIMITS
    };
    this.storage.set(sessionId, usage);
    return usage;
  }
  
  async checkLimit(sessionId: string, type: 'message' | 'voice' | 'screen' | 'webcam' | 'research'): Promise<{ allowed: boolean; reason?: string }> {
    let usage = this.storage.get(sessionId);
    
    // Auto-initialize session if not found (graceful fallback)
    if (!usage) {
      console.log(`[UsageLimiter] Auto-initializing session: ${sessionId}`);
      usage = {
        sessionId,
        email: 'unknown',
        started_at: Date.now(),
        ...DEFAULT_LIMITS
      };
      this.storage.set(sessionId, usage);
    }
    
    // Check session duration
    const sessionMinutes = (Date.now() - usage.started_at) / 60000;
    if (sessionMinutes > usage.max_session_duration) {
      return { allowed: false, reason: 'Session time limit reached (30 min)' };
    }
    
    switch (type) {
      case 'message':
        if (usage.messages_sent >= usage.max_messages) {
          return { allowed: false, reason: 'Message limit reached (50 messages)' };
        }
        break;
      case 'voice':
        if (usage.voice_minutes_used >= usage.max_voice_minutes) {
          return { allowed: false, reason: 'Voice time limit reached (10 min)' };
        }
        break;
      case 'screen':
        if (usage.screen_minutes_used >= usage.max_screen_minutes) {
          return { allowed: false, reason: 'Screen share limit reached (5 min)' };
        }
        break;
      case 'webcam':
        if (usage.webcam_minutes_used >= usage.max_webcam_minutes) {
          return { allowed: false, reason: 'Webcam limit reached (3 min)' };
        }
        break;
      case 'research':
        if (usage.research_calls_used >= usage.max_research_calls) {
          return { allowed: false, reason: 'Research limit reached (3 calls)' };
        }
        break;
    }
    
    return { allowed: true };
  }
  
  async trackUsage(sessionId: string, type: 'message' | 'voice_start' | 'voice_stop' | 'screen_start' | 'screen_stop' | 'webcam_start' | 'webcam_stop' | 'research'): Promise<void> {
    let usage = this.storage.get(sessionId);
    
    // Auto-initialize if needed
    if (!usage) {
      console.log(`[UsageLimiter] Auto-initializing session for tracking: ${sessionId}`);
      usage = {
        sessionId,
        email: 'unknown',
        started_at: Date.now(),
        ...DEFAULT_LIMITS
      };
      this.storage.set(sessionId, usage);
    }
    
    const now = Date.now();
    
    switch (type) {
      case 'message':
        usage.messages_sent++;
        break;
      case 'voice_start':
        usage.voice_started_at = now;
        break;
      case 'voice_stop':
        if (usage.voice_started_at) {
          usage.voice_minutes_used += (now - usage.voice_started_at) / 60000;
          usage.voice_started_at = undefined;
        }
        break;
      case 'screen_start':
        usage.screen_started_at = now;
        break;
      case 'screen_stop':
        if (usage.screen_started_at) {
          usage.screen_minutes_used += (now - usage.screen_started_at) / 60000;
          usage.screen_started_at = undefined;
        }
        break;
      case 'webcam_start':
        usage.webcam_started_at = now;
        break;
      case 'webcam_stop':
        if (usage.webcam_started_at) {
          usage.webcam_minutes_used += (now - usage.webcam_started_at) / 60000;
          usage.webcam_started_at = undefined;
        }
        break;
      case 'research':
        usage.research_calls_used++;
        break;
    }
    
    this.storage.set(sessionId, usage);
  }
  
  async getUsage(sessionId: string): Promise<SessionUsage | null> {
    let usage = this.storage.get(sessionId);
    
    // Auto-initialize if needed (for UI polling)
    if (!usage) {
      usage = {
        sessionId,
        email: 'unknown',
        started_at: Date.now(),
        ...DEFAULT_LIMITS
      };
      this.storage.set(sessionId, usage);
    }
    
    return usage;
  }
}

export const usageLimiter = new UsageLimiter();

