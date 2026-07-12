# NAXORA Institute OS - Part 40
## Online Batch Access Management

This part links Live Classes with paid batch access:
- Institute creates online/hybrid batch fee plans.
- Student enrollment is tracked with fee status and access status.
- Live class access can be checked using phone/email.
- Paid + active enrollment = student can join live class.
- Pending/partial/expired/blocked = access blocked.

New APIs:
- GET /api/online-batches/status
- GET /api/online-batches/public
- GET /api/online-batches
- POST /api/online-batches
- GET /api/online-batches/:id
- PUT /api/online-batches/:id
- PATCH /api/online-batches/:id/status
- DELETE /api/online-batches/:id
- GET /api/online-batches/:id/enrollments
- POST /api/online-batches/:id/enroll
- PATCH /api/online-batches/:id/enrollments/:enrollmentId/status
- POST /api/online-batches/:id/check-access

Frontend:
- frontend/online-batches.html
- frontend/online-batches.css
- frontend/online-batches.js

Roadmap note:
Premium SaaS Landing Page and earlier Part 38 planned features will start from Part 41.
