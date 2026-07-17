# Frontend UI Record — Part 114

## Main page
`/subscription-checkout`

Aliases:
- `/customer-subscription-checkout`
- `/part114`

## UI steps
1. Detect owner login token.
2. Load provider-created Part 113 plans.
3. Enter Test customer details and total billing cycles.
4. Confirm Test Mode and customer-consent acknowledgement.
5. Create preview.
6. Enter exact confirmation.
7. Create Razorpay Test Subscription.
8. Open Razorpay Checkout.
9. Server verifies signature.
10. Refresh provider status.

The page loads the official Razorpay Checkout script from `checkout.razorpay.com`.
