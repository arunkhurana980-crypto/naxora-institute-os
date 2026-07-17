# Part 126 Testing Guide

Execute through Part 125:
1. attendance mark,
2. attendance correction request,
3. fee reminder,
4. fee assistance request,
5. admission follow-up,
6. assignment create,
7. assignment submit,
8. role-safe message,
9. branch task.

Expected successful Part 125 status:

```text
executed_native
```

For older `executed_pending_adapter` actions:
1. open `/integration-centre`,
2. Preview Retry,
3. enter exact confirmation,
4. Retry Confirmed.

Provider states:
- no provider: `provider_not_configured`
- HTTP success: `provider_delivered`
- provider error: `provider_failed`
