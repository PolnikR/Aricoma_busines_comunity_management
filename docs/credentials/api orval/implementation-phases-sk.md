# Integrácia Orvalu: fázy implementácie

## Cieľ

Použiť backendový OpenAPI kontrakt na generovanie frontendových API typov a Zod schém. Generovaný kód reprezentuje iba HTTP kontrakt. Existujúca validácia formulárov, doménové/UI modely, mapovacie funkcie, `apiFetch` a logika React Query cache zostanú pod kontrolou frontendu, pokiaľ ich neskoršia fáza výslovne nenahradí.

OpenAPI dokument poskytuje publikovaný backend, napríklad:

```text
http://10.99.99.54:8000/openapi.json
```

Generovanie prebieha počas vývoja alebo v CI. Produkčná aplikácia v prehliadači nesmie sťahovať OpenAPI ani dynamicky vytvárať Zod schémy počas behu.

## Aktuálny stav OpenAPI

Väčšina POST request schém už existuje:

- `Provider`
- `OrchestrationProvider`
- `Credential`
- `SnapshotPolicy`
- `RecoveryAppPolicy`
- `CleanRoomPolicy`
- `PolicySet`
- `RecoveryGroup`

Predtým, než bude Orval poskytovať úplný kontrakt, musí backend doplniť:

1. Explicitné response modely pre úspešné odpovede. Aktuálne odpovede `200` obsahujú prázdnu schému `"schema": {}`.
2. Konkrétny request model pre `POST /submit_recovery_dag`. Aktuálne prijíma neobmedzený objekt s `additionalProperties: true`.
3. Všetky VM metadata, ktoré má backend zachovať v modeli `RecoveryVM`, napríklad `order`, `hostname`, `ip_address`, `os`, `cpu`, `memory_gb` a `storage_gb`.

Backend musí definovať Pydantic response modely a priradiť ich cez FastAPI `response_model`. Generovaný súbor `openapi.json` sa nesmie upravovať ručne.

## Fáza 1: Generované kontrakty a Zod validácia

### Implementovať

- Pridať Orval ako vývojovú závislosť.
- Uložiť konfiguráciu Orvalu vo frontendovom repozitári.
- Stiahnuť alebo iným kontrolovaným spôsobom získať OpenAPI snapshot z publikovaného backendu.
- Generovať API request typy, response typy, typy query/header parametrov a Zod schémy.
- Uložiť generované súbory do samostatného priečinka, napríklad `src/generated/api`.
- Generované súbory jasne označiť a nikdy ich neupravovať ručne.
- Ručne napísané schémy na API hranici postupne nahrádzať generovanými schémami.
- Začať malým vertikálnym rezom, ideálne providermi a prihlasovacími údajmi.

### Ponechať bez zmeny

- `apiFetch` a automatické pridávanie `X-User`.
- Existujúce React Query hooky a query keys.
- Feature-specific spracovanie chýb.
- Formulárové schémy a validáciu formulárov.
- Doménové/UI modely a mapovacie funkcie.

### Tok dát

```text
Formulárová schéma
  -> dáta formulára
  -> feature mapper
  -> generovaný request kontrakt
  -> apiFetch
  -> neznáma JSON odpoveď
  -> generovaná response Zod schéma
  -> feature mapper
  -> doménový/UI model
```

### Fáza je hotová, keď

- Providers a credentials používajú na API hranici generované request/response kontrakty.
- Runtime parsing naďalej validuje všetky externé JSON dáta ako `unknown`.
- Existujúce feature testy, lint, typecheck a build prejdú.
- UI komponenty neimportujú generované modely priamo.

## Fáza 2: Automatické kontroly kontraktu v CI

### Implementovať

- Pridať samostatné skripty, napríklad `api:pull`, `api:generate` a `api:check`.
- Zabezpečiť deterministické generovanie pripnutím verzie Orvalu a cieľovej verzie Zodu.
- V CI overovať, že generovanie nevytvorí necommitnuté rozdiely.
- Po generovaní spustiť typecheck a testy.
- Nechať CI zlyhať, ak uložený OpenAPI snapshot a generované súbory nie sú synchronizované.

### Odporúčané pravidlo stability

Produkčné buildy majú používať commitnutý alebo inak verziou pripnutý OpenAPI snapshot. Nemajú závisieť od aktuálnej dostupnosti ani meniteľného stavu vzdialeného backendu.

```text
publikovaný backend /openapi.json
  -> vedomé spustenie api:pull
  -> skontrolovaný OpenAPI snapshot
  -> api:generate
  -> generované kontrakty
  -> api:check v CI
```

### Príkazy projektu

```bash
npm run api:pull      # stiahne a validuje vzdialený OpenAPI snapshot
npm run api:generate  # vygeneruje klienta, modely a Zod schémy zo snapshotu
npm run api:update    # vykoná api:pull a následne api:generate
npm run api:check     # bez siete overí test pull skriptu a synchronizáciu generovaných súborov
```

`api:pull` používa predvolenú vývojovú adresu
`http://10.99.99.54:8000/openapi.json`. Inú adresu možno nastaviť cez
premennú prostredia `ABCO_OPENAPI_URL`. Stiahnutý dokument sa pred zápisom
overí a pri HTTP, JSON alebo OpenAPI validačnej chybe zostane existujúci
`openapi/abco-api.json` nezmenený.

`api:check` zámerne nikdy nesťahuje živú schému. CI a produkčný build tak
pracujú iba s kontrolovaným snapshotom uloženým v Gite.

### Fáza je hotová, keď

- Zmena backendového kontraktu vytvorí viditeľný diff generovaných súborov.
- Breaking changes zlyhajú na typechecku alebo contract testoch pred nasadením.
- Produkčný build sa dokončí bez kontaktovania backendového OpenAPI endpointu.

## Fáza 3: Generovaný API klient

Táto fáza je voliteľná. Začať s ňou až po stabilizovaní fáz 1 a 2 a iba vtedy, keď je ručné skladanie requestov preukázateľne opakované alebo náchylné na chyby.

### Implementovať, keď je to užitočné

- Generovať typované endpoint funkcie pre cesty, metódy, request body, query parametre a odpovede.
- Nakonfigurovať Orval mutator alebo adaptér, ktorý deleguje requesty na existujúce správanie `apiFetch`.
- Zachovať `X-User`, predvolené headery, proxy cesty, spracovanie chýb a runtime validáciu odpovedí.
- Migrovať po jednotlivých featurách namiesto narazového nahradenia celej API vrstvy.

### Nepokračovať, ak

- Generovaný klient nedokáže zachovať existujúce autentifikačné/identifikačné headery.
- Správanie pri chybách prestane byť konzistentné s aktuálnymi feature API funkciami.
- Generovaná abstrakcia sťažuje pochopenie doménového mapovania.

### Fáza je hotová, keď

- Vybrané features už ručne neskladajú URL a query stringy.
- Správanie requestov, chyby, headery a testy zostanú ekvivalentné.
- Žiadny UI komponent nezávisí priamo od generovaných HTTP response objektov.

## Fáza 4: Generované React Query hooky

Aj táto fáza je voliteľná. Implementovať ju iba pre queries a mutations, ktoré sú prevažne mechanickými obalmi nad endpointom.

### Vhodní kandidáti

- Jednoduché list queries.
- Jednoduché detail queries.
- Mutations, ktorých jediným následkom je predvídateľná invalidácia query.

### Ponechať ručne napísané

- Hooky s funkčnými cache updatmi.
- Závislé alebo podmienené queries s doménovými pravidlami.
- Invalidáciu naprieč viacerými features.
- Optimistické updaty s vlastným rollback správaním.
- Hooky, ktoré mapujú API záznamy na doménové modely.

### Fáza je hotová, keď

- Generované hooky znižujú opakovaný kód bez skrývania správania cache.
- Existujúce query keys a pravidlá invalidácie zostanú predvídateľné.
- Testy pokrývajú cache, retry, invalidáciu a propagáciu chýb.

## Fáza 5: Generované mocky a testovacie fixtures

Túto fázu implementovať, keď projekt potrebuje integračné testy nezávislé od backendu alebo explicitne zapínaný lokálny mock režim.

### Implementovať

- Generovať mock dáta alebo MSW handlery v súlade s kontraktom, ak to zvolený nástroj podporuje.
- Generované mocky nepoužívať v produkčnej runtime ceste.
- Rozširovať generované základné fixtures pomocou scenario-specific test builderov.
- Pokryť úspech, validačnú chybu, autorizačnú chybu, prázdny zoznam a poškodenú odpoveď.

### Obmedzenia

- Neobnovovať implicitné mockovanie requestov pre celú aplikáciu.
- Nepovažovať generované náhodné dáta za náhradu zmysluplných feature testov.
- Mock odpovede musia byť platné podľa rovnakých generovaných response schém, ktoré používa produkčné API parsovanie.

### Fáza je hotová, keď

- Integračné testy sa dajú spustiť bez publikovaného backendu.
- Mock handlery a fixtures zodpovedajú aktuálnemu OpenAPI kontraktu.
- Produkčný build neobsahuje zapnuté správanie mock servera.

## Odporúčané poradie realizácie

1. Backend doplní chýbajúce response modely a request model pre `submit_recovery_dag`.
2. Implementovať fázu 1 pre providers a credentials.
3. Vyhodnotiť generovaný kód a hranice mapovania.
4. Rozšíriť fázu 1 na policies, policy sets, recovery groups, recovery applications a inventory.
5. Pridať CI kontrolu z fázy 2.
6. Fázy 3 až 5 zaviesť iba vtedy, keď je ich konkrétny prínos pre údržbu väčší než cena migrácie.

Fázy 1 a 2 tvoria produkčný základ. Fázy 3, 4 a 5 sú voliteľné optimalizácie, ktoré sa majú zavádzať podľa reálnych potrieb projektu, nie ako podmienka použitia Orvalu.
