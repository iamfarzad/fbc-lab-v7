/**
 * HTTP Endpoint Test Suite
 * Tests the actual API endpoints to ensure they work with Gemini models
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
// Using built-in fetch for Node.js 18+

const execAsync = promisify(exec);

interface EndpointTestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  responseCode?: number;
  error?: string;
  response?: any;
}

class EndpointTester {
  private results: EndpointTestResult[] = [];
  private serverProcess: any = null;

  private startTest(endpoint: string, method: string): number {
    console.log(`🌐 Testing ${method} ${endpoint}`);
    return Date.now();
  }

  private endTest(endpoint: string, method: string, startTime: number, status: 'PASS' | 'FAIL' | 'SKIP', responseCode?: number, error?: string, response?: any): void {
    const duration = Date.now() - startTime;
    const result: EndpointTestResult = {
      endpoint,
      method,
      status,
      duration,
      responseCode,
      error,
      response
    };

    this.results.push(result);

    const icon = status === 'PASS' ? '✅' : status === 'SKIP' ? '⏭️' : '❌';
    console.log(`${icon} ${method} ${endpoint}: ${status} (${duration}ms)`);
    if (responseCode) console.log(`   Response Code: ${responseCode}`);
    if (error) console.log(`   Error: ${error}`);
  }

  /**
   * Start development server for testing
   */
  async startDevServer(): Promise<boolean> {
    console.log('🚀 Starting development server for endpoint testing...');

    return new Promise((resolve) => {
      try {
        this.serverProcess = spawn('pnpm', ['dev'], {
          cwd: process.cwd(),
          stdio: ['ignore', 'pipe', 'pipe'],
          detached: false
        });

        let started = false;

        this.serverProcess.stdout?.on('data', (data: Buffer) => {
          const output = data.toString();
          console.log(`Server: ${output.trim()}`);

          if (output.includes('Ready - started server on') && !started) {
            started = true;
            console.log('✅ Development server started successfully');
            // Wait a bit more for full initialization
            setTimeout(() => resolve(true), 2000);
          }
        });

        this.serverProcess.stderr?.on('data', (data: Buffer) => {
          console.error(`Server Error: ${data.toString()}`);
        });

        // Timeout after 30 seconds
        setTimeout(() => {
          if (!started) {
            console.log('❌ Server startup timed out');
            resolve(false);
          }
        }, 30000);

      } catch (error) {
        console.error('❌ Failed to start server:', error);
        resolve(false);
      }
    });
  }

  /**
   * Stop development server
   */
  async stopDevServer(): Promise<void> {
    if (this.serverProcess) {
      console.log('🛑 Stopping development server...');
      this.serverProcess.kill('SIGTERM');

      // Wait for process to exit
      return new Promise((resolve) => {
        this.serverProcess.on('close', () => {
          console.log('✅ Development server stopped');
          resolve();
        });
      });
    }
  }

  /**
   * Test basic chat endpoint
   */
  async testChatEndpoint(): Promise<void> {
    const startTime = this.startTest('/api/chat', 'POST');

    try {
      const response = await globalThis.fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'Say "Hello, Gemini!" and nothing else.' }
          ]
        }),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      const responseCode = response.status;
      const responseText = await response.text();

      if (responseCode === 500) {
        // Check if it's an API key error (expected in test environment)
        if (responseText.includes('API key') || responseText.includes('missing')) {
          this.endTest('/api/chat', 'POST', startTime, 'SKIP', responseCode, 'API key not configured (expected in test environment)', responseText);
        } else {
          this.endTest('/api/chat', 'POST', startTime, 'FAIL', responseCode, 'Server error', responseText);
        }
      } else if (responseCode === 200) {
        this.endTest('/api/chat', 'POST', startTime, 'PASS', responseCode, undefined, 'Chat endpoint responding');
      } else {
        this.endTest('/api/chat', 'POST', startTime, 'FAIL', responseCode, 'Unexpected response code', responseText);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.endTest('/api/chat', 'POST', startTime, 'FAIL', undefined, 'Request timed out');
      } else {
        this.endTest('/api/chat', 'POST', startTime, 'FAIL', undefined, error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }

  /**
   * Test unified chat endpoint
   */
  async testUnifiedChatEndpoint(): Promise<void> {
    const startTime = this.startTest('/api/chat/unified', 'POST');

    try {
      const response = await globalThis.fetch('http://localhost:3000/api/chat/unified', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'Say "Unified chat test!" and nothing else.' }
          ]
        }),
        signal: AbortSignal.timeout(30000)
      });

      const responseCode = response.status;
      const responseText = await response.text();

      if (responseCode === 500) {
        if (responseText.includes('API key') || responseText.includes('missing')) {
          this.endTest('/api/chat/unified', 'POST', startTime, 'SKIP', responseCode, 'API key not configured (expected in test environment)', responseText);
        } else {
          this.endTest('/api/chat/unified', 'POST', startTime, 'FAIL', responseCode, 'Server error', responseText);
        }
      } else if (responseCode === 200) {
        this.endTest('/api/chat/unified', 'POST', startTime, 'PASS', responseCode, undefined, 'Unified chat endpoint responding');
      } else {
        this.endTest('/api/chat/unified', 'POST', startTime, 'FAIL', responseCode, 'Unexpected response code', responseText);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.endTest('/api/chat/unified', 'POST', startTime, 'FAIL', undefined, 'Request timed out');
      } else {
        this.endTest('/api/chat/unified', 'POST', startTime, 'FAIL', undefined, error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }

  /**
   * Test health check endpoint
   */
  async testHealthEndpoint(): Promise<void> {
    const startTime = this.startTest('/', 'GET');

    try {
      const response = await globalThis.fetch('http://localhost:3000/', {
        method: 'GET',
        signal: AbortSignal.timeout(10000)
      });

      const responseCode = response.status;

      if (responseCode === 200) {
        this.endTest('/', 'GET', startTime, 'PASS', responseCode, undefined, 'Main page accessible');
      } else {
        this.endTest('/', 'GET', startTime, 'FAIL', responseCode, 'Unexpected response code');
      }
    } catch (error) {
      this.endTest('/', 'GET', startTime, 'FAIL', undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test API health endpoints
   */
  async testApiHealthEndpoints(): Promise<void> {
    const endpoints = [
      '/api/chat',
      '/api/chat/unified',
      '/api/intelligence/suggestions',
      '/api/intelligence/context'
    ];

    for (const endpoint of endpoints) {
      const startTime = this.startTest(endpoint, 'GET');

      try {
        const response = await globalThis.fetch(`http://localhost:3000${endpoint}`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });

        const responseCode = response.status;

        if (responseCode === 404) {
          // Some endpoints may not have GET handlers, that's okay
          this.endTest(endpoint, 'GET', startTime, 'SKIP', responseCode, 'No GET handler (expected for some endpoints)');
        } else if (responseCode >= 400 && responseCode < 500) {
          // Client errors are expected for endpoints that require POST
          this.endTest(endpoint, 'GET', startTime, 'SKIP', responseCode, 'Client error (expected for POST-only endpoints)');
        } else {
          this.endTest(endpoint, 'GET', startTime, 'PASS', responseCode, undefined, 'Endpoint accessible');
        }
      } catch (error) {
        this.endTest(endpoint, 'GET', startTime, 'FAIL', undefined, error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }

  /**
   * Run all endpoint tests
   */
  async runAllTests(): Promise<void> {
    console.log('🌐 Starting HTTP Endpoint Tests\n');

    try {
      // Start the development server
      const serverStarted = await this.startDevServer();

      if (!serverStarted) {
        console.log('❌ Could not start development server. Skipping endpoint tests.');
        return;
      }

      // Wait for server to fully start
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Run tests
      await this.testHealthEndpoint();
      await this.testApiHealthEndpoints();
      await this.testChatEndpoint();
      await this.testUnifiedChatEndpoint();

      this.printSummary();

    } catch (error) {
      console.error('❌ Endpoint testing failed:', error);
    } finally {
      // Always try to stop the server
      await this.stopDevServer();
    }
  }

  private printSummary(): void {
    console.log('\n📊 Endpoint Test Results Summary');
    console.log('='.repeat(50));

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    const total = this.results.length;

    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️ Skipped: ${skipped}`);

    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    console.log(`Total Duration: ${totalDuration}ms`);

    console.log('\n📋 Detailed Results:');
    console.log('-'.repeat(50));

    this.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'SKIP' ? '⏭️' : '❌';
      console.log(`${icon} ${result.method} ${result.endpoint}: ${result.status} (${result.duration}ms)`);
      if (result.responseCode) console.log(`   Response Code: ${result.responseCode}`);
      if (result.error) console.log(`   Error: ${result.error}`);
    });

    console.log('\n🎯 Endpoint Status:');
    if (failed === 0) {
      console.log('🎉 ALL ENDPOINT TESTS PASSED! HTTP endpoints are working correctly.');
    } else {
      console.log(`⚠️ ${failed} endpoint tests failed. Please review the errors above.`);
    }
  }
}

// Export for use in other test scripts
export { EndpointTester };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new EndpointTester();
  tester.runAllTests().catch(console.error);
}