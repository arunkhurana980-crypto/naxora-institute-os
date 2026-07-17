# Security and Role Tests — Part 118

## Mandatory
- Parts 112–118 before 404 handler.
- No JWT → 401.
- Non-owner role → 403.
- Institute mismatch → 403.
- Missing Live Key Secret → readiness pending.
- Test Key ID in Live field → readiness pending.
- HTTP policy URL → rejected.
- Missing adult approver → readiness pending.
- KYC/bank documents are never accepted.
- Provider probe is read-only.
- Wrong exact confirmation → blocked.
- Wrong Owner Action Secret → blocked.
- Approval API does not edit Render.
- Real-money flag remains false until manually configured.
- Rollback requires its own exact confirmation and owner verification.
- Provider secrets never appear in API responses.
