import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convert a Blob to base64 string (without data URL prefix)
 * Matches prototype implementation for Gemini Live API compatibility
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      resolve(base64String.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// Theme utilities for Agent UI
export const THEME_STORAGE_KEY = 'theme-mode'
export const THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)'
