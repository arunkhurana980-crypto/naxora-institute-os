# Demo Data Import Guide

## Open

```text
/final-acceptance
```

## Import

1. Use the default JSON template or upload a `.json` template.
2. Create Import Preview.
3. Review account and record counts.
4. Enter the exact confirmation.
5. Enter one private shared demo password.
6. Enter the private Owner Action Secret.
7. Import Confirmed Demo Data.

## Generated accounts

The importer creates:
- Branch Manager accounts.
- Teacher accounts.
- Student accounts.
- One Parent account per Student.
- Accountant.
- Counsellor.
- Staff.

It does not create or replace the real Owner account.

## Linked records

```text
Institute
→ Branch
→ Teacher
→ Class
→ Student
→ Parent-child scope
→ Enrolment
→ Attendance
→ Fee
→ Assignment
→ Result
→ Notice
```

It also creates Leads and Branch Tasks.

## Password

The password:
- is entered privately,
- is hashed with Part 120-compatible scrypt,
- is never returned by the API,
- is not included in account-map downloads.

Remember the password you enter.
