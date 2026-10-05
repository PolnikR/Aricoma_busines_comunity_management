# Spec: hybridný VMware search a virtualizácia ResourceSidebar

Stav: návrh na review. Baseline je **aktuálny working tree na vetve `test`** (necommitnutá provider-scope feature podľa [recovery-group-provider-scope-plan.md](recovery-group-provider-scope-plan.md)), nie HEAD.

Spec pokrýva dve nezávisle testovateľné schopnosti v jednom dokumente (na želanie používateľa):

| Id | Schopnosť | Závisí od |
|---|---|---|
| `hybrid-vmware-search` | Rozhodnutie server/client search pre VMware v Recovery Group Resources | provider-scope baseline |
| `sidebar-virtualization` | Virtualizované renderovanie zoznamu v shared `ResourceSidebar` | — (nezávislé, iba spoločný komponent) |

Poradie implementácie: `hybrid-vmware-search` → `sidebar-virtualization` → integrácia.

## Predpoklady

1. `/vms/search` nemá stránkovanie (`VmSearchFilter`: `folder_name`, `tag`, `name_prefix`, `force_refresh`). Pagination je backendová schopnosť, ktorú virtualizácia nenahrádza.
2. Power inventory endpoint nemá name search ani tagy (`powerPartition.gen.ts` neobsahuje tag pole).
3. `@tanstack/react-virtual` nie je v `package.json` ani v `node_modules/@tanstack` (sú tam iba `query-core`, `react-query`). Overené.
4. Test prostredie je jsdom bez layoutu a bez `ResizeObserver` (`src/test-utils/setup.ts` nič nepolyfilluje).

---

## 1. Problem statement

1. Provider-scope feature (working tree) odstránila VMware server-side user search. Pre VMware providera **bez** fixed scope to znamená: načítať celý inventory providera (napr. 8000 VM) a každý search robiť iba lokálne. To je regresia oproti pôvodnému server-search flow.
2. Aj správne ohraničený inventory môže mať tisíce položiek. `ResourceSidebar` renderuje `filteredItems.map(...)`, teda DOM node pre každú položku.

## 2. Aktuálny working-tree behavior

- `RecoveryGroupBuilder` dohľadá `selectedProvider` v `providers` a hlavnému `RecoveryGroupResourcesStep` pošle `providerScope = { vmPrefix, vmTags }`, alebo nič, kým provider record nie je známy.
- `RecoveryGroupResourcesStep` (keyed `workloadType|providerId`) volá `useRecoveryGroupResourceInventory(workloadType, providerId, { providerScope })` a **nikdy** neposiela `searchValue`/`onSearchChange`. `ResourceSidebar` je preto pre všetky workloady v client režime.
- `useRecoveryGroupResourceInventory`:
  - VMware: `resolveVmwareProviderFilter(providerScope)` → `namePrefix`/`tag` do `useVmwareResourceInventory`.
  - Power: lokálny filter `partitionName.startsWith(trimmedPrefix)` v `select`.
  - `providerScope === undefined` → VM query disabled.
  - Option `vmwareNamePrefix` neexistuje.
- `isSearching` pre VMware = `isDebouncing || isBackgroundFetching`, pre ostatné `false`.

## 3. Predchádzajúci VMware server-search behavior (HEAD pred provider-scope)

```text
ResourceSidebar searchValue/onSearchChange (controlled)
  → RecoveryGroupResourcesStep state vmwareNamePrefix
  → useRecoveryGroupResourceInventory({ vmwareNamePrefix })
  → useVmwareResourceInventory({ providerId, namePrefix })   // 300 ms debounce, placeholderData pre rovnaký provider
  → vmwareInventoryQuery → getPostVmsSearchQueryKey → POST /vms/search?provider_id=… { name_prefix }
```

Pôvodné kritériá, ktoré sa obnovujú:
- počas debounce a počas výmeny výsledku `isSearching = true` (sidebar zobrazí skeleton, input ostáva enabled);
- server výsledok sa lokálne nefiltruje;
- zmena providera vynuluje search text.

## 4. Provider-scope behavior (baseline, ostáva)

- Provider-card Variant A chipy na provider karte bez zmeny (iné rozhodnutie ako stale banner).
- VMware fixed scope: `resolveVmwareProviderFilter` (trim prefix, prvý neprázdny tag) → server `name_prefix` + `tag`.
- Power: `vmPrefix` sa uplatní lokálne, `vmTags` sa ignorujú.
- Uložený výber pri edite sa nepruneuje. `providerScope === undefined` → VM inventory sa nenačíta.

## 5. Hybridná decision matrix

```text
VMware selected provider
        |
        v
resolveVmwareProviderFilter(providerScope)
        |
     isFixed?
      /    \
    YES     NO
     |       |
server      server query podľa
fixed       user search prefix
scope       cez existing debounce
     |
client-side
search v už
scoped datasete
```

| Workload / provider | Provider scope | User search | Rendering |
|---|---|---|---|
| VMware s prefix a/alebo tag scope (`isFixed`) | server (`name_prefix`/`tag` z providera) | client-side v scoped datasete | virtualized |
| VMware bez scope (`!isFixed`) | server provider-only query | server-side `name_prefix` (300 ms debounce) | virtualized |
| VMware, provider record ešte neznámy (`providerScope === undefined`) | — (query disabled) | client režim, prázdny zoznam | virtualized |
| IBM Power s prefixom | lokálny fixed `startsWith` | client-side | virtualized |
| IBM Power bez prefixu | celý provider inventory | client-side | virtualized |
| FlashSystem (hlavný aj related-volumes krok) | existujúci inventory | client-side | virtualized |

„virtualized“ platí za podmienky bounded/measurable viewportu callera (sekcia 10, 18).

Rozdiel oproti zadanej tabuľke je jediný: riadok „provider record neznámy“, ktorý vyplýva z baseline (query disabled). V tomto stave nie je čo hľadať, preto client režim. Po dohľadaní providera sa režim určí podľa `isFixed` (pozri sekciu 16).

## 6. VMware scoped search (CASE A, `isFixed === true`)

- Request: `{ providerId, namePrefix?: filter.prefix, tag?: filter.tag }`. Tag-only provider je tiež fixed.
- `ResourceSidebar` dostane **bez** `searchValue`/`onSearchChange`, takže filtruje lokálne: case-insensitive `includes` nad `items` (a `itemLabels`).
- User search nikdy nezmení `namePrefix` ani `tag` a nespustí nový VMware request.
- Aj keby sa hooku omylom poslal `vmwareNamePrefix`, pri `isFixed` sa ignoruje (obranná kontrola v hooku).

## 7. VMware unscoped server search (CASE B, `isFixed === false`)

- Prázdny search: `{ providerId }`, teda canonical provider-only query (dnešné správanie).
- `ResourceSidebar` dostane `searchValue`/`onSearchChange`. Raw text ide do `vmwareNamePrefix` → `useVmwareResourceInventory({ providerId, namePrefix })`.
- Existujúci 300 ms debounce. Request ide iba so settled hodnotou: `P`, `PR`, `PROD-` → jediný request `{ providerId, namePrefix: 'PROD-' }`.
- Vymazanie searchu → späť `{ providerId }` (cache hit, ak existuje).
- Žiadny nový debounce, wrapper ani minimum-character pravidlo.
  - Budúce odporúčanie, nie scope: minimálny počet znakov alebo backend pagination.

## 8. IBM Power

- Request `powerInventoryQuery(providerId)` bez zmeny. Lokálny `startsWith(trimmedPrefix)`, ak je prefix.
- User search vždy client-side v `ResourceSidebar`. `vmTags` sa nefakeujú.

## 9. FlashSystem

Existujúci inventory a client-side search, v hlavnom aj v compact related-volumes kroku. Žiadny server search.

## 10. Virtualization goals / non-goals

**Ciele:** pri N položkách (napr. 5000) ostáva celý dataset v JS, ale v DOM sú iba viditeľné riadky + overscan. Plynulý scroll. Menej React renderingu pri veľkých client výsledkoch.

**Pravidlo:**

```text
Virtualization optimalizuje DOM/React rendering.
Virtualization neznižuje veľkosť backend response.
```

Príklad VMware providera bez scope:

```text
providerId
→ backend vráti napr. 8000 VM
→ všetkých 8000 objektov je v JS datasete
→ virtualizer vyrenderuje iba viditeľné rows + overscan
```

- Takýto počiatočný load ostáva veľký. Je to akceptované.
- Backend response sa môže zmenšiť až server-side searchom (`name_prefix = PROD-`).
- Virtualizácia nie je náhrada pagination. Pagination je samostatná backendová schopnosť a ostáva mimo scope, rovnako ako lazy loading a infinite query.

**Podmienka virtualizácie: bounded/measurable viewport.**
- `ResourceSidebar` je virtualizovaný garantovane iba tam, kde existuje ohraničený a merateľný scroll viewport, teda scroll kontajner s reálnou výškou menšou ako obsah.
- Nesmie sa predpokladať, že `@tanstack/react-virtual` pri `height: auto` alebo bez samostatného scroll viewportu bezpečne degraduje na render všetkých položiek.
- Ak caller vhodný viewport nemá, implementácia zvolí po overení konkrétneho layoutu v browseri jedno z dvoch:
  1. doplniť callerovi bounded height / layout constraint;
  2. pre daný caller virtualizáciu nepoužiť.

**Non-goals:** veľkosť response, sieťový prenos, backend pagination, lazy loading / infinite query, zmena sort/dedupe/search sémantiky, virtualizácia pravého selected panelu (`ResourceSelectionCard`).

**Invariant súradnicového systému:** virtualizer musí počítať offset vzhľadom na skutočný začiatok virtualizovaného listu, nie slepo vzhľadom na začiatok celého scroll kontajnera.

**Implementovaný contract: stale banner vo viewporte + `scrollMargin` (variant B).**
- Stale banner (`data-testid="resource-sidebar-stale-banner"`, `pt-2`) je vo vnútri scroll viewportu pred virtualizovaným listom a pri scrolle odíde spolu s obsahom.
- Jeho výška sa meria (`offsetHeight`, aktualizované cez `ResizeObserver`; bez bannera 0) a odovzdáva sa virtualizeru ako `scrollMargin` (`listOffset`).
- Riadky sa pozicujú voči spaceru: `transform: translateY(virtualItem.start - scrollMargin)`. `virtualItem.start` totiž obsahuje `scrollMargin` aj `paddingStart`.
- Vertikálny padding listu je v options virtualizera (`paddingStart: 8`, `paddingEnd: 8`), v CSS viewportu je iba horizontálny padding.
- Skeleton, blokujúca chyba a empty/no-match sa renderujú v tom istom viewporte namiesto spaceru (virtualizer `count = 0`) a majú vlastný vertikálny padding.

> Superseded decision: Variant A (stale banner mimo viewportu) was originally planned, but browser verification at 390 px showed an unusable list height (banner 170 px, list 36 px, 0 full rows). Variant B was selected and is the implemented contract.

**Positioning contract** (zodpovedá kódu `ResourceSidebar.tsx`):

```tsx
ResourceSidebar
  header / search                // shrink-0
  scroll viewport                // flex-1 min-h-0 overflow-y-auto px-2, aria-busy = getScrollElement()
    ├─ stale banner (optional)   // pt-2, iba pri error && items.length > 0; výška = scrollMargin
    └─ spacer                    // role="list"; position: relative; height: virtualizer.getTotalSize()
         └─ virtual row          // position: absolute; top: 0; left: 0; width: 100%;
                                 // transform: translateY(virtualItem.start - scrollMargin)

virtualizer: scrollMargin = nameraná výška bannera, paddingStart = 8, paddingEnd = 8, gap = 4,
             estimateSize = 36, overscan = 10, getItemKey = hodnota položky, rangeExtractor (drag pin)
```

- Scroll viewport je jediný `getScrollElement()`.
- Spacer je positioning context (`position: relative`) s výškou `getTotalSize()`.
- Virtual row: `position: absolute`, `top: 0`, `left: 0`, `width: 100%`, vertikálna pozícia iba cez `transform: translateY(virtualItem.start - scrollMargin)`.
- Row má `data-index={virtualItem.index}` a `ref={virtualizer.measureElement}` pre dynamické meranie.
- `key` riadku je hodnota resource itemu (stabilná pri scrolle a pri zmene filtra), nie index.
- Medzeru medzi riadkami rieši virtualizer (`gap`), nie `margin-bottom` riadku.

## 11. ResourceSidebar client/server contract

Contract ostáva bez nového `searchMode`. Existujúci signál `isServerSearch = searchValue !== undefined && onSearchChange !== undefined` stačí, lebo režim je plne určený tým, či parent drží search state.

| Režim | Vstup | Pipeline |
|---|---|---|
| client | bez `searchValue`/`onSearchChange` | `items` → dedupe + `sort()` → `includes` filter (item alebo label) → virtualizer |
| server | so `searchValue` + `onSearchChange` | `items` → dedupe + `sort()` → virtualizer (žiadny lokálny filter) |

- Virtualizácia pracuje až s výsledným `filteredItems`. Kľúč riadku = hodnota položky (unikátna po dedupe).
- Pri zmene search textu (client aj server) sa viewport posunie na úplný začiatok: `scrollToOffset(0)`. Pri stale chybe je navrchu najprv banner a hneď pod ním začiatok listu (prvý riadok `paddingStart` = 8 px pod bannerom). Bez bannera je offset 0 priamo začiatok listu.
- Zmena režimu za behu sa nepodporuje inak než remountom. Parent pri prepnutí režimu remountuje sidebar (sekcia 16).

## 12. Drag & drop

- Draggable element = samotný riadok (`role="listitem"`, `draggable`, `onDragStart → dataTransfer.setData(dragDataKey, item)`). Virtualizácia ho iba absolútne pozicuje (`translateY`) a meria (`measureElement`, `data-index`). Žiadny ďalší draggable wrapper.
- Riadok, ktorý sa práve ťahá, ostáva mountnutý, aj keď ho scroll posunie mimo okna (`rangeExtractor` pridá index ťahanej položky). Stav sa vyčistí na `dragend`.
- `key` = položka, takže identita riadku je stabilná pri scrolle a pri zmene filtra.
- `renderItemAction(item)` sa renderuje v rovnakom riadku. Disabled stav (už vybraná položka) počíta parent ako dnes.
- Drop logika (`ResourceSelectionCard`, `TierCanvas`) sa nemení.

## 13. Accessibility

- Ostáva `role="list"` s `aria-label={title}` a riadky `role="listitem"`.
- Každý renderovaný riadok má `aria-setsize={filteredItems.length}` a `aria-posinset={index + 1}`, aby asistenčné technológie poznali celkový počet.
- `aria-busy` na scroll kontajneri ostáva. Search input a jeho label sa nemenia.
- Akčné tlačidlá (`renderItemAction`) mimo okna nie sú v tab poradí. Ak scroll odmountuje zameraný prvok, fokus sa stratí. Toto je akceptované obmedzenie: položky samotné dnes nie sú fokusovateľné.

## 14. Loading / error / empty / no-match

Bez zmeny sémantiky. Platí poradie:
1. skeleton (`isLoading || isSearching`);
2. blokujúca chyba (error a 0 položiek);
3. stale error banner vo viewporte pred zoznamom (odscrolluje spolu s ním);
4. prázdny stav: `noMatchesLabel`, ak je search text, inak `noItemsLabel`;
5. virtualizovaný zoznam.

Virtualizer `count` = 0 vo všetkých stavoch okrem 5. Scroll viewport (ref) je vždy ten istý element. Stav 1, 2 a 4 sa renderuje v ňom. Stav 3 (stale banner) sa renderuje vo viewporte pred listom (variant B, sekcia 10), list ostáva virtualizovaný a je posunutý o `scrollMargin`.

## 15. Cache / query identity

- VMware vždy `useVmwareResourceInventory` → `vmwareInventoryQuery` → `getPostVmsSearchQueryKey`. Žiadny Recovery-Group-specific kľúč.
- Scoped: `providerId + TEST- + WEB` = rovnaký kľúč ako Resources pre rovnaký vstup.
- Unscoped: `providerId + PROD-` = rovnaký kľúč ako Resources pre rovnaký request.
- Power/FlashSystem: `powerInventoryQuery(providerId)` / `flashSystemInventoryQuery(providerId)` bez zmeny. Scope je iba v `select`.

## 16. Provider change a reset

- `RecoveryGroupResourcesStep` je keyed `workloadType|providerId`. Zmena providera remountuje obsah, takže `vmwareNamePrefix` začína prázdny a hook dostane nový `providerId` už s prázdnym prefixom. `useVmwareResourceInventory` navyše pri zmene providera debounce obchádza a použije aktuálnu hodnotu (`providerChanged`). Transient request `B + PROD-` preto nevznikne. Overí to integračný test.
- Kľúč sa rozšíri o search režim: `workloadType|providerId|mode`. Ak sa režim zmení pri tom istom provideri (provider record dohľadaný neskôr alebo refetch zmení scope), obsah sa remountuje. Žiadny server prefix tak neprežije do client režimu a naopak.
  - **server → client** (A: `vmPrefix null`, search `PROD-` → refetch A: `vmPrefix TEST-`): remount, `PROD-` sa zahodí, input je prázdny, query nesie fixed `TEST-`. Nevznikne request `TEST- + PROD-` ani `A + PROD-` po prepnutí.
  - **client → server** (A: `vmPrefix TEST-` → refetch A: bez scope): remount, controlled search začína prázdny, počiatočná query je provider-only `{ providerId: A }`. Client search text sa neprenesie.
- Builder pri zmene providera naďalej vynuluje `resources`, `vmMetadataByName`, `relatedVolumes`, `auxiliaryNamesByVolume`.

## 17. Selected resources a metadata

- Search nemení `draft.resources`. Vybraná VM ostáva v pravom paneli, aj keď nie je v aktuálnom výsledku.
- `onMetadataAvailable` sa volá pre každý nový výsledok. Builder `handleMetadataAvailable` metadata **mergeuje**, takže metadata z predchádzajúcich server-search výsledkov ostávajú.
- Edit: uložený výber sa nepruneuje ani pri scope, ani pri searchi.

## 18. Performance predpoklady

- Client filter `includes` nad 5000 reťazcami na úder klávesy je v rádovo milisekundách. Optimalizácia filtra nie je potrebná.
- Dedupe + `sort()` beží iba pri zmene `items`.
- Pri bounded viewporte (napr. 288 px) je viditeľných približne 7–20 riadkov. Pri overscan 10 sú to desiatky DOM riadkov namiesto tisícov.
- Unscoped VMware response môže ostať celý v pamäti (sekcia 10). Úspora sa týka DOM a renderingu, nie siete.

Viewport callerov (overené v browseri 2026-10-05, computed layout pri 390 px a 1366 px):

| Caller | Obal sidebaru | Výsledok | Rozhodnutie |
|---|---|---|---|
| `RecoveryGroupResourcesStep` (hlavný) | `h-72 … lg:h-full` | bounded: list 206 px, 227 VM → 16 DOM riadkov | bez zmeny |
| `RecoveryGroupResourcesStep` compact (related volumes) | `h-72 … lg:h-full` | bounded: 206 px (390) / 270 px (1366) | bez zmeny |
| `RecoveryAppBuilder` | bunka sidebaru v gride `grid-cols-1 lg:grid-cols-[280px_…]` | pôvodne na mobile unbounded: 300 groups → list 15 912 px, 300 DOM riadkov; `lg` bounded | **bunka `h-72 lg:h-auto`**: na mobile bounded/measurable viewport pre virtualizáciu (list 206 px, 14 DOM riadkov), na `lg` bez zmeny (334 px, 17 riadkov) |
| `TopologyPreview` (VM aj volumes krok) | `h-72 … lg:h-full` / `h-64 … lg:h-auto` | prototyp so 3–4 statickými položkami; na `lg` výšku volumes kroku určuje riadok gridu | **bez zmeny**: prototyp s malým statickým datasetom |

## 19. Explicit non-goals

Backend, OpenAPI, Orval/generated, pagination (backend capability, virtualizácia ju nenahrádza), lazy loading / infinite query, zmenšenie počiatočného unscoped VMware response, provider create/edit, provider-card Variant A UI, Resources / Resources ISE, Power/FlashSystem server search, minimum-character pravidlo, virtualizácia `ResourceSelectionCard`, nový `searchMode` prop.

## 20. Acceptance criteria

1. VMware fixed prefix `TEST-`: prvý request `namePrefix: 'TEST-'`. Písanie `DB` nevytvorí ďalší request a zoznam sa lokálne zúži.
2. VMware tag-only `WEB`: request `tag: 'WEB'` bez `namePrefix`. User search `DB` je client-side a `tag` ostáva.
3. VMware prefix + tag: user search nemení query.
4. VMware bez scope: `P` → `PR` → `PROD-` vytvorí iba settled request `{ providerId, namePrefix: 'PROD-' }`. Vymazanie vráti `{ providerId }`.
5. Provider A so searchom `PROD-` → provider B: žiadny request `B + PROD-`.
6. Power s prefixom: `startsWith` a client search. Bez prefixu všetky LPAR-y. Tagy sa ignorujú.
7. FlashSystem: client search bez zmeny.
8. Cache: rovnaké vstupy dajú rovnaký kľúč ako Resources (`vmwareInventoryQuery(...).queryKey`).
9. Vybrané položky a merge metadát ostávajú pri searchi.
5a. Zmena režimu pri rovnakom `providerId` (sekcia 16):
   - server → client: `PROD-` sa zahodí, input je prázdny, query nesie `TEST-`, žiadny request `TEST- + PROD-` ani `A + PROD-`;
   - client → server: controlled search je prázdny, počiatočná query je `{ providerId: A }`.
10. Sidebar s 5000 položkami v bounded viewporte nerenderuje všetky riadky a scroll sprístupní neskoršie položky. Veľký unscoped VMware response môže ostať celý v pamäti, ale DOM nesmie obsahovať celý dataset naraz, ak je k dispozícii bounded viewport.
10a. Každý caller má overený viewport (sekcia 18). Pri nevhodnom viewporte bola zvolená bounded height alebo vypnutá virtualizácia, so zdokumentovaným dôvodom.
10b. Virtual rows dodržiavajú positioning contract (sekcia 10). Pred spacerom je vo viewporte iba voliteľný stale banner, ktorého výška je `scrollMargin`. Vertikálny CSS padding pred listom nie je (padding je v `paddingStart`/`paddingEnd`).
10c. Stale error + 5000 položiek v bounded viewporte:
   1. stale banner je zobrazený vo viewporte priamo pred listom (variant B);
   2. list ostáva virtualizovaný (`listitem` výrazne menej ako 5000);
   3. prvé položky (po `sort()`) sú v DOM;
   4. prvý riadok (`data-index="0"`) má rovnaký `transform` ako v rovnakom renderi bez chyby, teda nie je posunutý o výšku banneru;
   5. po scrolle sa sprístupní vzdialená položka;
   6. visible range zohľadňuje výšku bannera (`scrollMargin`): pri banneri 2000 px scroll o jeho výšku ukazuje začiatok listu.
10d. `scrollToOffset(0)` po zmene searchu nastaví viewport na úplný začiatok (`scrollTop` = 0): najprv stale banner, potom začiatok listu. Prvá položka výsledku je v DOM.
11. Client search, server search (bez lokálneho filtra), drag data, `renderItemAction`, `itemLabels` (aj sekundárny riadok) a stavy loading/error/stale/empty/no-match fungujú vo virtualizovanom zozname.
12. `role="list"`/`listitem` + `aria-setsize`/`aria-posinset`.
13. Existujúce testy všetkých callerov prechádzajú (RecoveryGroupResourcesStep, RecoveryGroupBuilder, RecoveryAppBuilder).

## Tech stack, príkazy, štruktúra

- React 19, TypeScript, TanStack Query 5, Tailwind, Vitest + Testing Library (jsdom). Nová závislosť: `@tanstack/react-virtual` (aktuálna stabilná 3.x, verzia sa overí cez `npm view @tanstack/react-virtual version` pri inštalácii).
- Testy: `npm exec vitest run <súbory>`. Typy: `npm run typecheck`. Layout: `node scripts/orval/check-feature-layout.mjs`. Lint: `npx eslint <súbory>`. Whitespace: `git diff --check`.
- Kód: `src/shared/components/resource-sidebar/` (sidebar), `src/features/recovery-plans/recovery-groups/{helpers,hooks,components}/`. Testy sú colocated `*.test.tsx`.

## Testing strategy

- Hybrid logika: unit testy helpera, hook testy s `discoveryFetch` double (reálny `useVmwareResourceInventory` a debounce), komponentové testy ResourcesStep s mockovaným hookom a integračný test ResourcesStep + reálny hook pre provider change a pre zmenu režimu pri rovnakom `providerId` (server → client, client → server; rerender s novým `providerScope`).
- Virtualizácia v jsdom: bez layoutu má scroll element výšku 0 a TanStack Virtual pri `outerSize === 0` nevráti žiadny range, takže sa nevyrenderuje **žiadny** riadok (overené pri implementácii; pôvodný predpoklad `overscan + 1` bol nesprávny). Opt-in helper `resource-sidebar/test/mockVirtualLayout.ts` dá rozmer (`offsetHeight`/`offsetWidth`) iba sidebar viewportu a jeho riadkom a sprístupní `scrollTop`/`scrollTo` + `scroll` event. Testy neviažu presný počet DOM riadkov. Overujú:
  - `0 < rendered < total`;
  - posledná položka nie je v DOM pred scrollom a je po ňom.
- Testy callerov, ktoré overujú riadky sidebaru (`RecoveryGroupResourcesStep*`, `RecoveryGroupBuilder`), helper používajú na úrovni súboru (`beforeEach`/`afterEach`). Bez globálneho polyfillu v `setup.ts`. `RecoveryAppBuilder.test.tsx` riadky neoveruje a helper nepotrebuje.
- jsdom neoveruje reálny viewport callerov. To sa overuje iba v browseri (sekcia 18).
- Offset test (AC 10c): porovnať `transform` riadku `data-index="0"` medzi renderom so stale chybou a bez nej (relatívne porovnanie, nie absolútne pixely) a overiť, že banner je prvý element viewportu pred listom. Pri banneri vyššom ako mnoho riadkov musí scroll o jeho výšku stále ukazovať začiatok listu (`scrollMargin` test).

## Boundaries

- **Always:** reuse `useVmwareResourceInventory` a debounce, canonical query keys, existujúci `searchValue`/`onSearchChange` contract, focused testy pred odovzdaním.
- **Ask first:** pridanie `@tanstack/react-virtual` (schválené týmto spec po review), akákoľvek zmena shared hookov mimo Recovery Groups, globálne test polyfilly v `setup.ts`.
- **Never:** backend/OpenAPI/generated zmeny, revert provider-scope working tree, vlastný debounce, Recovery-Group-specific query key, commit bez pokynu.

## Open questions

Žiadne blokujúce.
