# START HERE — Part 125

## Exact name
**Part 125 — Global VANI Multi-Step Action Engine**

## Main page

```text
/vani-actions
```

## Action lifecycle

```text
Role login
→ VANI command or structured form
→ role permission
→ institute and Part 124 scope check
→ preview
→ exact confirmation
→ separate execute step
→ canonical MongoDB action/outbox
→ native adapter when registered
→ audit trail
```

## Supported actions
- Attendance mark.
- Attendance correction request.
- Fee reminder.
- Fee assistance request.
- Admission/lead follow-up.
- Assignment creation.
- Assignment submission.
- Role-safe message.
- Branch task creation.

## Important boundary
Part 125 creates a real canonical action and outbox record. It does not pretend that an old module, email, SMS or WhatsApp provider was updated when no compatible adapter is registered.

Part 126 registers cross-module and notification adapters.

## Install prerequisite
Corrected Part 124 v2 must already pass:

```powershell
node .\VERIFY-PART124.js
```

## Install

```powershell
node --check .\backend\src\server.js
node .\APPLY-PART125.js
node .\VERIFY-PART125.js
```

## Git

```powershell
git status
git add .
git commit -m "Add Part 125 Global VANI Multi Step Actions"
git push
```
