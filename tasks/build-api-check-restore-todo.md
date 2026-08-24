# Task Checklist: Restore `api:check` to the Build Script

- [ ] Add `api:check` back into the `build` script in `package.json` (after lint/typecheck/test, before `vite build`).
- [ ] Run `npm run api:check` standalone; confirm it passes and leaves the working tree clean.
- [ ] Run `npm run build` end-to-end with the restored step; confirm success.
- [ ] Confirm `git status` is clean after both runs.
- [ ] Commit only the `package.json` change.
