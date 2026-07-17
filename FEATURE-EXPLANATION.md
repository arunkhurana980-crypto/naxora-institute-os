# Feature Explanation — Part 121

## Owner consolidation flow

```text
Part 120 common owner login
→ Part 119 unified app
→ Owner Workspace
→ institute-scoped overview
→ allowed owner modules
→ module opens inside the same shell
```

## Owner Workspace data
- Part 116 supplies base plan, V3 and entitlements.
- Part 120 supplies account status and role counts.
- Part 115 supplies verified Subscription states.
- Part 117 supplies Subscription Manager action state.
- Part 118 supplies controlled Live-launch state.
- Existing institute-scoped models supply detected operational counts.

## Model discovery safety
Part 121 does not count an unscoped MongoDB model. A model must contain an institute/tenant field before it is included. Missing model mapping shows “Not detected” instead of showing another institute’s data.

## VANI boundary
Part 121 VANI:
- explains owner summary,
- shows alerts,
- opens allowed owner modules.

It does not yet execute admission, fee, messaging or other multi-step changes. That is Part 125.
