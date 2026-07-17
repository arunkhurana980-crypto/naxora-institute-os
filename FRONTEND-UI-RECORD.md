# Frontend UI Record — Part 116

## Main page
`/subscription-access-control`

Aliases:
- `/feature-access-control`
- `/part116`

## UI
- Detect any logged-in role JWT.
- Show current base plan.
- Show separate V3 status.
- Show role entitlement count.
- Show authenticated plans waiting for active.
- Check any feature.
- Test backend gate.
- Generate role-safe navigation.
- Show plan/role catalogue.
- Ask VANI about access.

## Reusable client
`/naxora-subscription-access-client.js`

```html
<script src="/naxora-subscription-access-client.js"></script>
<button data-naxora-feature="fees.manage">Fees</button>
<script>
  NaxoraSubscriptionAccess.configure({
    token: existingJwt,
    instituteId: currentInstituteId
  }).apply();
</script>
```

Protected backend APIs must also use the Part 116 middleware.
