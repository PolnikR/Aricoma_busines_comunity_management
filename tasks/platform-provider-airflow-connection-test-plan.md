# Implementačný plán: Test pripojenia AIRFLOW Platform Providera

## Rozsah a overený stav (13. 10. 2026)

Tento dokument plánuje iba FE zmenu. Produkčný kód, backend, OpenAPI a generované súbory sa v tejto fáze nemenia. Pracovný strom bol pri analýze podľa `git status --porcelain=v1` čistý; pri implementácii treba stav znovu skontrolovať a zachovať prípadné cudzie zmeny.

- `ProvidersCatalogueTable.tsx` má inline `Button` s `PlugIcon`, kontrolu `credentialStatus === 'ok'`, `useTestProvider`, reset query pri otvorení/Retry a počas testu odoberá `DetailView` z DOM. `ProviderConnectionTestDialog.tsx` počíta úspešné kontroly, odlišuje výsledok `ok: false` od request chyby, používa `ChecklistResultDialog` a `ProviderTestResponse` v `ResponseBodyViewer`.
- `PlatformProvidersPage.tsx` načítava zoznam; `PlatformProvidersTable.tsx` drží výber a detail, pre AIRFLOW zobrazuje credentials, no `headerActions` obsahuje len `KeyedHelpPopover`. `selectPlatformProviders.ts` dopĺňa chýbajúci `credentialStatus` hodnotou `none`; typ AIRFLOW je v `platformProviderTypes.ts`.
- `ChecklistResultDialog.tsx` zobrazuje všetky ne-`ok` kontroly ako chybu. Pri requeste bez výsledku status bar nevykresľuje, ale text počítadla je teraz natvrdo anglický. `Modal` spracúva Escape aj počas `isPending`, hoci tlačidlo Close a backdrop sú vtedy blokované.
- Globálne query nastavenia (`src/app/providers.tsx`, `cachePolicy.ts`) majú `retry: 1` a automatický refetch pri focus, mount a reconnect. Pre tento side-effecting GET sú potrebné lokálne výnimky; globálnu politiku nemeniť.

## Overený FE/BE kontrakt

| Vec | Zistenie |
|---|---|
| Endpoint | BE `api/routers/platform_providers.py`: `GET /test_platform_provider`, povinný query parameter `provider_id: str`, `Permission.RUN_HEALTH_CHECK`; typ iný než AIRFLOW vracia 400. Neznáme ID alebo chýbajúci súbor vracia 404, neplatný JSON 500; validácia parametra môže vrátiť 422 a auth 403. |
| FE volanie | `useTestPlatformProvider({ provider_id })`, `getTestPlatformProviderQueryKey({ provider_id })` v `src/generated/query/platform-providers/platform-providers.gen.ts`; Orval používa `validatingMutator` a `GET`. `apiFetch` pridáva Bearer token v bežnej auth prevádzke a vývojový `X-User` pri vypnutej auth. |
| Odpoveď | BE používa `ProviderTestResponse`: `provider_id: string`, `provider_type: string`, `ok: boolean`, `checks: { name, status, detail }[]`. FE Zod schéma a `responseSchemas.gen.ts` registrujú tú istú schému pre `GET /test_platform_provider`. HTTP 200 s `ok: false` je dokončený neúspešný test, nie request error. |
| Kontroly | `apache_airflow/health.py`: `airflow_url`, `airflow_auth`, `airflow_sftp`, `airflow_dag_load`, `airflow_dag_parsed`, `airflow_cleanup`, v tomto poradí. Stavy sú `ok`, `failed`, `skipped`. BE používa polling 3 s a parse timeout 60 s; celá požiadavka môže trvať dlhšie. |
| Chyby | `orvalMutator` vyhadzuje `OrvalApiError` pre non-2xx; `apiErrorMessage.ts` vie vytiahnuť backend `detail` alebo použiť lokalizovaný fallback. Zod validácia je už zapojená. |

BE bol prečítaný iba ako referenčný zdroj vo workspace `abco-be`. Nevyžaduje sa jeho úprava.

## Architektonické rozhodnutia

1. **Tlačidlo:** vybrať existujúcu inline konfiguráciu do tenkého `shared/components/button/ConnectionTestButton.tsx`. Komponent iba vykreslí `Button`, ikonu, spoločné triedy, preklad a dôvod disabled stavu. O tom, či má byť tlačidlo viditeľné/povolené, rozhodnú samostatne oba tabuľkové komponenty. Infra tabuľka použije nový komponent bez zmeny svojej query logiky.
2. **Dialóg:** z existujúceho `ProviderConnectionTestDialog` vyňať spoločnú prezentáciu výsledku, loadingu, chýb a Retry do `shared/components/modal/ConnectionTestResultDialog.tsx`, ktorý ďalej používa `ChecklistResultDialog`. Existujúci infra komponent zostane tenkým adaptérom pre jeho typ/rolu; platform tabuľka použije spoločný dialóg s badge `AIRFLOW` a bez roly. Tým nevznikne import jednej feature z druhej ani duplicitný checklist či modal. `response.ok` riadi celkový stav, počítadlo ráta iba `ok`, Response Body má schému `ProviderTestResponse`.
3. **`skipped`:** spoločný checklist dostane neutrálnu ikonu/farbu/text. Rozšíriť status bar o voliteľný počet skipped, napr. lokalizované „2 / 6 úspešných · 3 preskočené“, aby bolo jasné, že menovateľ zahŕňa všetky kontroly. Bez skipped zostane infra výstup významovo rovnaký. V EN/SK/CS použiť existujúce preklady pre tlačidlo, loading, chybu, Close/Retry, Response Body a počítadlo; doplniť iba text skipped počtu a stavu. Názvy a detaily kontrol sú pôvodný backend obsah.
4. **Request lifecycle:** platform tabuľka drží `testTarget` zachytený pri kliknutí, aby ďalší výber/zmena zoznamu nezmiešala ID, meno a výsledok. Hook je `enabled` len pri otvorenom teste pre AIRFLOW s `credentialStatus === 'ok'`. Lokálne nastaviť `retry: false`, `retryOnMount: false`, `refetchOnWindowFocus: false`, `refetchOnReconnect: false`, `refetchOnMount: false`, `staleTime: Infinity` a bez polling intervalu. Pred každým novým otvorením resetovať presný query key, potom otvoriť dialóg; Retry resetuje presný aktívny key a tým spustí jeden nový request. Pri `isPending || isFetching` skryť predchádzajúce data/error, zobraziť loading a blokovať ďalší Retry. Detail sa počas testu nemountuje; po zatvorení zostáva vybrané pôvodné ID. Počas bežiaceho Airflow requestu platform `onClose` odmietne aj Escape (shared `Modal` ho inak povoľuje), aby používateľ nespustil paralelný test otvorením detailu. Existujúce infra správanie sa nemení.

## Presný súborový rozsah implementácie

| Vytvoriť | Upraviť |
|---|---|
| `src/shared/components/button/ConnectionTestButton.tsx` | `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.tsx`, `ProvidersCatalogueTable.test.tsx` |
| `src/shared/components/modal/ConnectionTestResultDialog.tsx`, `ConnectionTestResultDialog.test.tsx` | `src/shared/components/modal/ChecklistResultDialog.tsx`, `ChecklistResultDialog.test.tsx` |
| — | `src/features/providers-connectors/providers/components/ProviderConnectionTestDialog.tsx`, `ProviderConnectionTestDialog.test.tsx` |
| — | `src/features/platform-administration/platform-providers/components/PlatformProvidersTable.tsx`, `PlatformProvidersTable.test.tsx`, `src/features/platform-administration/platform-providers/model/platformProvidersWire.test.tsx` |
| — | `src/locales/en.json`, `src/locales/sk.json`, `src/locales/cs.json` |

`PlatformProvidersPage.tsx`, model/select súbory, API vrstva, generovaný klient, OpenAPI a BE sú iba prečítané zdroje; plán v nich nevyžaduje zmenu.

### Závislosti

`T1 (shared tlačidlo) ──→ T4 (platform integrácia)`
`T2 (skipped stav) ──→ T3 (shared výsledkový dialóg) ──→ T4`
`T4 ──→ T5 (wire, regresia a vizuálne overenie)`

## Úlohy

### T1 — Zdieľať existujúce tlačidlo

**Účel:** Jeden vizuálny zdroj pravdy pre obe obrazovky.
**Zmeny:** vytvoriť `ConnectionTestButton.tsx` bez business logiky; v `ProvidersCatalogueTable.tsx` nahradiť inline konfiguráciu. Zachovať veľkosť `xs`, `soft`, accent-soft triedy, `PlugIcon`, `title`, `aria-describedby` a sr-only dôvod.
**Akceptácia:** infra tlačidlo vyzerá a funguje rovnako; disabled text je dostupný klávesnici/screen readeru; platform ho môže použiť s vlastným `disabled` a `onClick`.
**Testy:** doplniť `ProvidersCatalogueTable.test.tsx` pre existujúci vzhľad/disabled dôvod; focused Vitest a ESLint.
**Súbory:** nový `src/shared/components/button/ConnectionTestButton.tsx`; úpravy `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.tsx` a `.test.tsx`.
**Závislosti:** žiadne. **Rozsah:** S (3 súbory).

### T2 — Neutrálny `skipped` v shared checkliste

**Účel:** Vyjadriť nevykonanú kontrolu bez falošnej chyby a jasne spočítať výsledky.
**Zmeny:** `ChecklistResultDialog.tsx` rozlíši `ok`/`failed`/`skipped` ikonou, farbou a prístupným stavom; status bar použije existujúci preklad `providers.connectionTest.passedCount` namiesto anglického literálu a voliteľný preklad skipped počtu. `aria-label` checklistu použije existujúci `providers.connectionTest.checksLabel`. Pridať potrebné kľúče do EN/SK/CS.
**Akceptácia:** skipped nie je červený ani započítaný medzi úspechy; `failed` zostáva chybový; status bar ostáva skrytý počas loadingu; infra bez skipped je významovo nezmenené.
**Testy:** `ChecklistResultDialog.test.tsx`: všetky tri stavy, počty, prístupný text, EN/SK/CS; focused Vitest a ESLint.
**Súbory:** `src/shared/components/modal/ChecklistResultDialog.tsx`, `.test.tsx`, `src/locales/en.json`, `sk.json`, `cs.json`.
**Závislosti:** žiadne. **Rozsah:** M (5 súborov).

### Checkpoint po T1–T2

- [ ] Focused testy pre infra tlačidlo a checklist prechádzajú.
- [ ] Všetky tri locale JSON sú platné; žiadny nový text nie je natvrdo v UI.
- [ ] `git diff --check` bez chýb; žiadna zmena generovaných súborov.

### T3 — Spoločný výsledkový dialóg

**Účel:** Zdieľať existujúci modal, loading, mapovanie odpovede, chyby, badge, Retry a Response Body bez cross-feature importu.
**Zmeny:** vytvoriť `ConnectionTestResultDialog.tsx` nad `ChecklistResultDialog`; zmeniť `ProviderConnectionTestDialog.tsx` na infra adaptér pre `providerTypeLabel` a rolu. Spoločný komponent prijíma názov, ID, typový badge, prípadný ďalší badge, výsledok, error, pending a handlery. Typový badge AIRFLOW zostáva viditeľný aj počas loadingu; rola sa pre platform vôbec neposiela.
**Akceptácia:** infra ukazuje pôvodné údaje a rolu; platform konfigurácia vie ukázať AIRFLOW bez Source/Target; HTTP 200 `ok: false` zobrazí checklist a Retry; HTTP chyba použije `resolveUserFacingErrorMessage`; Response Body je pôvodný JSON so schémou `ProviderTestResponse`.
**Testy:** `ProviderConnectionTestDialog.test.tsx` pre infra regresiu; nový `ConnectionTestResultDialog.test.tsx` pre loading, HTTP error, `ok: false`, skipped, Response Body a variant bez roly.
**Súbory:** nový `src/shared/components/modal/ConnectionTestResultDialog.tsx` a `.test.tsx`; úpravy `src/features/providers-connectors/providers/components/ProviderConnectionTestDialog.tsx` a `.test.tsx`.
**Závislosti:** T2. **Rozsah:** M (4 súbory).

### T4 — AIRFLOW akcia, query a modal lifecycle

**Účel:** Jediný explicitný klik = jeden čerstvý backend test s izolovaným výsledkom.
**Zmeny:** v `PlatformProvidersTable.tsx` zobraziť shared tlačidlo iba pri AIRFLOW vedľa existujúceho HelpPopover. Pridať `testTarget` a `useTestPlatformProvider`, presný `getTestPlatformProviderQueryKey` reset pri otvorení/Retry, lokálne query nastavenia uvedené vyššie, guard pre credentials/pending/close, skrytie `DetailView` a `ConnectionTestResultDialog` s badge AIRFLOW. Zoznam, CRUD a iné typy nemeniť.
**Akceptácia:** pred klikom nula test requestov; chýbajúce credentials blokujú akciu s rovnakým dôvodom; `provider_id` zodpovedá vybranému AIRFLOW; pri loadingu nie je starý checklist/JSON ani `0 / 0`; Retry a opätovné otvorenie vytvoria nový request; focus/reconnect/remount nevytvoria nový test; detail a testovací modal nie sú súčasne aktívne; Close vráti pôvodný detail.
**Testy:** `PlatformProvidersTable.test.tsx` s reálnym `QueryClient`/mock fetch, vrátane long pending a zmeny výberu/zoznamu; `platformProvidersWire.test.tsx` overí metódu, URL s `provider_id`, Bearer cestu a validovaný response.
**Súbory:** `src/features/platform-administration/platform-providers/components/PlatformProvidersTable.tsx`, `.test.tsx`, `src/features/platform-administration/platform-providers/model/platformProvidersWire.test.tsx`.
**Závislosti:** T1, T3. **Rozsah:** M (3 súbory).

### Checkpoint po T3–T4

- [ ] Jeden klik/Retry generuje presne jeden `GET /api/test_platform_provider?provider_id=...`; automatické udalosti negenerujú ďalšie.
- [ ] Úspech, `ok: false`, skipped aj HTTP/network chyba majú správne stavy; loading neukáže staré dáta.
- [ ] AIRFLOW detail sa počas testu skryje a po Close sa vráti; ostatné typy nemajú tlačidlo.

### T5 — Cielená regresia a vizuálne overenie

**Účel:** Overiť hotový vertikálny tok bez zásahu do ďalších funkcií.
**Zmeny:** iba potrebné doplnenie testov z T1–T4, ak odhalia medzeru; neotvárať nesúvisiace refaktory.
**Akceptácia:** testy pokrývajú šesť Airflow kontrol, všetky tri stavy, `ok: false`, error, Retry, opätovné otvorenie, izoláciu ID, žiadny auto refetch, modal lifecycle, Response Body a schému; regresia infra Providers a zobrazenie SMTP/BACKEND/KEYCLOAK prejde. Ak je app dostupná, desktop a mobilná šírka v light/dark majú čitateľný header, checklist, loading, Response Body a focus/Escape.
**Overenie:** focused Vitest a ESLint podľa príkazov nižšie; `npm run typecheck`; parse locale JSON; `git diff --check`. Kompletný suite ani produkčný build sa štandardne nespúšťajú.
**Súbory:** len už uvedené testy, ak treba. **Závislosti:** T4. **Rozsah:** S.

```powershell
npx vitest run src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx src/features/platform-administration/platform-providers/model/platformProvidersWire.test.tsx src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx src/features/providers-connectors/providers/components/ProviderConnectionTestDialog.test.tsx src/shared/components/modal/ChecklistResultDialog.test.tsx src/shared/components/modal/ConnectionTestResultDialog.test.tsx
npx eslint src/features/platform-administration/platform-providers/components/PlatformProvidersTable.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx src/features/platform-administration/platform-providers/model/platformProvidersWire.test.tsx src/features/providers-connectors/providers/components/ProvidersCatalogueTable.tsx src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx src/features/providers-connectors/providers/components/ProviderConnectionTestDialog.tsx src/features/providers-connectors/providers/components/ProviderConnectionTestDialog.test.tsx src/shared/components/button/ConnectionTestButton.tsx src/shared/components/modal/ChecklistResultDialog.tsx src/shared/components/modal/ChecklistResultDialog.test.tsx src/shared/components/modal/ConnectionTestResultDialog.tsx src/shared/components/modal/ConnectionTestResultDialog.test.tsx --max-warnings 0
npm run typecheck
node -e "for(const l of ['en','sk','cs']) JSON.parse(require('fs').readFileSync('src/locales/'+l+'.json','utf8'))"
git diff --check
```

## Riziká a okrajové scenáre

| Riziko | Opatrenie |
|---|---|
| GET vykonáva zápis a odstránenie dočasného DAG | Lokálne vypnúť retry/refetch; žiadny prefetch ani request pred klikom. Testovať počet requestov cez focus/reconnect/remount. |
| Požiadavka trvá nad 60 s | Ukazovať jediný loading až do kompletnej odpovede; nepoužiť FE timeout kratší než BE práca. Počas pending zablokovať ďalšie spustenie a Close vrátane Escape pre Airflow. Abort klienta nemusí zastaviť už bežiacu BE prácu. |
| Staré cache data alebo výsledok iného providera | Presný key s ID, reset pred otvorením/Retry, zachytený `testTarget`, skrytie dát počas `isFetching`. Overiť následné otvorenie rovnakého aj iného ID. |
| `ok: false` pri HTTP 200 | Zobraziť výsledok/šesť kontrol a Retry; nepresúvať do HTTP error vetvy. |
| `skipped` po predchádzajúcom zlyhaní | Neutrálny stav; úspechy počítať iba zo `status === 'ok'`; celkový stav zo `response.ok`; uviesť skipped osobitne v počtoch. |
| Zdieľané UI môže zmeniť infra výsledok | Tenký infra adaptér a regresné testy tlačidla/dialógu; žiadna úprava infra query politiky. |
| Výber už neexistuje po refreshi zoznamu | Test zostáva naviazaný na zachytený cieľ; po Close sa detail vráti, ak daný záznam stále existuje. Inak sa zobrazí zoznam bez cudzieho detailu. |

## Konečné akceptačné kritériá

- [ ] Funkcia je dostupná iba pre AIRFLOW s platnými credentials a zachováva HelpPopover.
- [ ] Každý explicitný test a Retry spustí nový request pre správne ID; automatické TanStack Query udalosti ho nespustia.
- [ ] Jediný modal zobrazuje loading, šesť backend kontrol, neutrálny skipped, presné počty, celkový `response.ok`, chyby, Retry a pôvodný JSON/`ProviderTestResponse`.
- [ ] Po Close sa vráti ten istý detail; počas testu nie sú dva aktívne modaly.
- [ ] EN/SK/CS a prístupnosť sú overené; infra Providers, SMTP, BACKEND, KEYCLOAK a CRUD nevykazujú regresiu.
- [ ] Focused Vitest, focused ESLint, typecheck, locale parse a `git diff --check` prechádzajú. Implementačné zmeny sa podľa `AGENTS.md` po verifikácii atomicky commitnú.

Úlohy a checkpointy sú v `tasks/platform-provider-airflow-connection-test-todo.md`.
