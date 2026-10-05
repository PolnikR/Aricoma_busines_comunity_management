# Todo: hybridný VMware search a virtualizácia ResourceSidebar

Spec: [recovery-group-resource-search-virtualization-spec.md](recovery-group-resource-search-virtualization-spec.md) · Plán: [recovery-group-resource-search-virtualization-plan.md](recovery-group-resource-search-virtualization-plan.md)

Baseline: necommitnutá provider-scope feature vo working tree. Nerevertovať. Bez commitu a pushu bez pokynu.

## Fáza 1: Hybridný VMware search

### Task 1: Helper `getRecoveryGroupSearchMode`
- [x] `recovery-groups/helpers/recoveryGroupSearchMode.ts` (`'client' | 'server'`, cez `resolveVmwareProviderFilter`)
- [x] Test: VMware `null`, `{ vmPrefix: '  ', vmTags: [' '] }` → `server`; prefix, tag-only, prefix + tag → `client`; `undefined` → `client`
- [x] Test: Power s prefixom, Power s tagmi, FlashSystem → `client`
- [x] `npm exec vitest run src/features/recovery-plans/recovery-groups/helpers/recoveryGroupSearchMode.test.ts`

### Task 2: Hook — provider scope + `vmwareNamePrefix`
- [x] Option `vmwareNamePrefix`, použitý iba v režime `server`, inak ignorovaný
- [x] Test fixed prefix `TEST-`: request `namePrefix: 'TEST-'`; rerender s `vmwareNamePrefix: 'DB'` → žiadny ďalší fetch
- [x] Test tag-only `WEB`: request `tag: 'WEB'` bez `namePrefix`; `vmwareNamePrefix: 'DB'` ignorovaný
- [x] Test prefix + tag: user prefix nemení request
- [x] Test unscoped: `P` → `PR` → `PROD-` → iba settled fetch `{ providerId, namePrefix: 'PROD-' }`; `isSearching` počas debounce
- [x] Test unscoped clear: `''` → `{ providerId }`, kľúč = `vmwareInventoryQuery({ providerId }).queryKey`
- [x] Test cache: `vmwareInventoryQuery({ providerId, namePrefix: 'PROD-' }).queryKey` je naplnený
- [x] Power/FlashSystem testy bez zmeny prechádzajú
- [x] `npm exec vitest run src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx src/features/discovery-inventory/resources/helpers/vmwareProviderFilter.test.ts`

### Task 3: ResourcesStep — client/server wiring + reset
- [x] `mode` z helpera; `vmwareNamePrefix` state + `searchValue`/`onSearchChange` iba pri `server`
- [x] Key obsahu `workloadType|providerId|mode`
- [x] Test fixed scope: písanie `DB` nemení argumenty hooku, lokálne zúženie, vybraná položka ostáva
- [x] Test unscoped: písanie `PROD-` → hook dostane `vmwareNamePrefix: 'PROD-'`, výsledok bez lokálneho filtra
- [x] Test Power a FlashSystem: client search, hook bez `vmwareNamePrefix`
- [x] Integračný test (reálny hook + `discoveryFetch`): A unscoped, search `PROD-` → B; žiadny fetch `{ providerId: B, namePrefix: 'PROD-' }`, search box prázdny
- [x] Test: `onMetadataAvailable` sa volá pre nový server výsledok (merge ostáva v builderi)
- [x] Integračný test server → client pri rovnakom `providerId`: A `{ vmPrefix: null, vmTags: [] }` + search `PROD-` → rerender A `{ vmPrefix: 'TEST-', vmTags: [] }`; remount, input prázdny, fetch `{ providerId: A, namePrefix: 'TEST-' }`, žiadny fetch `TEST- + PROD-` ani `{ providerId: A, namePrefix: 'PROD-' }` po prepnutí
- [x] Integračný test client → server pri rovnakom `providerId`: A `{ vmPrefix: 'TEST-' }` + lokálny search `DB` → rerender A `{ vmPrefix: null, vmTags: [] }`; remount, controlled search prázdny, počiatočná query `{ providerId: A }`, `DB` sa neprenesie
- [x] `npm exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.integration.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx`

## Checkpoint 1: hybridná VMware search logika
- [x] Testy Task 1–3 zelené
- [x] `npm run typecheck`
- [x] eslint na zmenených súboroch
- [x] Provider-scope testy (ProviderStep, Builder, hook) stále zelené
- [ ] Review s človekom

## Fáza 2: Virtualizácia

### Task 4: Závislosť + virtualizovaný `ResourceSidebar`
- [x] `npm view @tanstack/react-virtual version` (overiť 3.x) a `npm install @tanstack/react-virtual`
- [x] Stale `FetchErrorAlert` vo vnútri scroll viewportu pred spacerom (`data-testid="resource-sidebar-stale-banner"`, `pt-2`); výška (`offsetHeight` + `ResizeObserver`) = `scrollMargin`; vertikálny `p-2` scroll kontajnera nahradený `paddingStart: 8` / `paddingEnd: 8`
- [x] Ref na scroll viewport; `useVirtualizer({ count, getScrollElement, estimateSize: () => 36, gap: 4, overscan: 10, scrollMargin, paddingStart: 8, paddingEnd: 8, getItemKey, rangeExtractor })`
- [x] Positioning contract: header/search → scroll viewport (`getScrollElement()`) → [stale banner (optional)] → spacer (`position: relative`, `height: getTotalSize()`) → virtual row (`position: absolute`, `top: 0`, `left: 0`, `width: 100%`, `transform: translateY(virtualItem.start - scrollMargin)`)
- [x] Row = draggable `listitem` s `data-index` a `ref={virtualizer.measureElement}`; `key` = hodnota itemu; medzera cez `gap`, bez `mb-1`
- [x] `count = 0` mimo stavu zoznamu (skeleton, chyba, empty)
- [x] Test helper `resource-sidebar/test/mockVirtualLayout.ts` (výšky + `scrollTop` + `scroll` event)
- [x] Test (bounded viewport cez helper): 5000 položiek → `0 < listitems < 5000`, posledná nie je v DOM; po scrolle je
- [x] Test štruktúry: spacer s výškou `getTotalSize()`, riadky s `data-index` a `translateY` (bez assertu na presné pixely)
- [x] Test stale error + 5000 položiek (bounded viewport): banner je prvý element scroll viewportu pred listom; `listitem` výrazne menej ako 5000; prvé zoradené položky v DOM; `transform` riadku `data-index="0"` zhodný s renderom bez chyby; po scrolle vzdialená položka v DOM
- [x] Test vysokého bannera (2000 px): scroll o jeho výšku ukazuje `VM-0000`, `VM-0080` nie je v DOM (visible range zohľadňuje `scrollMargin`)
- [x] Test: client search (`includes`, aj label), server search bez lokálneho filtra
- [x] Test: drag data z virtualizovaného riadku, `renderItemAction`, `itemLabels` + sekundárny riadok
- [x] Test: loading, blokujúca chyba, stale banner, empty, no-match
- [x] Existujúce 4 testy bez zmeny assertov
- [x] `npm exec vitest run src/shared/components/resource-sidebar/ResourceSidebar.test.tsx`

### Task 5: Drag robustnosť, a11y a scroll reset
- [x] `draggingItem` + `rangeExtractor` (zoradené unikátne indexy)
- [x] `aria-setsize` / `aria-posinset` na riadkoch
- [x] `scrollToOffset(0)` na scroll viewporte pri zmene search textu (úplný začiatok: stale banner, potom začiatok listu)
- [x] Test: ťahaný riadok ostáva v DOM po scrolle mimo okna, po `dragEnd` nie je pinnutý
- [x] Test: `aria-setsize` = počet výsledkov, `aria-posinset` správny
- [x] Test: po zmene searchu je `scrollTop` viewportu 0 a prvá položka výsledku je v DOM, aj pri zobrazenom stale banneri
- [x] Browser: stale banner v nízkom kontajneri (`h-72`) nechá list použiteľný.
  - Superseded decision: Variant A (banner mimo viewportu) was originally planned, but browser verification at 390 px showed an unusable list height (banner 170 px, list 36 px, 0 full rows). Variant B was selected and is the implemented contract.
  - [x] Implementované (Variant B): banner vo viewporte pred listom, `scrollMargin` = výška bannera (`ResizeObserver`), riadky `translateY(start - scrollMargin)`. Testy: banner je prvý element viewportu, `transform` prvého riadku je zhodný s renderom bez chyby, banner 2000 px → scroll o jeho výšku ukazuje `VM-0000` (bez `scrollMargin` oba testy padajú).
  - [x] Browser (variant B): 390 px banner 170 px, prvý riadok 8 px pod bannerom, po odscrollovaní 4 celé riadky; 1366 px hneď 5 riadkov, po scrolle 8; offset po scrolle (banner + 400 px) ukazuje ~11. riadok; posledná položka 227/227 dosiahnuteľná.
- [x] `npm exec vitest run src/shared/components/resource-sidebar/ResourceSidebar.test.tsx`

## Checkpoint 2: virtualizácia
- [x] Sidebar testy zelené
- [x] Caller testy zelené: `RecoveryGroupResourcesStep*.test.tsx`, `RecoveryGroupBuilder.test.tsx`, `RecoveryAppBuilder.test.tsx`
- [x] `npm run typecheck`, eslint
- [ ] Review s človekom

## Fáza 3: Integrácia

### Task 6: Regresia, výkon, manuál
- [x] Opraviť iba testy callerov, ak predpokladajú render veľkého počtu riadkov v jsdom
- [x] Browser: overiť bounded/measurable viewport (computed layout, mobile aj `lg`) pre každý caller a zapísať výsledok (2026-10-05, Edge CDP 9333, tab `localhost:5173` presmerovaný cez CDP `Fetch.continueRequest` na dev server worktree `test` na `:5174`):
  - [x] `RecoveryGroupResourcesStep` hlavný: bounded. Sidebar 286 px na 390 aj na užšom desktope, list 206 px. 227 VM → 16 DOM riadkov, posledná (227/227) dosiahnuteľná, riadky 34 px + gap 4 px, bez prekrytia.
  - [x] `RecoveryGroupResourcesStep` compact related-volumes: bounded. List 206 px (390) / 270 px (1366), 8 zväzkov sa scrollujú. Akcia `+` pridá zväzok a potom je disabled.
  - [x] `RecoveryAppBuilder` (300 mock recovery groups cez proxy): **1366 px bounded**, list 334 px, 17 z 300 DOM riadkov. **390 px unbounded**: bunka ani viewport nemajú výšku, list narastie na 15 912 px a renderuje všetkých 300 riadkov. Funkčné, bez úspory. Toto správanie existovalo už pred zmenou, stránka rastie.
  - [x] `TopologyPreview` VM krok (`h-72 … lg:h-full`): statické 3 VM, výška `h-72` / `lg:h-full`.
  - [x] `TopologyPreview` volumes krok (`h-64 … lg:h-auto`): 390 px bounded (`h-64`). Na `lg` výšku určuje riadok gridu podľa obsahu. Prototyp so 4 statickými zväzkami, v praxi bez dopadu.
- [x] Pre caller bez vhodného viewportu zvoliť a zapísať (a) bounded height / layout constraint alebo (b) bez virtualizácie pre daný caller (riešenie (b) najprv odsúhlasiť)
  - [x] `RecoveryAppBuilder`: človek zvolil **(a)**. Bunka sidebaru `h-72 … lg:h-auto`. Browser s 300 mock groups: 390 px bunka 287 px bez vonkajšieho scrollu, list 206 px, 14 DOM riadkov; 1366 px bez zmeny (334 px, 17 riadkov).
  - [x] `TopologyPreview`: prototyp so statickými 3–4 položkami, bez zmeny.
- [x] Focused Vitest podľa sekcie Validácia v pláne
- [x] `npm run typecheck`
- [x] `node scripts/orval/check-feature-layout.mjs`
- [x] `npx eslint <zmenené .ts/.tsx>`
- [x] `git diff --check` (nové súbory cez `git add -N`, potom `git reset`)
- [x] Manuál VMware fixed scope: provider `vmware-vcenter-01` → `POST /api/vms/search?provider_id=vmware-vcenter-01 {"tag":"WEB","name_prefix":"TEST-"}`; písanie `D`, `DB` bez requestu; zoznam `TEST-WEB01`, `TEST-WEB02` → lokálne 0. Pri navigácii z Resources stránky sa použila spoločná cache (žiadny request).
- [x] Manuál VMware bez scope: provider `vmware-vcenter-03` → `{}`; `P` → `PR` → `PROD-` → jediný request `{"name_prefix":"PROD-"}`; počas debounce skeleton; vymazanie → provider-only výsledok z cache bez requestu.
- [x] Manuál virtualizácia: reálnych 227 VM a 300 mock groups; DOM 16–17 riadkov v bounded viewporte; drag z virtualizovaného riadku do výberu (drag data aj pridanie) a compact `+` fungujú.
- [x] Manuál network: unscoped počiatočný response `vmware-vcenter-03` je celý inventory (227 VM) a zmenší sa až server searchom.
- [x] Prehliadač: Edge CDP 9333, prihlásenie používateľom. Keycloak povoľuje iba `http://localhost:5173/` a ten port drží spike dev server, preto tab cez CDP presmeruje requesty na `:5174` (spike server nezmenený).
- [x] Potvrdiť: žiadne zmeny backend/OpenAPI/generated/provider create-edit/provider-card Variant A/Resources

## Checkpoint 3: finálna integrácia
- [x] Všetky acceptance criteria zo spec §20 splnené (§10c/10d podľa variantu B)
- [x] DoD: veľký unscoped VMware response môže zostať celý v pamäti; DOM však neobsahuje celý dataset naraz, ak je k dispozícii bounded viewport
- [x] DoD: virtualizácia nie je náhrada pagination; pagination, lazy loading a infinite query ostávajú mimo scope
- [x] DoD: viewport každého callera overený, rozhodnutia (a)/(b) zapísané
- [x] DoD: testy server ↔ client pri rovnakom provideri zelené
- [ ] Review s človekom; commit iba na pokyn
