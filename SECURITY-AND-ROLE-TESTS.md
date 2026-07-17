# Security and Role Tests — Part 123

## Mandatory
- Part 120 → 121 → 122 → 123 → Parts 112–119 route order passes.
- No JWT returns 401.
- Teacher/Parent/Staff token returns 403.
- Student token works.
- Institute Owner token works in supervisor mode.
- instituteId mismatch returns 403.
- Student counts require institute + Student fields.
- Institute-only models are not counted for Student mode.
- Unscoped models are never counted.
- A different Student ID does not match.
- Owner supervisor mode uses institute scope only.
- Plan-blocked modules remain disabled.
- Arbitrary route is not accepted.
- Unknown module returns 404.
- Sensitive VANI request is blocked.
- Old `/student-app` route remains available.
