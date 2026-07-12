const baseUrl = process.env.TEST_BASE_URL || `http://127.0.0.1:${process.env.PORT || 5000}`;

const routes = [
  '/api/health',
  '/api/route-check',
  '/api/final-testing/status',
  '/api/final-testing/checklist',
  '/api/final-testing/pages',
  '/api/razorpay-final/status',
  '/api/deployment/status',
  '/api/client-pitch/status',
  '/api/demo-mode/status'
];

async function checkRoute(route) {
  try {
    const res = await fetch(baseUrl + route);
    const json = await res.json().catch(() => ({}));
    return { route, ok: res.ok, status: res.status, part: json.part || json.status || 'ok' };
  } catch (error) {
    return { route, ok: false, status: 0, error: error.message };
  }
}

console.log(`NAXORA Part 49 smoke test: ${baseUrl}`);
const results = await Promise.all(routes.map(checkRoute));
for (const result of results) {
  console.log(`${result.ok ? '✅' : '❌'} ${result.route} -> ${result.status} ${result.error || result.part}`);
}
const failed = results.filter((item) => !item.ok);
if (failed.length) {
  console.log(`\n${failed.length} checks failed. Make sure backend is running before running npm run check:final.`);
  process.exitCode = 1;
} else {
  console.log('\n✅ All Part 49 smoke checks passed.');
}
