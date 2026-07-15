# Part 94 — Native Live Classroom Foundation

## Part number and exact name
Part 94 — Native Live Classroom Foundation

## Features added
- Native Live Classroom Foundation page.
- Demo live room catalog.
- Device readiness preview.
- Network readiness preview.
- Participant policy.
- Join token preview.
- Launch preview.
- Room status preview.
- VANI Live Classroom commands.
- Role-based classroom access checks.
- Soft calm VANI voice preserved.

## Why each feature was added
NAXORA needs its own native live classroom foundation so institutes can run classes inside the platform instead of relying fully on external meeting links.

## Problem solved
Live class management was scattered. Part 94 creates the safe base for live rooms, device checks, join rules and VANI guidance.

## Benefits
Owner: can monitor authorised live-class readiness.
Institute: native live classroom journey begins.
Teacher: can prepare assigned class room and device check.
Student: can join own scheduled class preview.
Parent: can view linked child class status safely.

## Frontend/UI changes
- `frontend/native-live-classroom-foundation.html`
- `frontend/native-live-classroom-foundation.css`
- `frontend/native-live-classroom-foundation.js`
- `frontend/vani-voice-starter.js` soft calm voice preserved

## Backend changes
- `backend/src/server.js` updated with Part 94 APIs and routes.

## Database changes
No mandatory migration.
Future optional collections:
- `liveclassrooms`
- `liveclassroomsessions`
- `liveclassparticipants`
- `liveclassjoinlogs`
- `liveclassdevicereadiness`

## API changes
- `/api/part94/status`
- `/api/part94/config`
- `/api/part94/features`
- `/api/part94/roles`
- `/api/part94/access-check`
- `/api/part94/demo-rooms`
- `/api/part94/device-readiness`
- `/api/part94/network-readiness`
- `/api/part94/participant-policy`
- `/api/part94/join-token-preview`
- `/api/part94/room/preview`
- `/api/part94/room/launch-preview`
- `/api/part94/room/status`
- `/api/part94/vani/greeting`
- `/api/part94/vani/command`
- `/api/part94/audit-log`
- `/api/part94/activity`
- `/api/part94/checklist`
- `/api/part94/export`
- `/api/part94/demo`

## Role permissions
Teacher can host assigned batches only. Student can join own scheduled class only. Parent is linked-child view-only. Owner/branch manager can monitor authorised rooms. Receptionist/counsellor can view demo-class preview. Accountant is blocked. Super Admin has platform support only.

## Security considerations
- No `.env`.
- No secrets/API keys.
- No external WebRTC provider keys included.
- No auto-start class.
- No recording yet.
- No screen sharing yet.
- Join token is preview-only.
- Assigned scope required for teacher/student/parent.
- Sensitive classroom actions require confirmation.
- Recording export/delete privacy changes require owner verification.
- 3.0 owner-only subscription rule preserved.

## VANI integration
Example commands:
- VANI, Class 10 Maths live classroom preview dikhao
- VANI, device check karo
- VANI, network check batao
- VANI, teacher live class launch preview banao
- VANI, student join preview dikhao

## Testing steps
1. Deploy to Render.
2. Open `/api/part94/status`.
3. Open `/native-live-classroom-foundation`.
4. Click Start VANI.
5. Ask the sample live classroom command.
6. Test teacher role with teacherId and batchId.
7. Test student/parent scoped modes.
8. Test accountant blocked mode.

## Expected test results
- Status returns success true.
- Page opens.
- Device readiness preview appears.
- Network readiness guidance appears.
- Room preview appears.
- Participant policy appears.
- Join token preview appears.
- Launch preview is teacher-only.
- Final live signalling/recording is not executed.

## Known limitations
- Native live classroom is foundation mode.
- Production WebRTC signalling is pending.
- Screen sharing and digital whiteboard pending Part 95.
- Live chat, polls and hand raise pending Part 96.
- Recording and automatic attendance pending Part 97.
- Browser mic/camera permissions depend on user device/browser.

## Pending work
- Part 95 — Screen Sharing and Digital Whiteboard
- Part 96 — Live Chat, Polls and Hand Raise
- Part 97 — Recording and Automatic Attendance
- Production WebRTC signalling
- Real session persistence

## Setup and environment variables
No new environment variables required.

## Preservation
All previous working features from Part 1–93 are preserved.
