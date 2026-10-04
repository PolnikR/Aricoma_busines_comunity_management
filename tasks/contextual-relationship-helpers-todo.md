# TODO: Kontextové relationship helpery

Spec: `tasks/contextual-relationship-helpers-spec.md` · Plán: `tasks/contextual-relationship-helpers-plan.md`
Stav: plán schválený s úpravami 1–4 (2026-10-04); čaká na kontrolu dokumentov pred C1.

## C0: Spec, plán, TODO
- [x] plán schválený (2026-10-04): VIOS mimo scope, smer aj na úzko, DOM ID per inštancia, FlashSystem `allProviders`
- [x] kontrola aktualizovaných dokumentov používateľom

## C1: Shared relationship primitives (S–M)
- [x] `StorageIcon`, `AlertTriangleIcon` v `Icons.tsx` (20×20, stroke currentColor 1.5)
- [x] `relationshipGraphTypes`, `relationshipAdjacency` (pure, one-hop)
- [x] `RelationshipGraph`, `RelationshipGroup`, `RelationshipChain`, `RelationshipNode`, `RelationshipConnector`, `RelationshipNote`
- [x] tóny chipu compute/storage/infrastructure/protection/problem cez tokeny, žiadne hex ani `warning-*`
- [x] hover/focus highlight: active + priami susedia 100 %, ostatné uzly `opacity-35`, hrany `opacity-[0.12]`, labely `opacity-15`, 150 ms transition, leave/blur obnoví
- [x] container query: desktop chain s hrotmi ◀/▶; úzko vertikálny stack s vertikálnymi hrotmi (forward ▼, backward ▲, both ▲▼), bez horizontálneho overflow
- [x] a11y: `role="group"`, `tabIndex=0`, `aria-describedby` skrytý popis, `sr-only` text konektora
- [x] logické `entityId` pre highlight, DOM ID cez `useId()` per inštancia
- Overenie: `relationshipAdjacency.test.ts`, `RelationshipGraph.test.tsx` (vrátane narrow variantu: `forward` → vertikálny hrot dole, `backward` → vertikálny hrot hore, `both` → hroty hore aj dole; a rovnakej entity 2×: highlight na oboch, žiadne duplicitné aria ID), eslint, typecheck, `git diff --check`
- Commit C1

## C2: Selected-provider kontext (M)
- [ ] `buildSelectedProviderRelationships` (compute / storage / missing + edges) nad `resolveProviderTopology`
- [ ] `SelectedProviderRelationships` (loading/error, intro, graf, empty stavy podľa typu)
- [ ] `ProvidersCatalogueTable`: help `children` so `selectedProviderId`, Role/Credential ostávajú
- [ ] odstrániť `buildRelationshipRows`, `ProviderRelationshipsContent`, `ProviderRelationshipParts` + testy a osirelé `providers.relationships.*` kľúče
- [ ] en/sk/cs: nové kľúče (napr. `usedBy`, `noBackingRelationships`, `noProviderRelationships`, `notUsedAsBacking`), upravené `intro.source`
- Overenie: view-model test (VMware, IBM Power, FlashCopy, Hitachi, viac backingov, mutual, one-way, viac partnerov, unresolved, mismatch, bez vzťahov, nesúvisiaci sa neobjaví, missing), component test, `ProvidersCatalogueTable.test.tsx`, locale parity test
- Commit C2

## CP1: Checkpoint po C2
- [ ] prehliadač: provider help VMware a FlashCopy, light/dark, 1366×768 a 390 px, hover aj Tab, pozícia `wide` popoveru z drawera
- [ ] review s používateľom pred resources

## C3: VMware VM helper (M)
- [ ] `buildVmRelationships` (provider→VM, volumes podľa storage providera, NAA, FlashCopy)
- [ ] `VmRelationshipHelp` + `VirtualMachineDetailPanel` (`width="wide"`, dáta propsom)
- [ ] žiadne Hard disk→NAA hrany; zero snapshots = volume + „No FlashCopy mappings“; loading/error/empty
- Overenie: `buildVmRelationships.test.ts`, `VirtualMachineDetailPanel.test.tsx`
- Commit C3

## C4: IBM Power LPAR helper (M)
- [ ] `buildLparRelationships` (provider→LPAR, volumes podľa FlashSystemu, Volume ID/UID, FlashCopy, NPIV text bez hostu)
- [ ] `LparRelationshipHelp` + `IbmPowerDetailPanel` (iba pre LPAR)
- [ ] VIOS: žiadny nový relationship content; existujúca VIOS vetva a testy panelu bez zmeny
- Overenie: `buildLparRelationships.test.ts`, `IbmPowerDetailPanel.test.tsx` (žiadne NAA ani composite key; existujúce VIOS testy zelené)
- Commit C4

## C5: FlashSystem helper (M)
- [ ] nový prop `allProviders` cez `FlashSystemResourcesPage` → `FlashSystemInventoryView` → panel; `providers` si ponechá význam (FLASHCOPY providery roly)
- [ ] `buildFlashVolumeRelationships` (provider→pool→volume, hosty, CG, FlashCopy iba pri dátach, Remote Copy iba pri `RC_id` bez targetu, configured partner ako provider-level)
- [ ] `FlashVolumeRelationshipHelp` + panel
- Overenie: `buildFlashVolumeRelationships.test.ts`, `FlashSystemVolumeDetailPanel.test.tsx`, `FlashSystemInventoryView.test.tsx`
- Commit C5

## C6: Locales, cleanup, prehliadač
- [ ] wording help textov (globálna topológia → kontext), en/sk/cs, locale testy
- [ ] help shell regresia: Tab do uzlov drží help otvorený, Escape zavrie iba help, ostatné `KeyedHelpPopover` bez zmeny
- [ ] prehliadač: všetky 4 helpery, light/dark, desktop/390 px, hover/Tab, viac uzlov, problem prípad
- [ ] celá suite (cross-cutting), eslint, `npm run typecheck`, `git diff --check`
- Commit C6
