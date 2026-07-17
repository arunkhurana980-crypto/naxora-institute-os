# Feature Explanation — Part 116

## Access formula

```text
Valid JWT
+ matching instituteId
+ allowed role
+ verified Part 115 status = active
+ required base plan or separate V3 subscription
= feature allowed
```

## Base plans
- FREE: dashboard and self profile.
- STARTER: students, attendance, fees, reports, student/parent portals.
- PROFESSIONAL: Starter plus VANI 2.0, live classes and AI support.
- BUSINESS: Professional plus branches, franchise, marketing, marketplace and white-label.

## Separate V3
`V3_AI` is evaluated separately and does not replace the base plan.

V3 features require:
- `institute_owner`,
- valid instituteId,
- active V3_AI subscription.

## Enforcement
- Backend feature-check API.
- Backend gated test API.
- Exported Express middleware factory.
- Role-safe navigation API.
- Reusable frontend client.

Frontend hiding is convenience only; backend gate is the security boundary.
