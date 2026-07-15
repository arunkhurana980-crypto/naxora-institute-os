# Part 96 — Live Chat, Polls and Hand Raise

## Part number and exact name
Part 96 — Live Chat, Polls and Hand Raise

## Features added
- Live Chat, Polls and Hand Raise page.
- Moderated live chat foundation.
- Chat message preview.
- Teacher poll create preview.
- Student vote preview.
- Student hand raise preview.
- Teacher hand raise queue preview.
- Moderation action preview.
- Parent view-only interaction summary.
- VANI classroom interaction commands.
- Socket-ready foundation mode.
- Soft calm VANI voice preserved.

## Why each feature was added
Live classes need interaction: doubts, quick checks, polls and hand raise. Part 96 adds safe classroom interaction foundation.

## Problem solved
Teachers needed a controlled way to take doubts and check understanding during live class.

## Benefits
Owner: can monitor classroom interaction readiness.
Institute: live classes become more engaging.
Teacher: can manage chat, polls and hand raise queue.
Student: can ask doubts and vote in polls.
Parent: can view linked child status safely.

## Frontend/UI changes
- `frontend/live-chat-polls-hand-raise.html`
- `frontend/live-chat-polls-hand-raise.css`
- `frontend/live-chat-polls-hand-raise.js`
- `frontend/vani-voice-starter.js` soft calm voice preserved

## Backend changes
- `backend/src/server.js` updated with Part 96 APIs and routes.

## Database changes
No mandatory migration.
Future optional collections:
- `liveclasschatmessages`
- `liveclasspolls`
- `liveclasspollvotes`
- `liveclasshandraises`
- `liveclassmoderationlogs`

## API changes
- `/api/part96/status`
- `/api/part96/config`
- `/api/part96/features`
- `/api/part96/roles`
- `/api/part96/access-check`
- `/api/part96/classroom-session`
- `/api/part96/chat/policy`
- `/api/part96/chat/messages-preview`
- `/api/part96/chat/send-preview`
- `/api/part96/polls/list`
- `/api/part96/poll/create-preview`
- `/api/part96/poll/vote-preview`
- `/api/part96/hand-raise/queue`
- `/api/part96/hand-raise/raise-preview`
- `/api/part96/hand-raise/lower-preview`
- `/api/part96/moderation/action-preview`
- `/api/part96/vani/greeting`
- `/api/part96/vani/command`
- `/api/part96/audit-log`
- `/api/part96/activity`
- `/api/part96/checklist`
- `/api/part96/export`
- `/api/part96/demo`

## Role permissions
Teacher can moderate chat, create polls and manage hand raise queue for assigned batches. Student can chat, vote and raise hand in own scheduled class. Parent is view-only. Owner/branch manager can monitor. Accountant is blocked. Super Admin has platform support only.

## Security considerations
- No `.env`.
- No secrets/API keys.
- No auto-delete or auto-mute.
- Teacher moderation first.
- Parent view-only.
- Chat export/delete requires owner verification.
- Production socket persistence pending.
- Recording still pending Part 97.
- 3.0 owner-only subscription rule preserved.

## VANI integration
Example commands:
- VANI, live chat status dikhao
- VANI, poll create preview banao
- VANI, student vote preview dikhao
- VANI, hand raise queue dikhao
- VANI, chat moderation policy batao

## Testing steps
1. Deploy to Render.
2. Open `/api/part96/status`.
3. Open `/live-chat-polls-hand-raise`.
4. Click Start VANI.
5. Ask the sample classroom interaction command.
6. Test teacher poll preview.
7. Test student hand raise preview.
8. Test parent view-only and accountant blocked mode.

## Expected test results
- Status returns success true.
- Page opens.
- Chat preview appears.
- Poll preview appears.
- Vote preview appears.
- Hand raise queue appears.
- Teacher moderation policy appears.
- Final realtime socket persistence is not executed.

## Known limitations
- Socket-ready foundation only.
- Production realtime WebSocket persistence pending.
- Multi-user live sync pending production connection.
- Recording and automatic attendance pending Part 97.
- AI class notes pending Part 98.

## Pending work
- Part 97 — Recording and Automatic Attendance
- Real WebSocket persistence
- Live participant sync
- Chat/poll/hand raise database models

## Setup and environment variables
No new environment variables required.

## Preservation
All previous working features from Part 1–95 are preserved.
