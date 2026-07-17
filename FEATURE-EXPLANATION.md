# Feature Explanation — Part 117

## Supported Test actions
- Pause now.
- Resume now.
- Cancel at cycle end.
- Cancel now.
- Change plan at cycle end.
- Change plan now.

## Safe action flow

```text
Owner login
→ instituteId check
→ current verified status
→ target plan check
→ preview
→ access-impact preview
→ exact confirmation
→ private owner verification
→ Razorpay Test action
→ Part 115 webhook sync
→ Part 116 access recalculation
```

## Why final access does not change directly
Part 117 does not declare the final subscription status by itself. The provider action is followed by a verified Part 115 webhook. Part 116 then evaluates the verified state.

## Risk rules
- Cancel-now is irreversible.
- Pausing requires an active Subscription.
- Resuming requires a paused Subscription.
- Plan changes require an authenticated or active Subscription.
- Immediate plan change can create a prorated charge or credit/refund adjustment.
- Cycle-end change avoids an immediate plan switch.
- Live Mode is blocked until Part 118.
