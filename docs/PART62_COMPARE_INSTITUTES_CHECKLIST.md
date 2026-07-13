# Part 62 Compare Institutes Checklist

## Frontend
- [ ] `/compare-institutes` opens.
- [ ] `/compare` opens same page.
- [ ] Search filters work: city, course, radius, verified only.
- [ ] Candidate institute cards render.
- [ ] 2–4 institutes can be selected.
- [ ] Comparison table renders.
- [ ] Request Callback links point to Part 60.
- [ ] View Profile links point to Part 59.

## Backend
- [ ] `/api/part62/status` returns success true.
- [ ] `/api/part62/config` returns compare fields.
- [ ] `/api/part62/candidates` returns public candidate listings.
- [ ] `/api/part62/compare` returns comparison matrix.
- [ ] `/api/part62/recommendations` returns scored recommendations.
- [ ] `/api/part62/checklist` returns checklist.

## Security
- [ ] No `.env` included.
- [ ] No secrets included.
- [ ] No node_modules included.
- [ ] No `.bat` script included.
- [ ] Private student/admin data is not exposed.

## Product flow
- [ ] Nearby Institutes → Compare Institutes works.
- [ ] Compare Institutes → Public Profile works.
- [ ] Compare Institutes → Request Callback works.
- [ ] Data supports Part 63 Discovery and Leads Integration.
