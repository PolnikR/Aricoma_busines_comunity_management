# Implementačný plán: migrácia VMware inventára na `POST /vms/search`

## 1. Cieľ a hranice zmeny

Cieľom je odstrániť všetky ručne písané frontendové použitia deprecated VMware endpointov
`GET /vms`, `GET /vms_by_tag` a `GET /vms_by_name` a nahradiť ich jedinou
kanonickou cestou cez Orval funkciu `vmsSearchVmsSearchPost` pre
`POST /vms/search`.

Migrácia musí zachovať existujúci výsledný model `DiscoveryInventory`, 300 ms debounce
vyhľadávania podľa názvu, provider-scoped cache, loading/error/placeholder správanie,
klientské filtre, Resources/Resources ISE obrazovky, Infrastructure topológiu a výber
zdrojov v Recovery Groups. Vo finálnom stave nebude existovať frontendový fallback na
deprecated VM endpointy ani paralelná legacy implementácia.

Tento dokument je iba plán. Neobsahuje implementačné zmeny produkčného kódu.

## 2. Overený východiskový stav

Analýza bola vykonaná na branche `test`, HEAD `f41324d` (`chore: refresh discovery API contract`).
Pracovný strom bol pred vytvorením plánovacích artefaktov čistý.

### OpenAPI a generovaný klient

- `openapi/abco-api.json` definuje `POST /vms/search` s operation ID
  `vms_search_vms_search_post`.
- Query parameter `provider_id` je voliteľný.
- Request body `VmSearchFilter` podporuje voliteľné `folder_name`, `tag`,
  `name_prefix` a `force_refresh`.
- Odpoveď je `VmsResponse`, teda rovnaký kontrakt, ktorý už mapuje
  `mapVmwareInventory`.
- Generovaný klient v `src/generated/api/client.gen.ts` už obsahuje
  `vmsSearchVmsSearchPost(body, params, options)` a pri odovzdaní `{}` odošle explicitné
  JSON telo `{}`.
- `GET /vms_in_folder`, `GET /vms`, `GET /vms_by_tag` a `GET /vms_by_name` sú v
  OpenAPI označené ako deprecated. Generované symboly sa ručne nemažú, kým zostávajú
  súčasťou OpenAPI contractu.
- Používateľ potvrdil implementačnú semantiku backendu: `folder_name`, `tag` a
  `name_prefix` sa v `POST /vms/search` kombinujú pomocou logického AND.

### Autentifikácia a transport

- `src/shared/api/orvalMutator.ts` smeruje generované `/vms/search` na
  `/api/vms/search`.
- `src/shared/api/apiClient.ts` obnovuje Keycloak token a uzamknuto pridáva
  `Authorization` a `X-User`.
- Nový wrapper preto nesmie ručne vytvárať tieto hlavičky ani používať priamy `fetch`.

### Aktuálni konzumenti

- `src/features/discovery-inventory/resources/api/vmwareInventoryApi.ts` vetví medzi
  `vmsVmsGet` a `vmsByTagVmsByTagGet`.
- `src/features/discovery-inventory/resources/api/vmsByNameApi.ts` samostatne používa
  `vmsByNameVmsByNameGet`.
- `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.ts`
  používa tri odlišné fetch/key cesty. Name-only vetva má 300 ms debounce; kombinácia
  tag + názov dnes posiela iba tag a názov filtruje lokálne.
- `src/features/discovery-inventory/resources/hooks/useVmsByName.ts` nemá žiadneho
  runtime konzumenta mimo vlastného testu.
- Ne filtrovaný VMware inventár používajú aj
  `useInfrastructureInventory`, `useRecoveryGroupResourceInventory` a generický
  `fetchInventory` dispatcher.
- Resources aj Resources ISE zdieľajú `VmwareResourcesPage`, takže zmena v tomto
  spoločnom komponente pokryje source aj target obrazovku.
- `API_ENDPOINTS.discovery.virtualMachines` a `virtualMachinesByTag` nie sú v
  produkčnom kóde konzumované; Orval klient vlastní URL inventára.

### Cache a refresh

- VMware údaje dnes používajú viac key factories: `inventory`, `vmsByName`,
  `rawVmsByName` a pre Infrastructure aj všeobecný `resourceInventory` key.
- Globálna cache politika v `src/shared/query/cachePolicy.ts` používa 15-minútový
  `staleTime`, 60-minútový `gcTime` a štandardné refetch pravidlá.
- Toolbar refresh v `VmwareResourcesPage` volá obyčajný `query.refetch()`.
- `forceRefresh` nebude súčasťou query key. Kanonický API vstup ho bude podporovať,
  ale táto migrácia ho nepripojí k UI refreshu a nemení globálnu cache politiku.

## 3. Explicitné rozdiely a rozhodnutia

1. **Pôvodná hybridná kombinácia tag + názov sa nezachová.** Backendové AND bolo
   potvrdené, preto sa oba normalizované filtre odošlú v jednom requeste a oba budú v
   query key.
2. **Query key reprezentuje celý skutočný serverový request.** Obsahuje normalizované
   `providerId`, `folderName`, `tag` a debouncovaný `namePrefix`; neobsahuje
   `forceRefresh`.
3. **`folderName` nemá aktuálne UI.** Bude podporovaný v kanonickom API vstupe a key
   factory a pokrytý unit testami, ale nevznikne nový filter ani ovládací prvok.
4. **Refresh nebude znamenať `force_refresh: true`.** Prompt vyžaduje zachovať bežný
   refetch, pokiaľ produktová špecifikácia výslovne nevyžaduje live backend fetch.
   Aktuálny UI kontrakt takú požiadavku neobsahuje.
5. **UI text hovorí o hľadaní názvu, hostname alebo IP, ale aktuálny tok používa
   prefix názvu VM.** Táto migrácia zachová existujúce efektívne správanie
   `namePrefix`; rozšírenie fulltextového vyhľadávania nie je súčasťou scope.
6. **Deprecated symboly zostanú v generovanom klientovi.** Cleanup sa týka iba
   ručne písaného kódu. Zdrojom generovaného klienta je stále OpenAPI.
7. **Existujúce `tasks/plan.md` a `tasks/todo.md` patria inej funkcionalite.** Preto
   sa tento plán zapisuje do samostatných pomenovaných súborov a existujúce artefakty
   sa neprepisujú.

## 4. Navrhovaný cieľový tok

```text
Resources / Resources ISE ─┐
Infrastructure topology ───┼─> canonical VMware search query key
Recovery Groups ───────────┤      (provider, folder, tag, debounced prefix)
generic fetchInventory ────┘
                                  │
                                  v
                         canonical VMware search wrapper
                                  │
                                  v
                  Orval vmsSearchVmsSearchPost({}, params)
                                  │
                                  v
                         POST /api/vms/search
```

`forceRefresh` môže zmeniť vykonanie requestu, ale nie identitu dát v cache. Preto sa
nenachádza v key. Pre aktuálne UI sa neodovzdáva a backend použije štandardnú discovery
cache.

## 5. Poradie implementácie

### Úloha 1 — Zaviesť kanonický normalizovaný VMware search kontrakt

**Veľkosť:** M
**Závislosti:** žiadne

**Súbory:**

- upraviť `src/features/discovery-inventory/resources/api/vmwareInventoryApi.ts`
- upraviť VMware sekciu v
  `src/features/discovery-inventory/resources/api/resourceInventoryApi.test.ts`

**Postup:**

1. Definovať jeden vstupný typ pre `providerId`, `folderName`, `tag`, `namePrefix` a
   `forceRefresh`.
2. Zaviesť jednu normalizačnú funkciu: stringy orezať, prázdne hodnoty previesť na
   `undefined` a `forceRefresh` ponechať ako execution option.
3. Zaviesť kanonický wrapper nad `vmsSearchVmsSearchPost`:
   - `providerId` mapovať na query parameter `provider_id`,
   - `folderName`, `tag`, `namePrefix`, `forceRefresh` mapovať na snake_case body,
   - pri žiadnych filtroch odoslať explicitné `{}`,
   - výsledok validovať cez existujúci `VmsResponse` Zod kontrakt,
   - výsledok mapovať cez `mapVmwareInventory`,
   - zachovať existujúcu doménovú HTTP error správu a `cause`.
4. Nepoužiť priamy `fetch`, manuálne auth hlavičky ani ručne písanú URL.

**Akceptačné kritériá:**

- Jeden wrapper pokrýva unfiltered, provider-only, jednotlivé filtre aj kombináciu
  `folder + tag + namePrefix`.
- Kombinované filtre sa posielajú v jednom POST requeste.
- Prázdne/whitespace hodnoty nemenia request.
- Nevalidná odpoveď a HTTP chyba zachovajú dnešné chybové správanie.

**Testy a verification:**

- Rozšíriť priame API testy o metódu POST, URL `/api/vms/search`, `Content-Type`, body
  `{}`, provider query parameter, každý filter, všetky AND filtre, normalizáciu,
  `force_refresh`, mapovanie, 400/500 a nevalidnú schému.
- Spustiť:
  `npm exec vitest run src/features/discovery-inventory/resources/api/resourceInventoryApi.test.ts`

### Úloha 2 — Zjednotiť VMware query key podľa serverového requestu

**Veľkosť:** S
**Závislosti:** Úloha 1

**Súbory:**

- upraviť `src/features/discovery-inventory/resources/api/resourceInventoryQueryKeys.ts`
- upraviť `src/features/discovery-inventory/resources/api/resourceInventoryQueryKeys.test.ts`

**Postup:**

1. Zaviesť `vmwareSearch` key factory, ktorá používa rovnakú normalizáciu ako API
   wrapper.
2. Stabilne zoradiť identitu ako `providerId`, `folderName`, `tag`, `namePrefix`;
   chýbajúce hodnoty reprezentovať jednotne pomocou `null`.
3. `forceRefresh` zámerne vynechať.
4. Nezavádzať aliasy alebo druhú alternatívnu key factory pre rovnaké dáta.

**Akceptačné kritériá:**

- Rovnaký normalizovaný serverový request vytvorí rovnaký key.
- Zmena ľubovoľného serverového filtra zmení key.
- Zmena iba `forceRefresh` key nezmení.
- Tag + debouncovaný prefix sú súčasne v key.

**Testy a verification:**

- Testovať prázdny vstup, whitespace normalizáciu, každý filter, kombináciu všetkých
  filtrov a ignorovanie `forceRefresh`.
- Spustiť:
  `npm exec vitest run src/features/discovery-inventory/resources/api/resourceInventoryQueryKeys.test.ts`

### Checkpoint A — API a cache kontrakt

- Spustiť oba test súbory z úloh 1–2 spolu.
- Skontrolovať, že produkčný wrapper importuje iba `vmsSearchVmsSearchPost` a nie
  deprecated Orval VM funkcie.
- Skontrolovať, že sa request body zostavuje na jednom mieste.

### Úloha 3 — Migrovať základný unfiltered fetch a ne-Resources konzumentov

**Veľkosť:** M
**Závislosti:** Úlohy 1–2

**Súbory:**

- upraviť `src/features/discovery-inventory/resources/api/resourceInventoryApi.ts`
- upraviť `src/features/discovery-inventory/resources/api/resourceInventoryApi.test.ts`
- upraviť
  `src/features/discovery-inventory/infrastructure/hooks/useInfrastructureInventory.ts`
- upraviť
  `src/features/discovery-inventory/infrastructure/hooks/useInfrastructureInventory.test.tsx`
- upraviť
  `src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.ts`
- upraviť
  `src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx`

**Postup:**

1. V generickom `fetchInventory` dispatcheri nahradiť VMware positional argumenty
   kanonickým objektom `{ providerId, tag }`; IBM Power a FlashSystem vetvy nemeníť.
2. Infrastructure VMware vetvu prepnúť na `POST /vms/search` s `{ providerId }` a
   `discoveryInventoryKeys.vmwareSearch({ providerId })`.
3. Recovery Groups VMware vetvu prepnúť na rovnaký wrapper a rovnaký key.
4. Overiť, že všetci traja konzumenti pri rovnakom providerovi zdieľajú identitu
   nefiltrovaného VMware inventára.

**Akceptačné kritériá:**

- Základný fetch bez filtrov používa výhradne `/api/vms/search` a body `{}` alebo
  provider-only variant podľa kontextu.
- Infrastructure a Recovery Groups používajú presne rovnaký VMware key ako ostatní
  konzumenti rovnakého serverového requestu.
- IBM Power a FlashSystem správanie a key ostávajú nezmenené.

**Testy a verification:**

- Aktualizovať očakávania mockov na objektový vstup a canonical key.
- Zachovať test no-provider/disabled správania.
- Spustiť:
  `npm exec vitest run src/features/discovery-inventory/resources/api/resourceInventoryApi.test.ts src/features/discovery-inventory/infrastructure/hooks/useInfrastructureInventory.test.tsx src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx`

### Úloha 4 — Migrovať zdieľaný Resources hook vrátane debounce a AND filtrov

**Veľkosť:** M
**Závislosti:** Úlohy 1–3

**Súbory:**

- upraviť `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.ts`
- zásadne aktualizovať
  `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx`

**Postup:**

1. Nahradiť vetvenie medzi troma API funkciami jediným kanonickým wrapperom.
2. Zachovať 300 ms debounce pre každý neprázdny `namePrefix`, aj keď je zároveň
   aktívny tag. Serverový request sa vykoná až pre settled kombináciu.
3. Vytvoriť query key z presne tých normalizovaných filtrov, ktoré idú na server:
   provider, optional folder, tag a debouncovaný prefix.
4. Pri `tag + namePrefix` poslať oba filtre backendu a odstrániť lokálny
   `startsWith` select.
5. Upraviť provider identifikáciu v `placeholderData` pre nový jednotný tvar key.
6. Zachovať dnešné pravidlá pre:
   - žiadny request bez enabled providera,
   - previous data iba v rámci rovnakého providera,
   - initial versus background loading,
   - potlačenie starej chyby počas debounce,
   - empty stav až po settled úspešnom requeste,
   - štandardný `refetch()` bez `forceRefresh`.

**Akceptačné kritériá:**

- Name-only aj tag + name vykonajú po 300 ms presne jeden settled POST request.
- Tag + name sú v request body aj query key.
- Rýchle zmeny prefixu nevytvoria request pre medzi hodnoty.
- Prepnutie providerov neukáže dáta predchádzajúceho providera.
- Návrat na čerstvý identický key využije cache bez nového requestu.

**Testy a verification:**

- Prepísať staré URL assertions na POST body assertions.
- Nahradiť test hybridného lokálneho filtrovania testom serverového AND requestu.
- Zachovať regresné testy debounce, retained data, error, retry, empty, provider
  switching, cache reuse a manual refetch.
- Pridať test, že `forceRefresh` nie je implicitne zapnutý.
- Spustiť:
  `npm exec vitest run src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx`

### Checkpoint B — Všetky runtime VMware dátové toky

- Spustiť spolu testy z úloh 3–4.
- Overiť, že Resources, Infrastructure a Recovery Groups pre rovnaký provider a
  rovnaké filtre používajú rovnakú cache identitu.
- Overiť request count s fake timers pre name-only aj tag + name.

### Úloha 5 — Zapracovať jednotný hook do Resources a Resources ISE

**Veľkosť:** S
**Závislosti:** Úloha 4

**Súbory:**

- upraviť
  `src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.tsx`
- upraviť
  `src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx`
- podľa dopadu iba aktualizovať očakávania v
  `src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx`
- podľa dopadu iba aktualizovať očakávania v
  `src/features/discovery-inventory/resources-ise/pages/ResourcesIsePage.test.tsx`

**Postup:**

1. Odovzdávať hooku jeden pomenovaný vstup namiesto nejasných positional argumentov.
2. Zachovať `getServerSideTagFilter`: backend prijíma jeden scalar tag, preto sa na
   server odošle iba presne jeden vybraný tag; viacnásobný/unsupported filter zostáva
   klientský.
3. Zachovať klientské filtre `powerState`, `connectionState`, `cluster`, `untagged`,
   pagination, detail drawer a filter options.
4. Zachovať provider fixed-filter pravidlá pre source aj target rolu.
5. Refresh tlačidlo ponechať na obyčajnom `refetch()`.

**Akceptačné kritériá:**

- Shared komponent poskytne rovnakú migráciu Resources aj Resources ISE bez
  duplicitnej implementácie.
- Provider prefix + provider tag sa odošlú spolu v jednom serverovom AND requeste.
- Unsupported filtre ostanú lokálne a výsledok sa ďalej stránkuje rovnako ako dnes.
- Loading skeleton, background loading, empty/error stav a drawer sa nezhoršia.

**Testy a verification:**

- Overiť argumenty hooku pre provider-only, name-only, tag-only a tag + name.
- Overiť source/target provider scope a fixed provider filtre.
- Overiť, že refresh neodosiela `force_refresh: true`.
- Spustiť:
  `npm exec vitest run src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx src/features/discovery-inventory/resources-ise/pages/ResourcesIsePage.test.tsx src/features/discovery-inventory/resources/helpers/filterVirtualMachines.test.ts`

### Úloha 6 — Odstrániť legacy frontendové vetvy a nepoužívané endpoint registry položky

**Veľkosť:** S
**Závislosti:** Úlohy 3–5

**Súbory:**

- odstrániť `src/features/discovery-inventory/resources/api/vmsByNameApi.ts`
- odstrániť `src/features/discovery-inventory/resources/api/vmsByNameApi.test.ts`
- odstrániť `src/features/discovery-inventory/resources/hooks/useVmsByName.ts`
- odstrániť `src/features/discovery-inventory/resources/hooks/useVmsByName.test.tsx`
- upraviť `src/features/discovery-inventory/resources/api/resourceInventoryQueryKeys.ts`
- upraviť `src/config/apiEndpoints.ts`
- upraviť `src/config/apiEndpoints.test.ts`

**Postup:**

1. Odstrániť samostatný name API wrapper a hook; runtime scan potvrdil, že hook nemá
   iného konzumenta.
2. Odstrániť staré `inventory`, `vmsByName` a `rawVmsByName` key factories až po
   migrácii všetkých ich konzumentov.
3. Odstrániť nepoužívané `virtualMachines` a `virtualMachinesByTag` z
   `API_ENDPOINTS.discovery`.
4. Nepridávať duplicitný `virtualMachineSearch` registry záznam, pokiaľ ho žiadny
   ručne písaný konzument nepoužíva; URL vlastní Orval.
5. Odstrániť iba importy a pomocný kód, ktoré sa stali nepoužívanými touto migráciou.

**Akceptačné kritériá:**

- V ručne písanom `src` kóde nie je import ani volanie deprecated VM API funkcie.
- Neexistuje paralelný name-only hook, fallback ani nepoužívaný legacy key.
- Generované súbory a OpenAPI zostanú nedotknuté.

**Testy a verification:**

- Spustiť `src/config/apiEndpoints.test.ts` a query-key test.
- Spustiť statický scan:
  `rg -n --glob '!src/generated/**' "vmsVmsGet|vmsByTagVmsByTagGet|vmsByNameVmsByNameGet|/vms_by_tag|/vms_by_name|/api/vms" src`
- Výsledok smie obsahovať iba nesúvisiace texty alebo explicitne vysvetlené testové
  fixture; v produkčnom VMware fetch toku musí byť nulový výskyt.

### Checkpoint C — Cleanup bez dead code

- Spustiť všetky priamo dotknuté API/hook/component testy.
- Spustiť `npm run typecheck`.
- Spustiť ESLint iba nad zmenenými `.ts`/`.tsx` súbormi.
- Skontrolovať import graph a nulové runtime referencie na odstránené moduly.

### Úloha 7 — Finálna regresná matica a repository verification

**Veľkosť:** M
**Závislosti:** Úlohy 1–6

**Súbory:** bez nového produkčného scope; upraviť len testy priamo odhalené regresiou

**Regresná matica:**

- unfiltered `{}` request,
- provider-only request,
- folder-only request na API/key úrovni,
- tag-only request,
- name-only request po 300 ms,
- provider + folder + tag + name v jednom AND requeste,
- filter normalization a stabilný key,
- `forceRefresh` v body, ale nie v key,
- disabled/no-provider bez requestu,
- cache reuse a provider isolation,
- retained data, background loading, error, retry a empty stav,
- Infrastructure VMware + IBM Power,
- Recovery Groups VMware + IBM Power + FlashSystem,
- Resources source + Resources ISE target,
- klientské unsupported filtre a pagination,
- normálny refresh bez implicitného force refresh.

**Verification príkazy v poradí:**

1. Focused Vitest nad všetkými explicitne uvedenými dotknutými test súbormi.
2. Focused ESLint nad zmenenými `.ts` a `.tsx` súbormi.
3. `npm run typecheck`.
4. `npm run api:check` — potvrdí súlad committed OpenAPI a generovaného výstupu.
5. `npm run build` — táto migrácia je cross-cutting a prompt výslovne vyžaduje
   finálnu build kontrolu; build spustí aj lint, typecheck, kompletný test suite a
   API check.
6. `git diff --check`.
7. Záverečný `rg` scan na deprecated handwritten VM endpointy/symboly.

**Akceptačné kritériá:**

- Všetky uvedené príkazy skončia exit kódom 0.
- Žiadna oprava testu neznižuje existujúce behavior assertions len preto, aby test
  prešiel.
- Nezmení sa generovaný klient, OpenAPI ani nesúvisiace provider/resource funkcionality.

### Úloha 8 — Atomický commit implementácie

**Veľkosť:** S
**Závislosti:** Úloha 7

**Postup:**

1. Skontrolovať `git status` a staged diff.
2. Stage-nuť iba súbory patriace migrácii.
3. Vytvoriť jeden atomický commit, napríklad
   `feat: migrate VMware inventory to search endpoint`.
4. Overiť čistotu pracovného stromu alebo explicitne oddeliť preexistujúce zmeny
   používateľa.

## 6. Závislosti medzi úlohami

```text
Úloha 1 (wrapper) ──> Úloha 2 (key)
          │                 │
          └────────┬────────┘
                   v
       Úloha 3 (base consumers)
                   │
                   v
       Úloha 4 (Resources hook)
                   │
                   v
       Úloha 5 (shared UI)
                   │
                   v
       Úloha 6 (legacy cleanup)
                   │
                   v
       Úloha 7 (full verification)
                   │
                   v
       Úloha 8 (atomic commit)
```

## 7. Finálne acceptance criteria

- Všetky ručne písané VMware inventory requesty idú výhradne cez
  `vmsSearchVmsSearchPost` na `POST /api/vms/search`.
- Unfiltered fetch explicitne odosiela `{}`; provider sa posiela cez `provider_id`.
- `folder_name`, `tag` a debouncovaný `name_prefix` sa posielajú v jednom body a
  backend ich vyhodnocuje ako AND.
- Existuje jeden normalizovaný vstup, jeden API wrapper a jedna canonical VMware
  query-key factory.
- Query key obsahuje provider, folder, tag a debouncovaný prefix; `forceRefresh`
  neobsahuje.
- 300 ms debounce, cache reuse, provider isolation, placeholder/loading/error/empty
  stavy a štandardný refetch zostanú funkčné.
- Resources aj Resources ISE používajú spoločnú implementáciu; Infrastructure,
  Recovery Groups a generický dispatcher sú migrované.
- Klientské filtre nepodporované serverom ostanú klientské.
- `vmsByNameApi`, `useVmsByName`, ich testy, staré key factories a nepoužívané VM
  endpoint registry položky sú odstránené.
- V ručne písanom produkčnom kóde nie sú deprecated VM importy, fallbacky ani dead
  code. Deprecated generované symboly ostanú iba ako dôsledok OpenAPI contractu.
- Focused testy, focused lint, typecheck, API check, plný build a statický cleanup
  scan prejdú.
- Implementácia je odovzdaná v jednom overenom atomickom commite.

## 8. Odhad náročnosti

Celková náročnosť: **stredná až vyššia, približne 2–4 pracovné dni** vrátane testov a
regresného overenia.

- API kontrakt, normalizácia a key: 0,5–1 deň.
- Migrácia konzumentov a hook lifecycle: 1–1,5 dňa.
- UI regresie, cleanup a finálna verification: 0,5–1,5 dňa.

Najväčšie riziko nie je samotný POST request, ale zachovanie React Query lifecycle
semantiky počas debounce, zdieľanie cache medzi troma obrazovkovými tokmi a odstránenie
legacy vetiev bez oslabenia testov.
