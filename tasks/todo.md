# Task Checklist: Feature-First Discovery & Inventory Structure

## Baseline and resources

- [x] Preserve endpoint contracts and React Query keys for all implemented inventory APIs.
- [x] Move VMware inventory, tags and VM storage discovery into `resources`.
- [x] Move FlashSystem volume inventory and IBM Power inventory into `resources`.
- [x] Preserve `/vms`, `/vms_by_tag`, `/tags`, `/vdisks_by_vm`, `/get_volumes`,
  `/get_power_vm` URLs, parameters and request timing.

## Infrastructure and consumers

- [x] Move `/get_volume_tree`, its schema and hook into `infrastructure`.
- [x] Keep topology mapping, layout and UI behavior unchanged.
- [x] Update Infrastructure and Recovery Groups to use the public
  `resources/api` and `resources/model` boundaries.
- [x] Keep presentation internals and filter state private to `resources`.

## Cleanup and verification

- [x] Remove the generic top-level `api`, `helpers`, `hooks`, `model`, `pages`
  and rejected `sources` folders from `discovery-inventory`.
- [x] Confirm one canonical implementation and test per moved endpoint.
- [x] `eslint . --max-warnings 0`
- [x] `tsc -b`
- [x] Focused Resources/API/helper/hook tests: 104 passed.
- [x] Infrastructure and Recovery Groups tests: 202 passed.
- [x] Production build (run with the repository's local Vite binary).
- [x] Stage only discovery-inventory, direct Recovery Groups import updates and
  the corrected plan/checklist before commit.
