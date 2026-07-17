# Feature Explanation — Part 120

## Unified login flow

```text
/login
→ institute ID
→ email/phone/login ID
→ password verification
→ signed JWT with role + instituteId
→ temporary-password check
→ automatic /app redirect
→ Part 119 role/subscription navigation
```

## Existing-user migration
A valid legacy JWT proves the current role and institute. The user sets a fresh common-login password. Old password hashes are not copied or exposed.

## New accounts
Only institute_owner can provision accounts. Account creation requires:
- owner JWT,
- matching institute,
- exact confirmation,
- private Owner Action Secret,
- temporary password meeting the password policy.

The user must change a temporary password at first login.

## Session safety
- Default token session: 12 hours in sessionStorage.
- Remember me: 7 days in localStorage.
- Five failed account logins trigger a temporary lock.
- IP/identifier rate limiting is enabled.
- Token version allows all unified sessions to be revoked.
