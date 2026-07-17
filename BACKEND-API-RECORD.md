# Backend API Record — Part 115

## Public APIs
- `GET /api/part115/status`
- `GET /api/part115/security-policy`
- `GET /api/part115/demo`
- `POST /api/part115/webhooks/razorpay`

The POST webhook endpoint is public because Razorpay calls it server-to-server. It requires a valid `X-Razorpay-Signature`.

## Owner-only APIs
- `GET /api/part115/setup`
- `GET /api/part115/events`
- `GET /api/part115/sync-states`
- `GET /api/part115/health`
- `POST /api/part115/subscription/:id/reconcile`
- `POST /api/part115/vani/command`

## MongoDB models
- `Part115RazorpayWebhookEvent`
- `Part115SubscriptionSyncState`
- `Part115WebhookAudit`

## Signature
The server computes HMAC SHA-256 over the exact raw HTTP request body using `RAZORPAY_WEBHOOK_SECRET`, then timing-safe compares it with `X-Razorpay-Signature`.

## Idempotency
`x-razorpay-event-id` is stored as a unique value. If unavailable, a SHA-256 digest of the exact raw body is used as a fallback ID.

## Event ordering
Verified older events are stored but do not overwrite a newer `lastEventCreatedAt` state.
