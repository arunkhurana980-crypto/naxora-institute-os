# Desktop and Mobile Coverage

Final gate requires two passing snapshots:

## Desktop

- Viewport width: 900px or above.
- Open the main `/app` shell.
- Wait for modules to load.
- Open `/vani-acceptance`.
- Click `Record Current View Coverage`.

## Mobile

- Browser DevTools responsive mode or real phone.
- Width: 600px or below.
- Reload `/app`.
- Wait for modules to load.
- Open `/vani-acceptance`.
- Record coverage again.

Both snapshots require:

```text
Discovered modules >= 10
Coverage = 100%
Uncovered modules = 0
```

This is UI evidence, not an external accessibility certification.
