# Design: Dynamic Tier Management with Inline Editing

## Overview

Transform the hardcoded 4-tier system into a user-editable tier management UI where:
- Users start with 4 pre-filled tiers (Database, DB Cluster, Application, Web)
- Each tier's name, description, and order can be changed
- Tiers can be deleted entirely
- New tiers can be added dynamically
- Tier IDs follow the name (slugified); renaming changes the key in the tiers Map
- Reordering is done via drag-and-drop (consistent with VM drag-and-drop already in the form)

## Architecture Decisions

1. **Inline Editing Pattern:** Click tier card to edit name/description inline; confirm/cancel buttons appear. No modal, no sidebar — stays in the TierCanvas for fast workflow.

2. **Tier ID Generation:** Tier ID auto-slugifies from the tier name (e.g., "My Tier" → "my_tier"). User can also edit the ID directly to override the auto-slugified version. When ID or name changes, the Map key updates (old key deleted, new key created, preserving order, VMs, description).

3. **Add Tier via Grid:** A "+" card in the tier grid opens a new-tier form inline. User enters name and optional description, clicks Create. Order is auto-assigned (max current + 1).

4. **Drag-and-Drop Reordering:** Grab a tier card header and drag to reorder. Order numbers auto-update based on position (1, 2, 3, ...). Uses existing drag-and-drop pattern from VM management.

5. **State Management:** RecoveryAppBuilder keeps tiers as `Map<string, RecoveryTier>`. Tier CRUD operations (add, edit, delete, reorder) update the Map and re-render TierCanvas.

6. **Empty Tiers:** Tiers can exist without VMs (common case during tier setup). No validation preventing save until tiers are non-empty (flexibility first).

## Implementation Tasks

### Phase 1: Foundation — Tier Card Edit Mode

#### Task 1: Enhance TierCard with edit mode UI
**Description:** Add click-to-edit functionality to TierCard. When clicked, tier ID (key), name, and description become editable inline with Confirm/Cancel buttons. Delete button is always visible (disabled if it's the last tier). Only one tier can be in edit mode at a time.

**Acceptance criteria:**
- [ ] Clicking tier header toggles edit mode (ID, name, description become input fields)
- [ ] Name is required; ID is required and must be unique (not already used by another tier)
- [ ] Confirm saves changes and updates tier Map key if ID changed; Cancel reverts
- [ ] Delete button visible in both view and edit mode; disabled if it's the only tier remaining
- [ ] Only one tier in edit mode at a time (closing one if another is opened)
- [ ] Form state correctly reflects changes before save

**Verification:**
- [ ] `npm test -- TierCard` passes
- [ ] Manual: Click tier → edit name → confirm → name updates; click another tier → first closes

**Dependencies:** None

**Files likely touched:**
- `src/features/recovery-plans/recovery-applications/components/TierCard.tsx`
- `src/features/recovery-plans/recovery-applications/components/TierCard.test.tsx` (if exists)

**Estimated scope:** Small (1 file)

---

#### Task 2: Create AddTierCard component
**Description:** A new "+" card in the tier grid that, when clicked, shows an inline form to create a new tier. User enters ID (auto-slugified from name, but editable), name (required), optional description, and clicks Create. New tier is assigned order = max(current orders) + 1.

**Acceptance criteria:**
- [ ] Clicking the "+" card reveals a form with ID input, name input, description textarea, Create/Cancel buttons
- [ ] ID auto-slugifies from name as user types (e.g., "My Tier" → "my_tier"); user can edit ID directly
- [ ] Name is required; ID is required and must be unique; Create disabled if either missing or ID duplicated
- [ ] Creating a tier adds it to the tiers Map with new auto-generated order
- [ ] After create, form closes and new tier appears in grid sorted by order

**Verification:**
- [ ] `npm test -- AddTierCard` passes
- [ ] Manual: Click "+" → type name → Create → new tier appears in grid with correct order

**Dependencies:** None

**Files likely touched:**
- `src/features/recovery-plans/recovery-applications/components/AddTierCard.tsx`
- `src/features/recovery-plans/recovery-applications/components/AddTierCard.test.tsx`

**Estimated scope:** Small (1 file)

---

### Phase 2: Reordering and Integration

#### Task 3: Implement drag-and-drop tier reordering in TierCanvas
**Description:** Add drag-and-drop reordering to TierCanvas using HTML5 drag API (or a lightweight library like dnd-kit if preferred). When user drags a tier card to a new position, update order numbers to match the new sequence (1, 2, 3, etc.).

**Acceptance criteria:**
- [ ] Tier cards are draggable (visual feedback on drag start)
- [ ] Dropping on a new position reorders tiers
- [ ] Order numbers auto-update to reflect sequence (no gaps)
- [ ] VMs stay with their tier during reorder
- [ ] No visual flicker on drop; smooth re-render

**Verification:**
- [ ] `npm test -- TierCanvas` passes
- [ ] Manual: Drag tier 3 to position 1 → all orders update; VMs stay in their tier

**Dependencies:** Task 1, Task 2

**Files likely touched:**
- `src/features/recovery-plans/recovery-applications/components/TierCanvas.tsx`
- `src/features/recovery-plans/recovery-applications/components/TierCanvas.test.tsx`

**Estimated scope:** Small–Medium (1 file, drag-drop implementation)

---

#### Task 4: Update RecoveryAppBuilder to handle tier ID changes
**Description:** When a user edits a tier's name, the tier ID (Map key) changes. Update RecoveryAppBuilder's state handlers to:
- Delete the old tier entry from the Map
- Create a new entry with the new slugified ID
- Preserve order, description, and VMs

Also update `handleVMAdded` and `handleVMRemoved` to use the new tier ID if it changed.

**Acceptance criteria:**
- [ ] Renaming a tier from "Database" to "Primary DB" updates Map key to "primary_db"
- [ ] Order, description, VMs preserved during rename
- [ ] Deleting a tier removes it from the Map; VMs are lost (confirm with user if needed)
- [ ] Adding a new tier adds it to the Map with correct structure
- [ ] Form state correctly reflects all changes

**Verification:**
- [ ] `npm test -- RecoveryAppBuilder` passes
- [ ] Manual: Edit tier name → confirm → name in tier card updates; form state reflects change

**Dependencies:** Task 1, Task 2

**Files likely touched:**
- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx`
- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx`

**Estimated scope:** Small (1 file, state logic)

---

### Phase 3: Polish and Testing

#### Task 5: End-to-end flow testing
**Description:** Manually test the complete tier management workflow: start with defaults, rename a tier, add a new tier, reorder tiers, delete a tier, add VMs to tiers, save the application.

**Acceptance criteria:**
- [ ] User can rename all 4 default tiers without losing VMs
- [ ] User can add a 5th tier; it appears in grid with correct order
- [ ] User can delete a tier; form state updates
- [ ] User can drag tiers to reorder; order numbers auto-update
- [ ] User can add VMs to reordered tiers
- [ ] Saving the application submits correct JSON with new tier IDs and orders

**Verification:**
- [ ] Manual workflow end-to-end (see steps above)
- [ ] JSON output matches the spec format (application → tiers → tier ID as key)
- [ ] All unit tests pass: `npm test`
- [ ] Linting clean: `npm run lint`

**Dependencies:** Task 1, 2, 3, 4

**Files likely touched:**
- No code changes; verification only

**Estimated scope:** N/A (manual testing checkpoint)

---

## Checkpoint: Complete

- [ ] All tasks 1–5 complete
- [ ] `npm test` passes (all tests green)
- [ ] `npm run lint` clean
- [ ] End-to-end manual test passes
- [ ] Form submits valid JSON matching spec

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Tier ID slugification edge cases (special chars, spaces) | Low | Use robust slugify function; sanitize input in AddTierCard |
| VMs lost if tier deleted | Medium | Confirm deletion; show count of VMs being deleted |
| Drag-drop complexity (browser compatibility, accessibility) | Low | Use established library (dnd-kit) or test HTML5 API across browsers |
| Only one tier in edit mode → user confusion | Low | Clear visual state; auto-close on blur or confirm |

---

## Design Decisions (User-Confirmed)

- **Delete behavior:** No warning; just delete. Minimum 1 tier enforced (can't delete the last tier).
- **Tier names:** Must be unique (validation prevents duplicate names).
- **Tier ID editability:** ID auto-slugifies from name, but user can edit it directly to override.
