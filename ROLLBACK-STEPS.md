# Rollback

```powershell
node .\ROLLBACK-PART1366.js
node --check .\backend\src\server.js
```

Rollback removes:

- Part 136.6 server registration.
- Unified Live Subscriptions module.
- Part 116 Live evidence patch.

Rollback does not cancel Razorpay subscriptions and does not delete MongoDB records.

Commercial subscriptions must be managed by the adult merchant in Razorpay Dashboard.
