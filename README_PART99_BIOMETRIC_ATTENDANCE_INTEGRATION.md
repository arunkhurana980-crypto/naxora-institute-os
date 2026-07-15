# Part 99 — Biometric Attendance Integration

## Part number and exact name
Part 99 — Biometric Attendance Integration

## Features added
- Biometric Attendance Integration page.
- Device registry preview.
- Branch/device mapping foundation.
- Vendor connector readiness.
- Device sync preview.
- Duplicate/anomaly detection.
- Attendance merge preview.
- Attendance summary.
- User mapping preview.
- Privacy policy.
- VANI biometric attendance commands.
- Role-based biometric attendance access checks.
- Soft calm VANI voice preserved.

## Why each feature was added
Institutes often use biometric attendance devices. Part 99 creates the safe bridge between device logs and NAXORA attendance without storing raw biometric templates.

## Problem solved
Biometric device data needed a controlled way to sync, review, detect duplicates and merge into attendance.

## Benefits
Owner: can configure and approve biometric attendance merge.
Institute: device attendance becomes cleaner and safer.
Teacher: can view assigned batch attendance preview.
Student: can view own attendance status.
Parent: can view linked child attendance status.

## Frontend/UI changes
- `frontend/biometric-attendance-integration.html`
- `frontend/biometric-attendance-integration.css`
- `frontend/biometric-attendance-integration.js`
- `frontend/vani-voice-starter.js` soft calm voice preserved

## Backend changes
- `backend/src/server.js` updated with Part 99 APIs and routes.

## Database changes
No mandatory migration.
Future optional collections:
- `biometricdevices`
- `biometricdevicemappings`
- `biometricuserlinks`
- `biometricattendancelogs`
- `biometricattendanceanomalies`
- `biometricattendancemergepreviews`

## API changes
- `/api/part99/status`
- `/api/part99/config`
- `/api/part99/features`
- `/api/part99/roles`
- `/api/part99/access-check`
- `/api/part99/devices`
- `/api/part99/device/register-preview`
- `/api/part99/device/connector-readiness`
- `/api/part99/device/sync-preview`
- `/api/part99/logs/anomaly-check`
- `/api/part99/attendance/merge-preview`
- `/api/part99/attendance/summary`
- `/api/part99/user-mapping-preview`
- `/api/part99/privacy-policy`
- `/api/part99/vani/greeting`
- `/api/part99/vani/command`
- `/api/part99/audit-log`
- `/api/part99/activity`
- `/api/part99/checklist`
- `/api/part99/export`
- `/api/part99/demo`

## Role permissions
Owner can configure devices, sync, merge and approve exports. Branch manager can sync and merge assigned branch previews. Teacher can view assigned batch preview only. Accountant can view staff payroll-safe summary only. Receptionist can view today branch summary only. Student can view own attendance. Parent can view linked child attendance. Super Admin has platform support only.

## Security considerations
- No `.env`.
- No secrets/API keys.
- No raw fingerprint template storage.
- No raw face template storage.
- No vendor API key in chat.
- No auto-final attendance.
- Device sync/merge requires confirmation.
- Device delete/export/privacy change requires owner verification.
- Consent required.
- Private-screen-first for attendance reports.
- 3.0 owner-only subscription rule preserved.

## VANI integration
Example commands:
- VANI, biometric device status dikhao
- VANI, device sync preview banao
- VANI, duplicate anomaly check karo
- VANI, attendance merge preview banao
- VANI, biometric privacy policy batao

## Testing steps
1. Deploy to Render.
2. Open `/api/part99/status`.
3. Open `/biometric-attendance-integration`.
4. Click Start VANI.
5. Ask the sample device sync command.
6. Test anomaly check.
7. Test attendance merge preview.
8. Test student, parent, accountant and owner roles.

## Expected test results
- Status returns success true.
- Page opens.
- Devices preview appears.
- Sync preview appears.
- Duplicate/unknown-user anomalies appear.
- Attendance merge preview appears.
- Privacy policy says raw biometric templates are not stored.
- Final sync/merge/export does not happen automatically.

## Known limitations
- Real vendor API not connected yet.
- Real biometric hardware not connected in this part.
- CSV/vendor import is preview foundation only.
- Production attendance persistence pending.
- Device mapping database pending.
- Vendor API keys must be configured in Render env later, never in chat.

## Pending work
- Part 100 — Digital Board Integration
- Real vendor API connector
- Production device mapping persistence
- Attendance merge persistence
- Owner-verified exports

## Setup and environment variables
No new required environment variables.
Future optional env:
- `BIOMETRIC_VENDOR_API_BASE`
- `BIOMETRIC_VENDOR_API_KEY`

Do not paste vendor secrets in chat.

## Preservation
All previous working features from Part 1–98 are preserved.
