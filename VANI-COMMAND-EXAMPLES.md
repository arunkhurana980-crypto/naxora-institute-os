# Part 132 VANI Command Examples

```text
lead create branchId=BRANCH_ID studentName="Riya Demo" guardianName="Demo Parent" phone=9876543210 source=walk_in consentToContact=true
```

```text
lead assign counsellor leadId=LEAD_ID counsellorIdentityId=COUNSELLOR_ID
```

```text
lead stage update leadId=LEAD_ID stage=qualified nextFollowUpAt=2026-08-05T10:00:00+05:30
```

```text
followup create leadId=LEAD_ID scheduledAt=2026-08-05T10:00:00+05:30 purpose="Course counselling call"
```

```text
followup complete followUpId=FOLLOWUP_ID outcome="Demo class booked"
```

```text
lead convert admission leadId=LEAD_ID admissionNumber=ADM-2026-101 admissionDate=2026-08-10 courseId=COURSE_ID
```

```text
document checklist update admissionId=ADMISSION_ID itemName="Previous marksheet" itemStatus=received
```

```text
crm pipeline summary generate branchId=BRANCH_ID fromDate=2026-08-01 toDate=2026-08-31
```

Aadhaar, PAN, passport number, password, OTP, banking or payment data command me mat likho.
