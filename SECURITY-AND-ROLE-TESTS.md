# Security and Role Tests — Part 122

## Mandatory
- Part 120 → 121 → 122 → Parts 112–119 route order passes.
- No JWT returns 401.
- Student/Parent/Staff token returns 403.
- Teacher token works.
- Institute Owner token works in supervisor mode.
- instituteId mismatch returns 403.
- Teacher counts require institute + teacher fields.
- An institute-only model is not counted for Teacher.
- Unscoped models are never counted.
- Owner supervisor mode uses institute scope only.
- Plan-blocked modules remain disabled.
- Arbitrary route is not accepted.
- Unknown module returns 404.
- Sensitive VANI request is blocked.
- Old `/teacher-app` route remains available.
