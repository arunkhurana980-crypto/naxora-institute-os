# Part 130 Testing Guide

## Test order

1. Verify Part 129.
2. Use existing Part 128 Branch, Course, Class, Teacher and Student IDs.
3. Create timetable entry.
4. Bulk mark attendance.
5. Create assignment and review one Student.
6. Create Exam.
7. Record marks.
8. Publish result.
9. Add Student progress note.
10. Generate progress snapshot.
11. Test Student and Parent summary access.
12. Test wrong role and wrong Class scope.

## Runtime requirement

Package syntax and installer tests do not replace real MongoDB, role login and Render tests.
