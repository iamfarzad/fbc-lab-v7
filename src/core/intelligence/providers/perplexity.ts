/*
  Perplexity provider: streaming OpenAI-compatible /chat/completions with web search
  NOTE: This uses Server-side fetch from Next.js route handlers. Do not import in client components.
*/

export type PerplexityMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type PerplexityOptions = {
  model?: string
  web_search?: boolean
  search_domain_filter?: string[]
  search_mode?: 'academic'
  temperature?: number
  max_output_tokens?: number
  web_search_options?: {
    search_context_size?: 'low' | 'medium' | 'high'
    latest_updated?: string
  }
}

type StreamEvent = {
  content?: string
  citations?: string[]
  done?: boolean
}

const PERPLEXITY_URL = 'https://api.perplexity.ai/chat/completions'

export async function *streamPerplexity(params: {
  apiKey: string
  messages: PerplexityMessage[]
  options?: PerplexityOptions
}): AsyncGenerator<StreamEvent, void, unknown> {
  const { apiKey, messages, options } = params
  const body: Record<string, unknown> = {
    model: options?.model ?? 'sonar-pro',
    stream: true,
    messages,
    web_search: options?.web_search ?? true,
    temperature: options?.temperature ?? 0.3,
    max_tokens: options?.max_output_tokens ?? 1024,
  }
  if (options?.search_domain_filter?.length) body.search_domain_filter = options.search_domain_filter
  if (options?.search_mode) body.search_mode = options.search_mode
  if (options?.web_search_options) body.web_search_options = options.web_search_options

  const res = await fetch(PERPLEXITY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '')
    throw new Error(`Perplexity error ${res.status}: ${text}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let citations: string[] | undefined

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split('\n')
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const payload = line.slice(6).trim()
      if (!payload) continue
      if (payload === '[DONE]') {
        const safeCitations: string[] = Array.isArray(citations) ? citations : [];
        yield { done: true, citations: safeCitations }
        return
      }
      try {
        const json = JSON.parse(payload)
        const delta = json?.choices?.[0]?.delta
        const content = typeof delta?.content === 'string' ? delta.content : undefined
        if (content) yield { content }
        const cits = json?.citations || json?.choices?.[0]?.message?.citations
        if (Array.isArray(cits) && cits.length) citations = cits
      } catch {
        // ignore malformed SSE line
      }
    }
  }
  const safeCitations: string[] = Array.isArray(citations) ? citations : [];
  return void (yield { done: true, citations: safeCitations });
}


