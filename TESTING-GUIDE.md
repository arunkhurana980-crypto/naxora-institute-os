# Part 123 Testing Guide

## Student
1. Login from `/login` as Student.
2. Open `/app`.
3. Select Student Workspace.
4. Confirm strict Student-linked mode.
5. Review classes, assignments, attendance, fees and results.
6. `Not linked` is expected when no safe Student-field mapping exists.
7. Open Live Classes.
8. Open AI Class Notes when allowed.

## Owner
1. Login as Owner.
2. Open Student Workspace.
3. Confirm Owner supervisor mode.
4. Metrics may use institute-level aggregates.

## Negative roles
Teacher, Parent, Accountant, Counsellor and Staff should receive:
`403 STUDENT_OR_OWNER_ONLY`.

## Cross-Student safety
Use two Student accounts. Student A must never receive Student B’s records.

## VANI
- `VANI, meri progress dikhao`
- `VANI, kya pending hai?`
- `VANI, live class kholo`
- `VANI, class notes kholo`
- `VANI, Student VANI kholo`
