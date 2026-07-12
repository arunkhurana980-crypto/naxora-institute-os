# Project Structure

```text
naxora-institute-os-part30-deployment-ready-final/
  backend/
    src/
      config/
      controllers/
      middleware/
      models/
      routes/
      server.js
    scripts/check-env.js
    .env.example
    package.json
    Dockerfile
  frontend/
    index.html
    dashboard.html
    students.html
    teachers.html
    ...all module pages...
  render.yaml
  Procfile
  README.md
  DEPLOYMENT_GUIDE.md
  ENV_SETUP_GUIDE.md
  FINAL_TESTING_CHECKLIST.md
```

Backend runs APIs on `/api/...`.
Frontend local runs with Live Server.
Frontend same-server production runs at `/app`.
```


## Part 31
AI Notes Generator added. No external AI key required for local template notes generation.
