# Part 125 Testing Guide

## Owner
Create a Branch Task or role-safe message.

## Teacher
Create an Assignment preview. A native Assignment module update remains pending until Part 126 adapter registration.

## Student
Submit an Assignment or create Fee Assistance Request. Student cannot target another Student.

## Parent
Create Attendance Correction or Fee Assistance Request for an Owner-linked child only.

## Accountant
Create Fee Reminder within assigned branch or explicit institute-wide scope.

## Counsellor
Create Admission Follow-up within assigned branch/institute scope.

## Branch Manager
Create Attendance command, Fee Reminder, Admission Follow-up or Branch Task for an assigned branch.

## Staff
Create allowed Attendance command within assigned branch scope.

## State tests
- Preview.
- Wrong confirmation.
- Exact confirmation.
- Execute.
- Execute again: idempotent replay.
- Cancel a fresh preview.
- Duplicate same payload within 10 minutes.
