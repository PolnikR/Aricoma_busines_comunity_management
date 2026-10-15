# ABCO FE – plán Data Prefetchingu

Stav: implementácia vykonaná inline na pokyn používateľa z 2026-10-15; focused testy a lint prešli. Živé meranie a spoločný typecheck zostávajú otvorené podľa záznamu v TODO. Analýza: 2026-10-15, vetva `spike/ant-design-shell`, východiskový HEAD `59c4b541`.
Vykonateľné úlohy: [data-prefetch-todo.md](data-prefetch-todo.md).

## Rozsah a výsledok

Primárne zrýchliť prvé otvorenie Resources a Resources ISE z Dashboardu: po dokončení jeho kritického vykreslenia získať existujúci provider zoznam a prednačítať presnú počiatočnú inventárnu query najviac jedného zvoleného providera pre každú z týchto dvoch stránok. Následne tie isté entries TanStack Query cache využívať v Recovery Groups; iba chýbajúce alebo stale výsledky doplniť podľa skutočného RG providera, scope a filtrov. Related storage pripravovať pre vybrané VM/LPAR. Zoznam všetkých providerov nie je zoznam inventárnych requestov: všetky inventáre pri štarte sa nenačítavajú.

Zachovať eager importy Resources, Resources ISE a Providers; routing, API kontrakty a správanie Discovery/Recovery Groups nemeníme. Žiadny lazy loading, code prefetching, nová vetva ani benchmarkový systém. Pôvodná plánovacia fáza upravovala iba tieto dva dokumenty; následný výslovný pokyn `executing-plans inline` schválil realizáciu opísaných zmien v `src/`. Obmedzenie bez commitu, pushu a merge zostáva zachované.

Revízia na výslovnú žiadosť používateľa upravuje tieto dva existujúce rozpracované dokumenty tej istej úlohy. Pôvodná verzia bola príliš zameraná na RG; táto revízia ju nahrádza vrátane poradia úloh. Žiadne implementačné úlohy neboli označené za vykonané. `tasks/plan.md`, `tasks/todo.md` a ostatné plány zostávajú nedotknuté. `fetch-cache-policy-plan.md` opisuje aj polling, ktorý aktuálny `cachePolicy.ts` globálne nezapína; autoritatívny je aktuálny kód. Nesúvisiaci untracked adresár `prototypes/dashboard-chart-study/` zostáva nedotknutý.

## Výsledky analýzy kódu

### Architektúra a cache

- `src/app/routing/discoveryInventoryRoutes.tsx:4–5,26–27` staticky importuje a priamo renderuje Resources a Resources ISE. `providersConnectorsRoutes.tsx:4,30` robí to isté pre Providers. Iné existujúce lazy routes sú mimo rozsahu.
- `src/app/providers.tsx:11–17,49` poskytuje jeden existujúci QueryClient. Použiť `useQueryClient()`, nevytvárať druhý klient ani exportovať singleton.
- `src/shared/query/cachePolicy.ts:1–13`: `staleTime = 15 min`, `gcTime = 60 min`, `retry = 1`, refetch pri mount/focus/reconnect pre stale queries. Bez globálneho `refetchInterval`. Samotné uplynutie staleTime nespúšťa request.
- `resources/model/inventoryQueries.ts:27–30,60–120` už obsahuje spoločné query definície z generovaných fetcherov a keys. Cache uchováva validovanú API odpoveď; UI mapovanie je v observer `select`. Prefetch musí ukladať tú istú API odpoveď, nikdy namapovaný UI model.
- `useVmwareResourceInventory.ts:41–102` normalizuje vstup, debouncuje prefix 300 ms a povoľuje fetch až so známym providerom. Pri zmene providera nepoužíva jeho predchádzajúce placeholder dáta. Force refresh používa `force_refresh: true` a výsledok uloží cez `setQueryData` pod bežný key (`:125–130`). Tento mechanizmus zostáva zachovaný.
- Vyhľadávanie runtime `src/` neodhalilo existujúce `prefetchQuery()` volania. Cache reuse už existuje vďaka spoločným keys; návrh pridáva skorší začiatok requestu, nie ďalšiu cache vrstvu.

### Skutoční konzumenti a filtre

- `dashboard/pages/OverviewPage.tsx:20–47` používa `dashboardFixture`, lokálny stav `demo/loading/empty/partial/unknown` a lokálne tlačidlo Refresh. Nemá kritickú dashboard API query ani serverový signál jej dokončenia. V súčasnom kóde preto kritické načítanie znamená dokončený commit vykresleného Dashboardu mimo `loading` a `unknown`, nie vymyslený nový API kontrakt. Pri budúcej integrácii reálneho Dashboard API sa musí ready gate pripojiť na jeho skutočné kritické queries.
- `layouts/app-shell/AppSidebar.tsx:53–54,195` odkazuje na holé `routes.resources` a `routes.resourcesIse`; neprenáša Dashboard query string. Pre prvý prefetch sú teda cieľové search params prázdne. Parametre aktuálneho Dashboard URL sa nepoužijú ako filtre cieľa.
- `resources/hooks/useResourceTabSearchParam.ts:43–48` volí bez cieľových parametrov `resourceTab='vmware'`, `providerId=null`. `buildResourceSourceTabs.ts:4–8,32–65` zoskupuje VMware → FlashSystem → IBM Power, v rámci typu triedi podľa name a potom ID cez `localeCompare` s numeric/base. Stránky vyberajú presnú tab/provider zhodu → prvú tab daného typu → prvú tab; po úspešnom providers načítaní preskočia prázdny tab na prvý dostupný. Pri chýbajúcom VMware teda môže byť prvý aktívny FlashSystem alebo Power, pri chýbajúcej role žiadny inventár.
- `providers/utils/providerFilters.ts:27–30`: source znamená `provider.role !== 'target'`, target presne `=== 'target'`. Nenahrádzať source pravidlo prísnym `=== 'source'`. Resource tabs dnes nefiltrujú credentials; prefetch nesmie kvôli credentials zvoliť iného náhradného providera. Pri známom neplatnom credential stave preskočiť prefetch jeho inventára bez náhrady; stránka si ponechá existujúci výber a demand/error správanie.
- `useVirtualMachineSearchParams.ts:88–111` rieši filtre v poradí: pevný provider scope cez `resolveVmwareProviderFilter` → aktívne URL filtre → `readProviderFilterSnapshot({role,resourceTab:'vmware',providerId})` → provider defaults. URL je aktívna, ak `vmwareActiveProvider` zodpovedá scope ID `${role}:${encodeURIComponent(id)}`, alebo marker chýba a URL obsahuje aspoň jeden z `search,powerState,connectionState,cluster,tags,untagged`. Bez scope sa berie snapshot iba pre rovnaké ID a rolu. Chýbajúci/poškodený/nedostupný session storage dá existujúci fallback.
- Pevný scope vynuluje ostatné VMware UI filtre a pre API používa trimmed prefix a prvý neprázdny tag; prepisuje aj URL/session filter. `getServerSideTagFilter` vracia tag iba pre presne jeden zvolený tag. Viac tagov zo snapshotu preto nie je rovnaký request ako prvý tag. `vmwareInventoryQuery` ešte normalizuje trim/empty. `folderName` factory podporuje, tieto Resources/RG vstupy ho však neposielajú. Nový resolver toto správanie nesmie meniť.

- `resources/pages/ResourcesPage.tsx` a `resources-ise/pages/ResourcesIsePage.tsx:23,70–89` načítajú `useGetProviders({ role: 'all' })`, následne lokálne zvolia source/target providera a rovnaké vendor komponenty. Odlišná rola obvykle znamená iné provider ID; rovnaké typy providerov ešte neznamenajú rovnaké dáta.
- `resources/components/vmware/VmwareResourcesPage.tsx:49–83` čaká na providera a inicializáciu URL/session filtrov. VMware API dostáva `providerId`, prefix a serverový tag. Ostatné UI filtre a stránkovanie sa aplikujú lokálne (`:94–98`). Neprenášať ich svojvoľne do API keys.
- `resources/hooks/useResourceInventoryQueries.ts:44–78` používa `flashSystemInventoryQuery` alebo `powerInventoryQuery`. Provider rola určuje lokálny výber; nie je dodatočným API parametrom.
- `recovery-groups/hooks/useRecoveryGroupResourceInventory.ts:115–181` používa tie isté vendor definície. VMware provider scope má prioritu pred používateľským searchom; berie orezaný prefix a prvý neprázdny tag cez `resolveVmwareProviderFilter`. Bez pevného scope ide search na server; prvé otvorenie Resources má prázdny používateľský prefix. IBM Power scope prefix sa aplikuje lokálne nad provider inventárom, tags sa na Power API neposielajú.
- `recovery-groups/components/RecoveryGroupResourcesStep.tsx:31–66` resetuje používateľský search podľa providera/search mode a až po mountovaní zapína inventory hook.
- `recovery-groups/components/RecoveryGroupBuilder.tsx:137–178,234–247,287–301,375–470`: Provider je krok 4; Resources používa `resourcesStepIndex`; Related storage sa renderuje iba pre VM. Source storage provider je známy z Topology. Compute provider sa vyberie v kroku Provider. Resources krok sa mountuje až pri prechode doň. V Related storage je ďalší `RecoveryGroupResourcesStep` s `workloadType="ibm_flashsystem"` a `relatedVolumeProviderId`.
- `useRecoveryGroupRelatedVolumes.ts:15–43` dnes načíta jeden `vdisksByVmQuery(vmName, computeProviderId)` pre každú vybranú VM až v Related storage, a iba ak sú známe compute aj storage ID. Storage ID nie je parametrom endpointu; resolution robí backend. Výsledné názvy volumes sa do draftu pridávajú existujúcou logikou buildera, ktorú prefetch nesmie spúšťať ani meniť.
- `resources/hooks/useVmStorageVolumes.ts:4–12` používa rovnaký vdisk key pre detail VM/LPAR. Odpoveď mapovaná v `mapVmStorageVolumes.ts:34–59` obsahuje aj snapshot metadata (`sanpshosts` je existujúce wire pole).
- `discovery-settings/pages/DiscoverySettingsPage.tsx:44–46` číta konfiguráciu backend cache. `DiscoveryHistoryCard.tsx:33–36` číta providers a históriu s `historyParams(providerId, 100)`. Nečíta inventár VM/volumes. Discovery jobs je placeholder v `modulePageConfigs.ts:58–67`. Nie je tu spoločný inventárny payload, ktorý by prefetch Discovery automaticky pripravil.
- Infrastructure je ďalší skutočný konzument: `infrastructure/hooks/useInfrastructureInventory.ts:15–35` používa provider Power inventár alebo VMware bez filtrov. VMware filtrovaný Resources výsledok preto nie je jeho náhradou.
- V produkčnom Recovery Group builderi nie je samostatný výber snapshotov ani snapshot query. `RecoveryGroupInventory.tsx:34–36` a summary načítajú inventár konkrétneho `run_id` cez `useGetRecoveryGroupInventory`, obsahujúci replikačný reťazec a snapshoty. Nezamieňať tento payload s VM→volume discovery ani so zoznamom FlashSystem volumes.

### Mapovanie: konzument → endpoint → key → parametre → spúšťač

Endpointy sú relatívne k existujúcemu API base (`/api`); keys túto base neobsahujú. Tvary nižšie opisujú súčasný kód, implementácia vždy volá existujúcu factory, neskladá arrays ručne.

| Konzument | API endpoint | Query key / factory | Parametre | Navrhnutý spúšťač |
|---|---|---|---|---|
| Dashboard príprava; Resources, ISE, RG, Providers a Discovery history – providers | GET `/get_providers` | `getGetProvidersQueryKey({role:'all'})` = `['/get_providers',{role:'all'}]` | role all; lokálne source/target | Po Dashboard ready, `fetchQuery` s existujúcimi generated options; ostatní zdieľajú cache |
| Resources/ISE VMware, RG Resources | POST `/vms/search` | `vmwareInventoryQuery(search)` → `['POST','/vms/search',{provider_id},body]` | provider; body `folder_name`, `tag`, `name_prefix`, iba keď neprázdne | Dashboard: počiatočný provider každej role a presné cieľové filtre; RG: krok Provider pri inom/chýbajúcom/stale key |
| Resources/ISE IBM Power, RG Resources; Infrastructure | GET `/get_power_vm` | `powerInventoryQuery(id)` → `['/get_power_vm',{provider_id:id}]` | provider; prefix sa filtruje lokálne | Dashboard: počiatočný provider role, ak výber padne na Power; RG krok Provider |
| Resources/ISE FlashSystem, RG volume Resources a Related storage | GET `/get_volumes` | `flashSystemInventoryQuery(id)` → `['/get_volumes',{provider_id:id}]` | konkrétny storage provider | Dashboard: počiatočný provider role, ak výber padne na FlashSystem; RG Provider/Related storage |
| Detail VM/LPAR, RG Related storage | GET `/vdisks_by_vm` | `vdisksByVmQuery(name,id)` → `['/vdisks_by_vm',{vm_name:name,provider_id:id}]` | presný názov VM/LPAR a compute provider; bez storage ID | RG Resources po zmene vybraných VM, iba vybrané mená |
| Resources/ISE tag options | GET `/tags` | `tagsQuery(id)` / `getGetTagsQueryKey({provider_id:id})` | provider | Žiadny nový; RG tento zoznam nepotrebuje |
| Discovery configuration | GET `/discovery/cache/config` | `getGetDiscoveryCacheConfigQueryKey()` | bez parametrov | Žiadny nový; existujúci configuration tab |
| Discovery history | GET `/discovery/cache/history` | `getGetDiscoveryCacheHistoryQueryKey(historyParams(id,100))` | voliteľný provider, limit 100 | Žiadny nový; existujúci history tab/filter |
| RG run inventory/summary – snapshoty a replikácia | GET `/get_recovery_group_inventory` | `getGetRecoveryGroupInventoryQueryKey({run_id})` | konkrétny run | Žiadny nový; existujúci active/run gate |
| RG Metro Mirror prefill | GET `/get_metro_mirror_relationships` | `getGetMetroMirrorRelationshipsQueryKey({provider_id,volume_names})` | storage ID, deduplikované zoradené mená | Už sa načítava z buildera pri známom výbere; nepridávať druhý trigger |

## Jedno odporúčané riešenie

Jeden tok nad existujúcim QueryClient: Dashboard ready → existujúci provider zoznam → spoločný výpočet počiatočného výberu/VMware filtrov → existujúce inventory factories → `prefetchQuery` → Resources/ISE a RG observers nad rovnakými keys. Pridať iba zdieľanie už existujúcej rozhodovacej logiky, malý Dashboard hook a dva RG efekty. Nevytvárať novú cache vrstvu ani registry queries. Nespoliehať sa na `enabled` v imperative prefetchi: gates musia byť pred volaním.

### Trigger D: Dashboard → Resources a Resources ISE (primárny rez)

1. `OverviewPage` zavolá nový malý `useInitialResourcePrefetch(ready)`, kde dnes `ready = state !== 'loading' && state !== 'unknown'`. Hook používa existujúci `useQueryClient()`. Efekt sa plánuje až po commite ready Dashboardu: `requestIdleCallback` s timeout 1000 ms, pri nepodporovanom API `setTimeout(...,0)`. To odsúva prácu mimo render; nečaká sa na otvorenie menu ani klik. Nezavádzať network-idle polling ani čakanie na všetky queries aplikácie. Demo/empty/partial sú vykresliteľné stavy, nie dôkaz existencie providerov.
2. Kontext sa získa `queryClient.fetchQuery(getGetProvidersQueryOptions({role:'all'}))`. Použiť štandardnú freshness, nie `ensureQueryData`, ktoré by bez ďalšieho mohlo vrátiť stale zoznam. Výsledok je validovaná API odpoveď; `selectProviders(response)` použiť až na výpočet výberu, nevložiť tento UI model pod provider key. Pri čerstvej cache nevznikne metadata request; pri pending ho zdieľa aj priamo otvorená stránka. Pri chybe skončiť tento pokus bez toastu, fallback providera alebo inventory requestu. Demand načítanie zostáva funkčné.
3. Pre každú rolu samostatne vypočítať výber, ktorý by mala jej stránka na holom route URL. Extrahovať čistú funkciu `resolveActiveResourceTab(roleTabs, resourceTab, providerId, providersSuccess)` do existujúceho `buildResourceSourceTabs.ts` z dnešných identických riadkov 33–39 oboch stránok a použiť ju aj v Resources/ISE. Dashboard použije existujúce role tab builders, rovnaké triedenie a vstup `vmware,null,true`. Pre labels stačia stabilné type labels: nesmú ovplyvniť výber/triedenie. Bez dostupného provider ID pre rolu nič nefetchovať. Nepamätať posledný tab novou session položkou: dnešná aplikácia ho takto neobnovuje.
4. Pre zvolený VMware provider zdieľať čistú funkciu `resolveVmwareInitialFilters` extrahovanú z existujúceho hooku do `resources/helpers/resolveVmwareInitialFilters.ts`. Vstup: provider s rolou, cieľové `URLSearchParams` a existujúci snapshot (ak je potrebný). Výstup: presne dnešné VMware filtre. Hook aj Dashboard použijú tú istú funkciu; session čítanie ostáva existujúce `readProviderFilterSnapshot`, Dashboard nič nezapisuje/nevynuluje. Pevný scope, URL marker, defaults a tag parsing sa presunú bez behavior zmeny. Hook si ponechá URL/session write efekty. Dashboard číta snapshot až po získaní konkrétneho providera, nie všetky storage položky.
5. V malom switchi zavolať `void prefetchQuery(vmwareInventoryQuery({providerId,namePrefix:filters.search,...serverTag}))`, alebo existujúcu Power/FlashSystem factory. Server tag odvodiť existujúcim `getServerSideTagFilter`; factory rieši normalizáciu. Nemení sa `useVmwareResourceInventory` debounce 300 ms; aj po dokončenom prefetchi môže konzument krátko čakať na svoj debounce, no nemá druhý API request. Power/FlashSystem lokálne filtre nemenia API options. Tags zoznam nie je podmienka spustenia inventára a nový tags prefetch sa nepridáva.
6. Rozpočet jedného ready cyklu Dashboardu: najviac jeden provider-list key a dve inventárne queries, jedna pre počiatočný source a jedna pre počiatočný target výber. Žiadne ostatné tabs/providery, disks ani snapshoty. Pri dvoch rovnakých keys cache sama deduplikuje; typicky sú ID source/target odlišné. Bežný request bez filtra je prípustný iba pre konkrétny vybraný provider, ak ho presne tak používa jeho úvodná stránka; nikdy nevolať factory bez provider ID.
7. Efekt závisí od ready/queryClient, nie density/detail/refreshed UI stavu. Cleanup zruší nenabehnutý idle callback/timer a nastaví lokálny disposed flag: po odchode z Dashboardu metadata request môže dobehnúť do cache, ale nesmie následne rozbehnúť nový inventory fan-out. Už spustené zdieľané requesty globálne nerušiť. Po `loading/unknown → ready` alebo novom mountovaní možno plán zopakovať; čerstvé/pending keys opätovné HTTP nevyvolajú. Neudržiavať trvalý „prefetched“ flag, ktorý by blokoval obnovu stale cache.

Rozpočet označuje počet unikátnych queries v jednom ready cykle, nie maximálny počet HTTP pokusov pri chybe: existujúce `retry: 1` sa nemení. Testy duplicít počítajú úspešné požiadavky bez retry; failure testy reportujú retry zvlášť.

### Resources ↔ Resources ISE

Obe stránky čítajú providers z rovnakého key a inventár cez tie isté factories. Rola je súčasť výberu a session filter scope; provider ID a serverové filtre sú súčasťou inventárneho key. Pri presnej zhode sa používa hotový/pending payload z cache, pri odlišnom providerovi alebo filtri ide o inú query. Nedávať source výsledky pod target key, nepridávať rolu do wire query key a neprefetchovať pri každom prepnutí všetky tabs.

Vďaka Trigger D sú pripravené oba skutočné počiatočné kontexty ešte pred prvou návštevou. Pri neskoršom návrate stránka opäť vyrieši svoj skutočný URL/session filter a cache použije iba pri zhode; zmenená URL/session po prefetche môže správne vyvolať inú query. Tento návrh nemení cieľ sidebar linkov ani URL normalizáciu. Bez pripravenej cache, napr. pri priamom deep linku, zostáva existujúci demand fetch.

### Trigger A: Provider → Resources

Ide o doplnenie cache pripravenej pre Resources, nie o nový paralelný inventory model. Ak RG potrebuje presne rovnakého providera/prefix/tag, prefetch je cache hit; odlišný používateľský search z Resources nenahrádza širší RG počiatočný dotaz. Naopak, širší výsledok sa nekopíruje pod užší key. Existujúce RG normalization a scope pravidlá sa zachovajú.

Umiestniť efekt za výpočet `baseValid`/`changeSource` a pred JSX. Spustiť iba pri `step === 4`, `baseValid`, `providerQuery.isSuccess`, bez provider fetch/error, `!readOnly`, `!isInitialLoading` a neprázdnom `draftState.providerId`. Rovnaké provider/type/credential/topology pravidlá ako existujúci wizard; nič nové nevyberať automaticky.

Podľa `draftState.workloadType`:

1. `vmware_virtual_machines`: vyžadovať známy `selectedProviderScope`. Zavolať `resolveVmwareProviderFilter(selectedProviderScope)`; `vmwareInventoryQuery({providerId, ...(prefix ? {namePrefix:prefix}:{}), ...(tag ? {tag}: {})})`. To je presne počiatočný search následného RG Resources kroku: pri pevnom scope jeho prefix/tag, bez scope prázdny body. `folderName` sa do RG nepridáva, lebo ho konzument nepoužíva. Nepreniesť URL filtre z inej obrazovky a neprednačítavať budúce používateľské prefixy.
2. `ibm_power_virtual_machines`: `powerInventoryQuery(providerId)`, žiadny tag/prefix v API params.
3. `ibm_flashsystem`: `flashSystemInventoryQuery(providerId)`; ID už vyplýva zo zvoleného Source v Topology.

Efekt sa odvíja od primitívnych hodnôt step, gates, workload, provider ID, normalizovaného scope prefix/tag a queryClient. Nevkladať novo vytvorený scope objekt do dependencies tak, aby metadata render spúšťal ďalšie efekty. Opakované volanie pre čerstvý alebo práve načítavaný rovnaký key nesmie vytvoriť ďalší request. Pri rýchlom Next sa prefetch a observer spoja cez rovnaký key. Navigácia na dáta nečaká; všetky existujúce loading/error stavy zostávajú.

### Trigger B: vybrané VM → Related storage

Druhý efekt za rovnakými odvodenými gates. Spustiť iba pri `step === resourcesStepIndex`, `hasRelatedStorageStep`, `baseValid`, úspešne ustálených providers, `!readOnly`, `!isInitialLoading`, známom compute ID, platnom `relatedVolumeProviderId` a aspoň jednej vybranej VM/LPAR. Storage provider musí byť existujúci FLASHCOPY s platnými credentials podľa súčasných topology pravidiel; nič nedohľadávať náhradným providerom.

- `void prefetchQuery(flashSystemInventoryQuery(relatedVolumeProviderId))` pripraví zoznam volumes pre nasledujúci picker.
- Pre každé unikátne meno z `draftState.resources` zavolať `void prefetchQuery(vdisksByVmQuery(name, providerId))`. Mená nemeniť: použiť rovnaké hodnoty ako následný hook, bez novej normalizácie case/trim. Deduplikovať možno iba úplne rovnaké reťazce.
- Efekt reaguje na zmenu výberu alebo provider kontextu; použiť existujúcu referenciu `draftState.resources` (metadata aktualizácie ju nemenia), nie nanovo vytvorený array v dependencies. Nevykonávať prefetch všetkých dostupných VM. Fan-out je obmedzený na skutočne vybrané zdroje a zodpovedá následnému `useQueries`.
- Nič nezapisovať do draftu, nezapínať skôr `useRecoveryGroupRelatedVolumes` a nemení sa discovery exclusions, Metro Mirror prefill ani validácia. Editácia s uloženými zdrojmi sa pokryje po otvorení Resources kroku; readonly editor sa neprefetchuje.
- Odobratý zdroj môže dobehnúť do vlastnej cache. Nerušiť zdieľané queries pri každej zmene výberu alebo unmountovaní: mohol by ich práve používať iný konzument. Starý výsledok nesmie ovplyvniť nový výber ani providera.

### Kde nový trigger nepridať

Zoznam RG bez zvoleného providera nespúšťa inventory fan-out. Discovery configuration/history má odlišné payloady. Tags, run snapshot inventory a Metro Mirror lookup zostávajú pri svojich existujúcich gates. Dashboard má výslovný obmedzený Trigger D; Resources ↔ ISE využívajú pripravené presné keys bez ďalšieho plošného triggera.

## Pravidlá cache a aktuálnosti

- Zachovať 15/60 min a všetky globálne refetch/retry nastavenia. Nedávať iba prefetchu vlastný staleTime, ktorý by sa rozchádzal s observerom. Testy vytvoria klienta s `STANDARD_QUERY_OPTIONS`; existujúce test fixtures so staleTime 0 samy osebe nedokazujú produkčnú cache reuse.
- Čerstvý úspešný key: bez siete; prebiehajúci rovnaký key: zdieľať request; stale/invalidovaný key: normálne znovu načítať. Nepoužiť kontrolu samotnej existencie `getQueryData` ako náhradu freshness.
- Prefetch má byť bez UI hlášok a bez nového pending flagu. Jeho neúspech nevyhadzuje chybu do navigácie; následný observer smie vykonať normálny fetch/retry. Zachovať jeho retryOnMount správanie.
- Generované mutácie už invalidujú provider list (`submitProvider`, `deleteProvider`), RG list (submit/delete/rollback) a Discovery config (PUT). Nerušiť `skipInvalidation` ani callbacks. Tieto invalidácie samy osebe neinvalidujú všetok inventár; tento návrh nesľubuje takúto novú garanciu.
- Zmena VMware scope prefix/tag vytvorí nový key. Power scope zostáva lokálnou selekciou nad rovnakým provider payloadom. Bežný prefetch rešpektuje backend cache; čerstvosť je v existujúcich hraniciach frontend/backend cache, nie záruka live stavu zariadenia.
- Manuálny VMware force refresh zostáva existujúcou cestou s `force_refresh: true` a zápisom pod bežný key. Nevytvárať ďalší automatický prefetch pri mount/focus/refresh Resources. Pri odchode z Dashboardu zabrániť oneskorenému spusteniu nových queries; už pending request sa zdieľa s konzumentom. Cez regresný test overiť, že následný refresh nahradí prednačítanú odpoveď; nezavádzať ďalší zápis cez `setQueryData` v prefetch kóde.
- Nepridávať nový storage key, rolu do inventárneho key, vlastnú cache, persistenciu ani heuristické kopírovanie výsledkov medzi filtrami. Nezasahovať do existujúceho session lifecycle.

Semantika overená aj v lokálnom `node_modules/@tanstack/query-core/src/queryClient.ts` (`fetchQuery`, `prefetchQuery`): používa default options a `prefetchQuery` ukončí promise bez propagovania fetch chyby. Referencie: [TanStack prefetching](https://tanstack.com/query/v5/docs/framework/react/guides/prefetching), [TanStack invalidation](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation). Invalidácia označuje dáta stale aj počas staleTime; aktívne queries môže refetchnúť.

## Súbory pre budúcu implementáciu

| Súbor | Budúca zmena |
|---|---|
| `src/features/discovery-inventory/resources/helpers/buildResourceSourceTabs.ts` | Extrakcia `resolveActiveResourceTab` z existujúcich stránok, zachovanie fallback poradia |
| `src/features/discovery-inventory/resources/helpers/buildResourceSourceTabs.test.ts` | Počiatočný výber, role, poradie, prázdne typy a neplatné URL ID |
| `src/features/discovery-inventory/resources/pages/ResourcesPage.tsx` | Použiť spoločnú tab funkciu bez zmeny správania |
| `src/features/discovery-inventory/resources-ise/pages/ResourcesIsePage.tsx` | Použiť tú istú funkciu s target tabs |
| Nový `src/features/discovery-inventory/resources/helpers/resolveVmwareInitialFilters.ts` a `.test.ts` | Extrahovaná existujúca rozhodovacia logika URL/scope/snapshot/default, čistá funkcia a testy |
| `src/features/discovery-inventory/resources/hooks/useVirtualMachineSearchParams.ts` | Použiť spoločný výpočet filtrov, zachovať existujúce efekty a update API |
| Nový `src/features/discovery-inventory/resources/hooks/useInitialResourcePrefetch.ts` a `.test.tsx` | Ready scheduler, providers metadata query a najviac dve presné inventárne queries; test s reálnym QueryClient |
| `src/features/dashboard/pages/OverviewPage.tsx` | Zavolať nový hook s konkrétnym ready gate |
| `src/features/dashboard/pages/OverviewPage.test.tsx` | Prispôsobiť QueryClient wrapper a overiť ready/loading/unmount bez reálnych sieťových volaní |
| Nový `src/features/discovery-inventory/resources/pages/ResourcesPrefetch.integration.test.tsx` | Dashboard príprava → reálne Resources/ISE → RG cache reuse/izolácia |
| `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.tsx` | Dva nadväzujúce RG efekty z existujúceho návrhu |
| Nový `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.prefetch.test.tsx` | RG inventory a Related storage trigger/gates s reálnou cache |
| `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx` | Doplnený QueryClient wrapper pre pôvodné mockované unit testy; produkčný builder teraz klienta priamo používa |

Žiadna nová query key factory ani produkčný cache modul. Existujúce `inventoryQueries.ts`, `useVmwareResourceInventory`, provider singleton, cache policy, generated klienti, routing a `public/config.js` sa neupravujú. Ostatné existujúce test súbory v TODO sú focused regresné validácie.

## Závislosti a poradie

Existujúci QueryClient/factories → presný spoločný tab/filter výpočet → Dashboard ready prefetch → Resources/ISE reuse → RG doplnenie chýbajúcich keys → Related storage → focused regresie a rovnaké pred/po meranie.

1. T1: baseline vrátane prvého otvorenia Resources/ISE z Dashboardu.
2. T2: zdieľať aktuálny tab/provider výber bez behavior zmeny.
3. T3: zdieľať aktuálne počiatočné VMware filtre bez behavior zmeny.
4. Checkpoint A: počiatočné kontexty pre source/target presne zodpovedajú konzumentom.
5. T4: Dashboard ready → metadata → dva počiatočné inventáre.
6. T5: integračné overenie Dashboard → Resources ↔ ISE → RG reuse.
7. Checkpoint B: primárny cieľ Resources pokrytý pred ďalším RG rozšírením.
8. T6: RG Provider → chýbajúci/stale Resources inventár.
9. T7: vybrané VM → Related storage.
10. Checkpoint C: RG/storage gates a request counts.
11. T8: focused regresie a porovnanie merania; záverečný review.

Implementácia bola schválená pokynom `executing-plans inline` a vykonaná v aktuálnom checkoute bez novej vetvy. T1/časť T8 nemajú živé meranie: dostupný browser inventár vrátil prázdne `apps` aj `browsers` a Chrome DevTools MCP nie je nakonfigurovaný. Blokované meranie nebolo nahradené odhadom; T2–T7 sa overili automatizovane.

## Testy, meranie a akceptácia

Testovať produkčnú 15-min freshness pomocou riadeného času bez reálneho čakania. Pri sieťových testoch použiť validné fixtures a odloženú promise na ovládanie priebehu requestu. Overovať HTTP počty/body a výsledok UI/cache, nie len počet volaní helpera.

- Prefetch → mount presného konzumenta = jeden request celkovo; pri súbežnom mountovaní tiež jeden. Zopakovať pre VMware, Power, FlashSystem a vdisks.
- Rozdielne provider ID, prefix, tag a folder produkujú oddelené VMware entries; žiadny únik dát medzi poskytovateľmi. Overiť pevný scope aj prázdny počiatočný scope, následný používateľský prefix a Power lokálny scope.
- Po `invalidateQueries({queryKey,exact:true,refetchType:'none'})` pred mountom musí prísť nový výsledok; zvlášť simulovať uplynutie 15 min a testovať existujúcu relevantnú generated mutation invalidáciu. Netvrdiť, že RG mutation invaliduje inventory.
- Rýchly Next funguje s pending requestom; po jeho dokončení sa zobrazia dáta bez druhého requestu. Po definitívnom zlyhaní prefetchu následný mount znovu fetchne a môže uspieť.
- Dashboard začne metadata až po ready commite a scheduler callbacku. Testovať demo/empty/partial, loading/unknown, metadata failure a odchod pred callbackom aj počas providers requestu. Na veľkom zozname providerov stále najviac dva počiatočné inventáre; pri chýbajúcej role žiadny jej inventár. Žiadny request bez konkrétneho ID.
- Presný výber providerov: numerické zoradenie mien/ID, chýbajúci VMware, prázdne source/target, source záznam bez target role, neplatné requested ID. Filtre: pevný scope má prioritu pred URL/snapshot, prázdny URL obnoví snapshot danej role, aktívna URL ho prekoná, stale marker a viac tagov nemenia existujúcu semantiku; nedostupné session storage použije defaults.
- Pri RG unknown scope/providers, neplatných credentials alebo readonly/loading editore nevznikne prefetch. Zoznam RG sám nič neprednačítava; zmena zdrojov neprefetchuje nevybrané mená.
- Celý tok Dashboard prefetch → prvý Resources mount → ISE mount → RG Resources otestovať s reálnymi observers a počtami HTTP. Zhodný provider a filter nepridá request; iné ID alebo RG scope/search správne vytvorí vlastný key, aj keď endpoint a vendor sú rovnaké.
- Existujúce Resources/ISE route reuse, Discovery config/history a RG storage/Metro Mirror správanie prejdú focused regresnými testami; payload/draft sa prefetchom nemení.

Pred a po: DevTools Network/Performance s rovnakým datasetom a throttlingom, 3 opakovania každého toku nižšie. Pred studeným tokom hard reload na Dashboardu (nová in-memory Query cache); samostatne použiť čistú session filter históriu a uložený filter. Potom počas toku držať app session a cache zapnutú. Nemerať iba teplý návrat do už navštívených Resources. Backend cache stav držať rovnaký alebo ho uviesť ako obmedzenie; inventár neforce-refreshovať kvôli meraniu.

| Tok | Zaznamenané údaje |
|---|---|
| Dashboard → prvé Resources | Čas ready/viditeľného Dashboardu, metadata start/end, inventory start/end, klik a prvé použiteľné rows; medián klik→rows, počet provider/inventory requestov |
| Dashboard → prvé Resources ISE (samostatný studený štart) | Rovnaké údaje pre target; neodvodiť ho len zo source výsledkov |
| Resources → ISE → Resources | ID/filtre pri každom prechode, cache hits a HTTP počty; odlišné source/target dáta sa nemiešajú |
| Resources → RG Provider → RG Resources | Presná zhoda filtrov aj zámerne rozdielny RG scope; medián Next→použiteľný picker, hits/misses a duplicity |
| RG vybrané VM → Related storage | Vybrané mená a compute/storage ID, štart vdisk/volumes, Next→použiteľné volumes, request count |

Pre prvé dva toky držať rovnaký predstih (napr. klik 2 s po ready Dashboardu) pred aj po zmene; navyše skúsiť okamžitý klik a klik po dokončení prefetchu. Pre RG porovnať okamžitý Next aj dokončený prefetch. Reportovať zvyšný 300-ms VMware debounce osobitne od API čakania. Z Dashboard trace porovnať aj prvé vykreslenie a interaktivitu, aby skoré API neodďaľovalo jeho kritický obsah.

Úspech primárneho cieľa: provider metadata a vybrané počiatočné inventáre sa začnú na Dashboarde po ready, pred klikom; po dokončenom fresh prefetchi prvý mount Resources/ISE nevyvolá druhý inventory request. Pri pending sa request zdieľa a navigácia nečaká. Klik→použiteľné dáta sa zníži o využiteľný predstih v rámci šumu a existujúceho debounce. Dashboard nevykazuje opakovateľné zhoršenie kritického vykreslenia. Úspech sekundárneho cieľa: rovnaký RG key znovu použije Resources payload, odlišný key sa načíta samostatne a Related storage načíta iba relevantné VM/volumes. Celkový rozpočet špekulatívnych dashboard queries zostáva 1 metadata + najviac 2 inventáre; aj neotvorená druhá počiatočná rola môže byť prednačítaná, čo je výslovný kompromis tohto návrhu. Nevyžadovať univerzálne percento zrýchlenia.

## Riziká a riešenia

| Riziko | Dopad | Riešenie |
|---|---|---|
| Predčasný VMware request bez scope alebo pod iným filtrom | Vysoký | Čakať na provider záznam; rovnaký scope helper/factory a integračný test presného body |
| Testovací QueryClient má staleTime 0 | Stredný | Použiť STANDARD_QUERY_OPTIONS; osobitne riadiť retry a čas |
| Prechod Resources/ISE použije iného providera | Vysoký | Žiadny prenos výsledkov medzi keys; len presná cache reuse |
| Vybrané VM vytvoria veľa vdisk requestov | Stredný | Iba unikátne vybrané zdroje; existujúca deduplikácia, žiadny prefetch dostupného inventára |
| Efekt sa spustí pri každom metadata renderi | Stredný | Primitívne scope dependencies a stabilný existujúci resources array; StrictMode/count test |
| Staré odpovede zmenia nový draft | Vysoký | Prefetch zapisuje iba do vlastného query key; nezapína discovery reconciliation predčasne |
| Backend cache nie je live | Existujúci | Zachovať force refresh; rozlišovať frontend freshness a backend cache |
| Nesúvisiace rozpracované plány | Vysoký | Použiť iba topic-specific dokumenty; neimplementovať ich otvorené body |
| Dashboard nemá API ready signál | Stredný | Dnes gate podľa vykresleného stavu a odložený callback; nevymýšľať endpoint, pri budúcom API naviazať na skutočné kritické queries |
| Prednačítaný provider nezodpovedá fallback tabu stránky | Vysoký | Extrahovať existujúce active-tab rozhodnutie, rovnaké triedenie/source-role pravidlo, test proti reálnej stránke |
| URL/session filtre sa rozídu s prefetchom | Vysoký | Spoločná filter funkcia; role-scoped snapshot, pevný scope má prioritu; pri neskoršej zmene filtrov normálny cache miss |
| Prefetch súťaží s Dashboardom alebo načíta veľa dát | Stredný | Ready + idle callback, najviac dve presné provider queries; zmerať kritické vykreslenie aj objem/request count |
| Providers dobehnú až po odchode z Dashboardu | Stredný | Disposed guard pred inventory fan-out, cleanup plánovača; nezrušiť request zdieľaný s Resources |

## Otvorené otázky

Na uzavretie merania treba dostupný prehliadač/runtime pre scenáre vyššie. Počas implementácie pribudli súbežné cudzie zmeny Dashboard grafov, ktoré boli zachované; posledný spoločný typecheck hlási `OverviewPage.tsx:56` – voliteľný `snapshots` prop dostáva explicitné `undefined` pri `exactOptionalPropertyTypes`. Tento riadok nepatrí k prefetch zmene. Detaily a vykonané príkazy sú v TODO. Zatiaľ sa netvrdí namerané zrýchlenie ani zelený spoločný typecheck.
