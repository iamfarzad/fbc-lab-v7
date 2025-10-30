/**
 * Duplicate Detection Script
 * Scans for duplicate hooks, components, and types in the live page subtree
 */

import { readFileSync } from 'fs';
// import { join } from 'path';
import { globSync } from 'glob';

interface Duplicate {
  type: 'hook' | 'component' | 'type';
  name: string;
  locations: string[];
  severity: 'error' | 'warning';
}

const duplicates: Duplicate[] = [];

// Files to scan
const LIVE_PAGE_DIRS = [
  'src/components/agent-ui/**/*.{ts,tsx}',
  'app/live/**/*.{ts,tsx}',
];

// Known canonical locations
// const CANONICAL_LOCATIONS = {
//   hooks: {
//     voice: 'src/hooks/useLiveApi.ts', // useLiveApi wraps useRealtimeVoice
//     chat: 'src/hooks/useUnifiedChat.ts',
//   },
//   components: {},
//   types: {
//     Message: 'src/types/core.ts',
//     Chat: 'src/types/core.ts',
//   },
// };

// Patterns to detect duplicates
const HOOK_PATTERNS = {
  voice: /use(RealtimeVoice|WebSocketVoice|LiveApi|Voice)/i,
  chat: /use(UnifiedChat|Chat|LiveChat)/i,
};

function scanForDuplicates() {
  const files = LIVE_PAGE_DIRS.flatMap((pattern) => globSync(pattern));

  // Track hook usage
  const voiceHookUsages: string[] = [];
  const chatHookUsages: string[] = [];

  files.forEach((file) => {
    const content = readFileSync(file, 'utf-8');
    
    // Check for voice hook imports
    if (HOOK_PATTERNS.voice.test(content)) {
      const matches = content.match(/import.*from\s+['"]([^'"]+)['"]/g);
      matches?.forEach((match) => {
        if (match.includes('useRealtimeVoice') || match.includes('useLiveApi') || match.includes('useVoice')) {
          voiceHookUsages.push(file);
        }
      });
    }

    // Check for chat hook imports
    if (HOOK_PATTERNS.chat.test(content)) {
      const matches = content.match(/import.*from\s+['"]([^'"]+)['"]/g);
      matches?.forEach((match) => {
        if (match.includes('useChat') || match.includes('useUnifiedChat')) {
          chatHookUsages.push(file);
        }
      });
    }

    // Check for Message type definitions
    if (content.includes('interface Message') || content.includes('type Message')) {
      if (!file.includes('src/types/core.ts')) {
        duplicates.push({
          type: 'type',
          name: 'Message',
          locations: [file],
          severity: 'error',
        });
      }
    }
  });

  // Check for multiple voice hook implementations
  const voiceHookFiles = files.filter((file) => {
    const content = readFileSync(file, 'utf-8');
    return /export\s+(function|const)\s+use(RealtimeVoice|WebSocketVoice|LiveApi)/i.test(content);
  });

  if (voiceHookFiles.length > 1) {
    duplicates.push({
      type: 'hook',
      name: 'Voice hooks',
      locations: voiceHookFiles,
      severity: 'error',
    });
  }

  // Check for direct useRealtimeVoice imports in components (should use useLiveApi)
  voiceHookUsages.forEach((file) => {
    const content = readFileSync(file, 'utf-8');
    if (content.includes('useRealtimeVoice') && !file.includes('hooks/') && !file.includes('DebugAgentUI')) {
      duplicates.push({
        type: 'hook',
        name: 'Direct useRealtimeVoice import',
        locations: [file],
        severity: 'warning',
      });
    }
  });

  // Check for deprecated useWebSocketVoice
  files.forEach((file) => {
    const content = readFileSync(file, 'utf-8');
    if (content.includes('useWebSocketVoice')) {
      duplicates.push({
        type: 'hook',
        name: 'useWebSocketVoice (deprecated)',
        locations: [file],
        severity: 'error',
      });
    }
  });
}

// Run scan
scanForDuplicates();

// Generate report
console.log('\n=== Duplicate Detection Report ===\n');

if (duplicates.length === 0) {
  console.log('✅ No duplicates found!');
  process.exit(0);
}

const errors = duplicates.filter((d) => d.severity === 'error');
const warnings = duplicates.filter((d) => d.severity === 'warning');

console.log(`Total issues: ${duplicates.length}`);
console.log(`Errors: ${errors.length}`);
console.log(`Warnings: ${warnings.length}\n`);

if (errors.length > 0) {
  console.log('❌ ERRORS:\n');
  errors.forEach((dup) => {
    console.log(`${dup.name} (${dup.type})`);
    dup.locations.forEach((loc) => console.log(`  - ${loc}`));
    console.log('');
  });
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS:\n');
  warnings.forEach((dup) => {
    console.log(`${dup.name} (${dup.type})`);
    dup.locations.forEach((loc) => console.log(`  - ${loc}`));
    console.log('');
  });
}

process.exit(errors.length > 0 ? 1 : 0);

