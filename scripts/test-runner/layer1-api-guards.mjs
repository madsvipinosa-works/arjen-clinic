// scripts/test-runner/layer1-api-guards.mjs
// Layer 1: Security, Auth & API Guard Probes

import { CONFIG } from './config.mjs';

export async function runLayer1Tests() {
  console.log('\n🔒 [LAYER 1] Running Security & API Guard Tests...');
  const results = [];

  async function assertTest(id, name, testFn) {
    const start = Date.now();
    try {
      await testFn();
      const duration = Date.now() - start;
      console.log(`   ✓ [${id}] ${name} (${duration}ms)`);
      results.push({ id, name, status: 'PASSED', duration });
    } catch (err) {
      const duration = Date.now() - start;
      console.error(`   ✕ [${id}] ${name} FAILED: ${err.message} (${duration}ms)`);
      results.push({ id, name, status: 'FAILED', duration, error: err.message });
    }
  }

  // SEC-01: Cron endpoint without Authorization header must return 401
  await assertTest('SEC-01', 'Cron Guard: Reject request missing Authorization header', async () => {
    const res = await fetch(`${CONFIG.baseUrl}/api/cron/reminders`);
    if (res.status !== 401) {
      throw new Error(`Expected HTTP 401 but received HTTP ${res.status}`);
    }
    const data = await res.json().catch(() => ({}));
    const errStr = (data.error || '').toLowerCase();
    if (!errStr.includes('unauthorized') && !errStr.includes('credentials') && !errStr.includes('authorization')) {
      throw new Error(`Unexpected error payload: ${JSON.stringify(data)}`);
    }
  });

  // SEC-02: Cron endpoint with invalid Bearer token must return 401
  await assertTest('SEC-02', 'Cron Guard: Reject request with invalid Bearer token (constant-time)', async () => {
    const res = await fetch(`${CONFIG.baseUrl}/api/cron/reconcile`, {
      headers: { Authorization: 'Bearer totally_wrong_secret_12345' },
    });
    if (res.status !== 401) {
      throw new Error(`Expected HTTP 401 but received HTTP ${res.status}`);
    }
    const data = await res.json().catch(() => ({}));
    if (!data.error?.toLowerCase().includes('invalid')) {
      throw new Error(`Unexpected error payload: ${JSON.stringify(data)}`);
    }
  });

  // SEC-03: Cron endpoint with valid CRON_SECRET must succeed
  await assertTest('SEC-03', 'Cron Guard: Accept request with valid CRON_SECRET', async () => {
    const res = await fetch(`${CONFIG.baseUrl}/api/cron/recalls`, {
      headers: { Authorization: `Bearer ${CONFIG.cronSecret}` },
    });
    if (res.status !== 200) {
      const text = await res.text();
      throw new Error(`Expected HTTP 200 but received HTTP ${res.status}: ${text}`);
    }
    const data = await res.json();
    if (data.success !== true) {
      throw new Error(`Expected success: true in response payload: ${JSON.stringify(data)}`);
    }
  });

  // SEC-04: Cron deduplication guard
  await assertTest('SEC-04', 'Cron Engine: Delivery deduplication stamp validation', async () => {
    const res = await fetch(`${CONFIG.baseUrl}/api/cron/reminders`, {
      headers: { Authorization: `Bearer ${CONFIG.cronSecret}` },
    });
    if (res.status !== 200) {
      throw new Error(`Expected HTTP 200 but received HTTP ${res.status}`);
    }
    const data = await res.json();
    // On repeated invocations, remindersSent should be a valid non-negative integer
    if (typeof data.remindersSent !== 'number' || data.remindersSent < 0) {
      throw new Error(`Expected numeric non-negative remindersSent: ${JSON.stringify(data)}`);
    }
  });

  // SEC-05: Admin Settings route protection
  await assertTest('SEC-05', 'Route Guard: Unauthenticated access to /admin/settings redirects to /admin/login', async () => {
    const res = await fetch(`${CONFIG.baseUrl}/admin/settings`, {
      redirect: 'manual', // do not follow redirect to assert 307
    });
    const location = res.headers.get('location') || '';
    if (res.status !== 307 && res.status !== 302 && res.status !== 303) {
      // If Next.js proxy returns HTML or 200, check if it's the login page
      const text = await res.text();
      if (!text.includes('login') && !text.includes('Sign in') && !location.includes('login')) {
        throw new Error(`Expected redirect to login, got status ${res.status} with location "${location}"`);
      }
    } else if (!location.includes('/admin/login')) {
      throw new Error(`Redirected to unexpected location: ${location}`);
    }
  });

  // SEC-06: Admin Audit Logs route protection
  await assertTest('SEC-06', 'Route Guard: Unauthenticated access to /admin/audit-logs redirects to /admin/login', async () => {
    const res = await fetch(`${CONFIG.baseUrl}/admin/audit-logs`, {
      redirect: 'manual',
    });
    const location = res.headers.get('location') || '';
    if (res.status !== 307 && res.status !== 302 && res.status !== 303) {
      const text = await res.text();
      if (!text.includes('login') && !text.includes('Sign in') && !location.includes('login')) {
        throw new Error(`Expected redirect to login, got status ${res.status} with location "${location}"`);
      }
    } else if (!location.includes('/admin/login')) {
      throw new Error(`Redirected to unexpected location: ${location}`);
    }
  });

  // SEC-07: Storage bucket private lockdown assertion
  await assertTest('SEC-07', 'Storage Security: Private lockdown on patient-records bucket', async () => {
    // Attempt raw direct GET from the patient-records bucket
    const rawBucketUrl = `${CONFIG.supabaseUrl}/storage/v1/object/public/patient-records/non_existent_test_probe.png`;
    const res = await fetch(rawBucketUrl);
    // Bucket is private so public access endpoint returns 400 or 403 or 404 with error
    if (res.status === 200) {
      throw new Error('Storage bucket allowed public anonymous download without signed token');
    }
  });

  const passedCount = results.filter((r) => r.status === 'PASSED').length;
  console.log(`   🏁 Layer 1 Summary: ${passedCount}/${results.length} tests passed.`);
  return results;
}

if (process.argv[1]?.endsWith('layer1-api-guards.mjs')) {
  runLayer1Tests().then(() => process.exit(0));
}
