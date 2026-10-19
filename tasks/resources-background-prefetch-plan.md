# Plán: Background prefetch druhého VMware providera v Resources

Stav: schválené cez executing-plans inline, realizácia od 2026-10-16. Každá overená logická zmena sa atomicky commituje podľa novšieho pokynu používateľa.
TODO: [resources-background-prefetch-todo.md](resources-background-prefetch-todo.md).

## Cieľ a rozsah

Po pripravení prvého VMware tabu v Resources začať na pozadí načítavať druhého source VMware providera. Prepnutie počas načítavania využije existujúci request; prepnutie po úspešnom fresh prefetchi využije cache. Backend sa nezrýchľuje: zmenšuje sa zostávajúce čakanie po kliknutí.

„Prvý“ a „druhý“ znamenajú poradie VMware tabov vytvorené existujúcim `buildResourceSourceTabs`, nie poradie API odpovede, číselnú príponu ID ani ľubovoľného nasledujúceho providera. Pri viac ako dvoch source VMware provideroch sa prednačíta iba druhý. Pri priamom otvorení druhého alebo iného tabu sa nový background prefetch nespustí. Toto je zámerne úzky návrh na schválenie.

Dashboard naďalej pripravuje počiatočné Resources/ISE inventáre. Resources ISE, IBM Power, FlashSystem, Recovery Groups, routing, eager loading, cache policy a API kontrakty sa nerozširujú. Source FlashSystem HTTP 502 je mimo rozsahu. Nemenia sa existujúce `tasks/data-prefetch-*`, Dashboard redizajn ani cudzie rozpracované zmeny. Nevytvára sa nová vetva, push ani merge. Novší pokyn používateľa z 2026-10-16 výslovne vyžaduje atomické commity overených zmien.

## Zistenia z existujúceho kódu

Analýza vychádza z aktuálneho checkoutu `spike/ant-design-shell` a implementácie commitu `014c1dd0`; `105aec54` je jeho cherry-pick na `test`. Aktuálny HEAD už obsahuje aj iné Dashboard úpravy: na meranie treba rovnaký Dashboard pred aj po, nie porovnať starý commit s novým Dashboardom.

| Miesto | Existujúce správanie a dôsledok |
|---|---|
| `src/app/providers.tsx:11` | Jeden aplikačný `QueryClient`, získavať cez `useQueryClient`; existujúci session lifecycle ponechať. |
| `src/shared/query/cachePolicy.ts:1` | `staleTime` 15 min, `gcTime` 60 min, `retry: 1`, refetch pri mount/focus/reconnect. Prefetch zdedí defaults, nič neprepisovať. |
| `src/features/dashboard/pages/OverviewPage.tsx:25` | Volá `useInitialResourcePrefetch` mimo loading/unknown stavu. Žiadna potrebná zmena. |
| `resources/hooks/useInitialResourcePrefetch.ts:13` | Po ready a idle callbacku fetchne metadata `{role:'all'}`, potom najviac jeden počiatočný inventár pre source a jeden pre target. Používa existujúce factories, skip chýbajúcich credentials a cleanup callbacku. |
| `resources/pages/ResourcesPage.tsx:13` | Má metadata, zoradené source `roleTabs` aj `effectiveActiveTab`. Vie vybrať druhý VMware tab bez nového metadata requestu. |
| `resources-ise/pages/ResourcesIsePage.tsx:13` | Rovnaké vendor komponenty, ale target taby a `role:'target'`. Nový trigger musí byť opt-in iba z Resources. |
| `resources/helpers/buildResourceSourceTabs.ts:49` | Typy VMware → FlashSystem → Power; v type numerické triedenie podľa name, potom ID. Source používa existujúce pravidlo `provider.role !== 'target'`, nie nový filter `=== 'source'`. |
| `resources/components/vmware/VmwareResourcesPage.tsx:44` | Pozná vybraného providera, inicializované filtre aj aktívny inventár. Tu sa dá rozhodnúť, že aktívny tab je pripravený, bez callbackov smerom do rodiča. |
| `resources/hooks/useVirtualMachineSearchParams.ts:30` | Fixný scope má prioritu, inak aktívne URL filtre alebo snapshot konkrétnej role/provider ID. Používa spoločný `resolveVmwareInitialFilters`. |
| `resources/hooks/useResourceTabSearchParam.ts:50` | Prepnutie providera odstráni search, vendor filtre aj active-provider markery a resetuje stránku. Druhý tab teda nepreberá filtre prvého. |
| `resources/hooks/useVmwareResourceInventory.ts:41` | `useQuery` nad `vmwareInventoryQuery`, 300 ms debounce prefixu, placeholder iba pre rovnaké provider ID, samostatný force refresh. Vracia aj `isSuccess`, `isPlaceholderData`, `isDebouncing`. |
| `resources/model/inventoryQueries.ts:60` | Factory normalizuje ID/prefix/tag/folder a ukladá validovanú wire odpoveď. UI mapovanie je `select`, neprednačítavať už mapovaný objekt. |
| `resources/pages/ResourcesPrefetch.integration.test.tsx` | Reálny QueryClient, mock HTTP, testy Dashboard → Resources/ISE → RG a pending/error cache reuse. Súčasné fixtures majú iba jedného providera každej role, nový scenár potrebujú doplniť. |

Skrátené cesty `resources/...` v tabuľke sú pod `src/features/discovery-inventory/`.

### Kontrakt requestu a cache

Aktívny aj prednačítaný VMware inventár musia použiť `vmwareInventoryQuery({providerId, namePrefix, tag})`. Endpoint je POST `/api/vms/search?provider_id=<id>`, key z generated factory má tvar `['POST','/vms/search',{provider_id},body]`. Body obsahuje iba neprázdne normalizované `name_prefix`, `tag`, prípadne `folder_name`; Resources dnes folder neposiela. Lokálne filtre powerState/cluster/connectionState/untagged a paginácia do inventárneho key nepatria. Rolu nepridávať do key: rozlišuje výber providera a snapshot, nie nový API kontrakt.

Lokálne nainštalovaný `@tanstack/query-core` 5.101.4 potvrdzuje:

- `src/queryClient.ts:339–378`: `fetchQuery` použije defaults a freshness; `prefetchQuery` deleguje naň a absorbuje chybu.
- `src/query.ts:400–418`: pri prebiehajúcom fetche vracia existujúcu retryer promise. Netreba vlastný request register, lock ani queue.

[Oficiálny prefetching guide](https://tanstack.com/query/v5/docs/framework/react/guides/prefetching) pri kontrole presmeroval na meniacu sa latest dokumentáciu. Rozhodujúca pre tento plán je existujúca nainštalovaná verzia a projektové factories; žiadna migrácia API ani dependencies nie je súčasťou práce. [Oficiálne vysvetlenie query keys](https://tanstack.com/query/v5/docs/framework/react/guides/query-keys) opisuje ich úlohu pri oddelení cache.

## Jedno odporúčané riešenie

Malý lokálny efekt vo `VmwareResourcesPage`, explicitne aktivovaný nepovinným propom iba z `ResourcesPage`. Žiadny nový prefetch hook, manager ani generický scheduler.

1. `ResourcesPage` zo svojich hotových `roleTabs` vyberie VMware taby s konkrétnym ID. Ak je aktívny prvý z nich a existuje druhý, odovzdá záznam druhého providera ako voliteľný `backgroundPrefetchProvider`. Preskočí ho pri `credentialStatus === 'missing'`, bez náhrady tretím. Nepoužiť nezoradené `vmwareProviders[1]`.
2. Prop sa pridá iba k lokálnemu typu props `VmwareResourcesPage` ako rozšírenie `SourceResourcesPageProps`; nemení sa spoločný props kontrakt pre všetkých vendorov. ISE prop neposiela a efekt zároveň kontroluje `role === 'source'` a rozdielnosť aktívneho/cieľového ID.
3. Aktívny tab je pre trigger pripravený, keď `inventoryEnabled`, `isSuccess`, skutočný inventár (aj úspešne prázdny), bez placeholderu, debounce, aktívneho fetchu a force refreshu. Nestačí `!isInitialLoading`: môže znamenať vypnutú query alebo chybu. Netreba čakať na `/tags`, ktorý neblokuje zobrazenie inventára. Efekt beží až po commite tohto UI.
4. Efekt odloží malý callback cez `requestIdleCallback` s rovnakým fallbackom `setTimeout(...,0)` ako existujúci Dashboard hook. Závislosti sú primitívne hodnoty readiness a scope cieľového providera; nekopírovať stále nové `query`/provider objekty do dependencies. Cleanup zruší iba naplánovaný callback, s disposed guardom pred jeho vykonaním. Po odchode alebo zmene providera sa nový request už nespustí. Už začatý prefetch sa neruší cez `cancelQueries`, aby ho mohol nový aktívny observer zdieľať.
5. Callback vypočíta cieľové filtre cez `resolveVmwareInitialFilters({...candidate, role:'source'}, new URLSearchParams(), readProviderFilterSnapshot({role:'source', resourceTab:'vmware', providerId:candidate.id}))`. Prázdne URL filtre zodpovedajú vyčisteniu pri prepnutí tabov; nepoužiť search prvého tabu. Snapshot čítať až pri callbacku. Tag získať cez `getServerSideTagFilter`; následne iba `void queryClient.prefetchQuery(vmwareInventoryQuery(...))`.
6. Pred volaním skontrolovať `getQueryState(options.queryKey)?.status === 'error'`: v takom prípade špekulatívny pokus preskočiť. Je to malý guard nad existujúcim stavom cache proti opakovaným background pokusom po chybe pri rerenderoch/remounte, nie nová evidencia requestov. Retry už začatého requestu zostáva podľa cache policy. Po GC/reset cache môže nastať nový pokus. Otvorenie tabu tento guard nepoužíva a ponecháva existujúce mount/retry správanie.

Fresh cache aj pending deduplikáciu rieši TanStack Query. Opakované efekty/StrictMode ani návrat v rámci freshness nepridajú HTTP. Stale alebo invalidovaný key môže pri ďalšom oprávnenom spustení vyvolať nový request; to je správna existujúca policy. Zmena scope/snapshotu môže vytvoriť odlišný key. Pri zmene filtrov medzi prefetchom a kliknutím je normálny cache miss správny, nie duplicita rovnakého requestu.

Chyba VMware 2 nesmie prepísať error/loading prvého tabu, otvoriť toast ani vyvolať unhandled rejection. Po definitívnej chybe je normálne otvorenie VMware 2 oprávnené znova načítať dáta; rozlišovať tento nový pokus od dvoch súbežných HTTP requestov. Pomalý pending request zostáva zdieľaný. Force refresh nemení svoju existujúcu samostatnú cestu s `force_refresh:true`; background kód nič nezapisuje cez `setQueryData`.

### Súbory budúcej implementácie

| Súbor | Dôvod |
|---|---|
| `src/features/discovery-inventory/resources/pages/ResourcesPage.tsx` | Výber presného druhého source VMware tabu z existujúceho zoradenia, opt-in prop. |
| `src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.tsx` | Lokálny voliteľný prop, readiness, odložený efekt, reuse filtrov/factory/QueryClient a error guard. |
| `src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx` | Výber a opt-in wiring bez zmeny routingu/fallbacku. |
| `src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx` | Readiness, cleanup, fallback, role a error guards; doplniť QueryClient wrapper, ak aktuálne mocky klienta neposkytujú. |
| Nový `src/features/discovery-inventory/resources/pages/ResourcesBackgroundPrefetch.integration.test.tsx` | Skutočné prepnutie tabov, reálne observers, deferred HTTP a presné request bodies/counts. Oddeliť od pôvodných Dashboard fixtures. |

Produkčne sa predpokladajú iba dva zmenené súbory. Existujúce filter helpers, query factories, shared props, `providers.tsx`, `public/config.js`, Dashboard, ISE a RG ostávajú referenčným kontraktom. Ak test odhalí potrebu meniť tento kontrakt, najprv upraviť plán; nerozširovať scope potichu.

## Závislosti a odhad

Existujúci klient/factories/role taby → baseline a potvrdenie filtrov → jeden funkčný slice triggeru → integračné race/error scenáre → focused regresie → Edge porovnanie → review.

T1–T5 a checkpointy sú podrobne v TODO. Každý krok zasahuje najviac 4 súbory. Implementácia má nízku až strednú komplexitu, približne 3–5 hodín vrátane automatizovaných testov; živé merania a vyhodnotenie ďalšie 1–2 hodiny podľa dostupnosti backendu. Ide o odhad práce, nie sľub výkonu. Automatizované testy možno neskôr pripraviť oddelene od meraní, ale produkčné zmeny dvoch komponentov majú jedného vlastníka; paralelní agenti nie sú potrební.

## Testovacia stratégia

Použiť reálny `QueryClient` s `STANDARD_QUERY_OPTIONS`, validné wire fixtures a mock HTTP na úrovni `fetch`, nie iba spy na `prefetchQuery`. Deterministické race/error testy môžu explicitne použiť `retry:false`; samostatný prípad zachová produkčné `retry:1` a overí najviac dva pokusy po chybe bez slučky. Riadiť čas/scheduler a odloženú response, nečakať reálne 15 minút. Rozšíriť scheduler mock na viac callbackov: pôvodný jeden `scheduled` slot nestačí pre Dashboard aj Resources efekt.

| Scenár | Overenie |
|---|---|
| Dashboard → prvý VMware → idle | Dashboard sa nemení; VMware 1 sa zobrazí z cache pred štartom VMware 2. Pred readiness/idle je 0 requestov pre VMware 2, potom jeden. Úspešne prázdny prvý inventár trigger neblokuje. |
| Klik počas pending prefetchu | Reálnym klikom otvoriť druhý tab pred vyriešením deferred response. Práve jeden POST pre jeho key, navigácia reaguje ihneď, následne viditeľné iba jeho rows. |
| Klik po dokončení | Fresh prefetch → reálny klik → rows z cache, 0 ďalších inventory POST. `/tags` môže legitímne pribudnúť pri otvorení, počítať samostatne. |
| Opakovanie | StrictMode, rerender, unmount/remount a návrat VMware 2 → 1 → 2 v rámci 15 min: bez duplicitných POST. Test aj bez idle API a s odchodom pred callbackom. |
| Scope a výber | Nezoradená metadata odpoveď, mená 2/10, tri source providers, target, provider bez explicitnej target role, missing credentials, iba jeden provider. Presne druhý podľa tabov; žiadny tretí/target/nešpecifikovaný inventár. |
| Filtre | Druhý má iný pevný prefix/tag, uložený source snapshot alebo defaults; prvý má URL search/tag. Prefetch a následný aktívny tab musia mať identický normalizovaný body/key. Target snapshot s rovnakým ID nesmie zmeniť source filtre. Zmenený filter oprávnene načíta nový key. |
| Readiness | Loading/error/disabled/debounce/placeholder/fetch/force refresh prvého tabu neštartuje background request. Cache hit aj úspešne prázdny inventár áno. Pri prechode k inému providerovi callback už neštartuje. |
| API chyba | VMware 2 HTTP 500/offline, vrátane prepnutia počas pending: VMware 1 zostáva použiteľný; žiadna background slučka po rerender/remount. Pri neskoršom otvorení normálny retry a recovery, pri trvalej chybe existujúci error UI. |
| Freshness | Posun času za staleTime alebo explicitná invalidácia oprávnene obnoví presný key. Nepridávať nové focus handlers. |
| Regressie | Pôvodný Dashboard/RG cache reuse, ISE target routing, provider transition, debounce a force refresh prejdú explicitne vybranými existujúcimi testami. |

Príkazy sú v TODO. Kompletná suite a `npm run build` nie sú default: build skript spúšťa aj celú suite/API kontroly. Pri tejto dokumentačnej úlohe sa nespúšťajú runtime testy ani build a netvrdí sa implementované zrýchlenie.

## Živé meranie v Microsoft Edge

Vykonať až po schválení a implementácii, proti reálnemu backendu. Použiť rovnaký Edge profil/verziu, viewport, frontend režim, backend dataset, credentials a filtre. Sieť: latencia 300 ms a download 62 500 B/s; zaznamenať aj upload hodnotu. Dashboard aj jeho pripravenosť držať rovnaké medzi variantmi. Baseline je rovnaký checkout bez tejto zmeny; už existujúci Dashboard prefetch musí zostať zapnutý v oboch.

Každý studený beh začať novou in-memory Query cache (reload Dashboardu), s rovnakým vopred určeným stavom session filtrov. Počas behu cache ponechať, neforce-refreshovať inventár. Samostatne zaznamenať backend cache stav alebo obmedzenie jeho neovládateľnosti. Pomalé/chybové behy s odlišnými podmienkami nevydávať za platné porovnanie.

Pre každý variant a scenár aspoň 3 platné opakovania, zachovať jednotlivé hodnoty aj medián:

1. Prepnutie VMware 2 hneď po použiteľnosti VMware 1: stanoví minimálny predstih a dokazuje, že navigácia nečaká na background.
2. Klik VMware 2 počas requestu s pevným predstihom, napr. 2 s po VMware 1 ready. Rovnaký predstih v baseline; ak request už skončil, zaradiť beh do dokončeného scenára a pending zopakovať.
3. Klik po dokončenom prefetchi. Zvoliť pevný dwell nad pozorovaným trvaním a použiť ho aj v baseline; platnosť potvrdiť Network trace, nie iba odhadom času. Dokončený fresh variant musí mať 0 nových inventory POST pri kliknutí.
4. Návrat VMware 2 → 1 → 2 a interakcia s VMware 1 počas background requestu: filtre, scroll, ovládacie prvky a počty requestov. Pred/po aspoň 3 platné behy aj pre kontrolu aktívneho tabu.

Pre každý beh zaznamenať commit/variant, provider ID a normalizované filtre, Dashboard ready, VMware 1 click/ready, VMware 2 request start/end, click a usable UI (zobrazené správne rows alebo empty state a funkčné ovládanie). Zmerať `API=end-start` a samostatne `čakanie=usable-click`; uviesť predstih `click-start`, debounce a render čas. Baseline VMware 2 request začína až po kliknutí, preto nemusí mať kladný predstih. Zaznamenať HTTP status, počet POST pokusov na konkrétne provider ID/body, `/tags` a metadata zvlášť, bytes, prípadné retry a chyby. HAR pred uložením zbaviť tokenov a citlivých údajov; do výsledkov stačia agregáty a neidentifikujúce trace metriky.

Dodané orientačné výsledky: VMware 1 458/323 ms (prvý/cache), VMware 2 6361/352 ms, Power 1207/309 ms, ISE FlashSystem 1817/332 ms; VMware 2 približne 348 kB. Nie sú tri kontrolované baseline opakovania a nenahrádzajú T1. Očakáva sa presun časti API čakania pred klik; API samotné nemusí byť kratšie a cache UI nemusí byť okamžité kvôli render/debounce.

### Kritériá úspechu

- Jeden úspešný inventory POST pre VMware 2 medzi štartom prefetchu a jeho prvým otvorením, aj pri kliknutí počas pending; po fresh dokončení 0 dodatočných inventory POST. Retry po chybe vykazovať zvlášť.
- VMware 2 dostane správny scope/filter a jeho použiteľné UI príde po kliknutí skôr o využitý predstih; bez pevného sľubu percent zrýchlenia. Dokončený scenár dosahuje správanie návratu z cache, bez sieťového čakania na inventár.
- VMware 1 sa zobrazí skôr než začne špekulatívny request; navigácia a interakcie nečakajú na jeho promise. Medián VMware 1 click→usable a interakčné latencie nemajú zhoršenie nad väčšiu z hodnôt 50 ms alebo 10 % baseline mediánu. Ak sú tri behy príliš hlučné, zvýšiť počet a uzavrieť výsledok až potom; pri trvajúcej regresii návrh nenasadzovať bez revízie.
- Žiadna slučka background requestov pri chybe/rerenderoch, žiadny prefetch ďalších vendorov/targetov a žiadne zmeny cache policy/API/routingu. Všetky focused testy zelené a Edge report má minimálne požadované platné opakovania.

## Riziká a mitigácie

| Riziko | Dopad | Opatrenie |
|---|---|---|
| Prefix/tag prvého tabu sa omylom použije pre druhý | Vysoký | Existujúci resolver so scope/snapshotom druhého a prázdnymi URL filtrami; integračný test skutočného prepnutia. |
| Readiness je iba `!loading` alebo placeholder | Vysoký | Success/data/non-placeholder/no-fetch/no-debounce gate; test deferred aktívneho inventára. |
| Nový efekt sa zapne aj v zdieľanom ISE komponente | Vysoký | Opt-in iba z Resources plus source guard, negatívny ISE test. |
| Chyba opakovane spúšťa nové špekulatívne requesty | Stredný | Existujúci query error state guard, bez vlastnej mapy pokusov; bežný observer môže stále retryovať. |
| 348 kB sa stiahne aj bez návštevy druhého tabu | Stredný | Vedome prijatý bandwidth tradeoff, iba jeden kandidát po ready/idle; žiadny fan-out. |
| Prenos/JSON parse súťaží s interakciou prvého tabu | Stredný | Idle trigger odloží štart, negarantuje prioritu siete ani parse. Zmerať interakcie; pri regresii revízia, nie sľub absolútnej izolácie. |
| Návrat po 15 min alebo invalidácia vyvolá HTTP | Existujúci | Legitímna freshness policy, oddeliť od duplicity. |
| Odchod počas prefetchu alebo zmena scope | Stredný | Zrušiť iba nespustený callback; už bežiaci výsledok patrí vlastnému key. Iný key je riadny cache miss. |
| Súbežné Dashboard úpravy skreslia benchmark | Vysoký | Rovnaký Dashboard/dataset, nemerať medzi nesúvisiacimi revíziami. |

## Neskoršie rozšírenie a otvorené body

IBM Power aj FlashSystem už majú `powerInventoryQuery`/`flashSystemInventoryQuery` a rovnakého klienta. Po samostatnom schválení možno v ich vendor komponente použiť obdobný malý ready efekt; pri Power je prefix lokálny filter nad provider payloadom, FlashSystem používa provider ID. Netreba ďalšiu architektonickú vrstvu. Najskôr doložiť úžitok meraním; source FlashSystem 502 sa týmto neopraví.

Plán bol schválený cez `executing-plans inline`. Implementačné T2–T4 sú vykonané a automatizovane overené; T1 a výkonová časť T5 zostávajú blokované. Nie je doložené nové zrýchlenie na reálnom backende. Presné príkazy a výsledky sú v TODO.

## Realizácia 2026-10-16

Novšie pokyny `executing-plans inline` a `atomicky commituj kazdu zmenua pokracuj` nahrádzajú historické obmedzenia plánovacej fázy: implementovať inline a každú overenú logickú zmenu commitnúť. Nevytvárať novú vetvu, push ani merge. T1/T5 živé merania blokuje runtime oboch UI nástrojov (The system cannot find the path specified, os error 3); Chrome DevTools MCP nie je dostupný. Automatizovanú implementačnú časť T2–T4 vykonať nezávisle, T1 a meranie T5 ponechať nesplnené. Východiskové focused testy dvoch komponentov: 16/16 prešlo.

Záverečná automatizovaná validácia: 11 focused testovacích súborov, 116/116 testov; focused ESLint všetkých zmenených TS/TSX bez chýb a `git diff --check`. Zásah ostal v dvoch produkčných komponentoch. Okrem plánovaných testov bolo potrebné doplniť QueryClient wrapper v `src/features/discovery-inventory/resources-ise/pages/ResourcesIsePage.test.tsx` (odhalené regresným testom); produkčné ISE sa nemenilo. Plná suite, typecheck ani build neboli spustené. Historické poznámky o dokumentačnej fáze vyššie nie sú aktuálnym realizačným stavom.
