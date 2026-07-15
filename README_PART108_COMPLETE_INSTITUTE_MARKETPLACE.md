# Part 108 — Complete Institute Marketplace

## Part number and exact name
Part 108 — Complete Institute Marketplace

## Features added
- Complete Institute Marketplace page.
- Public marketplace search.
- Institute listing manager.
- Course catalog.
- Search/filter/compare.
- Demo and callback lead draft.
- Trust score and reviews preview.
- Marketplace approval workflow.
- Marketplace analytics preview.
- Role-scoped marketplace summaries.
- VANI Marketplace Assistant.
- Soft calm VANI voice preserved.

## Why each feature was added
NAXORA needs a discovery marketplace where students/parents can find institutes and owners can manage public listings safely.

## Problem solved
Public institute discovery, course visibility and lead generation were scattered. Part 108 creates a single public-safe marketplace foundation.

## Benefits
Owner: manage listing, courses, leads and approval.
Institute: get marketplace discovery and qualified leads.
Teacher: draft public-safe course snippets.
Student: search courses and create consent-first enquiry.
Parent: compare institutes and request callback safely.

## Frontend/UI changes
- `frontend/complete-institute-marketplace.html`
- `frontend/complete-institute-marketplace.css`
- `frontend/complete-institute-marketplace.js`
- `frontend/vani-voice-starter.js` soft calm voice preserved

## Backend changes
- `backend/src/server.js` updated with Part 108 APIs and routes.

## Database changes
No mandatory migration.
Future optional collections:
- `marketplacelistings`
- `marketplacecourses`
- `marketplaceleads`
- `marketplacereviews`
- `marketplacetrustscores`
- `marketplaceapprovals`
- `marketplaceauditlogs`

## API changes
- `/api/part108/status`
- `/api/part108/config`
- `/api/part108/features`
- `/api/part108/roles`
- `/api/part108/access-check`
- `/api/part108/search`
- `/api/part108/course-catalog`
- `/api/part108/compare`
- `/api/part108/listing-draft`
- `/api/part108/lead-draft`
- `/api/part108/trust-score`
- `/api/part108/review-moderation-preview`
- `/api/part108/approval-preview`
- `/api/part108/analytics`
- `/api/part108/role-scoped-summary`
- `/api/part108/privacy-policy`
- `/api/part108/vani/greeting`
- `/api/part108/vani/command`
- `/api/part108/audit-log`
- `/api/part108/activity`
- `/api/part108/checklist`
- `/api/part108/export`
- `/api/part108/demo`

## Role permissions
Guest can browse public listings and create consent-first leads. Owner can manage own listing, courses, leads and approval requests. Branch manager can manage assigned branch listing draft. Counsellor can follow up marketplace leads. Teacher can draft public-safe course snippets. Accountant can view fee/conversion safe summary only. Student/parent can browse public listings and own enquiry status only. Super Admin has platform support only.

## Security considerations
- No `.env`.
- No secrets/API keys.
- Public listing uses public-safe data only.
- No auto-publish.
- No auto-admission.
- No auto-payment.
- Consent required for callback/demo leads.
- Private student/parent/CRM data not public.
- Review publish requires moderation and owner verification.
- Listing publish/featured payment/export/public fee change require owner verification.
- 3.0 owner-only subscription rule preserved.

## VANI integration
Example commands:
- VANI, Delhi me Class 10 Maths institutes dhoondo
- VANI, course catalog dikhao
- VANI, institutes compare karo
- VANI, marketplace listing draft banao
- VANI, demo callback lead draft banao
- VANI, marketplace privacy policy batao

## Testing steps
1. Deploy to Render.
2. Open `/api/part108/status`.
3. Open `/complete-institute-marketplace`.
4. Click Start VANI.
5. Ask sample marketplace search/compare command.
6. Test guest, owner, branch manager, counsellor, teacher, accountant, student and parent roles.

## Expected test results
- Status returns success true.
- Page opens.
- Public search appears.
- Course catalog appears.
- Institute comparison appears.
- Listing draft auto-publish off.
- Lead draft consent check works.
- Trust score/review moderation appears.
- Approval workflow blocks public publish.
- VANI gives safe marketplace summary.

## Known limitations
- Preview/demo marketplace data only.
- Production marketplace database persistence pending.
- Real public listing publish workflow pending.
- Real review moderation workflow pending.
- Real marketplace payment/featured placement pending.

## Pending work
- Part 109 — White-Label System
- Production marketplace persistence
- Real review moderation
- Real listing approval
- Real CRM handoff

## Setup and environment variables
No new environment variables required.

## Preservation
All previous working features from Part 1–107 are preserved.
