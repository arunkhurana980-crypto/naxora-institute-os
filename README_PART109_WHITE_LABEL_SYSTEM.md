# Part 109 — White-Label System

## Part number and exact name
Part 109 — White-Label System

## Features added
- White-Label System page.
- Brand profile preview.
- Theme manager preview.
- Custom domain setup checklist.
- Portal branding preview.
- Branded communication preview.
- Mobile app branding preview.
- Marketplace branding preview.
- White-label approval workflow.
- Role-scoped brand previews.
- VANI White-Label Assistant.
- Soft calm VANI voice preserved.

## Why each feature was added
Institutes need their own brand identity, domain and portal appearance while still using NAXORA OS.

## Problem solved
NAXORA OS can now support owner-controlled white-label branding without unsafe domain, DNS, sender or public publishing changes.

## Benefits
Owner: can prepare institute branding, theme, domain and mobile app preview.
Institute: gets branded portal and marketplace identity.
Teacher: sees branded teacher portal preview.
Student: sees branded student portal preview.
Parent: sees branded parent portal preview.

## Frontend/UI changes
- `frontend/white-label-system.html`
- `frontend/white-label-system.css`
- `frontend/white-label-system.js`
- `frontend/vani-voice-starter.js` soft calm voice preserved

## Backend changes
- `backend/src/server.js` updated with Part 109 APIs and routes.

## Database changes
No mandatory migration.
Future optional collections:
- `whitelabelbrands`
- `whitelabelthemes`
- `customdomains`
- `senderdomains`
- `mobileappbranding`
- `whitelabelapprovals`
- `whitelabelauditlogs`

## API changes
- `/api/part109/status`
- `/api/part109/config`
- `/api/part109/features`
- `/api/part109/roles`
- `/api/part109/access-check`
- `/api/part109/brand-profile`
- `/api/part109/theme-preview`
- `/api/part109/custom-domain-preview`
- `/api/part109/portal-branding-preview`
- `/api/part109/communication-branding-preview`
- `/api/part109/mobile-app-branding-preview`
- `/api/part109/marketplace-branding-preview`
- `/api/part109/approval-workflow`
- `/api/part109/role-scoped-summary`
- `/api/part109/security-policy`
- `/api/part109/privacy-policy`
- `/api/part109/vani/greeting`
- `/api/part109/vani/command`
- `/api/part109/audit-log`
- `/api/part109/activity`
- `/api/part109/checklist`
- `/api/part109/export`
- `/api/part109/demo`

## Role permissions
Owner can manage white-label brand, theme, domain preview and approval. Branch manager can view assigned branch brand preview. Teacher sees teacher portal brand preview. Counsellor sees communication brand preview. Accountant sees invoice/receipt brand preview. Student/parent see own portal brand preview only. Super Admin has platform support only.

## Security considerations
- No `.env`.
- No secrets/API keys.
- DNS changes do not happen automatically.
- SSL issue request does not happen automatically.
- Sender domain verification requires owner proof.
- Public brand publish requires owner verification.
- No trademark/impersonation auto-approval.
- Domain verification tokens are not spoken loudly.
- Provider keys must be Render env only.
- White-label export and billing changes require owner verification.
- 3.0 owner-only subscription rule preserved.

## VANI integration
Example commands:
- VANI, white-label brand profile dikhao
- VANI, theme preview banao
- VANI, custom domain checklist banao
- VANI, portal branding preview dikhao
- VANI, branded email sender preview banao
- VANI, white-label approval workflow batao

## Testing steps
1. Deploy to Render.
2. Open `/api/part109/status`.
3. Open `/white-label-system`.
4. Click Start VANI.
5. Ask sample theme/domain command.
6. Test owner, branch manager, teacher, counsellor, accountant, student and parent roles.

## Expected test results
- Status returns success true.
- Page opens.
- Brand profile appears.
- Theme preview appears.
- Custom domain checklist appears with auto-DNS off.
- Portal branding appears.
- Communication branding appears with no auto-send.
- Approval workflow blocks public publish.
- VANI gives safe white-label summary.

## Known limitations
- Preview/demo white-label data only.
- Real DNS provider integration pending.
- Real SSL/custom domain activation pending.
- Real sender domain verification pending.
- Real mobile app store publishing pending.

## Pending work
- Part 110 — NAXORA OS 2.0 Production Launch
- Production white-label persistence
- Real custom domain verification
- Real sender/domain provider integration
- Owner-verified public publish workflow

## Setup and environment variables
No new required env variables.
Future optional env:
- `CUSTOM_DOMAIN_PROVIDER_KEY`
- `EMAIL_SENDER_PROVIDER_KEY`
- `WHITELABEL_ASSET_STORAGE_KEY`

Do not paste provider secrets in chat.

## Preservation
All previous working features from Part 1–108 are preserved.
