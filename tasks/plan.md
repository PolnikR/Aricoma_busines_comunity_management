# Implementation Plan: Rename "Audit & Retention" to "Audit"

## Overview
Rename the "Audit & Retention" menu item and page configuration to "Audit" across the application. This is a straightforward text refactoring affecting navigation labels, locale keys, and page metadata.

## Scope
- 2 primary files: AppSidebar.tsx, modulePageConfigs.ts
- 3 locale files: en.json, sk.json, cs.json
- No functional changes; purely cosmetic rename
- All existing routes and references remain intact

## Task List

### Task 1: Rename in AppSidebar.tsx
**Description:** Update the "Audit & Retention" menu item label and its corresponding locale key mapping in the navigation sidebar.

**Acceptance criteria:**
- [ ] Menu item text changed from "Audit & Retention" to "Audit"
- [ ] navKeyMap entry key changed from "Audit & Retention" to "Audit"
- [ ] Route reference (routes.platformAuditRetention) unchanged
- [ ] TypeScript compiles without errors
- [ ] Lint passes

**Files likely touched:**
- `src/layouts/app-shell/AppSidebar.tsx` (2 locations: navItems array, navKeyMap)

**Estimated scope:** XS (1 file, 2 edits)

---

### Task 2: Rename in modulePageConfigs.ts
**Description:** Update the "Audit & Retention" page configuration title and description to reflect "Audit" branding while keeping all other metadata intact.

**Acceptance criteria:**
- [ ] Page config title changed from "Audit & retention" to "Audit"
- [ ] eyebrow and description text updated appropriately
- [ ] Route reference (routes.platformAuditRetention) unchanged
- [ ] TypeScript compiles without errors

**Files likely touched:**
- `src/app/modulePageConfigs.ts` (1 location: platformAdministrationPages array)

**Estimated scope:** XS (1 file, 1 edit)

---

### Task 3: Update locale keys
**Description:** Add/update locale key mappings for the new "Audit" label across all supported languages (English, Slovak, Czech).

**Acceptance criteria:**
- [ ] Locale key `nav.administration.audit` exists in en.json, sk.json, cs.json
- [ ] Translation values are appropriate for each language
- [ ] Build succeeds with locale loading

**Files likely touched:**
- `src/locales/en.json`
- `src/locales/sk.json`
- `src/locales/cs.json`

**Estimated scope:** XS (3 files, minimal edits)

---

### Checkpoint: Rename Complete
- [ ] All files updated
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] Lint passes: `npm run lint`
- [ ] Tests pass: `npm run test`
- [ ] Sidebar displays "Audit" instead of "Audit & Retention"

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Locale key mismatch (navKeyMap points to key that doesn't exist) | Medium — missing translation, blank UI | Update navKeyMap key to match actual locale file keys |
| Inconsistent naming across languages | Low — UX confusion if names don't match in intent | Use consistent terminology in all locale files |
| Missed references in other files | Low — stale documentation or comments | Grep for "Audit & Retention" after changes to verify |

## Open Questions

None — scope and changes are straightforward.
