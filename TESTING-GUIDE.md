# Part 114 Testing Guide

## Prerequisites
- Razorpay Dashboard is in Test Mode.
- Test API keys are configured in Render.
- Part 113 has at least one provider-created Test Plan.
- Use test customer contact details, not sensitive real customer data.

## Expected stages
1. Local preview status: `preview_ready`.
2. Provider creation returns `sub_...` ID.
3. Checkout opens with `subscription_id`.
4. Customer completes the Razorpay test authorisation screen.
5. Server verifies HMAC signature.
6. Provider status is typically `authenticated` or `active`, depending on start timing and provider behaviour.
7. Feature access remains locked until Part 116.

## Important
Browser success by itself is not accepted. Only a successful server signature check is recorded.

Ongoing events such as activated, charged, pending, halted, completed or cancelled become authoritative through Part 115 webhooks.
