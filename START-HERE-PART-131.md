# START HERE — Part 131

## Name

**Part 131 — VANI Fees & Finance Operations**

## Included

- Fee Structure create/update.
- Student Fee assignment/update.
- Invoice create/update.
- Manual offline Receipt record.
- Receipt correction request.
- Due-list generation.
- In-app fee reminder.
- Student fee statement.
- Branch/institute finance summary.
- Role, institute and Branch scope validation.
- Preview, exact confirmation, duplicate protection, audit and rollback.

## Important payment boundary

Part 131 does not charge a card, collect UPI, execute bank transfer, issue refund, verify settlement or modify Razorpay subscription billing.

Manual receipt records use:

```text
sourceType: manual_offline
verificationStatus: recorded_unverified
```

## Install

```powershell
node .\VERIFY-PART130.js
node --check .\backend\src\server.js
node .\APPLY-PART131.js
node .\VERIFY-PART131.js
```

## Git

```powershell
git status
git add .
git commit -m "Add Part 131 VANI Fees and Finance Operations"
git push
```
