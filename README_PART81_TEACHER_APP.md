# Part 81 — Teacher App

## Part number and exact name
Part 81 — Teacher App

## Features added
- Teacher mobile app page.
- Teacher role and assigned-batch access guard.
- Teacher dashboard.
- Assigned batches.
- Attendance draft preview.
- Assignments/homework.
- Tests/results foundation.
- Notes/material foundation.
- Live classes foundation.
- Student support alerts.
- VANI Teacher Assistant.
- VANI browser voice greeting starter.
- Owner app VANI voice starter enhancement.

## Why each feature was added
Teachers need a phone-first workspace for daily teaching work: batches, attendance, homework, tests, notes, live classes and student support.

## Problem solved
Teacher workflows were desktop-heavy and VANI felt silent. Part 81 adds mobile teacher workflow plus Level 1 browser speech greeting.

## Benefits
Owner: teaching execution visibility improves.
Institute: daily class work becomes faster.
Teacher: assigned batch tools on mobile.
Student: attendance/homework/tests/support become faster.
Parent: future parent updates become more accurate.

## Frontend/UI changes
- `frontend/teacher-mobile-app.html`
- `frontend/teacher-mobile-app.css`
- `frontend/teacher-mobile-app.js`
- `frontend/vani-voice-starter.js`
- `frontend/institute-owner-app.html` updated with Start VANI button
- `frontend/institute-owner-app.js` updated to speak safe VANI summary

## Backend changes
- `backend/src/server.js` updated with Part 81 APIs and routes.

## Database changes
No mandatory migration.
Future optional collections:
- `teacherappactivitylogs`
- `teacherattendance_drafts`
- `vani_teacher_activity_logs`
- `mobiledevicesessions`

## API changes
- `/api/part81/status`
- `/api/part81/config`
- `/api/part81/features`
- `/api/part81/roles`
- `/api/part81/access-check`
- `/api/part81/dashboard`
- `/api/part81/my-batches`
- `/api/part81/attendance/draft`
- `/api/part81/assignments`
- `/api/part81/tests`
- `/api/part81/notes-material`
- `/api/part81/live-classes`
- `/api/part81/student-support`
- `/api/part81/vani/greeting`
- `/api/part81/vani/command`
- `/api/part81/activity`
- `/api/part81/checklist`
- `/api/part81/export`
- `/api/part81/demo`

## Role permissions
Teacher can access only assigned batches/students/classes. Owner and branch manager can preview readiness, but teacher actions still need teacher context. Student, parent, accountant and receptionist are blocked from teacher app.

## Security considerations
- No `.env`.
- No secrets/API keys.
- Student support data is private-screen-first.
- Attendance final save requires confirmation.
- Marks publish, assignment send, delete and export require confirmation.
- 3.0 owner-only subscription rule preserved.

## VANI integration
VANI Teacher Assistant supports voice greeting:
“Namaste, main VANI hoon. Main aapki teaching me kya help kar sakti hoon?”

Browser voice starts after user taps Start VANI because browsers block automatic speech.

## Testing steps
1. Deploy to Render.
2. Open `/api/part81/status`.
3. Open `/teacher-mobile-app`.
4. Tap Start VANI.
5. Test teacher dashboard.
6. Test student blocked route.
7. Test VANI command.

## Expected test results
- Status returns success true.
- Page opens.
- Start VANI speaks greeting on supported browser.
- Teacher dashboard loads.
- Student/parent are blocked.
- VANI reads safe summary, private data remains on screen.

## Known limitations
- This is browser speech, not full AI conversation.
- Mic input and advanced Hindi/Hinglish conversation come in Parts 84–88.
- Native app store build pending.
- Real attendance final save pending production schema connection.

## Pending work
- Part 82 — Student App
- Part 83 — Parent App
- Part 84–88 — Advanced VANI

## Setup and environment variables
No new environment variables required.

## Preservation
All previous working features from Part 1–80 are preserved.
