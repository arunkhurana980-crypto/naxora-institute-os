# Part 130 Backend API Record

## Public

- `GET /api/part130/status`
- `GET /api/part130/security-policy`
- `GET /api/part130/catalog`
- `GET /api/part130/demo`

## Authenticated

- `POST /api/part130/actions/preview`
- `POST /api/part130/vani/command`
- `POST /api/part130/actions/:actionId/confirm`
- `POST /api/part130/actions/:actionId/cancel`
- `GET /api/part130/actions`
- `GET /api/part130/records`
- `GET /api/part130/student-summary`

## Models

- Part130AcademicAction
- Part130TimetableEntry
- Part130AttendanceRecord
- Part130AcademicAssignment
- Part130AssignmentReview
- Part130Exam
- Part130ExamMark
- Part130ResultPublication
- Part130ProgressNote
- Part130ProgressSnapshot
- Part130AcademicAudit
