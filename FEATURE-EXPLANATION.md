# Feature Explanation — Part 126

## Flow

```text
Part 125 preview
→ exact confirmation
→ execute
→ Part 126 adapter
→ institute/role/scope revalidation
→ idempotent native record
→ in-app notification
→ optional private provider
→ delivery and audit state
```

## Scope checks

- Student: logged-in Student identity only.
- Parent: Part 124 linked child only.
- Branch-scoped roles: assigned branch or explicit institute-wide scope.
- Message recipients: active Part 120 identities matching the requested role.
- Assignment submission: existing Part 126 assignment required.

## Idempotency

Every adapter uses Part 125 `actionId`. A repeated call returns the saved result and does not create a duplicate native record.
