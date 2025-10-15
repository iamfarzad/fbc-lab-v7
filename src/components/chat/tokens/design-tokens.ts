// DEPRECATED: This module now forwards tokens from the consolidated design tokens.
// Please migrate imports to `src/components/chat/design-tokens`.
import { DESIGN_TOKENS as CONSOLIDATED_DESIGN_TOKENS } from '../design-tokens';
import { cn } from '@/lib/utils';

export const DESIGN_TOKENS = CONSOLIDATED_DESIGN_TOKENS;

export const combineTokens = (...tokens: string[]) => cn(...tokens);
