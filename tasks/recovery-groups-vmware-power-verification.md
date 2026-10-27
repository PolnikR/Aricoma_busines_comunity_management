# Recovery Groups – výsledky overenia

Dátum: 2026-10-27. Implementácia vykonaná inline na `spike/ant-design-shell`. Testované zmeny sú v samostatných atomických commitoch; nesúvisiace worktree zmeny a generated Recovery Applications nepatria k tejto práci.

## Výsledok a rozsah

Implementované T1–T7: bezstratové email/pool mapovanie, lifecycle a validácia, Details email, Managed Target Pool nad existujúcou cache, symetria partnerstva, technické VMware/Power helpery, EN/SK/CS a uložená konfigurácia v DetailView. ID/Name/Description zostávajú bez helperov. FLASHCOPY zostáva jediný ponúkaný storage typ. Nevznikol mock permission gate ani inventory push gate.

`useRecoveryGroupTargetPools` používa generated `useGetVolumes` s existujúcim `flashSystemInventoryQuery` ako query options. To rešpektuje ADR 0002 a ESLint zákaz ručne používaného useQuery vo feature kóde. Source inventory sa iba pozoruje s enabled=false pre informatívne Automatic porovnanie. Retry používa normálnu query; samostatný live refresh/force_refresh ovládač sa nepridával.

T3.1 reprodukčné testy potvrdili, že existujúce cancel/invalidation mechanizmy zabránia publikovaniu oneskorenej FlashSystem odpovede po provider update/delete. Zdieľaný FlashSystem factory preto nebol upravovaný. Doplnené testy pool observers overili platnú cache, súbežnosť, stale/invalidated cache, prepnutie targetu, prázdnu mapu a error/retry.

Finálna kontrola navyše reprodukovala sprístupnenie teplej default-array cache disabled observerom bez target ID a možnosť manuálnym retry odoslať default-array request. Feature hook preto bez konkrétneho aktívneho target kontextu nevracia pool dáta/chyby a retry nespustí request; spoločné query keys/factory sa nemenia. Oba regresné prípady najprv zlyhali a po cielenej oprave prešli.

Po browser kontrole boli opravené aj relevantné staré texty: orchestration provider sa obnovuje z uloženého záznamu; push nasadzuje DAG, nie je automaticky synonymom spustenia recovery; Managed vytvára auxiliary volumes na target a remote-copy vzťahy/CG na source.

## Automatické testy

Nasledujúce focused behy prešli. Počty sú za konkrétny beh a prekrývajú sa; nesčítavajú sa na počet unikátnych testov.

| Overená oblasť | Výsledok |
|---|---|
| Mapper, validácia, lifecycle, readiness, symetria | 5 súborov, 99 testov |
| Details/Builder a základný pool observer/factory | 4 súbory, 57 testov |
| Topology, pool hook, discovery lifecycle, factory | 4 súbory, 20 testov |
| Provider/Resources/FieldHelp/Table/Orchestration a nové locale testy | 6 súborov, 80 testov |
| Nižšie uvedená integračná regresná sada | 11 súborov, 180 testov |
| Create/Edit BE 403 a rozšírený pool cache observer | 3 súbory, 32 testov |
| Provider invalidácia, mapper, effective draft | 3 súbory, 63 testov |
| EN/SK/CS field help a topology preklady | 2 súbory, 5 testov |
| Finálny missing-target cache/retry guard a Topology UI | 2 súbory, 16 testov |

Reprodukovateľné príkazy (z FE root):

```powershell
npm.cmd exec -- vitest run src/features/recovery-plans/recovery-groups/helpers/mapRecoveryGroups.test.ts src/features/recovery-plans/recovery-groups/api/recoveryGroupsValidation.test.ts src/features/recovery-plans/recovery-groups/model/recoveryGroupDraftLifecycle.test.ts src/features/recovery-plans/recovery-groups/model/recoveryGroupDraftReadiness.test.ts src/features/recovery-plans/recovery-groups/utils/recoveryGroupTopology.test.ts
npm.cmd exec -- vitest run src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroups.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.prefetch.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.discovery-lifecycle.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.integration.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.orchestration.test.tsx src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.test.tsx src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.test.tsx src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx src/features/recovery-plans/recovery-groups/utils/reconcileMetroMirrorPrefill.test.ts src/locales/recoveryGroupFieldHelpTranslations.test.ts
npm.cmd exec -- vitest run src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.test.tsx src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.test.tsx src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupTargetPools.test.tsx
npm.cmd exec -- vitest run src/shared/query/providerMutationInvalidation.test.tsx src/features/recovery-plans/recovery-groups/helpers/mapRecoveryGroups.test.ts src/features/recovery-plans/recovery-groups/model/resolveRecoveryGroupDraft.test.ts
npm.cmd exec -- vitest run src/locales/recoveryGroupFieldHelpTranslations.test.ts src/locales/recoveryGroupTopologyTranslations.test.ts
npm.cmd run typecheck
```

Focused ESLint bol spustený pre zmenené TS/TSX súbory, nové feature testy/helpery a QA script cez `npm.cmd exec -- eslint <explicitné dotknuté súbory> --max-warnings 0`. Žiadne suppression pravidlá neboli pridané. Pri každom commite bol vykonaný `git diff --cached --check`; dokumenty navyše prešli UTF-8/štruktúrnou kontrolou.

Celá test suite, produkčný build a regenerácia API sa pre túto zmenu nespúšťali. Finálny `npm.cmd run typecheck` prešiel aj po objavení súbežných generated zmien inej práce; tieto zmeny neboli zahrnuté do vlastných commitov.

## Skutočný Playwright beh, mockované API

Spustený bol reálny headless Microsoft Edge cez Playwright, samostatný browser context a lokálny Vite na `127.0.0.1:5197`. Všetky API requesty boli zachytené iba pod `/api/`; requesty na zdrojové moduly `/src/shared/api/` sa neinterceptujú. Backendová persistencia bola in-memory fixture v QA scripte, nie skutočný BE.

Pri finálnom opakovaní bol kvôli súbežným úpravám workspace použitý Vite Node API server s `hmr: false, watch: null`, aby zmeny inej relácie nereštartovali dokument uprostred browser assertion. Produkčná Vite konfigurácia nebola menená.

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5197 --strictPort
node --check scripts/qa/verify-recovery-groups.mjs
node scripts/qa/verify-recovery-groups.mjs
```

Presné spustenie stabilného QA servera v PowerShelli:

```powershell
@'
import { createServer } from 'vite';
const qaServer = await createServer({ server: { host: '127.0.0.1', port: 5197, strictPort: true, hmr: false, watch: null } });
await qaServer.listen();
qaServer.printUrls();
'@ | node --input-type=module
```

Runtime: `node_modules/.cache/scroll-probe/node_modules/playwright-core/index.mjs`; alternatívu možno nastaviť cez PLAYWRIGHT_MODULE, FE cez APP_URL. Bez požadovaného runtime/browsera script zlyhá, nevydáva simulované overenie za browser pass.

| Scenár | Výsledok |
|---|---|
| VMware + FLASHCOPY Local Create/Edit/Display, VM + volumes | PASS, mockovaný BE |
| VMware + FLASHCOPY MM Existing Create/Edit/Display, CG/aux prefill a payload | PASS, mockovaný BE |
| VMware + FLASHCOPY MM Managed Create/Edit/Display, explicit/Automatic pool | PASS, mockovaný BE |
| IBM Power + FLASHCOPY Local Create/Edit/Display, LPAR + volumes | PASS, mockovaný BE |
| IBM Power + FLASHCOPY MM Existing Create/Edit/Display | PASS, mockovaný BE |
| IBM Power + FLASHCOPY MM Managed Create/Edit/Display | PASS, mockovaný BE |
| Email nastavenie, GET/Edit zachovanie, clear → POST null | PASS, všetkých 6 kombinácií |
| Target pool.name, Managed bez user CG/aux, Existing bez target_pool | PASS, zachytené browser POST requesty |
| Warm target cache bez ďalšieho requestu, source switch na iný partner pool | PASS, request-count assertions |
| VIEW_INVENTORY 403, retry, odstránený explicitný pool zachovaný pri Edit | PASS |
| Managed mock POST 403 zobrazený; absencia inventory nepridáva push gate | PASS; mockovaná permission chyba nie je live authorization dôkaz |
| EN/SK/CS Create/Edit/Display technické helpery, generic/VMware/Power | PASS |
| Prepnutie VMware → Power mení help, Escape a návrat fokusu, nezmenené form values | PASS |
| Desktop 1440 px a mobilný viewport 390 px, scroll v DetailView | PASS; screenshoty vizuálne skontrolované |

Artefakty sú lokálne v `node_modules/.cache/recovery-groups-qa/`: `results.json` so skutočnými zachytenými mock requestmi/query/body a stavmi, screenshoty oboch platforiem, `details-{en,sk,cs}.png`, `display-{en,sk,cs}.png`, `missing-pool-preserved.png`. Generované screenshoty/cache nie sú súčasťou commitu. `failure.png` môže pochádzať z predchádzajúcej iterácie QA scriptu; autoritatívny je úspešný finálny `results.json`, nie existencia starého failure artefaktu.

Finálny beh kontroluje neočakávané pageerror/console error/warning. Očakávané network 403 z úmyselných error fixtures sú osobitne označené v consoleFindings. Počiatočné neúspešné iterácie boli chyby QA harnessu (príliš široká route, casing/názov save buttonu, čakanie na viditeľnosť option, mount/retry race), nie vydávané za úspešný beh.

## Live BE – iba čítanie

Používateľ poskytol `http://10.99.99.53:8000/docs#/` a výslovne zakázal na BE čokoľvek upravovať.

- GET `/openapi.json`: úspešný; ABCo API 0.1.0, RecoveryGroup obsahuje notificationEmail, MetroMirrorConfig obsahuje mode/consistency_group_id/target_pool. Kontrola bola vykonaná cez Invoke-RestMethod po povolení read-only sieťového prístupu mimo sandboxu.
- GET `/get_recovery_groups`: HTTP 401 Unauthorized. Žiadne credentials ani developer bypass neboli použité.
- Live POST/upsert/delete/provisioning/Airflow push: NOT RUN podľa používateľovho obmedzenia. Žiadna zmena BE kódu ani dát.

Zostáva neoverené: autentifikované live GET údaje, reálny GET→Edit→POST→GET a skutočné VMware/HMC/FlashSystem discovery/provisioning. Mockovaný browser test tieto integračné dôkazy nenahrádza. Live zápisy nie sú aktuálne autorizovanou súčasťou odovzdania.

## Inline review a obmedzenia

Kontrola diffu prebehla inline: žiadne Recovery Applications produkčné zmeny, ručné generated úpravy, nové API endpointy/cache kľúče, mock authorization gate ani hard inventory push gate. Provider symetria využíva už načítaný zoznam. Nový target provider ID v doménovom read modeli sa odvodzuje z provider vzťahu iba pre Display a neodosiela sa ako nové API pole. Existing prefill a pôvodné pushed/provisioned locky boli zachované a regresne overené.

Vetva zostáva na mieste, iba vlastné súbory sú commitované. Žiadny git push, merge alebo zásah do cudzej rozpracovanej práce.
