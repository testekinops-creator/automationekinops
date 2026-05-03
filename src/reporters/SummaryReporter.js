/**
 * SummaryReporter - Custom Playwright reporter that prints a clean summary.
 */
class SummaryReporter {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
    this.flaky = 0;
    this.startTime = null;
  }

  onBegin(_config, suite) {
    this.startTime = Date.now();
    const totalTests = suite.allTests().length;
    // eslint-disable-next-line no-console
    console.log(`\n🚀 Starting test run: ${totalTests} tests`);
    // eslint-disable-next-line no-console
    console.log(`   Environment: ${process.env.ENV || 'qa'} | Build: ${process.env.BUILD_NUMBER || 'local'} | Branch: ${process.env.BRANCH_NAME || 'main'}`);
  }

  onTestEnd(_test, result) {
    switch (result.status) {
      case 'passed': this.passed++; break;
      case 'failed': case 'timedOut': this.failed++; break;
      case 'skipped': this.skipped++; break;
    }
    if (result.status === 'passed' && result.retry > 0) { this.flaky++; }
  }

  onEnd(result) {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    const total = this.passed + this.failed + this.skipped;
    // eslint-disable-next-line no-console
    console.log(`
╔══════════════════════════════════════════════╗
║           📊 TEST RUN SUMMARY               ║
╠══════════════════════════════════════════════╣
║  Total:    ${String(total).padStart(4)}                            ║
║  ✅ Passed:  ${String(this.passed).padStart(4)}                            ║
║  ❌ Failed:  ${String(this.failed).padStart(4)}                            ║
║  ⏭️ Skipped: ${String(this.skipped).padStart(4)}                            ║
║  🔄 Flaky:   ${String(this.flaky).padStart(4)}                            ║
║  ⏱️ Duration: ${duration}s                        ║
║  Status: ${result.status === 'passed' ? '✅ PASSED' : '❌ FAILED'}                          ║
╚══════════════════════════════════════════════╝`);
  }
}

module.exports = SummaryReporter;
