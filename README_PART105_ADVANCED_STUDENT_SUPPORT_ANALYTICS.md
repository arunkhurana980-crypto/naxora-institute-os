# Part 105 — Advanced Student Support Analytics

## Part number and exact name
Part 105 — Advanced Student Support Analytics

## Features added
- Advanced Student Support Analytics page.
- Student support score.
- Support segments.
- Academic gap detection.
- Attendance and engagement analysis.
- Support intervention plan draft.
- Parent summary draft.
- Teacher workload preview.
- Role-scoped student support summaries.
- Private-screen-first student support privacy policy.
- VANI student support analytics commands.
- Role-based student support access checks.
- Soft calm VANI voice preserved.

## Why each feature was added
Teachers and owners need early signals to support students before academic performance drops.

## Problem solved
Student support data was scattered across attendance, tests, homework, doubts and parent communication. Part 105 combines these into safe, practical support analytics.

## Benefits
Owner: can see authorised support overview.
Institute: can improve student retention and results.
Teacher: can identify weak topics and create support plans.
Student: gets own revision focus and learning steps.
Parent: gets safe linked-child support summary after review.

## Frontend/UI changes
- `frontend/advanced-student-support-analytics.html`
- `frontend/advanced-student-support-analytics.css`
- `frontend/advanced-student-support-analytics.js`
- `frontend/vani-voice-starter.js` soft calm voice preserved

## Backend changes
- `backend/src/server.js` updated with Part 105 APIs and routes.

## Database changes
No mandatory migration.
Future optional collections:
- `studentsupportscores`
- `studentsupportsegments`
- `studentacademicgaps`
- `studentengagementsignals`
- `studentsupportplans`
- `parentsummarydrafts`
- `studentsupportauditlogs`

## API changes
- `/api/part105/status`
- `/api/part105/config`
- `/api/part105/features`
- `/api/part105/roles`
- `/api/part105/access-check`
- `/api/part105/students`
- `/api/part105/dashboard`
- `/api/part105/segments`
- `/api/part105/scorecard`
- `/api/part105/academic-gap-analysis`
- `/api/part105/engagement-analysis`
- `/api/part105/support-plan`
- `/api/part105/parent-summary-draft`
- `/api/part105/teacher-workload-preview`
- `/api/part105/role-scoped-summary`
- `/api/part105/privacy-policy`
- `/api/part105/vani/greeting`
- `/api/part105/vani/command`
- `/api/part105/audit-log`
- `/api/part105/activity`
- `/api/part105/checklist`
- `/api/part105/export`
- `/api/part105/demo`

## Role permissions
Owner can view authorised support overview. Branch manager can view assigned branch. Teacher can view assigned students/batches. Counsellor can view follow-up queue only. Accountant can view fee-followup safe summary only. Student can view own support summary only. Parent can view linked child's parent-safe summary only. Super Admin has platform support only.

## Security considerations
- No `.env`.
- No secrets/API keys.
- No public labels.
- No automated decisions.
- No parent auto-send.
- No support plan auto-assign.
- Teacher review required.
- Sensitive student details are private-screen-first.
- VANI speaks count-level safe summaries only.
- Exports and bulk parent messages require owner verification.
- 3.0 owner-only subscription rule preserved.

## VANI integration
Example commands:
- VANI, student support overview dikhao
- VANI, support segments dikhao
- VANI, Riya ka academic gap analysis banao
- VANI, Riya ke liye support plan draft banao
- VANI, parent summary draft banao
- VANI, student support privacy policy batao

## Testing steps
1. Deploy to Render.
2. Open `/api/part105/status`.
3. Open `/advanced-student-support-analytics`.
4. Click Start VANI.
5. Ask the sample academic gap/support plan command.
6. Test teacher role.
7. Test owner, branch manager, counsellor, accountant, student and parent scoped roles.

## Expected test results
- Status returns success true.
- Page opens.
- Support dashboard appears.
- Student scorecard appears.
- Academic gap analysis appears.
- Engagement analysis appears.
- Support plan draft appears.
- Parent summary draft is auto-send off.
- Sensitive data remains private-screen-first.
- VANI gives safe student support summary.

## Known limitations
- Preview/demo student data only.
- Production student support database persistence pending.
- Real task assignment workflow pending.
- Real parent message workflow pending.
- Support scores are rule-based foundation only.

## Pending work
- Part 106 — Business Forecasting
- Production support-score persistence
- Real teacher/counsellor task workflow
- Real parent summary approval/send workflow
- Historical student trend analytics

## Setup and environment variables
No new environment variables required.

## Preservation
All previous working features from Part 1–104 are preserved.
