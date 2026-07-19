# Security Boundary

- Adult legal merchant approval is mandatory.
- Verified settlement bank confirmation is mandatory.
- Test and Live credentials remain separate.
- Live API Key Secret is never returned to the browser.
- Checkout receives only the public Live Key ID.
- Customer card/UPI credentials remain inside Razorpay Checkout.
- Server verifies Checkout signature using stored Subscription ID.
- Live webhook uses a separate secret and raw-body signature verification.
- Duplicate webhook events are idempotently blocked.
- Paid access unlocks only for `active` subscriptions.
- `authenticated` alone does not unlock paid features.
- Duplicate commercial subscriptions are blocked to reduce double billing.
- NAXORA does not automate refunds or merchant-bank transfers.
