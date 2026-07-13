# START HERE — Part 55 Arun

Arun, Part 55 me security and role permissions add hua hai.

## Copy kaise karna hai

1. ZIP extract karo.
2. Extracted folder ke andar `Ctrl + A` karo.
3. `.env`, `node_modules`, `.git` agar dikhe to copy mat karna.
4. Old live project me paste/replace karo:

```txt
C:\Users\bhaij\OneDrive\Documents\naxora-institute-os-part51-final-secure-clean-url-redirect-fixed
```

5. VS Code me old live project open karo.
6. Commands chalao:

```bash
git status
git add .
git commit -m "Add Part 55 security role permissions"
git push
```

7. Render me `Manual Deploy -> Clear build cache & deploy`.

## Deploy ke baad check

```txt
https://naxora-institute-os.onrender.com/api/part55/status
https://naxora-institute-os.onrender.com/role-permissions
https://naxora-institute-os.onrender.com/api/part55/check-access?role=teacher&permission=attendance.write
```

## Expected

- status success true
- role permissions page open
- check-access allowed/not allowed result de
