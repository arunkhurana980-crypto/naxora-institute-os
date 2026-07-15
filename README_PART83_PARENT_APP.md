# Part 83 — Parent App

## Part number and exact name
Part 83 — Parent App

## Features added
- Parent mobile app page.
- Linked-child-only access guard.
- Parent dashboard.
- Linked children view.
- Attendance view.
- Fees safe view.
- Results/progress view.
- Teacher messages.
- Notices.
- Live classes.
- Weekly summary.
- VANI Parent Assistant with Listen + Reply.

## Why each feature was added
Parents need a simple phone-first view for their child’s attendance, fees, progress, teacher communication, notices and weekly summary.

## Problem solved
Parent communication can become scattered across calls, WhatsApp and paper notes. Part 83 creates one structured parent app foundation with linked-child privacy.

## Benefits
Owner: better parent satisfaction and retention.
Institute: fewer repeated phone calls for basic updates.
Teacher: structured communication with parents.
Student: support reaches home faster.
Parent: clear child updates on mobile.

## Frontend/UI changes
- `frontend/parent-mobile-app.html`
- `frontend/parent-mobile-app.css`
- `frontend/parent-mobile-app.js`
- `frontend/vani-voice-starter.js` preserved/enhanced

## Backend changes
- `backend/src/server.js` updated with Part 83 APIs and routes.

## Database changes
No mandatory migration.
Future optional collections:
- `parentappactivitylogs`
- `parent_child_links`
- `parent_teacher_messages`
- `vani_parent_activity_logs`

## API changes
- `/api/part83/status`
- `/api/part83/config`
- `/api/part83/features`
- `/api/part83/roles`
- `/api/part83/access-check`
- `/api/part83/dashboard`
- `/api/part83/linked-children`
- `/api/part83/attendance`
- `/api/part83/fees-safe-view`
- `/api/part83/results`
- `/api/part83/teacher-messages`
- `/api/part83/notices`
- `/api/part83/live-classes`
- `/api/part83/weekly-summary`
- `/api/part83/vani/greeting`
- `/api/part83/vani/command`
- `/api/part83/activity`
- `/api/part83/checklist`
- `/api/part83/export`
- `/api/part83/demo`

## Role permissions
Parent can access only linked child/children. Student uses Student App. Teacher/owner/branch manager/accountant may preview readiness only according to permissions. Receptionist and NAXORA Super Admin do not receive unrestricted child/private data access.

## Security considerations
- No `.env`.
- No secrets/API keys.
- Linked-child-only rule.
- Fees and teacher messages are private-screen-first.
- VANI speaks safe summaries only.
- Payment/message-send/export require confirmation and verification in future workflows.
- 3.0 owner-only subscription rule preserved.

## VANI integration
VANI Parent Assistant supports:
- Start VANI greeting.
- Listen button.
- Voice-to-text on supported browsers.
- Backend command response.
- Safe spoken reply.

Example commands:
- VANI, attendance dikhao
- VANI, fee summary batao
- VANI, result dikhao
- VANI, teacher messages dikhao
- VANI, weekly summary batao

## Testing steps
1. Deploy to Render.
2. Open `/api/part83/status`.
3. Open `/parent-mobile-app`.
4. Click Start VANI.
5. Click Listen and speak a basic command.
6. Or type a command and press Ask VANI.
7. Test student blocked route.

## Expected test results
- Status returns success true.
- Page opens.
- Start VANI speaks greeting.
- Listen captures command on supported browsers.
- VANI reply appears on screen.
- VANI speaks safe summary.
- Student/receptionist are blocked.

## Known limitations
- Speech recognition depends on browser support and mic permission.
- Full multi-step AI action engine starts Part 84.
- Native Android/iOS packaging pending.
- Real production data schema hard-connect pending.

## Pending work
- Part 84 — Advanced VANI Action Engine
- Part 85 — VANI Admission Assistant
- Part 86 — VANI Fee and Attendance Actions
- Part 87 — VANI Voice Reports
- Part 88 — Hindi/Hinglish VANI Conversation

## Setup and environment variables
No new environment variables required.

## Preservation
All previous working features from Part 1–82 are preserved.
