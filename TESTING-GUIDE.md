# Part 117 Testing Guide

## Setup
- Use Razorpay Test Mode.
- Use a Test Subscription created in Part 114.
- Part 115 webhook must be configured.
- Part 116 access engine must be deployed.
- Configure `NAXORA_OWNER_ACTION_SECRET` privately.

## Pause
Use an active Test Subscription.
Expected:
- preview ready,
- exact confirmation required,
- private verification required,
- provider accepts pause,
- webhook changes state,
- paid access locks after verified sync.

## Resume
Use a paused Test Subscription.
Expected:
- provider accepts resume if supported for the mandate,
- access restores only after verified state becomes active.

## Cancel at cycle end
Expected:
- provider schedules cancellation,
- current-cycle behaviour remains provider-controlled,
- final cancellation arrives through webhook.

## Cancel now
Expected:
- irreversible warning,
- exact confirmation and owner verification,
- cancelled Subscription cannot be restarted.

## Plan change
Use an authenticated or active Subscription and another provider-created Part 113 plan.
- Cycle-end change: scheduled.
- Immediate change: may generate Test adjustment.
- Part 116 access waits for verified plan/status sync.

## Negative tests
- Non-owner token.
- Wrong instituteId.
- Wrong confirmation.
- Wrong owner secret.
- Live Mode.
- Invalid state.
- Same target plan.
- Duplicate execute request.
