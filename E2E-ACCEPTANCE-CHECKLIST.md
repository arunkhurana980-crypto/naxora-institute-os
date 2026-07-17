# Part 126 E2E Acceptance Checklist

- `/api/part126/status` returns 9 adapters.
- New Part 125 action reaches `executed_native`.
- Duplicate execute creates no second native record.
- Parent-child isolation passes.
- Branch isolation passes.
- Student self-scope passes.
- Role-safe message recipient check passes.
- Notification inbox and mark-read pass.
- Pending action retry passes.
- Provider status is truthful.
- Owner `/api/part126/e2e/acceptance` checks pass.
- Direct money actions remain disabled.

Passing this checklist means the build is ready to enter Part 127 acceptance, not automatically production launched.
