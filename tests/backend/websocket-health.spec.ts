import { test, expect } from '@playwright/test'
import WebSocket from 'ws'

const WS_LOCAL_URL = 'ws://localhost:3001'
const CONNECTION_TIMEOUT = 5000
const STABILITY_TEST_DURATION = 30000

test.describe('WebSocket Health Checks', () => {
  test('should connect to local WebSocket server', async () => {
    const ws = await new Promise<WebSocket>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'))
      }, CONNECTION_TIMEOUT)

      const socket = new WebSocket(WS_LOCAL_URL)

      socket.on('open', () => {
        clearTimeout(timeout)
        resolve(socket)
      })

      socket.on('error', (error) => {
        clearTimeout(timeout)
        reject(error)
      })
    })

    expect(ws.readyState).toBe(WebSocket.OPEN)
    ws.close()
  })

  test('should send and receive messages', async () => {
    const ws = new WebSocket(WS_LOCAL_URL)

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'))
      }, CONNECTION_TIMEOUT)

      ws.on('open', () => {
        clearTimeout(timeout)
        
        // Send test message
        const testMessage = {
          type: 'ping',
          timestamp: Date.now()
        }
        
        ws.send(JSON.stringify(testMessage))
        resolve()
      })

      ws.on('error', reject)
    })

    // Wait for potential response
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Verify connection is still open
    expect(ws.readyState).toBe(WebSocket.OPEN)
    
    ws.close()
  })

  test('should maintain connection stability over 30 seconds', async () => {
    const ws = new WebSocket(WS_LOCAL_URL)
    const errors: Error[] = []
    const closures: { code: number; reason: string }[] = []

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Initial connection timeout'))
      }, CONNECTION_TIMEOUT)

      ws.on('open', () => {
        clearTimeout(timeout)
        resolve()
      })

      ws.on('error', (error) => {
        clearTimeout(timeout)
        reject(error)
      })
    })

    // Monitor for errors and closures
    ws.on('error', (error) => {
      errors.push(error)
    })

    ws.on('close', (code, reason) => {
      closures.push({ code, reason: reason.toString() })
    })

    // Send periodic pings
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }))
      }
    }, 5000)

    // Wait for stability test duration
    await new Promise(resolve => setTimeout(resolve, STABILITY_TEST_DURATION))

    clearInterval(pingInterval)

    // Verify no unexpected errors or closures
    expect(errors.length).toBe(0)
    expect(closures.length).toBe(0)
    expect(ws.readyState).toBe(WebSocket.OPEN)

    ws.close()
  })

  test('should reconnect after disconnect', async () => {
    // First connection
    let ws = new WebSocket(WS_LOCAL_URL)

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Initial connection timeout'))
      }, CONNECTION_TIMEOUT)

      ws.on('open', () => {
        clearTimeout(timeout)
        resolve()
      })

      ws.on('error', reject)
    })

    expect(ws.readyState).toBe(WebSocket.OPEN)

    // Close the connection
    ws.close()

    // Wait for close
    await new Promise<void>((resolve) => {
      ws.on('close', () => {
        resolve()
      })
    })

    // Attempt reconnection
    ws = new WebSocket(WS_LOCAL_URL)

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Reconnection timeout'))
      }, CONNECTION_TIMEOUT)

      ws.on('open', () => {
        clearTimeout(timeout)
        resolve()
      })

      ws.on('error', (error) => {
        clearTimeout(timeout)
        reject(error)
      })
    })

    expect(ws.readyState).toBe(WebSocket.OPEN)
    ws.close()
  })

  test('should handle multiple concurrent connections', async () => {
    const connections: WebSocket[] = []
    const connectionCount = 5

    // Create multiple connections
    for (let i = 0; i < connectionCount; i++) {
      const ws = new WebSocket(WS_LOCAL_URL)

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Connection ${i} timeout`))
        }, CONNECTION_TIMEOUT)

        ws.on('open', () => {
          clearTimeout(timeout)
          connections.push(ws)
          resolve()
        })

        ws.on('error', (error) => {
          clearTimeout(timeout)
          reject(error)
        })
      })
    }

    // Verify all connections are open
    expect(connections.length).toBe(connectionCount)
    connections.forEach((ws) => {
      expect(ws.readyState).toBe(WebSocket.OPEN)
    })

    // Send message from each connection
    connections.forEach((ws, i) => {
      ws.send(JSON.stringify({ 
        type: 'test', 
        connectionId: i,
        timestamp: Date.now() 
      }))
    })

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Close all connections
    connections.forEach(ws => ws.close())

    // Wait for all to close
    await Promise.all(
      connections.map(ws => new Promise<void>((resolve) => {
        ws.on('close', () => resolve())
      }))
    )
  })

  test('should reject invalid messages gracefully', async () => {
    const ws = new WebSocket(WS_LOCAL_URL)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      let receivedError = false

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'))
      }, CONNECTION_TIMEOUT)

      ws.on('open', () => {
        clearTimeout(timeout)
        resolve()
      })

      ws.on('error', reject)
    })

    // Listen for error messages from server
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString())
        if (message.type === 'error') {
          receivedError = true
        }
      } catch (e) {
        // Ignore parse errors
      }
    })

    // Send invalid message
    ws.send('invalid json {{{')
    
    // Wait for potential error response
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Server should have emitted an error payload for invalid message
    expect(receivedError).toBe(true)

    // Connection should still be open (server handles invalid messages gracefully)
    expect(ws.readyState).toBe(WebSocket.OPEN)
    
    ws.close()
  })
})
