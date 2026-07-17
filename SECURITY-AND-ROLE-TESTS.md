# Security and Role Tests — Part 127

- Import/reset/freeze require Owner JWT.
- instituteId mismatch returns 403.
- Exact confirmation is required.
- Owner Action Secret is required.
- Demo password must meet Part 120 policy.
- Password is scrypt-hashed.
- Password is never returned.
- Non-demo account identifier collision is rejected.
- Reset deletes only accounts created by `part127_demo_import:<datasetCode>`.
- Reset deletes only Part 127 demo models and Part 127-created scopes.
- Owner account is preserved.
- Parent-child scope is created server-side.
- Branch role scopes are created server-side.
- Arbitrary model names cannot be uploaded.
- Template counts have strict maximums.
- Direct money actions remain disabled.
- Freeze does not claim code immutability.
- Final status does not claim all-feature VANI.
