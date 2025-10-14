import { Page, Route } from '@playwright/test'

export async function mockChatAPI(page: Page) {
  await page.route('**/api/chat/unified', async (route: Route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON()
      const userMessage = body.messages?.[body.messages.length - 1]?.content || ''
      
      // Simple response based on user message
      let response = 'I understand your message.'
      if (userMessage.toLowerCase().includes('hello')) {
        response = 'Hello! How can I help you today?'
      } else if (userMessage.toLowerCase().includes('weather')) {
        response = 'I don\'t have access to real-time weather data, but I can help you in other ways!'
      }

      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: `data: ${JSON.stringify({ type: 'text', content: response })}\n\n`,
      })
    } else {
      await route.continue()
    }
  })
}

export async function mockScreenCaptureAPI(page: Page) {
  await page.route('**/api/tools/screen', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        output: {
          analysis: 'Screen capture shows a web application interface with various UI elements.',
        },
      }),
    })
  })
}

export async function mockWebcamAPI(page: Page) {
  await page.route('**/api/tools/webcam', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        analysis: 'Webcam capture shows a person looking at the camera.',
      }),
    })
  })
}

export async function mockUsageAPI(page: Page) {
  await page.route('**/api/usage/**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        messages_sent: 5,
        started_at: Date.now() - 300000, // 5 minutes ago
      }),
    })
  })
}

export async function mockAllAPIs(page: Page) {
  await mockChatAPI(page)
  await mockScreenCaptureAPI(page)
  await mockWebcamAPI(page)
  await mockUsageAPI(page)
}

export async function simulateNetworkError(page: Page, endpoint: string) {
  await page.route(`**/${endpoint}`, async (route: Route) => {
    await route.abort('failed')
  })
}

export async function simulateSlowNetwork(page: Page, delayMs = 3000) {
  await page.route('**/*', async (route: Route) => {
    await new Promise(resolve => setTimeout(resolve, delayMs))
    await route.continue()
  })
}


