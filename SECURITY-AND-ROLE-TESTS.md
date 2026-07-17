# Security and Role Tests — Part 121

## Mandatory
- Part 120 → Part 121 → Parts 112–119 route order passes.
- No JWT on Owner overview returns 401.
- Teacher/Student/Parent token returns 403.
- instituteId mismatch returns 403.
- Owner Workspace reads only matching institute data.
- Unscoped MongoDB models are not counted.
- Plan-blocked modules stay disabled.
- V3 modules require active V3 entitlement.
- Arbitrary route is not accepted.
- Unknown module key returns 404.
- Sensitive VANI credential request is blocked.
- Account Access opens inside Part 119.
- Old owner route remains available for rollback/reference.
