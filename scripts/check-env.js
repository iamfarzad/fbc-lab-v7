#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 * Checks that all required environment variables are present
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
try {
  const envPath = resolve(__dirname, '../.env.local');
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      // Remove quotes if present
      process.env[key] = value.replace(/^["']|["']$/g, '');
    }
  });
} catch (err) {
  console.log('⚠️  Could not load .env.local, checking system environment only');
}

const required = [
  'GOOGLE_GEMINI_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'DATABASE_URL',
];

const optional = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
];

console.log('🔍 Checking environment variables...\n');

// Check required variables
const missing = required.filter(key => !process.env[key]);
const present = required.filter(key => process.env[key]);

// Check optional variables
const optionalPresent = optional.filter(key => process.env[key]);
const optionalMissing = optional.filter(key => !process.env[key]);

// Report results
console.log('✅ Required variables present:', present.length);
present.forEach(key => {
  const value = process.env[key];
  const masked = value.substring(0, 10) + '...' + value.substring(value.length - 4);
  console.log(`   - ${key}: ${masked}`);
});

if (optionalPresent.length > 0) {
  console.log('\n📋 Optional variables present:', optionalPresent.length);
  optionalPresent.forEach(key => {
    const value = process.env[key];
    const masked = value.substring(0, 10) + '...' + value.substring(value.length - 4);
    console.log(`   - ${key}: ${masked}`);
  });
}

if (missing.length > 0) {
  console.error('\n❌ Missing required variables:', missing.length);
  missing.forEach(key => console.error(`   - ${key}`));
  process.exit(1);
}

if (optionalMissing.length > 0) {
  console.log('\n⚠️  Optional variables missing:', optionalMissing.length);
  optionalMissing.forEach(key => console.log(`   - ${key}`));
}

console.log('\n✅ All required environment variables present');
process.exit(0);


