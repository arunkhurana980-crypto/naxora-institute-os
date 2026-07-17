# Security and Role Tests — Part 117

## Mandatory
- Parts 112–117 are before the 404 handler.
- No JWT returns 401.
- Teacher/student/parent/staff returns 403.
- Institute mismatch returns 403.
- Missing Owner Action Secret configuration returns 503.
- Wrong private verification returns 403.
- Wrong exact confirmation returns 400.
- Live Mode returns 423.
- Pause on non-active state is blocked.
- Resume on non-paused state is blocked.
- Plan change on created/pending/halted is blocked.
- Same current/target plan is blocked.
- Cancel-now preview contains irreversible warning.
- Repeated accepted action does not call provider again.
- Provider secrets and Owner Action Secret never appear in API responses.
- Part 115 remains final status authority.
- Part 116 access is not changed merely because a preview was created.
