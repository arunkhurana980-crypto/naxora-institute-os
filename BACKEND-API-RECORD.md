# Backend API Record — Part 112

## Public safe APIs
- `GET /api/part112/status`
- `GET /api/part112/security-policy`
- `GET /api/part112/checklist`
- `GET /api/part112/demo`

These APIs never return Key Secret or Webhook Secret.

## Owner-only APIs
- `GET /api/part112/config`
- `GET /api/part112/readiness`
- `POST /api/part112/setup/preview`
- `POST /api/part112/setup/confirm`
- `POST /api/part112/connection-test`
- `POST /api/part112/vani/command`

Required headers:

```http
Authorization: Bearer <owner-jwt>
x-naxora-institute-id: <institute-id>
```

## Models
- `Part112RazorpayProviderConfig`
- `Part112SubscriptionPlanDraft`
- `Part112SubscriptionRecord`
- `Part112PaymentAudit`

## Connection test
It performs a read-only Razorpay Test Mode orders list request with maximum count 1. It creates no order, payment, plan or subscription.

## Foundation limits
Part 112 refuses Live Mode. Checkout and subscription mutation routes do not exist in this part.
