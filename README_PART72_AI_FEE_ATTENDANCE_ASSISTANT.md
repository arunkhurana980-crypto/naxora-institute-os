# NAXORA Institute OS — Part 72 AI Fee and Attendance Assistant

## Part number and exact name
Part 72 — AI Fee and Attendance Assistant

## Features added
- Pending-fee summary
- AI fee reminder drafts
- Frequently absent students
- Attendance support alerts
- VANI fee and attendance commands
- Role permission matrix for owner, branch manager, accountant, teacher, receptionist, student, parent and NAXORA super admin
- Activity/audit log
- Frontend page `/ai-fee-attendance-assistant`
- API routes under `/api/part72/*`

## Why each feature was added
Pending fees and poor attendance are two major day-to-day problems for coaching institutes. Part 72 gives owner/accountant/counsellor a safe AI assistant to identify dues, draft polite reminders and detect attendance risk without directly sending messages or changing financial records.

## Problem solved
- Pending fee calculation was manual.
- Fee reminders were inconsistent.
- Frequently absent students were noticed late.
- Teachers/counsellors had no quick support alert view.
- VANI needed to work inside fee and attendance workflows safely.

## Benefits
### Owner
Fast revenue risk overview and retention alerts.

### Institute
Better collection discipline, fewer missed follow-ups and stronger parent trust.

### Teacher
Assigned attendance-risk students can be supported earlier.

### Student
Missed-class support can be planned instead of only punishment/warning.

### Parent
Fee/attendance communication becomes clearer and more respectful.

## Frontend/UI changes
- Added `frontend/ai-fee-attendance-assistant.html`
- Added `frontend/ai-fee-attendance-assistant.css`
- Added `frontend/ai-fee-attendance-assistant.js`
- Updated AI Hub to show Part 72 assistant as active.

## Backend changes
- Added Part 72 config, role permissions, demo data fallback, fee summary engine, attendance alert engine, reminder draft generator, VANI command handler and audit logging in `backend/src/server.js`.
- Added clean routes for `/ai-fee-attendance-assistant`, `/fee-attendance-ai`, `/ai-fee-assistant`, `/ai-attendance-assistant`.

## Database changes
No required migration. Optional MongoDB collections used safely when available:
- `part72feeattendanceassistants` for future assistant rows
- `part72feeattendanceassistantlogs` for audit logs
- Existing `students` collection can be read as fallback if present

## API changes
- `GET /api/part72/status`
- `GET /api/part72/config`
- `GET /api/part72/features`
- `GET /api/part72/roles`
- `GET /api/part72/fee-summary`
- `POST /api/part72/reminder-draft`
- `GET /api/part72/frequently-absent`
- `GET /api/part72/attendance-alerts`
- `GET /api/part72/support-alerts`
- `POST /api/part72/vani/command`
- `GET /api/part72/activity`
- `GET /api/part72/checklist`
- `GET /api/part72/export`
- `GET /api/part72/demo`

## Role permissions
- Owner: full fee/attendance assistant access for institute.
- Branch Manager: assigned branch fee/attendance view.
- Accountant: fees, payments and reminder drafts.
- Teacher: attendance/support alerts for assigned batches.
- Receptionist/Counsellor: reminder drafts and follow-up support.
- Student: own fee/attendance status only.
- Parent: linked child fee/attendance status only.
- NAXORA Super Admin: logged technical support, not unrestricted daily access to institute-private data.

## Security considerations
- No secrets in code.
- No `.env` included.
- No direct WhatsApp/SMS/email send.
- No direct payment changes.
- Refund, discount, deletion, export and subscription changes require owner verification.
- Sensitive financial/personal data should be shown privately on screen, not loudly through speaker.
- All VANI preview/actions are audit logged.

## VANI integration
VANI can understand Hindi, English and Hinglish commands for fee and attendance summaries. It asks for missing student/branch/batch details when required, previews results first and does not execute sensitive actions directly.

Example commands:
- VANI, pending fees ka summary dikhao.
- VANI, absent students list dikhao.
- VANI, Aman ke parent ke liye fee reminder draft banao.
- VANI, low attendance support alerts dikhao.

## Testing steps
1. Open `/api/part72/status`.
2. Open `/ai-fee-attendance-assistant`.
3. Open `/api/part72/fee-summary?role=owner`.
4. Open `/api/part72/frequently-absent?role=owner`.
5. Test VANI POST `/api/part72/vani/command`.
6. Check `/api/part72/activity`.

## Expected test results
- Status returns `success: true`.
- Frontend page loads.
- Fee summary returns pending student list or demo fallback.
- Attendance alerts return low-attendance students or demo fallback.
- VANI returns preview and does not execute send/refund/delete/export.

## Known limitations
- Real AI model call is not connected yet.
- Real WhatsApp/SMS/email sending is not enabled.
- Real fee schema mapping may need route-by-route audit.
- Speaker hardware support is planned for NAXORA 2.0; laptop/mobile mic/speaker remains default.

## Pending work
- Part 73: AI Batch Performance Analyzer.
- Hard connection with final fee/attendance production schema after audit.
- Owner verification UI for sensitive actions.

## Setup and environment variables
No new environment variable is required. Keep existing Render variables unchanged:
- NODE_ENV
- NODE_VERSION
- FRONTEND_URL
- MONGODB_URI
- JWT_SECRET
- JWT_EXPIRES_IN
- INTERNAL_TOOLS_ENABLED
- DEMO_MODE_ENABLED
- RAZORPAY_COMPANY_NAME

## Preservation of previous working features
Part 72 preserves all previous Part 1–71 routes and files, including Part 71 AI Admission Copilot.
