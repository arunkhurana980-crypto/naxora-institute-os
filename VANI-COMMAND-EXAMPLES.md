# Part 133 VANI Command Examples

```text
notice create title="Holiday Notice" body="Institute will remain closed tomorrow." targetType=branch_role branchId=BRANCH_ID targetRole=student channels=in_app
```

```text
notice publish noticeId=NOTICE_ID
```

```text
message send subject="Assignment update" body="Please check assignment." targetType=class_role classId=CLASS_ID targetRole=student channels=in_app
```

```text
notification schedule subject="Class reminder" body="Class starts at 8 AM." targetType=class_role classId=CLASS_ID targetRole=student channels=in_app scheduledAt=2026-08-10T07:00:00+05:30
```

```text
communication preference update externalConsent=true blockedChannels=sms
```

```text
communication delivery summary generate branchId=BRANCH_ID fromDate=2026-08-01 toDate=2026-08-31
```

Never include passwords, OTPs, CVV, UPI PIN, Aadhaar, PAN, bank details or API secrets.
