# Part 132 Feature Explanation

## 12 CRM actions

1. Lead create.
2. Lead update.
3. Counsellor assign.
4. Lead stage update.
5. Lead note add.
6. Follow-up create.
7. Follow-up reschedule.
8. Follow-up complete.
9. Lead-to-Admission convert.
10. Admission update.
11. Document checklist update.
12. Pipeline summary generate.

## Secure flow

```text
Command
→ role and institute validation
→ Part 124 Branch scope
→ assigned-Counsellor Lead isolation
→ Part 128 Branch/Course/Class validation
→ preview
→ exact confirmation
→ native MongoDB write
→ audit
```
