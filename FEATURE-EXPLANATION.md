# Feature Explanation — Part 115

## Added
- Public Razorpay Test webhook endpoint.
- HMAC SHA-256 signature verification using the raw request body.
- `x-razorpay-event-id` duplicate protection.
- Payload-digest fallback when event ID is unavailable.
- At-least-once delivery-safe event ledger.
- Out-of-order event protection.
- Part 114 Subscription status sync.
- Compact safe snapshots instead of full webhook payload storage.
- Subscription sync-state model.
- Owner-only event monitor and health report.
- Safe provider API reconcile.
- VANI webhook assistant.

## Supported Subscription events
- authenticated
- activated
- charged
- completed
- updated
- pending
- halted
- cancelled
- paused
- resumed

## Important boundary
Part 115 records verified subscription states but does not unlock product features. Part 116 applies subscription access control.
