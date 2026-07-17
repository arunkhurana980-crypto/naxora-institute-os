# Feature Explanation — Part 118

## Readiness groups
1. Adult legal merchant and legal entity.
2. Razorpay account activation.
3. Live website submission and verification.
4. Public pricing, terms, privacy, contact, cancellation/refund and shipping-policy pages.
5. Customer support email.
6. Bank/settlement readiness.
7. Part 112–117 Test E2E evidence.
8. Live API credentials.
9. Separate Live webhook secret and alert email.
10. Read-only Live provider connectivity probe.
11. Exact launch confirmation.
12. Private owner verification.
13. Supervised manual Render switch.
14. Rollback plan.

## Why manual switch
Render environment is an external production control. The application records approval but does not silently replace secrets or turn on real-money collection.

## Launch rule
A preview cannot be created while a blocking check is pending. Approval still does not move money; the adult merchant owner must perform the documented switch and verify a controlled transaction.
