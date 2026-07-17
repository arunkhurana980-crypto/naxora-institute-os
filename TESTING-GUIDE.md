# Part 113 Testing Guide

## Safe first plan
Choose one Test Mode plan only after you decide a temporary test price. Remember: the provider Plan cannot be edited/deleted, so use a clear name such as:

```text
NAXORA Professional TEST 01
```

Example:
- period: monthly
- amount: 10.00 INR for Test Mode validation only

Do not copy this test price into production pricing.

## Expected provider result
- Provider plan ID begins with `plan_`.
- Local record status becomes `provider_created`.
- `realMoneyMoved` is false.
- `customerSubscriptionCreated` is false.
- `checkoutStarted` is false.

## Do not do yet
- Do not create customer subscription links.
- Do not collect payment.
- Do not switch to Live Mode.
