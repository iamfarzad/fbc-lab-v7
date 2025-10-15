import { Page } from '@playwright/test'

export class MockWebSocketServer {
  constructor(private page: Page) {}

  async setup() {
    await this.page.addInitScript(() => {
      class MockWebSocket extends EventTarget {
        readyState: number = WebSocket.CONNECTING
        url: string
        
        constructor(url: string) {
          super()
          this.url = url
          
          setTimeout(() => {
            this.readyState = WebSocket.OPEN
            const openEvent = new Event('open')
            this.dispatchEvent(openEvent)
            
            // Auto-send connected event
            const connectedMsg = new MessageEvent('message', {
              data: JSON.stringify({
                type: 'connected',
                payload: { connectionId: 'mock-connection-123' }
              })
            })
            this.dispatchEvent(connectedMsg)
          }, 100)
        }

        send(data: string) {
          console.log('[MockWS] Client sent:', data)
          const message = JSON.parse(data)
          
          // Handle start request
          if (message.type === 'start') {
            setTimeout(() => {
              const sessionStarted = new MessageEvent('message', {
                data: JSON.stringify({
                  type: 'session_started',
                  payload: {
                    connectionId: 'mock-connection-123',
                    languageCode: message.payload?.languageCode || 'en-US',
                    mock: true
                  }
                })
              })
              this.dispatchEvent(sessionStarted)
            }, 200)
          }
          
          // Handle turn complete
          if (message.type === 'TURN_COMPLETE') {
            setTimeout(() => {
              const sessionClosed = new MessageEvent('message', {
                data: JSON.stringify({
                  type: 'session_closed',
                  payload: { reason: 'user_ended' }
                })
              })
              this.dispatchEvent(sessionClosed)
            }, 100)
          }
        }

        close() {
          this.readyState = WebSocket.CLOSED
          const closeEvent = new CloseEvent('close', { code: 1000, reason: 'Normal closure' })
          this.dispatchEvent(closeEvent)
        }
      }

      // Replace WebSocket
      ;(window as any).WebSocket = MockWebSocket
    })
  }

  async simulateEvent(eventData: any) {
    await this.page.evaluate((data) => {
      const ws = (window as any).__mockWebSocket
      if (ws) {
        const event = new MessageEvent('message', { data: JSON.stringify(data) })
        ws.dispatchEvent(event)
      }
    }, eventData)
  }

  async simulateTranscript(text: string, isFinal = false) {
    await this.simulateEvent({
      type: 'input_transcript',
      payload: { text, isFinal }
    })
  }

  async simulateError(message: string) {
    await this.simulateEvent({
      type: 'error',
      payload: { message }
    })
  }

  async simulateDisconnect() {
    await this.page.evaluate(() => {
      const ws = (window as any).__mockWebSocket
      if (ws) {
        ws.close()
      }
    })
  }
}

export async function setupMockWebSocket(page: Page) {
  const mock = new MockWebSocketServer(page)
  await mock.setup()
  return mock
}

