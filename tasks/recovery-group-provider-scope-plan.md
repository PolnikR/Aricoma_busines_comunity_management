# Implementačný plán: provider discovery scope v Recovery Groups (Variant A)

## Prehľad

Recovery Group builder má pri výbere providera zobraziť jeho discovery scope (`vmPrefix`, `vmTags`) ako kompaktné chipy cez `SelectableCard.supportingContent` (schválený Variant A). Krok Resources má následne ponúknuť iba VM/LPAR v tomto scope:

- **VMware:** scope ide na server cez existujúcu kanonickú query `POST /vms/search` (`name_prefix`, `tag`).
- **IBM Power:** `vmPrefix` sa uplatní lokálne na `partitionName`. `vmTags` sa ignorujú, lebo Power payload tagy nemá.

Používateľský search sa stáva čisto klientským filtrom nad už ohraničeným výsledkom a scope nemôže obísť.

Tasky sú v [recovery-group-provider-scope-todo.md](recovery-group-provider-scope-todo.md).

## Overený aktuálny stav (vetva `test`, 0bd018f2)

| Oblasť | Stav |
|---|---|
| `RecoveryGroupProviderStep.tsx` | `SelectableCard` s `title`, `description`, `meta` = `TYPE · IP`, `icon`. Scope sa nezobrazuje. |
| `SelectableCard.tsx` | Slot `supportingContent` existuje (medzi popisom a pätičkou, `mt-3`). Karta je `<button>`, takže vo vnútri nesmie byť nič interaktívne. Vybraná karta má `accent-soft` pozadie. |
| `VmwareProviderFilterSummary.tsx` | Chipy `rounded-full border-accent/25 bg-accent-soft`, `VM name **prefix***`, `VM tag **tag**`, `whitespace-nowrap` bez truncate. Iba prvý tag. |
| `resolveVmwareProviderFilter()` | `prefix = vmPrefix.trim()`, `tag = prvý neprázdny trimnutý tag`, `isFixed`. |
| `RecoveryGroupBuilder.tsx` | Má `providers` z `useGetProviders` (create: iba `source`, edit: všetky). `onSelect` providera resetuje `resources`, `vmMetadataByName`, `relatedVolumes`, `auxiliaryNamesByVolume`. `handleMetadataAvailable` metadata iba mergeuje, nič nemaže. Hlavný `RecoveryGroupResourcesStep` dostáva iba `workloadType` a `providerId`. |
| `RecoveryGroupResourcesStep.tsx` | `key = workloadType\|providerId` resetuje lokálny stav. Pre VMware drží `vmwareNamePrefix` a posiela ho ako **server-side** `namePrefix` (`ResourceSidebar` v režime `searchValue`/`onSearchChange`). Power/FlashSystem používajú klientský search v `ResourceSidebar`. |
| `useRecoveryGroupResourceInventory.ts` | VMware: `useVmwareResourceInventory({ providerId, namePrefix: vmwareNamePrefix })`, pričom `tag` hook už podporuje. Power/FlashSystem: `powerInventoryQuery(providerId)` + `createPowerInventorySelect`, výsledok v `selectFn` → `resourceNames` + `vmMetadataByName`. |
| `useVmwareResourceInventory.ts` | Options `providerId`, `folderName`, `namePrefix`, `tag`. `namePrefix` sa debounceuje 300 ms (aj pri prvom mounte, ak je neprázdny). Query key = `getPostVmsSearchQueryKey(body, params)`, teda kanonický a zdieľaný s Resources. |
| `/vms/search` filter | `VmSearchFilter`: `folder_name`, `tag`, `name_prefix`, `force_refresh`. Bez stránkovania. |
| Power payload | `powerPartition.gen.ts` / `powerVmRecord.gen.ts` neobsahujú žiadne tag pole. `mapPowerInventory` mapuje `PartitionName` → `partitionName`. |
| Locales | Existujú `pages.virtualMachines.inventory.providerFilter` / `.vmName` / `.vmTag` v en/sk/cs. |

## Architektonické rozhodnutia

1. **Úzky interface scope.** Zavedie sa typ `RecoveryGroupProviderScope = Pick<ProviderRecord, 'vmPrefix' | 'vmTags'>`, ktorý prechádza `RecoveryGroupBuilder` → `RecoveryGroupResourcesStep` (`providerScope`) → `useRecoveryGroupResourceInventory` (option `providerScope`). Celý `ProviderRecord` sa ďalej neposiela.
2. **Scope musí byť známy pred fetchom.** Pre VM workloady (VMware, Power) je inventory query vypnutá, kým `providerScope === undefined` (provider record ešte nie je dohľadaný v `providers`). Builder posiela `undefined` počas načítavania providerov a `{ vmPrefix, vmTags }` po dohľadaní. Bez toho by sa v edit móde na okamih načítal a zobrazil neohraničený inventory.
3. **VMware reuseuje `resolveVmwareProviderFilter()`.** `filter.prefix` → `namePrefix`, `filter.tag` → `tag` v existujúcom `useVmwareResourceInventory`. Neexistuje druhá interpretácia, nový fetch ani nový query key. Rovnaké `providerId + namePrefix + tag` dá rovnaký kľúč ako v Resources.
4. **User search je klientský.** Option `vmwareNamePrefix` sa z hooku odstráni. `RecoveryGroupResourcesStep` prestane posielať `searchValue`/`onSearchChange`, takže `ResourceSidebar` použije svoj existujúci klientský search (case-insensitive `includes`) nad už ohraničeným výsledkom. Search nikdy nemení request.
5. **IBM Power prefix lokálne.** `partitions.filter(p => p.partitionName.startsWith(prefix))` beží v `select` pred `getResourceNames` a `getVmMetadataByName`. Query key ostáva `powerInventoryQuery(providerId)` (zdieľaná cache), filter je iba v `select`. `vmTags` sa pre Power ignorujú (nefiltruje sa, nemapuje sa na iné pole).
6. **UI: iba schválený Variant A, malý lokálny komponent** `RecoveryGroupProviderScope.tsx` v `recovery-groups/components`. Celý scope riadok sa renderuje iba v `SelectableCard.supportingContent`. Nevznikne žiadny samostatný blok „Discovery scope“ a scope sa nepresúva do pätičky ani do `meta`.

   ```text
   Provider name
   Provider description

   (FilterIcon) [ VM name TEST-* ] [ VM tag WEB ] [ +2 ]

   VMWARE · 10.99.99.40
   ```

   - **Filter ikona:** pred chipmi je `<FilterIcon aria-hidden="true" className="size-3 shrink-0 text-accent" />` z `src/shared/icons/Icons.tsx`. Je iba dekoratívna, nie je to button, nemá tooltip ani žiadnu interakciu.
   - **Chipy** vizuálne vychádzajú z `VmwareProviderFilterSummary`, ale bez prefixu `▼ label:`, s `truncate` + `title` a s `bg-surface` namiesto `bg-accent-soft` (čitateľnosť na vybranej karte). `VmwareProviderFilterSummary` sa nemení (Resources UI je mimo scope).
   - **VMware:** `VM name {prefix}*`, `VM tag {prvý neprázdny tag}`, `+N` pre ďalšie neprázdne tagy (pozri rozhodnutie 7).
   - **IBM Power:** iba `VM name {prefix}*`. Tag sa nezobrazí, lebo Power inventory ho nevie vynútiť.
   - **Bez zobraziteľného scope:** komponent vráti `null` a `supportingContent` sa neodovzdá. Nevyrenderuje sa teda ani filter ikona.
7. **Význam `+N` (uzavreté rozhodnutie).** Vynúteným VMware filtrom je iba prvý neprázdny tag (`resolveVmwareProviderFilter()`). Ďalšie tagy sú iba nakonfigurované metadáta providera.
   - Prvý neprázdny tag sa zobrazí ako `VM tag`.
   - `N` je počet ďalších neprázdnych trimnutých nakonfigurovaných tagov.
   - Vizuál chipu ostáva `+N`. Jeho `title` aj sr-only text explicitne povedia, že VM filtrovanie používa iba prvý tag.
8. **Locales:** reuse `pages.virtualMachines.inventory.vmName`, `.vmTag`, `.providerFilter` (aria-label skupiny). Nový je iba `pages.recoveryGroupBuilder.provider.scope.moreTags` (title + sr-only text pre `+N`):
   - en: `{{count}} additional configured tags; only the first tag is used for VM filtering.`
   - sk: `{{count}} ďalšie nakonfigurované tagy; na filtrovanie VM sa používa iba prvý tag.`
   - cs: `{{count}} další nakonfigurované tagy; k filtrování VM se používá pouze první tag.`
9. **Edit existujúcej skupiny:** selected list = `draft.resources` z `initialData`, nič sa nepruneuje. Available list = scope. Mimo-scope položky sa nedajú pridať, lebo drag/add ide iba zo sidebaru.

## Task list

### Fáza 1: Variant A UI
- [x] Task 1: Provider scope riadok Variantu A (dekoratívna `FilterIcon` + chipy) na provider karte

### Checkpoint A
- [x] Focused testy ProviderStep zelené, typecheck, eslint na zmenených súboroch

### Fáza 2: Vynútenie scope v inventory
- [x] Task 2: VMware fixed scope v hooku + klientský user search v Resources kroku
- [x] Task 3: IBM Power prefix v hooku
- [x] Task 4: Builder odovzdá scope vybraného providera, edit a provider-change správanie

### Checkpoint B (finálny)
- [x] Všetky focused testy, `npm run typecheck`, `node scripts/orval/check-feature-layout.mjs`, eslint na zmenených TS/TSX, `git diff --check`
- [ ] Review s človekom. Bez commitu a pushu (pokyn používateľa).

## Riziká a mitigácie

| Riziko | Dopad | Mitigácia |
|---|---|---|
| Návrat VMware user searchu zo server-side na klientský obráti rozhodnutie z `recovery-group-vm-server-search-plan.md`. Mení sa sémantika z prefixu na substring (case-insensitive) a načíta sa celý scoped inventory providera. | Stredný | Je to explicitná požiadavka (scope nesmie byť obídený). `/vms/search` nestránkuje, takže klientský search vidí celý ohraničený výsledok. Staré testy server searchu sa vedome prepíšu. |
| Fixný `namePrefix` v `useVmwareResourceInventory` sa pri mounte debounceuje 300 ms, kým sa nastaví `isSearching`. | Nízky | Rovnako sa správa Resources. Shared hook sa v tomto tasku nemení. Testy použijú `waitFor`. Ak to bude v UI rušiť, rieši sa samostatne. |
| Provider record v edit móde ešte nie je načítaný, takže hrozí únik neohraničeného inventory. | Vysoký | Rozhodnutie 2: query disabled pri `providerScope === undefined` plus test. |
| Provider bol zmazaný a `providerScope` ostane `undefined`, takže inventory sa nenačíta. | Nízky | Bez providera by request aj tak nemal zmysel. Ostane loading stav. Pozri otvorenú otázku 1. |
| `+N` môže naznačovať, že platia všetky tagy, hoci filtrovanie používa iba prvý. | Nízky | Rozhodnutie 7: title aj sr-only text explicitne uvádzajú, že VM filtrovanie používa iba prvý tag. Pokryté testom. |
| Case-sensitivity: Power `startsWith` je case-sensitive (podľa zadania), VMware `name_prefix` závisí od backendu. | Nízky | Zdokumentované. Bez zmeny backendu. |

## Otvorené otázky

1. Ak edit skupiny odkazuje na providera, ktorý už neexistuje, má Resources krok zobraziť explicitnú chybu namiesto nekonečného loadingu? Predvolene sa to v tomto tasku nerieši (mimo scope).
