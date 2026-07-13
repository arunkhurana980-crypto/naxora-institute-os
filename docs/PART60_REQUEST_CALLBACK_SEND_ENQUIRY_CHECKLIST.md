# Part 60 Request Callback / Send Enquiry Checklist

## Page checks
- [ ] `/request-callback` opens.
- [ ] `/send-enquiry` opens.
- [ ] Mobile layout readable hai.
- [ ] NAXORA branding visible hai.

## Form checks
- [ ] Student name required hai.
- [ ] Phone validation working hai.
- [ ] Course interest required hai.
- [ ] Consent required hai.
- [ ] Submit ke baad success message aata hai.

## API checks
- [ ] `/api/part60/status` success true.
- [ ] `POST /api/part60/callback` request save karta hai.
- [ ] `/api/part60/enquiries` list dikhata hai.
- [ ] `/api/part60/analytics` counts dikhata hai.
- [ ] Status update API works.

## MongoDB checks
- [ ] Production me dbMode mongodb aa raha hai.
- [ ] Enquiry `part60callbackenquiries` collection me save hoti hai.
- [ ] Refresh ke baad enquiry list me rehti hai.

## Safety checks
- [ ] .env included nahi hai.
- [ ] Secrets included nahi hain.
- [ ] Real WhatsApp/SMS/email auto-send nahi ho raha.
- [ ] Consent ke bina request save nahi hoti.

## Business checks
- [ ] Public profile se enquiry flow logical lagta hai.
- [ ] Course interest + preferred timing counsellor ke kaam ka data deta hai.
- [ ] Follow-up CRM handoff clear hai.
