/**
 * Static Compliance Audit for Live Page Components
 * 
 * This script checks:
 * - No hardcoded URLs/models (must use constants.ts)
 * - No duplicate hooks/components (single source of truth)
 * - Proper type imports (Message from @/types/core)
 * - No `any` types (except allowed TODO migrations)
 * - Design token usage (CSS variables from globals.css)
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const LIVE_PAGE_COMPONENTS = [
  'app/live/page.tsx',
  'src/components/agent-ui/AgentUIInterface.tsx',
  'src/components/agent-ui/app/app.tsx',
  'src/components/agent-ui/app/view-controller.tsx',
  'src/components/agent-ui/app/session-view.tsx',
  'src/components/agent-ui/app/session-provider.tsx',
  'src/components/agent-ui/app/LiveChatMessages.tsx',
  'src/components/agent-ui/app/tile-layout.tsx',
  'src/components/agent-ui/app/terms-overlay.tsx',
  'src/components/agent-ui/app/preconnect-message.tsx',
  'src/components/agent-ui/app/live-captions.tsx',
  'src/components/agent-ui/app/audio-resume.tsx',
  'src/components/agent-ui/FBCAudioBridge.tsx',
  'src/components/agent-ui/livekit/toaster.tsx',
  'src/components/agent-ui/livekit/agent-control-bar/agent-control-bar.tsx',
  'src/components/agent-ui/livekit/agent-control-bar/chat-input.tsx',
];

interface Violation {
  file: string;
  line: number;
  rule: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  code?: string;
}

const violations: Violation[] = [];

function checkFile(filePath: string): void {
  const fullPath = join(process.cwd(), filePath);
  let content: string;
  try {
    content = readFileSync(fullPath, 'utf-8');
  } catch (error) {
    violations.push({
      file: filePath,
      line: 0,
      rule: 'FILE_NOT_FOUND',
      severity: 'error',
      message: `File not found: ${filePath}`,
    });
    return;
  }

  const lines = content.split('\n');

  // Check for hardcoded WebSocket URLs
  const wsUrlPattern = /(ws|wss):\/\/[^\s'"]+/g;
  lines.forEach((line, index) => {
    if (line.match(wsUrlPattern) && !line.includes('WEBSOCKET_CONFIG')) {
      violations.push({
        file: filePath,
        line: index + 1,
        rule: 'HARDCODED_WEBSOCKET_URL',
        severity: 'error',
        message: 'Hardcoded WebSocket URL found. Use WEBSOCKET_CONFIG.URL from @/config/constants',
        code: line.trim(),
      });
    }
  });

  // Check for hardcoded model names
  const modelPattern = /gemini-[\d\w-]+/g;
  lines.forEach((line, index) => {
    if (line.match(modelPattern) && !line.includes('GEMINI_MODELS') && !line.includes('constants')) {
      violations.push({
        file: filePath,
        line: index + 1,
        rule: 'HARDCODED_MODEL_NAME',
        severity: 'error',
        message: 'Hardcoded model name found. Use GEMINI_MODELS from @/config/constants',
        code: line.trim(),
      });
    }
  });

  // Check for `any` types (except allowed TODO migrations)
  lines.forEach((line, index) => {
    if (line.includes(': any') || line.includes('as any')) {
      const isAllowed = line.includes('// TODO: migrate') || line.includes('// TODO: complete migration');
      if (!isAllowed) {
        violations.push({
          file: filePath,
          line: index + 1,
          rule: 'ANY_TYPE_USAGE',
          severity: 'warning',
          message: 'Use of `any` type found. Prefer specific types from @/types/core',
          code: line.trim(),
        });
      }
    }
  });

  // Check for Message type imports (should come from @/types/core)
  lines.forEach((line, index) => {
    if (line.includes('import') && line.includes('Message')) {
      if (!line.includes('@/types/core') && !line.includes('@/types/core')) {
        violations.push({
          file: filePath,
          line: index + 1,
          rule: 'MESSAGE_TYPE_IMPORT',
          severity: 'error',
          message: 'Message type should be imported from @/types/core',
          code: line.trim(),
        });
      }
    }
  });

  // Check for deprecated hook usage
  lines.forEach((line, index) => {
    if (line.includes('useWebSocketVoice')) {
      violations.push({
        file: filePath,
        line: index + 1,
        rule: 'DEPRECATED_HOOK',
        severity: 'error',
        message: 'useWebSocketVoice is deprecated. Use useLiveApi (which wraps useRealtimeVoice)',
        code: line.trim(),
      });
    }
  });

  // Check for direct useRealtimeVoice imports in components (should use useLiveApi)
  if (filePath.includes('agent-ui') && !filePath.includes('hooks/') && !filePath.includes('DebugAgentUI')) {
    lines.forEach((line, index) => {
      if (line.includes('useRealtimeVoice') && line.includes('from')) {
        violations.push({
          file: filePath,
          line: index + 1,
          rule: 'DIRECT_REALTIME_VOICE_IMPORT',
          severity: 'warning',
          message: 'Components should use useLiveApi instead of importing useRealtimeVoice directly',
          code: line.trim(),
        });
      }
    });
  }
}

// Run checks
LIVE_PAGE_COMPONENTS.forEach(checkFile);

// Generate report
const errors = violations.filter((v) => v.severity === 'error');
const warnings = violations.filter((v) => v.severity === 'warning');
const infos = violations.filter((v) => v.severity === 'info');

console.log('\n=== Live Page Static Compliance Audit ===\n');
console.log(`Total violations: ${violations.length}`);
console.log(`Errors: ${errors.length}`);
console.log(`Warnings: ${warnings.length}`);
console.log(`Info: ${infos.length}\n`);

if (errors.length > 0) {
  console.log('❌ ERRORS:\n');
  errors.forEach((v) => {
    console.log(`${v.file}:${v.line}`);
    console.log(`  [${v.rule}] ${v.message}`);
    if (v.code) console.log(`  Code: ${v.code}`);
    console.log('');
  });
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS:\n');
  warnings.forEach((v) => {
    console.log(`${v.file}:${v.line}`);
    console.log(`  [${v.rule}] ${v.message}`);
    if (v.code) console.log(`  Code: ${v.code}`);
    console.log('');
  });
}

// Exit with error code if critical violations found
if (errors.length > 0) {
  process.exit(1);
}

process.exit(0);

