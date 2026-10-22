# Úlohy: VMware refetch/prefetch a stale placeholder follow-up

Dátum: 2026-10-22. Aktuálny plán: prvá časť [vmware-removed-revision-p2-plan.md](vmware-removed-revision-p2-plan.md). Stav: F1–F5 dokončené inline; focused testy → lint → cielený typecheck overené; pôvodná P2 história je zachovaná pod čiarou. Bez commitu/pushu, reset/stash, zmeny vetvy/worktree alebo subagentov. Default Snapshot Policy task súbory sa nemenia.

## F1: Spoločná query hranica a deleted observer

**Popis:** Najprv vytvoriť nový cohesive integračný suite s real createAppQueryClient, reálnym resource hookom, generated provider mutations a riadenými HTTP Promise. Reprodukovať nové A–D hrany a následne zaviesť minimálnu ochranu v query facade a deleted hook výstupe. Pôvodný veľký hook suite sa nereorganizuje.

**Akceptačné kritériá:**
- [x] Reálny hook.refetch, priame client.fetchQuery a client.prefetchQuery po delete A nezačnú VMware HTTP ani nevrátia fake empty success. Pending normálny fetch vrátane transportu ignorujúceho abort nezapíše stale VM ani prechodne, aj po delete→recreate rovnakého ID. Cache/error/Promise výsledky sa overujú samostatne pre každú API cestu.
- [x] **P2 – RED→GREEN fresh-cache hit:** Čerstvé `Old VM` v QueryCache s default `staleTime=15 min`; úspešný delete A pozastaviť po nastavení deleted markeru na `await cancelQueries` pred fyzickým `removeQueries`. V tomto okne zavolať `client.fetchQuery` aj `client.prefetchQuery` pre A. Baseline musí potvrdiť, že `fetchQuery` vie vrátiť Old VM pri 0 volaniach queryFn. Po oprave nesmie vrátiť stale VM, urobiť nové VMware HTTP ani fake empty success. Overiť reálnu fetchQuery návratovú hodnotu (cache subscriber sám nestačí), prefetch Promise, QueryCache pred/po release, HTTP/queryFn counts a oba delete/recreate interleavingy; queryFn-only fix nestačí.
- [x] **P3 – RED→GREEN pending normal query po UPDATE:** Pre úspešný infra provider UPDATE aj credential UPDATE udržať bežný `/vms/search` pending, zmeniť revision a dokončiť oneskorenú starú odpoveď (tiež transport ignorujúci abort). Nesmie dôjsť k stale zápisu; stále pripojený hook automaticky načíta presne `Current VM` bez remountu/manual refreshu. Po neúspechu nového aktuálneho fetchu focus/reconnect obnoví query. Overiť counts, retry 0/1, neprítomnosť fetch loopu a že credential UPDATE netvorí deleted marker.
- [x] queryFn získava správny vykonávajúci client z TanStack kontextu, kontroluje deleted pred generated fetcherom a oba revision údaje + deleted pred vrátením dát. Factory(search), generated key aj fetcher a signal zostanú zachované. Direct queryFn testy doplnia client, nie globálny fallback. Retry=0/1 a HTTP error správanie sa otestujú bez nekonečných pending/retry slučiek.
- [x] Deleted A s nezmeneným ID nevystavuje Old VM ani retained placeholder; data, status, isSuccess/isPlaceholderData/isEmpty/isInitialLoading a fetchStatus sú konzistentné. Validný provider počas debounce/filtrovania zachová placeholder. Recreate obnoví auto/refetch/prefetch/Live Refresh; B a druhý QueryClient zostanú funkčné. Pôvodné P2 assertions sa neoslabia.

**Overenie:**
- [x] RED pred opravou potvrdené pre refetch, P2 fresh-cache hit a placeholder (4 failed / 6 passed); pending normal update/late-response scenáre boli GREEN už na baseline, teda nejde o potvrdenú pôvodnú regresiu. Dôvody aj výsledky skutočných FE tokov sú zaznamenané nižšie.
- [x] `node node_modules/vitest/vitest.mjs run src/features/discovery-inventory/resources/hooks/vmwareInventoryLifecycle.test.tsx src/features/discovery-inventory/resources/model/inventoryQueries.test.ts src/features/discovery-inventory/resources/helpers/virtualMachinesHelpers.test.ts src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx`
- [x] QueryCache subscriber zachytí aj prechodný stale write; pri blocked API Promise skončí, prefetch nevytvorí unhandled rejection a netvrdí úspešné prázdne inventory.

**Závislosti:** Schválený follow-up plán; git status a aktuálne súbory vrátane necommitnutých helper zmien.
**Súbory (5, medium):**
- `src/features/discovery-inventory/resources/model/inventoryQueries.ts`
- `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.ts`
- `src/features/discovery-inventory/resources/hooks/vmwareInventoryLifecycle.test.tsx` (nový)
- `src/features/discovery-inventory/resources/model/inventoryQueries.test.ts`
- `src/features/discovery-inventory/resources/helpers/virtualMachinesHelpers.test.ts`

## F2: Initial Resources prefetch s oneskoreným provider listom

**Popis:** Overiť Dashboard useInitialResourcePrefetch a reálne následné Resources/Recovery Group observers, keď stale alebo oneskorený provider list stále ponúka A po jeho úspešnom delete. Nepovažovať vynechanie v UI výbere za dôkaz ochrany factory.

**Akceptačné kritériá:**
- [x] Riadený provider-list response alebo idle callback spustený až po delete A nespustí VMware HTTP pre A. Skutočný prefetch Promise zostane korektný, žiadne obnovené dáta A ani unhandled rejection.
- [x] Neodstránený vybraný B alebo druhý klient funguje; po recreate A nový legitímny prefetch a pripojený observer načítajú aktuálne dáta. Zachované scope/tag/name parametre, source/target správanie a zdieľanie cache medzi Dashboard/Resources/RG.
- [x] Žiadny nový deleted store, factory signature argument na každom callerovi ani caller-only náhrada centrálneho guardu. Produkčný initial-prefetch hook sa mení len ak jeho vlastná reprodukcia ukáže scheduling chybu; inak test-only slice.

**Overenie:**
- [x] `node node_modules/vitest/vitest.mjs run src/features/discovery-inventory/resources/hooks/useInitialResourcePrefetch.test.tsx src/features/discovery-inventory/resources/pages/ResourcesPrefetch.integration.test.tsx src/features/discovery-inventory/resources/hooks/vmwareInventoryLifecycle.test.tsx`
- [x] Ovládať idle callback a list/inventory Promise, bez sleep. Zmerať inventory HTTP podľa provider ID, nie iba celkový počet requestov zahŕňajúci provider list.

**Závislosti:** F1.
**Súbory (2–3, medium):** `src/features/discovery-inventory/resources/hooks/useInitialResourcePrefetch.test.tsx`, `src/features/discovery-inventory/resources/pages/ResourcesPrefetch.integration.test.tsx`; `src/features/discovery-inventory/resources/hooks/useInitialResourcePrefetch.ts` iba pri potvrdenom defekte.

## Checkpoint A: Zdieľaná fetch hranica

- [x] Explicitný refetch/fetchQuery/prefetch aj pending normálny fetch sú chránené. P2 fresh-cache hit bez queryFn má samostatnú lifecycle-safe ochranu pred `removeQueries`, bez query key zmien alebo fake success; obe poradia delete/recreate zostanú funkčné.
- [x] Dashboard initial prefetch bol overený reálnym callerom; samotné isolated QueryObserver pozorovanie sa nevydáva za integračný dôkaz.
- [x] Pôvodných 138 testov zostáva zelených; P3 provider/credential UPDATE počas pending normálneho fetchu automaticky obnoví `Current VM`, prípadne cez focus/reconnect bez remountu. Review Promise/error/retry/cancellation, cache-hit a QueryClient kontextu pred pokračovaním.

## F3: Background a Recovery Group prefetch po recreate

**Popis:** Reprodukovať skutočné idle background prefetch a RG Builder step prefetch so stale provider props/listom a znova po recreate. Vyhodnotiť pôvodnú background error-skip podmienku a spúšťacie závislosti.

**Akceptačné kritériá:**
- [x] Idle callback naplánovaný pred delete, vykonaný po delete, nespustí HTTP A. Rovnaké platí pre skutočný RG Builder prefetch scope. Nový pending/late fetch nezapíše starú generáciu, B funguje.
- [x] Po recreate rovnakého ID bez remountu sa opäť dá vykonať legitímny background/RG prefetch. Lifecycle-blocked error query neblokuje obnovu navždy; skutočné backend chyby zachovajú pôvodný skip/retry zámer.
- [x] Ak je nutná malá zmena VmwareResourcesPage error-skip alebo scheduling availability, je odvodená z RED testu a používa jediný existujúci helper. Centrálna queryFn ochrana zostáva rozhodujúca. Bez duplicitných requests/fetch loopu alebo všeobecného retry mechanizmu.

**Overenie:**
- [x] `node node_modules/vitest/vitest.mjs run src/features/discovery-inventory/resources/pages/ResourcesBackgroundPrefetch.integration.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.prefetch.test.tsx src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx`
- [x] Kontrolovať skutečný idle/step spúšťač, HTTP/provider/key, QueryCache medzistavy a presný počet nových fetchov po recreate; bez manuálneho cache resetu na maskovanie error-skip chyby.

**Závislosti:** F1 a F2.
**Súbory (3–4, medium):** `src/features/discovery-inventory/resources/pages/ResourcesBackgroundPrefetch.integration.test.tsx`, `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.prefetch.test.tsx`, `src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx`; `src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.tsx` len pri potvrdenej medzere.

## F4: Stale placeholder v reálnom UI a ďalšom observeri

**Popis:** Overiť výstup resource hooku cez skutočné tabuľky/metriky a Recovery Groups, aj novo nájdený Infrastructure caller. Test neodstráni komponent len preto, že bežná stránka po refetchi providerov zmení výber.

**Akceptačné kritériá:**
- [x] Načítať Old VM, zmeniť filter na pending query s placeholderom, úspešne delete A a ponechať ID aj komponent pripojené. Hook data, VirtualMachinesTable, VirtualMachineMetrics ani RG resourceNames/metadata neprezentujú Old VM ako platné inventory; isEmpty neznamená fake success empty. Overiť aj interval marker=true pred skončením fyzického removeQueries.
- [x] Recreate obnoví aktuálne zobrazenie v tom istom observeri; filtrovanie/debounce platného providera a prechod medzi A/B zachová správne cached/placeholder dáta. Pending stará generácia sa neobjaví po recreate.
- [x] useInfrastructureInventory reálne používa centrálny guard pri normálnom query aj explicitnom refetch; vyhodnotiť jeho data/status po delete a obnovu. Prípadný vlastný reprodukovaný lifecycle/observer nedostatok riešiť minimálne existujúcim helperom, bez infra refaktoringu.

**Overenie:**
- [x] `node node_modules/vitest/vitest.mjs run src/features/discovery-inventory/resources/components/vmware/VmwareDeletedInventory.integration.test.tsx src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx src/features/discovery-inventory/infrastructure/hooks/useInfrastructureInventory.test.tsx`
- [x] V novej UI integrácii nemockovať resource hook alebo table/metrics na komponenty, ktoré by stale problém skryli. HTTP a asynchrónne poradie mockovať cez riadené Promise.

**Závislosti:** F1–F3.
**Súbory (3–4, medium):** `src/features/discovery-inventory/resources/components/vmware/VmwareDeletedInventory.integration.test.tsx` (nový), `src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx`, `src/features/discovery-inventory/infrastructure/hooks/useInfrastructureInventory.test.tsx`; `src/features/discovery-inventory/infrastructure/hooks/useInfrastructureInventory.ts` iba pri potvrdenom defekte.

## Checkpoint B: Všetky existujúce vstupy a zobrazenie

- [x] Zmapovaných päť priamych produkčných factory callerov a nepriamy RG hook má konkrétne výsledky reprodukcie; bezpečnosť jednej cesty sa neprenáša tvrdením na ostatné.
- [x] Deleted A nemá nové bežné HTTP, cache write ani stale observer/UI dáta; B a druhý client fungujú a recreate obnovuje celý tok.
- [x] Bez oslabených assertions, vypnutých testov, nového cache/state ownera, generated zmien alebo nesúvisiacich refaktorov. Inline review architektúry, retry a lifecycle hraníc.

## F5: Focused regresie a odovzdanie

**Popis:** Zopakovať pôvodnú P2 sadu a všechny dotknuté nové cesty; zreferovať iba skutočne potvrdené chyby a vykonané kontroly. Oddeliť preexistujúce helper/OpenAPI/locale diffy a prípadné súbežné Git commity od vlastných follow-up zmien.

**Akceptačné kritériá:**
- [x] Pôvodných 138 prípadov aj nové A–F integrácie vrátane **P2 fresh cache hitu počas delete** a **P3 pending normal fetch po provider/credential UPDATE s automatickým zotavením** sú zelené. Report rozlišuje pred/po a potvrdené/nepotvrdené scenáre, zoznam callerov a dôkaz pre refetch/prefetch/pending/placeholder/recreate.
- [x] Cielený typecheck upravených súborov, focused ESLint a git diff --check prejdú alebo sú presne doložené nezávislé cudzie chyby bez ich opráv. Nové untracked test/docs súbory majú samostatnú read-only whitespace/final-newline kontrolu bez stage.
- [x] Kompletný zoznam vlastných zmenených súborov, Promise/error/retry sémantika, Resources/RG dopad a riziká sú zaznamenané; bez vlastného commitu/pushu/stash/reset/worktree. Default task a cudzie Snapshot Policy súbory sa nemenia.

**Overenie (plánované, nie výsledky):**
- [x] Explicitný focused Vitest zoznam:

```powershell
$vmwareFollowupTests=@(
  'src/shared/query/providerInventoryRevision.test.ts'
  'src/shared/query/providerMutationInvalidation.test.tsx'
  'src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx'
  'src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx'
  'src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx'
  'src/features/discovery-inventory/resources/model/inventoryQueries.test.ts'
  'src/features/discovery-inventory/resources/helpers/virtualMachinesHelpers.test.ts'
  'src/features/discovery-inventory/resources/hooks/vmwareInventoryLifecycle.test.tsx'
  'src/features/discovery-inventory/resources/hooks/useInitialResourcePrefetch.test.tsx'
  'src/features/discovery-inventory/resources/pages/ResourcesPrefetch.integration.test.tsx'
  'src/features/discovery-inventory/resources/pages/ResourcesBackgroundPrefetch.integration.test.tsx'
  'src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.prefetch.test.tsx'
  'src/features/discovery-inventory/infrastructure/hooks/useInfrastructureInventory.test.tsx'
  'src/features/discovery-inventory/resources/components/vmware/VmwareDeletedInventory.integration.test.tsx'
)
node node_modules/vitest/vitest.mjs run @vmwareFollowupTests
```

- [x] Cielený TypeScript createProgram nad 14 upravenými súbormi a ich importmi podľa posledného pokynu používateľa (presný príkaz v reporte).
- [x] `node node_modules/eslint/bin/eslint.js <explicitne-vlastne-zmenene-TS-TSX-subory> --max-warnings 0`; výsledný presný zoznam/príkaz uložiť v reporte podľa skutočného rozsahu F1–F4, nie automaticky lintovať celý zdieľaný diff.
- [x] `git diff --check`, `git status --short` a read-only whitespace/final-newline kontrola nových untracked súborov. Žiadne git add ako validačná pomôcka.
- [x] Kompletnú suite ani production build nespúšťať; browser/live backend QA neprezentovať ako vykonanú bez skutočného behu.

**Závislosti:** F1–F4.
**Súbory (2, small):** `tasks/vmware-removed-revision-p2-plan.md`, `tasks/vmware-removed-revision-p2-todo.md`.

## Evidencia plánovania follow-up

- [x] Doplnené celé zadanie P3 od používateľa a zmapovaných päť produkčných factory callerov vrátane Infrastructure, ktorý nebol v pôvodnom zozname.
- [x] Overený aktuálny queryFn kontext, error/prefetch/retryer mechanizmus a background error-skip. Nezamieňať throw CancelledError za automatické zrušenie retries.
- [x] Čerstvý pôvodný baseline: 138 passed, 0 failed, päť súborov. Nové A–F integračné scenáre zatiaľ netestované.
- [x] Follow-up review doplnil F1, checkpoint A a F5 o P2 fresh cache hit počas delete pred `removeQueries` (queryFn sa nevolá) a P3 zotavenie pending normálneho fetchu po provider/credential UPDATE.
- [x] Žiadne implementačné/testové zmeny počas tohto plánovania; rozširujú sa iba používateľom už určené samostatné VMware task súbory.
- [x] Používateľ schválil aktuálny follow-up plán F1–F5 pokynom vykonať inline, testy → lint → typecheck upravených súborov.

## Výsledky vykonania follow-up — 2026-10-22

### Reprodukcia a príčiny

- Prvý nový lifecycle suite: **4 failed / 6 passed**. Dva retry varianty skutočného hook.refetch po generated delete vrátili success; enabled=false nie je hranica explicitného fetchu. Fresh fetchQuery počas pozastaveného delete vrátil Old VM bez nového HTTP, pretože fresh cache obchádza queryFn. Same-provider filter placeholder zostal po removeQueries success s Old VM.
- Background integrácia: po delete a recreate sa nový idle callback nenaplánoval. Komponent neodoberal lifecycle druhého providera; navyše bezpodmienečný skip error query mohol zachovať odmietnutie z prefetchu počas deleted stavu aj po recreate.
- Infrastructure integrácia: po delete si stále pripojený observer ponechal predchádzajúce data/success. Samostatný hook nemal deleted subscription. Nový test následne rozšírený na konkrétne Old VM → Current VM.
- **Nepotvrdené ako pôvodná regresia:** šesť prvých pending/cancellation/update prípadov bolo zelených už pred opravou. Existujúca TanStack cancellation pri reálnych provider mutations zablokovala neskoré normálne odpovede aj pri transporte ignorujúcom abort. Nevykazujeme ich ako pôvodné zlyhania. Nový pre/post revision guard je dodatočná spoločná ochrana; priame uncancelled queryFn testy overujú provider update, credential update aj delete/recreate ABA.
- Chyby dvoch nových testových fixtures boli opravené: opakované čítanie tej istej Response v delayed-list variante teraz používa clone; reálna tabuľka počas background/placeholder fetchu skrýva riadky skeletonom, preto UI test overuje ponechané metriky pred delete a zmiznutie stale metrík aj riadkov po delete. Pôvodné assertions žiadneho existujúceho testu sa neoslabili.

### Implementované hranice

1. vmwareInventoryQuery číta client a signal z native QueryFunctionContext. Pred generated HTTP odmietne deleted provider; po odpovedi overí deleted aj oba revision tokeny. Stará generácia sa nevráti ako query data. Query key, factory(search), generated validation/fetcher aj abort signal zostali zachované.
2. Infra delete synchrónne odstráni scoped dependent queries pred publikovaním markeru a prvým await. Fresh fetchQuery/prefetchQuery tak nenájdu staré dáta. Zostávajú pôvodné operation identity checks a conditional complete; starý delete po novšom recreate už nemá oneskorený remove krok. Platform delete si zachováva pôvodné remove po cancellation.
3. Placeholder je povolený iba pre platného providera a pôvodnú query stále prítomnú v cache. Retained observer starej odstránenej query sa nemôže použiť po recreate. Deleted výstup resource hooku je konzistentne pending/idle, bez data, success, placeholder, loading alebo fake empty success.
4. Nový useProviderInventoryDeleted iba zdieľa existujúcu useSyncExternalStore subscription; nevlastní stav ani cache. Používa sa v resource hooku, Infrastructure hooku a pre background provider. Deleted store aj revision tokeny zostávajú výhradne v providerInventoryRevision.ts, ktorý sa nemenil.
5. Background prefetch znovu naplánuje idle callback po recreate a rozlišuje VmwareInventoryUnavailableError od skutočných HTTP chýb. Bežné speculative HTTP chyby si zachovávajú pôvodný skip/retry zámer. Initial Dashboard a RG Builder produkčné call sites nepotrebovali zmenu.

### Promise a retry sémantika

Blokovaný alebo obsolete výsledok odmietne VmwareInventoryUnavailableError. fetchQuery rejectuje; refetch bez throwOnError vracia error result bez inventory, s throwOnError rejectuje; prefetchQuery korektne skončí Promise<void>. Nevytvára sa undefined query success ani fiktívne prázdne inventory. Žiadna vlastná retry slučka alebo cancellation shortcut: zachováva sa retry policy klienta. Testované retry 0 a 1, pri každom pokuse sa deleted kontroluje pred HTTP. Normálne HTTP zlyhania zachovávajú retry/error správanie a následnú focus/reconnect obnovu. Po recreate sa legitímne auto/refetch/prefetch/Live Refresh cesty obnovia bez remountu.

### Skutočne upravené súbory

Produkcia:

- src/features/discovery-inventory/resources/model/inventoryQueries.ts — spoločný queryFn guard a rozlíšiteľná lifecycle chyba.
- src/shared/query/providerMutationInvalidation.ts — synchronná infra delete eviction; nevyhnutná odchýlka od pôvodného odhadu F1 iba dvoch produkčných súborov, preukázaná fresh-cache RED testom.
- src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.ts — placeholder platnosť a deleted output.
- src/shared/query/useProviderInventoryDeleted.ts — zdieľaná existujúca React subscription pre tri skutočné použitia.
- src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.tsx — background lifecycle scheduling a error-skip rozlíšenie.
- src/features/discovery-inventory/infrastructure/hooks/useInfrastructureInventory.ts — deleted subscription a enabled.

Testy:

- src/features/discovery-inventory/resources/hooks/vmwareInventoryLifecycle.test.tsx — 19 nových deterministických API/lifecycle prípadov.
- src/features/discovery-inventory/resources/components/vmware/VmwareDeletedInventory.integration.test.tsx — reálna Resources stránka/tabuľka/metriky a RG resourceNames/metadata; hook ani UI komponenty nie sú mockované.
- src/features/discovery-inventory/resources/hooks/useInitialResourcePrefetch.test.tsx — queued idle a oneskorený provider list, A/B a recreate.
- src/features/discovery-inventory/resources/pages/ResourcesBackgroundPrefetch.integration.test.tsx — skutočný background idle, lifecycle error a recreate bez remountu.
- src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.prefetch.test.tsx — skutočný Provider-step prefetch a návrat na step po recreate.
- src/features/discovery-inventory/infrastructure/hooks/useInfrastructureInventory.test.tsx — mounted delete/refetch/recreate s Old VM a Current VM.
- src/features/discovery-inventory/resources/model/inventoryQueries.test.ts a src/features/discovery-inventory/resources/helpers/virtualMachinesHelpers.test.ts — priame queryFn testy odovzdávajú skutočný QueryClient.

Evidencia: tieto dva samostatné VMware plan/todo dokumenty. RG consumer reprodukcia je v novom cohesive UI suite, preto pôvodný useRecoveryGroupResourceInventory.test.tsx nebolo treba meniť. ResourcesPrefetch.integration.test.tsx a pôvodných päť P2 testových súborov zostávajú nezmenené a sú súčasťou finálneho focused behu.

### Doterajšie overenie

- Pôvodný baseline pri plánovaní: 138/138 v piatich súboroch.
- F1 po minimálnej ochrane: 90/90 v štyroch súboroch.
- Rozšírené callers/UI: 66/66 v šiestich súboroch.
- Spoločný beh presného F5 zoznamu vyššie: **225/225, 14 súborov**, exit 0; zahŕňa nezmenených pôvodných 138 prípadov.
- Po poslednom spresnení platform/infra delete poradia: providerMutationInvalidation.test.tsx + vmwareInventoryLifecycle.test.tsx, **41/41**, exit 0.
- Prvý lint: štyri lokálne diagnostiky, opravené bez suppressions. Po oprave nepovinného operátora a testových typov/callbacku: lifecycle + pôvodný hook suite **84/84**, exit 0. Finálne lint/typecheck/Git výsledky sú uvedené v nasledujúcej sekcii.

### Finálne kontroly

Posledný pokyn používateľa vyžaduje typecheck upravených súborov. Preto sa v tomto follow-up nepúšťal celý npm.cmd run typecheck/tsc -b: použil sa TypeScript createProgram s presnými 14 vlastnými TS/TSX rootmi, ich importmi, projektovými deklaráciami a test setup deklaráciami; rovnaké compilerOptions z tsconfig.app.json, noEmit=true, bez potlačenia diagnostík.

- Po poslednej typovej úprave a pridaní dvoch pending caller testov: **120/120 v 5 súboroch**, exit 0. Tieto výsledky dopĺňajú spoločný úspešný 225-case beh vyššie; finálny 14-file beh po posledných zmenách sa zbytočne neopakoval. Finálny stav tak zahŕňa 227 odlišných overených prípadov; nejde o tvrdenie jedného 227-case behu.
- ESLint nad všetkými 14 vlastnými TS/TSX súbormi: exit 0. Po následných typových/testových úpravách zopakovaný lint štyroch dotknutých súborov: exit 0.
- Cielený TypeScript: **14 modified TS/TSX roots, imported dependencies and project/test declarations; 0 diagnostics**, exit 0.
- git diff --check: exit 0; git diff --cached --name-only: prázdny; git status --short: len 14 vlastných TS/TSX + dva VMware task dokumenty. Nové tri TS/TSX a oba Markdown dokumenty majú samostatnú read-only whitespace/final-newline kontrolu. Žiadny stage/commit/push.
- V rámci prvého typechecku boli dve lokálne diagnostiky: optional data po deleted projekcii a VMware-only isEmpty na union type RG hooku. Opravené explicitnou optional chain a runtime toMatchObject assertion so zachovaním rovnakej hodnotovej kontroly; následné testy/lint/typecheck sú zelené. Kompletná suite ani production build neboli spustené.

Presné finálne testy:

```powershell
node node_modules/vitest/vitest.mjs run src/features/discovery-inventory/resources/components/vmware/VmwareDeletedInventory.integration.test.tsx src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx src/features/discovery-inventory/resources/hooks/vmwareInventoryLifecycle.test.tsx src/features/discovery-inventory/resources/pages/ResourcesBackgroundPrefetch.integration.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.prefetch.test.tsx
```

Presný zoznam lint/typecheck vstupov a reprodukovateľný posledný typecheck:

```powershell
$vmwareFollowupChangedFiles=@(
  'src/features/discovery-inventory/infrastructure/hooks/useInfrastructureInventory.test.tsx'
  'src/features/discovery-inventory/infrastructure/hooks/useInfrastructureInventory.ts'
  'src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.tsx'
  'src/features/discovery-inventory/resources/helpers/virtualMachinesHelpers.test.ts'
  'src/features/discovery-inventory/resources/hooks/useInitialResourcePrefetch.test.tsx'
  'src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.ts'
  'src/features/discovery-inventory/resources/model/inventoryQueries.test.ts'
  'src/features/discovery-inventory/resources/model/inventoryQueries.ts'
  'src/features/discovery-inventory/resources/pages/ResourcesBackgroundPrefetch.integration.test.tsx'
  'src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.prefetch.test.tsx'
  'src/shared/query/providerMutationInvalidation.ts'
  'src/features/discovery-inventory/resources/components/vmware/VmwareDeletedInventory.integration.test.tsx'
  'src/features/discovery-inventory/resources/hooks/vmwareInventoryLifecycle.test.tsx'
  'src/shared/query/useProviderInventoryDeleted.ts'
)
node node_modules/eslint/bin/eslint.js @vmwareFollowupChangedFiles --max-warnings 0
@'
import ts from 'typescript';
import path from 'node:path';
const roots = process.argv.slice(2);
const configPath = path.resolve('tsconfig.app.json');
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
if (configFile.error) throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'));
const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath));
const declarations = config.fileNames.filter(file => file.endsWith('.d.ts'));
const rootNames = [...roots, 'src/test-utils/setup.ts', 'src/test-utils/setupUnit.ts', ...declarations];
const program = ts.createProgram(rootNames, { ...config.options, noEmit: true, incremental: false });
const diagnostics = [...config.errors, ...ts.getPreEmitDiagnostics(program)];
if (diagnostics.length) process.stdout.write(ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCanonicalFileName: file => file, getCurrentDirectory: ts.sys.getCurrentDirectory, getNewLine: () => '\n' }));
console.log('Focused TypeScript: ' + roots.length + ' modified TS/TSX roots, imported dependencies and project/test declarations; ' + diagnostics.length + ' diagnostics.');
process.exitCode = diagnostics.length ? 1 : 0;
'@ | node --input-type=module - @vmwareFollowupChangedFiles
```
### Dopad a hranice

Overené všetkých päť priamych produkčných callerov factory: resource useQuery/refetch, Dashboard initial prefetch, Resources background idle, RG Builder step a Infrastructure useQuery/refetch; nepriamy RG resource hook je overený samostatne cez resourceNames a metadata. Provider B a rovnaké ID druhého QueryClient zostali nezávislé. Platné placeholder/debounce/cache/filter/latest-request správanie pokrýva nezmenená pôvodná sada aj existing prefetch integrácie. Nové testy používajú riadené Promise, žiadne sleep operácie.

Zostáva pôvodná hranica lokálne oznámených úspešných mutations v danom QueryClient; iný browser tab/klient bez oznámenia delete sa nesynchronizuje. Nie je podporovaný svojvoľný externý setQueryData po delete. Kompletná suite, production build, browser E2E ani živý backend sa nespúšťali. Bez zmeny vetvy, subagentov, stage, commitu, pushu, resetu, stashu, worktree alebo zásahu do Snapshot Policy/OpenAPI/generated/locales.

---

## Historická evidencia dokončenej P2 opravy

Nasledujúce pôvodné P2 úlohy a report patria predchádzajúcej oprave, nie aktuálnym F1–F5.

# Úlohy: P2 regresia removedRevision

Dátum: 2026-10-22. Plán: [vmware-removed-revision-p2-plan.md](vmware-removed-revision-p2-plan.md).
Stav: spresnený plán schválený pokynom vykonať inline; P2-1 až P2-4 a oba checkpointy dokončené a overené. Používateľ schválil samostatné cesty kvôli súbežnému Snapshot Policy plánu v tasks/plan.md a tasks/todo.md. Bez commitu/pushu, stash/reset, zmeny vetvy, worktree alebo subagentov.

## P2-1: Reaktívny kontrakt explicitného odstránenia

**Popis:** Rozšíriť existujúci QueryClient-scoped helper o explicitný infra delete marker a úzko adresovanú subscription. Najprv unit testy nového kontraktu, potom minimálna implementácia. Revision token sa nemení a aplikácia v tomto kroku zostáva na existujúcom správaní.

**Akceptačné kritériá:**
- [x] Mark/delete, podmienené clear a čítanie fungujú bez existujúcej query. Deleted sa neodvodzuje z cache. Helper poskytuje synchronné čítanie deleted stavu pre `forceRefresh()` aj identitu/generáciu lifecycle udalosti na bezpečné overenie **po await**. Oba údaje revision tokenu, izolácia klientov/ID a monotónnosť zostanú zachované.
- [x] React snapshot je stabilný boolean, callbacky sú adresované iba správnemu klientovi a provider ID; unsubscribe ukončí odbery. Rovnaký boolean nevytvorí render loop a nový delete stále dostane novú marker identity.
- [x] Clear starého markeru nevymaže novší delete; starší delete tiež nesmie po novšom recreate považovať svoju identitu za aktuálnu. Credential revision/epoch bump marker nemení ani neblokuje správne conditional clear. Žiadna inventory cache, generický event bus alebo kópia deleted stavu v hooku.

**Overenie:**
- [x] `node node_modules/vitest/vitest.mjs run src/shared/query/providerInventoryRevision.test.ts`
- [x] Nové testy preukázateľne RED→GREEN; pôvodné tokenové assertions zachované. Unsubscribe preveriť v React subscribe/unsubscribe cykle.

**Závislosti:** Schválený nový P2 plán; pred editovaním git status a aktuálny zdroj.
**Súbory (2, small):** `src/shared/query/providerInventoryRevision.ts`, `src/shared/query/providerInventoryRevision.test.ts`.

## P2-2: Automatický fetch pri update a recreate

**Popis:** Napojiť marker na úspešné infra provider mutácie a useSyncExternalStore v hooku. Odstrániť removedRevision. Doplniť integrácie reaktivity a deterministicky rozšíriť existujúce credential fixtures podľa plánu, aby zachovali assertions bez blokovania legitímneho fetchu.

**Akceptačné kritériá:**
- [x] Všetky štyri P2 focus/reconnect reprodukcie a dve remount kontroly prejdú bez zmeny assertions. Zachované token guard, latest-request-wins, providerless odmietnutie, normal fetch, debounce a pending/error settlement.
- [x] Infra delete zvýši revision a nastaví marker pred prvým await. Pôvodný delete-provider test aj assertion ostanú nezmenené; po stale odpovedi a focus/reconnect sa cache neobnoví a nezačne nechcený normálny HTTP fetch. Preveriť aj delete bez pending Live Refresh.
- [x] Recreate zruší iba stále rovnaký zachytený marker až po cancel/invalidate. Dva pripojené hooky bez manuálneho refreshu/remountu/rerenderu načítajú aktuálne dáta jedným zdieľaným requestom. Desať credential scenárov zachová undefined assertion počas kontrolovanej novej odpovede, potom pridá presné Current VM a nulový prechodný stale zápis podľa plánu.
- [x] `forceRefresh()` so stále označeným deleted providerom sa **synchronne podľa shared helpera** odmietne ako Promise pred mutation/HTTP, aj keď volajúci drží referenciu z predošlého renderu. Žiadna pending mutation, HTTP request ani zápis do cache; po úspešnom recreate nový explicitný Live Refresh funguje. Zachovať providerless odmietnutie a revision guard pre už rozbehnuté requesty.

**Overenie:**
- [x] Nové delete/recreate integrácie najprv RED, potom minimálna oprava a:
- [x] `node node_modules/vitest/vitest.mjs run src/shared/query/providerInventoryRevision.test.ts src/shared/query/providerMutationInvalidation.test.tsx src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx`
- [x] Promise poradie a request counts dokážu, že recreate fetch nezačne pred skončením cancellation a následne nezačne druhýkrát tou istou invalidáciou. Žiadny sleep/unmount na obídenie kontraktu.

**Závislosti:** P2-1.
**Súbory (3, medium):** `src/shared/query/providerMutationInvalidation.ts`, `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.ts`, `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx`.

## Checkpoint A: Lifecycle a reaktivita

- [x] Štyri P2 zlyhania a pôvodná delete ochrana sú zelené; žiadna heuristika chýbajúcich inventory dát. Manuálny Live Refresh pri explicitne odstránenom providerovi nevykonáva HTTP ani neobnoví cache.
- [x] Delete/recreate funguje v oboch stále pripojených hookoch, bez manuálnej akcie a duplicitného fetchu rovnakého key.
- [x] Inline review potvrdí jedného vlastníka deleted stavu, stabilný snapshot, cleanup a bezpečné poradie notifikácií. Všetky focused testy sú zelené pred P2-3.

## P2-3: Izolácia a súbežné lifecycle dokončenia

**Popis:** Pokryť failure, izoláciu a **oba smery** dokončenia lifecycle operácií, aby odložený recreate ani odložený delete nevytvorili nové race window. Existujúce testy sa nevypínajú, neopravujú oslabením assertions ani presunom mount lifecycle.

**Akceptačné kritériá:**
- [x] Failed infra submit/delete aj credential submit/delete nemenia revision ani deleted stav. Úspešný credential update/delete bumpuje pôvodný scope/fallback, ale nikdy nevytvára ani nemaže provider deleted marker.
- [x] Delete A neblokuje B ani rovnaké ID druhého QueryClient. Platform mutácie rovnakého ID nemenia infra stav. Zmena providera/klienta a unmount uprace odbery; nové pripojenie deleted ID ostane disabled do lokálneho úspešného submitu.
- [x] Starší submit dokončený po novšom delete ho neodblokuje. Credential mutation počas pending recreate nemení marker identity a nezablokuje správnu obnovu. Aj po opačnom poradí starých Live Refresh odpovedí zostáva len nové inventory; request counts nevykazujú fetch loop.
- [x] **Opačné poradie (old delete → newer recreate → old delete resumes):** Pozastaviť starý úspešný delete na `await cancelQueries`, dokončiť novší úspešný submit/recreate toho istého ID a overiť aktuálny nový request/cache (`Current VM`). Až potom uvoľniť starý delete; jeho oneskorené `removeQueries`/`invalidateQueries` nesmú vymazať ani zrušiť novšie dáta/request. Test musí preukázať presné poradie, finálny aj prechodný QueryCache stav, počet HTTP requestov a absenciu dodatočného refetch loopu. Ak zlyhá, doplniť minimálnu lifecycle identity/generation kontrolu pred post-await zásahmi, prípadne úzko scoped per-ID usporiadanie operácií, **nie** oslabiť test.

**Overenie:**
- [x] `node node_modules/vitest/vitest.mjs run src/shared/query/providerInventoryRevision.test.ts src/shared/query/providerMutationInvalidation.test.tsx src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx`
- [x] Riadené Promise preveria medziľahlý aj konečný stav **oboch poradí submit/delete**; staré assertions na skutočný delete a šesť reprodukčných prípadov sú zachované. Silná kontrola Current VM a QueryCache udalostí rozlišuje nový query výsledok od starej mutation. Doplniť manuálny deleted-state refresh test pred/po rerenderi hooku.

**Závislosti:** P2-1 a P2-2.
**Súbory (5, medium):** `src/shared/query/providerInventoryRevision.ts`, `src/shared/query/providerInventoryRevision.test.ts`, `src/shared/query/providerMutationInvalidation.ts`, `src/shared/query/providerMutationInvalidation.test.tsx`, `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx`. Produkčný hook zostáva predmetom P2-2; v P2-3 ho meniť iba po opätovnom preskúmaní rozsahu.

## P2-4: Focused regresie a technický report

**Popis:** Overiť dotknuté moduly a existujúcich používateľov Resources/Recovery Groups. Zapísať presné výsledky a oddeliť prípadné cudzie Snapshot Policy chyby. Produkčné komponenty a generated súbory sa nemenia.

**Akceptačné kritériá:**
- [x] Všetky štyri P2 prípady prejdú spolu s pôvodnými úspešnými scenármi a rozšírením A–H zo zadania, vrátane pôvodnej delete ochrany. Navyše prejde **old delete → newer recreate → old delete resumes** a odmietnutie manuálneho Live Refresh pri deleted markeri (aj pred rerenderom). Žiadny test nie je vypnutý alebo oslabený.
- [x] Focused ESLint a diff kontrola prejdú. Typecheck prejde alebo sú presne doložené výhradne nesúvisiace diagnostiky; cudzie flashcopy_copy_rate fixtures sa tu neopravujú.
- [x] Report obsahuje root cause, návrh a rozdiel voči removedRevision, React reaktivitu/timing, úplný zoznam vlastných zmien, počty/príkazy pred a po a riziká. Zachovať vetvu a cudzie zmeny; bez commitu/pushu.

**Overenie (plánované, nie výsledky):**
- [x] `node node_modules/vitest/vitest.mjs run src/shared/query/providerInventoryRevision.test.ts src/shared/query/providerMutationInvalidation.test.tsx src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx`
- [x] `npm.cmd run typecheck`
- [x] `node node_modules/eslint/bin/eslint.js src/shared/query/providerInventoryRevision.ts src/shared/query/providerInventoryRevision.test.ts src/shared/query/providerMutationInvalidation.ts src/shared/query/providerMutationInvalidation.test.tsx src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.ts src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx --max-warnings 0`
- [x] `git diff --check`; pri cudzej whitespace chybe doložiť samostatne focused kontrolu vlastných súborov.
- [x] Pre nové untracked P2 Markdown súbory použiť samostatnú read-only whitespace/final-newline kontrolu (git diff ich pred stage nevidí). Žiadny stage ako pomôcka validácie.
- [x] `git status --short` a kontrola vetvy; porovnať cudzie zmeny s východiskom. Kompletnú suite ani production build nespúšťať.

**Závislosti:** P2-1 až P2-3.
**Súbory (2, small, evidencia):** `tasks/vmware-removed-revision-p2-plan.md`, `tasks/vmware-removed-revision-p2-todo.md`.

## Checkpoint B: Odovzdanie P2 opravy

- [x] P2-1 až P2-4 overené; štyri zlyhania odstránené a pôvodná delete ochrana zachovaná.
- [x] Reaktivita, marker lifetime, **obe poradia** interleaving submit/delete, manuálny deleted-state refresh guard a request counts doložené; žiadna lokálna kópia deleted stavu ani nová inventory cache.
- [x] Report pripravený na review; kompletná suite/build explicitne uvedené ako nespustené. Žiadny commit/push ani zásah do súbežného Snapshot Policy/Policy Catalog plánu.

## Evidencia plánovania

- [x] Prečítané nové zadanie, aktuálny CodeGraph zdroj, QueryClient/refetch mechanizmus, helper unit testy a desať credential assertions.
- [x] Čerstvá reprodukcia: 4 failed / 2 passed / 48 skipped. Focus/reconnect provider aj credential vetvy zlyhávajú na finálnej Recovered VM assertion, remount prejde.
- [x] Súbežná výmena predvolených task súborov zachytená pred zápisom; tieto súbory sa neprepísali. Používateľ schválil samostatné P2 cesty.
- [x] Plán zachová pôvodné assertions a rozšíri kontrolu o riadenú novú odpoveď a absenciu prechodného stale zápisu; bez implementačných zmien počas plánovania.
- [x] Používateľ schválil spresnený P2 plán a vykonanie inline.

## Priebežné výsledky vykonania

- Spresnený plán schválený pokynom načítať a vykonať inline. Bez subagentov, commitu/pushu alebo zásahov do cudzej Snapshot Policy práce.
- Pôvodné P2 reprodukcie znovu potvrdené: 4 failed, 2 passed, 48 skipped. Nové helper testy pred API implementáciou zlyhali na chýbajúcich funkciách; po implementácii všetkých 9 unit testov prešlo.
- Nové lifecycle integrácie pred napojením hooku zlyhali v 3 prípadoch: recreate neobnovil oba pripojené hooky a stará forceRefresh referencia vytvorila mutation pred/po rerenderi odstráneného providera.
- Po napojení explicitného deleted stavu, subscription a guardov: prvý focused beh 83 passed / 0 failed (3 súbory). Po interleaving/izolačnom rozšírení: 90 passed / 0 failed (3 súbory).
- Samostatná kontrola React-batched delete/recreate: 1 passed, 64 skipped; normálny inventory HTTP fetch nezačal s deleted=true a obnovil sa jedným novým requestom.
- Desať credential scenárov zachovalo pôvodnú undefined assertion počas riadenej novej odpovede; potom overujú automatický request, presné Current VM a absenciu prechodného stale zápisu.
- Starší fixture prípad „credential fallback“ pôvodne povoľoval manuálny refresh aj po skutočnom delete iba na základe credential bumpu. Nový výslovný kontrakt to zakazuje: doplnené odmietnutie po credential mutation a úspešný submit/recreate pred pôvodným finálnym New Live VM overením. Pôvodné cache assertions zostali zachované.
- React Compiler lint odmietol memoizáciu callbacku viazaného na odvodené mutovateľné normalization objektové pole. Callback teraz závisí od pôvodného providerId prop a QueryClient a používa rovnaký canonical normalizer. Bez suppressions a bez duplikovania normalizačných pravidiel.

## Finálny technický report — 2026-10-22

### Root cause

Pôvodný settleForceRefresh nastavil removedRevision po akejkoľvek úspešnej provider/credential invalidácii, ak chýbali cached dáta. Nešlo o dôkaz delete: po prvom neúspešnom načítaní a neúspešnom refetchi stále platného providera nastavil canFetch=false. Focus a reconnect potom neobnovili disabled query. Remount problém maskoval resetovaním lokálneho pending stavu.

### Implementované riešenie a vlastníctvo

- Existujúci WeakMap helper si zachováva nezmenený dvojhodnotový token providerRevision/infraEpoch. Oddelene drží aktuálnu infra provider operačnú identitu s boolean deleted a provider-scoped subscriptions.
- Každý lokálne úspešný infra submit/delete vytvorí novú aktuálnu entry identity. Delete nastaví deleted=true a notifikuje pred prvým await. Submit ponechá predchádzajúci deleted stav počas cancel/invalidate a až complete aktuálnej operácie ho prepne na false.
- Operation handle poskytuje isCurrent a complete. Kontrola po await cancelQueries zabraňuje starému delete odstrániť query novšieho recreate; ďalšia kontrola pred invalidate chráni nasledovný zásah. Complete tiež interne kontroluje aktuálnosť, takže starší submit neodblokuje novší delete. Credential bump túto identitu nemení.
- Nainštalovaný QueryClient.cancelQueries synchronne zachytí aktuálne queries a zavolá ich cancel ešte pred vrátením Promise; oneskorené čakanie na tento Promise nevykonáva novú cancellation nad budúcimi queries. Test gate preto zastaví až čakanie po skutočnom cancel, presne ako produkčný tok.
- useSyncExternalStore odoberá len aktuálny QueryClient/provider ID; stabilný boolean snapshot aktualizuje enabled bez kópie deleted stavu v hooku. Unsubscribe vyčistí odber. Recreate aktivuje stále pripojené hooky a TanStack zdieľa jeden nový request rovnakého key.
- removedRevision a heuristika query dát sa úplne odstránili. Force-refresh lokálny stav vlastní len pending/error. onSuccess zachoval latest-request-wins aj porovnanie oboch revision hodnôt.
- forceRefresh číta aktuálny deleted stav synchronne priamo z helpera ešte pred mutateAsync. Odmietne deleted aj cez starú funkčnú referenciu pred React renderom, bez HTTP/pending mutation/cache zápisu. Po recreate znovu funguje. Providerless odmietnutie zostalo zachované.

Oproti pôvodnému removedRevision existuje dôkaz úspešného delete aj React reaktivita. Aktívny provider bez dát už nie je blokovaný. Boolean deleted sa po recreate zruší; aktuálna operačná identita zostane iba na rozlíšenie starých dokončení. Ide o jeden stav na provider ID, nie históriu ani všeobecný orchestration framework.

### Upravené súbory tejto úlohy

| Súbor | Účel |
| --- | --- |
| `src/shared/query/providerInventoryRevision.ts` | Explicitný deleted stav, subscriptions a identity úspešných operácií; pôvodné tokenové API zachované. |
| `src/shared/query/providerInventoryRevision.test.ts` | 5 nových helper prípadov; spolu 9 unit testov vrátane pôvodných tokenových assertions. |
| `src/shared/query/providerMutationInvalidation.ts` | Začiatok infra operácie, post-await stale guards a podmienené dokončenie recreate; credential/platform invalidácia zachovaná. |
| `src/shared/query/providerMutationInvalidation.test.tsx` | Failure matrix so známym deleted stavom a platform save/delete izolácia; spolu 22 prípadov. |
| `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.ts` | Odstránenie removedRevision, useSyncExternalStore a synchronný manuálny deleted guard. |
| `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx` | Spolu 65 prípadov: pôvodné P2 reprodukcie, automatický recreate, oba interleaving smery, HTTP/cache medzistavy, manuálna stará referencia a izolácia. Preexistujúcich šesť reprodukcií ani pôvodný delete test sa neoslabili. |
| `tasks/vmware-removed-revision-p2-plan.md` | Spresnený schválený návrh a výsledná konkretizácia. |
| `tasks/vmware-removed-revision-p2-todo.md` | Stav úloh, overenie a tento report. |

Default tasks/plan.md a tasks/todo.md, Snapshot Policy/OpenAPI/generated/locales súbory a Policy Catalog neboli touto prácou upravované. Resources a Recovery Groups produkčné komponenty, query keys, cache policy a createAppQueryClient sa nemenili. Hook test súbor mal pri začiatku už reprodukčný diff 85 additions / 1 deletion.

### Testovacie výsledky pred a po

Pred opravou: štyri P2 focus/reconnect prípady failed, dve remount kontroly passed. Historický review baseline piatich súborov bol 113 passed / 4 failed (117).

Po oprave: **138 passed, 0 failed, 5 test súborov**, exit 0. Z toho hook 65, helper 9, spoločná invalidácia 22 a existujúce Resources/Recovery Groups testy spolu 42. Pôvodných 117 prípadov je zelených a pribudlo 21 prípadov. Desať credential scenárov zachovalo undefined assertion počas kontrolovaného nového HTTP requestu, potom doplnilo presné aktuálne dáta a neprítomnosť prechodného stale zápisu. Žiadny test sa nevynechal.

Skutočne vykonané hlavné finálne príkazy:

```powershell
node node_modules/vitest/vitest.mjs run src/shared/query/providerInventoryRevision.test.ts src/shared/query/providerMutationInvalidation.test.tsx src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx
npm.cmd run typecheck
node node_modules/eslint/bin/eslint.js src/shared/query/providerInventoryRevision.ts src/shared/query/providerInventoryRevision.test.ts src/shared/query/providerMutationInvalidation.ts src/shared/query/providerMutationInvalidation.test.tsx src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.ts src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx --max-warnings 0
git diff --check
git diff --cached --name-only
git status --short
```

Vitest: 138/138. Typecheck: exit 0, bez zostávajúcich Snapshot Policy diagnostík. Ich súbežná oprava nebola súčasťou tejto úlohy. Focused ESLint: exit 0, bez suppressions. git diff --check: exit 0 (iba bežné LF→CRLF upozornenia). Samostatná read-only whitespace/final-newline kontrola dvoch untracked P2 dokumentov tiež prešla; git diff ich pred stage nevidí.

```powershell
$paths=@('tasks/vmware-removed-revision-p2-plan.md','tasks/vmware-removed-revision-p2-todo.md')
foreach ($path in $paths) {
  $text=[System.IO.File]::ReadAllText((Join-Path (Get-Location) $path))
  if ($text -match '(?m)[ \t]+\r?$' -or -not $text.EndsWith("`n")) { throw "Whitespace/final newline failed: $path" }
}
```

### Review, riziká a Git stav

Inline review podľa správnosti, jednoduchosti, architektúry, bezpečnosti a výkonu: bez zostávajúceho nálezu v schválenom rozsahu. Presné request counts a prechodné QueryCache stavy pokrývajú pending/completed nový fetch po starom delete; React-batched delete/recreate takisto fetchuje až s deleted=false. Bez nových runtime závislostí, metadata query, cache vrstvy, generického event busu, backend zmien alebo kvalitatívnych výnimiek.

Zostávajúce hranice: viditeľné sú iba lokálne oznámené úspešné mutations v danom QueryClient. Iný tab/klient alebo poradie backend zápisov bez lokálneho oznámenia sa nesynchronizuje. Per-ID revisions a posledná lifecycle entry žijú s klientom; nezavádza sa reset pri query GC, ktorý by oživil staré tokeny. Klientsky reuse ID je testovaný cez generated options s mock HTTP, nie ako garancia backend implementácie. Kompletná suite, production build, browser E2E ani živý backend sa nespúšťali.

**Dôležité pri odovzdaní zdieľaného workspace:** Počas tejto práce sa mimo mojich Git nástrojových akcií objavil commit `b52d9377279649708fad3e0d939c4c6f8fc721db` s názvom `fix(discovery): track VMware provider deletion and resolve hook lint errors`. Obsahuje hook a hook test súbor vrátane rozpracovaných zmien tejto úlohy. Commit bol prečítaný a zachovaný; aktuálne súbory zodpovedajú overenému obsahu. Ja som nevykonal git add/commit/push/merge/reset/stash ani zmenu vetvy. Shared helper/invalidation a ich testy zostávajú necommitnuté spolu s týmito P2 dokumentmi; samotný uvedený commit preto nepredstavuje všetky súbory opravy. Overenie 138 testov, typechecku a lintovania platí pre aktuálny workspace ako celok.
