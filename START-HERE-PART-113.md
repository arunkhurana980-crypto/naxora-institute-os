# START HERE — Part 113

## Exact name
**Part 113 — NAXORA Subscription Plans**

## Before installing
Part 112 must be applied successfully first.

In the project root terminal, run one command at a time:

```powershell
node --check .\backend\src\server.js
```

No output means syntax pass. If an error appears, do not install Part 113 yet.

Then verify Part 112:

```powershell
node .\APPLY-PART112.js
```

Expected: Part 112 applied/already present and syntax pass.

## Install Part 113
1. Extract this ZIP.
2. Copy all files into the live project root.
3. Run:

```powershell
node .\APPLY-PART113.js
```

Expected:

```text
PART 113 APPLIED SUCCESSFULLY
Syntax check: PASS
```

4. Verify:

```powershell
node .\VERIFY-PART113.js
```

5. Git commands:

```powershell
git status
git add .
git commit -m "Add Part 113 NAXORA Subscription Plans"
git push
```

6. Render → Manual Deploy → Clear build cache & deploy.

## Test
- `/api/part113/status`
- `/api/part113/templates`
- `/api/part113/security-policy`
- `/subscription-plans`

## Important
- Prices are not hardcoded or automatically published.
- Owner enters the price.
- Preview is mandatory.
- Exact confirmation is mandatory.
- Only Razorpay Test Plans are created.
- No customer subscription, checkout or real payment in Part 113.
