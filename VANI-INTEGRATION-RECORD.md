# VANI Integration Record — Part 114

## Commands
- `VANI, Professional subscription checkout ready karo`
- `VANI, Test subscriptions dikhao`
- `VANI, subscription status dikhao`

## Behaviour
- Owner-only.
- instituteId checked.
- VANI asks for plan, billing cycles, test customer details and customer consent.
- VANI can guide and prepare the flow.
- VANI cannot authorise the mandate for the customer.
- Customer must interact with Razorpay Checkout.
- VANI never asks for CVV, OTP, UPI PIN, card number or bank credentials.
- Live Mode requests are blocked.

## Action levels
- Level 1: list/status/readiness.
- Level 2: checkout preview guidance.
- Level 3: exact owner confirmation creates Test Subscription.
- Separate customer action: Razorpay Checkout authorisation.
