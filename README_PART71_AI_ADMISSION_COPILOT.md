# NAXORA Institute OS — Part 71 AI Admission Copilot

## Part number and exact name
Part 71 — AI Admission Copilot

## Version roadmap position
- Part 53–78 = NAXORA Institute OS 1.0 completion
- Part 78 = 1.0 Production Launch + sales start
- Part 79–110 = NAXORA Institute OS 2.0 development
- Part 71 is inside 1.0 and prepares admission automation without distracting from production launch.

## Features added
1. Enquiry Reply Drafts
2. Follow-Up Suggestions
3. Course Recommendations
4. Lead Priority Scoring
5. Admission Conversation Support
6. VANI Admission Copilot command endpoint
7. Role-aware, permission-aware copilot safety foundation
8. Audit/activity log for copilot and VANI actions
9. AI Hub placement update for Part 71

## Why each feature was added
### Enquiry Reply Drafts
Institutes receive many enquiries from public profile, nearby search, comparison and callback forms. Reply drafts reduce typing and help counsellors respond politely and quickly.

### Follow-Up Suggestions
Many admissions do not convert on the first call. Follow-up suggestions tell counsellors when and how to follow up.

### Course Recommendations
Parents and students are often unsure which course or batch fits their class/goal. The copilot gives safe, non-final recommendations for counselling.

### Lead Priority Scoring
Hot leads should be handled first. Priority scoring separates hot, warm and cold leads based on available details and intent signals.

### Admission Conversation Support
Counsellors need help answering fee, demo, result, batch and timing questions. The copilot provides respectful Hinglish guidance.

### VANI Integration
VANI must work inside AI Hub and across authorised modules. Part 71 adds VANI admission commands with missing-detail questions, permission checks, preview-first output and audit logging.

## Problem solved
Before Part 71, discovery/enquiry/CRM existed, but counsellors still had to manually write replies, decide lead priority and think of follow-up steps. Part 71 starts the AI-assisted admission workflow.

## Benefits
### Owner benefits
- Hot leads get faster attention.
- Admission pipeline becomes more organized.
- Counsellor quality becomes more consistent.
- Future sales conversion analytics foundation improves.

### Institute benefits
- Faster enquiry response.
- Better follow-up discipline.
- Professional communication drafts.
- Less manual admission work.

### Teacher benefits
- Demo-ready leads are clearer.
- Course/batch context can be escalated cleanly.
- Less random interruption from incomplete admission details.

### Student benefits
- Student gets faster guidance.
- Course suggestions are clearer.
- Demo/counselling next step is easier.

### Parent benefits
- Parent receives polite, clear reply drafts.
- Follow-up is timely.
- Missing details are asked respectfully.

## Frontend/UI changes
New files:
- `frontend/ai-admission-copilot.html`
- `frontend/ai-admission-copilot.css`
- `frontend/ai-admission-copilot.js`

Updated:
- `frontend/ai-hub.html` now links active Admission Copilot.

New routes:
- `/ai-admission-copilot`
- `/admission-copilot`
- `/admission-ai`
- `/ai-counsellor`
- `/copilot-admission`

## Backend changes
Updated:
- `backend/src/server.js`

Added Part 71 backend section:
- Configuration
- Features registry
- Role permission map
- Lead normalization
- Reply draft generator
- Follow-up suggestion generator
- Course recommendation generator
- Lead priority scorer
- Conversation support helper
- VANI admission command helper
- Activity/audit log helper

## Database changes
No new Mongoose schema file was required in Part 71.

MongoDB connected mode uses collection:
- `part71admissioncopilotlogs`

Mock/fallback mode uses in-memory arrays:
- `globalThis.NAXORA_PART71_ACTIVITY`
- `globalThis.NAXORA_PART71_DRAFTS`

No existing production collection is deleted or renamed.

## API changes
New APIs:
- `GET /api/part71/status`
- `GET /api/part71/config`
- `GET /api/part71/features`
- `GET /api/part71/roles`
- `GET /api/part71/lead-context`
- `POST /api/part71/reply-draft`
- `POST /api/part71/followup-suggestions`
- `POST /api/part71/course-recommendations`
- `POST /api/part71/lead-priority`
- `POST /api/part71/conversation-support`
- `POST /api/part71/vani/command`
- `GET /api/part71/activity`
- `GET /api/part71/checklist`
- `GET /api/part71/export`
- `GET /api/part71/demo`

## Role permissions
- Owner: full institute and authorised branch access, sensitive approval.
- Branch Manager: assigned branch leads and branch analytics.
- Receptionist/Counsellor: reply drafts, follow-up suggestions, course recommendations and conversation support for assigned leads.
- Teacher: demo/course context view only for assigned batches.
- Accountant: limited fee context; sensitive financial details require verification.
- Student: own admission guidance only.
- Parent: linked child admission guidance only.
- NAXORA Super Admin: logged technical support, not unrestricted daily access to institute-private data.

## Security considerations
- Part 71 is draft-first and confirmation-first.
- It does not send WhatsApp/SMS/email directly.
- It does not execute discounts, refunds, deletion, exports or subscription changes.
- Sensitive actions require owner verification.
- Private financial/personal data should be displayed privately on screen, not spoken loudly in public areas.
- No secrets, API keys, passwords or `.env` files are included.
- Role checks are included in endpoints.
- Activity log records generated copilot/VANI actions.

## VANI integration
VANI commands added:
- “VANI, is enquiry ke liye reply draft banao.”
- “VANI, lead priority batao.”
- “VANI, is student ke liye course recommend karo.”
- “VANI, follow-up plan banao.”
- “VANI, parent fee aur demo class pooch raha hai, answer suggest karo.”

VANI behavior:
- Hindi/English/Hinglish text/voice transcript accepted.
- Missing details politely asked.
- Ambiguous/missing fields are not guessed.
- Preview is returned before any execution.
- Role permissions are checked.
- Sensitive actions require owner verification.
- Every VANI admission command is logged.

## Testing steps
1. Copy Part 71 files into the live project.
2. Run:
   ```bash
   cd backend
   node --check src/server.js
   ```
3. Commit and push:
   ```bash
   git add .
   git commit -m "Add Part 71 AI Admission Copilot"
   git push
   ```
4. Render deploy:
   `Manual Deploy → Clear build cache & deploy`
5. Open:
   - `/api/part71/status`
   - `/ai-admission-copilot`
   - `/api/part71/demo`
   - `/api/part71/features`
   - `/api/part71/activity`

## Expected test results
- `/api/part71/status` returns `success: true` and `status: active`.
- `/ai-admission-copilot` opens the UI.
- Reply draft button returns WhatsApp/SMS/email drafts.
- Priority button returns hot/warm/cold with score and reasons.
- Course button returns course recommendations.
- VANI command returns preview and missing-field/safety message.
- Activity API shows logged actions.

## Known limitations
- No external paid AI model is called in Part 71.
- Real WhatsApp/SMS/email sending is not executed.
- Final admission conversion is not executed directly.
- CRM collection lookup is demo/query-based; real lead lookup can be wired after collection audit.
- Voice-to-text depends on browser/device transcript in future integration; Part 71 endpoint accepts text transcript.

## Pending work
- Part 72: AI Fee and Attendance Assistant.
- Part 73: AI Batch Performance Analyzer.
- Part 74: AI Parent Communication and Weekly Summary.
- Part 75: Student AI Tools including VANI Revision Assistant.
- VANI 2.0 broad module-wide action engine in Parts 84–88.

## Setup and environment-variable instructions
No new environment variable is required for Part 71.
Keep existing Render variables:
- `NODE_ENV=production`
- `NODE_VERSION=20.18.1`
- `FRONTEND_URL=https://naxora-institute-os.onrender.com`
- `MONGODB_URI=<your MongoDB URI>`
- `JWT_SECRET=<your JWT secret>`
- `JWT_EXPIRES_IN=7d`
- `INTERNAL_TOOLS_ENABLED=false`
- `DEMO_MODE_ENABLED=false`
- `RAZORPAY_COMPANY_NAME=NAXORA Institute OS`

Do not commit `.env`, passwords or API keys.

## Preservation of previous working features
Part 71 only adds new routes/files and updates AI Hub placement. Previous Part 1–70 features are preserved. No previous API route was removed.
