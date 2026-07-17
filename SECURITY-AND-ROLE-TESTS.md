# Security and Role Tests — Part 115

## Mandatory

### Route order
`VERIFY-PART115.js` must show Parts 112–115 before the 404 handler.

### Public status
Expected:
- signatureVerificationEnabled true
- duplicateEventProtectionEnabled true
- outOfOrderProtectionEnabled true
- featureAccessUnlockEnabled false
- liveModeEnabled false

### Signature
- no signature → 400
- wrong signature → 400
- parsed/reconstructed body instead of original raw body → signature must fail
- correct signature over exact raw body → accepted

### Duplicate
Send the same valid event ID twice. Second response must be HTTP 200 with `duplicate: true`; status update must not repeat.

### Out-of-order
Send a newer valid event, then an older valid event for the same Subscription. Older event must be stored as `out_of_order_ignored` and must not regress state.

### Tenant monitoring
Owner can only list events/sync states for the institute in the JWT/request context.

### Unknown Subscription
A valid event for an unknown `sub_...` ID is stored as `unmatched`, not silently mapped to another institute.

### Payload privacy
Full raw webhook body is not stored. Only payload digest and compact safe snapshot are stored.

### Access boundary
Part 115 may set `accessCandidate`, but `accessUnlockApplied` must remain false.
