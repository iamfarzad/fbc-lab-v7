import { readdirSync, statSync, readFileSync } from 'fs'
import { join, sep } from 'path'

function listFiles(dir: string, exts: string[], accum: string[] = []): string[] {
  const entries = readdirSync(dir)
  for (const name of entries) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) {
      // Skip noisy or non-source dirs
      if (/^(node_modules|\.next|dist|logs|public|tests|scripts|analyze)$/.test(name)) continue
      accum = listFiles(p, exts, accum)
    } else if (exts.some((e) => p.endsWith(e))) {
      accum.push(p)
    }
  }
  return accum
}

describe('API usage lock', () => {
  const srcRoots = ['src', 'app']
  const files = srcRoots.flatMap((r) => {
    try { return listFiles(r, ['.ts', '.tsx', '.js']) } catch { return [] }
  })

  test('No hardcoded Gemini model strings outside config/constants', () => {
    const offenders: string[] = []
    const modelPattern = /(['"])gemini-[^'"\n]+\1|models\/gemini-[^'"\n]+/g
    for (const f of files) {
      if (f.endsWith(`${sep}src${sep}config${sep}constants.ts`)) continue
      const content = readFileSync(f, 'utf8')
      if (modelPattern.test(content)) {
        offenders.push(f)
      }
    }
    expect(offenders).toEqual([])
  })

  test('No direct useRealtimeVoice import in UI components (.tsx) anywhere under src/components', () => {
    const offenders: string[] = []
    const importPattern = /from ['"]@\/hooks\/useRealtimeVoice['"]/g
    for (const f of files) {
      if (!f.endsWith('.tsx')) continue
      if (!f.includes(`${sep}src${sep}components${sep}`)) continue
      const content = readFileSync(f, 'utf8')
      if (importPattern.test(content)) offenders.push(f)
    }
    expect(offenders).toEqual([])
  })

  test('No hardcoded ws:// or wss:// in source (use WEBSOCKET_CONFIG)', () => {
    const offenders: string[] = []
    const wsPattern = /['\"]wss?:\/\//g
    for (const f of files) {
      if (f.endsWith(`${sep}src${sep}config${sep}constants.ts`)) continue
      const content = readFileSync(f, 'utf8')
      if (wsPattern.test(content)) offenders.push(f)
    }
    expect(offenders).toEqual([])
  })
})
