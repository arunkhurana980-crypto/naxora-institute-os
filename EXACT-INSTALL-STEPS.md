# Exact Installation — Final 136.12

Extract the ZIP and copy everything inside into the existing NAXORA project.
Choose `Replace files in the destination`.

Run:

```powershell
node .\APPLY-NAXORA-FINAL.js
```

Then:

```powershell
git status
git add .
git commit -m "Fix Final Role VANI cache and command UX"
git push
```

Render:

```text
Manual Deploy
→ Clear build cache & deploy
```

After deployment open `/app` in a new Incognito window.
