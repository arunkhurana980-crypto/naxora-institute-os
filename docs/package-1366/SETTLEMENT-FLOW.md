# How Money Reaches the Merchant Bank

```text
Customer pays/authorises in Razorpay Checkout
→ Razorpay records the payment
→ Subscription becomes active through verified provider event
→ Payment enters Razorpay merchant balance
→ Razorpay deducts applicable fees/taxes
→ Razorpay settles the remaining amount to the KYC-linked bank account
```

Settlement timing and UTR are visible in Razorpay Dashboard:

```text
Transactions
→ Settlements
```

NAXORA should not attempt to transfer merchant money directly.
