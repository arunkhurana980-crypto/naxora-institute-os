# Security and Role Tests — Part 112

## Mandatory tests

### 1. Public status
Open `/api/part112/status`.
Expected:
- success true
- testModeLocked true
- realMoneyCollectionEnabled false
- checkoutEnabled false
- subscriptionCreationEnabled false

### 2. No login
Open protected `/api/part112/config` without token.
Expected: 401 `OWNER_LOGIN_REQUIRED`.

### 3. Non-owner token
Use teacher/student/parent JWT.
Expected: 403 `OWNER_ONLY`.

### 4. Institute mismatch
Use owner token with one instituteId and request a different instituteId.
Expected: 403 `INSTITUTE_CONTEXT_MISMATCH`.

### 5. Missing keys
Run connection test without Render keys.
Expected: 412 `TEST_CREDENTIALS_INCOMPLETE`.

### 6. Live mode lock
Set `RAZORPAY_MODE=live` only for a temporary safety test, redeploy, then call connection test.
Expected: 423 `LIVE_MODE_LOCKED`.
Immediately restore `RAZORPAY_MODE=test`.

### 7. Secret protection
Inspect all API responses.
Expected: no Key Secret, Webhook Secret, JWT or full provider credentials.

### 8. Rate limit
Run more than 5 connection tests within 10 minutes.
Expected: 429.

### 9. Confirmation
Wrong phrase should fail. Exact phrase:
`CONFIRM RAZORPAY TEST MODE`
Expected: safe provider configuration record only; no payment action.

## Known auth boundary
Part 112 validates owner JWT role and institute context. Full central tenant-membership binding remains part of the unified auth/access-control consolidation and must pass before production live payments.
