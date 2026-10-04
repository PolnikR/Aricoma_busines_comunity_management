# TODO: DetailDrawer sekcie – scroll a akcenty (variant A)

Plán: `tasks/detail-drawer-section-accents-plan.md`

## Task 1: `DetailDrawerSection` – accent a icon (shared)
- [ ] typ `DetailDrawerSectionAccent` (6 hodnôt) a voliteľné props `accent` a `icon`
- [ ] statická mapa akcentov na tokeny (light/dark), pruh, chip, hover/focus/open stav
- [ ] fallback bez `accent`/`icon` je vizuálne zhodný s dneškom
- [ ] sekcia `flex min-h-0 flex-col`, panel `min-h-0 overflow-y-auto`
- Overenie: `npm exec vitest run src/shared/components/data-table/DetailDrawerSection.test.tsx`
- Súbory: `DetailDrawerSection.tsx`, `DetailDrawerSection.test.tsx`, `index.ts` (export typu)
- Rozsah: S

## Task 2: `DetailDrawer` – `bodyLayout="sections"` (shared)
- [ ] default `'scroll'` sa nemení
- [ ] `'sections'`: telo je flex stĺpec, hlavičky ostávajú, skroluje iba panel
- Overenie: `npm exec vitest run src/shared/components/data-table/DetailDrawer.test.tsx`
- Súbory: `DetailDrawer.tsx`, `DetailDrawer.test.tsx`
- Rozsah: S

## Checkpoint 1
- [ ] shared testy, eslint na zmenených súboroch, `npm run typecheck`
- [ ] commit

## Task 3: VMware VM drawer
- [ ] `bodyLayout="sections"`, wrapper `@container/vm-detail` má `flex min-h-0 flex-col`
- [ ] Overview `overview`/`GridIcon`, Disks `storage`/`ServerIcon`, Backing Storage Info `storage`/`LayersIcon`
- [ ] test: `data-accent` sekcií
- Overenie: `VirtualMachineDetailPanel.test.tsx`
- Rozsah: S

## Task 4: FlashSystem volume a IBM Power drawer
- [ ] obe `bodyLayout="sections"`
- [ ] Flash: Identity `overview`, Placement `storage`, State `configuration`, Copies `protection`, Pool `storage`
- [ ] Power: Summary `overview`, Processor & memory / Network / Virtual I/O `compute`, Storage `storage` (cez `PartitionSection`)
- Overenie: typecheck, eslint; v prehliadači
- Rozsah: S

## Task 5: Access log drawer
- [ ] `bodyLayout="sections"`, Request `overview`/`GridIcon`, bodies a raw entry `technical`/`ApiIcon` (cez `BodySection`)
- Overenie: typecheck, eslint; v prehliadači
- Rozsah: XS

## Task 6: Recovery application a Recovery group drawer
- [ ] obe `bodyLayout="sections"`, `<div key>` → `Fragment key`
- [ ] Overview `overview`, Orchestration `configuration`/`ExecutionIcon`, Inventory `compute`/`ServerIcon`
- [ ] testy: `data-accent` sekcií
- Overenie: `RecoveryApplicationsTable.test.tsx`, `RecoveryGroupsTable.test.tsx`
- Rozsah: S

## Checkpoint 2 (koniec)
- [ ] focused testy všetkých dotknutých súborov, eslint, `npm run typecheck`, `git diff --check`
- [ ] prehliadač: 6 drawerov, 1366×768 a 390 px, light/dark; IBM Power s 5 otvorenými sekciami; Access log s veľkým body
- [ ] commit
