# Rollback Steps — Part 118

## Application rollback

```powershell
node .\ROLLBACK-PART118.js
node --check .\backend\src\server.js
```

## Controlled payment rollback
1. Create rollback preview.
2. Enter exact rollback confirmation.
3. Complete private owner verification.
4. Adult merchant owner sets `NAXORA_RAZORPAY_LIVE_LAUNCHED=false`.
5. Restore saved Test environment/deployment.
6. Keep provider transaction records.
7. Review payments/subscriptions/settlements in Razorpay Dashboard.
8. Notify affected customers when required.

An app rollback cannot erase or reverse real provider transactions.
