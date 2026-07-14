# START HERE — Part 80 Arun

Part 80 adds Institute Owner App foundation for NAXORA OS 2.0.

## Steps
1. Extract ZIP.
2. Copy all files into live project folder:
   `C:\Users\bhaij\OneDrive\Documents\naxora-institute-os-part51-final-secure-clean-url-redirect-fixed`
3. Replace files.
4. Run:
```bash
git status
git add .
git commit -m "Add Part 80 Institute Owner App"
git push
```
5. Render → Manual Deploy → Clear build cache & deploy.

## Test
- `/api/part80/status`
- `/institute-owner-app`
- `/api/part80/overview?role=institute_owner&instituteId=NX-DEMO-INST-001&subscription=demo`
