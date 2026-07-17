# START HERE — Part 127

## Exact name
**Part 127 — Final Demo Data, Acceptance and Project Freeze**

## Final classification

```text
NAXORA Institute OS 2.0
FINAL_DEMO_BETA
```

This is the agreed closing part. `nextPart` is `null`.

## What Part 127 adds

- Linked JSON demo-data importer.
- Part 120 demo role accounts.
- Parent-child and branch role scopes.
- Demo Students, Teachers, Classes, Attendance, Fees, Assignments, Results, Leads, Notices and Tasks.
- Final Demo/Beta acceptance centre.
- Demo account-map download.
- Release manifest download.
- Safe Part 127-only demo reset.
- Final project-freeze record.

## Honest VANI status

```text
Navigation and summaries: Yes
Native multi-step actions: 9
Every historical feature automated by VANI: No
```

## Install prerequisite

```powershell
node .\VERIFY-PART126.js
```

## Install

```powershell
node --check .\backend\src\server.js
node .\APPLY-PART127.js
node .\VERIFY-PART127.js
```

## Git

```powershell
git status
git add .
git commit -m "Add Part 127 Final Demo Acceptance and Project Freeze"
git push
```
