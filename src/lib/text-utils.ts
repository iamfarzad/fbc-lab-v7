/**
 * Text processing utilities for ai-elements components
 * Provides unified serialization and message processing functions
 */

/**
 * Serializes various data types to displayable text
 * Handles strings, numbers, booleans, and complex objects
 * @param output - The data to serialize
 * @param context - Optional context for error logging
 * @returns Serialized string representation
 */
export function serializeToText(output: unknown, context = 'text-utils'): string {
  if (output == null) return '';
  
  if (typeof output === 'string') return output;
  
  if (typeof output === 'number' || typeof output === 'boolean') {
    return String(output);
  }
  
  try {
    return JSON.stringify(output, null, 2);
  } catch (error) {
    console.warn(`[${context}] Failed to serialize output`, error);
    return '[unserialisable output]';
  }
}

/**
 * Maps tool states to ai-elements compatible states
 * @param state - The tool state to map
 * @returns Mapped state for ai-elements components
 */
export function mapToolState(
  state: string
): 'input-streaming' | 'input-available' | 'output-available' | 'output-error' {
  const stateMap: Record<string, 'input-streaming' | 'input-available' | 'output-available' | 'output-error'> = {
    running: 'input-available',
    complete: 'output-available',
    error: 'output-error',
  };
  
  return stateMap[state] ?? 'output-available';
}

/**
 * Processes message content for display in ai-elements
 * Handles null/undefined content and ensures proper string formatting
 * @param content - The message content to process
 * @returns Processed content string or empty string
 */
export function processMessageContent(content: unknown): string {
  if (content == null) return '';
  
  if (typeof content === 'string') {
    return content.trim();
  }
  
  return serializeToText(content, 'message-content');
}

/**
 * Truncates text to a maximum length with ellipsis
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}…`;
}

/**
 * Extracts and formats citation information
 * @param citations - Array of citation objects
 * @returns Formatted citation data
 */
export function formatCitations(citations: Array<{ url?: string; title?: string; description?: string }>): Array<{
  id: string;
  url: string;
  title: string;
  description?: string;
}> {
  return citations
    .filter(c => c.url)
    .map((citation, index) => ({
      id: `citation-${index + 1}`,
      url: citation.url!,
      title: citation.title || citation.url!,
      description: citation.description,
    }));
}

/**
 * Validates if content should be rendered by ai-elements
 * @param content - Content to validate
 * @returns True if content should be rendered
 */
export function shouldRenderContent(content: unknown): boolean {
  if (content == null) return false;
  
  if (typeof content === 'string') {
    return content.trim().length > 0;
  }
  
  return true; // Non-string content should be serialized and rendered
}
