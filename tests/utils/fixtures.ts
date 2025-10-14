import { test as base } from '@playwright/test'
import { ChatHelpers, VoiceHelpers, CameraHelpers, ScreenShareHelpers } from './helpers'

type CustomFixtures = {
  chat: ChatHelpers
  voice: VoiceHelpers
  camera: CameraHelpers
  screenShare: ScreenShareHelpers
  mockWebSocket: () => Promise<void>
  mockAPIs: () => Promise<void>
}

export const test = base.extend<CustomFixtures>({
  chat: async ({ page }, use) => {
    await use(new ChatHelpers(page))
  },

  voice: async ({ page }, use) => {
    await use(new VoiceHelpers(page))
  },

  camera: async ({ page }, use) => {
    await use(new CameraHelpers(page))
  },

  screenShare: async ({ page }, use) => {
    await use(new ScreenShareHelpers(page))
  },

  mockWebSocket: async ({ page }, use) => {
    const mockWS = async () => {
      await page.route('ws://localhost:3001', route => {
        // Mock WebSocket - accept and ignore for now
        route.continue()
      })
    }
    await use(mockWS)
  },

  mockAPIs: async ({ page }, use) => {
    const mockAll = async () => {
      // Mock unified chat API
      await page.route('**/api/chat/unified', async route => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'text/event-stream',
            body: 'data: {"type":"text","content":"Hello! How can I help you?"}\n\n',
          })
        } else {
          await route.continue()
        }
      })

      // Mock screen capture API
      await page.route('**/api/tools/screen', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            output: {
              analysis: 'Mock screen capture analysis',
            },
          }),
        })
      })

      // Mock webcam capture API
      await page.route('**/api/tools/webcam', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            analysis: 'Mock webcam capture analysis',
          }),
        })
      })

      // Mock usage API
      await page.route('**/api/usage/**', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            messages_sent: 0,
            started_at: Date.now(),
          }),
        })
      })
    }
    await use(mockAll)
  },
})

export { expect } from '@playwright/test'


