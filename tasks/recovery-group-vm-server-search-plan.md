# Implementačný plán: server-side VMware name search v Recovery Groups

## 1. Cieľ

Presunúť vyhľadávanie VMware VM podľa názvu v kroku **Recovery Group → Resources** z dnešného klientského filtrovania nad už načítaným zoznamom na rovnaký server-side flow, ktorý používa stránka **Resources → VMware**:

```text
search input
  -> raw namePrefix
  -> 300 ms debounce
  -> canonical TanStack Query key
  -> POST /api/vms/search?provider_id=<provider>
  -> body { "name_prefix": "..." }
  -> server response
  -> Recovery Group resource list
```

Implementácia má znovu použiť existujúci `useVmwareResourceInventory` a existujúci `fetchVmwareInventory`; nesmie vzniknúť druhý debounce, druhý VMware request wrapper ani nová query-key schéma.

Tento dokument je iba plán. Produkčný kód sa v tejto fáze nemení.

## 2. Overený aktuálny stav

### Recovery Group dnes

`RecoveryGroupResourcesStep` volá:

```text
useRecoveryGroupResourceInventory(workloadType, providerId)
```

Pre VMware `useRecoveryGroupResourceInventory` používa:

```text
discoveryInventoryKeys.vmwareSearch({ providerId })
fetchVmwareInventory({ providerId })
```

Teda už používa kanonický endpoint `POST /vms/search`, ale bez `name_prefix`.

Vyhľadávací input je vo `ResourceSidebar`. Ten si drží vlastný `search` state a výsledky filtruje lokálne:

```text
item.toLowerCase().includes(search.toLowerCase())
```

Backend pri zmene textu nie je znovu volaný.

### Resources → VMware dnes

`VmwareResourcesPage` odovzdáva `query.search` do:

```text
useVmwareResourceInventory({
  providerId,
  namePrefix: query.search,
  ...
})
```

`useVmwareResourceInventory` už poskytuje:

- normalizáciu vstupu,
- 300 ms debounce pre `namePrefix`,
- `discoveryInventoryKeys.vmwareSearch(...)`,
- provider-scoped cache,
- previous-data správanie iba v rámci rovnakého providera,
- potlačenie starej chyby počas debounce,
- `POST /vms/search` s `name_prefix`,
- oddelenie initial/background loading,
- štandardný `refetch()` a samostatný force-refresh flow.

Toto je cieľový VMware search lifecycle aj pre Recovery Groups.

## 3. Dôležitá zmena používateľskej semantiky

Dnešný Recovery Group search je klientský **substring** filter (`includes`). Cieľový Resources VMware flow používa backendový **`name_prefix`**.

Príklad:

```text
VM: PROD-DB-01
search: DB
```

Dnes môže `DB` VM nájsť, pretože je uprostred názvu. Po migrácii bude výsledok závisieť od backendovej `name_prefix` semantiky a táto VM typicky nebude patriť do prefixu `DB`.

Toto je zámerná zmena potrebná na zosúladenie Recovery Groups s Resources VMware. FE nebude po serverovej odpovedi znovu aplikovať starý substring filter pre VMware.

## 4. Scope

### In scope

- VMware VM name search v `RecoveryGroupResourcesStep`.
- Reuse existujúceho `useVmwareResourceInventory` vrátane 300 ms debounce.
- Reuse existujúceho canonical `vmwareSearch` TanStack Query key.
- Controlled/server-side search mód pre shared `ResourceSidebar`.
- Zachovanie klientského search správania pre IBM Power a FlashSystem.
- Zachovanie VM metadata pri viacerých serverových vyhľadávaniach.
- Focused unit/component/integration testy.

### Out of scope

- Backend alebo OpenAPI zmeny.
- Zmena `POST /vms/search` kontraktu.
- Tag/folder UI v Recovery Group resource picker-i.
- Force refresh v Recovery Group picker-i.
- Pagination alebo virtualizácia resource picker-a.
- Server-side search pre IBM Power alebo FlashSystem.
- Zmena Resources / Resources ISE správania.

## 5. Architektonické rozhodnutia

1. **Recovery Groups znovu použijú `useVmwareResourceInventory`.**
   Debounce, query key, cache a request lifecycle sa nebudú kopírovať do recovery feature.

2. **`ResourceSidebar` dostane opt-in server search mód.**
   Default zostane dnešný klientský mód, aby sa nezmenil Recovery Application sidebar ani IBM Power/FlashSystem picker.

3. **Server mód bude controlled.**
   Parent vlastní search value a callback. `ResourceSidebar` v tomto móde iba renderuje serverom vrátené položky a nebude na ne aplikovať `includes()`.

4. **VMware search value nebude súčasť Recovery Group draftu.**
   Je to dočasný UI/search state, nie doménová konfigurácia recovery group.

5. **Selected resources ostávajú nezávislé od aktuálneho search výsledku.**
   Zmena search nesmie odstrániť už vybrané VM z `ResourceSelectionCard`.

6. **VM metadata sa budú naďalej merge-ovať.**
   `RecoveryGroupBuilder.handleMetadataAvailable` už používa merge:

   ```text
   { ...current.vmMetadataByName, ...metadata }
   ```

   Preto partial server výsledky z jednotlivých searchov nesmú zmazať metadata VM získané v predchádzajúcom searchi.

7. **Žiadne nové API alebo generated súbory.**
   `fetchVmwareInventory({ providerId, namePrefix })` a OpenAPI/Orval cesta už existujú.

## 6. Cieľový tok

```text
RecoveryGroupResourcesStep
        |
        | raw VMware search text
        v
useRecoveryGroupResourceInventory(
  workloadType,
  providerId,
  { vmwareNamePrefix }
)
        |
        +---------------- VMware ----------------+
        |                                         |
        v                                         |
useVmwareResourceInventory                        |
        |                                         |
        | 300 ms debounce                         |
        v                                         |
discoveryInventoryKeys.vmwareSearch({             |
  providerId,                                     |
  namePrefix: debouncedPrefix                     |
})                                                |
        |                                         |
        v                                         |
fetchVmwareInventory({ providerId, namePrefix })  |
        |                                         |
        v                                         |
POST /api/vms/search                              |
body { name_prefix: "..." }                      |
        |                                         |
        +-----------------------------------------+
        |
        v
map VM names + RecoveryGroupVmMetadata
        |
        v
ResourceSidebar searchMode="server"
```

IBM Power a FlashSystem zostanú na existujúcom `useQuery` + klientskom `ResourceSidebar` filtrovaní.

## 7. Dependency graph

```text
Task 1: ResourceSidebar server-search contract
                 |
                 v
Task 2: Recovery Group VMware query reuse
                 |
                 v
Task 3: Recovery Group UI wiring
                 |
                 v
Task 4: Regression + network verification
```

Úlohy sú zámerne sekvenčné: UI wiring potrebuje nový sidebar contract a recovery hook musí mať stabilný search interface pred napojením komponentu.

---

## Task 1: Pridať controlled server-search mód do `ResourceSidebar`

**Description:** Rozšíriť shared sidebar tak, aby vedel fungovať v dvoch režimoch: dnešný default client-side filter a opt-in server-side search. Server mód musí parentovi odovzdávať raw search text a renderovať položky presne tak, ako ich poskytne serverový query výsledok.

**Acceptance criteria:**

- [ ] Existujúci caller bez nových props stále používa dnešný case-insensitive `includes()` filter.
- [ ] Server-search mód používa controlled search value + `onSearchChange` a nefiltruje `items` lokálne podľa search textu.
- [ ] Deduplication, sorting, drag behavior, loading/error/no-match stavy ostanú funkčné v oboch režimoch.

**Verification:**

- [ ] Rozšíriť `ResourceSidebar.test.tsx` o controlled server search.
- [ ] Overiť, že server mód zavolá `onSearchChange` pri písaní.
- [ ] Overiť, že server mód nezahodí položku iba preto, že ju lokálny `includes()` nezhoduje.
- [ ] Spustiť:

  ```text
  npm exec vitest run src/shared/components/resource-sidebar/ResourceSidebar.test.tsx
  ```

**Dependencies:** None.

**Files likely touched:**

- `src/shared/components/resource-sidebar/ResourceSidebar.tsx`
- `src/shared/components/resource-sidebar/ResourceSidebar.test.tsx`

**Estimated scope:** Small — 2 files.

---

## Task 2: Reuse `useVmwareResourceInventory` v Recovery Group inventory hooku

**Description:** Upraviť `useRecoveryGroupResourceInventory`, aby VMware vetva nepoužívala vlastný generický `useQuery` request, ale existujúci `useVmwareResourceInventory`. Hook dostane pomenovaný options vstup pre `vmwareNamePrefix` a `enabled`; IBM Power a FlashSystem ostanú na dnešnom flow.

**Acceptance criteria:**

- [ ] VMware vetva odovzdá `providerId`, raw `vmwareNamePrefix` a `enabled` do `useVmwareResourceInventory`.
- [ ] Recovery hook nevytvorí vlastný debounce ani vlastný VMware query key.
- [ ] VMware query výsledok sa namapuje na existujúci `{ resourceNames, vmMetadataByName }` contract.
- [ ] IBM Power a FlashSystem requesty, keys a metadata mapping zostanú nezmenené.
- [ ] Bez providera sa nevykoná VMware ani non-VMware request.
- [ ] Rovnaký provider + prefix používa rovnakú VMware cache identitu ako Resources page.

**Verification:**

- [ ] Aktualizovať `useRecoveryGroupResourceInventory.test.tsx` tak, aby overil delegovanie VMware vetvy na `useVmwareResourceInventory`.
- [ ] Overiť mapping názvov a metadata z VMware výsledku.
- [ ] Zachovať Power/FlashSystem testy a no-provider test.
- [ ] Spustiť spolu recovery hook test a existujúce canonical VMware lifecycle testy:

  ```text
  npm exec vitest run \
    src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx \
    src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx
  ```

**Dependencies:** Task 1 nie je technická závislosť hooku, ale Task 2 musí byť hotový pred Task 3.

**Files likely touched:**

- `src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.ts`
- `src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx`

**Estimated scope:** Medium — 2 files, ale mení query lifecycle.

---

## Checkpoint A: Data flow

- [ ] `useVmwareResourceInventory` zostáva jediným vlastníkom VMware name debounce.
- [ ] 300 ms debounce testy zostávajú zelené.
- [ ] `name_prefix` je stále súčasť canonical query key.
- [ ] Recovery Group hook nevytvára paralelný `fetchVmwareInventory` name-search flow.
- [ ] IBM Power a FlashSystem testy ostávajú zelené.

---

## Task 3: Napájať Recovery Group search input na serverový VMware query

**Description:** `RecoveryGroupResourcesStep` bude pre VMware držať controlled search state, odovzdávať ho do recovery inventory hooku a pre `ResourceSidebar` zapne server-search mód. Pre IBM Power a FlashSystem ostane sidebar v dnešnom klientskom režime.

**Acceptance criteria:**

- [ ] Pri VMware workload type sa text zo search inputu odovzdáva ako `vmwareNamePrefix` do recovery inventory hooku.
- [ ] Component sám nedebouncuje; raw text odovzdá existujúcemu VMware hooku.
- [ ] VMware `ResourceSidebar` neaplikuje starý substring filter nad server response.
- [ ] IBM Power a FlashSystem stále filtrujú lokálne bez nového server requestu pri písaní.
- [ ] Search state sa nesmie preniesť na iný provider/workload tak, aby vznikol request s prefixom patriacim predchádzajúcemu scope.
- [ ] Už vybrané VM ostanú v selected paneli pri každej zmene searchu.
- [ ] Metadata z nového výsledku sa ďalej posielajú cez `onMetadataAvailable`; predtým získané metadata sa v builderi nestratia.

**Verification:**

- [ ] Rozšíriť `RecoveryGroupResourcesStep.test.tsx` o VMware search input → hook options assertion.
- [ ] Overiť, že server mode sa použije iba pre VMware.
- [ ] Overiť Power/Flash local filtering regresiu.
- [ ] Overiť selected-resource stabilitu počas search zmien.
- [ ] Podľa potreby pridať focused assertion do `RecoveryGroupBuilder.test.tsx` na metadata merge alebo provider/search scope reset; produkčný builder meniť iba ak test odhalí potrebu.
- [ ] Spustiť:

  ```text
  npm exec vitest run \
    src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.test.tsx \
    src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx
  ```

**Dependencies:** Tasks 1–2.

**Files likely touched:**

- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.test.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx` iba ak bude potrebný integračný regression test

**Estimated scope:** Medium — 2–3 files.

---

## Checkpoint B: End-to-end Recovery Group behavior

- [ ] Otvorenie VMware resource stepu bez searchu používa provider-only canonical query.
- [ ] Písanie `W`, `WE`, `WEB` nevytvorí request pre medzihodnoty pred uplynutím debounce.
- [ ] Po 300 ms vznikne canonical request s `name_prefix: "WEB"`.
- [ ] Search výsledok nie je znovu substring-filtrovaný vo `ResourceSidebar`.
- [ ] Vymazanie searchu sa vráti na provider-only query.
- [ ] Prepnutie providera nemôže odoslať starý prefix do nového provider scope.
- [ ] Vybrané VM a ich už získané metadata zostanú zachované.

---

## Task 4: Focused regresia a manuálna network kontrola

**Description:** Overiť feature cez focused testy a browser/network inspection bez rozširovania scope. Táto úloha nemá pridávať nový produkčný kód, pokiaľ regression test neodhalí konkrétny problém spôsobený Tasks 1–3.

**Acceptance criteria:**

- [ ] Shared sidebar default behavior sa nezmenil pre existujúcich callerov.
- [ ] Recovery Application sidebar stále používa client-side search.
- [ ] IBM Power a FlashSystem v Recovery Group stále používajú klientský filter.
- [ ] VMware Recovery Group používa rovnaký `useVmwareResourceInventory` lifecycle ako Resources.
- [ ] Žiadne ručné OpenAPI/generated súbory nie sú zmenené.

**Verification:**

1. Focused Vitest:

   ```text
   npm exec vitest run \
     src/shared/components/resource-sidebar/ResourceSidebar.test.tsx \
     src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx \
     src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.test.tsx \
     src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx \
     src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx
   ```

2. Focused ESLint nad zmenenými `.ts/.tsx` súbormi.

3. Typecheck:

   ```text
   npm run typecheck
   ```

4. Diff validation:

   ```text
   git diff --check
   ```

5. Manual browser/network check:

   - Recovery Group → VMware → Resources.
   - Vybrať provider.
   - Do search napísať `WEB` rýchlo po znakoch.
   - Pred 300 ms nesmie vzniknúť request pre `W` ani `WE`.
   - Po settled debounce očakávať jeden request:

     ```text
     POST /api/vms/search?provider_id=<id>
     { "name_prefix": "WEB" }
     ```

   - Vymazať search a overiť provider-only request s prázdnym filter body.
   - Zmeniť search viackrát a potvrdiť, že už selected VM zostáva v pravom paneli.
   - Pre IBM Power/FlashSystem overiť, že písanie do searchu nevytvára nový backend request.

**Dependencies:** Tasks 1–3.

**Files likely touched:** None beyond regression fixes directly spôsobených touto feature.

**Estimated scope:** Small.

---

## 8. Finálne acceptance criteria

- [ ] Recovery Group VMware name search už nefiltroje celý provider inventory iba klientsky.
- [ ] VMware search používa `POST /vms/search` s `name_prefix`.
- [ ] Debounce je presne ten existujúci 300 ms lifecycle z `useVmwareResourceInventory`.
- [ ] Recovery Groups a Resources zdieľajú canonical VMware query key/cache pre identický provider + prefix.
- [ ] ResourceSidebar server mód nevykonáva secondary substring filter.
- [ ] IBM Power, FlashSystem a ostatní `ResourceSidebar` calleri zostanú na dnešnom client-side filtrovaní.
- [ ] Selected resources a nazbierané VM metadata ostávajú stabilné pri zmene searchu.
- [ ] Žiadny nový API wrapper, query-key factory, debounce helper ani OpenAPI/generated patch nevznikne.
- [ ] Focused testy, focused lint, typecheck a `git diff --check` prejdú.

## 9. Riziká a mitigácie

| Riziko | Impact | Mitigácia |
|---|---|---|
| Zmena `includes` na `name_prefix` zmení výsledky searchu | High | Explicitne akceptovať Resources VMware semantiku a overiť ju v network teste |
| Shared `ResourceSidebar` zmení ostatné callery | High | Nový server mód je opt-in; default ostáva dnešný client filter |
| Recovery hook duplikuje debounce/query logic | High | Delegovať VMware vetvu priamo na `useVmwareResourceInventory` |
| Search z providera A sa použije pri providerovi B | High | Controlled search scope resetovať synchronne pri zmene provider/workload identity |
| Partial search response prepíše metadata iných VM | Medium | Zachovať existujúci builder metadata merge; pridať regression assertion |
| Previous-data počas debounce zobrazuje starý candidate set | Medium | Zachovať lifecycle Resources VMware; server sidebar nesmie predstierať nový finálny result |
| Power/Flash search začne omylom volať backend pri každom znaku | Medium | Server mód aktivovať iba pre `vmware_virtual_machines`; testovať ostatné vetvy |
| Vznikne odlišná cache od Resources | High | Použiť priamo `useVmwareResourceInventory`, nie vlastný recovery VMware query |

## 10. Otvorené otázky

Žiadne blokujúce otázky. Plán predpokladá, že cieľom je **presne zosúladiť VMware name-search transport a lifecycle s Resources VMware**, teda používať backendový `name_prefix` namiesto dnešného Recovery Group substring filtra.
