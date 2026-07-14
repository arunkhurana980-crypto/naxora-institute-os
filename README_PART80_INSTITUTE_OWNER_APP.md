# Part 80 — Institute Owner App

## Part number and exact name
Part 80 — Institute Owner App

## Features added
- Owner mobile command center page.
- Owner-only access check.
- Revenue overview.
- Admissions overview.
- Fees overview.
- Attendance overview.
- Leads and follow-ups overview.
- Branch summary.
- Urgent alerts.
- VANI Owner Assistant.
- Activity/audit foundation.

## Why each feature was added
The owner needs phone-based control of institute health: revenue, admissions, fees, attendance, leads, branches and urgent alerts.

## Problem solved
Institute owners cannot always sit at a laptop. This part lets the owner quickly check business status from mobile while preserving role security.

## Benefits
Owner: mobile control of business pulse.
Institute: faster decisions and fewer missed follow-ups.
Teacher: owner can spot weak attendance/support needs quickly.
Student: low attendance/support issues can be noticed earlier.
Parent: fee/attendance communication can become faster and clearer.

## Frontend/UI changes
- `frontend/institute-owner-app.html`
- `frontend/institute-owner-app.css`
- `frontend/institute-owner-app.js`

## Backend changes
- `backend/src/server.js` updated with Part 80 APIs and routes.

## Database changes
No mandatory migration.
Future optional collections:
- `ownerappactivitylogs`
- `mobiledevicesessions`
- `owneralerts`

## API changes
- `/api/part80/status`
- `/api/part80/config`
- `/api/part80/features`
- `/api/part80/roles`
- `/api/part80/access-check`
- `/api/part80/overview`
- `/api/part80/revenue`
- `/api/part80/admissions`
- `/api/part80/fees`
- `/api/part80/attendance`
- `/api/part80/leads`
- `/api/part80/branches`
- `/api/part80/alerts`
- `/api/part80/vani/command`
- `/api/part80/activity`
- `/api/part80/checklist`
- `/api/part80/export`
- `/api/part80/demo`

## Role permissions
Only `institute_owner` with valid `instituteId` and active/trial/demo 2.0 subscription can access owner overview APIs.
Teacher, student, parent, accountant and branch manager are blocked from owner command center.

## Security considerations
- No `.env`.
- No secrets/API keys.
- Sensitive revenue/fees/branch data is private-screen-first.
- VANI cannot refund, discount, delete, export or change subscriptions directly.
- 3.0 owner-only subscription rule preserved.

## VANI integration
VANI Owner Assistant supports:
- "VANI, owner app overview dikhao"
- "VANI, revenue summary dikhao"
- "VANI, pending fees dikhao"
- "VANI, attendance alerts dikhao"
- "VANI, branch summary dikhao"

## Testing steps
1. Deploy to Render.
2. Open `/api/part80/status`.
3. Open `/institute-owner-app`.
4. Test owner allowed:
   `/api/part80/overview?role=institute_owner&instituteId=NX-DEMO-INST-001&subscription=demo`
5. Test student blocked:
   `/api/part80/overview?role=student&instituteId=NX-DEMO-INST-001&subscription=demo`
6. Test VANI command.

## Expected test results
- Status returns success true.
- Owner page opens.
- Owner overview returns data.
- Student/teacher/parent owner access is blocked.
- VANI returns private-screen-first output.

## Known limitations
- Native Android/iOS app is not deployed yet.
- Data is demo-safe/foundation mode until final production schema hard-connect.
- Push notifications are pending.
- Real device session enforcement is pending.

## Pending work
- Part 81 — Teacher App
- Part 82 — Student App
- Part 83 — Parent App
- Part 84–88 — Advanced VANI

## Setup and environment variables
No new environment variables required.

## Preservation
All NAXORA OS 1.0 and Part 79 features are preserved.
