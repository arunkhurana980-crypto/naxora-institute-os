# NAXORA Institute OS - Part 31 AI Notes Generator

## Added
- AI Notes Generator page
- Local NAXORA AI template notes generation
- Notes library with search/filter
- Publish / archive / pin notes
- Copy and print notes
- Protected API with JWT
- Route active: `/api/ai-notes`

## Run
```bash
cd backend
npm install
npm run dev
```

Health check:
```text
http://127.0.0.1:5000/api/health
```

Expected terminal line:
```text
✅ PART 31 AI NOTES GENERATOR BUILD ACTIVE
✅ AI Notes route active: /api/ai-notes
```

Frontend:
```text
frontend/index.html -> Open with Live Server
Login -> AI Notes
```

## APIs
- GET `/api/ai-notes`
- POST `/api/ai-notes`
- POST `/api/ai-notes/generate`
- GET `/api/ai-notes/:id`
- PUT `/api/ai-notes/:id`
- PATCH `/api/ai-notes/:id/status`
- PATCH `/api/ai-notes/:id/pin`
- DELETE `/api/ai-notes/:id`

## Note
Is module me abhi external OpenAI API key required nahi hai. Ye safe local NAXORA AI template se notes banata hai, isliye app crash nahi karega.
