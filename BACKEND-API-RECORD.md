# Part 131 Backend API Record

## Public

- `GET /api/part131/status`
- `GET /api/part131/security-policy`
- `GET /api/part131/catalog`
- `GET /api/part131/demo`

## Authenticated

- `POST /api/part131/actions/preview`
- `POST /api/part131/vani/command`
- `POST /api/part131/actions/:actionId/confirm`
- `POST /api/part131/actions/:actionId/cancel`
- `GET /api/part131/actions`
- `GET /api/part131/records`
- `GET /api/part131/student-statement`

## Models

- `Part131FinanceAction`
- `Part131FeeStructure`
- `Part131StudentFee`
- `Part131Invoice`
- `Part131ManualReceipt`
- `Part131ReceiptCorrectionRequest`
- `Part131FinanceReminder`
- `Part131FinanceReport`
- `Part131FinanceAudit`
