# Part 136.3 — Signed Owner Bootstrap Link

This removes browser secret typing.

```powershell
node .\APPLY-PART1363.js
node .\VERIFY-PART1363.js
git add .
git commit -m "Add signed Owner Bootstrap link fix"
git push
```

After Render deploy:

1. Render Environment me `NAXORA_OWNER_BOOTSTRAP_SECRET` ki exact value copy karo.
2. Run:

```powershell
node .\CREATE-OWNER-BOOTSTRAP-LINK.js
```

3. Signed 10-minute URL clipboard me copy hogi.
4. Browser address bar me Ctrl+V karke open karo.
5. Secret type nahi karna padega.
