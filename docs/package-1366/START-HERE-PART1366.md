# Part 136.6 — Razorpay Live Subscription Revenue Bridge

## Money flow

```text
Institute Owner selects NAXORA plan
→ Razorpay Live Subscription created
→ Razorpay Checkout collects customer authorisation/payment
→ NAXORA server verifies Checkout signature
→ Razorpay sends signed Live webhook
→ Active subscription updates Part 116 access
→ Razorpay settles captured money to verified merchant bank account
```

NAXORA never receives card number, CVV, UPI PIN or bank login credentials.

## Install

```powershell
node .\APPLY-PART1366.js
node .\VERIFY-PART1366.js
```
