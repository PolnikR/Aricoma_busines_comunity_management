# Todo: provider discovery scope v Recovery Groups (Variant A)

Plán: [recovery-group-provider-scope-plan.md](recovery-group-provider-scope-plan.md). Bez commitu a pushu (pokyn používateľa).

## Task 1: Provider scope riadok Variantu A na provider karte

**Popis:** Nový `RecoveryGroupProviderScope` vyrenderuje readonly riadok Variantu A a `RecoveryGroupProviderStep` ho odovzdá do `SelectableCard.supportingContent`, iba ak má provider zobraziteľný scope. Riadok tvorí dekoratívna `<FilterIcon aria-hidden="true" … />` z `src/shared/icons/Icons.tsx` a za ňou chipy:

```text
(FilterIcon) [ VM name TEST-* ] [ VM tag WEB ] [ +2 ]
```

- Normalizácia ide cez `resolveVmwareProviderFilter()`.
- `+N` je počet ďalších neprázdnych trimnutých tagov. Iba prvý tag je vynútený filter, ďalšie sú iba nakonfigurované metadáta.
- IBM Power zobrazí iba `VM name`.
- Iba Variant A: žiadny samostatný blok „Discovery scope“ a žiadny scope v pätičke ani v `meta`.

**Acceptance criteria:**
- [x] VMware: prefix + tag → filter ikona, `VM name` `TEST-*`, `VM tag` `WEB`. Iba prefix, iba tag a whitespace hodnoty sa zobrazia správne. `FilterIcon` je `aria-hidden`, nie je button a nemá tooltip ani interakciu. Bez zobraziteľného scope sa neodovzdá žiadny `supportingContent`, teda sa nevyrenderuje ani ikona (test overí, že ikona v karte chýba).
- [x] Viac tagov → prvý neprázdny tag ako `VM tag` + chip `+2`. Jeho `title` aj sr-only text = `pages.recoveryGroupBuilder.provider.scope.moreTags` a explicitne hovoria, že VM filtrovanie používa iba prvý tag. Test overí `title` aj prístupný text. Žiadny viacriadkový zoznam. Dlhé hodnoty sa skracujú (`truncate` + `title`). Grid `md:grid-cols-2 xl:grid-cols-3` ostáva bez zmeny.
- [x] IBM Power: prefix chip sa zobrazí, tag chip nikdy. Nový locale kľúč `pages.recoveryGroupBuilder.provider.scope.moreTags` v en/sk/cs:
  - en: `{{count}} additional configured tags; only the first tag is used for VM filtering.`
  - sk: `{{count}} ďalšie nakonfigurované tagy; na filtrovanie VM sa používa iba prvý tag.`
  - cs: `{{count}} další nakonfigurované tagy; k filtrování VM se používá pouze první tag.`

  Reuse `pages.virtualMachines.inventory.vmName/.vmTag/.providerFilter`.

**Verifikácia:**
- [x] `npm exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupProviderStep.test.tsx src/features/discovery-inventory/resources/helpers/vmwareProviderFilter.test.ts`
- [x] eslint na zmenených súboroch
- [ ] Manuálne: provider karty vo wizarde (light/dark, 1/2/3 stĺpce, vybraná karta)

**Závislosti:** žiadne

**Súbory:**
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupProviderScope.tsx` (nový)
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupProviderStep.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupProviderStep.test.tsx`
- `src/locales/en.json`, `sk.json`, `cs.json`

**Rozsah:** S–M

## Checkpoint A
- [x] Task 1 testy zelené, `npm run typecheck`, eslint

## Task 2: VMware fixed scope + klientský user search

**Popis:** `useRecoveryGroupResourceInventory` dostane option `providerScope?: RecoveryGroupProviderScope | null` a stratí `vmwareNamePrefix`. Pre VMware sa `resolveVmwareProviderFilter(providerScope)` premietne do `namePrefix`/`tag` existujúceho `useVmwareResourceInventory`. Pri `providerScope === undefined` je VM query disabled. `RecoveryGroupResourcesStep` dostane prop `providerScope`, odstráni `vmwareNamePrefix` state a nepošle `searchValue`/`onSearchChange`, takže sidebar filtruje klientsky.

**Acceptance criteria:**
- [x] Request/query key: bez scope `{ providerId }`, prefix `' TEST- '` → `namePrefix: 'TEST-'`, tag `[' WEB ']` → `tag: 'WEB'`, prefix + tag → obe hodnoty. Kľúč je zhodný s `vmwareInventoryQuery({...})` z Resources.
- [x] Písanie do search boxu nespustí nový request a body vždy nesie provider scope. Výsledok sa iba lokálne zúži.
- [x] `providerScope === undefined` → žiadny request. Existujúce testy server searchu (`RecoveryGroupResourcesStep.test.tsx`: „passes VMware search text…“, „shows the loading list while a VMware search…“; hook testy pre `vmwareNamePrefix`) sa nahradia testami nového správania. Test resetu searchu pri zmene providera ostáva.

**Verifikácia:**
- [x] `npm exec vitest run src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.test.tsx src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx src/features/discovery-inventory/resources/model/inventoryQueries.test.ts`

**Závislosti:** žiadne (paralelne s Task 1)

**Súbory:**
- `src/features/recovery-plans/recovery-groups/model/recoveryGroupTypes.ts` (typ `RecoveryGroupProviderScope`)
- `src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.ts` + `.test.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.tsx` + `.test.tsx`

**Rozsah:** M

## Task 3: IBM Power prefix

**Popis:** V Power vetve hooku sa v `select` pred výpočtom `resourceNames` a `vmMetadataByName` vyfiltrujú `partitions` cez `partitionName.startsWith(trimmedPrefix)`. Query key ostáva `powerInventoryQuery(providerId)`. `vmTags` sa ignorujú.

**Acceptance criteria:**
- [x] `TEST-AIX-01`, `TEST-AIX-02`, `PROD-AIX-01` + prefix `' TEST- '` → resources iba `TEST-AIX-01`, `TEST-AIX-02` a metadata iba pre ne.
- [x] Bez prefixu sa vrátia všetky LPAR-y. `vmTags: ['WEB']` bez prefixu tiež vráti všetky LPAR-y (explicitný test: žiadny fake tag filter).
- [x] Power query key je rovnaký so scope aj bez neho (zdieľaná cache). FlashSystem `providerScope` ignoruje.

**Verifikácia:**
- [x] `npm exec vitest run src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx`

**Závislosti:** Task 2 (option `providerScope`)

**Súbory:**
- `src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.ts` + `.test.tsx`

**Rozsah:** S

## Task 4: Builder odovzdá scope, edit a provider change

**Popis:** `RecoveryGroupBuilder` dohľadá `selectedProvider = providers.find(p => p.id === draftState.providerId)` a hlavnému `RecoveryGroupResourcesStep` pošle `providerScope={selectedProvider ? { vmPrefix, vmTags } : undefined}`. Related-volumes (FlashSystem) krok scope nedostane. Neurobí sa žiadny nový provider fetch.

**Acceptance criteria:**
- [x] Edit skupiny s `resources: ['PROD-VM-01']` a providerom `vmPrefix: 'TEST-'`: `PROD-VM-01` ostáva v selected liste (aj v submit payloade), available list obsahuje iba scoped VM a request nesie `name_prefix: 'TEST-'`.
- [x] Zmena providera A → B vynuluje resources, metadata a search, a request pre B nesie iba scope B (žiadny prefix/tag z A).
- [x] V builderi nepribudne žiadne volanie `useGetProviders`. Submit payload kontrakt ostáva bez zmeny.

**Verifikácia:**
- [x] `npm exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.test.tsx`

**Závislosti:** Task 2, Task 3

**Súbory:**
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx`

**Rozsah:** S

## Checkpoint B (finálny)
- [x] Focused testy: ProviderStep, ResourcesStep, Builder, useRecoveryGroupResourceInventory, vmwareProviderFilter, useVmwareResourceInventory, inventoryQueries
- [x] `npm run typecheck`
- [x] `node scripts/orval/check-feature-layout.mjs`
- [x] eslint iba na zmenených TS/TSX
- [x] `git diff --check`
- [x] Žiadne zmeny v `src/generated`, backend, OpenAPI, Orval, provider create/edit, Resources UI
- [ ] Review s človekom, bez commitu
