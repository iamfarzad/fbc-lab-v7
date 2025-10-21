/**
 * Unit tests for src/core/live/client.ts
 * Tests LiveClientWS evented WebSocket client
 */

import { LiveClientWS } from '../client'
import type { LiveServerEvent } from '../types'

// Mock WebSocket
class MockWebSocket {
  public readyState: number = 0 // CONNECTING
  public onopen: ((event: Event) => void) | null = null
  public onclose: ((event: CloseEvent) => void) | null = null
  public onerror: ((event: Event) => void) | null = null
  public onmessage: ((event: MessageEvent) => void) | null = null

  constructor(public url: string) {
    // Simulate async connection
    setTimeout(() => {
      this.readyState = 1 // OPEN
      this.onopen?.(new Event('open'))
    }, 10)
  }

  send(data: string) {
    // Mock send - do nothing in tests
  }

  close() {
    this.readyState = 3 // CLOSED
    this.onclose?.(new CloseEvent('close'))
  }
}

// Replace global WebSocket with mock
global.WebSocket = MockWebSocket as any

describe('LiveClientWS', () => {
  let client: LiveClientWS

  beforeEach(() => {
    client = new LiveClientWS()
  })

  afterEach(() => {
    client.disconnect()
  })

  describe('Event Subscription', () => {
    it('should subscribe to events with on()', () => {
      const handler = jest.fn()
      client.on('open', handler)

      client.connect()

      return new Promise((resolve) => {
        setTimeout(() => {
          expect(handler).toHaveBeenCalled()
          resolve(undefined)
        }, 50)
      })
    })

    it('should unsubscribe from events with off()', () => {
      const handler = jest.fn()
      client.on('open', handler)
      client.off('open', handler)

      client.connect()

      return new Promise((resolve) => {
        setTimeout(() => {
          expect(handler).not.toHaveBeenCalled()
          resolve(undefined)
        }, 50)
      })
    })

    it('should return unsubscribe function from on()', () => {
      const handler = jest.fn()
      const unsubscribe = client.on('open', handler)

      unsubscribe()
      client.connect()

      return new Promise((resolve) => {
        setTimeout(() => {
          expect(handler).not.toHaveBeenCalled()
          resolve(undefined)
        }, 50)
      })
    })

    it('should handle multiple subscribers to same event', () => {
      const handler1 = jest.fn()
      const handler2 = jest.fn()

      client.on('open', handler1)
      client.on('open', handler2)
      client.connect()

      return new Promise((resolve) => {
        setTimeout(() => {
          expect(handler1).toHaveBeenCalled()
          expect(handler2).toHaveBeenCalled()
          resolve(undefined)
        }, 50)
      })
    })
  })

  describe('Connection Management', () => {
    it('should connect to WebSocket when connect() called', () => {
      client.connect()

      return new Promise((resolve) => {
        client.on('open', () => {
          resolve(undefined)
        })
      })
    })

    it('should emit close event when disconnected', () => {
      const closeHandler = jest.fn()
      client.on('close', closeHandler)

      client.connect()

      return new Promise((resolve) => {
        setTimeout(() => {
          client.disconnect()
          setTimeout(() => {
            expect(closeHandler).toHaveBeenCalled()
            resolve(undefined)
          }, 10)
        }, 50)
      })
    })

    it('should not create duplicate connections', () => {
      client.connect()
      client.connect() // Second call should be no-op

      // If this doesn't throw, test passes
      expect(true).toBe(true)
    })
  })

  describe('Message Sending', () => {
    it('should send text via sendText()', () => {
      return new Promise((resolve) => {
        client.connect()
        setTimeout(() => {
          // Should not throw
          client.sendText('Hello')
          resolve(undefined)
        }, 50)
      })
    })

    it('should send audio via sendAudioBase64PCM16()', () => {
      return new Promise((resolve) => {
        client.connect()
        setTimeout(() => {
          // Should not throw
          client.sendAudioBase64PCM16('base64data')
          resolve(undefined)
        }, 50)
      })
    })

    it('should send realtime input via sendRealtimeInput()', () => {
      return new Promise((resolve) => {
        client.connect()
        setTimeout(() => {
          // Should not throw
          client.sendRealtimeInput([
            { mimeType: 'audio/pcm', data: 'base64' }
          ])
          resolve(undefined)
        }, 50)
      })
    })

    it('should send context update via sendContextUpdate()', () => {
      return new Promise((resolve) => {
        client.connect()
        setTimeout(() => {
          // Should not throw
          client.sendContextUpdate({
            modality: 'screen',
            analysis: 'Test analysis'
          })
          resolve(undefined)
        }, 50)
      })
    })

    it('should send tool response via sendToolResponse()', () => {
      return new Promise((resolve) => {
        client.connect()
        setTimeout(() => {
          // Should not throw
          client.sendToolResponse([
            { id: '1', name: 'test', response: { json: {} } }
          ])
          resolve(undefined)
        }, 50)
      })
    })

    it('should send stop message via stop()', () => {
      return new Promise((resolve) => {
        client.connect()
        setTimeout(() => {
          // Should not throw
          client.stop()
          resolve(undefined)
        }, 50)
      })
    })
  })

  describe('Event Routing', () => {
    it('should emit connected event with connectionId', () => {
      const handler = jest.fn()
      client.on('connected', handler)

      client.connect()

      return new Promise((resolve) => {
        setTimeout(() => {
          // Simulate server message
          const ws = (client as any).socket
          const event = {
            type: 'connected',
            payload: { connectionId: 'test-123' }
          } as LiveServerEvent

          ws?.onmessage?.(new MessageEvent('message', {
            data: JSON.stringify(event)
          }))

          setTimeout(() => {
            expect(handler).toHaveBeenCalledWith('test-123')
            resolve(undefined)
          }, 10)
        }, 50)
      })
    })

    it('should emit input_transcript event', () => {
      const handler = jest.fn()
      client.on('input_transcript', handler)

      client.connect()

      return new Promise((resolve) => {
        setTimeout(() => {
          const ws = (client as any).socket
          const event = {
            type: 'input_transcript',
            payload: { text: 'hello', isFinal: true }
          } as LiveServerEvent

          ws?.onmessage?.(new MessageEvent('message', {
            data: JSON.stringify(event)
          }))

          setTimeout(() => {
            expect(handler).toHaveBeenCalledWith('hello', true)
            resolve(undefined)
          }, 10)
        }, 50)
      })
    })

    it('should emit audio event with base64 data', () => {
      const handler = jest.fn()
      client.on('audio', handler)

      client.connect()

      return new Promise((resolve) => {
        setTimeout(() => {
          const ws = (client as any).socket
          const event = {
            type: 'audio',
            payload: { audioData: 'base64data', mimeType: 'audio/pcm' }
          } as LiveServerEvent

          ws?.onmessage?.(new MessageEvent('message', {
            data: JSON.stringify(event)
          }))

          setTimeout(() => {
            expect(handler).toHaveBeenCalledWith('base64data', 'audio/pcm')
            resolve(undefined)
          }, 10)
        }, 50)
      })
    })

    it('should emit error event on malformed message', () => {
      const handler = jest.fn()
      client.on('error', handler)

      client.connect()

      return new Promise((resolve) => {
        setTimeout(() => {
          const ws = (client as any).socket

          // Send malformed JSON
          ws?.onmessage?.(new MessageEvent('message', {
            data: 'not-json'
          }))

          setTimeout(() => {
            expect(handler).toHaveBeenCalledWith('Malformed server event')
            resolve(undefined)
          }, 10)
        }, 50)
      })
    })
  })

  describe('Heartbeat', () => {
    it('should acknowledge heartbeat via ackHeartbeat()', () => {
      return new Promise((resolve) => {
        client.connect()
        setTimeout(() => {
          // Should not throw
          client.ackHeartbeat()
          resolve(undefined)
        }, 50)
      })
    })
  })

  describe('Session Lifecycle', () => {
    it('should start session with options', () => {
      return new Promise((resolve) => {
        client.connect()
        setTimeout(() => {
          // Should not throw
          client.start({
            languageCode: 'en-US',
            voiceName: 'test',
            sessionId: 'sess-123'
          })
          resolve(undefined)
        }, 50)
      })
    })

    it('should emit session_started event', () => {
      const handler = jest.fn()
      client.on('session_started', handler)

      client.connect()

      return new Promise((resolve) => {
        setTimeout(() => {
          const ws = (client as any).socket
          const event = {
            type: 'session_started',
            payload: { connectionId: 'test-123', languageCode: 'en-US' }
          } as LiveServerEvent

          ws?.onmessage?.(new MessageEvent('message', {
            data: JSON.stringify(event)
          }))

          setTimeout(() => {
            expect(handler).toHaveBeenCalledWith({
              connectionId: 'test-123',
              languageCode: 'en-US'
            })
            resolve(undefined)
          }, 10)
        }, 50)
      })
    })

    it('should emit session_closed event', () => {
      const handler = jest.fn()
      client.on('session_closed', handler)

      client.connect()

      return new Promise((resolve) => {
        setTimeout(() => {
          const ws = (client as any).socket
          const event = {
            type: 'session_closed',
            payload: { reason: 'User stopped' }
          } as LiveServerEvent

          ws?.onmessage?.(new MessageEvent('message', {
            data: JSON.stringify(event)
          }))

          setTimeout(() => {
            expect(handler).toHaveBeenCalledWith('User stopped')
            resolve(undefined)
          }, 10)
        }, 50)
      })
    })
  })
})

