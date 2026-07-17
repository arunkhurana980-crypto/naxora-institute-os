# Part 118 Testing Guide

## Safe testing first
Keep:
- `RAZORPAY_MODE=test`
- `NAXORA_RAZORPAY_LIVE_LAUNCHED=false`

## Evidence test
Save all booleans false, then confirm launch preview is blocked.

## URL test
- HTTPS URL passes.
- HTTP/malformed URL is not saved as valid.

## Role test
- Owner works.
- Teacher/student/parent/staff denied.

## Credential test
- Missing Live Key Secret blocks provider probe.
- `rzp_test_` in Live Key ID field blocks readiness.
- Correct Live credentials allow read-only probe.

## Approval test
- Pending check blocks preview.
- Wrong exact text blocks approval.
- Wrong Owner Action Secret blocks approval.
- Correct approval returns `approved_pending_environment_switch`.
- Real-money flag remains false.

## Rollback test
- Rollback preview produces separate exact text.
- Wrong text or owner secret is blocked.
- Approval returns manual rollback instructions.
