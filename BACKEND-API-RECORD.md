# Backend APIs

Public:
- `/api/part135/status`
- `/api/part135/security-policy`
- `/api/part135/catalog`

Authenticated:
- `/api/part135/native-catalog`
- `POST /api/part135/conversations`
- `GET /api/part135/conversations`
- `GET /api/part135/conversations/:conversationId`
- `POST /api/part135/conversations/:conversationId/messages`
- `POST /api/part135/conversations/:conversationId/steps/:stepId/preview`
- `POST /api/part135/conversations/:conversationId/steps/:stepId/confirm`
- `POST /api/part135/conversations/:conversationId/steps/:stepId/handoff`
- `POST /api/part135/conversations/:conversationId/cancel-pending-previews`

Models: `Part135WorkflowConversation`, `Part135WorkflowAudit`.
