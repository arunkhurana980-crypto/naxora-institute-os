# Security and Role Tests — Part 125

## Authentication
- Missing JWT returns 401.
- instituteId mismatch returns 403.
- Unknown role returns 403.

## Scope
- Student targets only self.
- Parent targets only Owner-linked children.
- Branch-scoped roles require matching branchId.
- Institute-wide scope must have been explicitly assigned in Part 124.
- Teacher canonical request still requires Part 126 native adapter validation before native mutation.

## Action safety
- Unsupported action type blocked.
- Role/action matrix enforced.
- Missing fields return exact field list.
- Preview expires after 30 minutes.
- Exact confirmation required.
- Execute before confirmation blocked.
- Cancelled action cannot execute.
- Duplicate action protected.
- Execution is idempotent.

## Content
- Password, OTP, API secret, bank/card and KYC data blocked.
- Direct money transfer/charge/refund commands blocked.
- Destructive delete commands blocked.
- No external delivery is claimed without adapter success.
