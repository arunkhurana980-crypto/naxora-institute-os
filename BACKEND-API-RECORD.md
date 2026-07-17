# Backend API Record — Part 118

## Public
- `GET /api/part118/status`
- `GET /api/part118/requirements`
- `GET /api/part118/security-policy`
- `GET /api/part118/demo`

## Owner-only
- `GET /api/part118/readiness`
- `POST /api/part118/evidence`
- `POST /api/part118/provider-probe`
- `POST /api/part118/launch/preview`
- `POST /api/part118/launch/approve-confirmed`
- `POST /api/part118/rollback/preview`
- `POST /api/part118/rollback/approve-confirmed`
- `POST /api/part118/vani/command`

## Models
- `Part118LiveReadinessEvidence`
- `Part118ControlledLaunch`
- `Part118LiveLaunchAudit`

## Private confirmation
Confirmed launch/rollback requires:
- institute_owner JWT,
- matching instituteId,
- exact confirmation,
- `x-naxora-owner-action-secret`.

## Provider probe
Uses Live API credentials for a read-only Fetch Plans request. It does not create a payment, Plan or Subscription.
