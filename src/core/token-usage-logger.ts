// Token usage logging and budget enforcement
import { AVAILABLE_MODELS } from './models'
import { supabaseService } from '@/src/core/supabase/client'

function ensureService() {
  const service = supabaseService
  if (!service || typeof (service as any)?.from !== 'function') {
    throw new Error('Supabase service client unavailable')
  }
  return service
}

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const modelConfig = AVAILABLE_MODELS[model]
  if (!modelConfig) {
    // Default to a safe average if model not found
    return (inputTokens * 0.000001) + (outputTokens * 0.000003)
  }

  return (inputTokens * modelConfig.inputCostPerToken) + (outputTokens * modelConfig.outputCostPerToken)
}

export async function enforceBudgetAndLog(
  userId: string | null,
  sessionId: string,
  operation: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  isTool: boolean = false
): Promise<{ allowed: boolean; reason?: string }> {
  const totalTokens = inputTokens + outputTokens

  // Budget check (simple implementation)
  if (totalTokens > 10000) {
    return {
      allowed: false,
      reason: 'Token limit exceeded'
    }
  }

  // Calculate cost
  const cost = calculateCost(model, inputTokens, outputTokens)

  // Persist to database (non-blocking)
  try {
    const service = ensureService()
    await service
      .from('token_usage_log')
      .insert({
        session_id: sessionId,
        user_id: userId || null,
        model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost,
        operation,
        is_tool: isTool,
        timestamp: new Date().toISOString()
      })
  } catch (error) {
    // Log error but don't block the operation
    console.error('Failed to log token usage to database:', error)
    // Fallback to console log
    console.log(`Token usage: ${operation} - ${totalTokens} tokens (${inputTokens} in, ${outputTokens} out) - Cost: $${cost.toFixed(6)}`)
  }

  return { allowed: true }
}

// Query token usage for analytics
export async function getTokenUsageByDateRange(
  startDate: Date,
  endDate: Date,
  model?: string
): Promise<Array<{
  date: string
  total_tokens: number
  total_cost: number
  model?: string
}>> {
  try {
    const service = ensureService()
    let query = service
      .from('token_usage_log')
      .select('timestamp, total_tokens, cost, model')
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())

    if (model) {
      query = query.eq('model', model)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching token usage:', error)
      return []
    }

    // Group by date
    const grouped: Record<string, { total_tokens: number; total_cost: number }> = {}
    
    data?.forEach((entry: any) => {
      const date = new Date(entry.timestamp).toISOString().split('T')[0]
      if (!grouped[date]) {
        grouped[date] = { total_tokens: 0, total_cost: 0 }
      }
      grouped[date].total_tokens += entry.total_tokens || 0
      grouped[date].total_cost += Number(entry.cost || 0)
    })

    return Object.entries(grouped).map(([date, totals]) => ({
      date,
      ...totals,
      ...(model && { model })
    }))
  } catch (error) {
    console.error('Error in getTokenUsageByDateRange:', error)
    return []
  }
}
