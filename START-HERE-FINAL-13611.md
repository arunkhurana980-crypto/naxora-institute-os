# NAXORA Final 136.11 — One ZIP Fixed

This replaces the previous 136.10 ZIP.

Fixed:

- Same-origin modules render inside `/app`.
- `X-Frame-Options: DENY` is replaced by safe `SAMEORIGIN`.
- External framing remains blocked.
- Microphone is allowed only for same-origin VANI.
- Many VANI circles are replaced by one contextual `VANI Actions` button.
- Failed iframe gets a direct-mode fallback instead of a blank box.
- Empty grey command example gives clear guidance.
- App runtime and commercial Razorpay acceptance are shown separately.

## One command

```powershell
node .\APPLY-NAXORA-FINAL.js
```
