# Part 107 — Automated Marketing System

## Part number and exact name
Part 107 — Automated Marketing System

## Features added
- Automated Marketing System page.
- Campaign planner.
- Audience segmentation.
- WhatsApp/SMS/email/ad copy draft engine.
- Follow-up sequence preview.
- Budget and ROI preview.
- Consent and DND policy.
- Approval workflow.
- Marketing action plan draft.
- Role-scoped marketing summaries.
- VANI automated marketing commands.
- Soft calm VANI voice preserved.

## Why each feature was added
Institutes need a system to plan campaigns, create drafts, segment leads and estimate ROI without unsafe bulk sending.

## Problem solved
Marketing was manual and scattered. Part 107 creates a consent-first planning and approval foundation.

## Benefits
Owner: can plan, review and approve campaigns.
Institute: can grow admissions with structured campaigns.
Branch Manager: can draft branch campaigns.
Counsellor: can create enquiry/demo follow-up drafts.
Student/Parent: can view notification preferences only.

## Frontend/UI changes
- `frontend/automated-marketing-system.html`
- `frontend/automated-marketing-system.css`
- `frontend/automated-marketing-system.js`
- `frontend/vani-voice-starter.js` soft calm voice preserved

## Backend changes
- `backend/src/server.js` updated with Part 107 APIs and routes.

## Database changes
No mandatory migration.
Future optional collections:
- `marketingcampaigns`
- `marketingsegments`
- `marketingtemplates`
- `marketingschedules`
- `marketingapprovals`
- `marketingconsents`
- `marketingauditlogs`

## API changes
- `/api/part107/status`
- `/api/part107/config`
- `/api/part107/features`
- `/api/part107/roles`
- `/api/part107/access-check`
- `/api/part107/campaigns`
- `/api/part107/audience-segments`
- `/api/part107/campaign-planner`
- `/api/part107/content-draft`
- `/api/part107/schedule-preview`
- `/api/part107/budget-roi-preview`
- `/api/part107/consent-policy`
- `/api/part107/approval-preview`
- `/api/part107/action-plan`
- `/api/part107/role-scoped-summary`
- `/api/part107/privacy-policy`
- `/api/part107/vani/greeting`
- `/api/part107/vani/command`
- `/api/part107/audit-log`
- `/api/part107/activity`
- `/api/part107/checklist`
- `/api/part107/export`
- `/api/part107/demo`

## Role permissions
Owner can plan and approve campaigns. Branch manager can draft assigned branch campaigns. Counsellor can draft enquiry/demo follow-up campaigns. Accountant can view budget-safe summary. Teacher can draft academic event content only. Student/parent can view notification preferences only. Super Admin has platform support only.

## Security considerations
- No `.env`.
- No secrets/API keys.
- No auto WhatsApp/SMS/email send.
- Consent required.
- DND/suppression respected.
- Opt-out required.
- Provider API keys must be Render env only.
- Bulk campaign send requires owner verification.
- Budget apply requires owner verification.
- Marketing export/template publish requires owner verification.
- 3.0 owner-only subscription rule preserved.

## VANI integration
Example commands:
- VANI, demo class campaign plan banao
- VANI, hot leads audience segment dikhao
- VANI, WhatsApp marketing draft banao
- VANI, budget ROI preview dikhao
- VANI, consent policy batao
- VANI, marketing action plan banao

## Testing steps
1. Deploy to Render.
2. Open `/api/part107/status`.
3. Open `/automated-marketing-system`.
4. Click Start VANI.
5. Ask sample campaign/draft command.
6. Test owner, branch manager, counsellor, accountant, teacher, student and parent roles.

## Expected test results
- Status returns success true.
- Page opens.
- Campaign planner appears.
- Audience segments appear.
- Content drafts appear.
- Schedule preview appears with auto-send off.
- Budget/ROI appears for allowed roles.
- Consent/DND policy blocks unsafe sending.
- VANI gives safe marketing summary.

## Known limitations
- Preview/demo marketing data only.
- Real WhatsApp/SMS/email provider APIs not connected yet.
- Real ad platform APIs not connected yet.
- Production consent database pending.
- Real campaign send workflow pending.

## Pending work
- Part 108 — Complete Institute Marketplace
- Provider integrations
- Production campaign persistence
- Real approval/send workflow
- Marketing ROI tracking

## Setup and environment variables
No new required env variables.
Future optional env:
- `WHATSAPP_PROVIDER_API_KEY`
- `SMS_PROVIDER_API_KEY`
- `EMAIL_PROVIDER_API_KEY`

Do not paste provider secrets in chat.

## Preservation
All previous working features from Part 1–106 are preserved.
