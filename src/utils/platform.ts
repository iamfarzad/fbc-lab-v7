/**
 * Platform detection utilities
 * Used to detect browser and device capabilities for feature gating
 */

/**
 * Detects if the current environment is iOS Safari
 * iOS Safari does not support getDisplayMedia API
 */
export function isIOSSafari(): boolean {
  if (typeof window === 'undefined') return false
  
  const ua = window.navigator.userAgent.toLowerCase()
  
  // Check for iOS
  const isIOS = /iphone|ipad|ipod/.test(ua)
  
  // Check for Safari (not Chrome/Firefox on iOS)
  const isSafari = /safari/.test(ua) && !/chrome|firefox|crios|fxios/.test(ua)
  
  return isIOS && isSafari
}

/**
 * Checks if getDisplayMedia API is supported
 * More reliable than just checking if function exists
 */
export function isScreenShareSupported(): boolean {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
    return false
  }
  
  // iOS Safari doesn't support getDisplayMedia
  if (isIOSSafari()) {
    return false
  }
  
  // Check if the API exists
  return typeof navigator.mediaDevices.getDisplayMedia === 'function'
}

/**
 * Detects if running on a mobile device (iOS or Android)
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  
  const ua = window.navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod|android/.test(ua)
}

/**
 * Detects if running on iOS (any browser)
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false
  
  const ua = window.navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod/.test(ua)
}
