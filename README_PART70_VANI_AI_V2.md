# Part 70 — VANI AI V2: Voice Form Filling

Part 70 adds Hindi/Hinglish voice/text form filling for VANI.

## Scope

- Voice/text transcript input
- Student enrolment draft
- Admission enquiry draft
- Fee record draft
- Attendance draft
- Live class draft
- Confirmation before save
- Voice activity history

## Safety

VANI does not directly edit/delete operational production records. It creates a safe VANI draft/action record after explicit confirmation. Route-by-route hard writes should be enabled only after audit and role permission checks.

## Routes

- `/vani-ai-v2`
- `/vani-ai`
- `/voice-form`
- `/api/part70/status`
- `/api/part70/parse`
- `/api/part70/confirm-save`
- `/api/part70/activity`

No `.env`, secrets, API keys or node_modules are included.
