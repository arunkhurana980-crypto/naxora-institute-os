# Part 133 Testing Guide

1. Create Notice draft.
2. Update and publish it to a Branch/Class.
3. Login as recipient and open `/api/part133/inbox`.
4. Mark an item read and archive it.
5. Schedule an in-app Notification and test reschedule/cancel.
6. Enable external consent for a test account.
7. Configure a safe HTTPS provider webhook.
8. Verify `provider_accepted`, `failed` and skipped states.
9. Test wrong Branch, wrong Teacher Class, unassigned Counsellor Lead and Do-Not-Contact.
10. Confirm secrets/OTP in message content are blocked.
