# Implementačný plán: Discovery Cache API vrstva pripravená pre UI

## Cieľ

Zapracovať existujúce backendové **Discovery Cache** endpointy do frontendovej aplikačnej vrstvy tak, aby budúce UI nemuselo poznať generated Orval funkcie, snake_case backend modely ani TanStack cache detaily.

Po dokončení má mať UI k dispozícii tri jednoduché vstupy:

```ts
useDiscoveryCacheConfig()
useUpdateDiscoveryCacheConfig()
useDiscoveryCacheHistory(filters)
```

Tento task **neprepája existujúci mock Discovery Settings UI na backend**. Pripraví stabilnú API, model a query vrstvu, na ktorú sa UI napojí v ďalšom kroku.

Backend sa nemení.

---

## Overený súčasný stav

Backend/OpenAPI už poskytuje:

```text
GET /discovery/cache/config
PUT /discovery/cache/config
GET /discovery/cache/history
```

Generated Orval klient už obsahuje:

```ts
getCacheConfigDiscoveryCacheConfigGet()
updateCacheConfigDiscoveryCacheConfigPut(...)
getCacheHistoryDiscoveryCacheHistoryGet(...)
```

Generated Zod schémy už obsahujú:

- `CacheConfigResponse`
- `CacheConfigUpdate`
- `CacheHistoryResponse`
- `CacheRunRecord`
- `GetCacheHistoryDiscoveryCacheHistoryGetQueryParams`

V handwritten FE kóde sa však tieto endpointy dnes nepoužívajú.

Existujúca `DiscoverySettingsPage` je frontend-only mock. Obsahuje schedule/frequency/timezone/notifications, ale backend Discovery Cache API tieto nastavenia neposkytuje. Z backendového kontraktu je dnes reálne dostupné iba:

```text
Cache config
├── defaults
│   ├── VMWARE      -> TTL v sekundách
│   ├── FLASHCOPY   -> TTL v sekundách
│   └── IBM_POWER   -> TTL v sekundách
└── history_retention
    ├── retention_days
    └── max_records

Cache history
└── runs[]
```

Backend potvrdzuje, že každý TTL/default, `retention_days` aj `max_records` musí byť kladné celé číslo.

GET config/history vyžaduje `VIEW_DIAGNOSTICS`; PUT config vyžaduje `MANAGE_PLATFORM_CONFIGURATION`. FE API vrstva nebude robiť vlastný RBAC bypass ani permission guessing — 401/403 zostane štandardnou API chybou.

---

## Architektonické rozhodnutie

### 1. Generated klient zostáva transportná vrstva

UI ani hooky nebudú importovať generated operácie priamo.

```text
UI
 ↓
TanStack hooks
 ↓
handwritten discoveryCacheApi
 ↓
generated Orval client
 ↓
orvalMutator / apiFetch
 ↓
Backend
```

Generated súbory sa ručne neupravujú.

### 2. Odpovede sa validujú na API hranici

Každá úspešná backend response prejde cez existujúci:

```ts
parseGeneratedResponse(...)
```

Použijú sa generated Zod response schémy. Neplatný `200 OK` payload teda nebude prenesený do UI ako dôveryhodné dáta.

### 3. UI dostane frontendové camelCase modely

Backendové snake_case názvy sa nebudú šíriť do komponentov.

Navrhovaný frontendový kontrakt:

```ts
export interface DiscoveryCacheConfig {
  defaults: Record<string, number>
  historyRetention: {
    retentionDays: number
    maxRecords: number
  }
}

export interface DiscoveryCacheConfigPatch {
  defaults?: Record<string, number>
  historyRetention?: {
    retentionDays?: number
    maxRecords?: number
  }
}

export interface DiscoveryCacheHistoryFilters {
  providerId?: string
  limit?: number
}

export type DiscoveryCacheRunTrigger =
  | 'stale'
  | 'forced'
  | 'param_change'

export interface DiscoveryCacheRun {
  providerId: string
  providerType: string
  triggeredBy: DiscoveryCacheRunTrigger
  startedAt: string
  durationMs: number
  success: boolean
  recordCount?: number | null
  error?: string | null
}

export interface DiscoveryCacheHistory {
  runs: DiscoveryCacheRun[]
}
```

`startedAt` zostáva string. API vrstva nebude konvertovať timestamp na `Date`, aby nepridávala timezone interpretáciu. Formátovanie patrí až UI vrstve.

### 4. `defaults` sa nesmie zúžiť iba na tri dnešné kľúče

Backend dnes používa:

```text
VMWARE
FLASHCOPY
IBM_POWER
```

Frontend však zachová:

```ts
Record<string, number>
```

Dôvod: ak backend neskôr pridá ďalší provider type, API vrstva ho nesmie zahodiť ani vyžadovať nový FE release iba preto, aby response prešla mapperom.

Budúce UI môže renderovať `Object.entries(config.defaults)` alebo si zobraziť iba podporované typy, ale transportná/domain vrstva zachová celý kontrakt.

### 5. Update používa skutočný partial patch

UI nebude musieť posielať celý config pri každej zmene.

Napríklad:

```ts
updateDiscoveryCacheConfig({
  defaults: {
    VMWARE: 120,
  },
})
```

sa namapuje na:

```json
{
  "defaults": {
    "VMWARE": 120
  }
}
```

A napríklad:

```ts
updateDiscoveryCacheConfig({
  historyRetention: {
    retentionDays: 60,
  },
})
```

na:

```json
{
  "history_retention": {
    "retention_days": 60
  }
}
```

Frontend nebude používať `null` ako spôsob mazania hodnoty, pretože backend pri update `None/null` vylučuje z patchu. Nezadané pole znamená „nemeniť“.

### 6. Request validácia bude zodpovedať reálnemu BE pravidlu

Feature-owned request schema preverí pred requestom:

- TTL default: positive integer,
- `retentionDays`: positive integer,
- `maxRecords`: positive integer,
- history `limit`, ak ho UI poskytne: positive integer.

Tým sa do backendu neposielajú hodnoty, o ktorých už FE vie, že ich backend odmietne alebo nemajú zmysel ako limit.

### 7. Discovery Cache má vlastné TanStack query keys

Navrhovaný key factory:

```ts
export const discoveryCacheKeys = {
  all: ['discovery-cache'] as const,
  config: () => [...discoveryCacheKeys.all, 'config'] as const,
  history: (filters: DiscoveryCacheHistoryFilters = {}) => [
    ...discoveryCacheKeys.all,
    'history',
    filters.providerId ?? null,
    filters.limit ?? null,
  ] as const,
}
```

Config a history sa teda nikdy nezmiešajú s inventory/provider query cache.

### 8. PUT response aktualizuje config cache priamo

Backend `PUT /discovery/cache/config` vracia celý nový `CacheConfigResponse`.

Preto mutation po úspechu použije:

```ts
queryClient.setQueryData(
  discoveryCacheKeys.config(),
  returnedConfig,
)
```

Nebude po úspechu robiť zbytočný druhý GET.

### 9. Zmena BE cache configu nemení FE inventory cache politiku

Toto je zámerné.

`useUpdateDiscoveryCacheConfig()` nebude invalidovať:

- VMware inventory query,
- FlashSystem inventory query,
- IBM Power inventory query.

Backend si pri zmene TTL invaliduje relevantnú vlastnú provider cache. FE TanStack cache zostáva samostatná vrstva a pokračuje podľa existujúcej FE cache politiky.

Nový TTL začne ovplyvňovať backend pri ďalšom requeste, ktorý FE prirodzene vykoná.

### 10. History hook nebude automaticky pollovať

`useDiscoveryCacheHistory()` použije existujúce globálne TanStack query defaults.

V tejto API-prípravnej fáze sa nepridáva:

- `refetchInterval`,
- auto polling,
- vlastný staleTime,
- background monitorovanie.

Budúce UI môže použiť `refetch()` pre manuálny Refresh. Ak bude neskôr požadovaný live diagnostics panel, polling sa rozhodne ako samostatná UI požiadavka.

---

# Implementačné úlohy

## Task 1 — Zaregistrovať Discovery Cache endpoint surface v FE

**Popis:** Doplniť existujúci centrálne evidovaný `API_ENDPOINTS` o Discovery Cache paths. Tento registry nebude použitý namiesto generated Orval klienta; slúži ako explicitný FE endpoint inventory/contract.

Navrhovaný tvar:

```ts
discoveryCache: {
  config: '/api/discovery/cache/config',
  history: '/api/discovery/cache/history',
}
```

GET a PUT config používajú rovnakú URL, preto registry obsahuje jednu `config` path, nie dve duplicitné hodnoty.

**Acceptance criteria:**
- [ ] `API_ENDPOINTS.discoveryCache.config` ukazuje na `/api/discovery/cache/config`.
- [ ] `API_ENDPOINTS.discoveryCache.history` ukazuje na `/api/discovery/cache/history`.
- [ ] Existing unique-path invariant zostáva zelený.
- [ ] Žiadna handwritten funkcia neskladá inú Discovery Cache URL.

**Verification:**
- [ ] `npm exec vitest run src/config/apiEndpoints.test.ts`

**Files:**
- `src/config/apiEndpoints.ts`
- `src/config/apiEndpoints.test.ts`

**Scope:** Small

---

## Task 2 — Definovať stabilný UI-facing Discovery Cache model

**Popis:** Pridať samostatný model súbor pre backend Discovery Cache kontrakt. Nemiešať ho do existujúceho `DiscoverySettings`, ktorý momentálne reprezentuje mock schedule/notification UI.

**Acceptance criteria:**
- [ ] Existujú `DiscoveryCacheConfig`, `DiscoveryCacheConfigPatch`, `DiscoveryCacheHistoryFilters`, `DiscoveryCacheRun`, `DiscoveryCacheHistory`.
- [ ] Frontend model používa camelCase.
- [ ] `defaults` zostáva `Record<string, number>` a zachová neznáme budúce kľúče.
- [ ] `triggeredBy` je union `stale | forced | param_change`.
- [ ] Model neobsahuje schedule/timezone/notification polia, ktoré BE Discovery Cache API neposkytuje.

**Verification:**
- [ ] Typecheck cez focused API/hook test compilation.
- [ ] Samostatný model test iba ak bude obsahovať runtime helper/constant; pre pure interfaces test nevytvárať.

**Files:**
- `src/features/providers-connectors/discovery-settings/model/discoveryCacheTypes.ts`

**Scope:** Small

---

## Task 3 — Pridať request schema a mapovanie kontraktu

**Popis:** Vytvoriť feature-owned schema/helper vrstvu pre UI input → generated API payload. Odpoveď sa bude validovať generated Zod schémou a následne mapovať do frontend modelu.

Navrhované zodpovednosti:

```text
DiscoveryCacheConfigPatch
        ↓ validate
positive integer schema
        ↓ map
CacheConfigUpdate
```

A opačne:

```text
unknown response
      ↓
Generated CacheConfigResponse Zod
      ↓
DiscoveryCacheConfig
```

**Acceptance criteria:**
- [ ] Positive integer pravidlo sa aplikuje na všetky default TTL values, retentionDays a maxRecords.
- [ ] Partial update zachová iba dodané polia.
- [ ] Mapper nemení/neodstraňuje neznáme `defaults` keys.
- [ ] Snake_case zostáva iba na generated/backend hranici.
- [ ] Null sa nevyrába ako „clear“ operácia.

**Verification:**
- [ ] Test valid config patch.
- [ ] Test partial history-retention patch.
- [ ] Test odmietnutia `0`, negative a decimal hodnôt pred HTTP requestom.
- [ ] Test zachovania neznámeho default key napr. `NEW_PROVIDER`.

**Files:**
- `src/features/providers-connectors/discovery-settings/api/schemas/discoveryCacheSchema.ts`
- prípadne test pri API wrapperi; nevytvárať samostatný schema test, ak by iba duplikoval API testy.

**Scope:** Small

---

## Task 4 — Implementovať handwritten Discovery Cache API wrapper

**Popis:** Vytvoriť jediný frontendový transport boundary pre tri generated endpointy.

Navrhované funkcie:

```ts
fetchDiscoveryCacheConfig(): Promise<DiscoveryCacheConfig>

updateDiscoveryCacheConfig(
  patch: DiscoveryCacheConfigPatch,
): Promise<DiscoveryCacheConfig>

fetchDiscoveryCacheHistory(
  filters?: DiscoveryCacheHistoryFilters,
): Promise<DiscoveryCacheHistory>
```

Použiť:

```ts
getCacheConfigDiscoveryCacheConfigGet
updateCacheConfigDiscoveryCacheConfigPut
getCacheHistoryDiscoveryCacheHistoryGet
```

Response validovať cez generated:

```ts
CacheConfigResponse
CacheHistoryResponse
```

plus `parseGeneratedResponse()`.

HTTP chyby normalizovať cez existujúci `toOrvalRequestError()`.

**Acceptance criteria:**
- [ ] GET config volá `/api/discovery/cache/config` cez existujúci Orval → mutator → apiFetch chain.
- [ ] PUT posiela presný partial backend payload.
- [ ] GET history mapuje `providerId -> provider_id`, `limit -> limit`.
- [ ] Config aj history 2xx response sú Zod-validované pred mapovaním.
- [ ] Invalid 2xx response vyhodí `GeneratedResponseContractError`.
- [ ] Non-2xx chyba zachová `OrvalApiError` ako cause, aby UI neskôr mohlo čítať backend `detail`.
- [ ] Wrapper nepridáva manuálny Authorization/X-User header; používa existujúci auth transport.

**Verification:**
- [ ] GET config test: URL, method, auth chain, mapovanie camelCase.
- [ ] PUT config test: method, Content-Type a presný JSON body.
- [ ] GET history test bez filtrov.
- [ ] GET history test s URL-encoded `provider_id` a `limit`.
- [ ] Invalid response tests pre config aj history.
- [ ] 400/403/500 wrapper error tests.

**Files:**
- `src/features/providers-connectors/discovery-settings/api/discoveryCacheApi.ts`
- `src/features/providers-connectors/discovery-settings/api/discoveryCacheApi.test.ts`

**Scope:** Medium

---

## Checkpoint A — Transport pripravený

Po Tasks 1–4 musí byť možné bez React komponentu vykonať:

```ts
const config = await fetchDiscoveryCacheConfig()

const updated = await updateDiscoveryCacheConfig({
  defaults: { VMWARE: 120 },
})

const history = await fetchDiscoveryCacheHistory({
  providerId: 'vmware-01',
  limit: 100,
})
```

- [ ] API tests pass.
- [ ] Generated files ostali bez ručného diffu.
- [ ] API model neobsahuje mock-only Discovery Settings polia.

---

## Task 5 — Pridať Discovery Cache query-key factory

**Popis:** Zaviesť izolované a deterministické TanStack keys pre config a parameterizovanú history.

**Acceptance criteria:**
- [ ] Root key je `['discovery-cache']`.
- [ ] Config key je stabilný a bez parametrov.
- [ ] History key obsahuje `providerId` aj `limit`.
- [ ] `undefined` hodnoty majú kanonickú reprezentáciu `null`, aby rovnaký request nevytváral viac cache identít.
- [ ] Discovery Cache keys nekolidujú s `providers`, `platform-providers` ani inventory keys.

**Verification:**
- [ ] Focused query-key tests pre config, empty history a filtered history.

**Files:**
- `src/features/providers-connectors/discovery-settings/api/discoveryCacheQueryKeys.ts`
- `src/features/providers-connectors/discovery-settings/api/discoveryCacheQueryKeys.test.ts`

**Scope:** Small

---

## Task 6 — Pridať read hooks pripravené pre UI

**Popis:** Pridať dva query hooks bez UI-specific transformácií.

```ts
useDiscoveryCacheConfig()

useDiscoveryCacheHistory(filters?)
```

**Acceptance criteria:**
- [ ] Config hook používa `discoveryCacheKeys.config()`.
- [ ] History hook používa key presne podľa svojich filtrov.
- [ ] History queryFn odovzdá tie isté filtre API wrapperu.
- [ ] Žiadny hook nepridáva polling ani nový cache policy override.
- [ ] Caller dostane štandardné TanStack `data`, `isPending`, `isError`, `error`, `refetch`.

**Verification:**
- [ ] Config hook načíta dáta do config key.
- [ ] Dve history queries s rôznym providerId majú oddelenú cache.
- [ ] Zmena limitu vytvorí inú history query identitu.
- [ ] Error state zachová wrapper error.

**Files:**
- `src/features/providers-connectors/discovery-settings/hooks/useDiscoveryCacheConfig.ts`
- `src/features/providers-connectors/discovery-settings/hooks/useDiscoveryCacheHistory.ts`
- `src/features/providers-connectors/discovery-settings/hooks/discoveryCacheHooks.test.tsx`

**Scope:** Medium

---

## Task 7 — Pridať config update mutation pripravenú pre Save tlačidlo

**Popis:** Vytvoriť mutation, ktorú budúce UI použije priamo pri Save.

```ts
const updateCacheConfig = useUpdateDiscoveryCacheConfig()

updateCacheConfig.mutate({
  historyRetention: {
    retentionDays: 60,
  },
})
```

**Acceptance criteria:**
- [ ] Mutation používa `updateDiscoveryCacheConfig()`.
- [ ] Úspešná response sa zapíše cez `setQueryData(discoveryCacheKeys.config(), response)`.
- [ ] Po úspechu nevzniká redundantný GET config request.
- [ ] Mutation neinvaliduje resource inventory queries.
- [ ] Mutation neinvaliduje history automaticky; config update sám o sebe nie je discovery run.
- [ ] 400/403 error zostáva dostupný callerovi pre budúci `FetchErrorAlert`/form error handling.

**Verification:**
- [ ] Mutation aktualizuje existujúci config cache record.
- [ ] Mutation nevytvorí druhý GET.
- [ ] Provider/inventory query entries ostanú nedotknuté.
- [ ] Error mutation nemení posledný úspešný config cache record.

**Files:**
- `src/features/providers-connectors/discovery-settings/hooks/useUpdateDiscoveryCacheConfig.ts`
- `src/features/providers-connectors/discovery-settings/hooks/discoveryCacheHooks.test.tsx`

**Scope:** Small

---

## Checkpoint B — UI-ready hook contract

Po Tasks 5–7 musí budúci komponent potrebovať iba:

```ts
const configQuery = useDiscoveryCacheConfig()
const historyQuery = useDiscoveryCacheHistory({ limit: 100 })
const updateConfig = useUpdateDiscoveryCacheConfig()
```

UI už nebude potrebovať:

- generated imports,
- manuálny fetch,
- backend snake_case,
- vlastné query keys,
- vlastnú response validáciu,
- vlastnú mutation cache synchronizáciu.

---

## Task 8 — Overiť boundary voči existujúcemu mock Discovery Settings UI

**Popis:** Nepripájať UI, iba ochrániť architektonickú hranicu a zdokumentovať, čo je pripravené na neskoršie napojenie.

**Acceptance criteria:**
- [ ] `DiscoverySettingsPage` stále nepoužíva nové hooks v tomto tasku.
- [ ] Existing mock schedule/timezone/notifications funkcionalita sa nemení.
- [ ] Nové API typy nie sú násilne namapované na `DiscoverySettings` mock type.
- [ ] V pláne pre budúci UI task je jasné, že backend config vie pokryť TTL defaults + history retention + history runs, nie schedule enabled/timezone/notifications.

**Verification:**
- [ ] Existing `DiscoverySettingsPage.test.tsx` zostáva zelený bez zmeny produkčného UI.
- [ ] Grep potvrdí, že generated Discovery Cache operácie importuje iba nový handwritten API wrapper, nie komponenty/pages.

**Files:**
- Produkčný UI súbor sa nemá meniť.
- Test môže zostať nedotknutý; iba sa spustí ako regression check.

**Scope:** Verification only

---

# Finálna verifikácia

Po dokončení API/hook vrstvy spustiť:

```text
npm exec vitest run \
  src/config/apiEndpoints.test.ts \
  src/features/providers-connectors/discovery-settings/api/discoveryCacheApi.test.ts \
  src/features/providers-connectors/discovery-settings/api/discoveryCacheQueryKeys.test.ts \
  src/features/providers-connectors/discovery-settings/hooks/discoveryCacheHooks.test.tsx \
  src/features/providers-connectors/discovery-settings/pages/DiscoverySettingsPage.test.tsx
```

Potom:

```text
npm run typecheck
npm exec eslint <iba zmenené/new TS/TSX súbory> --max-warnings 0
npm run api:check
```

Full test suite/build nie je pre tento izolovaný API-layer task potrebný, pokiaľ focused kontroly neodhalia širší dopad.

---

# Čo bude výsledkom

```text
src/features/providers-connectors/discovery-settings/
├── api/
│   ├── discoveryCacheApi.ts
│   ├── discoveryCacheApi.test.ts
│   ├── discoveryCacheQueryKeys.ts
│   ├── discoveryCacheQueryKeys.test.ts
│   └── schemas/
│       └── discoveryCacheSchema.ts
├── hooks/
│   ├── useDiscoveryCacheConfig.ts
│   ├── useDiscoveryCacheHistory.ts
│   ├── useUpdateDiscoveryCacheConfig.ts
│   └── discoveryCacheHooks.test.tsx
└── model/
    ├── discoveryCacheTypes.ts
    └── discoverySettingsTypes.ts   # existujúci mock UI model zostáva oddelený
```

Budúce UI napojenie potom nebude API integračný task. Bude to iba výmena mock state za pripravené hooks a rozhodnutie, ktoré reálne backendové nastavenia sa majú vizuálne zobrazovať.

---

# Riziká a ochrany

| Riziko | Ochrana |
| --- | --- |
| UI začne importovať generated Orval funkcie priamo | Generated operácie vlastní iba handwritten `discoveryCacheApi.ts` |
| Budúci backend provider type rozbije FE | `defaults` ostáva `Record<string, number>` a mapper zachová neznáme keys |
| Invalid 200 response sa dostane do UI | Všetky responses idú cez generated Zod + `parseGeneratedResponse` |
| FE pošle hodnotu, ktorú BE odmietne | Feature schema validuje positive integers pred requestom |
| Config mutation spustí zbytočný GET | PUT response sa zapíše priamo do config query cache |
| BE TTL update nečakane zmení FE inventory policy | Discovery Cache mutation sa nedotýka inventory query keys |
| Mock schedule/timezone UI bude nesprávne vydávané za BE config | Mock `DiscoverySettings` a reálny `DiscoveryCacheConfig` zostávajú oddelené |
| History sa začne zbytočne pollovať | API-ready hook používa existujúce query defaults bez `refetchInterval` |

# Mimo scope

- Napojenie `DiscoverySettingsPage` na nové hooks.
- Redesign existujúceho Discovery Settings UI.
- Schedule enabled/frequency/timezone backend integrácia — taký Discovery Cache contract dnes neexistuje.
- Notifications backend integrácia.
- Zmena FE globálnej cache politiky.
- Zmena BE discovery cache implementácie.
- Zmena OpenAPI.
- Force-refresh tlačidlo na Resources — rieši samostatný plán.
- IBM Power/FlashSystem force-refresh UI.
