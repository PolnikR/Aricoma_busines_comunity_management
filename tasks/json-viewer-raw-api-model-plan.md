# Implementation Plan: Raw API model in JSON viewers

## Overview

Zjednotiť JSON modaly v tabuľkách Providers, Platform Providers a Recovery Applications so vzorom použitým v Recovery Groups. Každý frontendový list item bude popri normalizovaných poliach uchovávať aj `rawRecord` z validovanej GET odpovede. JSON modal zobrazí tento záznam v backendovom tvare a nebude spätne skladať JSON z normalizovaného UI modelu.

## Scope

V rozsahu sú:

- Providers,
- Platform Providers,
- Recovery Applications.

Recovery Groups už požadovaný model používa a poslúži ako referenčná implementácia. Ostatné JSON modaly v Recovery Plans, napríklad policies alebo policy sets, nie sú súčasťou tejto zmeny.

## Architecture decisions

- `rawRecord` bude voliteľná read-only vlastnosť frontendového modelu. Voliteľnosť zachová kompatibilitu existujúcich formulárov, fixtures a lokálne vytvorených objektov.
- Mapper uloží do `rawRecord` celý záznam po validácii generovanou Zod schémou. Ide o validovaný API záznam, nie o byte-for-byte HTTP payload: neznáme polia môže Zod odstrániť a schémové defaults môže doplniť.
- Normalizované camelCase polia ostanú zdrojom pre tabuľku, detail, editáciu a filtre. `rawRecord` bude slúžiť iba na read-only JSON reprezentáciu.
- Každý modul dostane malú čistú funkciu `to...Json(record)`. Tá vráti `rawRecord`, ak existuje, inak zostaví kompatibilný fallback pre fixtures a lokálne objekty.
- JSON modal zostane nad dátami aktuálne uloženými v TanStack Query cache. Kliknutie na `View JSON` nespustí nový request; aktualizácia dát sa naďalej rieši existujúcou invalidáciou/refetchom zoznamu.
- Citlivé údaje sa nesmú dopĺňať z iných endpointov. Zobrazia sa iba polia, ktoré už obsahuje príslušný list GET kontrakt.

## Dependency graph

```text
Generated GET output type
    -> frontend list-item model (`rawRecord?`)
        -> API mapper stores validated record
            -> `to...Json` selects raw record or fallback
                -> table JSON modal
                    -> component/API-mapper tests
```

## Task 1: Providers — preserve and display the validated GET record

**Description:** Rozšíriť provider list item o pôvodný validovaný `ProviderRecordOutput`, uložiť ho pri mapovaní GET odpovede a použiť ho v JSON modale. Tým sa v JSON zachovajú backendové `null` hodnoty namiesto UI normalizácií, napríklad `description: null` namiesto prázdneho reťazca a `credentialStatus: null` namiesto UI fallbacku `none`.

**Acceptance criteria:**

- [ ] Provider získaný z GET obsahuje `rawRecord` so serverovými názvami a hodnotami po validácii.
- [ ] Tabuľka, detail, editácia a filtre ďalej používajú existujúci normalizovaný `ProviderRecord`.
- [ ] JSON modal preferuje `rawRecord`; objekt bez `rawRecord` má stabilný fallback a modal sa otvorí bez chyby.

**Verification:**

- [ ] RED/GREEN test mappera odlíši raw `null` od normalizovaných UI hodnôt.
- [ ] Component test potvrdí, že modal zobrazuje raw hodnoty a neotvorí detail drawer.
- [ ] Focused tests:

  ```bash
  npm run test -- src/features/providers-connectors/providers/api/providersApi.test.ts src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx
  ```

- [ ] `npm run typecheck` prejde.
- [ ] Po úspešnom overení commitnúť iba túto časť ako `feat: show raw provider records in JSON viewer`.

**Dependencies:** None.

**Files likely touched:**

- `src/features/providers-connectors/providers/model/providerTypes.ts`
- `src/features/providers-connectors/providers/api/providersApi.ts`
- `src/features/providers-connectors/providers/api/providersApi.test.ts`
- `src/features/providers-connectors/providers/helpers/providerJson.ts` (nový, ak nevznikne vhodnejšie umiestnenie)
- `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.tsx`
- `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx`

**Estimated scope:** Medium, 5–6 files. Ak helper ostane pri mapperi, rozsah sa zníži o jeden súbor.

## Task 2: Platform Providers — preserve and display the validated GET record

**Description:** Použiť rovnaký raw-record kontrakt pre platform providerov. GET mapper uloží celý `OrchestrationProviderRecordOutput`; JSON modal zobrazí jeho backendové hodnoty vrátane `port`, `dagDir`, `credentialStatus` a prípadných `null` hodnôt bez UI normalizácie.

**Acceptance criteria:**

- [ ] Platform provider z GET obsahuje `rawRecord` s kompletným validovaným list záznamom.
- [ ] JSON modal zobrazuje `rawRecord`, nie normalizovaný submit/edit model.
- [ ] POST/DELETE návratové typy bez garantovaného `credentialStatus` nemenia správanie cache; existujúca invalidácia následne načíta plný GET záznam.
- [ ] Objekt bez `rawRecord` používa testovateľný fallback.

**Verification:**

- [ ] API test pokryje rozdiel medzi raw nullable hodnotou a UI fallbackom.
- [ ] Component test overí raw `port`, `dagDir`, `credentialStatus` a aspoň jednu nullable hodnotu.
- [ ] Focused tests:

  ```bash
  npm run test -- src/features/platform-administration/platform-providers/api/platformProvidersApi.test.ts src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx src/features/platform-administration/platform-providers/hooks/platformProviderHooks.test.tsx
  ```

- [ ] `npm run typecheck` prejde.
- [ ] Po úspešnom overení commitnúť iba túto časť ako `feat: show raw platform provider records in JSON viewer`.

**Dependencies:** Task 1 iba pre dohodnutú konvenciu názvov; implementačne je nezávislý.

**Files likely touched:**

- `src/features/platform-administration/platform-providers/model/platformProviderTypes.ts`
- `src/features/platform-administration/platform-providers/api/platformProvidersApi.ts`
- `src/features/platform-administration/platform-providers/api/platformProvidersApi.test.ts`
- `src/features/platform-administration/platform-providers/helpers/platformProviderJson.ts` (nový, ak bude potrebný)
- `src/features/platform-administration/platform-providers/components/PlatformProvidersTable.tsx`
- `src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx`

**Estimated scope:** Medium, 5–6 files.

## Checkpoint: Providers

- [ ] Providers aj Platform Providers uchovávajú raw GET záznam rovnakým spôsobom.
- [ ] Focused testy oboch modulov a typecheck prejdú.
- [ ] JSON tlačidlo nevykonáva nový network request.
- [ ] Diff neobsahuje aktuálne rozpracované zmeny provider role filtra, ktoré nepatria k tomuto plánu.

## Task 3: Recovery Applications — replace reconstructed JSON with the raw record

**Description:** Uložiť `RecoveryAppRecordOutput` do `RecoveryApplicationListItem.rawRecord` počas mapovania a presunúť zostavenie JSON z komponentu do mapper/helper vrstvy. JSON modal použije originálny validovaný GET záznam; fallback zachová dnešné správanie pre ručne vytvorené fixtures.

**Acceptance criteria:**

- [ ] Každá recovery application z GET obsahuje `rawRecord` vrátane `policy_set_id`, `airflow_run_id` a `push_to_orchestrator` podľa API odpovede.
- [ ] JSON modal používa raw záznam a lokálna funkcia `getRecoveryApplicationJson` už nie je v table komponente.
- [ ] Existujúci normalizovaný model pre tabuľku, detail a editáciu zostane bez funkčnej zmeny.
- [ ] Fallback pre list item bez `rawRecord` produkuje doterajší backendový snake_case tvar.

**Verification:**

- [ ] Mapper test potvrdí referenčne alebo štrukturálne zachovaný validovaný API záznam.
- [ ] Component test použije zámerne odlišný `rawRecord` a normalizovaný model, aby dokázal, že modal preferuje raw dáta.
- [ ] Focused tests:

  ```bash
  npm run test -- src/features/recovery-plans/recovery-applications/helpers/mapRecoveryApplications.test.ts src/features/recovery-plans/recovery-applications/api/recoveryApplicationsApi.test.ts src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx
  ```

- [ ] `npm run typecheck` prejde.
- [ ] Po úspešnom overení commitnúť iba túto časť ako `feat: show raw recovery application records in JSON viewer`.

**Dependencies:** Tasks 1–2 iba pre jednotnú konvenciu.

**Files likely touched:**

- `src/features/recovery-plans/recovery-applications/model/recoveryApplicationTypes.ts`
- `src/features/recovery-plans/recovery-applications/helpers/mapRecoveryApplications.ts`
- `src/features/recovery-plans/recovery-applications/helpers/mapRecoveryApplications.test.ts` (nový alebo existujúci podľa stavu pri implementácii)
- `src/features/recovery-plans/recovery-applications/api/recoveryApplicationsApi.test.ts`
- `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.tsx`
- `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx`

**Estimated scope:** Medium, 5–6 files.

## Task 4: Cross-feature regression verification

**Description:** Overiť jednotný kontrakt všetkých štyroch JSON viewerov bez spúšťania celej približne 200-testovej suite. Full suite sa nespustí automaticky; použijú sa dotknuté testy a statické kontroly, aby agent dokončil prompt v predvídateľnom čase.

**Acceptance criteria:**

- [ ] Providers, Platform Providers, Recovery Applications a existujúce Recovery Groups zobrazujú validovaný raw GET model, ak je dostupný.
- [ ] Žiaden JSON modal nezobrazuje credentials secret ani nedoťahuje dáta z ďalšieho endpointu.
- [ ] Všetky zmenené moduly majú test raw-vs-normalized správania a fallbacku.

**Verification:**

- [ ] Spustiť jeden explicitný zoznam focused testov pre všetky štyri tabuľky a mappery.
- [ ] Spustiť `npm run typecheck`.
- [ ] Spustiť ESLint iba nad zmenenými TS/TSX súbormi.
- [ ] Spustiť `git diff --check` a skontrolovať staged scope.
- [ ] Manuálne v aplikácii overiť jeden záznam v každej tabuľke proti príslušnej GET odpovedi v Network paneli.
- [ ] Ak finálna kontrola vyžaduje opravu, po prechode testov ju commitnúť samostatne ako `fix: align JSON viewers with raw API records`.

**Dependencies:** Tasks 1–3.

**Files likely touched:** Žiadne; iba chyby odhalené v Tasks 1–3.

**Estimated scope:** Small.

## Final checkpoint

- [ ] Všetky focused testy prešli.
- [ ] Typecheck a cielený lint prešli.
- [ ] Každý implementačný slice je po úspešných testoch samostatne commitnutý.
- [ ] Manuálne porovnanie potvrdilo backendové názvy a hodnoty.
- [ ] Nesúvisiace rozpracované súbory zostali mimo commitov.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Označenie `rawRecord` môže vytvoriť dojem byte-for-byte payloadu | Stredný | V type komentári a testoch uviesť, že ide o záznam po Zod validácii/defaultoch. |
| Povinný `rawRecord` rozbije formuláre a fixtures | Vysoký | Pole ponechať voliteľné a implementovať explicitný fallback. |
| JSON začne používať UI-normalizované hodnoty | Vysoký | Testovať dvojicu raw `null` verzus UI `""`/`none`. |
| Nové backendové pole sa stratí v generovanej Zod schéme | Stredný | OpenAPI/generovaný model ostáva autoritou; zmenu kontraktu riešiť cez existujúci `api:update` proces. |
| JSON bude po zmene na serveri dočasne starý | Stredný | Zdokumentovať, že ide o query snapshot; nový request na klik nie je súčasťou rozsahu. |
| Súbežná provider-role práca zasiahne rovnakú tabuľku a test | Vysoký | Implementovať sekvenčne, pred každým slice skontrolovať status/diff a stageovať iba explicitné súbory. |

## Out of scope

- Samostatný detail endpoint alebo nový request po kliknutí na `View JSON`.
- Zobrazovanie nevalidovaných/unknown polí mimo OpenAPI kontraktu.
- Úpravy backendu alebo generovaných API súborov.
- JSON viewers pre Policy Sets a Recovery Policies.
- Vizuálna zmena `JsonViewerModal`.
- Spúšťanie celej test suite v každom implementačnom kroku.

## Open questions

Žiadne blokujúce otázky. Plán predpokladá rovnakú semantiku ako Recovery Groups: „reálny JSON“ znamená posledný validovaný list záznam uložený v query cache, nie nový live detail request.
