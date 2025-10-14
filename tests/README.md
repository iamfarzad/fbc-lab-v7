# E2E Testing Suite

Comprehensive end-to-end testing for F.B/c AI multimodal chat interface using Playwright.

## Overview

This test suite provides full cross-browser coverage (Chrome, Firefox, Safari) for all application features:

- **Chat Interface**: Message sending, rendering, states
- **Voice Features**: WebSocket-based voice sessions
- **Camera Features**: Video capture and permissions
- **Screen Sharing**: Screen capture integration
- **Multimodal Flows**: Combined feature testing
- **Error Handling**: Recovery and edge cases
- **Performance**: Load times, memory usage
- **Visual Regression**: UI consistency

## Quick Start

```bash
# Install dependencies
pnpm install

# Install Playwright browsers
pnpm exec playwright install

# Run all tests
pnpm test:e2e

# Run tests in headed mode (see browser)
pnpm test:e2e:headed

# Run tests with UI mode (interactive)
pnpm test:e2e:ui

# Run specific browser
pnpm test:e2e --project=chromium
pnpm test:e2e --project=firefox
pnpm test:e2e --project=webkit
```

## Test Structure

```
tests/
├── chat.spec.ts              # Chat interface tests
├── voice.spec.ts             # Voice feature tests
├── camera.spec.ts            # Camera feature tests
├── screen-share.spec.ts      # Screen sharing tests
├── meeting.spec.ts           # Meeting overlay tests
├── flows/
│   ├── multimodal.spec.ts    # Combined feature flows
│   ├── error-handling.spec.ts # Error recovery
│   └── performance.spec.ts   # Performance metrics
├── visual/
│   └── snapshots.spec.ts     # Visual regression
├── utils/
│   ├── fixtures.ts           # Custom Playwright fixtures
│   ├── helpers.ts            # Test helper functions
│   └── test-data.ts          # Test data and constants
└── mocks/
    ├── websocket-server.ts   # WebSocket mock
    └── api.ts                # API route mocks
```

## Running Specific Tests

```bash
# Run specific test file
pnpm test:e2e tests/chat.spec.ts

# Run specific test by name
pnpm test:e2e -g "should send and receive messages"

# Run tests in specific directory
pnpm test:e2e tests/flows/

# Run with debug mode
PWDEBUG=1 pnpm test:e2e
```

## Test Helpers

### Chat Helpers

```typescript
import { test } from './utils/fixtures'

test('example', async ({ chat }) => {
  await chat.openChat()
  await chat.sendMessage('Hello')
  await chat.waitForAssistantResponse()
  const message = await chat.getLastMessage()
})
```

### Voice Helpers

```typescript
test('voice example', async ({ voice }) => {
  await voice.toggleVoice()
  const isActive = await voice.isVoiceActive()
  await voice.toggleTranscript()
})
```

### Camera Helpers

```typescript
test('camera example', async ({ camera }) => {
  await camera.toggleCamera()
  await camera.switchCamera()
  const isActive = await camera.isCameraActive()
})
```

## Mocking

### API Mocks

```typescript
import { mockAllAPIs, mockChatAPI } from './mocks/api'

test('with mocked APIs', async ({ page, mockAPIs }) => {
  await mockAPIs() // Mock all APIs
  // Test code
})
```

### WebSocket Mock

```typescript
import { setupMockWebSocket } from './mocks/websocket-server'

test('with mock WebSocket', async ({ page }) => {
  const mockWS = await setupMockWebSocket(page)
  await mockWS.simulateEvent({ type: 'connected' })
})
```

## Visual Regression Testing

Visual tests capture screenshots and compare them:

```bash
# Run visual tests
pnpm test:e2e tests/visual/

# Update snapshots (when UI changes are intentional)
pnpm test:e2e tests/visual/ --update-snapshots
```

## Debugging Tests

```bash
# Run with browser visible
pnpm test:e2e:headed

# Run with Playwright Inspector
PWDEBUG=1 pnpm test:e2e

# Run with UI mode (best for debugging)
pnpm test:e2e:ui

# Generate trace for failed tests
pnpm test:e2e --trace on
```

### Viewing Traces

```bash
# Show trace for failed test
pnpm exec playwright show-trace test-results/*/trace.zip
```

## Performance Testing

Performance tests measure:

- Chat load time
- Voice session initialization
- Camera startup time
- Message rendering speed
- Memory usage over time

```bash
# Run only performance tests
pnpm test:e2e tests/flows/performance.spec.ts
```

## CI/CD Integration

Tests run automatically on:

- **Pull Requests**: All browsers, fast feedback
- **Nightly**: Full suite with comprehensive checks

### GitHub Actions

- `.github/workflows/e2e.yml` - PR and push tests
- `.github/workflows/e2e-nightly.yml` - Comprehensive nightly runs

### Artifacts

Failed tests automatically upload:

- Screenshots
- Videos
- Traces
- Test reports

## Best Practices

### 1. Use Custom Fixtures

```typescript
import { test, expect } from './utils/fixtures'

test('example', async ({ chat, voice, camera }) => {
  // Helpers are automatically available
})
```

### 2. Wait for Elements Properly

```typescript
// ✅ Good - explicit wait
await page.waitForSelector('[data-role="assistant"]')

// ❌ Bad - arbitrary timeout
await page.waitForTimeout(5000)
```

### 3. Use Data Attributes

```typescript
// ✅ Good - stable selector
await page.locator('[data-chat-trigger]').click()

// ❌ Bad - fragile selector
await page.locator('.button.primary.chat').click()
```

### 4. Mock External Dependencies

Always mock:
- API endpoints
- WebSocket servers
- External services

### 5. Test User Journeys

Focus on real user flows:

```typescript
test('complete multimodal flow', async ({ chat, voice, camera }) => {
  await chat.openChat()
  await chat.sendMessage('Hello')
  await voice.toggleVoice()
  await camera.toggleCamera()
  // Complete user journey
})
```

## Troubleshooting

### Tests Fail Locally

```bash
# Clear Playwright cache
pnpm exec playwright install --force

# Clear test results
rm -rf test-results playwright-report

# Run with debug mode
PWDEBUG=1 pnpm test:e2e
```

### WebSocket Connection Issues

Ensure the WebSocket mock is properly set up:

```typescript
import { setupMockWebSocket } from './mocks/websocket-server'

test.beforeEach(async ({ page }) => {
  await setupMockWebSocket(page)
})
```

### Permission Errors

Grant permissions in test setup:

```typescript
test.beforeEach(async ({ page }) => {
  await page.context().grantPermissions(['microphone', 'camera'])
})
```

### Flaky Tests

1. Increase timeouts for slow operations
2. Add explicit waits instead of fixed timeouts
3. Use `test.retry()` for unstable tests
4. Check for race conditions

## Contributing

When adding new tests:

1. Follow existing patterns in `tests/utils/`
2. Use custom fixtures for common operations
3. Mock external dependencies
4. Add visual snapshots for UI changes
5. Update this README if adding new patterns

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Testing Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI/CD Integration](https://playwright.dev/docs/ci)


