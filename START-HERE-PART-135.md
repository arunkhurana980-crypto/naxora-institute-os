# START HERE — Part 135

**Part 135 — VANI Conversational Workflow Engine**

Included: multi-turn questions, saved state, dependency-aware steps, native Parts 130–134 previews/execution, exact confirmation, pause/resume/cancel, retry, optional skip, secure Part 128 handoff, Part 129 importer handoff and audit.

Not included: passwords/OTP/Owner-secret handling, direct card charge/refund/transfer, unconfirmed autonomous execution, or final “fully worked” certification.

```powershell
node .\VERIFY-PART134.js
node --check .\backend\src\server.js
node .\APPLY-PART135.js
node .\VERIFY-PART135.js
```

```powershell
git status
git add .
git commit -m "Add Part 135 VANI Conversational Workflow Engine"
git push
```
