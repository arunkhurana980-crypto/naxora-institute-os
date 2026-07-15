# Part 97 — Recording and Automatic Attendance

## Part number and exact name
Part 97 — Recording and Automatic Attendance

## Features added
- Recording and Automatic Attendance page.
- Recording policy foundation.
- Browser MediaRecorder capability preview.
- Local browser recording test on frontend.
- Recording start preview.
- Recording stop preview.
- Recording metadata preview.
- Automatic attendance draft preview.
- Attendance mark preview.
- Manual review queue.
- Attendance report preview.
- Parent summary draft.
- VANI recording and attendance commands.
- Role-based recording/attendance access checks.
- Soft calm VANI voice preserved.

## Why each feature was added
Live classes need safe recording and attendance automation. Part 97 creates recording readiness and draft attendance flow without unsafe auto-finalization.

## Problem solved
Teachers had no structured way to record class and prepare attendance draft from live class activity.

## Benefits
Owner: can monitor authorised recording/attendance reports.
Institute: attendance workflow becomes faster.
Teacher: can test recording and review attendance drafts.
Student: can view own attendance status.
Parent: can view linked child attendance summary.

## Frontend/UI changes
- `frontend/recording-automatic-attendance.html`
- `frontend/recording-automatic-attendance.css`
- `frontend/recording-automatic-attendance.js`
- `frontend/vani-voice-starter.js` soft calm voice preserved

## Backend changes
- `backend/src/server.js` updated with Part 97 APIs and routes.

## Database changes
No mandatory migration.
Future optional collections:
- `liveclassrecordings`
- `liveclassrecordingmetadata`
- `liveclassattendance`
- `liveclassattendancereviews`
- `liveclassparentsummaries`

## API changes
- `/api/part97/status`
- `/api/part97/config`
- `/api/part97/features`
- `/api/part97/roles`
- `/api/part97/access-check`
- `/api/part97/recording/session`
- `/api/part97/recording/capability`
- `/api/part97/recording/policy`
- `/api/part97/recording/start-preview`
- `/api/part97/recording/stop-preview`
- `/api/part97/recording/metadata-preview`
- `/api/part97/attendance/detect-preview`
- `/api/part97/attendance/mark-preview`
- `/api/part97/attendance/manual-review`
- `/api/part97/attendance/report-preview`
- `/api/part97/parent-summary/draft`
- `/api/part97/vani/greeting`
- `/api/part97/vani/command`
- `/api/part97/audit-log`
- `/api/part97/activity`
- `/api/part97/checklist`
- `/api/part97/export`
- `/api/part97/demo`

## Role permissions
Teacher can start/stop recording preview and review attendance for assigned classes. Owner/branch manager can monitor and finalise authorised reports. Student can view own attendance only. Parent can view linked child summary only. Receptionist/counsellor can view demo-class preview only. Accountant is blocked. Super Admin has platform support only.

## Security considerations
- No `.env`.
- No secrets/API keys.
- No cloud recording upload.
- No auto attendance finalization.
- Consent required before recording.
- Teacher review required for doubtful attendance.
- Parent summary auto-send off.
- Recording export/delete owner verification required.
- Sensitive reports private-screen-first.
- 3.0 owner-only subscription rule preserved.

## VANI integration
Example commands:
- VANI, recording capability check karo
- VANI, recording start preview banao
- VANI, recording stop preview banao
- VANI, automatic attendance draft dikhao
- VANI, manual review queue batao
- VANI, parent attendance summary draft banao

## Testing steps
1. Deploy to Render.
2. Open `/api/part97/status`.
3. Open `/recording-automatic-attendance`.
4. Click Start VANI.
5. Ask the sample attendance command.
6. Test Local Recording Start/Stop in browser.
7. Test teacher, student, parent and accountant roles.

## Expected test results
- Status returns success true.
- Page opens.
- Browser recording capability appears.
- Local recording preview can be tested after camera/mic permission.
- Automatic attendance draft appears.
- Manual review queue appears.
- Parent summary draft appears.
- No cloud recording upload happens.
- Attendance is not finalised automatically.

## Known limitations
- Recording upload/storage is not production-connected yet.
- Attendance database persistence pending.
- Real live participant tracking pending.
- AI class notes pending Part 98.
- Browser camera/mic permissions depend on user device/browser.

## Pending work
- Part 98 — AI Class Notes and Summary
- Production recording storage
- Attendance persistence
- Real live participant tracking
- Owner-verified recording export

## Setup and environment variables
No new environment variables required.

## Preservation
All previous working features from Part 1–96 are preserved.
