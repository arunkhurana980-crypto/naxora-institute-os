# Razorpay Test Webhook Dashboard Setup

Complete this with the adult legal merchant account holder.

## Before Dashboard setup
Deploy Part 115 and confirm:

```text
https://naxora-institute-os.onrender.com/api/part115/status
```

The response should show `webhookEndpointReady: true`.

## Create Test webhook
1. Open Razorpay Dashboard.
2. Switch to **Test Mode**.
3. Open **Account & Settings → Webhooks**.
4. Create/Add a webhook.
5. Webhook URL:

```text
https://naxora-institute-os.onrender.com/api/part115/webhooks/razorpay
```

6. Secret: use exactly the same separate value stored in Render as `RAZORPAY_WEBHOOK_SECRET`.
7. Add an alert email controlled by the adult account holder.
8. Select these active events:

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

9. Save the webhook.

## Never expose
- Webhook Secret
- API Key Secret
- OTP/password
- Bank/KYC details

The webhook secret should be separate from the Razorpay API Key Secret.
