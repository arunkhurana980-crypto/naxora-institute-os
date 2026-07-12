## Part 39 - Live Classes + Comments + Separate Subscription

This build adds live class scheduling, comments/chat, recording/resource links, and a separate Live Classes subscription module.

# NAXORA Institute OS - Part 39 - Live Classes + Comments + Separate Subscription

## Student Institute Discovery + Leads Marketplace

Is build me students ke liye public institute search aur institutes ke liye lead inbox add hai. Sirf wahi institute public listing me show honge jo NAXORA service use kar rahe hain aur jinki listing active/trial/premium published hai.

### New APIs

- GET `/api/discovery/search` - public institute search
- POST `/api/discovery/leads` - student enquiry submit
- GET `/api/discovery/my-listings` - institute owner listings
- POST `/api/discovery/my-listings` - create listing
- GET `/api/discovery/my-leads` - discovery leads inbox
- PATCH `/api/discovery/my-leads/:id/status` - lead status update
- GET `/api/discovery/status` - route status checker

### Frontend

- `frontend/discovery.html`
- `frontend/discovery.css`
- `frontend/discovery.js`

### Run

Copy your working `.env` into `backend/.env`, then:

```bash
cd backend
npm install
npm run dev
```

Check:

```text
http://127.0.0.1:5000/api/discovery/status
```


## Part 49 Added

Final Testing + Bug Fix Build has been merged on top of Part 48. Open `/app/final-testing.html` or check `/api/final-testing/status`.

