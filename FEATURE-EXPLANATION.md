# Feature Explanation — Part 125

## Why preview and confirmation
VANI must not change institute data from one ambiguous sentence. Every action has:
1. deterministic intent,
2. structured payload,
3. role permission,
4. scope validation,
5. stored preview,
6. exact confirmation,
7. separate execution,
8. audit.

## Canonical execution
Execution always creates a Part 125 canonical record. Message/reminder/follow-up actions also create an outbox item.

When Part 126 registers a native adapter, the same execution can update the existing module or notification provider. Without an adapter the result is:

```text
executed_pending_adapter
```

This is not a failure and not a fake delivery. It means the request is safely stored for Part 126.

## Global shell bridge
Action-like commands entered in the Part 119 VANI panel are routed to Part 125. Normal “module kholo” commands still use Part 119 navigation.
