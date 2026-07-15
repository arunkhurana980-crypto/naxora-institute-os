# Part 86 — VANI Fee and Attendance Actions

## Part number and exact name
Part 86 — VANI Fee and Attendance Actions

## Features added
- VANI fee status lookup.
- VANI fee reminder draft.
- VANI payment follow-up draft.
- VANI receipt preview.
- VANI attendance draft.
- VANI low-attendance alerts.
- Safe action preview system.
- Confirmation and owner-verification checks.
- Private-screen-first finance rule.
- VANI Listen/Reply UI for fee and attendance commands.

## Why each feature was added
Fee and attendance are daily high-frequency workflows in coaching institutes. VANI needs to help with them, but safely: no accidental payment action, refund, discount, or final attendance save.

## Problem solved
Owners, accountants and teachers can prepare fee/attendance actions faster while keeping preview, confirmation, permission and audit safety.

## Benefits
Owner: can review finance/attendance priorities quickly.
Institute: fee follow-ups and attendance support become more organized.
Teacher: attendance draft and low attendance support become faster.
Student: attendance/fee support can be handled earlier.
Parent: polite fee and attendance communication improves.

## Frontend/UI changes
- `frontend/vani-fee-attendance-actions.html`
- `frontend/vani-fee-attendance-actions.css`
- `frontend/vani-fee-attendance-actions.js`
- `frontend/vani-voice-starter.js` preserved/enhanced for listen/reply.

## Backend changes
- `backend/src/server.js` updated with Part 86 routes and APIs.

## Database changes
No required migration.
Future optional collections:
- `vani_fee_attendance_action_logs`
- `fee_reminder_drafts`
- `attendance_drafts`
- `payment_followup_drafts`

## API changes
- `/api/part86/status`
- `/api/part86/config`
- `/api/part86/features`
- `/api/part86/roles`
- `/api/part86/actions`
- `/api/part86/permissions`
- `/api/part86/access-check`
- `/api/part86/command/parse`
- `/api/part86/action/preview`
- `/api/part86/action/execute`
- `/api/part86/fee/status`
- `/api/part86/fee/reminder-draft`
- `/api/part86/payment/followup-draft`
- `/api/part86/payment/receipt-preview`
- `/api/part86/attendance/draft`
- `/api/part86/attendance/low-alerts`
- `/api/part86/missing-details`
- `/api/part86/vani/greeting`
- `/api/part86/vani/command`
- `/api/part86/audit-log`
- `/api/part86/activity`
- `/api/part86/checklist`
- `/api/part86/export`
- `/api/part86/demo`

## Role permissions
Owner has full authorized institute/branch scope with owner verification for sensitive actions.
Accountant can preview/draft fee and payment workflows.
Teacher can preview/draft attendance for assigned batches.
Branch manager has assigned-branch scope.
Receptionist/counsellor can draft communication where permitted.
Student and parent get only own/linked-child safe summaries.
Super admin has platform support only.

## Security considerations
- No `.env`.
- No secrets/API keys.
- No real money movement.
- No final attendance save.
- No auto-send fee reminders.
- Refund/discount/delete/export/subscription changes require owner verification.
- Fee/payment data is private-screen-first.
- 3.0 owner-only subscription rule preserved.

## VANI integration
Example commands:
- VANI, Aman ki fee status dikhao.
- VANI, Aman ko fee reminder draft banao amount 2500.
- VANI, Class 10 Maths attendance draft banao.
- VANI, low attendance students dikhao.
- VANI, receipt preview banao.
- VANI, fee discount request banao.

## Testing steps
1. Deploy to Render.
2. Open `/api/part86/status`.
3. Open `/vani-fee-attendance-actions`.
4. Test fee reminder draft.
5. Test attendance draft.
6. Test low attendance alert.
7. Test discount/refund owner verification blocking.

## Expected test results
- Status returns success true.
- Page opens.
- Fee reminders are draft only.
- Attendance draft is not final saved.
- Discount/refund require owner verification.
- VANI speaks safe summary only.

## Known limitations
- Production DB write is disabled/simulated in this part.
- Real payment gateway/refund action is not included.
- Final attendance save is not connected to production schema yet.
- Browser mic support depends on browser permission/support.

## Pending work
- Part 87 — VANI Voice Reports
- Part 88 — Hindi/Hinglish VANI Conversation

## Setup and environment variables
No new environment variables required.

## Preservation
All previous working features from Part 1–85 are preserved.
