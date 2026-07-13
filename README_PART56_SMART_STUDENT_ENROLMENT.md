# NAXORA Institute OS — Part 56: Smart Student Enrolment

## Goal

Part 56 adds the official **Smart Student Enrolment** foundation for NAXORA OS 1.0.

This part creates a complete digital admission workflow foundation:

- student basic details
- parent/guardian details
- unique student ID generation
- course and batch assignment
- fee plan fields
- document checklist status
- consent confirmation
- optional identity/guardian verification foundation
- MongoDB save support with mock fallback

## Important safety decision

Part 56 does **not** upload or store real photo/ID files yet. It stores only document checklist status, such as whether student photo or parent ID was received.

Reason: secure file upload needs storage, file validation, size limits, malware checks and access permissions. We will add actual uploads later after beta security audit.

## Frontend routes

- `/smart-enrolment`
- `/enrolment`
- `/admission`
- `/admissions`

## API routes

- `GET /api/part56/status`
- `GET /api/part56/form-config`
- `POST /api/part56/preview-student-id`
- `GET /api/part56/enrolments`
- `POST /api/part56/enrolments`
- `GET /api/part56/enrolments/:id`
- `PATCH /api/part56/enrolments/:id/status`
- `GET /api/part56/checklist`
- `GET /api/part56/export`

## MongoDB collection

When MongoDB is connected, records save to:

```text
smartenrolments
```

If MongoDB is not connected, server stays crash-free and uses memory mock mode.

## Test links after deploy

```text
https://naxora-institute-os.onrender.com/api/part56/status
https://naxora-institute-os.onrender.com/smart-enrolment
https://naxora-institute-os.onrender.com/api/part56/form-config
https://naxora-institute-os.onrender.com/api/part56/enrolments
```

## Copy/push steps

1. Extract this ZIP.
2. Copy all files/folders from extracted Part 56 folder.
3. Paste into the old live project folder:

```text
C:\Users\bhaij\OneDrive\Documents\naxora-institute-os-part51-final-secure-clean-url-redirect-fixed
```

4. Replace files when asked.
5. Open old live project in VS Code.
6. Run:

```bash
git status
git add .
git commit -m "Add Part 56 smart student enrolment"
git push
```

7. Render → Manual Deploy → Clear build cache & deploy.

## No secrets included

This ZIP does not include:

- `.env`
- MongoDB URI
- JWT secret
- Razorpay secret
- node_modules
- BAT auto-push scripts
