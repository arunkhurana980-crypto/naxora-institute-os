# Security and Role Tests — Part 113

## Mandatory tests

### Public status
Expected:
- testModeLocked true
- customerSubscriptionCreationEnabled false
- checkoutEnabled false
- livePlanCreationEnabled false

### No login
Protected API should return 401.

### Non-owner role
Teacher/student/parent token should return 403.

### Institute mismatch
Token institute and requested institute mismatch should return 403.

### Invalid amount
Letters, negative values, more than two decimal places and out-of-range values should fail.

### Missing confirmation
Provider plan creation should fail with `EXACT_CONFIRMATION_REQUIRED`.

### Duplicate protection
Create the same preview twice. It should return the same local record. Confirm twice; second call should return the existing provider plan without duplicate creation.

### Live Mode lock
Part 113 should refuse provider actions when `RAZORPAY_MODE` is not `test`.

### Secret protection
No response should contain Key Secret, Webhook Secret or JWT.

### Local archive
Archive should hide/mark the NAXORA local record only. It must not claim to delete the Razorpay Plan.
