# VANI Integration Record — Part 125

## Command examples

```text
attendance mark student STU001 date 2026-07-18 present class BATCH10
```

```text
fee reminder student STU001 branch BR01 message="Please review fee details"
```

```text
admission lead LEAD10 follow-up 2026-07-19 message="Call requested"
```

```text
assignment create class BATCH10 title="Algebra practice" due 2026-07-20 instructions="Solve questions 1 to 10"
```

```text
assignment submit assignment HW10 submission="My answer"
```

```text
message send to teacher recipientIds=T01 message="Please review my request"
```

VANI never executes from the first sentence. It creates a preview and requires exact confirmation plus a separate execute step.
