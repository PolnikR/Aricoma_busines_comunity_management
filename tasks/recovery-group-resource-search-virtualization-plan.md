# Implementačný plán: hybridný VMware search a virtualizácia ResourceSidebar

Spec: [recovery-group-resource-search-virtualization-spec.md](recovery-group-resource-search-virtualization-spec.md). Checklist: [recovery-group-resource-search-virtualization-todo.md](recovery-group-resource-search-virtualization-todo.md).

Baseline je necommitnutá provider-scope feature vo working tree (`test`). Nesmie sa revertovať. Historický [recovery-group-vm-server-search-plan.md](recovery-group-vm-server-search-plan.md) slúži iba ako zdroj pôvodného správania.

## Prehľad

1. VMware user search sa stane hybridným: pri fixed provider scope (`resolveVmwareProviderFilter(...).isFixed`) ostáva client-side nad scoped datasetom, bez scope sa vracia pôvodný server-side `name_prefix` cez existujúci debounce.
2. Shared `ResourceSidebar` dostane virtualizované renderovanie cez `@tanstack/react-virtual` bez zmeny search sémantiky a drag & drop.

## Overený stav (working tree)

| Oblasť | Zistenie |
|---|---|
| `ResourceSidebar.tsx` | `isServerSearch = searchValue !== undefined && onSearchChange !== undefined`. Dedupe + `sort()` → client `includes` (item alebo label) / server bez filtra → `filteredItems.map`. Riadok: `role="listitem"`, `draggable`, `setData(dragDataKey, item)`, `mb-1`, `p-2` alebo pri `renderItemAction` `flex min-h-9 px-2 py-1`, `break-words` názov + voliteľný `font-mono text-[10px]` sekundárny riadok. Scroll kontajner `custom-scrollbar min-h-0 flex-1 overflow-y-auto p-2` s `aria-busy`. Stavy: skeleton → blokujúca chyba → stale banner → empty/no-match → list. |
| Callers | `RecoveryGroupResourcesStep` (hlavný: VMware/Power/FlashSystem; compact related-volumes: FlashSystem, `renderItemAction`), `RecoveryAppBuilder` (`itemLabels`, obalený vlastným `overflow-y-auto`), `prototype/TopologyPreview` (2×, statické dáta, jeden kontajner `lg:h-auto`). |
| Testy sidebaru | 4 testy: loading, dedupe/sort/filter/drag, server-search loading, server bez lokálneho filtra. Caller testy: `RecoveryGroupResourcesStep.test.tsx`, `RecoveryGroupBuilder.test.tsx`, `RecoveryAppBuilder.test.tsx`. |
| Závislosti | `@tanstack/react-virtual` chýba (`package.json`, `node_modules/@tanstack` = `query-core`, `react-query`). |
| jsdom | Žiadny `ResizeObserver` ani layout polyfill v `src/test-utils/setup.ts`. |
| Recovery Group step | Keyed `workloadType\|providerId`. Hook dostáva `{ providerScope }`. Sidebar je vždy v client režime. |

## Architektonické rozhodnutia

1. **Rozhodnutie o režime na jednom mieste.** Nový pure helper `getRecoveryGroupSearchMode(workloadType, providerScope): 'client' | 'server'` v `recovery-groups/helpers/`. Vracia `'server'` iba pre VMware so známym scope (`providerScope !== undefined`) a `!resolveVmwareProviderFilter(providerScope).isFixed`. Používa ho step (wiring) aj hook (obranná kontrola), takže pravidlo nie je duplikované.
2. **Hook options:** `{ providerScope?, vmwareNamePrefix?, enabled? }`.
   - VMware fixed: `namePrefix = filter.prefix`, `tag = filter.tag`, `vmwareNamePrefix` sa ignoruje.
   - VMware unscoped: `namePrefix = vmwareNamePrefix`.
   - Debounce ostáva výhradne v `useVmwareResourceInventory`.
3. **Step drží search state iba v server režime.** `RecoveryGroupResourcesStep` drží `vmwareNamePrefix` a posiela `searchValue`/`onSearchChange` len pri `mode === 'server'`. Inak sidebar použije vlastný client search. Nový `searchMode` prop v sidebari nevzniká, existujúci contract stačí (spec §11).
4. **Reset cez key.** Key obsahu stepu sa rozšíri na `workloadType|providerId|mode`. Zmena providera aj zmena režimu remountuje obsah, takže sa nepridáva iný reset mechanizmus. Transient `B + PROD-` nevzniká už dnes (key + `providerChanged` v debounce). Overí to integračný test.
5. **Virtualizácia: `@tanstack/react-virtual`** (porovnanie nižšie).
   - `useVirtualizer` so scroll elementom = existujúci `overflow-y-auto` div.
   - `count = filteredItems.length`, iba v stave zoznamu (inak 0).
   - `getItemKey = index => filteredItems[index]`.
   - **Dynamické meranie**: `measureElement` + `data-index` na riadku. Fixed height nestačí, lebo výška riadku sa líši podľa obsahu:
     - jednoriadkový riadok: `p-2` + `text-xs` (16 px) + border ≈ 34 px;
     - riadok s `renderItemAction`: `min-h-9` = 36 px;
     - `itemLabels` sekundárny riadok pridáva ≈ 18 px;
     - `break-words` zalamuje dlhé názvy.
   - `estimateSize = () => 36`, `gap: 4` namiesto `mb-1` (margin sa do merania nezapočíta), `overscan: 10`.
   - **Stale banner offset: banner vo viewporte + `scrollMargin`** (spec §10). Stale banner je vo vnútri scroll viewportu pred spacerom a pri scrolle odíde s obsahom. Jeho výška (`offsetHeight` + `ResizeObserver`) je `scrollMargin` virtualizera. Riadky `translateY(virtualItem.start - scrollMargin)`. Vertikálny padding listu cez `paddingStart`/`paddingEnd: 8`.
     - Superseded decision: Variant A (banner mimo viewportu) was originally planned, but browser verification at 390 px showed an unusable list height (36 px). Variant B was selected and is the implemented contract.
   - Positioning contract (spec §10): header/search → scroll viewport (`getScrollElement()`) → [stale banner (optional)] → spacer (`role="list"`, `position: relative`, `height: getTotalSize()`) → virtual row (`position: absolute`, `top: 0`, `left: 0`, `width: 100%`, `transform: translateY(virtualItem.start - scrollMargin)`, `data-index`, `ref={virtualizer.measureElement}`). `key` = hodnota itemu. Medzeru rieši `gap`, nie margin.
   - **Bounded viewport je podmienka.** Virtualizácia je garantovaná iba pri ohraničenom, merateľnom scroll viewporte. Nepredpokladá sa automatická degradácia na render všetkých položiek pri `height: auto`. Pre caller bez vhodného viewportu sa po browser overení zvolí bounded height alebo vypnutie virtualizácie pre daný caller (Task 6).
5a. **Virtualizácia ≠ sieťová optimalizácia.** Virtualization optimalizuje DOM/React rendering, neznižuje veľkosť backend response. Unscoped VMware load (napr. 8000 VM) ostáva celý v JS datasete. Response sa zmenší až server searchom (`name_prefix`). Pagination, lazy loading a infinite query ostávajú mimo scope.
6. **Drag.** Draggable je samotný virtualizovaný riadok, bez wrappera. `draggingItem` state (`dragstart`/`dragend`) a `rangeExtractor` udrží jeho index v renderovanom rozsahu.
7. **A11y a scroll reset.** `aria-setsize`/`aria-posinset` na riadkoch. Pri zmene search textu `scrollToOffset(0)` nastaví scroll viewport na úplný začiatok: pri stale chybe najprv banner, hneď pod ním začiatok listu; bez bannera priamo začiatok listu.
8. **Testy virtualizácie.** Opt-in helper `src/shared/components/resource-sidebar/test/mockVirtualLayout.ts` (stub `offsetHeight`/`offsetWidth` scroll viewportu, riadkov a stale bannera; `scrollTop`/`scrollTo` + `scroll` event). Bez globálnych polyfillov v `setup.ts`. Testy neviažu presný počet riadkov.

### Porovnanie virtualizácie

| Možnosť | Za | Proti | Verdikt |
|---|---|---|---|
| A. `@tanstack/react-virtual` | Headless, už používame TanStack (Query). Dynamické meranie (`measureElement`), `gap`, `rangeExtractor`, `getItemKey`. Malá závislosť bez štýlov. | Nová závislosť. jsdom potrebuje layout stub v testoch. | **Odporúčané** |
| B. Vlastná virtualizácia | Bez závislosti. | Variabilná výška vyžaduje vlastné meranie, ResizeObserver a korekcie scrollu. Vysoké riziko chýb v shared komponente. | Neprimeraná zložitosť |
| C. Bez virtualizácie, iba optimalizácia searchu (memo, `content-visibility: auto`) | Žiadna nová závislosť. | Search je už lacný (`includes`). React stále vytvorí N DOM nodov. `content-visibility` šetrí iba layout/paint, nie DOM ani render. | Nerieši cieľ |

## Task list

### Fáza 1: Hybridný VMware search
- [ ] Task 1: Helper `getRecoveryGroupSearchMode`
- [ ] Task 2: Hook — provider scope + voliteľný user server prefix
- [ ] Task 3: ResourcesStep — podmienené client/server wiring + reset

### Checkpoint 1: hybridná logika

### Fáza 2: Virtualizácia
- [ ] Task 4: Závislosť + virtualizované renderovanie `ResourceSidebar`
- [ ] Task 5: Drag robustnosť + a11y atribúty + scroll reset

### Checkpoint 2: virtualizácia

### Fáza 3: Integrácia
- [ ] Task 6: Regresia callerov, výkon a manuálna kontrola

### Checkpoint 3: finálna integrácia

---

## Task 1: Helper `getRecoveryGroupSearchMode`

**Popis:** Pure funkcia, ktorá z `workloadType` a `providerScope` (`RecoveryGroupProviderScope | null | undefined`) vráti `'client' | 'server'`. Normalizácia ide cez `resolveVmwareProviderFilter`.

**Acceptance criteria:**
- VMware: `null` alebo prázdny/whitespace scope → `'server'`. Prefix, tag-only alebo prefix + tag → `'client'`. `undefined` → `'client'`.
- Power a FlashSystem vždy `'client'`, aj s prefixom alebo tagmi.

**Závislosti:** žiadne · **Súbory:** `recovery-groups/helpers/recoveryGroupSearchMode.ts` + `.test.ts` · **Testy:** `npm exec vitest run src/features/recovery-plans/recovery-groups/helpers/recoveryGroupSearchMode.test.ts` · **Rozsah:** XS · **Riziko:** nízke.

## Task 2: Hook — provider scope + voliteľný user server prefix

**Popis:** `useRecoveryGroupResourceInventory` prijme `vmwareNamePrefix?: string`. Pri VMware režime `'server'` ho pošle ako `namePrefix`. Pri fixed scope ho ignoruje a pošle fixed `prefix`/`tag`. `isSearching` ostáva `isDebouncing || isBackgroundFetching`.

**Acceptance criteria:**
- Fixed prefix, tag-only aj prefix + tag: request nesie iba provider scope bez ohľadu na `vmwareNamePrefix` (rerender s `'DB'` nespustí nový fetch).
- Unscoped: rerendery `P`, `PR`, `PROD-` vytvoria iba settled fetch `{ providerId, namePrefix: 'PROD-' }`. `isSearching` je `true` počas debounce. Návrat na `''` použije `{ providerId }` a ten istý kľúč ako `vmwareInventoryQuery({ providerId })`.
- Cache kľúče = `vmwareInventoryQuery(input).queryKey`. Power a FlashSystem sú bez zmeny.

**Závislosti:** Task 1 · **Súbory:** `hooks/useRecoveryGroupResourceInventory.ts` + `.test.tsx` · **Testy:** `npm exec vitest run src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx src/features/discovery-inventory/resources/helpers/vmwareProviderFilter.test.ts` · **Rozsah:** S · **Riziko:** stredné. Pri fixed prefixe sa namePrefix z providera tiež debounceuje pri mounte (existujúce správanie). Testy musia použiť `waitFor` s timeoutom.

## Task 3: ResourcesStep — podmienené client/server wiring + reset

**Popis:** Step vypočíta `mode` cez helper.
- V režime `'server'` drží `vmwareNamePrefix`, posiela ho hooku a posiela `searchValue`/`onSearchChange` sidebaru.
- V režime `'client'` neposiela nič navyše.
- Key obsahu je `workloadType|providerId|mode`.
- Integračný test s reálnym hookom a `discoveryFetch` overí provider change.

**Acceptance criteria:**
- Fixed scope: písanie `DB` nemení argumenty hooku, zoznam sa zúži lokálne a vybraná položka ostáva v pravom paneli.
- Unscoped: písanie `PROD-` sa pošle hooku a server výsledok sa lokálne nefiltruje. Prepnutie providera A (search `PROD-`) → B neposlalo žiadny request `B + PROD-` a search box je prázdny.
- Power a FlashSystem ostávajú client. `onMetadataAvailable` sa volá pre každý nový výsledok (merge v builderi bez zmeny).
- **Zmena režimu pri rovnakom `providerId`** (integračný test s reálnym hookom, rerender s novým `providerScope`):
  - *server → client:* A `{ vmPrefix: null, vmTags: [] }`, search `PROD-` → A `{ vmPrefix: 'TEST-', vmTags: [] }`. Očakávané: remount, input prázdny, fetch `{ providerId: A, namePrefix: 'TEST-' }`, žiadny fetch `TEST- + PROD-` ani `{ providerId: A, namePrefix: 'PROD-' }` po prepnutí.
  - *client → server:* A `{ vmPrefix: 'TEST-' }`, lokálny search `DB` → A `{ vmPrefix: null, vmTags: [] }`. Očakávané: remount, controlled search prázdny, počiatočná query `{ providerId: A }`, `DB` sa neprenesie.
  - Key s `mode` ostáva riešením. Architektúra sa kvôli testu nemení.

**Závislosti:** Task 1, Task 2 · **Súbory:** `components/RecoveryGroupResourcesStep.tsx`, `RecoveryGroupResourcesStep.test.tsx`, nový `RecoveryGroupResourcesStep.integration.test.tsx`, prípadne `RecoveryGroupBuilder.test.tsx` · **Testy:** `npm exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.integration.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx` · **Rozsah:** M · **Riziko:** stredné. Integračný test potrebuje QueryClient wrapper a fetch double z `discovery-inventory/resources/test/discoveryFetch`.

## Task 4: Závislosť + virtualizované renderovanie `ResourceSidebar`

**Popis:**
- Nainštalovať `@tanstack/react-virtual` (aktuálna 3.x, `npm install @tanstack/react-virtual`). Aktualizujú sa `package.json` a `package-lock.json`.
- V sidebari: ref na scroll viewport, `useVirtualizer` (count, `getScrollElement`, `estimateSize: () => 36`, `gap: 4`, `overscan: 10`, `scrollMargin` = výška stale bannera, `paddingStart: 8`, `paddingEnd: 8`, `getItemKey`).
- Stale `FetchErrorAlert` ostáva vo vnútri scroll viewportu pred spacerom (`data-testid="resource-sidebar-stale-banner"`, `pt-2`). Jeho výška sa meria (`offsetHeight` + `ResizeObserver`) a je `scrollMargin`. Vertikálny `p-2` scroll kontajnera nahradia `paddingStart`/`paddingEnd`, horizontálny padding ostáva.
- Layout presne podľa positioning contractu:

  ```tsx
  ResourceSidebar
    header / search               // bez zmeny
    scroll viewport               // overflow-y-auto px-2, aria-busy = getScrollElement()
      ├─ stale banner (optional)  // pt-2; nameraná výška = scrollMargin
      └─ spacer                   // position: relative; height: virtualizer.getTotalSize()
           └─ virtual row         // position: absolute; top: 0; left: 0; width: 100%;
                                  // transform: translateY(virtualItem.start - scrollMargin)
                                  // data-index, ref={virtualizer.measureElement}, key = item
  ```

  - Pred spacerom je vo viewporte iba voliteľný stale banner. Skeleton, blokujúca chyba a empty sa renderujú vo viewporte namiesto spaceru.
  - Spacer je positioning context.
  - Row je samotný draggable `listitem`.
  - Medzera cez `gap`, nie `margin-bottom`.
  - Konkrétne triedy sa zvolia pri implementácii.
- Odstrániť `mb-1` z riadku. Vizuál riadku je inak bez zmeny. Pridať test helper pre layout.

**Acceptance criteria:**
- 5000 položiek v bounded viewporte (helper): renderuje sa `0 < n < 5000` listitemov, posledná položka nie je v DOM. Po scrolle na koniec je v DOM.
- Riadky majú `data-index`, absolútnu pozíciu s `translateY` a spacer má výšku `getTotalSize()` (assert na štruktúru, nie na pixely).
- **Stale error + 5000 položiek** (bounded viewport cez helper, `error` + predchádzajúce `items`):
  - banner je prvý element scroll viewportu, priamo pred listom;
  - `listitem` je výrazne menej ako 5000;
  - prvé zoradené položky sú v DOM;
  - `transform` riadku `data-index="0"` je zhodný s renderom bez chyby (žiadny posun o banner);
  - po scrolle je vzdialená položka v DOM;
  - pri banneri 2000 px scroll o jeho výšku ukazuje `VM-0000` (visible range zohľadňuje `scrollMargin`).
- Všetky 4 existujúce testy sidebaru prechádzajú bez zmeny assertov. Pribudnú testy pre client search, server search (bez lokálneho filtra), drag data, `renderItemAction`, `itemLabels` (label + sekundárny riadok), loading/error/stale/empty/no-match.
- Search sémantika a poradie (dedupe + `sort()`) sú nezmenené.

**Závislosti:** žiadne (paralelne s Fázou 1) · **Súbory:** `package.json`, `package-lock.json`, `ResourceSidebar.tsx`, `ResourceSidebar.test.tsx`, `resource-sidebar/test/mockVirtualLayout.ts` · **Testy:** `npm exec vitest run src/shared/components/resource-sidebar/ResourceSidebar.test.tsx` · **Rozsah:** M · **Riziká:**
- jsdom bez layoutu (helper);
- `gap` vs. margin;
- dynamické meranie v jsdom vracia 0 (helper stubuje `offsetHeight` riadkov, viewportu a bannera);
- nová závislosť si vyžaduje schválenie (týmto plánom).

## Task 5: Drag robustnosť + a11y atribúty + scroll reset

**Popis:**
- `draggingItem` state na `dragstart`/`dragend` a `rangeExtractor`, ktorý pridá index ťahanej položky.
- `aria-setsize`/`aria-posinset` na riadkoch.
- `scrollToOffset(0)` na scroll viewporte pri zmene aktuálneho search textu (úplný začiatok: banner, potom začiatok listu).

**Acceptance criteria:**
- Po `dragStart` na riadku a scrolle mimo jeho okna ostáva riadok v DOM s rovnakými drag dátami. Po `dragEnd` sa môže odmountovať.
- Renderované riadky majú `aria-setsize = filteredItems.length` a správny `aria-posinset`.
- Po zmene search textu je `scrollTop` viewportu 0 a prvá položka výsledku je v DOM, aj pri zobrazenom stale banneri.

**Závislosti:** Task 4 · **Súbory:** `ResourceSidebar.tsx`, `ResourceSidebar.test.tsx` · **Testy:** ako Task 4 · **Rozsah:** S · **Riziko:** nízke až stredné. `rangeExtractor` musí vracať zoradené unikátne indexy (`defaultRangeExtractor` + index).

## Task 6: Regresia callerov, výkon a manuálna kontrola

**Popis:**
- Spustiť caller testy. Ak niektorý test predpokladá render veľkého počtu riadkov v jsdom, upraviť iba test (použiť helper). Produkčné správanie callerov sa nemení.
- **Overiť viewport každého callera v browseri** (computed layout, mobile aj `lg`): `RecoveryGroupResourcesStep` hlavný, compact related-volumes, `RecoveryAppBuilder` a `TopologyPreview` (oba výskyty).
  - `RecoveryAppBuilder`: bounded viewport overiť podľa reálneho computed layoutu (`h-full min-h-[480px]` → `min-h-0 flex-1 overflow-hidden` → bunka `overflow-y-auto`). Automatickú degradáciu nepredpokladať a skontrolovať dvojitý scroll kontajner.
  - `TopologyPreview` volumes krok (`h-64 … lg:h-auto`) explicitne vyžaduje browser verification.
  - Pre caller bez bounded viewportu zvoliť (a) doplnenie bounded height / layout constraint alebo (b) nepoužitie virtualizácie pre daný caller. Rozhodnutie zapísať do todo s dôvodom.
- Manuálna browser/network kontrola podľa todo.

**Výsledok (2026-10-05):** RecoveryGroupResourcesStep (hlavný aj compact) bounded, bez zmeny. `RecoveryAppBuilder` bol na mobile unbounded (300 groups → 300 DOM riadkov), rozhodnutie (a): bunka sidebaru `h-72 lg:h-auto`, teda bounded/measurable viewport na mobile pre virtualizáciu a `lg` bez zmeny. `TopologyPreview` bez zmeny: prototyp s malým statickým datasetom.

**Acceptance criteria:**
- Každý caller má zdokumentovaný výsledok overenia viewportu a prípadné rozhodnutie (a)/(b).
- Focused testy, `npm run typecheck`, `node scripts/orval/check-feature-layout.mjs`, focused eslint a `git diff --check` prechádzajú.
- Manuálna kontrola (VMware fixed, VMware unscoped, virtualizácia) je zdokumentovaná v todo. Ak prehliadač nie je dostupný, je to explicitne uvedené.
- Žiadne zmeny backendu, OpenAPI, generated, provider create/edit, provider-card Variant A ani Resources.

**Závislosti:** Task 3, Task 5 · **Súbory:** testy callerov (`RecoveryAppBuilder.test.tsx`, `RecoveryGroupResourcesStep*.test.tsx`, `RecoveryGroupBuilder.test.tsx`) iba ak treba. Layout callera (`TopologyPreview.tsx`, `RecoveryAppBuilder.tsx`) iba pri rozhodnutí (a). Pri rozhodnutí (b) sa riešenie (napr. opt-out prop) najprv odsúhlasí s človekom · **Testy:** pozri Validácia · **Rozsah:** S až M (podľa výsledku overenia) · **Riziko:** caller bez merateľného viewportu môže renderovať nesprávny rozsah. Mitigácia: browser overenie a rozhodnutie (a)/(b) pred dokončením.

## Validácia

```powershell
npm exec vitest run `
  src/shared/components/resource-sidebar/ResourceSidebar.test.tsx `
  src/features/recovery-plans/recovery-groups/helpers/recoveryGroupSearchMode.test.ts `
  src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.test.tsx `
  src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.integration.test.tsx `
  src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx `
  src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx `
  src/features/recovery-plans/recovery-groups/components/RecoveryGroupProviderStep.test.tsx `
  src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx `
  src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx `
  src/features/discovery-inventory/resources/helpers/vmwareProviderFilter.test.ts `
  src/features/discovery-inventory/resources/model/inventoryQueries.test.ts
npm run typecheck
node scripts/orval/check-feature-layout.mjs
npx eslint <zmenené .ts/.tsx>
git diff --check
```

Celá test suite a production build sa nespúšťajú (CLAUDE.md §5).

## Definition of Done

- Všetky acceptance criteria spec §20 sú splnené a validácia vyššie prechádza.
- Veľký unscoped VMware response môže zostať celý v pamäti.
- DOM však nesmie obsahovať celý dataset naraz, ak je k dispozícii bounded viewport.
- Virtualizácia nie je považovaná za náhradu pagination. Pagination ostáva mimo scope.
- Viewport každého callera je overený v browseri. Kde chýba, je zdokumentované rozhodnutie bounded height / vypnutie virtualizácie.
- Zmena režimu pri rovnakom provideri (server ↔ client) je pokrytá testami.
- Stale banner neposúva súradnice virtualizera (variant B cez `scrollMargin`) a testy stale error + 5000 položiek a vysokého bannera sú zelené.

## Riziká a mitigácie

| Riziko | Dopad | Mitigácia |
|---|---|---|
| Unscoped VMware provider: prvé načítanie je stále celý inventory (8000 VM), lebo backend nestránkuje. | Stredný | Akceptované. Virtualizácia rieši iba DOM/React rendering, nie veľkosť response. Response zmenší až server search (`name_prefix`). Pagination, lazy loading a infinite query sú mimo scope (spec §10, §19). |
| Element alebo padding pred spacerom posunie visible range (stale banner, `p-2`). | Stredný | Výška bannera ako `scrollMargin`, riadky `translateY(start - scrollMargin)`, padding cez `paddingStart`/`paddingEnd`. Testy stale error + 5000 položiek a banner 2000 px. |
| Stale banner zmenší list v nízkom kontajneri (`h-72`). | Vyriešené | Banner vo viewporte pri scrolle odíde (browser 390 px: po odscrollovaní 4 celé riadky). Pôvodný Variant A s bannerom mimo viewportu nechal listu 36 px a bol zamietnutý. |
| `RecoveryAppBuilder` na mobile bez ohraničenej výšky. | Nastalo | Browser: 300 riadkov, list 15 912 px. Na rozhodnutie človeka (a): bunka `h-72 lg:h-auto`. |
| Caller bez bounded/measurable viewportu (`height: auto`). | Stredný | Žiadny predpoklad automatickej degradácie. Browser overenie v Task 6, potom bounded height alebo vypnutie virtualizácie pre caller. |
| jsdom bez layoutu → virtualizer nerenderuje žiadny riadok (`outerSize === 0`). | Stredný | Opt-in layout helper, použitý v sidebar testoch a v testoch callerov, ktoré overujú riadky. Bez globálneho polyfillu. |
| Režim sa zmení pri tom istom provideri (provider record neskôr, refetch zmení scope). | Nízky | Key obsahu obsahuje `mode` a vynúti remount. |
| Fokus na akčnom tlačidle sa stratí po odscrollovaní. | Nízky | Akceptované a zdokumentované (spec §13). |
| Scroll počas drag odmountuje zdrojový riadok. | Nízky | `rangeExtractor` udrží ťahaný riadok. |
| Zmena režimu pri rovnakom providerovi prenesie starý search. | Stredný | Key `workloadType\|providerId\|mode`. Testy server → client a client → server v Task 3. |

## Otvorené otázky

Žiadne blokujúce.
