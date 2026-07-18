# Testing Guide

## Package verification

```powershell
node .\VERIFY-PART136.js
```

## Runtime acceptance

1. Deploy Part 136.
2. Owner creates a run.
3. Owner runs Baseline.
4. Owner runs Security Probes.
5. Each of eight roles logs in and completes its role self-test.
6. Complete the four required Part 135 workflows.
7. Verify their conversation IDs.
8. Record desktop coverage.
9. Record mobile coverage.
10. Check readiness reaches 100%.
11. Owner finalizes with exact confirmation.
12. Read certificate endpoint.

## Failure rule

Never finalize by editing MongoDB manually.

Fix the real failure, redeploy, and rerun the affected test.
