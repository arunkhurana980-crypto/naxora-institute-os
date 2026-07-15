# Part 92 — Automatic Demo-Class Booking

## Part number and exact name
Part 92 — Automatic Demo-Class Booking

## Features added
- Automatic Demo-Class Booking page.
- Demo slot catalog foundation.
- Demo request parser.
- Missing detail questions.
- Availability matching.
- Automatic slot suggestion.
- Booking preview.
- Confirmation-code flow.
- Foundation-mode booking confirmation.
- Reschedule/cancel preview.
- Reminder draft.
- Soft calm VANI voice upgrade.
- Role-based access checks.
- Audit log foundation.

## Why each feature was added
Admission teams need to convert enquiries into demo classes quickly, but demo booking must be safe and confirmed.

## Problem solved
Demo booking was manual and slow. Part 92 gives preview -> confirm workflow without accidental booking.

## Benefits
Owner: more demo classes and better conversion.
Institute: faster enquiry handling.
Teacher: assigned demo slot clarity.
Student: can request demo preview.
Parent: gets safer demo class information and reminder draft.

## Frontend/UI changes
- `frontend/automatic-demo-class-booking.html`
- `frontend/automatic-demo-class-booking.css`
- `frontend/automatic-demo-class-booking.js`
- `frontend/vani-voice-starter.js` upgraded to soft calm female-style browser voice where available.

## Backend changes
- `backend/src/server.js` updated with Part 92 APIs and routes.

## Database changes
No mandatory migration.
Future optional collections:
- `democlassbookings`
- `demoslotcatalogs`
- `demobookingauditlogs`
- `demoreminderdrafts`

## API changes
- `/api/part92/status`
- `/api/part92/config`
- `/api/part92/features`
- `/api/part92/roles`
- `/api/part92/access-check`
- `/api/part92/demo-slots`
- `/api/part92/booking/parse`
- `/api/part92/booking/availability`
- `/api/part92/booking/preview`
- `/api/part92/booking/confirm`
- `/api/part92/booking/reschedule-preview`
- `/api/part92/booking/cancel-preview`
- `/api/part92/reminder/draft`
- `/api/part92/vani/greeting`
- `/api/part92/vani/command`
- `/api/part92/audit-log`
- `/api/part92/activity`
- `/api/part92/checklist`
- `/api/part92/export`
- `/api/part92/demo`

## Role permissions
Owner, branch manager and receptionist/counsellor can confirm demo booking in foundation mode. Teacher/accountant get preview-only access. Student/parent get safe demo request preview only. Super Admin has platform support only.

## Security considerations
- No `.env`.
- No secrets/API keys.
- Missing details are asked, not guessed.
- Demo booking preview happens before confirmation.
- Confirmation code required.
- Reminder auto-send disabled.
- Reschedule/cancel are preview-only.
- Discount/fee/refund/delete/export require owner verification.
- 3.0 owner-only subscription rule preserved.

## VANI integration
Example commands:
- VANI, Aman Class 10 Maths demo book karo parent phone 9876543210
- VANI, Class 10 Science demo slot batao
- VANI, JEE Physics online demo book karo parent phone 9876543210
- VANI, weekend revision demo slot chahiye
- VANI, demo reminder draft banao

Voice:
- Browser voice now prefers soft calm female-style voices when available.
- Real studio-quality natural voice will require external TTS later.

## Testing steps
1. Deploy to Render.
2. Open `/api/part92/status`.
3. Open `/automatic-demo-class-booking`.
4. Click Start VANI.
5. Ask the sample demo booking command.
6. Confirm booking from the page.
7. Test student/parent safe-only role.
8. Test missing details.

## Expected test results
- Status returns success true.
- Page opens.
- VANI speaks in softer calmer browser voice.
- Demo request parses.
- Available slots show.
- Booking preview shows confirmation code.
- Confirm Demo creates foundation-mode booking.
- Reminder draft appears and is not auto-sent.

## Known limitations
- Production DB persistence pending.
- Real calendar integration pending.
- Real WhatsApp/SMS reminder send pending.
- Browser voice quality depends on available system/browser voices.
- External natural TTS API not connected yet.

## Pending work
- Part 93 — AI Lead Qualification
- Production demo booking DB save
- Real calendar/teacher availability integration
- Real WhatsApp/SMS reminder after confirmation

## Setup and environment variables
No new environment variables required.

## Preservation
All previous working features from Part 1–91 are preserved.
