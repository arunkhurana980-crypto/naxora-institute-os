# Testing Guide

## Package test

```powershell
node .\VERIFY-PART1361.js
```

## Runtime test

1. Open `/login`.
2. Confirm it redirects to `/common-login`.
3. Open `/api/part1361/status`.
4. Confirm:
   - `bootstrapSecretConfigured: true`
   - `bootstrapAvailable: true`
5. Open `/owner-bootstrap`.
6. Generate preview.
7. Confirm wrong exact confirmation is rejected.
8. Confirm weak password is rejected.
9. Create the first Owner.
10. Confirm generated Institute ID appears.
11. Open `/api/part1361/status` again.
12. Confirm:
   - `firstOwnerExists: true`
   - `bootstrapAvailable: false`
13. Login through `/common-login`.
14. Open `/app`.
15. Open `/vani-acceptance`.
16. Confirm current role is `institute_owner` and no Institute ID error appears.
