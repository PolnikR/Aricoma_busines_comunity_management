# Provider Role Server Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Doplniť do existujúceho providers filter modalu serverové filtrovanie podľa role `all | source | target` so samostatnou TanStack Query cache pre každú rolu, pričom existujúci filter podľa typu zostane klientsky.

**Architecture:** `ProvidersPage` bude vlastniť aplikovanú rolu a zostane jediným miestom, ktoré spúšťa provider queries. Stránka bude pozorovať kompletnú query `all` aj query aktuálnej role; TanStack Query ich oddelí existujúcimi kľúčmi `['providers', 'list', role]` a pri rovnakom kľúči request deduplikuje. `ProvidersCatalogueTable` bude spravovať iba pending hodnoty modalu a klientsky Type filter, pričom aplikovanú rolu odošle stránke callbackom.

**Tech Stack:** React 19, TypeScript 6, TanStack Query 5, Vitest 4, Testing Library, Orval API client, shared `DataTableToolbar`, `Field` a `Select`.

## Global Constraints

- Použiť existujúci kontrakt `GET /get_providers?role=all|source|target`; nevytvárať nový endpoint ani ručný `fetch`.
- API volať výhradne cez `fetchProviders` a Orval klient `getProvidersGetProvidersGet`.
- Query kľúč musí obsahovať normalizovanú rolu, aby sa výsledky rolí nikdy nezmiešali.
- `Type` zostáva klientsky, pretože backend parameter `type` nepodporuje.
- Create/edit modal musí dostať kompletný zoznam z query `all`, nie aktuálny filtrovaný výrez.
- `Cancel` nesmie aplikovať pending hodnoty; `Apply` aplikuje Type aj Role; `Clear all` nastaví Type na prázdnu hodnotu a Role na `all`.
- Aplikovanie filtra resetuje stránkovanie na stranu 1 a zatvorí otvorený detail providera.
- Použiť existujúce shared komponenty; nevytvárať nový modal ani nový select.
- Texty musia byť v EN, SK a CS.
- Create, update a delete musia invalidovať prefix `providerKeys.all`, nie iba aktuálnu rolu.
- Nepoužiť previous-role placeholder data; pri prvom načítaní novej role sa zobrazí existujúci table skeleton.

## Súbory a zodpovednosti

- `src/features/providers-connectors/providers/api/providerQueryKeys.ts` — cache kľúče podľa role; implementácia je už pripravená.
- `src/features/providers-connectors/providers/api/providerQueryKeys.test.ts` — kontrakt kľúčov pre tri role.
- `src/features/providers-connectors/providers/hooks/useProviders.ts` — query adaptér nad `fetchProviders(role)`.
- `src/features/providers-connectors/providers/hooks/useProviders.test.tsx` — izolácia a znovupoužitie role cache.
- `src/features/providers-connectors/providers/pages/ProvidersPage.tsx` — aplikovaný serverový role filter a výber query výsledkov.
- `src/features/providers-connectors/providers/pages/ProvidersPage.test.tsx` — prepojenie role, hooku, tabuľky a kompletných create dát.
- `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.tsx` — filter UI a pending/applied flow.
- `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx` — interakčné testy modalu.
- `src/features/providers-connectors/providers/hooks/useUpsertProvider.test.tsx` — invalidácia všetkých role caches po create/update.
- `src/features/providers-connectors/providers/hooks/useDeleteProvider.test.tsx` — invalidácia všetkých role caches po delete.
- `src/locales/en.json`, `src/locales/sk.json`, `src/locales/cs.json` — text „všetky roly“.

## Dátový tok

```text
Filter modal: pendingRole = "target"
    -> Apply
ProvidersCatalogueTable.onRoleFilterChange("target")
    -> ProvidersPage.roleFilter = "target"
    -> useProviders("target")
    -> queryKey ["providers", "list", "target"]
    -> GET /get_providers?role=target
    -> tabuľka dostane iba target providers
```

Kompletná query `useProviders('all')` zostáva aktívna pre create/edit závislosti a stabilný zoznam Type možností.

---

### Task 1: Uzamknúť query-key a cache kontrakt testami

**Files:**
- Modify: `src/features/providers-connectors/providers/api/providerQueryKeys.test.ts`
- Modify: `src/features/providers-connectors/providers/hooks/useProviders.test.tsx`
- Verify: `src/features/providers-connectors/providers/api/providerQueryKeys.ts`
- Verify: `src/features/providers-connectors/providers/hooks/useProviders.ts`

**Interfaces:**
- Consumes: `ProviderRoleFilter = 'all' | 'source' | 'target'` a `fetchProviders(role)`.
- Produces: `providerKeys.list(role)` a cache izolovanú podľa role.

- [ ] **Step 1: Rozšíriť test cache kľúčov**

  ```ts
  expect(providerKeys.list('all')).toEqual(['providers', 'list', 'all'])
  expect(providerKeys.list('source')).toEqual(['providers', 'list', 'source'])
  expect(providerKeys.list('target')).toEqual(['providers', 'list', 'target'])
  expect(providerKeys.list('source')).not.toEqual(providerKeys.list('target'))
  ```

- [ ] **Step 2: Doplniť hook test pre tri oddelené cache záznamy**

  Query client v teste musí mať rovnaký fresh interval ako aplikácia:

  ```ts
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 15 * 60 * 1000 },
    },
  })
  ```

  Renderovať hook s `source`, rerenderovať s `target` a následne späť na `source`. Mock odpovie podľa query parametra.

  ```ts
  expect(client.getQueryData(providerKeys.list('source'))).toEqual([sourceProvider])
  expect(client.getQueryData(providerKeys.list('target'))).toEqual([targetProvider])
  expect(fetchMock).toHaveBeenCalledTimes(2)
  ```

  Posledný návrat na `source` nesmie spustiť tretí request, pretože source cache je stále fresh.

- [ ] **Step 3: Spustiť focused testy**

  ```bash
  npm run test -- src/features/providers-connectors/providers/api/providerQueryKeys.test.ts src/features/providers-connectors/providers/hooks/useProviders.test.tsx
  ```

  Expected: nové testy prejdú alebo presne ukážu odchýlku v existujúcom kontrakte.

- [ ] **Step 4: Ak test odhalí chybu, zachovať minimálnu implementáciu**

  ```ts
  export const providerKeys = {
    all: ['providers'] as const,
    list: (role: ProviderRoleFilter = 'all') =>
      [...providerKeys.all, 'list', role] as const,
  }
  ```

  `useProviders` musí vložiť rovnakú rolu do kľúča aj do `fetchProviders(role)`.

- [ ] **Step 5: Commitnúť kontrakt**

  ```bash
  git add src/features/providers-connectors/providers/api/providerQueryKeys.test.ts src/features/providers-connectors/providers/hooks/useProviders.test.tsx src/features/providers-connectors/providers/api/providerQueryKeys.ts src/features/providers-connectors/providers/hooks/useProviders.ts
  git commit -m "test: lock provider role query caching"
  ```

**Acceptance criteria:**
- Všetky role majú odlišný stabilný kľúč.
- Source a target dáta sa navzájom neprepíšu.
- Návrat na fresh cache nevykoná zbytočný request.

---

### Task 2: Presunúť aplikovaný serverový filter do ProvidersPage

**Files:**
- Modify: `src/features/providers-connectors/providers/pages/ProvidersPage.test.tsx`
- Modify: `src/features/providers-connectors/providers/pages/ProvidersPage.tsx`
- Modify: `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.tsx` iba pre nové props rozhranie

**Interfaces:**
- Consumes: `useProviders(role: ProviderRoleFilter)`.
- Produces:

  ```ts
  interface ProvidersCatalogueTableProps {
    providers: ProviderRecord[]
    allProviders: ProviderRecord[]
    roleFilter: ProviderRoleFilter
    onRoleFilterChange: (role: ProviderRoleFilter) => void
    isLoading: boolean
    error: Error | null
    isRetrying: boolean
    onRetry: () => void
  }
  ```

- [ ] **Step 1: Napísať failing page test pre zmenu role**

  Mock tabuľky zobrazí rolu a umožní zavolať callback:

  ```tsx
  ProvidersCatalogueTable: ({ roleFilter, onRoleFilterChange }: {
    roleFilter: ProviderRoleFilter
    onRoleFilterChange: (role: ProviderRoleFilter) => void
  }) => (
    <div>
      <span>Role: {roleFilter}</span>
      <button onClick={() => { onRoleFilterChange('source') }}>Apply source</button>
    </div>
  )
  ```

  Po kliknutí musí stránka zavolať `useProviders('source')` a tabuľke odovzdať source odpoveď.

- [ ] **Step 2: Napísať failing test kompletných create dát**

  Pri aktívnej role `target` musí create modal dostať počet providerov z query `all`, nie počet target výsledkov.

  ```ts
  expect(screen.getByText('Provider modal with 4 existing')).toBeInTheDocument()
  ```

- [ ] **Step 3: Spustiť test a potvrdiť zlyhanie**

  ```bash
  npm run test -- src/features/providers-connectors/providers/pages/ProvidersPage.test.tsx
  ```

  Expected: FAIL na chýbajúcom page-owned role stave alebo props.

- [ ] **Step 4: Implementovať rolu a dve query pozorovania**

  ```tsx
  const [roleFilter, setRoleFilter] = useState<ProviderRoleFilter>('all')
  const allProvidersQuery = useProviders('all')
  const visibleProvidersQuery = useProviders(roleFilter)

  const providers = visibleProvidersQuery.data ?? []
  const allProviders = allProvidersQuery.data ?? []
  ```

  Ak je `roleFilter === 'all'`, oba hooky pozorujú rovnaký cache kľúč; TanStack Query vykoná iba jeden request.

- [ ] **Step 5: Pripojiť správne query výsledky**

  `TableToolbar` refresh a fetching stav aj `ProvidersCatalogueTable` loading/error/retry musia používať `visibleProvidersQuery`. `ProvidersCreateModal.existingProviders` musí používať `allProviders`.

  ```tsx
  <ProvidersCatalogueTable
    providers={providers}
    allProviders={allProviders}
    roleFilter={roleFilter}
    onRoleFilterChange={setRoleFilter}
    isLoading={visibleProvidersQuery.isLoading}
    error={visibleProvidersQuery.error instanceof Error ? visibleProvidersQuery.error : null}
    isRetrying={visibleProvidersQuery.isFetching}
    onRetry={() => { void visibleProvidersQuery.refetch() }}
  />
  ```

- [ ] **Step 6: Spustiť page test**

  ```bash
  npm run test -- src/features/providers-connectors/providers/pages/ProvidersPage.test.tsx
  ```

  Expected: PASS.

- [ ] **Step 7: Commitnúť page orchestration**

  ```bash
  git add src/features/providers-connectors/providers/pages/ProvidersPage.tsx src/features/providers-connectors/providers/pages/ProvidersPage.test.tsx src/features/providers-connectors/providers/components/ProvidersCatalogueTable.tsx
  git commit -m "feat: query providers by selected role"
  ```

**Acceptance criteria:**
- Stránka vlastní aplikovanú rolu.
- Viditeľný zoznam používa serverovú odpoveď aktuálnej role.
- Create/edit závislosti vždy používajú kompletný dataset.

---

### Task 3: Doplniť Role do shared filter modalu

**Files:**
- Modify: `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx`
- Modify: `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.tsx`
- Modify: `src/locales/en.json`
- Modify: `src/locales/sk.json`
- Modify: `src/locales/cs.json`

**Interfaces:**
- Consumes: `roleFilter`, `onRoleFilterChange`, `allProviders` z Task 2.
- Produces: modal s pending hodnotou role a aplikovaným serverovým callbackom.

- [ ] **Step 1: Aktualizovať test harness**

  Harness musí vlastniť rolu a posielať ju hooku aj tabuľke:

  ```tsx
  const [roleFilter, setRoleFilter] = useState<ProviderRoleFilter>('all')
  const { data = [], ...query } = useProviders(roleFilter)

  return (
    <ProvidersCatalogueTable
      providers={data}
      allProviders={allProviders}
      roleFilter={roleFilter}
      onRoleFilterChange={setRoleFilter}
      {...requestProps}
    />
  )
  ```

- [ ] **Step 2: Napísať failing test pre Apply**

  Scenár: otvoriť Filters, zvoliť Target, potvrdiť že request ešte neprebehol, kliknúť Apply, potvrdiť `/api/get_providers?role=target`, target riadky a counter `1`.

- [ ] **Step 3: Napísať failing test pre Cancel**

  Vybrať Source, kliknúť Cancel a znovu otvoriť modal. Select musí zobrazovať All roles a source request sa nesmie vykonať.

- [ ] **Step 4: Napísať failing test pre kombináciu a Clear all**

  Aplikovať `Type = VMWARE` a `Role = Target`. Counter musí byť `2` a riadky musia byť prienikom serverových target dát a klientskeho Type filtra. Clear all musí nastaviť counter `0`, vrátiť `role=all` a odstrániť Type filter.

- [ ] **Step 5: Spustiť component test a potvrdiť zlyhanie**

  ```bash
  npm run test -- src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx
  ```

  Expected: FAIL na chýbajúcom Role poli a callbacku.

- [ ] **Step 6: Implementovať pending synchronizáciu pri otvorení**

  ```tsx
  const [typeFilter, setTypeFilter] = useState('')
  const [pendingType, setPendingType] = useState('')
  const [pendingRole, setPendingRole] = useState<ProviderRoleFilter>(roleFilter)

  const openFilters = () => {
    setPendingType(typeFilter)
    setPendingRole(roleFilter)
  }
  ```

  Pripojiť `openFilters` na `DataTableToolbar.onFilterOpen`, aby sa pri ďalšom otvorení zahodili predtým zrušené pending zmeny.

- [ ] **Step 7: Implementovať Apply a Clear all**

  ```tsx
  const applyFilters = () => {
    setTypeFilter(pendingType)
    onRoleFilterChange(pendingRole)
    table.setPage(1)
    setSelectedId(null)
  }

  const clearFilters = () => {
    setPendingType('')
    setPendingRole('all')
    setTypeFilter('')
    onRoleFilterChange('all')
    table.setPage(1)
    setSelectedId(null)
  }
  ```

  Counter:

  ```ts
  const activeFilterCount = Number(Boolean(typeFilter)) + Number(roleFilter !== 'all')
  ```

- [ ] **Step 8: Pridať Role select cez shared komponenty**

  ```tsx
  <Field label={t('forms.role')} htmlFor="provider-role-filter">
    <Select
      id="provider-role-filter"
      value={pendingRole}
      onChange={(event) => {
        setPendingRole(event.target.value as ProviderRoleFilter)
      }}
    >
      <option value="all">{t('providers.allRoles')}</option>
      <option value="source">{t('forms.role.source')}</option>
      <option value="target">{t('forms.role.target')}</option>
    </Select>
  </Field>
  ```

- [ ] **Step 9: Stabilizovať Type možnosti kompletnými dátami**

  ```ts
  const types = useMemo(
    () => [...new Set(allProviders.map(provider => provider.type))].sort(),
    [allProviders],
  )
  ```

  Rovnaký kompletný dataset musí dostať aj edit modal renderovaný z tabuľky:

  ```tsx
  <ProvidersCreateModal
    open
    onClose={() => { setEditing(null) }}
    existingProviders={allProviders}
    provider={editing}
  />
  ```

  Nepoužiť pôvodné `existingProviders={rows}`, pretože `rows` po aplikovaní role obsahuje iba serverom filtrovaný výrez.

- [ ] **Step 10: Doplniť lokalizáciu**

  ```json
  "providers.allRoles": "All roles"
  "providers.allRoles": "Všetky roly"
  "providers.allRoles": "Všechny role"
  ```

  Každý riadok patrí do príslušného EN, SK alebo CS súboru. Existujúce kľúče `forms.role.source` a `forms.role.target` znovu použiť.

- [ ] **Step 11: Spustiť component a page testy**

  ```bash
  npm run test -- src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx src/features/providers-connectors/providers/pages/ProvidersPage.test.tsx
  ```

  Expected: PASS.

- [ ] **Step 12: Commitnúť filter UI**

  ```bash
  git add src/features/providers-connectors/providers/components/ProvidersCatalogueTable.tsx src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx src/locales/en.json src/locales/sk.json src/locales/cs.json
  git commit -m "feat: filter providers by server role"
  ```

**Acceptance criteria:**
- Modal obsahuje Type aj Role v existujúcom shared layoute.
- Pending hodnoty sa aplikujú iba cez Apply.
- Counter zobrazuje 0, 1 alebo 2 aktívne filtre.
- Role dáta pochádzajú z backendu a Type sa aplikuje klientsky nad nimi.

---

### Task 4: Overiť invalidáciu všetkých role cache po mutáciách

**Files:**
- Modify: `src/features/providers-connectors/providers/hooks/useUpsertProvider.test.tsx`
- Modify: `src/features/providers-connectors/providers/hooks/useDeleteProvider.test.tsx`
- Verify: `src/features/providers-connectors/providers/hooks/useUpsertProvider.ts`
- Verify: `src/features/providers-connectors/providers/hooks/useDeleteProvider.ts`

**Interfaces:**
- Consumes: prefix `providerKeys.all = ['providers']`.
- Produces: invalidáciu `all`, `source` a `target` po create, update alebo delete.

- [ ] **Step 1: Naplniť všetky cache varianty pred mutáciou**

  ```ts
  queryClient.setQueryData(providerKeys.list('all'), allProviders)
  queryClient.setQueryData(providerKeys.list('source'), sourceProviders)
  queryClient.setQueryData(providerKeys.list('target'), targetProviders)
  ```

- [ ] **Step 2: Rozšíriť upsert test**

  ```ts
  expect(queryClient.getQueryState(providerKeys.list('all'))?.isInvalidated).toBe(true)
  expect(queryClient.getQueryState(providerKeys.list('source'))?.isInvalidated).toBe(true)
  expect(queryClient.getQueryState(providerKeys.list('target'))?.isInvalidated).toBe(true)
  ```

- [ ] **Step 3: Rozšíriť delete test rovnakým kontraktom**

  Delete môže nastaviť odpoveď do cache `all`, ale následná prefix invalidácia musí označiť všetky tri varianty ako stale.

- [ ] **Step 4: Spustiť mutation testy**

  ```bash
  npm run test -- src/features/providers-connectors/providers/hooks/useUpsertProvider.test.tsx src/features/providers-connectors/providers/hooks/useDeleteProvider.test.tsx
  ```

  Expected: PASS s existujúcim `invalidateQueries({ queryKey: providerKeys.all })`. Ak niektorá rola zostane validná, opraviť scope prefixu; nepridávať tri ručné invalidácie.

- [ ] **Step 5: Commitnúť invalidation kontrakt**

  ```bash
  git add src/features/providers-connectors/providers/hooks/useUpsertProvider.test.tsx src/features/providers-connectors/providers/hooks/useDeleteProvider.test.tsx src/features/providers-connectors/providers/hooks/useUpsertProvider.ts src/features/providers-connectors/providers/hooks/useDeleteProvider.ts
  git commit -m "test: verify provider role cache invalidation"
  ```

**Acceptance criteria:**
- Žiadna rola po mutácii nezostane fresh so starými dátami.
- Aktívne queries sa refetchnú podľa TanStack Query pravidiel.
- Neaktívne queries zostanú stale a refetchnú sa pri ďalšom použití.

---

### Task 5: Integračné a produkčné overenie

**Files:**
- Modify only if verification identifies a defect in files listed in Tasks 1–4.

**Interfaces:**
- Consumes: dokončený serverový filter flow.
- Produces: overený build bez regresie providers správy.

- [ ] **Step 1: Spustiť všetky providers testy**

  ```bash
  npm run test -- src/features/providers-connectors/providers
  ```

- [ ] **Step 2: Spustiť statické kontroly**

  ```bash
  npm run lint
  npm run typecheck
  ```

- [ ] **Step 3: Spustiť kompletný build**

  ```bash
  npm run build
  ```

  Expected: Orval kontrola, lint, typecheck, celý Vitest suite a Vite build prejdú.

- [ ] **Step 4: Manuálne overiť Network a cache**

  1. Otvoriť Providers — jeden request `role=all`.
  2. Aplikovať Source — jeden request `role=source`.
  3. Aplikovať Target — jeden request `role=target`.
  4. Vrátiť sa na Source počas 15 minút — okamžité cache dáta bez nového requestu.
  5. Vykonať create/update/delete — aktívne cache sa zneplatnia a obnovia.
  6. Pri aktívnom Target filtri otvoriť create modal a potvrdiť kompletné existujúce dáta.

- [ ] **Step 5: Skontrolovať finálny diff**

  ```bash
  git diff --check
  git status --short
  ```

  Ak overenie vyžadovalo opravu, commitnúť iba opravené súbory samostatným commitom `fix: stabilize provider role filtering`.

**Acceptance criteria:**
- Focused aj kompletné automatické overenie prejde.
- Network requesty a cache zodpovedajú role query kľúčom.
- Bez regresie create, edit, delete, search, Type filtra, detail drawer a pagination.

## Checkpointy

### Po Tasks 1–2

- Query cache je izolovaná podľa role.
- Stránka načítava aktuálnu rolu serverovo.
- Kompletný dataset zostáva dostupný pre create/edit.

### Po Tasks 3–4

- Filter modal má správny pending/applied flow.
- Type a Role sa dajú kombinovať.
- Mutácie zneplatňujú všetky role cache.

### Finálny checkpoint

- Providers testy, lint, typecheck a build prejdú.
- Manuálny Network scenár potvrdí tri oddelené caches.

## Riziká a mitigácie

| Riziko | Dopad | Mitigácia |
|---|---|---|
| Filtrovaný zoznam sa použije na kontrolu duplicity ID | Vysoký | Samostatná `all` query pre create/edit modal. |
| Source a target zdieľajú cache | Vysoký | Rola je povinnou súčasťou `providerKeys.list(role)` a je pokrytá testom. |
| Cancel ponechá neaplikovanú hodnotu | Stredný | Pri `onFilterOpen` synchronizovať pending stav z aplikovaných filtrov. |
| Type možnosti zmiznú po zmene role | Stredný | Odvodzovať ich z `allProviders`. |
| Po zmene role sa znovu otvorí starý detail | Stredný | Pri Apply a Clear nastaviť `selectedId` na `null`. |
| Mutácia obnoví iba aktuálnu rolu | Vysoký | Invalidovať prefix `providerKeys.all`. |
| Používateľ uvidí dáta predošlej role | Stredný | Nepoužiť previous-data placeholder medzi odlišnými role kľúčmi. |

## Mimo rozsahu

- Role filter sa nezapisuje do URL.
- Backendový Type filter sa nepridáva bez OpenAPI podpory.
- Pagination, vyhľadávanie a Type filter zostávajú klientské.
- Nemení sa globálny `staleTime` 15 minút ani retry politika.
- Nevytvára sa nový shared komponent.
