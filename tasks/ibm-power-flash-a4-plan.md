# Implementation Plan: IBM Power + FlashSystem volume on A4 DetailOverview

## Overview
Adopt the shared A4 `DetailOverview` in every label/value section of the IBM Power partition
detail and the FlashSystem volume detail. Layout only: sections, sidebar navigation, field
order, labels, values and business logic stay as the master inventory defines them. Answers
Q2 of `tasks/detail-overview-a4-plan.md` (FlashSystem and IBM Power adoption) — for all
field sections, not only the first one.

## Audit (2026-10-07)
- No uncommitted hunks on the 4 target files.
- `IbmPowerDetailPanel`: one renderer `fieldSections.map → DetailViewSection → DetailFieldGroup`
  covers Summary, Processor and memory, Network and monitoring, Storage, I/O and virtualization.
  `BackingStorageInfo` is a separate section (already A4, commit `468b31c0`) — not touched.
- `FlashSystemVolumeDetailPanel`: `fieldSections.map → DetailFieldGroup` (Identity, Placement
  and capacity, State and behavior, Copy relationships) + Pool `DetailFieldGroup`.
  Consistency groups keep `wide` (explicit full-row intent); Capacity keeps `emphasis`.
- No other `wide` anywhere; none added. Footprint from the shared 28/64 helper.
- Existing tests assert dt order, copy buttons and section nav; they stay valid (`DetailOverview` renders a `dl`).

## Tasks
1. IBM Power: `DetailFieldGroup` → `DetailOverview` in the field renderer; swap import.
2. FlashSystem: same in the field-section renderer and Pool; swap import.
3. Tests: parametrized A4 assertions — IBM Power over all 5 field sections (fixture with data
   for every section), FlashSystem over all 5 sections; Identity order + copy actions,
   Consistency groups full row (also when empty), Pool order. Old grid classes absent.
4. Checkpoint: focused vitest (2 files), eslint (4 files), typecheck, `git diff --check`.
5. Browser (Edge CDP :9333): IBM Power LPAR (`ibu_aix`) and FlashSystem `V5000_VOLUME01`;
   1440 light, narrow, dark on one view each.
6. Commit the 4 target files + this plan/todo, explicit paths only.

## Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Typecheck still red from foreign Recovery/OpenAPI/Zod changes | Low | Report separately, confirm 0 errors in discovery-inventory |
| Browser check blocked by Keycloak login | Med | Ask the user to log in on the CDP Edge |
