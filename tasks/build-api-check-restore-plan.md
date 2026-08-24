# Implementation Plan: Restore `api:check` to the Build Script

## Overview

`api:check` (which verifies the committed `src/generated/api` output matches what `orval` would generate from the live OpenAPI spec) was removed from the `build` script on 2026-08-16 because running it had a destructive side effect: `assertGeneratedApiIsCurrent()` generated directly into the live `src/generated/api` directory to compare it against a backup, then discarded the backup without restoring it — so every `build` silently overwrote the real generated files. Removing the check from `build` was a workaround, not a fix. The next day (2026-08-17, commit `7c5fcf5`), the root cause was fixed: `check-generated.mjs` now restores the backup over the live directory in a `finally` block, so the check itself is side-effect-free regardless of outcome. `api:check` was never added back to `build`, so the build pipeline currently has no generated-API drift check at all. This plan restores it.

## Root Cause

The removal (`f821026`) addressed a real bug (destructive side effect) but removed the wrong thing — the check's *safety*, not just its *side effect*, needed fixing. That fix landed separately and completely (verified: `check-generated.mjs` has a `finally` block restoring the backup), but nobody reconnected `api:check` to `build` afterward.

## Architecture Decisions

- Restore `api:check` as a step in the `build` script in `package.json`, in the same position it occupied before removal (after `lint`/`typecheck`/`test`, before `vite build` — matching the existing ordering convention of cheaper checks first).
- No changes to `check-generated.mjs`, `pull-openapi.mjs`, or any other orval script — the fix that makes this safe already shipped and is out of scope here.
- No change to `check` (`npm run check` → `npm run build`) — it inherits the restored step automatically.

## Dependency Graph

```text
check-generated.mjs is already side-effect-free (verified, shipped 2026-08-17)
    -> restoring api:check to the build script is now safe
        -> build pipeline regains its generated-API drift check
```

## Task 1: Restore `api:check` to the `build` script

**Description:** Add `api:check` back into the `build` script in `package.json`.

**Acceptance criteria:**
- [ ] `package.json`'s `build` script runs `api:check` alongside `lint`, `typecheck`, and `test`, before `vite build`.
- [ ] `npm run check` (which just calls `build`) also runs it, unchanged.

**Verification:**
- [ ] `npm run api:check` — run standalone first to confirm it passes cleanly against the current generated output and does not leave the working tree dirty (`git status` clean before and after).
- [ ] `npm run build` — run the full restored pipeline once to confirm it succeeds end-to-end with the check included.
- [ ] `git status` after both runs — confirms neither run left `src/generated/api` modified.

**Dependencies:** None

**Files likely touched:**
- `package.json`

**Estimated scope:** XS: 1 file

## Checkpoint: Complete

- [ ] `npm run build` passes with `api:check` included.
- [ ] Working tree is unchanged by running the build (confirms the 2026-08-17 side-effect fix holds under the restored pipeline).
- [ ] Commit contains only the `package.json` change.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Generated API has actually drifted since the check was disabled on 2026-08-16, so restoring it now fails CI | Medium | Run `npm run api:check` standalone first, locally, before touching `package.json`, to see whether it currently passes or fails against the present `src/generated/api` |
| The side-effect fix from `7c5fcf5` doesn't hold under the exact sequencing used inside `build` (e.g. interaction with `test` running first) | Low | The full `npm run build` verification step in Task 1 exercises the exact real sequencing, not just `api:check` in isolation |

## Open Questions

None — user confirmed restoring the check as scoped.
