# Part 71 Testing Checklist — AI Admission Copilot

## Backend
- [ ] `node --check backend/src/server.js` passes.
- [ ] `/api/part71/status` returns success true.
- [ ] `/api/part71/features` returns five feature cards.
- [ ] `/api/part71/roles` returns owner, branch manager, counsellor, teacher, accountant, student, parent and NAXORA super admin roles.
- [ ] `/api/part71/demo` returns reply draft, priority, follow-up, courses, conversation support and VANI preview.
- [ ] `/api/part71/activity` logs generated actions.

## Frontend
- [ ] `/ai-admission-copilot` opens.
- [ ] Reply Draft button works.
- [ ] Lead Priority button works.
- [ ] Follow-Up Plan button works.
- [ ] Recommend Course button works.
- [ ] Conversation Support button works.
- [ ] Run VANI button works.
- [ ] `/ai-hub` links Admission Copilot.

## Security
- [ ] No `.env` in ZIP.
- [ ] No API keys or passwords in code.
- [ ] Draft-only mode active.
- [ ] Sensitive actions require owner verification.
- [ ] Role permission blocks invalid roles.
- [ ] VANI does not speak private financial/personal data loudly.

## VANI
- [ ] VANI accepts Hindi/Hinglish command text.
- [ ] VANI asks for missing details.
- [ ] VANI returns preview.
- [ ] VANI requires confirmation before execution.
- [ ] VANI logs the action.
