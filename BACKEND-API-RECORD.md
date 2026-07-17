# Backend API Record — Part 116

## Public
- `GET /api/part116/status`
- `GET /api/part116/catalog`
- `GET /api/part116/security-policy`
- `GET /api/part116/demo`

## Logged-in role
- `GET /api/part116/access/me`
- `GET /api/part116/navigation`
- `POST /api/part116/access/check`
- `GET /api/part116/gated/:featureKey`
- `POST /api/part116/vani/command`

## Owner-only
- `GET /api/part116/institute-access`
- `POST /api/part116/recalculate`

## Future-module exports
- `resolvePart116Access({ instituteId, role, userId })`
- `createPart116FeatureGate(featureKey)`

Example:

```js
import { createPart116FeatureGate } from "./part116-subscription-access-control.js";

app.get(
  "/api/business/branches",
  createPart116FeatureGate("branches.command_centre"),
  async (req, res) => res.json({ success: true })
);
```

## Models
- `Part116AccessSnapshot`
- `Part116AccessAudit`

Part 116 reads `Part115SubscriptionSyncState`. Only matching evidence with status `active` unlocks paid entitlements.
