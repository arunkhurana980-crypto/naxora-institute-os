# Part 130 Feature Explanation

## 12 academic actions

1. Timetable create.
2. Timetable update.
3. Bulk attendance.
4. Assignment create.
5. Assignment update.
6. Assignment review.
7. Exam create.
8. Exam update.
9. Bulk marks record.
10. Result publish.
11. Progress note create.
12. Progress snapshot generate.

## Native references

Part 130 validates Part 128 Class, Teacher and Student records before execution.

## VANI flow

```text
Command → role/scope validation → reference validation → preview → exact confirmation → native MongoDB write → audit
```
