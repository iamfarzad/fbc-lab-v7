import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { readFileSync } from 'fs'
import path from 'path'

function pcmFromWav(buf: Buffer): Buffer {
  let off = 12
  while (off < buf.length) {
    const id = buf.toString('ascii', off, off + 4)
    const size = buf.readUInt32LE(off + 4)
    if (id === 'data') return buf.subarray(off + 8, off + 8 + size)
    off += 8 + size
  }
  throw new Error('no data chunk')
}

// Resolve fixture path inside repo: tests/components/chat/tools/ok-24k.wav
const wavPath = path.join(
  __dirname,
  '..',
  'tests',
  'components',
  'chat',
  'tools',
  'ok-24k.wav'
)
let PCM: Buffer | null = null
try {
  const wav = readFileSync(wavPath)
  PCM = pcmFromWav(wav)
  console.info(`Loaded PCM fixture from ${wavPath} (${PCM.length} bytes)`) 
} catch (e) {
  console.warn(`⚠️ Mock PCM fixture missing at ${wavPath}. Audio streaming will be skipped.`)
}

const http = createServer()
const wss = new WebSocketServer({ server: http, path: '/v1/live', perMessageDeflate: false })

wss.on('connection', (ws, req) => {
  // @ts-ignore
  req.socket.setNoDelay?.(true)
  let lang = 'en-US'
  let voice = 'Puck'

  ws.send(JSON.stringify({ type: 'session_started', payload: { languageCode: lang, voiceName: voice } }))

  ws.on('message', async raw => {
    let msg: any
    try { msg = JSON.parse(raw.toString()) } catch { msg = {} }

    if (msg?.type === 'start') {
      lang = msg.payload?.languageCode || lang
      voice = msg.payload?.voiceName || voice
      ws.send(JSON.stringify({ type: 'session_started', payload: { languageCode: lang, voiceName: voice } }))
      return
    }

    if (msg?.type === 'user_audio') {
      // Echo a partial transcript occasionally
      ws.send(JSON.stringify({ type: 'input_transcript', payload: { text: '…', final: false } }))
      return
    }

    if (msg?.type === 'TURN_COMPLETE') {
      // Final input transcript
      const finalIn = lang.startsWith('nb') ? 'Hei, kan du hjelpe meg?' : 'Hi, can you help me?'
      ws.send(JSON.stringify({ type: 'input_transcript', payload: { text: finalIn, final: true } }))

      // Model text
      const reply = lang.startsWith('nb')
        ? 'Klart. Jeg starter en kort plan og sender lyd.'
        : 'Sure. I’ll start a short plan and send audio.'
      ws.send(JSON.stringify({ type: 'model_text', payload: { text: reply } }))

      // Stream PCM chunks if fixture is available
      if (PCM) {
        const chunkMs = 40
        const bytesPerMs = (24000 * 2) / 1000 // 16-bit mono
        const step = Math.floor(bytesPerMs * chunkMs)
        for (let i = 0; i < PCM.length; i += step) {
          const b64 = PCM.subarray(i, i + step).toString('base64')
          ws.send(JSON.stringify({ type: 'audio', payload: { audioData: b64, mimeType: 'audio/pcm;rate=24000' } }))
          await new Promise(r => setTimeout(r, chunkMs))
        }
      }

      // Turn complete
      ws.send(JSON.stringify({ type: 'turn_complete' }))
      return
    }
  })
})

const PORT = Number(process.env.MOCK_LIVE_PORT || 8787)
http.listen(PORT, () => console.info(`Mock Live WS on :${PORT}`))


