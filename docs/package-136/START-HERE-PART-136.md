# START HERE — Part 136

## Name

**Part 136 — Final All-Role VANI E2E Acceptance**

This is the final planned roadmap Part.

Installing it does not automatically mark VANI sale-ready.

Final classification is generated only when the live runtime gates pass.

## Required gates

- Required Part status endpoints.
- Five native catalogs with 12 actions each.
- Part 135 runtime native catalog: exactly 60.
- All major routes reachable.
- Secret/OTP blocker.
- Direct money movement blocker.
- Unknown-action blocker.
- Duplicate preview protection.
- Eight role self-tests.
- Seven real outside-scope denial tests.
- Four completed Part 135 workflows.
- 100% contextual VANI-button coverage on desktop.
- 100% contextual VANI-button coverage on mobile.
- Owner exact final confirmation.

## Install

```powershell
node .\VERIFY-PART135.js
node --check .\backend\src\server.js
node .\APPLY-PART136.js
node .\VERIFY-PART136.js
```

## Git

```powershell
git status
git add .
git commit -m "Add Part 136 Final All Role VANI Acceptance"
git push
```
