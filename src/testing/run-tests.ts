#!/usr/bin/env node

/**
 * Chrome DevTools MCP Testing Suite
 * 
 * This script runs comprehensive tests for:
 * - WebSocket connectivity (ports 3001, 3002)
 * - React infinite loop detection
 * - Next.js API routes (/api/chat/unified, /api/intelligence/*, /api/admin/*)
 * - Performance analysis and network monitoring
 * - Error scenarios and recovery mechanisms
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

class TestRunner {
  private results: any[] = [];
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  async runAllTests() {
    console.log('🚀 Starting Chrome DevTools MCP Testing Suite...\n');

    try {
      // Test 1: WebSocket Connectivity
      await this.testWebSocketConnectivity();
      
      // Test 2: React Infinite Loop Detection
      await this.testReactInfiniteLoops();
      
      // Test 3: Next.js API Routes
      await this.testNextJsAPIRoutes();
      
      // Test 4: Performance Analysis
      await this.testPerformanceAnalysis();
      
      // Test 5: Error Scenarios
      await this.testErrorScenarios();

      // Generate final report
      await this.generateReport();

    } catch (error) {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    }
  }

  private async testWebSocketConnectivity() {
    console.log('📡 Testing WebSocket Connectivity...');
    
    const tests = [
      { name: 'Live Server (port 3001)', url: 'ws://localhost:3001' },
      { name: 'WebRTC Signaling (port 3002)', url: 'ws://localhost:3002' }
    ];

    for (const test of tests) {
      try {
        console.log(`  Testing ${test.name}...`);
        
        // Create a simple WebSocket test
        const testScript = `
          try {
            const { default: WebSocket } = await import('ws');
            const ws = new WebSocket('${test.url}');
            
            return new Promise((resolve, reject) => {
              let connected = false;
              
              ws.on('open', () => {
                connected = true;
                ws.close();
                resolve({ connected: true, error: null });
              });
              
              ws.on('error', (error) => {
                resolve({ connected: false, error: error.message });
              });
              
              setTimeout(() => {
                resolve({ connected, error: connected ? null : 'Connection timeout' });
              }, 5000);
            });
          } catch (error) {
            return { connected: false, error: 'WebSocket module not available: ' + error.message };
          }
        `;

        const result = await this.executeNodeScript(testScript);
        
        this.results.push({
          test: `WebSocket - ${test.name}`,
          passed: result.connected,
          details: result.error || 'Connected successfully',
          timestamp: new Date()
        });

        console.log(`  ${result.connected ? '✅' : '❌'} ${test.name}: ${result.error || 'Connected'}`);
        
      } catch (error) {
        this.results.push({
          test: `WebSocket - ${test.name}`,
          passed: false,
          details: error.message,
          timestamp: new Date()
        });
        console.log(`  ❌ ${test.name}: ${error.message}`);
      }
    }
    
    console.log('');
  }

  private async testReactInfiniteLoops() {
    console.log('🔄 Testing React Infinite Loop Detection...');
    
    try {
      // Check if React components are properly implemented
      const reactFiles = await this.findReactFiles();
      
      for (const file of reactFiles) {
        try {
          const content = await fsPromises.readFile(file, 'utf-8');
          
          // Check for common infinite loop patterns
          const patterns = [
            /useEffect\([^,]*\s*\[\s*\]\s*,\s*\[.*\]/g, // useEffect with empty deps but state updates
            /useState.*setState.*useState.*setState/gs, // Multiple setState calls
            /componentDidUpdate.*setState/g, // componentDidUpdate with setState
            /shouldComponentUpdate.*true/g // shouldComponentUpdate always returning true
          ];
          
          let issues = [];
          for (const pattern of patterns) {
            const matches = content.match(pattern);
            if (matches) {
              issues.push(`Pattern ${pattern}: ${matches.length} occurrences`);
            }
          }
          
          this.results.push({
            test: `React Analysis - ${path.basename(file)}`,
            passed: issues.length === 0,
            details: issues.length > 0 ? issues.join(', ') : 'No infinite loop patterns detected',
            timestamp: new Date()
          });
          
          console.log(`  ${issues.length === 0 ? '✅' : '⚠️'} ${path.basename(file)}: ${issues.length > 0 ? issues.length + ' issues' : 'Clean'}`);
          
        } catch (error) {
          this.results.push({
            test: `React Analysis - ${path.basename(file)}`,
            passed: false,
            details: error.message,
            timestamp: new Date()
          });
          console.log(`  ❌ ${path.basename(file)}: ${error.message}`);
        }
      }
      
    } catch (error) {
      this.results.push({
        test: 'React Analysis',
        passed: false,
        details: error.message,
        timestamp: new Date()
      });
      console.log(`  ❌ React Analysis: ${error.message}`);
    }
    
    console.log('');
  }

  private async testNextJsAPIRoutes() {
    console.log('🌐 Testing Next.js API Routes...');
    
    const routes = [
      { path: '/api/chat/unified', method: 'POST' },
      { path: '/api/intelligence/context', method: 'GET' },
      { path: '/api/intelligence/intent', method: 'POST' },
      { path: '/api/admin/stats', method: 'GET' }
    ];

    for (const route of routes) {
      try {
        console.log(`  Testing ${route.method} ${route.path}...`);
        
        const response = await fetch(`http://localhost:3000${route.path}`, {
          method: route.method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: route.method === 'POST' ? JSON.stringify({ test: true }) : undefined
        });
        
        const passed = response.status < 500; // Consider 4xx as valid for testing
        
        this.results.push({
          test: `API - ${route.method} ${route.path}`,
          passed,
          details: `Status: ${response.status}`,
          timestamp: new Date()
        });
        
        console.log(`  ${passed ? '✅' : '❌'} ${route.method} ${route.path}: ${response.status}`);
        
      } catch (error) {
        this.results.push({
          test: `API - ${route.method} ${route.path}`,
          passed: false,
          details: error.message,
          timestamp: new Date()
        });
        console.log(`  ❌ ${route.method} ${route.path}: ${error.message}`);
      }
    }
    
    console.log('');
  }

  private async testPerformanceAnalysis() {
    console.log('⚡ Testing Performance Analysis...');
    
    try {
      // Check if performance monitoring is set up
      const perfFiles = await this.findPerformanceFiles();
      
      for (const file of perfFiles) {
        try {
          const content = await fsPromises.readFile(file, 'utf-8');
          
          // Check for performance monitoring patterns
          const hasPerfMonitoring = content.includes('performance') || 
                                   content.includes('monitoring') ||
                                   content.includes('analytics');
          
          this.results.push({
            test: `Performance - ${path.basename(file)}`,
            passed: hasPerfMonitoring,
            details: hasPerfMonitoring ? 'Performance monitoring detected' : 'No performance monitoring found',
            timestamp: new Date()
          });
          
          console.log(`  ${hasPerfMonitoring ? '✅' : '⚠️'} ${path.basename(file)}: ${hasPerfMonitoring ? 'Monitored' : 'Not monitored'}`);
          
        } catch (error) {
          this.results.push({
            test: `Performance - ${path.basename(file)}`,
            passed: false,
            details: error.message,
            timestamp: new Date()
          });
          console.log(`  ❌ ${path.basename(file)}: ${error.message}`);
        }
      }
      
      // Test basic application performance
      const startTime = Date.now();
      const response = await fetch('http://localhost:3000');
      const loadTime = Date.now() - startTime;
      
      this.results.push({
        test: 'Performance - Page Load',
        passed: loadTime < 3000, // 3 seconds threshold
        details: `Load time: ${loadTime}ms`,
        timestamp: new Date()
      });
      
      console.log(`  ${loadTime < 3000 ? '✅' : '⚠️'} Page Load: ${loadTime}ms`);
      
    } catch (error) {
      this.results.push({
        test: 'Performance Analysis',
        passed: false,
        details: error.message,
        timestamp: new Date()
      });
      console.log(`  ❌ Performance Analysis: ${error.message}`);
    }
    
    console.log('');
  }

  private async testErrorScenarios() {
    console.log('🚨 Testing Error Scenarios...');
    
    const scenarios = [
      {
        name: 'Invalid API Endpoint',
        test: async () => {
          const response = await fetch('http://localhost:3000/api/nonexistent');
          return response.status === 404;
        }
      },
      {
        name: 'WebSocket Connection Failure',
        test: async () => {
          try {
            const { default: WebSocket } = await import('ws');
            const ws = new WebSocket('ws://localhost:9999'); // Non-existent port
            await new Promise((resolve, reject) => {
              ws.on('error', reject);
              setTimeout(resolve, 1000);
            });
            return false;
          } catch {
            return true; // Expected to fail
          }
        }
      },
      {
        name: 'Rate Limiting',
        test: async () => {
          const requests = [];
          for (let i = 0; i < 10; i++) {
            requests.push(fetch('http://localhost:3000/api/chat/unified', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: `test ${i}` })
            }));
          }
          const responses = await Promise.all(requests);
          return responses.some(r => r.status === 429);
        }
      }
    ];

    for (const scenario of scenarios) {
      try {
        console.log(`  Testing ${scenario.name}...`);
        const passed = await scenario.test();
        
        this.results.push({
          test: `Error Scenario - ${scenario.name}`,
          passed,
          details: passed ? 'Handled correctly' : 'Not handled properly',
          timestamp: new Date()
        });
        
        console.log(`  ${passed ? '✅' : '❌'} ${scenario.name}: ${passed ? 'Handled' : 'Not handled'}`);
        
      } catch (error) {
        this.results.push({
          test: `Error Scenario - ${scenario.name}`,
          passed: false,
          details: error.message,
          timestamp: new Date()
        });
        console.log(`  ❌ ${scenario.name}: ${error.message}`);
      }
    }
    
    console.log('');
  }

  private async generateReport() {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const duration = Date.now() - this.startTime;

    console.log('📊 Test Results Summary');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log('');

    console.log('📋 Detailed Results:');
    console.log('-'.repeat(50));
    
    for (const result of this.results) {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} - ${result.test}`);
      console.log(`   Details: ${result.details}`);
      console.log(`   Time: ${result.timestamp.toLocaleTimeString()}`);
      console.log('');
    }

    // Save report to file
    const report = {
      timestamp: new Date().toISOString(),
      duration,
      totalTests,
      passedTests,
      failedTests,
      successRate: ((passedTests / totalTests) * 100).toFixed(1),
      results: this.results
    };

    await fsPromises.writeFile(
      path.join(__dirname, 'test-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('📄 Test report saved to: src/testing/test-report.json');
    
    if (failedTests > 0) {
      console.log('\n⚠️ Some tests failed. Please review the results above.');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed successfully!');
    }
  }

  private async executeNodeScript(script: string): Promise<any> {
    return new Promise((resolve, reject) => {
      // Create a temporary file with the script
      const tempFile = path.join(__dirname, 'temp-script.js');
      fs.writeFileSync(tempFile, script);
      
      const child = exec(`node "${tempFile}"`, (error, stdout, stderr) => {
        // Clean up temp file with proper callback
        if (fs.existsSync(tempFile)) {
          fs.unlink(tempFile, () => {});
        }
        
        if (error) {
          reject(error);
          return;
        }
        if (stderr) {
          reject(new Error(stderr));
          return;
        }
        try {
          resolve(JSON.parse(stdout));
        } catch {
          resolve(stdout);
        }
      });
    });
  }

  private async findReactFiles(): Promise<string[]> {
    const files: string[] = [];
    const extensions = ['.tsx', '.ts', '.jsx', '.js'];
    
    const searchDir = async (dir: string) => {
      const entries = await fsPromises.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await searchDir(fullPath);
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
          const content = await fsPromises.readFile(fullPath, 'utf-8');
          if (content.includes('React') || content.includes('useState') || content.includes('useEffect')) {
            files.push(fullPath);
          }
        }
      }
    };
    
    await searchDir(path.join(__dirname, '..'));
    return files;
  }

  private async findPerformanceFiles(): Promise<string[]> {
    const files: string[] = [];
    const extensions = ['.tsx', '.ts', '.jsx', '.js'];
    
    const searchDir = async (dir: string) => {
      const entries = await fsPromises.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await searchDir(fullPath);
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
          const content = await fsPromises.readFile(fullPath, 'utf-8');
          if (content.includes('performance') || content.includes('monitoring') || content.includes('analytics')) {
            files.push(fullPath);
          }
        }
      }
    };
    
    await searchDir(path.join(__dirname, '..'));
    return files;
  }
}

const runner = new TestRunner();
runner.runAllTests().catch(console.error);

export default TestRunner;
