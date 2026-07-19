# Required Completed Workflows

Part 136 verifies real Part 135 MongoDB conversation records.

Required:

1. `assignment_announcement`
2. `lead_followup`
3. `monthly_report_pack`
4. `student360_export`

Each conversation must have:

```text
status = completed
completedStepCount = totalStepCount
```

Provide only the `conversationId`.

Part 136 does not accept screenshots or a typed “passed” statement as workflow proof.
