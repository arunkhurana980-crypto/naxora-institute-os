# Backend API Record — Part 117

## Public
- `GET /api/part117/status`
- `GET /api/part117/security-policy`
- `GET /api/part117/demo`

## Owner-only
- `GET /api/part117/subscriptions`
- `GET /api/part117/target-plans`
- `GET /api/part117/actions`
- `POST /api/part117/action/preview`
- `POST /api/part117/action/execute-confirmed`
- `POST /api/part117/vani/command`

## Required headers

```http
Authorization: Bearer <institute_owner_jwt>
x-naxora-institute-id: <institute_id>
```

Confirmed sensitive execution also requires:

```http
x-naxora-owner-action-secret: <private verification value>
```

## Models
- `Part117SubscriptionAction`
- `Part117SubscriptionManagerAudit`

## Provider calls
- Pause: `subscriptions.pause`
- Resume: `subscriptions.resume`
- Cancel: `subscriptions.cancel`
- Plan change: `subscriptions.update`

## Idempotency
The preview fingerprint contains institute, local Subscription, action type, target plan, current status and reason. An accepted provider action is returned rather than repeated.
