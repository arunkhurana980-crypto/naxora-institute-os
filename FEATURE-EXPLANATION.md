# Feature Explanation — Part 119

## Single-app behaviour

```text
Existing role login
→ open /app
→ server verifies JWT and instituteId
→ role modules filtered
→ Part 116 plan/V3 entitlements filtered
→ selected old module opens inside central pane
→ URL remains /app#/module/<key>
```

## Global VANI in Part 119
Safe examples:
- `VANI, fees kholo`
- `VANI, marketplace dikhao`
- `VANI, webhook monitor kholo`
- `VANI, teacher app kholo`

Part 119 VANI performs only safe navigation. It does not bypass module security or execute finance/student actions.

## Server allowlist
The browser cannot submit an arbitrary URL. It submits a module key. The backend returns a route only when:
- module key exists,
- role is allowed,
- instituteId matches,
- Part 116 entitlement allows the module.

## Legacy route embedding
Existing feature pages remain available, but users reach them through the central shell. Parts 121–126 will progressively replace legacy-page differences with shared shell components and global action integration.
