# Part 133 Backend API Record

Public:
- `GET /api/part133/status`
- `GET /api/part133/security-policy`
- `GET /api/part133/catalog`
- `GET /api/part133/demo`

Authenticated:
- `POST /api/part133/actions/preview`
- `POST /api/part133/vani/command`
- `POST /api/part133/actions/:actionId/confirm`
- `POST /api/part133/actions/:actionId/cancel`
- `GET /api/part133/actions`
- `GET /api/part133/records`
- `GET /api/part133/inbox`
- `POST /api/part133/inbox/:deliveryId/read`
- `POST /api/part133/inbox/:deliveryId/archive`

Models:
- `Part133CommunicationAction`
- `Part133CommunicationRecord`
- `Part133Delivery`
- `Part133CommunicationPreference`
