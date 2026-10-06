# Todo: Remove DetailView compact mode

Plan: `tasks/detail-view-remove-compact-plan.md`. Stage explicit paths only. Never stage
OpenAPI, generated Zod, Metro Mirror, other sessions' task files or hardening hunks.
Do NOT revert, stage or commit unrelated changes.

## Prerequisite: no foreign hunks in the files this plan edits
- [x] Hardening Task 1 committed (`43cd0faa`).
- [x] `git diff` is empty for `DetailView.tsx`, `DetailView.test.tsx` and the five
  consumer test files right before editing. If not, wait or ask the user.

## Task 1: Remove the mode from the shared DetailView
**Description:** Delete the mode state, toggle button, resize handle, `data-mode`,
right-anchored frame classes and the `DetailViewMode` export. The centred frame, backdrop
`bg-black/30` and all `sm:` navigation/body classes become unconditional (plan §4).

**Acceptance criteria:**
- [x] No `mode`, `compact`, `useResizablePanel`, `data-mode`, `style` or `separator` in
  `DetailView.tsx`. `DetailViewMode` is not exported.
- [x] Header renders `headerActions` then Close only. Narrow layout classes unchanged.
- [x] Section reset on close, focus on Close, focus return and dialog stack unchanged.

**Verification:**
- [x] `DetailView.test.tsx` updated per plan §6 (2 deleted, 4 rewritten, 1 added).
- [x] `npm exec vitest run src/shared/components/detail-view src/shared/components/modal src/shared/components/help-popover`

**Dependencies:** Prerequisite.

**Files:** `src/shared/components/detail-view/DetailView.tsx`, `index.ts`,
`DetailView.test.tsx`.

**Scope:** S.

## Task 2: Consumer tests without compact expectations
**Description:** Delete or rewrite the consumer assertions on the toggle, `data-mode`
and resize (plan §6).

**Acceptance criteria:**
- [x] VMware: two compact/resize tests deleted. `data-mode` line removed.
- [x] Recovery Group: compact switch test deleted. Escape/Close and "next group on
  Overview" rewritten without compact. `data-mode` line removed.
- [x] Identity header lists no longer contain "Compact view".

**Verification:**
- [x] `npm exec vitest run src/features/discovery-inventory/resources/components/vmware/VirtualMachineDetailPanel.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx src/features/platform-administration/identity-access`
- [x] Regression on the remaining consumers: `npm exec vitest run src/features/platform-administration/audit src/features/platform-administration/platform-providers src/features/providers-connectors src/features/recovery-actions src/features/recovery-plans/recovery-applications src/features/recovery-plans/recovery-runs src/features/recovery-plans/policy-sets src/features/recovery-plans/recovery-policies src/features/discovery-inventory/resources`

**Dependencies:** Task 1.

**Files:** `VirtualMachineDetailPanel.test.tsx`, `RecoveryGroupsTable.test.tsx`,
`ClientsSection.test.tsx`, `RealmRolesSection.test.tsx`, `UsersSection.test.tsx`.

**Scope:** M.

**Commit (Tasks 1+2):** `refactor(detail-view): remove compact mode` (2a634a49). 8 explicit paths
(plan §12). Run `npm run lint` and `npm run typecheck` first.

## Checkpoint A (after Tasks 1–2)
- [x] Focused tests green, lint and typecheck clean, commit contains only the 8 paths.

## Task 3: Remove orphaned resize hook and mode icons
**Description:** Delete `useResizablePanel` (+ test), `PanelRightIcon` and `MaximizeIcon`.
They have no importer after Task 1.

**Acceptance criteria:**
- [x] `git grep -n "useResizablePanel\|PanelRightIcon\|MaximizeIcon" -- src` is empty.

**Verification:**
- [x] `npm run typecheck`, `npm run lint`.

**Dependencies:** Task 1. **Open question:** user approval to delete (plan, Open
questions).

**Files:** `src/shared/hooks/useResizablePanel.ts`, `useResizablePanel.test.ts`,
`src/shared/icons/Icons.tsx`.

**Scope:** XS. **Commit:** `refactor(shared): remove unused resizable panel hook and mode icons`

## Task 4: Remove unused detail mode labels
**Description:** Remove `detailView.compactView`, `detailView.expand` and
`detailView.resize` from en/cs/sk. Leave all other "Expand"/"Compact" keys alone.

**Acceptance criteria:**
- [x] `git grep -n "detailView\.\(compactView\|expand\|resize\)" -- src` is empty.
- [x] Locale parity test stays green.

**Verification:**
- [x] `npm exec vitest run src/locales`
- [x] `git diff -U0 src/locales` shows exactly 9 removed lines and nothing else (else
  leave the task pending; no temporary index).

**Dependencies:** Task 1. Hardening Task 3 committed (same files).

**Files:** `src/locales/en.json`, `cs.json`, `sk.json`.

**Scope:** XS. **Commit:** `chore(i18n): remove unused detail mode labels`

## Checkpoint B (after Tasks 3–4)
- [x] Lint, typecheck and focused tests clean.

## Task 5: Browser verification
**Description:** Run the plan §10 matrix in the real app (own Edge tab, CDP 9333).

**Acceptance criteria:**
- [x] Platform Provider, Recovery Group, VMware, IBM Power, Access Log, Identity User and
  Snapshot Policy open centred immediately. No toggle, no separator, no right drawer.
- [x] Section nav, footer actions (never confirm delete), HelpPopover and nested
  confirmation Escape work. Close returns focus. Reopen shows the first section.
- [x] 1440, 800 and 390 px plus dark mode: no horizontal overflow, footer reachable,
  console clean.

**Verification:**
- [x] Results recorded in the final report (viewport × detail).

**Dependencies:** Tasks 1–4. The user is logged in to Keycloak in the Edge on 9333.

**Files:** none.

**Scope:** S.

## Task 6: Cleanup search and final validation
**Description:** Run the plan §11 cleanup searches and explain every remaining hit.

**Acceptance criteria:**
- [x] No compact/mode/resize hits in `src/shared/components/detail-view`. Remaining
  "Expand" hits are unrelated features.
- [x] `git diff --check` is clean. No unrelated files in the three commits.

**Verification:**
- [x] `npm run lint`, `npm run typecheck`, all focused test commands above. The full
  suite and production build are not run unless asked.

**Dependencies:** Tasks 1–5.

**Scope:** XS.

## Checkpoint: Complete
- [x] All plan §15 acceptance criteria met.
- [x] Final report: commits, verification commands, browser results, and that the full
  suite/build were not run.

## Result (2026-10-06)
- Commits: `fa2e91fb` (portaled RG help lookup, regression from `a50f7a53`), `2a634a49`
  (compact mode removed), `d85268a0` (hook and icons), `2418639a` (locale keys).
- Browser: 7 details × 1440/800/390 light, 1440/390 dark. All passed. RG nested
  Delete → Escape → Escape passed at 1440 and 390. Recovery Group is `xl` (Metro Mirror
  commit). At 800 px with a page scrollbar, the dialog sits 8 px off centre. This is
  existing `100vw` behaviour and was not changed.
