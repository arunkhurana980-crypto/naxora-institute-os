# START HERE — Part 126

## Exact name
**Part 126 — Native Adapters, Notifications and Cross-Module E2E Integration**

Part 125 actions now have nine registered native adapters:

```text
attendance.mark
attendance.correction_request
fees.reminder
fees.assistance_request
admission.follow_up
assignment.create
assignment.submit
message.send
branch.task.create
```

Successful execution becomes `executed_native`.

Main page:

```text
/integration-centre
```

## Prerequisite

```powershell
node .\VERIFY-PART125.js
```

## Install

```powershell
node --check .\backend\src\server.js
node .\APPLY-PART126.js
node .\VERIFY-PART126.js
```

## Git

```powershell
git status
git add .
git commit -m "Add Part 126 Native Adapters Notifications and Cross Module E2E"
git push
```

Render → Manual Deploy → Clear build cache & deploy.
