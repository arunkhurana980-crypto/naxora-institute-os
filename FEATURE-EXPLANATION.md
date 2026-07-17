# Feature Explanation — Part 114

## Flow
1. Owner selects a confirmed Part 113 Razorpay Test Plan.
2. Owner enters test customer details and billing-cycle count.
3. NAXORA creates a preview and exact confirmation phrase.
4. Confirmed action creates a Razorpay Test Subscription.
5. Customer opens Razorpay Standard Checkout and authorises recurring billing.
6. Razorpay returns payment ID, subscription ID and signature.
7. NAXORA verifies the signature on the server using the server-created Subscription ID.
8. NAXORA fetches and records the current provider Subscription status.

## Why customer interaction remains mandatory
Recurring billing requires customer authentication/authorisation. VANI cannot enter OTP, CVV, card number or UPI PIN and cannot bypass customer consent.

## Authority boundary
A valid Checkout signature proves the immediate response is authentic. Part 115 webhooks become the authoritative asynchronous source for ongoing subscription events.
