# START HERE — Part 119

## Exact name
**Part 119 — Unified Single App Shell**

## What this part changes
A customer-facing central app URL is added:

```text
/app
```

The shell provides:
- common responsive sidebar and top bar,
- existing-session detection,
- server-side role filtering,
- Part 116 subscription/V3 filtering,
- one content pane for approved existing modules,
- hash-based module state,
- global VANI module navigation,
- mobile and desktop layout.

## Current boundary
Part 119 does not create the common login form. Existing role login token is detected. Part 120 adds the one common login and automatic role redirect.

Part 119 VANI opens modules only. Multi-step form filling and actions are connected in Part 125.

## Install

```powershell
node --check .\backend\src\server.js
node .\APPLY-PART119.js
node .\VERIFY-PART119.js
```

## Git

```powershell
git status
git add .
git commit -m "Add Part 119 Unified Single App Shell"
git push
```

Render → Manual Deploy → Clear build cache & deploy.

## Test URLs
- `/api/part119/status`
- `/api/part119/catalog`
- `/api/part119/security-policy`
- `/app`
