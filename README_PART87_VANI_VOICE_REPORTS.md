# Part 87 — VANI Voice Reports

## Part number and exact name
Part 87 — VANI Voice Reports

## Features added
- VANI Voice Reports page.
- Report type registry.
- Role-based report permissions.
- Report generation preview.
- Voice script generation.
- Safe spoken summary.
- Private-screen-first report handling.
- Browser voice report reader.
- VANI command support for reports.
- Audit log foundation.

## Why each feature was added
Owners, teachers, parents, students and staff need fast spoken summaries, but sensitive details must not be spoken loudly. Part 87 adds a safe voice report layer.

## Problem solved
VANI could listen/reply and perform safe action previews, but it did not yet create structured reports and read them safely.

## Benefits
Owner: daily business brief by voice.
Institute: faster monitoring and fewer missed alerts.
Teacher: class execution report.
Student: learning progress report.
Parent: linked-child report.
Accountant: fee collection summary.

## Frontend/UI changes
- `frontend/vani-voice-reports.html`
- `frontend/vani-voice-reports.css`
- `frontend/vani-voice-reports.js`
- `frontend/vani-voice-starter.js` preserved/enhanced

## Backend changes
- `backend/src/server.js` updated with Part 87 APIs and routes.

## Database changes
No mandatory migration.
Future optional collections:
- `vanivoicereportlogs`
- `reportaccessauditlogs`
- `scheduledvoicereports`

## API changes
- `/api/part87/status`
- `/api/part87/config`
- `/api/part87/report-types`
- `/api/part87/roles`
- `/api/part87/access-check`
- `/api/part87/report/generate`
- `/api/part87/report/voice-script`
- `/api/part87/report/summary`
- `/api/part87/vani/greeting`
- `/api/part87/vani/command`
- `/api/part87/audit-log`
- `/api/part87/activity`
- `/api/part87/checklist`
- `/api/part87/export`
- `/api/part87/demo`

## Role permissions
Owner can access full authorised institute reports. Accountant can access fee reports. Teacher can access assigned class reports. Student can access own learning report. Parent can access linked-child report. Super admin does not get unrestricted institute-private voice reports.

## Security considerations
- No `.env`.
- No secrets/API keys.
- Sensitive amounts and child/student data are private-screen-first.
- VANI speaks safe summaries only.
- Report export requires verification.
- 3.0 owner-only subscription rule preserved.

## VANI integration
Commands:
- VANI, owner daily report sunao
- VANI, fee collection report sunao
- VANI, attendance report batao
- VANI, admission report sunao
- VANI, teacher class report sunao
- VANI, student learning report batao
- VANI, child weekly report sunao

## Testing steps
1. Deploy to Render.
2. Open `/api/part87/status`.
3. Open `/vani-voice-reports`.
4. Generate owner daily report.
5. Click Read Report.
6. Test unauthorized report access.
7. Test VANI command.

## Expected test results
- Status returns success true.
- Page opens.
- Report generates.
- VANI speaks safe voice script.
- Sensitive metrics show private-screen-first.
- Unauthorized report role is blocked.

## Known limitations
- Production database hard-connect is pending.
- Scheduled automatic reports are future work.
- Browser voice depends on browser support and user click.
- Full Hindi/Hinglish conversation continues in Part 88.

## Pending work
- Part 88 — Hindi/Hinglish VANI Conversation
- Scheduled voice reports
- Production report persistence
- Native mobile voice background mode

## Setup and environment variables
No new environment variables required.

## Preservation
All previous working features from Part 1–86 are preserved.
