# Feature Explanation — Part 113

Part 113 adds NAXORA's Test Mode subscription-plan layer.

## Added
- Starter, Professional, Business and V3 AI plan templates.
- Owner-defined monthly/yearly prices.
- Plan preview stored in MongoDB.
- Duplicate fingerprint protection.
- Exact confirmation before provider creation.
- Razorpay Test Plan API integration.
- Local-to-provider Plan ID mapping.
- Provider and local plan lists.
- Local archive only; provider plan remains unchanged.
- VANI plan-detail conversation and preview.
- Audit records.

## Why preview matters
A Razorpay Plan is a reusable billing template. NAXORA therefore confirms name, period and amount before creating it.

## Not included
- Customer subscription creation.
- Checkout/mandate authorisation.
- Signature verification.
- Webhook status sync.
- Live Mode.
- Refunds.

These remain locked for later parts.
