# NAXORA Institute OS — Part 61 Nearby Institutes

## Goal
Part 61 ka goal student/parent ko aas-paas ke suitable institutes dikhana hai. Ye Part 59 public institute profiles ko use karke city, course, distance aur verified filters ke saath searchable banata hai.

## Added Routes
- `/nearby-institutes`
- `/nearby`
- `/institutes-near-me`
- `/local-institutes`

## Added APIs
- `GET /api/part61/status`
- `GET /api/part61/config`
- `GET /api/part61/nearby`
- `GET /api/part61/cities`
- `GET /api/part61/courses`
- `GET /api/part61/map-pins`
- `GET /api/part61/profile/:profileId`
- `GET /api/part61/checklist`
- `GET /api/part61/export`
- `GET /api/part61/demo`

## Safety Rules
- No `.env` included.
- No MongoDB/JWT/Razorpay secret included.
- No `.bat` script included.
- No automatic location tracking.
- Browser location works only after user clicks `Use My Location` and grants permission.
- No external geocoding/maps API in this part.

## Handoff
- Part 59: Public institute profile data source.
- Part 60: Request Callback / Send Enquiry action.
- Part 62: Compare Institutes next.
