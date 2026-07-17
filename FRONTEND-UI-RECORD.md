# Frontend UI Record — Part 124

## Shared Role Workspace
One shared secure frontend is served at:
- `/parent-workspace`
- `/branch-workspace`
- `/accountant-workspace`
- `/counsellor-workspace`
- `/staff-workspace`

The page detects its pathname and requests the matching role workspace from the backend.

## Sections
- Role identity and plan state.
- Scope mode.
- Alerts.
- Summary cards.
- Searchable role module launcher.
- Safely scoped metrics.
- Plan entitlements.
- Scope status.
- Integration health.
- Recent activity.
- Role VANI.

## Scope Manager
`/role-scope-manager`

Owner can:
- select a Part 120 role account,
- enter child Student IDs or Branch IDs,
- select explicit institute-wide access where allowed,
- preview,
- enter exact confirmation,
- privately verify with Owner Action Secret,
- save the role scope.
