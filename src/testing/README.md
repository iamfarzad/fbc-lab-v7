# Chrome DevTools MCP Testing Suite

This comprehensive testing suite provides automated testing for your Next.js application using Chrome DevTools MCP capabilities. It tests WebSocket connectivity, React infinite loops, API routes, performance, and error scenarios.

## Features

- **WebSocket Connectivity Testing**: Tests Live Server (port 3001) and WebRTC Signaling Server (port 3002)
- **React Infinite Loop Detection**: Analyzes React components for common infinite loop patterns
- **API Route Testing**: Validates Next.js API endpoints (/api/chat/unified, /api/intelligence/*, /api/admin/*)
- **Performance Analysis**: Monitors application performance and identifies bottlenecks
- **Error Scenario Testing**: Tests error handling and recovery mechanisms

## Prerequisites

- Node.js 18+ installed
- Application running on `http://localhost:3000`
- WebSocket servers running on ports 3001 and 3002 (if testing WebSocket functionality)
- Chrome DevTools MCP server running

## Installation

The testing suite is already included in your project. Ensure you have the required dependencies:

```bash
pnpm install
```

## Usage

### Running All Tests

```bash
pnpm run test:mcp
```

### Running Specific Test Categories

```bash
# Test WebSocket connectivity only
pnpm run test:websocket

# Test React infinite loop detection only
pnpm run test:react

# Test API routes only
pnpm run test:api

# Test performance analysis only
pnpm run test:performance
```

### Running with Node.js directly

```bash
npx tsx src/testing/run-tests.ts
```

## Test Categories

### 1. WebSocket Connectivity Tests

Tests the following WebSocket connections:
- **Live Server (port 3001)**: Voice/AI interactions
- **WebRTC Signaling Server (port 3002)**: Peer connections

Each test verifies:
- Connection establishment
- Message handling
- Error conditions
- Connection persistence

### 2. React Infinite Loop Detection

Analyzes React components for common infinite loop patterns:
- `useEffect` with empty dependencies but state updates
- Multiple `setState` calls in render methods
- `componentDidUpdate` with `setState`
- `shouldComponentUpdate` always returning `true`

### 3. Next.js API Route Testing

Validates the following API endpoints:
- `POST /api/chat/unified` - Main chat functionality
- `GET /api/intelligence/context` - Context management
- `POST /api/intelligence/intent` - Intent detection
- `GET /api/admin/stats` - Admin statistics

Each test checks:
- Endpoint availability
- Response status codes
- Error handling
- Rate limiting

### 4. Performance Analysis

Monitors:
- Page load times
- React component performance
- Memory usage patterns
- Network latency
- Overall application responsiveness

### 5. Error Scenario Testing

Tests various error conditions:
- Invalid API endpoints
- WebSocket connection failures
- Rate limiting
- Authentication failures
- Resource exhaustion

## Test Reports

After running tests, a detailed report is generated and saved to `src/testing/test-report.json`. The report includes:

- Overall test statistics
- Individual test results
- Performance metrics
- Error details
- Recommendations

### Example Report Structure

```json
{
  "timestamp": "2025-01-27T10:30:00.000Z",
  "duration": 15420,
  "totalTests": 15,
  "passedTests": 12,
  "failedTests": 3,
  "successRate": "80.0",
  "results": [
    {
      "test": "WebSocket - Live Server (port 3001)",
      "passed": true,
      "details": "Connected successfully",
      "timestamp": "2025-01-27T10:30:05.000Z"
    }
  ]
}
```

## Configuration

### Test Configuration

Test settings can be modified in `src/testing/types/test-config.ts`:

```typescript
export const CHROME_DEVTOOLS_MCP_CONFIG = {
  scenarios: [
    {
      name: "WebSocket Connectivity",
      type: "websocket",
      enabled: true,
      config: {
        liveServerUrl: "ws://localhost:3001",
        webrtcSignalingUrl: "ws://localhost:3002",
        timeout: 5000
      }
    }
    // ... more scenarios
  ]
};
```

### Environment Variables

You can configure testing behavior using environment variables:

```bash
# Test server URL
TEST_SERVER_URL=http://localhost:3000

# WebSocket server URLs
WEBSOCKET_LIVE_URL=ws://localhost:3001
WEBSOCKET_WEBRTC_URL=ws://localhost:3002

# Performance thresholds
PERFORMANCE_PAGE_LOAD_THRESHOLD=3000
PERFORMANCE_API_RESPONSE_THRESHOLD=1000
```

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failures**
   - Ensure WebSocket servers are running on the correct ports
   - Check firewall settings
   - Verify server configurations

2. **API Test Failures**
   - Ensure the application is running on localhost:3000
   - Check API route implementations
   - Verify authentication requirements

3. **Performance Test Failures**
   - Close unnecessary applications
   - Check network connectivity
   - Verify server resources

4. **React Test Failures**
   - Review React component implementations
   - Check for missing dependencies
   - Verify state management patterns

### Debug Mode

Run tests with verbose output:

```bash
DEBUG=testing pnpm run test:mcp
```

### Test Environment Setup

Ensure your test environment is properly configured:

```bash
# Start the application
pnpm run dev

# Start WebSocket servers (in separate terminals)
pnpm run dev:local-ws

# Run tests in another terminal
pnpm run test:mcp
```

## Integration with CI/CD

You can integrate the testing suite into your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
name: Chrome DevTools MCP Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: ppnpm ci
      
    - name: Start application
      run: ppnpm run dev &
      
    - name: Start WebSocket servers
      run: ppnpm run dev:local-ws &
      
    - name: Wait for services
      run: sleep 30
      
    - name: Run tests
      run: ppnpm run test:mcp
      
    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: test-results
        path: src/testing/test-report.json
```

## Contributing

### Adding New Tests

1. Create a new test method in the `TestRunner` class
2. Add the test to the `runAllTests` method
3. Update the configuration if needed
4. Add documentation for the new test

### Test Best Practices

- Write descriptive test names
- Include proper error handling
- Provide clear test results
- Document test scenarios
- Keep tests independent and isolated

## Support

For issues and questions:
- Check the troubleshooting section
- Review the test reports
- Examine the application logs
- Verify server configurations

## License

This testing suite is part of the F.B/c AI Assistant project and follows the same license terms.
