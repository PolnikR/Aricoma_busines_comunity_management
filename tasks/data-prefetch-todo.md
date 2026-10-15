# TODO – Resources-first Data Prefetching

Plán: [data-prefetch-plan.md](data-prefetch-plan.md). Vyžiadaná revízia tej istej úlohy: pôvodné nezačaté T1–T4 nahrádza toto poradie. Implementácia T2–T7 vykonaná inline 2026-10-15. T1 a záverečné runtime/typecheck overenie nie sú uzavreté.

## Pred začiatkom

- [x] Používateľ schválil implementáciu revízie pokynom `executing-plans inline`.
- [x] Overené `git branch --show-current` = `spike/ant-design-shell`, pracovný stav a pravidlá. Implementácia prebehla v aktuálnom checkoute, bez novej vetvy podľa pokynu.
- [x] Zachované eager Resources/ISE/Providers, routing, API, cache policy a `public/config.js`; žiadny commit/push/merge.
- [x] Ostatné plány a `prototypes/dashboard-chart-study/` nedotknuté. Neskoršie cudzie zmeny Dashboard grafov zachované.

## T1: Baseline prvého otvorenia Resources a RG prechodov

**Popis:** Pred behavior zmenou vykonať malé meranie všetkých tokov z plánu, bez benchmark infraštruktúry.

**Akceptačné kritériá:**

- [ ] Tri opakovania studeného Dashboard → Resources a samostatného Dashboard → Resources ISE, čistý aj uložený session filter. Rovnaký predstih/dataset/throttling; ready/render Dashboardu, klik, použiteľné rows a HTTP počty.
- [ ] Zaznamenať Resources ↔ ISE, Resources → RG Resources a VM → Related storage, zhodný aj odlišný query kontext.
- [ ] Doplniť Výsledky vrátane mediánov, ID/filtrov a backend cache podmienok. Pri nedostupnom runtime/API uviesť blocker, neoznačiť meranie za splnené.

**Overenie:**

- [ ] DevTools Network/Performance podľa plánu, vrátane okamžitého kliku/Next.
- [ ] `git diff --check` pre zapísané výsledky; suite/build nespúšťať.

**Závislosti:** Schválenie implementácie; baseline musí predchádzať T4.
**Súbory:** tento TODO.
**Rozsah:** S, 1 súbor.

## T2: Zdieľať presný počiatočný tab/provider výber

**Popis:** Extrahovať riadky 33–39 oboch Resources stránok do funkcie resolveActiveResourceTab(roleTabs, resourceTab, providerId, providersSuccess) v existujúcom buildResourceSourceTabs.ts. Obe stránky použijú helper bez zmeny správania.

**Akceptačné kritériá:**

- [x] Zachovať exact ID → prvý tab typu → prvý tab a preskočenie prázdneho tabu po úspechu providers.
- [x] Testy pokrývajú numeric/base sort name/ID, chýbajúci VMware, prázdnu rolu, neplatný ID a source role !== target oproti target role === target.
- [x] Žiadna zmena URL/renderu/eager importov ani nová perzistencia posledného tabu.

**Overenie:**

- [x] `npm exec vitest run src/features/discovery-inventory/resources/helpers/buildResourceSourceTabs.test.ts src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx src/features/discovery-inventory/resources-ise/pages/ResourcesIsePage.test.tsx`
- [x] `npm exec eslint -- src/features/discovery-inventory/resources/helpers/buildResourceSourceTabs.ts src/features/discovery-inventory/resources/helpers/buildResourceSourceTabs.test.ts src/features/discovery-inventory/resources/pages/ResourcesPage.tsx src/features/discovery-inventory/resources-ise/pages/ResourcesIsePage.tsx`

**Závislosti:** Schválenie plánu; nevyžaduje dostupné API pre T1.
**Súbory:** štyri súbory uvedené v ESLint príkaze.
**Rozsah:** M, 4 súbory.

## T3: Zdieľať existujúce počiatočné VMware filtre

**Popis:** Extrahovať čistú resolveVmwareInitialFilters do resources/helpers, vstupy provider s rolou, cieľové URLSearchParams a existujúci snapshot. Použiť v useVirtualMachineSearchParams bez zmeny write/clear/update efektov.

**Akceptačné kritériá:**

- [x] Priority fixed scope → aktívna cieľová URL → role/provider snapshot → defaults. Pokryť stale marker, prázdnu URL, chýbajúci/nedostupný snapshot.
- [x] Zachovať prvý neprázdny fixed tag, URL tag parsing a viac tagov zo snapshotu; API tag cez existujúci getServerSideTagFilter. Lokálne filtre/stránkovanie nemenia API key.
- [x] Zachovať session zápisy, fixed-scope URL cleanup, updateFilters a 300-ms query debounce. Resolver nemá storage/network side effects.

**Overenie:**

- [x] `npm exec vitest run src/features/discovery-inventory/resources/helpers/resolveVmwareInitialFilters.test.ts src/features/discovery-inventory/resources/hooks/useVirtualMachineSearchParams.test.tsx src/features/discovery-inventory/resources/state/providerFilterSession.test.ts src/features/discovery-inventory/resources/helpers/vmwareProviderFilter.test.ts`
- [x] `npm exec eslint -- src/features/discovery-inventory/resources/helpers/resolveVmwareInitialFilters.ts src/features/discovery-inventory/resources/helpers/resolveVmwareInitialFilters.test.ts src/features/discovery-inventory/resources/hooks/useVirtualMachineSearchParams.ts`

**Závislosti:** T2.
**Súbory:** nový helper a jeho test; existujúci useVirtualMachineSearchParams.ts.
**Rozsah:** M, 3 súbory.

## Checkpoint A – počiatočný kontext zodpovedá konzumentom

- [x] T2/T3 testy a lint prešli; extrakcie nemenia správanie.
- [x] Holé Resources/ISE URL má vmware/null vstup a role-scoped filtre, nie Dashboard URL filtre.
- [x] Žiadne nové API/cache keys/perzistencia.

## T4: Dashboard ready → providers → dva počiatočné inventáre

**Popis:** Malý useInitialResourcePrefetch(ready) hook a jeho volanie v OverviewPage. Dnes ready znamená vykreslený stav mimo loading/unknown, Dashboard nemá API queries. Idle callback (timeout 1000 ms; fallback setTimeout 0), potom fetchQuery existujúcich provider options, selectProviders lokálne, T2/T3 výber a existujúce inventory factories podľa Trigger D.

**Akceptačné kritériá:**

- [x] Dashboard render nečaká na API. Ready demo/empty/partial povolí callback, loading/unknown nie. Existujúci raw provider key, najviac dve inventory queries: počiatočný source a target, nikdy bez ID; žiadne všetky tabs/tags/disks.
- [x] Rešpektovať sort/role/fallback a fixed/URL/session filtre. Veľký provider zoznam nezvyšuje inventory count; metadata failure/chýbajúca rola nespustí náhradný request.
- [x] Cleanup zruší scheduler a nový fan-out po unmount počas metadata fetchu, nezruší zdieľané queries. StrictMode/opakovaný ready/density/detail zmeny neduplikujú HTTP; demand fallback pri pending/failure funguje.

**Overenie:**

- [x] `npm exec vitest run src/features/discovery-inventory/resources/hooks/useInitialResourcePrefetch.test.tsx src/features/dashboard/pages/OverviewPage.test.tsx`
- [x] `npm exec eslint -- src/features/discovery-inventory/resources/hooks/useInitialResourcePrefetch.ts src/features/discovery-inventory/resources/hooks/useInitialResourcePrefetch.test.tsx src/features/dashboard/pages/OverviewPage.tsx src/features/dashboard/pages/OverviewPage.test.tsx`
- [x] Hook test má reálny QueryClient so STANDARD_QUERY_OPTIONS a riadený scheduler; OverviewPage unit test doplní QueryClient wrapper a kontrolované mocks/fixtures, bez živého HTTP.

**Závislosti:** T1 baseline, T2, T3, Checkpoint A.
**Súbory:** nový hook a jeho test; OverviewPage.tsx a OverviewPage.test.tsx.
**Rozsah:** M, 4 súbory.

## T5: Prvé Resources/ISE a spoločná cache s RG

**Popis:** Nový integračný test pripraví dáta Dashboard hookom a potom mountuje reálnych Resources/ISE a RG inventory konzumentov s jedným klientom. Počíta HTTP a kontroluje dáta; nemockuje prefetchQuery/key factories ako jediný dôkaz.

**Akceptačné kritériá:**

- [x] Completed/pending Dashboard prefetch použije prvé Resources aj ISE bez druhého inventory requestu; providers zdieľajú cache. Resources ↔ ISE nemieša source/target snapshoty ani výsledky.
- [x] Presne zhodný RG provider/prefix/tag použije Resources entry. Iný provider/scope/search má vlastnú query; širší/užší výsledok sa nekopíruje. Pokryť VMware, Power, FlashSystem a tag/folder key izoláciu.
- [x] StaleTime prekročenie, explicitná invalidácia, failed prefetch → mount retry a manuálny VMware force refresh vrátia aktuálny výsledok podľa existujúcej politiky. Pending nepridáva navigačný gate.

**Overenie:**

- [x] `npm exec vitest run src/features/discovery-inventory/resources/pages/ResourcesPrefetch.integration.test.tsx src/features/discovery-inventory/resources/pages/ResourcesRouteTransition.test.tsx src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx`
- [x] `npm exec eslint -- src/features/discovery-inventory/resources/pages/ResourcesPrefetch.integration.test.tsx`
- [x] STANDARD_QUERY_OPTIONS, validované fixtures, riadený čas a odložené promises; inventory HTTP počítať zvlášť od tags/metadata.

**Závislosti:** T4.
**Súbory:** nový ResourcesPrefetch.integration.test.tsx; existujúce test helpers podľa potreby, najviac 2 ďalšie súbory.
**Rozsah:** M, najviac 3 súbory.

## Checkpoint B – primárny cieľ Resources pokrytý

- [x] Ready Dashboard pripraví najviac dva presné počiatočné inventáre; prvé Resources/ISE ich reálne používajú.
- [x] T4/T5 overenia prešli, okamžitá navigácia aj failure fallback fungujú.
- [ ] Baseline a orientačné po-zmene overenie obsahujú Dashboard → Resources/ISE, nie iba RG.

## T6: RG doplní iba chýbajúci alebo stale Resources výsledok

**Popis:** Trigger A do RecoveryGroupBuilder: QueryClient a efekt v Provider kroku, baseValid, ustálené providers, konkrétne ID, mimo readonly/initial loading. Existujúce factories a RG scope pravidlá; initial používateľský search je prázdny.

**Akceptačné kritériá:**

- [x] Fresh/pending zhodný Resources key nepridá HTTP; iný/chýbajúci/stale key sa pripraví pred Next. Fixed scope má prioritu, Power lokálny prefix sa neposiela do API.
- [x] Unknown scope, neplatné credentials/provider/topology, readonly/initial loading nič neprednačítajú. Primitívne dependencies nereagujú na každý metadata render.
- [x] Pending/failure neblokuje Next; picker zdieľa request alebo normálne fetchne po neúspechu. Draft/canContinue sa nemenia.

**Overenie:**

- [x] `npm exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.prefetch.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.integration.test.tsx`
- [x] `npm exec eslint -- src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.prefetch.test.tsx`

**Závislosti:** T5, Checkpoint B.
**Súbory:** RecoveryGroupBuilder.tsx; nový RecoveryGroupBuilder.prefetch.test.tsx v rovnakom components adresári.
**Rozsah:** S, 2 súbory.

## T7: Related storage pre vybrané VM/LPAR

**Popis:** Trigger B v builderi pri Resources kroku: platný VM workload/compute/storage/výber → flashSystemInventoryQuery(storageId) a unikátne vdisksByVmQuery(name,computeId). Reuse volumes z Resources/ISE aj diskov z detailu.

**Akceptačné kritériá:**

- [x] Iba konkrétny storage zoznam a unikátne vybrané mená, nie disky celého inventára. Storage ID nejde do vdisk endpointu; žiadne nové trim/case pravidlo.
- [x] RelatedVolumes hook/picker použije fresh/pending cache. Ďalšia VM fetchne chýbajúci key; odobratie/zmena providera nemieša dáta. Uložený výber sa pripraví po otvorení Resources.
- [x] Zachovať readonly/loading/context gates, exclusions, Metro Mirror prefill a validáciu. Žiadny zápis draftu/predčasná discovery reconciliation; pending/error neblokuje Next.

**Overenie:**

- [x] `npm exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.prefetch.test.tsx src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupRelatedVolumes.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx`
- [x] `npm exec eslint -- src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.prefetch.test.tsx`

**Závislosti:** T6.
**Súbory:** tie isté dva builder súbory ako T6.
**Rozsah:** S, 2 súbory.

## Checkpoint C – sekundárne RG/storage toky

- [x] T6/T7 overenia prešli, presné Resources keys sa používajú bez duplicít.
- [x] Provider/scope a compute/storage ID ostávajú oddelené; bez nových keys/draft side effects.
- [x] Run snapshot inventory a Metro Mirror queries ostávajú pri pôvodných gates, bez nového snapshot pickera.

## T8: Focused regresie a finálne pred/po meranie

**Popis:** Zopakovať T1 toky za rovnakých podmienok, skontrolovať Dashboard kritický render a regresie. Úspech sa neopiera iba o zrýchlenie RG.

**Akceptačné kritériá:**

- [ ] Pred/po mediány a HTTP počty prvého Resources aj ISE otvorenia, Resources ↔ ISE aj RG tokov. Oddeliť API čas, predstih a debounce; uviesť špekulatívnu neotvorenú rolu a objem/počet requests.
- [ ] Completed prefetch nepridá demand request, pending sa zdieľa, invalidácia/failure fungujú. Dashboard nemá opakovateľné zhoršenie kritického vykreslenia.
- [ ] Focused regresie/typecheck prešli, eager/API/cache policy zachované. Runtime blocker je neuzavreté overenie, žiadne vymyslené percentá.

**Overenie:**

- [x] `npm exec vitest run src/features/discovery-inventory/resources/model/inventoryQueries.test.ts src/features/discovery-inventory/resources/hooks/useResourceInventoryQueries.test.tsx src/features/discovery-inventory/discovery-settings/pages/DiscoverySettingsPage.test.tsx src/features/discovery-inventory/discovery-settings/pages/DiscoverySettingsPage.stubfetch.test.tsx src/features/discovery-inventory/discovery-settings/components/DiscoveryHistoryCard.test.tsx`
- [ ] `npm run typecheck` – spoločný TS projekt, nové resolver/QueryClient kontrakty zasahujú Dashboard/Resources/RG.
- [x] Focused ESLint T2–T7 pre finálne zmenené súbory a `git diff --check`; pri ďalších zmenách opakovať dotknuté testy.
- [ ] Network/Performance: 3 opakovania T1 tokov podľa plánu. Kompletný suite ani `npm run build` štandardne nespúšťať (zahŕňa celý suite a API kontroly).

**Závislosti:** T7, Checkpoint C.
**Súbory:** tento TODO; doplnenie testov T5/T6 podľa potreby, najviac 2 ďalšie súbory.
**Rozsah:** M, najviac 3 súbory.

## Záverečný checkpoint

- [ ] Primárny Dashboard → Resources/ISE aj sekundárny Resources → RG → Related storage cieľ majú dôkaz.
- [ ] Príkazy/merania/obmedzenia zaznamenané; iné plány nedotknuté.
- [ ] Pripravené na review, žiadny commit/push/merge bez nového pokynu.

## Výsledky

### Následné schválenie commitu a pushu (2026-10-15)

Pokyn používateľa „tak ich pusni“ nahrádza staršie obmedzenie bez commitu/pushu. Do indexu boli vybrané iba zmeny prefetchingu; v dvoch zdieľaných Dashboard súboroch iba taskové časti. Súbežné grafy, locales a prototyp zostávajú mimo commitu. Presný obsah indexu bol exportovaný do dočasnej kópie bez novej vetvy: `npm.cmd run typecheck` v nej prešiel. Predchádzajúca TS2375 chyba sa týka iba súbežného pracovného Dashboardu, nie pripravovaného commitu. Živé pred/po meranie zostáva otvorené.

Pred commitom v tejto exportovanej kópii prešlo aj 12 focused Vitest súborov / 154 testov (Dashboard, obidva Resources pages, tab/filter helpers, prefetch hook/integrácia a RG builder/inventory/related-volumes) a ESLint explicitných 15 taskových TS/TSX súborov. `git diff --cached --check` prešiel. Kompletný suite ani production build sa nespúšťali.

Implementácia T2–T7 je zapísaná a automatizovane overená. Živé meranie neprebehlo: `cua.getState()` vrátilo `apps: []`, `browsers: []`; Chrome DevTools MCP nie je dostupný. Z tohto dôvodu sú manuálne položky T1/T8 a príslušné checkpointy stále otvorené. Nevytvoril sa nový benchmark systém ani vymyslené meranie.

Počas práce sa v spoločnom checkoute objavili úpravy Dashboard grafov mimo tohto plánu (IssuesDistribution, RecoveryApplicationsDonut, snapshots a súvisiace typy/fixtures/CSS). Boli zachované; task-only Dashboard zmena je import a volanie prefetch hooku plus QueryClient wrapper v jeho testoch. Spoločný typecheck teraz hlási iba `src/features/dashboard/pages/OverviewPage.tsx(56,8): TS2375`, pretože nový `snapshots` prop dostáva explicitné `undefined`. Tento cudzí riadok sa neopravoval v prefetch úlohe.

### Vykonané automatizované kontroly

Na Windows boli použité `npm.cmd` varianty príkazov z úloh (PowerShell blokuje `npm.ps1`).

- T2 focused príkaz: 3 test súbory / 33 testov prešli; po dokončení ďalších zmien znovu zahrnuté do kontroly nižšie.
- T3 focused príkaz: 4 súbory / 26 testov prešli.
- RG regresie: `npm.cmd exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.prefetch.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.integration.test.tsx src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupRelatedVolumes.test.tsx src/features/discovery-inventory/resources/pages/ResourcesPrefetch.integration.test.tsx` – 5 súborov / 59 testov prešlo; následne pribudli ďalšie provider/initial-loading prípady overené nižšie.
- Finálne T2/T3/RG provider overenie: `npm.cmd exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.prefetch.test.tsx src/features/discovery-inventory/resources/helpers/buildResourceSourceTabs.test.ts src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx src/features/discovery-inventory/resources-ise/pages/ResourcesIsePage.test.tsx src/features/discovery-inventory/resources/helpers/resolveVmwareInitialFilters.test.ts src/features/discovery-inventory/resources/hooks/useVirtualMachineSearchParams.test.tsx src/features/discovery-inventory/resources/state/providerFilterSession.test.ts src/features/discovery-inventory/resources/helpers/vmwareProviderFilter.test.ts` – 8 súborov / 67 testov prešlo.
- Finálne Dashboard/integrácia: `npm.cmd exec vitest run src/features/dashboard/pages/OverviewPage.test.tsx src/features/discovery-inventory/resources/hooks/useInitialResourcePrefetch.test.tsx src/features/discovery-inventory/resources/pages/ResourcesPrefetch.integration.test.tsx` – 3 súbory / 24 testov prešlo aj so súbežnými Dashboard zmenami.
- T8 focused príkaz podľa zoznamu vyššie: `npm.cmd exec vitest run src/features/discovery-inventory/resources/model/inventoryQueries.test.ts src/features/discovery-inventory/resources/hooks/useResourceInventoryQueries.test.tsx src/features/discovery-inventory/discovery-settings/pages/DiscoverySettingsPage.test.tsx src/features/discovery-inventory/discovery-settings/pages/DiscoverySettingsPage.stubfetch.test.tsx src/features/discovery-inventory/discovery-settings/components/DiscoveryHistoryCard.test.tsx` – 5 súborov / 37 testov prešlo.
- `npm.cmd exec eslint --` s explicitným zoznamom 15 taskových TS/TSX súborov uvedených v pláne a existujúcom `RecoveryGroupBuilder.test.tsx` – prešlo, bez suppressions. Test wrapper buildera bol potrebný, pretože teraz priamo používa QueryClient; jeho pôvodné mocks klienta neposkytovali.
- `npm.cmd run typecheck` – posledný výsledok je vyššie uvedená cudzia TS2375 chyba; vlastné nové testy/produkčné typy už nehlásia chyby.
- Review diffu vykonané inline podľa pokynu používateľa. Žiadna zmena generated API, routingu, globálnej cache policy ani eager importov. Kompletný suite a production build neboli spustené.

Oproti návrhu sa nepridal testovací cache modul ani nová produkčná vrstva. Malý zdieľaný filter helper presunul existujúce pure rozhodnutia; generované query factories zostávajú pôvodné. T8/typecheck a merania sa nesmú označiť za dokončené, kým ich blokery nezmiznú.

| Scenár | Pred: 3 časy / medián | Po: 3 časy / medián | Pred/po metadata a inventory HTTP | Provider/filtre/podmienky |
|---|---|---|---|---|
| Prvé Resources z Dashboardu | Nezmerané | Nezmerané | Nezmerané | Čistá session aj uložený filter |
| Prvé Resources ISE z Dashboardu | Nezmerané | Nezmerané | Nezmerané | Samostatný studený štart |
| Resources ↔ ISE | Nezmerané | Nezmerané | Nezmerané | Source/target izolácia |
| Resources → RG Resources | Nezmerané | Nezmerané | Nezmerané | Zhodný aj odlišný scope |
| VM → Related storage | Nezmerané | Nezmerané | Nezmerané | Vybrané VM, compute/storage ID |
| Kritické vykreslenie Dashboardu | Nezmerané | Nezmerané | Nezmerané | Rovnaký dataset/throttling |

Výsledky doplní implementujúci agent; nezmerané údaje nenahrádzať odhadmi.
