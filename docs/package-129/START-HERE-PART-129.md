# START HERE — Part 129

## Name

**Part 129 — VANI Bulk CSV and JSON Import**

## Included

- CSV file selection and browser-side parsing.
- JSON array import.
- Linked JSON package import.
- Column mapping and auto-mapping.
- Server-side field validation.
- Branch/Course/Class/Teacher/Student linked-reference validation.
- Database and file duplicate detection.
- Duplicate policies: block or explicitly skip.
- Preview and exact confirmation.
- Private Owner Action Secret.
- Private temporary password for new account rows.
- Chunked MongoDB execution.
- All-or-nothing rollback on failure.
- Audit and import history.

## Install

```powershell
node .\VERIFY-PART128.js
node --check .\backend\src\server.js
node .\APPLY-PART129.js
node .\VERIFY-PART129.js
```

## Git

```powershell
git status
git add .
git commit -m "Add Part 129 VANI Bulk CSV and JSON Import"
git push
```
