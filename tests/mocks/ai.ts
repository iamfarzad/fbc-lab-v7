export async function generateText(args: any): Promise<{ text: string }> {
  // Heuristic: when scoringAgent calls generateText it provides a system prompt
  // inside messages[0].content that includes the JSON output contract.
  const sys = Array.isArray(args?.messages) && args.messages[0]?.role === 'system'
    ? String(args.messages[0]?.content ?? '')
    : ''

  if (sys.includes('OUTPUT REQUIRED (JSON only')) {
    // Return a plausible JSON payload to push stage beyond SCORING
    return {
      text: JSON.stringify({
        leadScore: 78,
        fitScore: { workshop: 0.82, consulting: 0.3 },
        reasoning: 'Manager at mid-size company; workshop a strong fit.'
      })
    }
  }

  return { text: 'Mocked response' };
}

export function streamText(_: any): { textStream: AsyncIterable<string> } {
  async function* iterator() {
    yield 'Mocked streamed response';
  }
  return { textStream: iterator() };
}
