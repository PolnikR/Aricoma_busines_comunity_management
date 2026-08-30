# Implementation Plan: API contract hardening + VMware force refresh

## Overview

Cieľom je odstrániť zistené FE/API contract drifty bez nesúvisiaceho refactoru:

1. doplniť `cacheRefreshSeconds` do infrastructure Provider UI a zabezpečiť jeho round-trip cez GET/edit/submit,
2. doplniť `loggingEnabled` a `jwtEnabled` do BACKEND Platform Provider UI a zachovať ich nullable hodnoty pri editácii,
3. validovať úspešnú response z `POST /submit_provider`,
4. obnoviť `rollbackRecoveryGroupOrchestration(): Promise<RollbackReport>` a reálne zobraziť vrátený report,
5. zapojiť existujúci VMware `forceRefresh` transport do používateľského tlačidla Refresh bez zmeny TanStack query identity,
6. v samostatnej neskoršej BE fáze sprísniť `OrchestratorRunsResponse` a dokumentované error responses v OpenAPI.

Plán zámerne nemení generated Orval súbory ručne a nerozširuje scope o globálny discovery-cache config/history UI, access-log UI ani IBM force-refresh UI. Provider-level `cacheRefreshSeconds` a BACKEND `loggingEnabled`/`jwtEnabled` však už patria priamo do edit/create formulárov.

## Current-state findings

- `Provider` OpenAPI/generated model už obsahuje `cacheRefreshSeconds`, ale handwritten `ProviderRecord`, `ProviderSubmitData`, mapper, formulár a submit payload ho dnes nezobrazujú/nezachovávajú.
- Backend `POST /submit_provider` upsertuje celý Pydantic `Provider` payload; `cacheRefreshSeconds` validuje ako kladné celé číslo a po úspešnom upserte invaliduje cache daného providera.
- `PlatformProviderSubmitData` už vychádza z generated `OrchestrationProvider` a podporuje `cacheRefreshSeconds`, `loggingEnabled`, `jwtEnabled`. BE však discovery cache nečíta z Platform Provider storage; `cacheRefreshSeconds` preto nemá pre AIRFLOW/SMTP/BACKEND runtime cache efekt. Do Platform Provider UI sa v tomto scope pridajú iba BACKEND control flags `loggingEnabled` a `jwtEnabled`.
- `loggingEnabled` a `jwtEnabled` sú podľa BE dokumentácie iba perzistentné control flags pre BACKEND provider; `jwtEnabled` dnes ešte nezapína reálnu JWT enforcement logiku. UI nesmie tvrdiť opak.
- `submitProvider()` dnes volá generated `POST /submit_provider`, ale úspešnú `ProvidersResponse` zahodí bez validácie.
- Recovery Group API už má `parseRollbackReport()`, delete flow ho používa, ale standalone `rollbackRecoveryGroupOrchestration()` response len envelope-validuje a vracia `void`.
- Recovery Group UI už má `RecoveryGroupRollbackResultModal`; standalone rollback však používa separátny generický `RecoveryGroupRollbackSuccessModal`, takže detailný report sa stráca.
- VMware canonical wrapper už podporuje `forceRefresh -> force_refresh` v body. Query key už správne ignoruje `forceRefresh`.
- `VmwareResourcesPage` top-level Refresh dnes volá obyčajný `query.refetch()`.
- BE `OrchestratorRunsResponse` dnes deklaruje iba `provider_id` a `dag_id` s `extra="allow"`, kým FE používa aj `dag_runs`, `total_entries` a run polia `dag_run_id`, `state`, `start_date`, `end_date`, `logical_date`, `duration`.
- BE routy používajú veľa explicitných `HTTPException` stavov, ale route decorators dnes nemajú žiadne explicitné `responses={...}` kontrakty.

## Architecture decisions

### A. Provider fields: priamo editovateľné v UI

Infrastructure Provider formulár dostane nový optional numerický field `cacheRefreshSeconds`:

- `type="number"`, `min=1`, `step=1`,
- prázdna hodnota sa odošle ako `null` a znamená „použi provider-type discovery-cache default“,
- UI nebude hardcodovať text „300 s“, pretože type-level default sa dá meniť cez BE `/discovery/cache/config`,
- non-empty hodnota musí byť kladné celé číslo a rovnaká validácia bude chránená aj handwritten Zod contractom,
- field vstúpi do `isDirty`, create/edit prefillu a submit payloadu.

Platform Provider formulár dostane BACKEND-only control sekciu:

- `loggingEnabled: boolean | null`,
- `jwtEnabled: boolean | null`,
- oba ako existujúci `CheckboxField`, zobrazené iba pri `type === 'BACKEND'`,
- `null` sa vizuálne javí ako unchecked, ale kým používateľ checkbox nezmení, submit zachová `null`; interakcia nastaví explicitné `true`/`false`,
- `jwtEnabled` musí mať helper text, že ide zatiaľ o konfiguračný flag a samotné JWT enforcement na BE ešte nie je implementované.

`cacheRefreshSeconds` sa na Platform Provider formulár nepridáva: field je síce zdedený v `OrchestrationProvider` modeli, ale overený BE cache systém pracuje s discovery Providermi (`VMWARE`/`FLASHCOPY`/`IBM_POWER`) z `providers.json`, nie s AIRFLOW/SMTP/BACKEND z platform-provider storage. Zobraziť tam cache TTL by dnes bolo nefunkčné nastavenie.

### B. `POST /submit_provider`: response validovať, ale API signatúru zbytočne nemeniť

`submitProvider()` môže zostať `Promise<void>`, pretože caller výsledný provider list nepoužíva a po úspechu invaliduje query. Úspešný payload však musí prejsť existujúcim `ProvidersResponse`/`parseProviders()` kontraktom pred resolve.

### C. Recovery Group rollback: jeden reportový výsledok

Standalone rollback má používať rovnaký `RollbackReport` parser a rovnaký `RecoveryGroupRollbackResultModal` ako rollback počas delete flow.

Generický `RecoveryGroupRollbackSuccessModal` sa odstráni, ak po prepnutí na report nemá ďalšieho consumera.

### D. Overený BE discovery-cache a force-refresh kontrakt

Backend už má spoločný discovery cache systém v `discovery_cache/`:

```text
VMware / FlashSystem / IBM Power request
                |
                v
        get_or_refresh(provider)
                |
       +--------+---------+
       |                  |
 fresh cache           stale/miss
 force=false              |
       |                  v
       |              live fetch
       |                  |
       |            replace same entry
       v                  v
 cached snapshot      fresh snapshot
```

Overené vlastnosti:

- cache je **in-memory a per `provider_id`**, nie per endpoint ani per filter,
- `CacheEntry` obsahuje `data`, `fetched_at`, `ttl_seconds`,
- default TTL je 300 s pre `VMWARE`, `FLASHCOPY`, `IBM_POWER`,
- provider-level `cacheRefreshSeconds` má prednosť pred type defaultom,
- cache config je navrhnutý v `persistency/discovery_cache_config.json`; ak súbor chýba, BE použije code defaults,
- aktuálny checkout BE nemá `discovery_cache_config.json` ani provider-level overrides v `providers.json`, takže efektívne používa 300 s,
- cache sa po reštarte procesu začína prázdna; nie je persistovaná,
- jeden `threading.Lock` per provider serializuje súbežné live fetches,
- reálne fetches sa zapisujú do discovery-cache history; cache hits sa nelogujú,
- úspešný `POST /submit_provider` invaliduje cache daného providera; ďalší inventory request preto fetchne live,
- VMware `/vms/search` cachuje plný provider inventory a `folder_name`/`tag`/`name_prefix` aplikuje až nad snapshotom v pamäti; filtre preto nevytvárajú samostatné BE cache entries,
- `/tags` momentálne cez tento discovery cache nejde,
- FlashSystem volumes/tree zdieľajú rovnaký provider snapshot a IBM Power používa rovnakú cache service.

`force_refresh=true` je per-request command:

- preskočí TTL/fresh-cache return,
- stále použije rovnaký provider lock,
- vykoná live fetch,
- úspešný fetch nahradí **tú istú** provider cache entry a history dostane `triggered_by: "forced"`,
- nevzniká žiadna druhá „force“ cache.

Dôležitý failure kontrakt: ak forced live fetch zlyhá **a stará cache entry existuje**, BE zaznamená `success: false` do cache history, ale `get_or_refresh()` vráti starý snapshot. Endpoint preto môže skončiť `200` so stale dátami. HTTP chyba sa propaguje iba vtedy, keď neexistuje žiadna predchádzajúca cache entry.

Z toho pre FE vyplýva:

- canonical TanStack key ostáva `providerId + folderName + tag + debouncedNamePrefix`,
- `forceRefresh` nikdy nevstúpi do key,
- normal query `refetch()` ostáva normálnym backend-cache refetchom,
- explicitný page-header Refresh vykoná jednorazový `POST /vms/search` s aktuálnym settled search body + `force_refresh: true`,
- response sa zapíše cez `queryClient.setQueryData()` pod ten istý canonical key,
- FE nesmie zobrazovať „live refresh succeeded“ iba preto, že dostal HTTP 200; dnešný `VmsResponse` nevie rozlíšiť fresh výsledok od stale fallbacku po zlyhanom forced fetchi,
- mutation error znamená iba request/HTTP failure, nie všetky možné live-fetch failures na BE.

Pre command-like force refresh sa použije samostatná TanStack mutation, nie mutable flag schovaný v queryFn. Ak bude produkt vyžadovať explicitné rozlíšenie „live refresh succeeded / failed but stale returned“, treba pred takým UX rozšíriť BE contract (napr. response metadata alebo zmenu forced-failure semantics); to sa nemá hádať na FE.

### E. Refresh button scope

Force refresh sa zapojí do top-level `TableToolbar` Refresh tlačidla na VMware Resources/Resources ISE.

Existujúce retry akcie pri query errore ostanú na obyčajnom `refetch()`. Retry znamená „zopakuj zlyhaný query request“, zatiaľ čo explicitný Refresh znamená „vynúť live discovery“.

Ak ešte nie je dostupný VMware provider, top-level Refresh zachová dnešný provider-refetch fallback.

### F. BE OpenAPI hardening je separátny repo/commit track

BE zmeny sa nebudú miešať do FE commitu. Najprv sa sprísni backend source contract, až potom sa z neho znovu vytiahne OpenAPI a regeneruje FE Orval.

Error-contract hardening sa nebude robiť ako jeden plošný zásah do všetkých rout. Najprv sa zavedú reusable error schemas a pokryjú sa najrizikovejšie/FE-konzumované routy: Operations, Providers, Recovery Apps a Recovery Groups.

## Dependency graph

```text
FE Track

Task 1 Provider transport contract + submit response validation
   │
   └── Task 2 Provider UI exposes cacheRefreshSeconds

Task 3 BACKEND Platform Provider UI exposes loggingEnabled/jwtEnabled

                 ┌──────── Checkpoint A
                 │
Task 4 Rollback API/hook returns RollbackReport
   │
   └── Task 5 Rollback UI consumes report

                 ┌──────── Checkpoint B
                 │
Task 6 VMware hook exposes force-refresh command
   │
   └── Task 7 Page-header Refresh uses force refresh

                 └──────── Checkpoint C / FE release verification

BE Track — separate repository and commit

Task 8 Type OrchestratorRunsResponse
   │
Task 9 Shared error schemas + Operations/Providers responses
   │
Task 10 Recovery structured error responses
   │
Task 11 Export OpenAPI → regenerate/verify FE client
```

---

# Phase 1 — FE provider contract + configuration UI

## Task 1: Preserve `cacheRefreshSeconds` in Provider transport and validate submit response

**Description:** Extend the handwritten infrastructure-provider contract so the OpenAPI field `cacheRefreshSeconds` round-trips through GET/mapping/submit, and make a 2xx `POST /submit_provider` resolve only after its `ProvidersResponse` is validated. Keep `submitProvider(): Promise<void>`.

**Acceptance criteria:**
- [ ] `ProviderRecord` and `ProviderSubmitData` support `cacheRefreshSeconds?: number | null`; non-null FE submit validation accepts only positive integers.
- [ ] `mapProviderRecord()` preserves generated `cacheRefreshSeconds`, and `submitProvider()` sends it when supplied.
- [ ] `submitProvider()` validates the successful response using the existing provider response parser; malformed 2xx response rejects instead of silently succeeding.

**Verification:**
- [ ] `npm exec vitest run src/features/providers-connectors/providers/api/providersApi.test.ts src/features/providers-connectors/providers/model/providerTypes.test.ts`
- [ ] Test: valid non-null `cacheRefreshSeconds` round-trips through mapped GET and POST payload.
- [ ] Test: `{}` or another malformed 200 response from `POST /submit_provider` rejects.
- [ ] Test: 400/500 HTTP behavior remains wrapped as today.

**Dependencies:** None

**Files likely touched:**
- `src/features/providers-connectors/providers/model/providerTypes.ts`
- `src/features/providers-connectors/providers/api/schemas/providersSchema.ts`
- `src/features/providers-connectors/providers/api/providersApi.ts`
- `src/features/providers-connectors/providers/api/providersApi.test.ts`

**Estimated scope:** Medium — 4 files

## Task 2: Add `cacheRefreshSeconds` to infrastructure Provider UI

**Description:** Add an optional cache refresh interval to the existing create/edit Provider form. Blank means „use provider-type default“; a value means a provider-specific TTL override. Wire the field through form state, dirty-state detection, validation, prefill and submit.

**Acceptance criteria:**
- [ ] `ProviderCreateFormData` contains `cacheRefreshSeconds: string` so the form can represent both blank/null and a numeric value without lossy coercion.
- [ ] `ProviderCreateForm` renders `Cache refresh interval (seconds)` as `type="number"`, `min=1`, `step=1`, with helper text explaining that blank uses the provider-type default.
- [ ] Edit mode prefills an existing `cacheRefreshSeconds: 120`; create mode starts blank.
- [ ] Blank submits `cacheRefreshSeconds: null`; a valid value submits a positive integer; `0`, negative, decimal and non-numeric values are rejected before mutation.
- [ ] Changing only this field marks the modal dirty and participates in the unsaved-changes guard.
- [ ] Existing provider edit still preserves all unrelated fields.
- [ ] Add translation keys in EN/SK/CS for label, helper and validation message.

**Verification:**
- [ ] `npm exec vitest run src/features/providers-connectors/providers/components/ProviderCreateForm.test.tsx src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx`
- [ ] Test form renders/prefills the field and emits `onChange('cacheRefreshSeconds', ...)`.
- [ ] Test edit `120 -> 60` submits `60`; clearing the field submits `null`.
- [ ] Test invalid `0`, `-1`, `1.5` does not call the mutation and shows the localized validation error.
- [ ] Existing URL, VM filter, credential, port-display and create tests continue to pass.

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/providers-connectors/providers/components/ProviderCreateForm.tsx`
- `src/features/providers-connectors/providers/components/ProviderCreateForm.test.tsx`
- `src/features/providers-connectors/providers/components/ProvidersCreateModal.tsx`
- `src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx`
- `src/locales/en.json`
- `src/locales/sk.json`
- `src/locales/cs.json`

**Estimated scope:** Medium — form/modal plus three locale files

## Task 3: Add BACKEND `loggingEnabled` and `jwtEnabled` controls to Platform Provider UI

**Description:** Extend `PlatformProviderFormData` and the existing Platform Provider form with a BACKEND-only settings row. These fields are configuration/control flags, not proof that the backend feature is active. Preserve nullable values correctly across edit/submit.

**Acceptance criteria:**
- [ ] `PlatformProviderFormData` contains `loggingEnabled: boolean | null` and `jwtEnabled: boolean | null`.
- [ ] `toPlatformProviderFormData()` prefills both values from the server record and `EMPTY_PLATFORM_PROVIDER_FORM` uses `null`.
- [ ] The form renders two bordered `CheckboxField` controls only when `data.type === 'BACKEND'`; AIRFLOW and SMTP do not show them.
- [ ] Unchanged server `null` remains `null` on submit; user interaction produces explicit `true`/`false`.
- [ ] Both fields participate in dirty-state detection and submit payload creation.
- [ ] `jwtEnabled` includes localized helper/caution text that JWT enforcement itself is not yet implemented on BE.
- [ ] No `cacheRefreshSeconds` control is added to Platform Provider UI because the verified discovery cache does not consume platform-provider records.
- [ ] Add translation keys in EN/SK/CS for both labels and the JWT helper text.

**Verification:**
- [ ] `npm exec vitest run src/features/platform-administration/platform-providers/components/PlatformProviderForm.test.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersModal.test.tsx src/features/platform-administration/platform-providers/api/platformProvidersApi.test.ts`
- [ ] BACKEND form test confirms both controls are rendered and invoke `onChange` with booleans.
- [ ] AIRFLOW/SMTP form test confirms controls are absent.
- [ ] Edit regression confirms `null` remains null when untouched and explicit true/false round-trips in the mutation payload.

**Dependencies:** None

**Files likely touched:**
- `src/features/platform-administration/platform-providers/components/PlatformProviderForm.tsx`
- `src/features/platform-administration/platform-providers/components/PlatformProviderForm.test.tsx`
- `src/features/platform-administration/platform-providers/components/PlatformProvidersModal.tsx`
- `src/features/platform-administration/platform-providers/components/PlatformProvidersModal.test.tsx`
- `src/locales/en.json`
- `src/locales/sk.json`
- `src/locales/cs.json`

**Estimated scope:** Medium — form/modal plus localization/tests

## Checkpoint A — Provider contracts

- [ ] Tasks 1–3 focused tests pass.
- [ ] `npm run typecheck` passes.
- [ ] Focused ESLint on touched provider files passes with zero warnings.
- [ ] No generated file was edited manually.
- [ ] Manual diff confirms `cacheRefreshSeconds` is intentionally exposed only on discovery Provider UI and `loggingEnabled`/`jwtEnabled` only on BACKEND Platform Provider UI.

---

# Phase 2 — Recovery Group rollback report restoration

## Task 4: Return `RollbackReport` from the API and hook

**Description:** Restore the standalone rollback contract so `rollbackRecoveryGroupOrchestration()` parses and returns the backend `rollback` field instead of discarding it. Propagate that type through `useRecoveryGroups()`.

**Acceptance criteria:**
- [ ] `rollbackRecoveryGroupOrchestration()` returns `Promise<RollbackReport>` using existing `parseRollbackReport()`.
- [ ] A 200 response missing `rollback` rejects as a contract violation instead of resolving `undefined`.
- [ ] `useRecoveryGroups().rollback()` resolves with the same `RollbackReport`; list invalidation on success remains intact.

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.test.ts src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroups.test.tsx`
- [ ] Test clean report, partial-detail-compatible report, missing report, and non-2xx response.

**Dependencies:** None

**Files likely touched:**
- `src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.ts`
- `src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.test.ts`
- `src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroups.ts`
- `src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroups.test.tsx`

**Estimated scope:** Medium — 4 files

## Task 5: Display the real standalone rollback report and remove the generic success path

**Description:** Change `RecoveryGroupsTable` so standalone rollback awaits the returned report, stores it in the existing `rollbackResult` state, and opens the existing `RecoveryGroupRollbackResultModal`. Remove `RecoveryGroupRollbackSuccessModal` if it has no remaining runtime consumer.

**Acceptance criteria:**
- [ ] `onRollback` prop is typed `(groupId, providerId) => Promise<RollbackReport>`.
- [ ] Successful standalone rollback opens `RecoveryGroupRollbackResultModal` with the actual report and closes the detail/confirm state as before.
- [ ] Failed rollback opens no result modal and continues to surface via the existing mutation error path; obsolete success-only component/state is removed when unused.

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupRollbackResultModal.test.tsx`
- [ ] Replace the old `mockResolvedValue(undefined)` expectation with a representative report containing Airflow/IBM details.
- [ ] Grep confirms `RecoveryGroupRollbackSuccessModal` has no runtime reference before deleting the file.

**Dependencies:** Task 4

**Files likely touched:**
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupRollbackSuccessModal.tsx` (delete only if unused)

**Estimated scope:** Medium — 3 files

## Checkpoint B — Rollback contract

- [ ] Tasks 4–5 focused tests pass.
- [ ] `npm run typecheck` passes.
- [ ] Focused ESLint passes.
- [ ] Both delete-with-rollback and standalone rollback still render the shared report modal correctly.

---

# Phase 3 — VMware force-refresh button

## Task 6: Expose a one-shot force-refresh command from `useVmwareResourceInventory`

**Description:** Keep the existing `useQuery` and ordinary `refetch()` untouched, and add a dedicated TanStack mutation for live refresh. At button invocation snapshot the currently displayed settled `search` together with its canonical `queryKey`; the mutation calls `fetchVmwareInventory({...search, forceRefresh: true})` and on success writes the response via `queryClient.setQueryData(snapshotQueryKey, data)`. This prevents a provider/filter switch during an in-flight live request from writing into the wrong cache entry.

**Acceptance criteria:**
- [ ] Force refresh sends the same `providerId`, `folderName`, `tag` and settled/debounced `namePrefix` as the displayed query plus `force_refresh: true`.
- [ ] Every resolved force-refresh response replaces data under the existing canonical key; it creates no second query key and does not trigger a redundant follow-up refetch.
- [ ] Request/HTTP failure preserves previous cached data and exposes a separate mutation error/pending state; ordinary `refetch()` still sends no `force_refresh`.
- [ ] The hook does not claim that HTTP 200 proves a successful live backend fetch, because BE can return stale fallback data after a failed forced fetch.
- [ ] Pending/error state is associated with the search/key snapshot used by that force-refresh invocation, so an old provider/filter failure is not shown as an error for a newly selected query.

**Suggested hook surface:**

```ts
{
  ...query,
  forceRefresh,
  isForceRefreshing,
  forceRefreshError,
  // existing isDebouncing/isInitialLoading/... remain
}
```

The exact function name may follow current project conventions, but there must be only one command path for VMware live refresh.

**Verification:**
- [ ] `npm exec vitest run src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx src/features/discovery-inventory/resources/api/resourceInventoryQueryKeys.test.ts src/features/discovery-inventory/resources/api/resourceInventoryApi.test.ts`
- [ ] Test current tag + debounced prefix + provider are copied into force-refresh request.
- [ ] Test query cache contains/updates the same key before and after force refresh.
- [ ] Test rejected request leaves previous cached VM list visible.
- [ ] Test a resolved 200 response is accepted as inventory data without manufacturing a false „live refresh succeeded“ status.
- [ ] Test switching provider/filter while force refresh is in flight writes the result only to the original snapshotted key and does not leak the old mutation error into the new query view.
- [ ] Test normal `refetch()` still omits `force_refresh`.

**Dependencies:** Existing canonical VMware `/vms/search` migration

**Files likely touched:**
- `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.ts`
- `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx`

**Estimated scope:** Small — 2 files

## Task 7: Wire page-header Refresh to live VMware force refresh

**Description:** Use the new hook command in the shared `VmwareResourcesPage`, which automatically covers both Resources source and Resources ISE target roles. Keep error retry buttons on normal query `refetch()` and keep provider-load fallback behavior.

**Acceptance criteria:**
- [ ] When a VMware provider is active, top `TableToolbar` Refresh invokes force refresh, not ordinary `refetch()`.
- [ ] Header updating state includes `isForceRefreshing`; current inventory remains rendered while the live request is running.
- [ ] Request/HTTP failure can be surfaced without discarding cached data; existing query retry paths remain ordinary refetches. If no provider is available yet, Refresh still retries provider loading as today.
- [ ] Do not add a success toast/message that claims live discovery succeeded based solely on HTTP 200 while BE retains stale-on-failure fallback semantics.

**Verification:**
- [ ] `npm exec vitest run src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx src/features/discovery-inventory/resources-ise/pages/ResourcesIsePage.test.tsx`
- [ ] Add a page test proving the top Refresh calls the force command and not normal `refetch`.
- [ ] Add/retain test proving retry after an inventory query error still calls normal `refetch`.
- [ ] Confirm shared page means both source and target roles inherit the same implementation without duplicated API logic.

**Dependencies:** Task 6

**Files likely touched:**
- `src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.tsx`
- `src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx`

**Estimated scope:** Small — 2 files

## Checkpoint C — FE complete

Run after Tasks 1–7:

- [ ] All focused tests listed above pass.
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run api:check`
- [ ] `npm run build`
- [ ] Grep confirms no manual/generated contract fork was introduced.
- [ ] Review final diff and exclude unrelated pre-existing dirty files.
- [ ] Create one verified FE atomic commit only after all required checks pass.

---

# Phase 4 — Long-term BE OpenAPI hardening (separate repository / separate commit)

This phase targets workspace/repository `abco-be` and must not be bundled into the FE commit above.

## Task 8: Type the Airflow DAG-run response used by the frontend

**Description:** Replace the effectively opaque `OrchestratorRunsResponse` with a typed minimum contract for the fields this API promises to the frontend while retaining `extra="allow"` for Airflow forward compatibility.

**Target contract:**

```text
OrchestratorRunsResponse
  provider_id: string
  dag_id: string
  dag_runs: AirflowDagRunRecord[]
  total_entries: int

AirflowDagRunRecord
  dag_run_id: string
  state: string | null
  start_date: string | null
  end_date: string | null
  logical_date: string | null
  duration: number | null
  extra fields allowed
```

Use raw JSON-compatible string timestamps so the proxy does not transform Airflow values merely for documentation.

**Acceptance criteria:**
- [ ] Generated OpenAPI explicitly contains `dag_runs`, `total_entries` and all six run fields consumed by FE.
- [ ] Unknown additional Airflow fields remain allowed/preserved.
- [ ] A malformed upstream response missing required envelope/list information is caught by FastAPI response validation instead of being silently advertised as valid.

**Verification:**
- [ ] Extend `apache_airflow.client` self-check or a focused API contract self-check with a representative DAG-run payload.
- [ ] `python -m apache_airflow.client`
- [ ] `python -c "from api.main import app; s=app.openapi(); assert ..."` or a dedicated assert-based OpenAPI self-check.
- [ ] Manual `/docs` inspection confirms the 200 schema is no longer only `provider_id`/`dag_id`.

**Dependencies:** None

**Files likely touched:**
- `api/schemas.py`
- `api/routers/operations.py` only if wiring/description needs adjustment
- `apache_airflow/client.py` self-check
- `api/_test_openapi_contract.py` (preferred new assert-based contract self-check)

**Estimated scope:** Medium — 3–4 files

## Task 9: Add reusable simple error response schemas and document Operations/Providers errors

**Description:** Introduce reusable OpenAPI error models for the dominant `{ "detail": "..." }` response shape and explicitly declare semantic statuses on the high-value Operations and Providers routes. Do not change runtime exception behavior in this task.

**Acceptance criteria:**
- [ ] OpenAPI has a reusable typed simple-detail error schema.
- [ ] `/get_orchestrator_runs` documents its actual 400 and 502 failures plus auth 401/403; `/submit_provider`, `/get_providers`, `/test_provider`, `/delete_provider` document the semantic statuses they actually raise.
- [ ] Existing runtime status codes and bodies remain unchanged; this is contract/documentation hardening, not error-policy redesign.

**Verification:**
- [ ] Dedicated OpenAPI self-check asserts expected status keys and `$ref` schemas under the affected paths.
- [ ] `python -c "import api.main"`
- [ ] Existing provider/Airflow self-checks remain green.

**Dependencies:** Task 8 only if sharing the same OpenAPI contract self-check file; otherwise independent

**Files likely touched:**
- `api/schemas.py`
- `api/routers/operations.py`
- `api/routers/providers.py`
- `api/_test_openapi_contract.py`

**Estimated scope:** Medium — 4 files

## Task 10: Document structured Recovery App/Recovery Group rollback errors

**Description:** Add a typed 502 error shape for rollback failures where backend currently returns `detail: { rollback: RollbackReport }`, and document the real 400/401/403/404/409/500/502 responses on the Recovery App/Group routes consumed by FE. Keep simple 502 push failures separate from structured delete/rollback 502 responses.

**Acceptance criteria:**
- [ ] OpenAPI distinguishes simple-detail errors from structured rollback-report errors.
- [ ] `DELETE /delete_recovery_group` and `DELETE /delete_recovery_app` expose structured rollback 502 bodies matching runtime behavior.
- [ ] Recovery submit/rollback/delete routes document their actual semantic error statuses without changing runtime behavior.

**Verification:**
- [ ] Extend the OpenAPI contract self-check for Recovery Apps/Groups.
- [ ] Run existing recovery-group router self-checks.
- [ ] Manually inspect `/docs` for a structured 502 example/schema.

**Dependencies:** Task 9 shared error-model foundation

**Files likely touched:**
- `api/schemas.py`
- `api/routers/recovery_groups.py`
- `api/routers/recovery_apps.py`
- `api/_test_openapi_contract.py`

**Estimated scope:** Medium — 4 files

## Task 11: Regenerate FE contract from hardened BE OpenAPI

**Description:** After the BE contract is merged/exported, update the checked-in FE OpenAPI artifact and regenerate Orval. Do not manually edit generated files. Verify that Recovery Runs now compile against the stronger generated response model and that error-contract additions do not regress the mutator.

**Acceptance criteria:**
- [ ] `openapi/abco-api.json` is pulled/exported from the updated BE source, not manually widened.
- [ ] `src/generated/api/**` is regenerated deterministically and `OrchestratorRunsResponse` contains the new typed fields.
- [ ] Existing `mapOrchestratorRuns()` behavior/tests remain correct; simplify it only if the generated type makes a change clearly beneficial, not merely because regeneration touched the model.

**Verification:**
- [ ] `npm run api:update` or the repository-approved pull/generate sequence.
- [ ] `npm run api:check`
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-runs/helpers/mapOrchestratorRuns.test.ts src/features/recovery-plans/recovery-runs/hooks/useLatestOrchestratorRun.test.tsx src/features/recovery-plans/recovery-runs/hooks/useOrchestratedEntityRuns.test.tsx`
- [ ] `npm run typecheck`
- [ ] `npm run build`

**Dependencies:** BE Tasks 8–10

**Files likely touched:**
- `openapi/abco-api.json`
- generated Orval files
- Recovery Runs mapper/tests only if stronger generated types require a real handwritten adjustment

**Estimated scope:** Medium — generated diff can be broad, handwritten scope should stay small

---

# Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Provider cache TTL is cleared or coerced incorrectly in the form | High | Represent it as a string in form state; blank -> null, valid integer -> number; regression-test prefill/clear/edit |
| Platform nullable flags lose `null` and become false merely by opening/editing | Medium | Keep `boolean | null` in form state; visual unchecked does not itself mutate null |
| `cacheRefreshSeconds` is exposed on Platform Providers even though BE never uses it there | High | Do not render that control in Platform Provider UI; document the generated-model inheritance mismatch |
| UI implies `jwtEnabled` actually enables JWT security | High | Show explicit helper/caution that it is currently only a persisted control flag |
| `POST /submit_provider` tests keep accepting invalid `{}` success payloads | Medium | Replace success fixtures with valid `ProvidersResponse` and add malformed-2xx test |
| Standalone rollback loses partial IBM/Airflow details | High | Return and parse `RollbackReport`; reuse existing report modal |
| Force refresh creates a second cache identity | High | Mutation uses existing canonical key; `forceRefresh` stays outside key |
| Force-refresh request failure replaces last-known-good FE data | High | Only write TanStack cache on resolved response; rejected request leaves previous data intact |
| BE forced live fetch fails but returns stale snapshot with HTTP 200 | High | Do not infer live success on FE; document current degrade-to-stale contract and require BE metadata/semantic change before explicit success/failure UX |
| Force refresh is accidentally used by all Retry buttons | Medium | Wire only page-header Refresh; retain query `refetch()` for error retry |
| BE Airflow response becomes too rigid against new Airflow fields | Medium | Type only guaranteed/FE-used fields and retain `extra="allow"` |
| Error-response hardening grows into a whole-API rewrite | High | Start with reusable models + Operations/Providers/Recovery routes; expand separately later |
| Cross-repo changes become one unreviewable commit | High | Separate FE and BE execution sessions/commits; regenerate FE only after BE contract is finalized |

# Explicit non-goals

- No global cache-default/history configuration UI in this plan; only provider-level `cacheRefreshSeconds`.
- No `cacheRefreshSeconds` control on Platform Providers until BE gives that field runtime semantics there.
- No IBM Power/FlashSystem force-refresh button wiring in this plan.
- No discovery-cache config/history UI.
- No access-log UI.
- No manual edits to `src/generated/**`.
- No blanket annotation of every backend `HTTPException` in one task.
- No change to global TanStack cache policy unless a separate requirement approves it.

# Final review gate

Before execution starts, confirm:

- every task has an independently testable outcome,
- FE and BE work stay in separate repository sessions,
- existing unrelated dirty files are excluded,
- force refresh means the top VMware Refresh action only,
- provider configuration fields are exposed only where BE semantics are real: `cacheRefreshSeconds` on discovery Providers and `loggingEnabled`/`jwtEnabled` on BACKEND Platform Provider,
- BE source remains the authority for OpenAPI and FE generated code remains derived output.
