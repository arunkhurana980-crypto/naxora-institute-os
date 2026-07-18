# Part 132 Backend API Record

## Public

- `GET /api/part132/status`
- `GET /api/part132/security-policy`
- `GET /api/part132/catalog`
- `GET /api/part132/demo`

## Authenticated

- `POST /api/part132/actions/preview`
- `POST /api/part132/vani/command`
- `POST /api/part132/actions/:actionId/confirm`
- `POST /api/part132/actions/:actionId/cancel`
- `GET /api/part132/actions`
- `GET /api/part132/records`
- `GET /api/part132/pipeline-summary`

## Models

- `Part132CrmAction`
- `Part132CrmLead`
- `Part132CrmLeadNote`
- `Part132CrmFollowUp`
- `Part132Admission`
- `Part132AdmissionDocumentChecklist`
- `Part132CrmReport`
- `Part132CrmAudit`
