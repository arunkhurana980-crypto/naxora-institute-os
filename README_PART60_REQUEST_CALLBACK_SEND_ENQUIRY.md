# NAXORA Institute OS — Part 60 Request Callback / Send Enquiry

## Goal
Part 60 connects the public institute profile and discovery journey with a real enquiry action.

Roadmap scope:
- Student enquiry form
- Course selection
- Parent contact
- Preferred timing
- Consent
- Institute notification foundation

## Why this part matters
Part 59 made the institute profile visible. Part 60 gives the student/parent a clear action:
**request a callback or send enquiry**.

This starts the student-to-admission flow:
Public Profile → Send Enquiry → Follow-Up CRM → Admission Conversion

## Added pages
- `/request-callback`
- `/send-enquiry`
- `/callback`
- `/institute-enquiry`

## Added APIs
- `GET /api/part60/status`
- `GET /api/part60/config`
- `POST /api/part60/callback`
- `POST /api/part60/enquiry`
- `POST /api/part60/request-callback`
- `GET /api/part60/enquiries`
- `GET /api/part60/enquiries/:requestId`
- `PATCH /api/part60/enquiries/:requestId/status`
- `GET /api/part60/reminders`
- `GET /api/part60/analytics`
- `GET /api/part60/checklist`
- `GET /api/part60/export`
- `GET /api/part60/demo`

## Data saved
- Student name
- Parent/guardian name
- Phone
- Email
- Class/level
- Course interest
- Preferred timing
- City
- Profile ID/slug
- Message
- Consent
- Status
- Priority

## Safety rule
Part 60 does not send real WhatsApp/SMS/email automatically. That belongs to Part 65.
Part 60 only stores the request and prepares CRM/notification handoff safely.

## Test links
- `/api/part60/status`
- `/request-callback`
- `/api/part60/enquiries`
- `/api/part60/analytics`
