# Backend API Record — Part 114

## Public APIs
- `GET /api/part114/status`
- `GET /api/part114/security-policy`
- `GET /api/part114/demo`

## Owner-only APIs
- `GET /api/part114/plans`
- `GET /api/part114/subscriptions/local`
- `POST /api/part114/subscription/preview`
- `POST /api/part114/subscription/create-confirmed`
- `GET /api/part114/checkout/options/:id`
- `POST /api/part114/checkout/verify`
- `POST /api/part114/subscription/:id/refresh`
- `POST /api/part114/vani/command`

## Signature verification
Server computes HMAC SHA-256 from:

```text
razorpay_payment_id + "|" + server-created razorpay_subscription_id
```

The returned subscription ID must match the ID stored on the server. The Razorpay Key Secret is used only on the backend and is never returned.

## MongoDB models
- `Part114CheckoutSubscription`
- `Part114CheckoutAudit`

## No payment credential storage
NAXORA never receives/stores card number, CVV, OTP, UPI PIN or bank credentials. Razorpay Checkout handles those fields.
