#!/usr/bin/env ts-node
/**
 * Test script to send a recorded WebM/WAV file to the voice WebSocket server
 * 
 * Usage:
 *   ts-node scripts/test-voice-file.ts /path/to/test-voice.webm
 * 
 * Or with multiple files for conversation flow:
 *   ts-node scripts/test-voice-file.ts turn1.wav turn2.wav
 */

import { spawn } from 'node:child_process'
import { Buffer } from 'node:buffer'
import WebSocket from 'ws'
import { WEBSOCKET_CONFIG } from '../src/config/constants.js'

const WS_URL = process.env.WS_URL || WEBSOCKET_CONFIG.URL
const CHUNK_MS = 100 // 100ms chunks
const BYTES_PER_MS = 32 // 16kHz mono s16le = 16000 samples/s * 2 bytes = 32000 bytes/s = 32 bytes/ms
const CHUNK_SIZE = CHUNK_MS * BYTES_PER_MS

const MESSAGE_TYPES = {
  START: 'start',
  STOP: 'stop',
  USER_AUDIO: 'user_audio',
  CONNECTED: 'connected',
  START_ACK: 'start_ack',
  SESSION_STARTED: 'session_started',
  INPUT_TRANSCRIPT: 'input_transcript',
  OUTPUT_TRANSCRIPT: 'output_transcript',
  TEXT: 'text',
  AUDIO: 'audio',
  TURN_COMPLETE: 'turn_complete',
  ERROR: 'error',
  HEARTBEAT: 'heartbeat',
} as const

function ffmpegPcmStream(filePath: string) {
  return spawn('ffmpeg', [
    '-v', 'error',
    '-i', filePath,
    '-f', 's16le',
    '-acodec', 'pcm_s16le',
    '-ac', '1',
    '-ar', '16000',
    'pipe:1'
  ])
}

async function openWebSocket(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    ws.on('open', () => {
      console.log(`✅ Connected to ${url}`)
      resolve(ws)
    })
    ws.on('error', reject)
  })
}

async function sendAudioTurn(ws: WebSocket, filePath: string): Promise<string> {
  console.log(`\n📤 Sending audio from: ${filePath}`)
  
  const ff = ffmpegPcmStream(filePath)
  let buffer = Buffer.alloc(0)
  let chunkIndex = 0
  let inputTranscript = ''
  let outputTranscript = ''
  let textOutput = ''

  const waitDone = new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('❌ Response timeout after 30 seconds'))
    }, 30000)

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(String(data))
        
        switch (msg.type) {
          case MESSAGE_TYPES.INPUT_TRANSCRIPT:
            if (msg.payload?.text) {
              inputTranscript = msg.payload.text
              console.log(`🎤 Input transcript: ${inputTranscript}`)
            }
            break
            
          case MESSAGE_TYPES.OUTPUT_TRANSCRIPT:
            if (msg.payload?.text) {
              outputTranscript = msg.payload.text
              console.log(`🤖 Output transcript: ${outputTranscript}`)
            }
            break
            
          case MESSAGE_TYPES.TEXT:
            if (msg.payload?.content) {
              textOutput += msg.payload.content
              process.stdout.write(msg.payload.content)
            }
            break
            
          case MESSAGE_TYPES.TURN_COMPLETE:
            clearTimeout(timeout)
            console.log('\n✅ Turn complete')
            resolve(outputTranscript || textOutput)
            break
            
          case MESSAGE_TYPES.ERROR:
            clearTimeout(timeout)
            reject(new Error(`❌ Server error: ${msg.payload?.message || 'Unknown error'}`))
            break
        }
      } catch (err) {
        // Ignore non-JSON messages (like binary data)
      }
    })
  })

  ff.stdout.on('data', (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk])
    
    while (buffer.length >= CHUNK_SIZE) {
      const audioChunk = buffer.subarray(0, CHUNK_SIZE)
      buffer = buffer.subarray(CHUNK_SIZE)
      
      const base64Audio = audioChunk.toString('base64')
      
      ws.send(JSON.stringify({
        type: MESSAGE_TYPES.USER_AUDIO,
        payload: {
          audioData: base64Audio,
          mimeType: 'audio/pcm;rate=16000'
        }
      }))
      
      chunkIndex++
      
      // Log progress every 10 chunks (1 second)
      if (chunkIndex % 10 === 0) {
        process.stdout.write('.')
      }
    }
  })

  const endPromise = new Promise<void>((resolve, reject) => {
    ff.stdout.on('end', () => {
      // Send remaining buffer
      if (buffer.length > 0) {
        const base64Audio = buffer.toString('base64')
        ws.send(JSON.stringify({
          type: MESSAGE_TYPES.USER_AUDIO,
          payload: {
            audioData: base64Audio,
            mimeType: 'audio/pcm;rate=16000'
          }
        }))
      }
      
      console.log('\n✅ Audio sent, waiting for response...')
      resolve()
    })

    ff.on('error', (err) => {
      reject(new Error(`❌ FFmpeg error: ${err.message}`))
    })
  })

  await endPromise
  return await waitDone
}

async function main() {
  const files = process.argv.slice(2)
  
  if (files.length === 0) {
    console.error('Usage: ts-node scripts/test-voice-file.ts <audio-file> [audio-file2 ...]')
    console.error('\nExample:')
    console.error('  ts-node scripts/test-voice-file.ts /Users/farzad/Downloads/test-voice.webm')
    process.exit(1)
  }

  console.log(`🔊 Testing voice with ${files.length} file(s)`)
  console.log(`📡 WebSocket URL: ${WS_URL}`)

  const ws = await openWebSocket(WS_URL)

  // Start session
  console.log('\n🚀 Starting session...')
  ws.send(JSON.stringify({
    type: MESSAGE_TYPES.START,
    payload: {
      languageCode: 'en-US',
      voiceName: 'default'
    }
  }))

  // Wait for session started
  await new Promise<void>((resolve) => {
    ws.on('message', (data) => {
      const msg = JSON.parse(String(data))
      if (msg.type === MESSAGE_TYPES.SESSION_STARTED) {
        console.log('✅ Session started')
        resolve()
      }
    })
  })

  // Send each audio file as a turn
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    console.log(`\n${'='.repeat(60)}`)
    console.log(`Turn ${i + 1}/${files.length}: ${file}`)
    
    try {
      const response = await sendAudioTurn(ws, file)
      console.log(`\n💬 AI Response: ${response.trim()}`)
      
      // Small delay between turns if multiple files
      if (i < files.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    } catch (err) {
      console.error(`\n❌ Error on turn ${i + 1}:`, err)
      break
    }
  }

  // Stop session
  console.log('\n🛑 Stopping session...')
  ws.send(JSON.stringify({ type: MESSAGE_TYPES.STOP }))
  
  ws.close()
  console.log('✅ Test complete')
}

main().catch((err) => {
  console.error('❌ Fatal error:', err)
  process.exit(1)
})
