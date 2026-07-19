# Razorpay Dashboard Steps

All KYC, settlement-bank and Live-key actions must be completed by the adult legal merchant account holder.

## 1. Create Live Plans

Razorpay Dashboard:

```text
Live Mode
→ Payment Products
→ Subscriptions
→ Plans
→ New Plan
```

Create the monthly/yearly plans you actually want to sell.

After each plan is created, privately copy its `plan_...` ID.

Plans cannot be casually edited after creation. Confirm price and billing frequency before creating them.

## 2. Create Live Webhook

```text
Live Mode
→ Accounts & Settings
→ Webhooks
→ Add New Webhook
```

URL:

```text
https://naxora-institute-os.onrender.com/api/part1366/webhooks/razorpay-live
```

Use a new secret that is different from the API Key Secret.

Select:

```text
subscription.authenticated
subscription.activated
subscription.charged
subscription.completed
subscription.updated
subscription.pending
subscription.halted
subscription.cancelled
subscription.paused
subscription.resumed
```

Set an adult-controlled alert email.
