/**
 * Security Utilities
 * Comprehensive security validation and sanitization
 * Content Security Policy headers, input validation, XSS protection
 */

// Content Security Policy configuration
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Required for Next.js dev
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'https:'],
  'media-src': ["'self'", 'blob:'],
  'connect-src': ["'self'", 'wss:', 'https:'],
  'font-src': ["'self'", 'data:', 'https:'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': [],
} as const;

// Generate CSP header string
export function generateCSPHeader(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}

// Input validation patterns
export const VALIDATION_PATTERNS = {
  // Allow only alphanumeric, spaces, and basic punctuation for user input
  text: /^[a-zA-Z0-9\s\.\,\!\?\-\(\)\[\]\{\}:;'"@#$%^&*+=<>~`]*$/,
  
  // Email validation
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  
  // Session ID validation (UUID format)
  sessionId: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  
  // Device ID validation
  deviceId: /^[a-zA-Z0-9\-_]+$/,
  
  // Base64 validation
  base64: /^[A-Za-z0-9+/]*={0,2}$/,
  
  // URL validation
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?//=]*)$/,
} as const;

// XSS prevention utilities
export class XSSPrevention {
  /**
   * Sanitize user input to prevent XSS attacks
   */
  static sanitize(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      // Remove potentially dangerous characters
      .replace(/[<>]/g, '')
      // Remove javascript: protocol
      .replace(/javascript:/gi, '')
      // Remove on* event handlers
      .replace(/on\w+\s*=/gi, '')
      // Remove data: URLs
      .replace(/data:/gi, '')
      // Limit length
      .slice(0, 1000);
  }

  /**
   * Validate input against a pattern
   */
  static validate(input: string, pattern: keyof typeof VALIDATION_PATTERNS): boolean {
    return VALIDATION_PATTERNS[pattern].test(input);
  }

  /**
   * Sanitize HTML content
   */
  static sanitizeHTML(input: string): string {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  /**
   * Check if string contains potentially dangerous content
   */
  static containsThreats(input: string): boolean {
    const threats = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /data:text\/html/i,
      /vbscript:/i,
      /onload/i,
      /onerror/i,
      /eval\(/i,
      /alert\(/i,
      /document\./i,
      /window\./i,
    ];

    return threats.some(threat => threat.test(input));
  }
}

// Rate limiting utilities
export class RateLimiter {
  private static requests = new Map<string, number[]>();
  private static readonly windowMs = 60000; // 1 minute windows

  /**
   * Check if a request should be rate limited
   */
  static isRateLimited(identifier: string, maxRequests: number = 100): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, []);
    }
    
    const timestamps = this.requests.get(identifier)!;
    
    // Remove old timestamps outside the window
    const validTimestamps = timestamps.filter(ts => ts > windowStart);
    this.requests.set(identifier, validTimestamps);
    
    // Check if limit exceeded
    if (validTimestamps.length >= maxRequests) {
      return true;
    }
    
    // Add current timestamp
    validTimestamps.push(now);
    return false;
  }

  /**
   * Get remaining requests for a client
   */
  static getRemainingRequests(identifier: string, maxRequests: number): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(identifier)) {
      return maxRequests;
    }
    
    const timestamps = this.requests.get(identifier)!;
    const validTimestamps = timestamps.filter(ts => ts > windowStart);
    
    return Math.max(0, maxRequests - validTimestamps.length);
  }
}

// Permission validation utilities
export class PermissionValidator {
  /**
   * Validate camera permissions
   */
  static async validateCameraPermission(): Promise<boolean> {
    try {
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return false;
      }

      // Check for camera devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        return false;
      }

      // Try to get permission (this will prompt user if not granted)
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      
      return true;
    } catch (error) {
      console.warn('Camera permission validation failed:', error);
      return false;
    }
  }

  /**
   * Validate microphone permissions
   */
  static async validateMicrophonePermission(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return false;
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      
      if (audioDevices.length === 0) {
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      
      return true;
    } catch (error) {
      console.warn('Microphone permission validation failed:', error);
      return false;
    }
  }
}

// Secure headers utilities
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': generateCSPHeader(),
} as const;

// Utility function to check if running in secure context
export function isSecureContext(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    window.location.protocol === 'https:'
  );
}

// Utility function to validate media type
export function isValidMediaType(type: string): boolean {
  const validTypes = [
    'audio/webm',
    'audio/ogg',
    'audio/wav',
    'audio/mpeg',
    'audio/mp4',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/webm',
    'video/mp4',
  ];

  return validTypes.includes(type.toLowerCase());
}

// Utility function to sanitize file names
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase()
    .slice(0, 255);
}
