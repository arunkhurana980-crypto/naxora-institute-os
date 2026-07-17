# VANI Integration Record — Part 115

## Commands
- `VANI, webhook setup status dikhao`
- `VANI, webhook failures dikhao`
- `VANI, subscription sync status dikhao`
- `VANI, is subscription ko reconcile karo`

## Behaviour
- Owner-only monitoring.
- instituteId checked.
- Secrets never spoken or returned.
- Setup command shows URL and selected event names only.
- Failures/events shown on private screen.
- Reconcile requires local Part 114 Subscription ID.
- Reconcile is a safe read-only provider refresh.
- Live Mode requests are blocked.

## Status language
VANI can safely say counts and status names. Provider IDs, detailed event snapshots and error records remain private-screen-first.
