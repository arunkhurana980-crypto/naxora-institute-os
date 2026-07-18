# Security and Rollback — Part 129

- Only Institute Owner may preview and confirm.
- JWT institute must match requested institute.
- File is selected manually in the browser.
- VANI cannot silently inspect local files.
- Passwords and secrets are not columns in any template.
- Temporary password is entered only at private confirmation.
- Password is never stored in the import preview and never returned.
- New accounts use Part 120-compatible scrypt hashing.
- New accounts require password change on first login.
- Maximum 500 total rows and 100 new accounts per import.
- Request body limit is enforced by Part 129 logic.
- Import is create-only.
- Update, delete and purge imports are disabled.
- Direct payment/refund data is unsupported.
- Failed execution deletes all documents created by that import in reverse order.
- Part 129 rollback is best-effort and the result reports `rollbackApplied`.
