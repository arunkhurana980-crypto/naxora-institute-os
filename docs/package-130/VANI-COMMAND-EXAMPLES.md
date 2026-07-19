# Part 130 VANI Commands

```text
timetable create classId=CLASS_ID subject=Maths dayOfWeek=monday startTime=08:00 endTime=09:00 room=A1
```

```text
bulk attendance mark classId=CLASS_ID date=2026-07-20 attendanceEntries=STUDENT1:present|STUDENT2:absent
```

```text
assignment create classId=CLASS_ID title="Algebra Practice" instructions="Solve questions 1 to 20" dueDate=2026-07-25 maxMarks=20 status=published
```

```text
assignment review assignmentId=ASSIGNMENT_ID studentId=STUDENT_ID score=18 feedback="Good work"
```

```text
exam create classId=CLASS_ID title="Unit Test 1" examDate=2026-07-30 maxMarks=100 passingMarks=35 status=scheduled
```

```text
marks bulk record examId=EXAM_ID markEntries=STUDENT1:88|STUDENT2:74
```

```text
result publish examId=EXAM_ID message="Unit Test results published"
```

```text
progress note create studentId=STUDENT_ID title="Algebra Improvement" note="Weekly practice recommended" visibility=student_parent
```
