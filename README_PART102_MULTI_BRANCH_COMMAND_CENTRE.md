# Part 102 — Multi-Branch Command Centre

## Part number and exact name
Part 102 — Multi-Branch Command Centre

## Features added
- Multi-Branch Command Centre page.
- Branch registry preview.
- Multi-branch KPI dashboard.
- Branch health score.
- Branch comparison.
- Branch alerts.
- Branch action plan draft.
- Role-scoped branch summaries.
- Private-screen-first privacy policy.
- VANI multi-branch commands.
- Role-based branch access checks.
- Soft calm VANI voice preserved.

## Why each feature was added
Institute owners with multiple branches need a single command centre for branch KPIs, alerts, comparison and action plans.

## Problem solved
Branch data was scattered. Part 102 creates a central, permission-safe dashboard for owner and branch managers.

## Benefits
Owner: can compare all authorised branches.
Institute: can catch branch risks earlier.
Branch Manager: can see own branch action plan.
Teacher: can view assigned branch academic summary.
Student/Parent: can see own/linked child branch-safe status only.

## Frontend/UI changes
- `frontend/multi-branch-command-centre.html`
- `frontend/multi-branch-command-centre.css`
- `frontend/multi-branch-command-centre.js`
- `frontend/vani-voice-starter.js` soft calm voice preserved

## Backend changes
- `backend/src/server.js` updated with Part 102 APIs and routes.

## Database changes
No mandatory migration.
Future optional collections:
- `branches`
- `branchkpis`
- `branchhealthscores`
- `branchalerts`
- `branchactionplans`
- `branchmanagerassignments`
- `branchcommandauditlogs`

## API changes
- `/api/part102/status`
- `/api/part102/config`
- `/api/part102/features`
- `/api/part102/roles`
- `/api/part102/access-check`
- `/api/part102/branches`
- `/api/part102/dashboard`
- `/api/part102/branch-health`
- `/api/part102/branch-comparison`
- `/api/part102/alerts`
- `/api/part102/action-plan`
- `/api/part102/role-scoped-summary`
- `/api/part102/privacy-policy`
- `/api/part102/vani/greeting`
- `/api/part102/vani/command`
- `/api/part102/audit-log`
- `/api/part102/activity`
- `/api/part102/checklist`
- `/api/part102/export`
- `/api/part102/demo`

## Role permissions
Owner can view and compare all authorised branches. Branch manager can view assigned branch only. Teacher sees academic summary only. Accountant sees finance-safe summary only. Receptionist/counsellor sees enquiry summary only. Student sees own branch status only. Parent sees linked child branch status only. Super Admin has platform support only.

## Security considerations
- No `.env`.
- No secrets/API keys.
- Sensitive fee/student/staff details are private-screen-first.
- VANI speaks count-level safe summaries only.
- Cross-branch exports require owner verification.
- Branch settings changes require owner verification.
- Bulk messages and manager reassignment require owner verification.
- Branch manager cannot see other branches.
- 3.0 owner-only subscription rule preserved.

## VANI integration
Example commands:
- VANI, saari branches ka overview dikhao
- VANI, branches compare karo
- VANI, high priority branch alerts batao
- VANI, fee collection summary dikhao
- VANI, attendance summary batao
- VANI, South branch action plan banao

## Testing steps
1. Deploy to Render.
2. Open `/api/part102/status`.
3. Open `/multi-branch-command-centre`.
4. Click Start VANI.
5. Ask the sample branch comparison command.
6. Test owner role.
7. Test branch manager role.
8. Test teacher/accountant/receptionist/student/parent scoped roles.

## Expected test results
- Status returns success true.
- Page opens.
- KPI dashboard appears.
- Branch comparison appears for owner.
- Branch manager sees assigned branch only.
- Alerts appear.
- Action plan draft appears.
- Sensitive data is private-screen-first.
- VANI gives safe branch summary.

## Known limitations
- Preview/demo branch data only.
- Production branch database persistence pending.
- Real branch manager assignment database pending.
- Real export/settings workflow pending.
- Branch alerts are rule-based foundation only.

## Pending work
- Part 103 — Franchise Management
- Production branch data persistence
- Real branch role assignment
- Cross-branch export workflow
- Owner-verified branch settings changes

## Setup and environment variables
No new environment variables required.

## Preservation
All previous working features from Part 1–101 are preserved.
