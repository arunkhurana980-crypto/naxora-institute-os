# Rollback Steps — Part 112

## Automatic bootstrap rollback
Project root terminal:

```bash
node ROLLBACK-PART112.js
```

Then optionally delete Part 112 new files listed in `FILES-CHANGED.md`.

## Git rollback before push
```bash
git restore backend/src/server.js
git clean -fd
```

Warning: `git clean -fd` deletes all untracked files, not only Part 112. Use only when you understand the result.

## Git rollback after commit
```bash
git revert <part-112-commit-sha>
git push
```

Then Render → Manual Deploy → Clear build cache & deploy.
