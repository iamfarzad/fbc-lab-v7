#!/usr/bin/env node

/**
 * Multi-Turn Voice Session Test Script
 * 
 * This script helps validate the AudioContext suspension fix
 * by simulating multi-turn voice sessions and monitoring the logs.
 * 
 * Usage:
 *   node scripts/test-multi-turn-voice.js
 * 
 * Prerequisites:
 *   - Voice server running (pnpm dev:all)
 *   - Browser accessible at http://localhost:3000/voice-test
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';

const TEST_LOG_FILE = join(process.cwd(), 'test-multi-turn-voice.log');

class MultiTurnVoiceTester {
  constructor() {
    this.testResults = {
      audioChunksReceived: 0,
      audioChunksPlayed: 0,
      audioContextSuspensions: 0,
      audioContextResumes: 0,
      turnCompletes: 0,
      errors: []
    };
    this.isRunning = false;
  }

  async runTest() {
    console.log('🎤 Starting Multi-Turn Voice Session Test...');
    console.log('📝 Results will be saved to:', TEST_LOG_FILE);
    
    // Clear previous log
    try {
      await fs.unlink(TEST_LOG_FILE);
    } catch {
      // File doesn't exist, that's fine
    }

    this.isRunning = true;
    
    try {
      // Start log monitoring
      this.startLogMonitoring();
      
      // Provide test instructions
      this.showTestInstructions();
      
      // Wait for test completion
      await this.waitForTestCompletion();
      
      // Generate results
      this.generateResults();
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      this.testResults.errors.push(error.message);
    } finally {
      this.isRunning = false;
    }
  }

  startLogMonitoring() {
    console.log('🔍 Starting log monitoring...');
    
    // Monitor pnpm logs
    const logProcess = spawn('pnpm', ['logs', '--services=websocket,browser', '--level=debug'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });

    logProcess.stdout.on('data', (data) => {
      this.processLogOutput(data.toString());
    });

    logProcess.stderr.on('data', (data) => {
      this.processLogOutput(data.toString());
    });

    this.logProcess = logProcess;
  }

  processLogOutput(logData) {
    const lines = logData.split('\n');
    
    lines.forEach(line => {
      if (!line.trim()) return;
      
      // Append to log file
      fs.appendFile(TEST_LOG_FILE, line + '\n', () => {});
      
      // Analyze log patterns
      this.analyzeLogLine(line);
    });
  }

  analyzeLogLine(line) {
    // Audio chunk received
    if (line.includes('🎧 [RealtimeVoice] Audio event received')) {
      this.testResults.audioChunksReceived++;
    }
    
    // Audio chunk successfully added
    if (line.includes('✅ [RealtimeVoice] Audio chunk successfully added to player')) {
      this.testResults.audioChunksPlayed++;
    }
    
    // AudioContext suspension
    if (line.includes('AudioContext is suspended')) {
      this.testResults.audioContextSuspensions++;
      console.log('⚠️  AudioContext suspension detected');
    }
    
    // AudioContext resume
    if (line.includes('Resuming suspended AudioContext') || line.includes('Attempting to resume')) {
      this.testResults.audioContextResumes++;
      console.log('✅ AudioContext recovery initiated');
    }
    
    // Turn complete
    if (line.includes('turn_complete')) {
      this.testResults.turnCompletes++;
      console.log(`🔄 Turn ${this.testResults.turnCompletes} completed`);
    }
    
    // Errors
    if (line.includes('❌') || line.includes('🚫') || line.includes('ERROR')) {
      this.testResults.errors.push(line);
      console.log('❌ Error detected:', line);
    }
  }

  showTestInstructions() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST INSTRUCTIONS');
    console.log('='.repeat(60));
    console.log('1. Open browser: http://localhost:3000/voice-test');
    console.log('2. Start a voice session');
    console.log('3. Ask: "What is 2+2?" (wait for audio response)');
    console.log('4. Ask: "What is 5+3?" (verify audio plays)');
    console.log('5. Ask: "Tell me a joke" (verify audio plays)');
    console.log('6. Ask: "What time is it?" (verify audio plays)');
    console.log('7. Press ENTER to stop monitoring and see results');
    console.log('='.repeat(60));
    console.log('\n🎯 Expected Results:');
    console.log('   • Audio should play for ALL questions');
    console.log('   • No "silent" responses after first turn');
    console.log('   • AudioContext suspensions should auto-recover');
    console.log('   • No errors in the console');
    console.log('\n⏳ Monitoring logs... (press ENTER to stop)\n');
  }

  async waitForTestCompletion() {
    return new Promise((resolve) => {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on('data', () => {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        resolve();
      });
    });
  }

  generateResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(60));
    
    console.log(`🎧 Audio chunks received: ${this.testResults.audioChunksReceived}`);
    console.log(`✅ Audio chunks played: ${this.testResults.audioChunksPlayed}`);
    console.log(`⏸️  AudioContext suspensions: ${this.testResults.audioContextSuspensions}`);
    console.log(`▶️  AudioContext resumes: ${this.testResults.audioContextResumes}`);
    console.log(`🔄 Turns completed: ${this.testResults.turnCompletes}`);
    console.log(`❌ Errors: ${this.testResults.errors.length}`);
    
    if (this.testResults.errors.length > 0) {
      console.log('\n❌ Errors detected:');
      this.testResults.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    // Calculate success rate
    const successRate = this.testResults.audioChunksReceived > 0 
      ? (this.testResults.audioChunksPlayed / this.testResults.audioChunksReceived * 100).toFixed(1)
      : 0;
    
    console.log(`\n📈 Audio Success Rate: ${successRate}%`);
    
    // Determine test status
    const testPassed = 
      this.testResults.audioChunksPlayed >= this.testResults.audioChunksReceived * 0.9 && // 90% success rate
      this.testResults.errors.length === 0 &&
      this.testResults.turnCompletes >= 3; // At least 3 turns
    
    console.log(`\n${testPassed ? '✅ TEST PASSED' : '❌ TEST FAILED'}`);
    
    if (testPassed) {
      console.log('🎉 Multi-turn voice audio is working correctly!');
    } else {
      console.log('🔧 Multi-turn voice audio needs attention.');
      console.log('📝 Check the detailed log file:', TEST_LOG_FILE);
    }
    
    console.log('='.repeat(60));
    
    // Cleanup
    if (this.logProcess) {
      this.logProcess.kill();
    }
  }
}

// Run the test
const tester = new MultiTurnVoiceTester();
tester.runTest().catch(console.error);

export default MultiTurnVoiceTester;
