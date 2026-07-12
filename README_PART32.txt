# NAXORA Institute OS - Part 32

## AI Mock Test Generator System

Part 32 adds a local AI-style mock test generator for NAXORA Institute OS.

### Features

- Topic se mock test generate
- MCQ, True/False, Short Answer, Descriptive questions
- Difficulty level: Easy, Medium, Advanced
- Exam focus: Coding, Boards, JEE, NEET, NDA, UPSC, School, General
- Test mode: Practice, Exam, Quick Revision, Homework
- Duration and question count controls
- Auto answer key
- Auto total marks calculation
- Copy and print latest mock test
- Save mock tests in MongoDB
- Publish, archive, pin, edit, delete
- Attempt count tracking
- Sidebar me AI Mock Tests link visible

### API Routes

GET    /api/ai-mock-tests
POST   /api/ai-mock-tests
POST   /api/ai-mock-tests/generate
GET    /api/ai-mock-tests/:id
PUT    /api/ai-mock-tests/:id
PATCH  /api/ai-mock-tests/:id/status
PATCH  /api/ai-mock-tests/:id/pin
PATCH  /api/ai-mock-tests/:id/attempt
DELETE /api/ai-mock-tests/:id

### Run

```bash
cd backend
npm install
npm run dev
```

Open frontend/index.html with Live Server and go to:

Dashboard -> AI Mock Tests

### Important

This part does not require OpenAI API key. It uses a local NAXORA AI template so the app does not crash if API keys are missing.
