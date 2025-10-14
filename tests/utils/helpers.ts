import { Page, expect } from '@playwright/test'

export class ChatHelpers {
  constructor(private page: Page) {}

  async openChat() {
    const trigger = this.page.locator('[data-chat-trigger]')
    await expect(trigger).toBeVisible()
    await trigger.click()
    await this.page.waitForSelector('[role="dialog"]', { state: 'visible' })
  }

  async closeChat() {
    const closeButton = this.page.locator('[data-chat-trigger]')
    await closeButton.click()
    await this.page.waitForSelector('[role="dialog"]', { state: 'hidden' })
  }

  async isChatOpen() {
    const dialog = this.page.locator('[role="dialog"]')
    return await dialog.isVisible()
  }

  async sendMessage(message: string) {
    const input = this.page.locator('textarea[placeholder*="Type"]')
    await expect(input).toBeVisible()
    await input.fill(message)
    
    const sendButton = this.page.locator('button[aria-label*="Send"]')
    await sendButton.click()
  }

  async waitForAssistantResponse(timeout = 10000) {
    await this.page.waitForSelector('[data-role="assistant"]', { 
      timeout,
      state: 'visible'
    })
  }

  async getLastMessage() {
    const messages = this.page.locator('[data-role="assistant"], [data-role="user"]')
    const count = await messages.count()
    if (count === 0) return null
    return await messages.nth(count - 1).textContent()
  }

  async getMessageCount() {
    const messages = this.page.locator('[data-role="assistant"], [data-role="user"]')
    return await messages.count()
  }

  async minimizeChat() {
    const minimizeBtn = this.page.locator('button[aria-label*="Minimize"]')
    await minimizeBtn.click()
  }

  async expandChat() {
    const expandBtn = this.page.locator('button[aria-label*="Expand"]')
    await expandBtn.click()
  }

  async isMinimized() {
    return await this.page.locator('[data-chat-minimized]').isVisible()
  }

  async isExpanded() {
    return await this.page.locator('[data-chat-expanded]').isVisible()
  }
}

export class VoiceHelpers {
  constructor(private page: Page) {}

  async toggleVoice() {
    const voiceBtn = this.page.locator('[aria-label*="voice" i], [aria-label*="microphone" i]').first()
    await voiceBtn.click()
  }

  async isVoiceActive() {
    const indicator = this.page.locator('[data-voice-active], .voice-wavebar')
    return await indicator.isVisible()
  }

  async toggleTranscript() {
    const transcriptBtn = this.page.locator('button:has-text("Transcript"), button[aria-label*="transcript" i]')
    if (await transcriptBtn.isVisible()) {
      await transcriptBtn.click()
    }
  }

  async isTranscriptVisible() {
    const transcript = this.page.locator('[data-transcript-panel], text=/Live Transcript/i')
    return await transcript.isVisible()
  }

  async waitForVoiceError(timeout = 5000) {
    await this.page.waitForSelector('[role="alert"], .error, text=/error/i', { timeout })
  }
}

export class CameraHelpers {
  constructor(private page: Page) {}

  async toggleCamera() {
    const cameraBtn = this.page.locator('[aria-label*="camera" i]').first()
    await cameraBtn.click()
  }

  async isCameraActive() {
    const indicator = this.page.locator('[data-camera-active], video[autoplay]')
    return await indicator.isVisible()
  }

  async switchCamera() {
    const switchBtn = this.page.locator('button:has-text("Switch"), button[aria-label*="switch" i]')
    if (await switchBtn.isVisible()) {
      await switchBtn.click()
    }
  }

  async waitForCameraError(timeout = 5000) {
    await this.page.waitForSelector('[role="alert"], .error, text=/camera.*error/i', { timeout })
  }
}

export class ScreenShareHelpers {
  constructor(private page: Page) {}

  async toggleScreenShare() {
    const screenBtn = this.page.locator('[aria-label*="screen" i]').first()
    await screenBtn.click()
  }

  async isScreenShareActive() {
    const indicator = this.page.locator('[data-screen-active], [data-screen-sharing]')
    return await indicator.isVisible()
  }

  async waitForScreenShareError(timeout = 5000) {
    await this.page.waitForSelector('[role="alert"], .error, text=/screen.*error/i', { timeout })
  }
}

export async function waitForNetworkIdle(page: Page, timeout = 2000) {
  await page.waitForLoadState('networkidle', { timeout })
}

export async function grantAllPermissions(page: Page) {
  const context = page.context()
  await context.grantPermissions(['microphone', 'camera'])
}

export async function denyAllPermissions(page: Page) {
  const context = page.context()
  await context.clearPermissions()
}


