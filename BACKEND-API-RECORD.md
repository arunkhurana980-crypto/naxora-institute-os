# Backend API Record — Part 113

## Public APIs
- `GET /api/part113/status`
- `GET /api/part113/templates`
- `GET /api/part113/security-policy`
- `GET /api/part113/demo`

## Owner-only APIs
- `GET /api/part113/readiness`
- `GET /api/part113/plans/local`
- `GET /api/part113/plans/provider`
- `POST /api/part113/plan/preview`
- `POST /api/part113/plan/create-confirmed`
- `POST /api/part113/plan/:id/archive-preview`
- `POST /api/part113/plan/:id/archive-confirm`
- `POST /api/part113/vani/command`

Required:

```http
Authorization: Bearer <owner-jwt>
x-naxora-institute-id: <institute-id>
```

## Provider call
Test Plan creation uses the Razorpay Plans resource with:
- period
- interval
- item name
- amount in paise
- INR currency
- description
- safe NAXORA notes

## Idempotency
NAXORA creates a SHA-256 fingerprint from institute, plan code, period, amount, currency and name. Exact duplicates return the existing record instead of creating another provider Plan.
