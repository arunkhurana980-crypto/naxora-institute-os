# NAXORA FINAL — Owner Login, Unified App and VANI Launch

This is the cumulative package for Parts 136.4 and 136.5.

## Final customer flow

```text
New institute:
Create Institute
→ Institute + Owner account
→ Institute ID automatic
→ Auto-login
→ Unified /app

Existing Owner:
Owner Email/Phone/Login ID
→ Password
→ Unified /app
```

Owner does not need:

```text
Institute ID during Owner login
Render secret
Signed bootstrap link
VS Code access
```

Teacher, Student, Parent and Staff continue using `/common-login`.

## One-command install

```powershell
node .\APPLY-NAXORA-FINAL-OWNER-VANI.js
```

Then:

```powershell
node .\VERIFY-NAXORA-FINAL-OWNER-VANI.js
```
