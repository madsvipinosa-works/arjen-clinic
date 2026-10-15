// scripts/test-runner/config.mjs
// Test environment configuration and shared constants for autonomous test runner

import fs from 'fs';
import path from 'path';

// Parse .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const env = {};

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim();
    }
  }
}

export const CONFIG = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
  supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  cronSecret: env.CRON_SECRET || process.env.CRON_SECRET,
  testDomain: 'test-autonomous.ar-jen.internal',
  testNamePrefix: '[AUTONOMOUS_TEST_RUN]',
  testTag: 'AUTONOMOUS_TEST_RUN_' + Date.now(),
};

if (!CONFIG.supabaseUrl || !CONFIG.serviceRoleKey) {
  throw new Error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
}
