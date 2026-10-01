# Task 6 – Metro Mirror candidate eligibility: contract decision

Status: **PROPOSED – awaiting human approval** (gate before Tasks 7–10)
Plan: `tasks/metro-mirror-managed-mode-plan.md` · Todo: `tasks/metro-mirror-managed-mode-todo.md`
Analysed backend: `abco-be` @ `main` `a4e47c3` (read-only analysis, no backend changes)

## 1. Current backend behavior

### `/get_metro_mirror_relationships` (`api/routers/storage.py`)
- `GET`, query `provider_id` (master FLASHCOPY provider) + repeated `volume_names` (required, non-empty), permission `VIEW_INVENTORY`.
- Calls `ibm_flashsystem/discovery.py::find_existing_metro_mirror_relationships`: **one unfiltered, live `lsrcrelationship`** on the master array, matched in memory **by `master_vdisk_name` only**.
- Per volume (`api/schemas.py::MetroMirrorRelationship`):
  - `ok` – exactly one relationship with this volume as master; `auxiliary_name` = `aux_vdisk_name`, `consistency_group_id` = relationship CG (`""` → `null`).
  - `not_mirrored` – no relationship with this volume as master.
  - `ambiguous` – more than one; both fields `null`.
- Top level: `consistency_group_id` only when all `ok` volumes with a CG agree, else `null`; free-text `warning` for CG disagreement and for "mirrored but not in any consistency group".
- Purpose (design `docs/superpowers/specs/2026-09-29-metro-mirror-relationship-lookup-design.md`): prefill for `mode=existing`. Explicitly out of scope there: resolving from the auxiliary side.
- FE uses it only for the Existing prefill (`useRecoveryGroupMetroMirrorRelationships` + `reconcileMetroMirrorPrefill`).

### Submit / validation (`recovery/groups.py`, `api/routers/recovery_groups.py`)
- `MetroMirrorConfig`: `mode: "existing" | "managed"`, `consistency_group_id?`, `target_pool?`.
- `validate_recovery_group` → `_validate_not_pushed` (any update of a pushed group rejected) → `_validate_metro_mirror`:
  - Existing: `consistency_group_id` required, every volume needs `auxiliary_name`. **Structural only – no storage read.**
  - Managed: `consistency_group_id` and `auxiliary_name` must be absent. **No storage read.**
  - Both: symmetric FLASHCOPY `partnerProviderId`.
- `submit_recovery_group` order: validate → `MANAGE_METRO_MIRROR` permission for a managed push → **`upsert_recovery_group` (persist, `pushed=<push flag>`)** → if push: resolve snapshot provider → **managed: `provision_managed_metro_mirror`** → persist derived `auxiliary_name` / `consistency_group_id` → DAG push.
- Managed failure path: `MetroMirrorProvisionError` → re-persist `pushed=false` → 502.

### Managed provisioning (`ibm_flashsystem/metro_mirror.py::provision_managed_metro_mirror`)
- Order: `lspartnership` (read) → **`mkrcconsistgrp` (first write)** → per volume: `lsvdisk` on master (read) → `lsmdiskgrp` (read) → **`mkvdisk`** → **`mkrcrelationship`** → **`startrcconsistgrp`**.
- **No check of existing relationships.** Reads and writes are interleaved per volume, so a read failure on volume 2 happens after writes for volume 1 (best-effort `_teardown`).

### Rollback (`api/routers/recovery_groups.py::rollback_group_from_orchestrator`, `recovery/rollback.py`)
- `ok` + managed → `pushed=false`, `consistency_group_id=null`, every `auxiliary_name=null` (clean, editable).
- `partial` → `pushed=false`, derived ids kept (leftover objects). Confirms the plan's lifecycle.

### Runtime check (`apache_airflow/dags/recovery_group_template.py::verify_mirror_consistency`)
- Each DAG run reads `lsrcconsistgrp` + `lsrcrelationship` filtered by the persisted CG and checks that every **declared** master→aux pair is present (`mismatched_master_aux_pairs`). Extra relationships in the CG are tolerated → a group may be a **subset** of a CG.

## 2. Gaps

| # | Gap | Where |
|---|-----|-------|
| G1 | No mode-aware eligibility anywhere; FE would have to derive it from `status` (forbidden). | lookup endpoint |
| G2 | Matching is master-side only: a volume that is the **auxiliary** of a relationship (e.g. reversed direction) is reported `not_mirrored` → would look eligible for Managed. | `find_existing_metro_mirror_relationships` |
| G3 | "Mirrored but no CG" is `ok` with a free-text warning; not a machine-readable exclusion. | lookup endpoint |
| G4 | Same-CG compatibility is only a free-text `warning`; no selection verdict. | lookup endpoint |
| G5 | Lookup requires `volume_names`; there is no way to get candidates for the whole provider inventory. | lookup endpoint |
| G6 | Existing submit never re-reads storage: declared `auxiliary_name` / `consistency_group_id` / same-CG are trusted until the first DAG run fails. | `submit_recovery_group` |
| G7 | Managed provisioning never checks that source volumes are unmirrored before the first write (`mkrcconsistgrp`). | `provision_managed_metro_mirror` |
| G8 | Provisioning interleaves reads and writes per volume (more partial-write exposure than needed). | `provision_managed_metro_mirror` |
| G9 | A **partial-rollback** Managed group (`pushed=false`, derived ids still persisted) can be resubmitted via the API without the ids (Managed validation forbids sending them) and silently **overwrites** the leftover identifiers. FE blocks it (Task 5); backend does not. | `submit_recovery_group` / `validate_recovery_group` |

G2, G3, G8 and G9 are new findings beyond the original Task 7–9 text and are proposed below for approval.

## 3. Option A – extend `/get_metro_mirror_relationships`

Add `mode` query param and per-volume `eligible` / `reason`, plus a selection verdict.

## 4. Option B – separate Recovery Group candidates endpoint

New `GET /get_recovery_group_metro_mirror_candidates` returning mode-specific candidates for a source provider plus an optional selection verdict. `/get_metro_mirror_relationships` stays unchanged.

## 5. A vs B

| Criterion | A – extend lookup | B – candidates endpoint |
|-----------|-------------------|-------------------------|
| API contract clarity | Mixed: raw discovery `status` + business `eligible` + mode-dependent top-level `consistency_group_id`/`warning` in one shape; a "relationships" endpoint asked for volumes **without** relationships (Managed) is semantically odd | One purpose: "which volumes can this Recovery Group use in this mode, and is my selection valid" |
| Discovery vs eligibility separation | Merged | Discovery endpoint stays raw; eligibility is a separate, server-owned layer |
| Existing + Managed | Mode param bolted onto an Existing-prefill design | Designed for both from the start |
| Multi-volume same-CG | Possible, but top-level `consistency_group_id`/`warning` already carry a different, weaker meaning | Explicit `selection` verdict with structured problems |
| Exclusion reason | Added next to `status` → two overlapping vocabularies | Single reason enum per mode |
| FE integration | Reuses existing hook, but FE must ignore `status` and read only new fields – easy to misuse | New generated hook; FE renders `eligible` / `reason` / `selection` only |
| Backward compatibility | Must keep old semantics when `mode` absent; G2 fix (aux-side matching) would change current `not_mirrored` results | Zero impact on the existing endpoint |
| Testability | Tests must cover old + new behaviors in one route | Pure evaluation function + thin route, reused by submit revalidation |
| Future extension risk | Every new rule (partner cluster, copy type, target pool) further overloads a prefill endpoint | Natural home for new rules / reasons |
| Needs `volume_names` | Yes (G5 remains unless semantics change) | Optional: whole inventory, or evaluate a selection |

## 6. Recommended contract – Option B

### Endpoint
`GET /get_recovery_group_metro_mirror_candidates` · tag "Storage Volumes" · permission `VIEW_INVENTORY`

| Query param | Required | Meaning |
|-------------|----------|---------|
| `provider_id` | yes | Source FLASHCOPY provider (`provider_id_volume`); must have a valid symmetric partner (same rule as `_validate_metro_mirror`), else 400 |
| `mode` | yes | `existing` \| `managed` |
| `volume_names` | no (repeated) | Current selection to evaluate as **one** Recovery Group; omitted → `selection: null` |
| `force_refresh` | no, default `false` | Bypass the volume-inventory cache; relationships are always read live |

Candidates = every volume of the provider's inventory (`get_volumes`), each evaluated against **one live `lsrcrelationship`** on the source array, matched on **both** `master_vdisk_name` and `aux_vdisk_name`.

### Request example
```
GET /get_recovery_group_metro_mirror_candidates?provider_id=ibm-flashsystem-01&mode=existing&volume_names=VOL1&volume_names=VOL2
```

### Response example – Existing (valid selection)
```json
{
  "provider_id": "ibm-flashsystem-01",
  "partner_provider_id": "ibm-flashsystem-02",
  "mode": "existing",
  "candidates": [
    { "name": "VOL1", "eligible": true,  "reason": null,
      "relationship": { "role": "master", "auxiliary_name": "AUX1", "consistency_group_id": "7" } },
    { "name": "VOL2", "eligible": true,  "reason": null,
      "relationship": { "role": "master", "auxiliary_name": "AUX2", "consistency_group_id": "7" } },
    { "name": "VOL5", "eligible": true,  "reason": null,
      "relationship": { "role": "master", "auxiliary_name": "AUX5", "consistency_group_id": "9" } },
    { "name": "VOL3", "eligible": false, "reason": "not_mirrored",         "relationship": null },
    { "name": "VOL4", "eligible": false, "reason": "ambiguous",            "relationship": null },
    { "name": "VOL6", "eligible": false, "reason": "no_consistency_group",
      "relationship": { "role": "master", "auxiliary_name": "AUX6", "consistency_group_id": null } },
    { "name": "VOL7", "eligible": false, "reason": "mirrored_as_auxiliary",
      "relationship": { "role": "auxiliary", "auxiliary_name": null, "consistency_group_id": "11" } }
  ],
  "selection": {
    "volume_names": ["VOL1", "VOL2"],
    "valid": true,
    "consistency_group_id": "7",
    "auxiliary_names": { "VOL1": "AUX1", "VOL2": "AUX2" },
    "problems": []
  }
}
```

### Response example – Existing (invalid selection, different CGs)
```json
{
  "selection": {
    "volume_names": ["VOL1", "VOL5"],
    "valid": false,
    "consistency_group_id": null,
    "auxiliary_names": null,
    "problems": [
      { "code": "consistency_group_mismatch", "volumes": ["VOL1", "VOL5"],
        "consistency_group_ids": { "VOL1": "7", "VOL5": "9" } }
    ]
  }
}
```

### Response example – Managed
```
GET /get_recovery_group_metro_mirror_candidates?provider_id=ibm-flashsystem-01&mode=managed&volume_names=IBU_source
```
```json
{
  "provider_id": "ibm-flashsystem-01",
  "partner_provider_id": "ibm-flashsystem-02",
  "mode": "managed",
  "candidates": [
    { "name": "IBU_source", "eligible": true,  "reason": null, "relationship": null },
    { "name": "VOL1",       "eligible": false, "reason": "already_mirrored",
      "relationship": { "role": "master", "auxiliary_name": "AUX1", "consistency_group_id": "7" } },
    { "name": "VOL7",       "eligible": false, "reason": "already_mirrored",
      "relationship": { "role": "auxiliary", "auxiliary_name": null, "consistency_group_id": "11" } },
    { "name": "VOL4",       "eligible": false, "reason": "ambiguous", "relationship": null }
  ],
  "selection": {
    "volume_names": ["IBU_source"],
    "valid": true,
    "consistency_group_id": null,
    "auxiliary_names": null,
    "problems": []
  }
}
```

### Eligibility rules (server-owned, one pure function)
Let `matches(v)` = relationships where `v` is `master_vdisk_name` **or** `aux_vdisk_name`.

**Existing** – eligible only if `matches(v)` has exactly one relationship, `v` is its master, it has a non-empty `aux_vdisk_name` and a non-empty `consistency_group_id`.

| Reason | When |
|--------|------|
| `not_mirrored` | `matches(v)` empty |
| `ambiguous` | `matches(v)` > 1 |
| `mirrored_as_auxiliary` | the single relationship has `v` as auxiliary |
| `missing_auxiliary_name` | master relationship without `aux_vdisk_name` |
| `no_consistency_group` | master relationship without a CG |

**Managed** – eligible only if `matches(v)` is empty.

| Reason | When |
|--------|------|
| `already_mirrored` | exactly one relationship (as master or auxiliary) |
| `ambiguous` | `matches(v)` > 1 |

Reason codes are a closed enum in the schema; FE only maps code → translated label.

### Same-CG handling
- Per candidate, Existing returns its `consistency_group_id` as **data** (FE may display/group by it, never decide).
- The **verdict** comes only from `selection`, computed server-side for the passed `volume_names`:
  - every selected volume must exist in the provider inventory (`unknown_volume`) and be eligible (`ineligible_volume`, with the candidate reason);
  - Existing: all selected volumes must share one `consistency_group_id` (`consistency_group_mismatch`, with the per-volume ids); a **subset** of a CG is valid (matches the DAG's `mismatched_master_aux_pairs`, which only checks declared pairs);
  - `valid=true` returns the resolved `consistency_group_id` and `auxiliary_names` for Existing (replaces the prefill), `null` for Managed.
- FE re-queries with the new selection whenever the selection changes and shows `selection.problems`; Next/Create gating uses `selection.valid`. The submit-time revalidation (below) enforces the same rule, so FE gating is UX only.

Problem model: `{ "code": "unknown_volume" | "ineligible_volume" | "consistency_group_mismatch", "volumes": [...], "reason"?: <candidate reason>, "consistency_group_ids"?: {...} }`.

### Submit-time revalidation boundary (Task 9)
Shared function (e.g. `evaluate_metro_mirror_selection(mode, volume_names, relationships)`) used by the endpoint and by submit, so discovery and enforcement can never diverge. Discovery results are advisory only.

**Existing** (ABCO creates no Metro Mirror storage; side effects are persist and DAG push):
- In `submit_recovery_group`, **after `validate_recovery_group` and before the first `upsert_recovery_group`** – i.e. before any persist or push – read `lsrcrelationship` live on the source array and require:
  - every volume eligible for Existing,
  - declared `auxiliary_name` == relationship `aux_vdisk_name`,
  - declared `metro_mirror.consistency_group_id` == relationship CG for every volume (same-CG for the whole selection).
- Runs on every Existing save (with or without push). Failure → 409 with the structured problems; nothing persisted.
- Array unreachable → fail closed (502), nothing persisted. *(Decision point: fail closed is recommended; it blocks saving an Existing group while the source array is down.)*
- The DAG's `verify_mirror_consistency` stays as the runtime check.

**Managed** (ABCO writes storage):
- **Persist-time check** (same place as Existing, before `upsert`): for a new/clean Managed group, every volume must be Managed-eligible; reject 409 so an unprovisionable group is never saved.
- **Provisioning-time check – mandatory, immediately before the first storage write:** restructure `provision_managed_metro_mirror` into
  1. a read-only preflight: `lspartnership`, **live `lsrcrelationship` on the master (read-only client) → every volume must still be Managed-eligible**, `lsvdisk` per master volume, `lsmdiskgrp` / target pool;
  2. the write phase (`mkrcconsistgrp` → `mkvdisk` / `mkrcrelationship` → `startrcconsistgrp`) only if the preflight passed.
- Preflight failure → `MetroMirrorProvisionError` **before any write** (no teardown needed); the existing router path re-persists `pushed=false` and returns 502.
- Residual race between preflight and `mkrcrelationship` is irreducible; IBM rejects `mkrcrelationship` for a vdisk already in a relationship and the existing `_teardown` covers it.

**Partial-rollback guard (G9, proposed for Task 9):** reject submit of a Managed group whose **persisted** record has `pushed=false` and a non-null `consistency_group_id` or any `auxiliary_name` (mirrors the FE `managedProvisioned` lock) – in `validate_recovery_group` next to `_validate_not_pushed`.

## 7. Backend files likely changed by Tasks 7–9

| File | Task | Change |
|------|------|--------|
| `ibm_flashsystem/metro_mirror_eligibility.py` (new) | 7, 8 | Pure evaluation (candidates + selection), reason enum, `_self_check` |
| `ibm_flashsystem/discovery.py` | 7 | Small helper to fetch raw `lsrcrelationship` reused by endpoint and submit (existing lookup unchanged) |
| `api/schemas.py` | 7, 8 | `MetroMirrorCandidate`, `MetroMirrorSelection`, `MetroMirrorCandidatesResponse` |
| `api/routers/storage.py` | 7, 8 | New `GET /get_recovery_group_metro_mirror_candidates` |
| `api/routers/_test_storage.py` | 7, 8 | Route tests |
| `ibm_flashsystem/metro_mirror.py` | 9 | Read-only preflight incl. relationship re-read before the first write |
| `api/routers/recovery_groups.py` | 9 | Existing + Managed revalidation before `upsert` |
| `recovery/groups.py` | 9 | Partial-rollback guard (G9) |
| `api/routers/_test_recovery_groups.py` | 9 | Submit/provision revalidation tests |

## 8. Focused backend test commands
The backend uses assert-based self-checks (`CLAUDE.md`: no pytest suite), run as modules:
```
python -m ibm_flashsystem.metro_mirror_eligibility   # new, Tasks 7–8
python -m api.routers._test_storage                  # Tasks 7–8
python -m ibm_flashsystem.metro_mirror               # Task 9
python -m api.routers._test_recovery_groups          # Task 9
python -m recovery.groups                            # Task 9 (G9)
```
Precondition: a venv with `requirements.txt` installed. In this environment the baseline run failed with `ModuleNotFoundError` (fastapi/requests/pydantic not installed); nothing was installed during Task 6.

Acceptance tests mapped: Existing candidates (mirrored+CG eligible; not mirrored / ambiguous excluded) and multi-volume same/different CG → Task 7; Managed candidates (not mirrored eligible; mirrored / ambiguous excluded) → Task 8; revalidation immediately before writes and no provisioning for a volume that gained a relationship → Task 9.

## 9. Impact on Task 10 (FE / Orval)
- Update `openapi/abco-api.json` from the backend and regenerate Orval (no hand edits) → new generated query hook + zod schemas.
- New FE hook around the candidates query (`provider_id`, `mode`, selection); volume pickers for Metro Mirror show only `eligible` candidates and render `reason` labels (new en/cs/sk keys per reason code); Local topology unchanged.
- Existing prefill moves to `selection.consistency_group_id` / `selection.auxiliary_names`; whether `useRecoveryGroupMetroMirrorRelationships` + `reconcileMetroMirrorPrefill` are removed or kept is decided in Task 10. `/get_metro_mirror_relationships` itself stays for backward compatibility.
- Next/Create gating for Metro Mirror additionally uses `selection.valid`; no FE eligibility or CG logic.
- Submit error handling surfaces the 409 problem list from Task 9.

## 10. Decisions requested
1. Approve Option B and the contract above.
2. Approve the new reason `mirrored_as_auxiliary` / aux-side matching (G2).
3. Approve fail-closed Existing revalidation when the source array is unreachable.
4. Approve adding the read-only provisioning preflight restructure (G8) and the partial-rollback guard (G9) to Task 9.
