# OpenAPI update: discovery cache a zjednotené vyhľadávanie VM

## Účel dokumentu

Tento dokument zachytáva zmenu backendového API kontraktu stiahnutú príkazom
`npm run api:update` dňa 28. augusta 2026. Slúži ako stabilný referenčný bod
pre následnú migráciu frontendu. Vďaka nemu nie je potrebné spätne
rekonštruovať význam zmeny iba z rozsiahleho JSON a generovaného TypeScript
diffu.

Dokument opisuje kontrakt, ktorý sa nachádza v:

- `openapi/abco-api.json`;
- `src/generated/api/client.gen.ts`;
- `src/generated/api/models/*.gen.ts`;
- `src/generated/api/zod.gen.ts`.

Porovnávací základ je commit `7dccf2e` (`test`) pred spustením posledného
`api:update`. OpenAPI názov a verzia zostali nezmenené: `ABCo API`, verzia
`0.1.0`.

Tento krok ešte **nemigruje ručne písaný frontend** na nové endpointy. Najprv
ukladá backendový kontrakt a jeho dôsledky ako samostatný checkpoint.

## Súhrn rozsahu

| Oblasť | Pred aktualizáciou | Po aktualizácii | Rozdiel |
| --- | ---: | ---: | ---: |
| OpenAPI paths | 42 | 46 | +4 |
| OpenAPI schemas | 56 | 63 | +7 |
| Nové operácie | – | 5 | +5 |
| Novo deprecated operácie | – | 4 | +4 |
| Existujúce operácie rozšírené o `force_refresh` | – | 7 | +7 |

OpenAPI snapshot má oproti porovnávaciemu základu 811 pridaných a 24
odstránených riadkov. Väčšina ďalšieho diffu je deterministický Orval výstup.

Hlavné funkčné zmeny:

1. Pribudol jednotný `POST /vms/search` pre VMware inventory.
2. Pôvodné VMware endpointy `/vms`, `/vms_in_folder`, `/vms_by_tag` a
   `/vms_by_name` sú označené ako deprecated.
3. Backend zavádza discovery cache, jej konfiguráciu a históriu behov.
4. Inventory endpointy podporujú vynútenie živého načítania cez
   `force_refresh`.
5. Provider modely obsahujú cache nastavenie a nový provider typ `BACKEND`.
6. Pribudol endpoint pre access logy, zatiaľ však bez typovanej response
   schémy.

## 1. Zjednotený VMware endpoint `POST /vms/search`

### Identita operácie

| Vlastnosť | Hodnota |
| --- | --- |
| HTTP metóda | `POST` |
| Path | `/vms/search` |
| OpenAPI `operationId` | `vms_search_vms_search_post` |
| Orval funkcia | `vmsSearchVmsSearchPost` |
| Response | `VmsResponse` |
| Chybová response | `422 HTTPValidationError` |
| OpenAPI tag | `vCenter Inventory` |

### Query parameter

Endpoint prijíma voliteľný query parameter:

| Parameter | Typ | Povinný | Predvolená hodnota | Význam |
| --- | --- | --- | --- | --- |
| `provider_id` | `string` | nie | `vmware-vcenter-01` | VMware provider, z ktorého sa načíta inventory |

Frontend nemá spoliehať na backendovú predvolenú hodnotu tam, kde už pozná
vybraného providera. Explicitný `provider_id` chráni React Query cache aj UI
pred zmiešaním dát rôznych providerov.

### Request body `VmSearchFilter`

Request body je v OpenAPI voliteľný a nullable. Obsahuje:

| Pole | Typ | Povinné | Default | Význam |
| --- | --- | --- | --- | --- |
| `folder_name` | `string \| null` | nie | – | Filter podľa názvu VMware foldera |
| `tag` | `string \| null` | nie | – | Filter podľa VMware tagu |
| `name_prefix` | `string \| null` | nie | – | Case-sensitive prefix názvu VM |
| `force_refresh` | `boolean` | nie | `false` | Obíde discovery cache a vykoná živé načítanie |

Kontrakt umožňuje poslať viac filtrov v jednom requeste. OpenAPI schéma však
sama neurčuje, či backend kombinuje filtre striktne cez logické `AND`, ani ako
rozlišuje chýbajúce pole, `null` a prázdny reťazec. Pred zapojením kombinovaných
filtrov musí byť toto správanie potvrdené integračným testom proti backendu.

### Základné volanie bez filtrov

Prvý migračný rez použije iba providera a explicitne prázdny filter:

```http
POST /vms/search?provider_id=vmware-vcenter-01
Content-Type: application/json
X-User: admin

{}
```

Toto volanie má funkčne nahradiť pôvodné:

```http
GET /vms?provider_id=vmware-vcenter-01
X-User: admin
```

Response zostáva `VmsResponse`, preto existujúca runtime validácia cez Zod a
mapovanie do `DiscoveryInventory` môžu zostať zachované. V prvom reze sa mení
transport a testované request parametre, nie doménový model UI.

### Generovaný klient

Orval vytvoril funkciu s podpisom zodpovedajúcim tomuto tvaru:

```ts
vmsSearchVmsSearchPost(
  filter?: VmSearchFilter | null,
  params?: { provider_id?: string },
  options?: RequestOptions,
): Promise<VmsResponse>
```

Poradie argumentov je dôležité: request body je prvý argument, query params sú
druhý argument. Pri základnom fetchi sa preto má volať s `{}` ako prvým
argumentom a `{ provider_id }` ako druhým argumentom. Tým sa request správa
jednoznačne aj bez spoliehania na to, ako `JSON.stringify(undefined)` spracuje
mutátor.

## 2. Deprecated VMware endpointy

Backend zatiaľ endpointy neodstránil, ale v OpenAPI ich označil
`deprecated: true`. Orval preto pridáva `@deprecated` aj ku generovaným
funkciám.

| Deprecated endpoint | Generovaná funkcia | Doterajší účel | Náhrada |
| --- | --- | --- | --- |
| `GET /vms` | `vmsVmsGet` | Celé VMware inventory | `POST /vms/search` s `{}` |
| `GET /vms_in_folder` | `vmsInFolderVmsInFolderGet` | Filter podľa foldera | `POST /vms/search` s `folder_name` |
| `GET /vms_by_tag` | `vmsByTagVmsByTagGet` | Filter podľa tagu | `POST /vms/search` s `tag` |
| `GET /vms_by_name` | `vmsByNameVmsByNameGet` | Filter podľa prefixu | `POST /vms/search` s `name_prefix` |

Všetky štyri deprecated endpointy zároveň dostali voliteľný query parameter
`force_refresh: boolean = false`. Ten uľahčuje prechodné obdobie, ale frontend
ho nemá používať ako dôvod na predĺženie života deprecated implementácií.

### Aktuálne používanie vo frontende

Ručne písaný frontend aktuálne používa:

- `/vms` pre základný VMware inventory;
- `/vms_by_tag` pre serverový tag filter;
- `/vms_by_name` pre debounced vyhľadávanie podľa prefixu.

Pre `/vms_in_folder` nebol nájdený aktívny ručne písaný konzument. Jeho
generovaný klient zostáva prítomný iba preto, že endpoint je stále súčasťou
OpenAPI dokumentu.

Generovaný deprecated kód sa nemá mazať ručne. Definitívne zmizne až po
odstránení endpointov z backendového OpenAPI alebo po zámernom filtrovaní
operácií v Orval konfigurácii. Ručne písané importy a adaptéry sa však majú
odstraňovať okamžite po dokončení príslušného migračného rezu.

## 3. Discovery cache

Backend preberá zodpovednosť za cache zdrojových discovery dát. To je iná
vrstva než React Query cache vo frontende:

- discovery cache chráni backend a externé systémy pred drahým živým fetchom;
- React Query cache spravuje UI stav, deduplikáciu requestov, prechody medzi
  obrazovkami a zobrazovanie posledných úspešných dát.

Zavedenie backendovej cache preto nie je automatický dôvod odstrániť React
Query. Je však dôvod prehodnotiť dnešný globálny frontendový `staleTime` 15
minút, pretože čerstvosť zdrojových dát bude primárne určovať backend.

### `force_refresh` na existujúcich endpointoch

Nasledujúce existujúce operácie dostali voliteľný query parameter
`force_refresh: boolean = false`:

| Oblasť | Endpoint |
| --- | --- |
| VMware | `GET /vms` |
| VMware | `GET /vms_in_folder` |
| VMware | `GET /vms_by_tag` |
| VMware | `GET /vms_by_name` |
| FlashSystem | `GET /get_volumes` |
| FlashSystem topology | `GET /get_volume_tree` |
| IBM Power | `GET /get_power_vm` |

V novom `POST /vms/search` je `force_refresh` súčasťou JSON body, nie query
parametrov.

Budúce očakávané správanie UI:

- automatické načítanie, mount a bežný refetch používajú `force_refresh: false`;
- explicitná používateľská akcia Refresh použije jednorazovo
  `force_refresh: true`;
- hodnota `force_refresh` nemá vytvárať dve dlhodobé identity rovnakého
  inventory v React Query cache; ide o spôsob vykonania requestu, nie o
  doménový filter výsledku.

Toto správanie sa zavedie až v samostatnej cache etape, nie počas prvého
transportného rezu `/vms` → `/vms/search`.

## 4. Konfigurácia discovery cache

### `GET /discovery/cache/config`

| Vlastnosť | Hodnota |
| --- | --- |
| `operationId` | `get_cache_config_discovery_cache_config_get` |
| Orval funkcia | `getCacheConfigDiscoveryCacheConfigGet` |
| Response | `CacheConfigResponse` |

`CacheConfigResponse` obsahuje:

```ts
interface CacheConfigResponse {
  defaults: Record<string, number>
  history_retention: {
    retention_days: number
    max_records: number
  }
}
```

Kľúče `defaults` nie sú v OpenAPI obmedzené enumom. Z kontraktu preto nie je
zrejmé, či predstavujú provider typ, konkrétny provider, druh inventory alebo
iný backendový názov. Frontend nemá vytvárať konfiguračné UI, kým nebude význam
kľúčov potvrdený.

### `PUT /discovery/cache/config`

| Vlastnosť | Hodnota |
| --- | --- |
| `operationId` | `update_cache_config_discovery_cache_config_put` |
| Orval funkcia | `updateCacheConfigDiscoveryCacheConfigPut` |
| Request | povinný `CacheConfigUpdate` |
| Response | `CacheConfigResponse` |

Request umožňuje čiastočný update:

```ts
interface CacheConfigUpdate {
  defaults?: Record<string, number> | null
  history_retention?: {
    retention_days?: number | null
    max_records?: number | null
  } | null
}
```

OpenAPI neurčuje minimálne ani maximálne hodnoty pre intervaly, retention days
alebo max records. Frontendová validácia sa nemá vymýšľať bez potvrdenia
backendových pravidiel.

## 5. História discovery cache

### `GET /discovery/cache/history`

| Parameter | Typ | Povinný | Význam |
| --- | --- | --- | --- |
| `provider_id` | `string \| null` | nie | Obmedzí históriu na jedného providera |
| `limit` | `number \| null` | nie | Obmedzí počet vrátených behov |

Response `CacheHistoryResponse` obsahuje pole `runs` typu `CacheRunRecord[]`.

### `CacheRunRecord`

| Pole | Typ | Povinné | Význam |
| --- | --- | --- | --- |
| `provider_id` | `string` | áno | Identifikátor providera |
| `provider_type` | `string` | áno | Typ providera |
| `triggered_by` | enum | áno | Dôvod spustenia cache behu |
| `started_at` | `string` | áno | Začiatok behu |
| `duration_ms` | `integer` | áno | Trvanie v milisekundách |
| `success` | `boolean` | áno | Úspešnosť behu |
| `record_count` | `integer \| null` | nie | Počet načítaných záznamov |
| `error` | `string \| null` | nie | Technická chyba neúspešného behu |

Povolené hodnoty `triggered_by`:

- `stale` – backend vyhodnotil cache ako zastaranú;
- `forced` – volajúci vyžiadal živý refresh;
- `param_change` – zmenili sa parametre, ktoré určujú cache záznam.

Kontraktové nedostatky, ktoré treba pred UI integráciou potvrdiť alebo opraviť:

- `provider_type` je voľný `string`, nie existujúci enum `ProviderType`;
- `started_at` nemá OpenAPI formát `date-time`;
- `limit`, `duration_ms`, `record_count`, retention a intervaly nemajú uvedené
  hranice;
- pole `error` môže obsahovať technický text a nemá sa bez sanitizácie
  zobrazovať koncovému používateľovi.

## 6. Provider modely

### Nový provider typ `BACKEND`

Enum `ProviderType` sa zmenil z:

```text
VMWARE | FLASHCOPY | IBM_POWER | AIRFLOW | SMTP
```

na:

```text
VMWARE | FLASHCOPY | IBM_POWER | AIRFLOW | SMTP | BACKEND
```

Ide o aditívnu zmenu API, ale pre TypeScript a UI nemusí byť automaticky
kompatibilná. Frontend odvodzuje `PLATFORM_PROVIDER_TYPES` priamo z
generovaného Zod enumu. Po regenerovaní sa preto `BACKEND` automaticky objaví
medzi možnosťami formulára platformového providera.

Kontraktový test, ktorý overuje odvodenie zoznamu z OpenAPI, bol aktualizovaný
na šesť hodnôt vrátane `BACKEND`. Táto úprava potvrdzuje nový API kontrakt, ale
sama nerieši produktové rozhodnutie, či:

1. `BACKEND` je používateľom spravovateľný platformový provider a UI ho má
   podporovať; alebo
2. `BACKEND` je interný typ, ktorý sa musí dať prečítať z API, ale nemá sa
   zobrazovať v create/edit selecte.

Aktuálny formulár zobrazuje všetky hodnoty z generovaného enumu, takže do
vyriešenia tejto otázky bude zobrazovať aj `BACKEND`. Ak je typ interný, treba
v samostatnom reze oddeliť úplný API enum od zoznamu používateľsky voliteľných
typov.

### Nové provider polia

Do `Provider` a `ProviderRecord` pribudlo:

| Pole | Typ | Povinné |
| --- | --- | --- |
| `cacheRefreshSeconds` | `integer \| null` | nie |

Do `OrchestrationProvider` a `OrchestrationProviderRecord` pribudli:

| Pole | Typ | Povinné |
| --- | --- | --- |
| `cacheRefreshSeconds` | `integer \| null` | nie |
| `loggingEnabled` | `boolean \| null` | nie |
| `jwtEnabled` | `boolean \| null` | nie |

Žiadne existujúce provider pole nebolo odstránené a nové polia nie sú
povinné. Existujúce requesty preto typovo zostávajú platné. Frontend ich však
zatiaľ nevie konfigurovať ani cielene zobrazovať.

## 7. Access logy

### `GET /get_access_logs`

| Parameter | Typ | Default/hranice | Význam |
| --- | --- | --- | --- |
| `lines` | `integer` | default `200`, min `1`, max `5000` | Maximálny počet záznamov |
| `status` | `integer \| null` | bez hraníc | Filter HTTP statusu |
| `method` | `string \| null` | bez enumu | Filter HTTP metódy |
| `path_contains` | `string \| null` | – | Substring v request path |

Endpoint má `operationId` `get_access_logs_get_access_logs_get` a generovanú
funkciu `getAccessLogsGetAccessLogsGet`.

Závažný kontraktový nedostatok: úspešná response má v OpenAPI iba prázdnu
schému `{}`. Dôsledky:

- Orval generuje návratový typ `Promise<unknown>`;
- Zod generuje iba `zod.unknown()`;
- frontend nemôže bezpečne mapovať, validovať ani zobrazovať access logy.

Backend má pred integráciou UI zaviesť Pydantic response model a priradiť ho k
FastAPI `response_model`. Generované súbory sa nemajú ručne typovať ani
prepisovať.

## 8. Hlavička používateľa a bezpečnostný kontrakt

Všetky nové operácie obsahujú voliteľnú hlavičku `X-User` s predvolenou
hodnotou `admin`, rovnako ako existujúce endpointy. Generované funkcie ju
neprijímajú ako bežný argument; aplikácia ju dopĺňa cez spoločný Orval mutátor.

Nové operácie nemajú v OpenAPI uvedenú samostatnú `security` schému. Dokument
iba zachytáva aktuálny kontrakt; nevyvodzuje z toho, že endpointy majú byť
verejné alebo že default `admin` je vhodný pre produkciu.

## 9. Generované súbory

### Nové modely

Orval vytvoril 13 nových modelových súborov:

- `cacheConfigResponse.gen.ts`;
- `cacheConfigResponseDefaults.gen.ts`;
- `cacheConfigUpdate.gen.ts`;
- `cacheConfigUpdateDefaults.gen.ts`;
- `cacheHistoryResponse.gen.ts`;
- `cacheHistoryRetention.gen.ts`;
- `cacheHistoryRetentionUpdate.gen.ts`;
- `cacheRunRecord.gen.ts`;
- `cacheRunRecordTriggeredBy.gen.ts`;
- `getAccessLogsGetAccessLogsGetParams.gen.ts`;
- `getCacheHistoryDiscoveryCacheHistoryGetParams.gen.ts`;
- `vmSearchFilter.gen.ts`;
- `vmsSearchVmsSearchPostParams.gen.ts`.

### Upravené generované oblasti

- `client.gen.ts` obsahuje päť nových funkcií a `@deprecated` označenia štyroch
  starých VMware funkcií;
- `zod.gen.ts` obsahuje runtime schémy nových modelov a rozšírené provider
  schémy;
- `models/index.ts` exportuje nové modely;
- sedem existujúcich `*Params.gen.ts` modelov obsahuje `force_refresh`;
- provider modely obsahujú nové voliteľné polia a enum hodnotu `BACKEND`.

Všetky tieto súbory majú hlavičku `Generated by orval` a nesmú sa upravovať
ručne. Zdrojom pravdy je `openapi/abco-api.json` a backendový OpenAPI dokument.

## 10. Kompatibilita zmeny

### Čo je spätne kompatibilné

- Nebola odstránená žiadna path ani schema.
- Existujúce response modely inventory sa nezmenili.
- `force_refresh` je všade voliteľný a má default `false`.
- Nové provider polia sú voliteľné/nullable.
- Staré VMware endpointy zostávajú dočasne dostupné.

### Čo môže rozbiť frontend aj napriek aditívnemu kontraktu

- Rozšírenie enumu `ProviderType` o `BACKEND` mení zoznam možností odvodený v
  UI a rozbíja test s uzavretým zoznamom hodnôt.
- `POST /vms/search` má iné poradie argumentov generovanej funkcie než GET
  klienti: body predchádza query parametrom.
- `force_refresh` je vo VMware search body, ale v starších a IBM endpointoch je
  query parameter.
- Rozdelenie React Query cache podľa starých endpointov a filtrov už nebude
  zodpovedať cieľovému jednotnému search kontraktu.
- Backendová cache mení význam manuálneho refreshu: obyčajný refetch nemusí
  znamenať živé načítanie zo zdrojového systému.

## 11. Schválený migračný princíp

Migrácia nebude vytvárať dlhodobú kompatibilnú vrstvu ani fallback na staré
endpointy. Každá etapa nahradí jednu aktívnu schopnosť, overí ju a okamžite
odstráni príslušnú ručne písanú starú cestu.

### Etapa 1: základný VMware fetch

1. Základnú vetvu `fetchVmwareInventory(providerId)` prepnúť z `GET /vms` na
   `POST /vms/search`.
2. Posielať iba `provider_id` a prázdne body `{}`.
3. Nemeniť filter logiku ani frontendovú cache politiku.
4. Overiť Resources bez filtra, Infrastructure topology, Recovery Groups a
   generický `fetchInventory`.
5. Odstrániť ručne písaný import a použitie `vmsVmsGet`; neponechať fallback.

Vetvy používajúce tag alebo name prefix zostanú v tejto etape aktívne na
svojich existujúcich endpointoch. Nie sú zálohou novej implementácie, ale ešte
nezmigrovanými schopnosťami.

### Etapa 2: tag filter

1. Presunúť `tag` do `VmSearchFilter.tag`.
2. Zachovať provider-scoped query key a aktuálne správanie kombinácie tagu s
   lokálnym name prefix filtrom, kým nebude migrovaný aj prefix.
3. Overiť odpoveď, chyby, placeholder data a prepínanie providerov.
4. Odstrániť import a ručne písané použitie `vmsByTagVmsByTagGet`.

### Etapa 3: name prefix

1. Presunúť debounced prefix do `VmSearchFilter.name_prefix`.
2. Zjednotiť samostatný `fetchVmsByName` a jeho hook/query keys s kanonickým
   search tokom.
3. Zachovať 300 ms debounce a presné loading/error správanie.
4. Odstrániť klienta, hook a testy, ktoré existujú iba pre `/vms_by_name`.

### Etapa 4: folder filter

1. Overiť reálnu UI požiadavku na `folder_name`.
2. Ak sa používa, zapojiť ho do rovnakého search body a query key.
3. Ak nemá ručne písaného konzumenta, nevytvárať nový UI filter iba preto, že
   existuje v API.
4. Po odstránení endpointu z backendového OpenAPI zmizne aj generovaný
   `vmsInFolderVmsInFolderGet`.

### Etapa 5: kombinované filtre a kanonický query key

1. Zaviesť jeden normalizovaný filter objekt pre provider, folder, tag a name
   prefix.
2. Query key musí obsahovať každý parameter, ktorý môže zmeniť výsledné dáta.
3. Nevkladať do identity cache prechodné UI hodnoty pred debounce.
4. Odstrániť query keys pomenované podľa deprecated endpointov.
5. Odstrániť lokálne filtrovanie, ktoré backend po novom vykonáva autoritatívne,
   iba ak výsledná semantika zostane rovnaká.

### Etapa 6: cache a explicitný refresh

1. Zmerať a potvrdiť backendovú cache politiku pre jednotlivé provider typy.
2. Oddeliť bežný React Query refetch od používateľského živého refreshu.
3. Explicitný Refresh vykoná request s `force_refresh: true` a výsledok uloží
   pod rovnaký kanonický query key.
4. Prehodnotiť globálny 15-minútový `staleTime`; React Query cache neodstrániť
   bez náhrady jej UI zodpovedností.
5. Samostatne zapojiť cache config/history UI iba podľa schválenej požiadavky.

### Etapa 7: definitívny cleanup

1. Vyhľadať všetky ručne písané referencie na deprecated funkcie.
2. Odstrániť nepoužívané API adaptéry, hooky, query keys, test fixtures a
   importy v tej istej etape, ktorá odstránila ich posledného konzumenta.
3. Po backendovom odstránení deprecated paths znovu spustiť `api:update`.
4. Overiť, že deprecated funkcie zmizli aj z generovaného klienta.
5. Nenechávať komentovaný kód, fallback vetvy ani „dočasné“ wrappery bez
   aktívneho konzumenta.

## 12. Testovacia stratégia migrácie

Každý vertikálny rez musí mať vlastný červený/zelený dôkaz a samostatný commit.

### API klient a mapovanie

- presná HTTP metóda;
- presná URL a `provider_id`;
- presný JSON request body;
- hlavička doplnená spoločným mutátorom;
- validácia `VmsResponse`;
- mapovanie do `DiscoveryInventory`;
- propagácia HTTP 400, 422, 500 a 503;
- odmietnutie neplatného payloadu.

### React Query hooky

- query key obsahuje všetky serverové filtre;
- nevykoná sa request bez aktívneho providera;
- zmena providera nezobrazí dáta predošlého providera ako aktuálne;
- čerstvé dáta sa znovu použijú iba v rovnakom provider/filter scope;
- debounce nevytvára request pre každý stlačený znak;
- background fetch, initial loading, empty a error zostanú odlíšené;
- explicitný force refresh nevyrobí druhú cache identitu.

### Konzumenti

- Resources bez filtrov;
- Resources s tagom;
- Resources s name prefixom;
- Infrastructure topology pre VMware;
- Recovery Groups VMware inventory;
- kombinované filtre po ich zavedení;
- prechod medzi providermi a návrat k cached dátam.

Po každej etape sa majú spustiť iba priamo dotknuté testy, `typecheck`,
`api:check` a `git diff --check`. Kompletný suite/build sa spustí pri uzavretí
celej cross-cutting migrácie alebo ak nebude možné spoľahlivo určiť menší
overovací rozsah.

## 13. Otvorené rozhodnutia pred ďalšími etapami

Nasledujúce otázky nie sú dôvodom blokovať prvú migráciu základného fetchu, ale
musia byť vyriešené pred príslušnou integráciou:

1. Je provider typ `BACKEND` používateľom spravovateľný, alebo interný?
2. Aká je presná kombinovaná semantika `folder_name`, `tag` a `name_prefix`?
3. Aký je rozdiel medzi chýbajúcim filtrom, `null` a prázdnym reťazcom?
4. Aké kľúče a jednotky používa `CacheConfigResponse.defaults`?
5. Aké validačné hranice platia pre cache intervaly a retention?
6. Aký je typ response pre `/get_access_logs`?
7. Kedy backend fyzicky odstráni deprecated VMware endpointy z OpenAPI?

## 14. Stav pri zachytení kontraktu

- `npm run api:check`: úspešný;
- `npm run typecheck`: úspešný;
- zameraný test `platformProviderTypes.test.ts`: očakávanie je aktualizované na
  nový šesťprvkový enum vrátane `BACKEND`;
- ručne písaná migrácia na `/vms/search`: ešte nezačatá;
- deprecated endpointy: stále generované a stále čiastočne používané;
- access logs response: netypovaná (`unknown`).

Tento stav je zámerne zaznamenaný pred implementáciou, aby sa backendový
kontrakt, frontendové rozhodnutia a jednotlivé migračné rezy nemiešali do
jedného neprehľadného zásahu.
