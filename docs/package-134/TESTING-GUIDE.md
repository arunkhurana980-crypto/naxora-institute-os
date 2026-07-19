# Part 134 Testing

## Positive
1. Owner Executive report
2. Branch Manager assigned Branch report
3. Teacher assigned Class attendance
4. Student own Student 360
5. Parent linked-child Student 360
6. Accountant finance report
7. Counsellor CRM report
8. CSV/JSON/HTML export
9. one-time ticket download
10. second use of same ticket must fail
11. revoke export
12. revoked export ticket must fail

## Negative
- wrong institute
- wrong Branch/Class/Student
- date range above 366 days
- PDF/XLSX command
- export above 2 MB
- non-owner exporting another user's report
