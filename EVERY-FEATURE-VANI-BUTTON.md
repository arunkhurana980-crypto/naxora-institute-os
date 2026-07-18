# Every Feature VANI Button

Part 136 adds:

```text
frontend/naxora-part136-vani-button-coverage.js
```

The script:

- Discovers visible module/feature navigation entries.
- Adds a contextual `VANI` button next to each discovered entry.
- Opens the Workflow VANI module with feature context.
- Re-scans dynamic DOM changes with `MutationObserver`.
- Exposes a coverage snapshot to the acceptance screen.

Important:

A VANI button on every feature means:

```text
VANI can open the feature
VANI can explain the feature
VANI can use approved native actions
VANI can use secure handoff where secrets/files are required
```

It does not mean:

```text
Role permissions are bypassed
Passwords or OTPs are handled
Direct money transfer/refund occurs
Unsafe deletion becomes available
Every feature has an autonomous write action
```
