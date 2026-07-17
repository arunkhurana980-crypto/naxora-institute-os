# Security and Role Tests — Part 114

## Mandatory

### Route order
`VERIFY-PART114.js` must show Parts 112, 113 and 114 before the 404 handler.

### Public status
Expected:
- testModeLocked true
- liveModeEnabled false
- realMoneyCollectionEnabled false
- webhookAuthorityEnabled false
- featureAccessUnlockEnabled false

### Role checks
- no JWT → 401
- teacher/student/parent JWT → 403
- institute mismatch → 403

### Dependency check
No Part 113 provider-created plan → checkout plan list empty; provider subscription cannot be created.

### Consent
Preview must fail unless both Test Mode/test-data confirmation and customer authorisation acknowledgement are true.

### Duplicate protection
Same institute + plan + cycles + email + contact returns the existing local preview/provider Subscription.

### Exact confirmation
Wrong phrase must fail.

### Signature security
- missing fields → fail
- returned subscription ID mismatch → fail
- wrong signature → fail
- correct signature → provider status refresh

### Secret protection
No API response returns Key Secret. Public checkout options may return only the Test Key ID.

### Sensitive data
Never enter or speak CVV, OTP, UPI PIN, card number or bank password in NAXORA/VANI.
