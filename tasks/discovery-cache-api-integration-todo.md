# TODO: Discovery Cache API vrstva pripravená pre UI

## Task 1 — Endpoint registry
- [ ] Pridať `API_ENDPOINTS.discoveryCache.config = '/api/discovery/cache/config'`.
- [ ] Pridať `API_ENDPOINTS.discoveryCache.history = '/api/discovery/cache/history'`.
- [ ] Zachovať unique-path invariant; GET a PUT config používajú jednu spoločnú path.
- [ ] Doplniť focused `apiEndpoints` test.

## Task 2 — UI-facing typy
- [ ] Pridať `DiscoveryCacheConfig`.
- [ ] Pridať `DiscoveryCacheConfigPatch`.
- [ ] Pridať `DiscoveryCacheHistoryFilters`.
- [ ] Pridať `DiscoveryCacheRunTrigger`.
- [ ] Pridať `DiscoveryCacheRun` a `DiscoveryCacheHistory`.
- [ ] Použiť camelCase vo handwritten vrstve.
- [ ] Zachovať `defaults` ako `Record<string, number>` kvôli budúcim provider typom.
- [ ] Nemiešať tieto typy s existujúcim mock `DiscoverySettings` modelom.

## Task 3 — Request schema a mappers
- [ ] Validovať TTL values ako kladné celé čísla.
- [ ] Validovať `retentionDays` a `maxRecords` ako kladné celé čísla.
- [ ] Pre UI-facing history filter povoliť iba kladný integer `limit`; generated OpenAPI kontrakt je širší, ale negatívny limit nemá pre UI zmysel.
- [ ] Mapovať `historyRetention.retentionDays -> history_retention.retention_days`.
- [ ] Mapovať `historyRetention.maxRecords -> history_retention.max_records`.
- [ ] Zachovať partial update: neposielať polia, ktoré caller nezadal.
- [ ] Nepoužívať `null` ako clear operáciu; BE `exclude_none=True` null hodnotu ignoruje.
- [ ] Zachovať všetky neznáme `defaults` keys pri response mappingu.

## Task 4 — Handwritten API wrapper
- [ ] Pridať `fetchDiscoveryCacheConfig()`.
- [ ] Pridať `updateDiscoveryCacheConfig(patch)`.
- [ ] Pridať `fetchDiscoveryCacheHistory(filters?)`.
- [ ] Použiť výhradne generated Orval operácie pre GET/PUT config a GET history.
- [ ] Validovať config response cez generated `CacheConfigResponse` + `parseGeneratedResponse()`.
- [ ] Validovať history response cez generated `CacheHistoryResponse` + `parseGeneratedResponse()`.
- [ ] Mapovať backend snake_case response na frontend camelCase model.
- [ ] Mapovať `providerId -> provider_id` pri history requeste.
- [ ] Použiť `toOrvalRequestError()` a zachovať `OrvalApiError` ako `cause`.
- [ ] Nepridávať manuálne Authorization ani X-User hlavičky.
- [ ] Testovať GET config URL/method/response mapping.
- [ ] Testovať PUT partial body a Content-Type.
- [ ] Testovať GET history bez filtrov a s `providerId + limit`.
- [ ] Testovať invalid 2xx response.
- [ ] Testovať 400/403/500 error wrapping.

### Checkpoint A — Transport
- [ ] API wrapper funguje bez React komponentov.
- [ ] Generated files nemajú ručný diff.
- [ ] Mock-only schedule/timezone/notifications nie sú súčasťou reálneho cache API modelu.

## Task 5 — TanStack query keys
- [ ] Pridať root `['discovery-cache']`.
- [ ] Pridať stabilný config key.
- [ ] Pridať history key s `providerId` a `limit`.
- [ ] Normalizovať chýbajúce filtre na `null` v query key.
- [ ] Overiť, že keys nekolidujú s providers/platform-providers/inventory cache.
- [ ] Doplniť focused query-key tests.

## Task 6 — Read hooks
- [ ] Pridať `useDiscoveryCacheConfig()`.
- [ ] Pridať `useDiscoveryCacheHistory(filters?)`.
- [ ] Config hook používa config key a `fetchDiscoveryCacheConfig()`.
- [ ] History hook používa parameterizovaný key a `fetchDiscoveryCacheHistory()`.
- [ ] Nepridávať `refetchInterval` ani vlastný polling.
- [ ] Neoverrideovať existujúcu globálnu FE cache politiku.
- [ ] Testovať config cache entry.
- [ ] Testovať oddelené history entries pre rôzne providerId/limit.
- [ ] Testovať error state.

## Task 7 — Config update mutation
- [ ] Pridať `useUpdateDiscoveryCacheConfig()`.
- [ ] Mutation používa `updateDiscoveryCacheConfig()`.
- [ ] Po úspechu zapísať returned config cez `setQueryData(discoveryCacheKeys.config(), result)`.
- [ ] Nerobiť redundantný GET po úspešnom PUT.
- [ ] Neinvalidovať VMware/FlashSystem/IBM Power inventory query keys.
- [ ] Neinvalidovať history automaticky; config update nie je discovery run.
- [ ] Pri chybe zachovať posledný úspešný config v TanStack cache.
- [ ] Testovať 400/403 dostupný callerovi.

### Checkpoint B — UI-ready contract
- [ ] Budúce UI potrebuje iba `useDiscoveryCacheConfig()`.
- [ ] Budúce UI potrebuje iba `useDiscoveryCacheHistory(filters)`.
- [ ] Budúce Save tlačidlo potrebuje iba `useUpdateDiscoveryCacheConfig()`.
- [ ] UI nemusí importovať generated klient, skladať URL, mapovať snake_case ani spravovať query keys.

## Task 8 — Zachovať hranicu existujúceho mock UI
- [ ] V tomto tasku nenapájať `DiscoverySettingsPage` na nové hooks.
- [ ] Nemeniť existujúce schedule/frequency/timezone/notifications mock správanie.
- [ ] Nespájať mock `DiscoverySettings` type s `DiscoveryCacheConfig`.
- [ ] Spustiť existujúci `DiscoverySettingsPage.test.tsx` ako regression test.
- [ ] Grep overí, že generated Discovery Cache operácie importuje iba handwritten API wrapper, nie page/component.

## Finálna verifikácia
- [ ] `npm exec vitest run src/config/apiEndpoints.test.ts src/features/providers-connectors/discovery-settings/api/discoveryCacheApi.test.ts src/features/providers-connectors/discovery-settings/api/discoveryCacheQueryKeys.test.ts src/features/providers-connectors/discovery-settings/hooks/discoveryCacheHooks.test.tsx src/features/providers-connectors/discovery-settings/pages/DiscoverySettingsPage.test.tsx`
- [ ] `npm run typecheck`
- [ ] Focused ESLint iba pre zmenené/new TS/TSX súbory s `--max-warnings 0`.
- [ ] `npm run api:check`
- [ ] Skontrolovať, že generated Orval súbory neboli ručne menené.
- [ ] Commitnúť iba task-scoped súbory po úspešnom overení.

## Mimo scope
- [ ] Nenapájať UI v tomto tasku.
- [ ] Neredizajnovať Discovery Settings page.
- [ ] Neimplementovať schedule/timezone/notifications backend integráciu.
- [ ] Nemeniť globálnu FE cache politiku.
- [ ] Nemeniť backend ani OpenAPI.
- [ ] Nerobiť force-refresh Resources tlačidlo v tomto tasku.
