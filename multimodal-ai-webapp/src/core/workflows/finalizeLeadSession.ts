import type { LeadContext } from '../types/conversations'
import { logger } from '../../lib/logger'

/**
 * Temporary stub while PDF/email subsystems are not yet migrated.
 * Stage 6 of SOT_MIGRATION_PLAN should replace this with the full workflow.
 */
export async function finalizeLeadSession(ctx: LeadContext) {
  logger.warn('finalizeLeadSession called before PDF/email pipeline is available', { email: ctx.email })
  return null
}

export default finalizeLeadSession
