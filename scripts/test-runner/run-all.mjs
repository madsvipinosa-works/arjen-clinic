// scripts/test-runner/run-all.mjs
// Master Autonomous Test Orchestrator for AR-JEN Maternity Clinic

import { runLayer1Tests } from './layer1-api-guards.mjs';
import { runLayer2Tests } from './layer2-database-integrity.mjs';
import { runTeardown } from './teardown.mjs';

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('🤖 AR-JEN MATERNITY CLINIC — AUTONOMOUS TEST RUNNER HARNESS');
  console.log(`   Execution Time: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════════════════');

  const startTime = Date.now();
  let layer1Results = [];
  let layer2Results = [];

  try {
    // Execute Layer 1
    layer1Results = await runLayer1Tests();

    // Execute Layer 2
    const layer2Outcome = await runLayer2Tests();
    layer2Results = layer2Outcome.results;
  } catch (err) {
    console.error('❌ Critical failure during test execution:', err);
  } finally {
    // Always execute teardown
    await runTeardown();
  }

  const totalTime = Date.now() - startTime;
  const allResults = [...layer1Results, ...layer2Results];
  const passed = allResults.filter((r) => r.status === 'PASSED').length;
  const failed = allResults.filter((r) => r.status === 'FAILED').length;

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log(`🏁 TEST EXECUTION COMPLETE (${totalTime}ms)`);
  console.log(`   Total Assertions: ${allResults.length}`);
  console.log(`   Passed:           ${passed}`);
  console.log(`   Failed:           ${failed}`);
  console.log('═══════════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled fatal error in test orchestrator:', err);
  process.exit(1);
});
