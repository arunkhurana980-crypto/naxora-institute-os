# NAXORA Institute OS — Part 59: Public Institute Profile

## Scope
Part 59 adds the public institute profile foundation for NAXORA OS 1.0.

Roadmap features covered:
- Institute logo/banner
- Courses
- Fees range
- Teachers
- Results
- Facilities
- Timings
- Photos/videos by safe URL fields
- Address

## Why this part exists
Students and parents need complete institute information before sending an enquiry. A professional public profile improves online visibility and prepares the product for Part 60 request callback/send enquiry.

## New Frontend Routes
- `/public-institute-profile`
- `/institute-profile-public`
- `/public-profile`
- `/institute-showcase`

## New API Routes
- `GET /api/part59/status`
- `GET /api/part59/config`
- `GET /api/part59/profile`
- `POST /api/part59/profile`
- `GET /api/part59/profile/:profileId`
- `PUT /api/part59/profile/:profileId`
- `PATCH /api/part59/profile/:profileId/publish`
- `POST /api/part59/profile/:profileId/courses`
- `POST /api/part59/profile/:profileId/media`
- `GET /api/part59/search`
- `GET /api/part59/checklist`
- `GET /api/part59/export`
- `GET /api/part59/demo`

## Safety notes
- No `.env` included.
- No secrets included.
- No `.bat` script included.
- No direct file upload included yet.
- Media is safe URL-based for now.
- Callback/enquiry submission is intentionally left for Part 60.

## Deploy test links
- `/api/part59/status`
- `/public-institute-profile`
- `/api/part59/profile`
- `/api/part59/search?status=all`
