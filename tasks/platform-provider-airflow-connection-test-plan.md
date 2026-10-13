# Implementačný plán: Test pripojenia AIRFLOW Platform Providera

## Rozsah a overený stav (13. 10. 2026)

Tento dokument plánuje iba FE zmenu. Produkčný kód, backend, OpenAPI a generované súbory sa v tejto fáze nemenia. Pracovný strom bol pri analýze podľa `git status --porcelain=v1` čistý; pri implementácii treba stav znovu skontrolovať a zachovať prípadné cudzie zmeny.

- `ProvidersCatalogueTable.tsx` má inline `Button` s `PlugIcon`, kontrolu `credentialStatus === 'ok'`, `useTestProvider`, reset query pri otvorení/Retry a počas testu odoberá `DetailView` z DOM. `ProviderConnectionTestDialog.tsx` počíta úspešné kontroly, odlišuje výsledok `ok: false` od request chyby, používa `ChecklistResultDialog` a `ProviderTestResponse` v `ResponseBodyViewer`.
- `PlatformProvidersPage.tsx` načítava zoznam; `PlatformProvidersTable.tsx` drží výber a detail, pre AIRFLOW zobrazuje credentials, no `headerActions` obsahuje len `KeyedHelpPopover`. `selectPlatformProviders.ts` dopĺňa chýbajúci `credentialStatus` hodnotou `none`; typ AIRFLOW je v `platformProviderTypes.ts`.
- `ChecklistResultDialog.tsx` zobrazuje všetky ne-`ok` kontroly ako chybu. Pri requeste bez výsledku status bar nevykresľuje, ale text počítadla je teraz natvrdo anglický. `Modal` spracúva Escape aj počas `isPending`, hoci Close (`disabled={isPending}`) a backdrop (`closeOnBackdrop={!isPending}`) sú blokované. **Overené aj pre existujúcich Infrastructure Providers:** počas testu sa nedá použiť Close/backdrop, hoci Escape funguje. Oprava má dovoliť zatvorenie počas pending pre oba typy.
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

1. **Tlačidlo:** vybrať existujúcu inline konfiguráciu do tenkého `shared/components/button/ConnectionTestButton.tsx`. Komponent iba vykreslí `Button`, ikonu, spoločné triedy, preklad a dôvod disabled stavu. O tom, či má byť tlačidlo viditeľné/povolené, rozhodnú samostatne oba tabuľkové komponenty. Infra tabuľka použije nový komponent so zachovaním existujúcej API/query politiky; výnimkou je nutný guard proti druhému testu po Close -> reopen počas pending.
2. **Dialóg:** z existujúceho `ProviderConnectionTestDialog` vyňať spoločnú prezentáciu výsledku, loadingu, chýb a Retry do `shared/components/modal/ConnectionTestResultDialog.tsx`, ktorý ďalej používa `ChecklistResultDialog`. Existujúci infra komponent zostane tenkým adaptérom pre jeho typ/rolu; platform tabuľka použije spoločný dialóg s badge `AIRFLOW` a bez roly. Tým nevznikne import jednej feature z druhej ani duplicitný checklist či modal. `response.ok` riadi celkový stav, počítadlo ráta iba `ok`, Response Body má schému `ProviderTestResponse`.
3. **`skipped` a regresia:** spoločný checklist dostane neutrálnu ikonu/farbu/text výhradne pre `skipped`. Ostatné ne-`ok` stavy vrátane infra `timeout` a neznámych stavov musia zostať chybové. Rozšíriť status bar o voliteľný počet skipped, napr. lokalizované „2 / 6 úspešných · 3 preskočené“, aby bolo jasné, že menovateľ zahŕňa všetky kontroly. Bez skipped zostane infra výstup významovo rovnaký. V EN/SK/CS použiť existujúce preklady pre tlačidlo, loading, chybu, Close/Retry, Response Body a počítadlo; doplniť iba text skipped počtu a stavu. Názvy a detaily kontrol sú pôvodný backend obsah.
4. **Request lifecycle:** platform tabuľka drží `testTarget` zachytený pri kliknutí, aby ďalší výber/zmena zoznamu nezmiešala ID, meno a výsledok. Test sa spúšťa iba po explicitnom kliknutí na AIRFLOW s `credentialStatus === 'ok'`. **Stav otvorenia dialógu oddeľ od stavu prebiehajúceho testu**, aby Close/odmontovanie UI nespôsobilo abort/reset a nepreplo aktívny pokus do nového behu; overiť správanie TanStack Query a `AbortSignal`. Lokálne nastaviť `retry: false`, `retryOnMount: false`, `refetchOnWindowFocus: false`, `refetchOnReconnect: false`, `refetchOnMount: false`, `staleTime: Infinity` a bez polling intervalu. Presný query key resetovať iba pred **novým explicitným behom**, keď už predchádzajúci request toho istého providera nebeží; Retry až po jeho ukončení/chybe. Overiť, či `resetQueries` na aktívnom observeri sám iniciuje fetch: výsledkom musí byť práve jeden request na jednu akciu. **Close počas pending nesmie volať reset/cancel/refetch. Reopen počas pending zobrazí pôvodný rozbehnutý test bez ďalšieho GET; až po jeho dokončení možno vedome spustiť nový.** Pri `isPending || isFetching` skryť predchádzajúce data/error, zobraziť loading a blokovať ďalší Retry. Detail sa nemountuje iba počas **viditeľného** testovacieho dialógu; po Close sa namountuje aj pri rozbehnutom requeste a zostáva vybrané pôvodné ID. **Počas pending povoľ Close, Escape a štandardné zatvorenie kliknutím na backdrop pre AIRFLOW aj infra Providers.** Je to skrytie dialógu, nie zrušenie backend testu (HTTP abort ani cancel BE prácu negarantuje). Pri Close sa vráti pôvodný `DetailView`; neskoré dokončenie nesmie otvoriť okno alebo meniť výber. Vo `ProvidersCatalogueTable` doplniť guard pre Close -> reopen počas stále bežiaceho `useTestProvider`, aby pôvodný `openConnectionTest` nevykonal druhý `resetQueries`. Pri oboch modal cykloch zabezpečiť focus na nový živý trigger Test connection až po namountovaní detailu (`Modal` si inak pamätá odmontovaný opener).

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
**Akceptácia:** skipped nie je červený ani započítaný medzi úspechy; `failed`, infra `timeout` a všetky neznáme ne-`ok` stavy zostávajú chybové; status bar ostáva skrytý počas loadingu; infra bez skipped je významovo nezmenené.
**Testy:** `ChecklistResultDialog.test.tsx`: `ok`, `failed`, `skipped`, infra `timeout` a neznámy stav, počty, prístupný text, EN/SK/CS; focused Vitest a ESLint.
**Súbory:** `src/shared/components/modal/ChecklistResultDialog.tsx`, `.test.tsx`, `src/locales/en.json`, `sk.json`, `cs.json`.
**Závislosti:** žiadne. **Rozsah:** M (5 súborov).

### Checkpoint po T1–T2

- [ ] Focused testy pre infra tlačidlo a checklist prechádzajú.
- [ ] Všetky tri locale JSON sú platné; žiadny nový text nie je natvrdo v UI.
- [ ] `git diff --check` bez chýb; žiadna zmena generovaných súborov.

### T3 — Spoločný výsledkový dialóg

**Účel:** Zdieľať existujúci modal, loading, mapovanie odpovede, chyby, badge, Retry a Response Body bez cross-feature importu.
**Zmeny:** vytvoriť `ConnectionTestResultDialog.tsx` nad `ChecklistResultDialog`; zmeniť `ProviderConnectionTestDialog.tsx` na infra adaptér pre `providerTypeLabel` a rolu. Spoločný komponent prijíma názov, ID, typový badge, prípadný ďalší badge, výsledok, error, pending a handlery. Typový badge AIRFLOW zostáva viditeľný aj počas loadingu; rola sa pre platform vôbec neposiela. V shared `ChecklistResultDialog` odblokovať Close a backdrop počas `isPending` pre **oba** typy providerov; Escape už volá `onClose` a musí zostať funkčný. Retry počas pending zostáva neprístupné.
**Akceptácia:** infra ukazuje pôvodné údaje a rolu; platform konfigurácia vie ukázať AIRFLOW bez Source/Target; HTTP 200 `ok: false` zobrazí checklist a Retry; HTTP chyba použije `resolveUserFacingErrorMessage`; Response Body je pôvodný JSON so schémou `ProviderTestResponse`.
**Testy:** `ProviderConnectionTestDialog.test.tsx` pre infra regresiu vrátane prepísania existujúcej asercie `Close` disabled a otestovania Close/Escape/backdrop počas pending; nový `ConnectionTestResultDialog.test.tsx` pre loading, HTTP error, `ok: false`, skipped, Response Body a variant bez roly. `ChecklistResultDialog.test.tsx` overí pending Close/backdrop.
**Súbory:** nový `src/shared/components/modal/ConnectionTestResultDialog.tsx` a `.test.tsx`; úpravy `src/features/providers-connectors/providers/components/ProviderConnectionTestDialog.tsx` a `.test.tsx`.
**Závislosti:** T2. **Rozsah:** M (4 súbory).

### T4 — AIRFLOW akcia, query a modal lifecycle

**Účel:** Jediný explicitný klik = jeden čerstvý backend test s izolovaným výsledkom.
**Zmeny:** v `PlatformProvidersTable.tsx` zobraziť shared tlačidlo iba pri AIRFLOW vedľa existujúceho HelpPopover. Pridať `testTarget` a `useTestPlatformProvider`, presný `getTestPlatformProviderQueryKey` reset iba pred novým explicitným behom po ukončení starého, lokálne query nastavenia uvedené vyššie, guard pre credentials/pending/opätovné otvorenie bez duplicitného requestu, skrytie `DetailView` a `ConnectionTestResultDialog` s badge AIRFLOW. Zoznam, CRUD a iné typy nemeniť.
**Akceptácia:** pred klikom nula test requestov; chýbajúce credentials blokujú akciu s rovnakým dôvodom; `provider_id` zodpovedá vybranému AIRFLOW; pri loadingu nie je starý checklist/JSON ani `0 / 0`; Retry a nové otvorenie **po dokončení** vytvoria nový request; opätovné otvorenie **počas pending** len zobrazí rozbehnutý stav bez nového requestu; focus/reconnect/remount nevytvoria nový test; detail a testovací modal nie sú súčasne aktívne; Close vráti pôvodný detail.
**Testy:** `PlatformProvidersTable.test.tsx` dnes mockuje iba `useDeletePlatformProvider` a **nepoužíva `QueryClientProvider`**. Doplniť izolovaný reálny QueryClient wrapper a čiastočný mock (`vi.importActual`) alebo explicitné potrebné exporty, aby `useTestPlatformProvider` a `useQueryClient` fungovali; zachovať CRUD testy. Testovať long pending (>60 s bez rýchleho FE timeoutu), Close/Escape/backdrop, re-open počas pending bez duplicity, neskorý výsledok po Close, explicitne nový beh po skončení, návrat focusu a zmenu výberu/zoznamu. V `ProvidersCatalogueTable.test.tsx` preveriť ten istý Close -> reopen guard pre infra. `platformProvidersWire.test.tsx` overí metódu, URL s `provider_id`, príslušnú auth cestu (Bearer alebo dev X-User) a validovaný response.
**Súbory:** `src/features/platform-administration/platform-providers/components/PlatformProvidersTable.tsx`, `.test.tsx`, `src/features/platform-administration/platform-providers/model/platformProvidersWire.test.tsx`, `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.tsx`, `.test.tsx` (guard na infra pending reopen).
**Závislosti:** T1, T3. **Rozsah:** M (5 súborov vrátane nutnej infra úpravy).

### Checkpoint po T3–T4

- [ ] Každý explicitne spustený **nový** beh/Retry po skončení generuje práve jeden `GET /api/test_platform_provider?provider_id=...`; reopen počas pending a automatické udalosti negenerujú ďalšie.
- [ ] Úspech, `ok: false`, skipped aj HTTP/network chyba majú správne stavy; loading neukáže staré dáta.
- [ ] AIRFLOW detail sa skryje iba počas otvoreného test dialógu; AIRFLOW aj infra sa dajú zavrieť počas pending a vrátia detail/focus; reopen bežiaceho testu bez nového requestu, oneskorený výsledok nikdy sám neotvorí modal. Ostatné platform typy nemajú tlačidlo.

### T5 — Cielená regresia a vizuálne overenie

**Účel:** Overiť hotový vertikálny tok bez zásahu do ďalších funkcií.
**Zmeny:** iba potrebné doplnenie testov z T1–T4, ak odhalia medzeru; neotvárať nesúvisiace refaktory.
**Akceptácia:** testy pokrývajú šesť Airflow kontrol, všetky tri Airflow stavy a infra `timeout`/neznáme stavy, Close/Escape/backdrop počas pending pre oba typy, reopen bez duplicity a dokončenie po skrytí UI, znovunadobudnutie focusu na nový živý prvok detailu, `ok: false`, error, Retry, opätovné otvorenie, izoláciu ID, žiadny auto refetch, modal lifecycle, Response Body a schému; regresia infra Providers a zobrazenie SMTP/BACKEND/KEYCLOAK prejde. Ak je app dostupná, desktop a mobilná šírka v light/dark majú čitateľný header, checklist, loading, Response Body a focus/Escape.
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
| Požiadavka trvá nad 60 s / dialóg visí | Ukazovať loading do kompletnej odpovede, bez FE timeoutu kratšieho než BE práca; počas pending zablokovať duplicitný nový test, **nie** Close/Escape/backdrop (platí pre infra aj AIRFLOW). Close skryje UI, neresetuje/refetchuje query, neznamená zrušenie BE operácie; HTTP abort nemusí BE zastaviť. Reopen počas pending nesmie vytvoriť druhý request. |
| Staré cache data alebo výsledok iného providera | Presný key s ID, reset iba pred novým explicitným behom (nikdy nie pri reopen prebiehajúceho), zachytený `testTarget`, skrytie dát počas `isFetching`. Overiť neskorú odpoveď po Close, následný nový beh rovnakého aj iného ID. |
| `ok: false` pri HTTP 200 | Zobraziť výsledok/šesť kontrol a Retry; nepresúvať do HTTP error vetvy. |
| `skipped` po predchádzajúcom zlyhaní | Neutrálny stav; úspechy počítať iba zo `status === 'ok'`; celkový stav zo `response.ok`; uviesť skipped osobitne v počtoch. |
| Zdieľané UI môže zmeniť infra výsledok | Tenký infra adaptér a regresné testy tlačidla/dialógu; infra API a bežná query politika zostávajú, iba doplniť guard proti duplikovaniu bežiaceho testu pri reopen a povoliť Close. `timeout` a neznáme ne-`ok` stavy zostávajú chybové. |
| Výber už neexistuje po refreshi zoznamu | Test zostáva naviazaný na zachytený cieľ; po Close sa detail vráti, ak daný záznam stále existuje. Inak sa zobrazí zoznam bez cudzieho detailu. Neskorá odpoveď nikdy neprepne selection. |
| Focus po návrate z test modal | `Modal` uchováva openerRef, ktorý sa odmontovaním `DetailView` stratí. Po Close nastaviť focus až na novozobrazený Test connection trigger alebo predvídateľný prvok detailu; testovať `document.activeElement`. |
| Existujúci test wrapper | `PlatformProvidersTable.test.tsx` nemá `QueryClientProvider` a mockuje len jeden generovaný export. Doplniť izolovaný QueryClient a zachovať reálne/mocked potrebné exporty, preveriť CRUD regresiu. |

## Konečné akceptačné kritériá

- [ ] Funkcia je dostupná iba pre AIRFLOW s platnými credentials a zachováva HelpPopover.
- [ ] Každý explicitný **nový** test/Retry po skončení predchádzajúceho spustí jeden request pre správne ID; reopen nedokončeného behu a automatické TanStack Query udalosti ho nespustia.
- [ ] Jediný modal zobrazuje loading, šesť backend kontrol, neutrálny skipped, presné počty, celkový `response.ok`, chyby, Retry a pôvodný JSON/`ProviderTestResponse`.
- [ ] Close/Escape/backdrop fungujú aj pri pending pre AIRFLOW aj infra Providers; vráti sa detail a živý focus target, nikdy nie sú dva aktívne modaly. Close nepredstiera zrušenie BE; reopen bežiaceho pokusu bez duplikátu, oneskorený výsledok nesmie znovu otvoriť dialóg.
- [ ] EN/SK/CS a prístupnosť sú overené; infra `timeout`/neznáme ne-`ok` stavy zostávajú chybové; infra Providers, SMTP, BACKEND, KEYCLOAK a CRUD nevykazujú regresiu.
- [ ] Focused Vitest, focused ESLint, typecheck, locale parse a `git diff --check` prechádzajú. Implementačné zmeny sa podľa `AGENTS.md` po verifikácii atomicky commitnú.

Úlohy a checkpointy sú v `tasks/platform-provider-airflow-connection-test-todo.md`.
