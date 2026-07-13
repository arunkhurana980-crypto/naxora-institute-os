# NAXORA Institute OS — Part 58 Enquiry and Follow-Up CRM

## Scope
Part 58 adds the enquiry and follow-up CRM foundation for NAXORA OS v1.0.

## Roadmap Match
- New lead
- Call notes
- Follow-up date
- Lead status
- Reminder
- Admission conversion

## Frontend Routes
- `/enquiry-followup-crm`
- `/enquiry-crm`
- `/followup-crm`
- `/admission-crm`

## API Routes
- `GET /api/part58/status`
- `GET /api/part58/config`
- `GET /api/part58/leads`
- `POST /api/part58/leads`
- `GET /api/part58/leads/:leadId`
- `PATCH /api/part58/leads/:leadId/status`
- `POST /api/part58/leads/:leadId/call-notes`
- `PATCH /api/part58/leads/:leadId/follow-up`
- `POST /api/part58/leads/:leadId/convert`
- `GET /api/part58/reminders`
- `GET /api/part58/analytics`
- `GET /api/part58/checklist`
- `GET /api/part58/export`

## Safety
No `.env`, no secrets, no node_modules, no auto-push script. Part 58 does not send real WhatsApp/SMS/email automatically. Communication provider integration is planned for Part 65.
