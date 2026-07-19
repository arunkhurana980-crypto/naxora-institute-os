# Part 131 Feature Explanation

## 12 finance actions

1. Fee Structure create.
2. Fee Structure update.
3. Student Fee assign.
4. Student Fee update.
5. Invoice create.
6. Invoice update.
7. Manual offline Receipt record.
8. Receipt correction request.
9. Due list generate.
10. In-app fee reminder create.
11. Student statement generate.
12. Finance summary generate.

## Secure flow

```text
Command
→ action allowlist
→ role and institute validation
→ Part 124 Branch scope
→ Part 128 Student/Branch references
→ preview
→ exact confirmation
→ extra receipt acknowledgement where required
→ native MongoDB record
→ audit
```

No live money movement occurs.
