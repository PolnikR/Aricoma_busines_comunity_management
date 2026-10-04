# TODO: DetailDrawer sekcie – scroll a akcenty (variant A)

Plán: `tasks/detail-drawer-section-accents-plan.md`

## Task 1: `DetailDrawerSection` – accent a icon (shared)
- [x] `Icons.tsx`: `DiskIcon`, `CopyIcon`, `NetworkIcon` v rovnakom stroke/currentColor štýle
- [x] typ `DetailDrawerSectionAccent`: `overview | infrastructure | storage | protection | configuration | technical`; voliteľné props `accent` a `icon`
- [x] statická mapa akcentov na tokeny (light/dark), pruh, chip, hover/focus/open stav; `configuration` = orange iba pruh a chip, `technical` = jediné gray, žiadne `warning-*`
- [x] fallback bez `accent`/`icon` je vizuálne zhodný s dneškom
- [x] flex contract: sekcia `flex min-h-0 flex-col` (zatvorená `shrink-0`, otvorená `shrink`), `h3` `shrink-0`, otvorený panel `flex-1 min-h-0 overflow-y-auto`
- Overenie: `npm exec vitest run src/shared/components/data-table/DetailDrawerSection.test.tsx`
- Súbory: `src/shared/icons/Icons.tsx`, `DetailDrawerSection.tsx`, `DetailDrawerSection.test.tsx`, `index.ts` (export typu)
- Rozsah: S

## Task 2: `DetailDrawer` – `bodyLayout="sections"` (shared)
- [x] default `'scroll'` sa nemení
- [x] `'sections'`: telo je flex stĺpec, hlavičky ostávajú, skroluje iba panel
- Overenie: `npm exec vitest run src/shared/components/data-table/DetailDrawer.test.tsx`
- Súbory: `DetailDrawer.tsx`, `DetailDrawer.test.tsx`
- Rozsah: S

## Checkpoint 1
- [x] shared testy, eslint na zmenených súboroch, `npm run typecheck`
- [x] commit

## Task 3: VMware VM drawer
- [x] `bodyLayout="sections"`, wrapper `@container/vm-detail` má `flex min-h-0 flex-1 flex-col`
- [x] Overview `overview`/`GridIcon`, Disks `storage`/`DiskIcon`, Backing Storage Info `storage`/`LayersIcon`
- [x] test: `data-accent` sekcií
- Overenie: `VirtualMachineDetailPanel.test.tsx`
- Rozsah: S

## Task 4: FlashSystem volume a IBM Power drawer
- [x] obe `bodyLayout="sections"`
- [x] Flash: Identity `overview`/`GridIcon`, Placement `storage`/`LayersIcon`, State `configuration`/`SettingsIcon`, Copies `protection`/`CopyIcon`, Pool `storage`/`LayersIcon`
- [x] Power: Summary `overview`/`GridIcon`, Processor & memory `infrastructure`/`CpuIcon`, Network `infrastructure`/`NetworkIcon`, Virtual I/O `infrastructure`/`ServerIcon`, Storage `storage`/`LayersIcon` (cez `PartitionSection`)
- [x] nové testy `FlashSystemVolumeDetailPanel.test.tsx` a `IbmPowerDetailPanel.test.tsx`: `bodyLayout="sections"` a `data-accent` sekcií
- Overenie: oba nové test súbory, eslint
- Rozsah: M

## Task 5: Access log drawer
- [x] `bodyLayout="sections"`, Request `overview`/`GridIcon`, bodies a raw entry `technical`/`ApiIcon` (cez `BodySection`)
- [x] nový test `AccessLogDetailDrawer.test.tsx`: `bodyLayout="sections"` a `data-accent` sekcií (request aj raw záznam)
- Overenie: nový test súbor, eslint
- Rozsah: S

## Task 6: Recovery application a Recovery group drawer
- [ ] obe `bodyLayout="sections"`, `<div key>` → `Fragment key`
- [ ] Overview `overview`/`GridIcon`, Orchestration `configuration`/`ExecutionIcon`, Inventory `infrastructure`/`ServerIcon`
- [ ] testy: `data-accent` sekcií
- Overenie: `RecoveryApplicationsTable.test.tsx`, `RecoveryGroupsTable.test.tsx`
- Rozsah: S

## Checkpoint 2 (koniec)
- [ ] focused testy všetkých dotknutých súborov, eslint, `npm run typecheck`, `git diff --check`
- [ ] prehliadač: 6 drawerov, 1366×768 a 390 px, light/dark; IBM Power s 5 otvorenými sekciami; Access log s veľkým body
- [ ] commit
