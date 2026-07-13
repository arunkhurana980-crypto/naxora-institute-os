# Part 56 Smart Student Enrolment Checklist

## Route checks

- [ ] `/api/part56/status` returns success true
- [ ] `/api/part56/form-config` returns courses, batches, documents and consent items
- [ ] `/smart-enrolment` opens page
- [ ] `/enrolment` opens same page
- [ ] `/admission` opens same page
- [ ] `/admissions` opens same page

## Form checks

- [ ] Student name required
- [ ] Student phone required
- [ ] Parent/guardian name required
- [ ] Parent/guardian phone required
- [ ] Course required
- [ ] Batch required
- [ ] Consent required
- [ ] Student ID preview works
- [ ] Expected fee auto-fills from selected course

## Database checks

- [ ] Form submit returns success
- [ ] MongoDB connected mode stores record in `smartenrolments`
- [ ] `/api/part56/enrolments` shows saved records
- [ ] Page refresh keeps record visible if MongoDB is connected
- [ ] Duplicate phone + course + batch gives safe response

## Workflow checks

- [ ] Status can move to verified
- [ ] Status can move to admitted
- [ ] Status can move to rejected
- [ ] Document checklist status appears in API response
- [ ] Verification object appears in API response

## Security notes

- [ ] No `.env` copied
- [ ] No MongoDB secret copied
- [ ] No JWT secret copied
- [ ] No real ID/photo file upload added in this part
- [ ] Actual uploads will be added only with secure storage later
