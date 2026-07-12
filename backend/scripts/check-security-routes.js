const base = process.env.PUBLIC_BASE_URL || `http://127.0.0.1:${process.env.PORT || 5000}`;
const checks = [
  '/', '/login', '/signup', '/dashboard', '/admin',
  '/api/public-route-policy/status', '/api/part51/status'
];
console.log('NAXORA Part 51 security route checklist');
console.log('Base URL:', base);
checks.forEach((route) => console.log('Check:', base + route));
console.log('\nProduction reminder: set NODE_ENV=production and INTERNAL_TOOLS_ENABLED=false before public deployment.');
