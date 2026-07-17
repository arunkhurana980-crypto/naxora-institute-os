# Part 122 Testing Guide

## Teacher
1. Login from `/login` as Teacher.
2. Open `/app`.
3. Select Teacher Workspace.
4. Confirm strict Teacher-linked mode.
5. Review classes, students, assignments, attendance and sessions.
6. `Not linked` is acceptable when safe teacher field mapping does not exist.
7. Open Attendance, Reports and Live Classes.
8. Open AI Class Notes when entitlement permits.

## Owner
1. Login as Owner.
2. Open Teacher Workspace.
3. Confirm Owner supervisor mode.
4. Metrics may use institute-scoped aggregates.

## Negative roles
Student, Parent, Accountant, Counsellor and Staff should receive:
`403 TEACHER_OR_OWNER_ONLY`.

## VANI
- `VANI, teacher summary dikhao`
- `VANI, kya pending hai?`
- `VANI, attendance kholo`
- `VANI, class notes kholo`
- `VANI, live class kholo`

Denied module must not open.
