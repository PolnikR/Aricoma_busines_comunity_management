# Implementačný plán: Type-specific Platform Provider model, detail, Create/Edit a BE payload

## Prehľad

Zjednotiť Platform Provider feature tak, aby `type` (`AIRFLOW`, `SMTP`, `BACKEND`, `KEYCLOAK`) určoval celý konfiguračný kontrakt na FE: ktoré polia sa mapujú z backend response, ktoré sa zobrazujú na detaile, ktoré sa zobrazujú a validujú v Create/Edit formulári a ktoré sa odošlú späť na backend.

Cieľom nie je iba vizuálne skryť nerelevantné polia. FE domain model a outbound payload musia byť type-safe a type-specific. Provider jedného typu nesmie niesť alebo odosielať konfiguračné polia patriace inému typu.

Tento dokument je planning-only. Produkčný source sa pri jeho vytvorení nemení.

## Zdroj požadovaného field contractu

Požadovaná Platform Provider štruktúra:

### Common fields pre všetky štyri typy

- `id`
- `name`
- `description`
- `type`
- `url`

### AIRFLOW

- common fields
- `ipAddress`
- `port`
- `dagDir`
- `credentialId`
- `notificationEmail`

### SMTP

- common fields
- `ipAddress`
- `port`
- `fromEmail`
- `disableSsl`
- `disableTls`

### BACKEND

- common fields
- `notificationEmail`
- `loggingEnabled`
- `jwtEnabled`
- `swaggerEnables`

### KEYCLOAK

- common fields
- `realm`
- `clientId`
- `credentialId`

`credentialStatus` je server-side read-only metadata z GET response. Nie je Create/Edit konfiguračné pole a nesmie sa odosielať v submit payload. Ak zostane zobrazené vedľa credential na detaile, je to read-only status, nie súčasť type-specific config kontraktu.

## Potvrdený aktuálny FE stav

### Generated contract

Aktuálny generated `ProviderType` obsahuje:

```text
VMWARE
FLASHCOPY
IBM_POWER
AIRFLOW
SMTP
BACKEND
KEYCLOAK
```

Pre Platform Providers preto nie je správne používať `ProviderType.options` ako priamy zoznam Create/Edit typov. Platform Provider feature potrebuje explicitný subset štyroch orchestration/platform typov.

Aktuálny generated `OrchestrationProvider` / `OrchestrationProviderRecord` obsahuje okrem common polí napríklad:

- `ipAddress`
- `credentialId`
- `vmPrefix`
- `vmTags`
- `notificationEmail`
- `port`
- `dagDir`
- `fromEmail`
- `disableSsl`
- `disableTls`
- `loggingEnabled`
- `jwtEnabled`
- `realm`
- `clientId`

### Contract status: `swaggerEnables` resolved

BACKEND pole `swaggerEnables` bolo potvrdené ako `Optional[bool]`, pridané do BE `OrchestrationProvider`, prenesené do FE OpenAPI snapshotu a vygenerované Orvalom do `OrchestrationProvider`, `OrchestrationProviderRecord` aj Zod kontraktu.

Phase 0 blocker je odstránený; ďalšie tasky môžu `swaggerEnables` používať cez generated API contract bez handwritten workaroundu.

### Aktuálny FE model

`PlatformProviderRecord` je dnes jeden široký model s veľkým množstvom optional/null polí. `PlatformProviderSubmitData` je priamo generated `OrchestrationProvider`.

To umožňuje zostaviť payload, ktorý obsahuje polia viacerých typov naraz.

### Aktuálny mapper

`mapPlatformProvider()` dnes používa jeden generický mapper. Normalizuje common aj orchestration fields bez type-specific field allow-listu.

### Aktuálny formulár

`PlatformProviderFormData` je jeden široký form model. UI už obsahuje niekoľko podmienok, napríklad:

- KEYCLOAK schováva IP/port a niektoré non-Keycloak fields,
- BACKEND zobrazuje `loggingEnabled` a `jwtEnabled`,
- ostatné non-KEYCLOAK typy však stále zdieľajú veľa polí, ktoré podľa požadovanej štruktúry nemajú patriť všetkým typom.

Napríklad SMTP dnes môže vidieť/udržiavať polia, ktoré patria AIRFLOW, a AIRFLOW môže niesť SMTP fields v state/payload.

### Aktuálny submit

`PlatformProvidersModal.handleSubmit()` dnes skladá jeden široký object a pri nerelevantných fields často posiela `null`. To nie je požadovaný kontrakt.

Požadovaný výsledok:

```text
selected type
    -> type-specific form values
    -> type-specific validation
    -> type-specific submit mapper
    -> iba povolené keys pre daný type
```

## Architektonické rozhodnutia

### A1. Platform Provider type subset

Zaviesť explicitný Platform Provider type subset:

```ts
type PlatformProviderType = Extract<
  GeneratedProviderType,
  'AIRFLOW' | 'SMTP' | 'BACKEND' | 'KEYCLOAK'
>
```

Runtime options budú explicitne tieto štyri hodnoty a musia byť compile-time overené voči generated `ProviderType`.

Dôvod: generated `ProviderType` je širší backend enum a obsahuje infra provider types, ktoré nepatria do Platform Provider Create/Edit UI.

### A2. Discriminated union FE domain model

Namiesto jedného širokého `PlatformProviderRecord` zaviesť:

```text
PlatformProviderBase
├ AirflowPlatformProvider
├ SmtpPlatformProvider
├ BackendPlatformProvider
└ KeycloakPlatformProvider
```

Discriminator je `type`.

Common fields:

```text
id
name
description
type
url
```

Type-specific fields budú existovať iba na príslušnom type interface.

### A3. Response mapping = base mapper + type-specific mapper

Použiť jeden dispatcher:

```text
mapPlatformProvider(record)
  switch(record.type)
    AIRFLOW  -> mapAirflowPlatformProvider
    SMTP     -> mapSmtpPlatformProvider
    BACKEND  -> mapBackendPlatformProvider
    KEYCLOAK -> mapKeycloakPlatformProvider
```

Každý type mapper mapuje iba:

- common fields,
- fields z jeho type allow-listu,
- read-only `credentialStatus` iba tam, kde ho FE detail potrebuje.

Raw generated GET record môže zostať oddelene zachovaný pre JSON viewer, aby JSON viewer reprezentoval backend response, nie normalizovaný FE union.

### A4. Type-specific field definition ako jeden source of truth

Field ownership nesmie byť roztrúsené v troch nezávislých `if (type === ...)` implementáciách pre Detail, Form a Payload.

Zaviesť malý feature-local contract/config, napríklad:

```text
PLATFORM_PROVIDER_FIELD_CONTRACT
AIRFLOW  -> [...]
SMTP     -> [...]
BACKEND  -> [...]
KEYCLOAK -> [...]
```

Tento contract nebude generovať celý formulár dynamicky. Jeho úlohou je explicitne dokumentovať field ownership a umožniť helperom/testom overiť, že Detail/Form/Payload sa nerozídu.

Nevytvárať generický schema-driven form engine.

### A5. Create/Edit form

Form môže zostať jeden modal, ale musí renderovať:

```text
common section
+
selected-type section
```

Common:

```text
ID
Name
Description
Type
URL
```

AIRFLOW section:

```text
IP address
Port
DAG directory
Credential
Notification email
```

SMTP section:

```text
IP address
Port
From email
Disable SSL
Disable TLS
```

BACKEND section:

```text
Notification email
Enable logging
Enable JWT
Swagger enabled   // až po OpenAPI contract update
```

KEYCLOAK section:

```text
Realm
Client ID
Credential
```

### A6. Type change behavior

Pri zmene `type` v Create/Edit:

- common fields zostávajú,
- fields patriace starému typu sa musia odstrániť/resetnúť z effective form value,
- nový type dostane svoje defaults,
- dirty-state musí porovnávať iba common + fields relevantné pre aktuálny type,
- submit nesmie vedieť znovu vytiahnuť stale hodnoty starého typu.

Príklad:

```text
BACKEND loggingEnabled=true
        |
        v
change type -> AIRFLOW
        |
        v
AIRFLOW payload nesmie obsahovať loggingEnabled ani jwtEnabled
```

### A7. Edit initialization

`toPlatformProviderFormData()` sa nahradí type-aware mapperom:

```text
record union
    -> common form values
    -> type-specific form values
```

Edit modal má zobraziť iba fields daného type a všetky existujúce hodnoty daného type sa musia prefillnúť.

Missing credential reference musí zostať zobraziteľný ako unavailable option, aby edit unrelated field nestratil credential ID.

### A8. Type-specific validation

Validovať iba fields, ktoré patria aktuálnemu type.

Príklady:

- AIRFLOW port môže byť validovaný; BACKEND/KEYCLOAK port vôbec nemajú form field,
- SMTP email/port rules sa týkajú SMTP,
- BACKEND nesmie byť blokovaný neplatnou stale hodnotou v hidden AIRFLOW field,
- KEYCLOAK validation nesmie kontrolovať IP/port/dagDir.

### A9. Type-specific outbound payload

Submit bude dispatcher:

```text
toPlatformProviderSubmitPayload(formData)
  -> base payload
  -> type-specific payload builder
```

Výsledný object smie obsahovať iba keys patriace common + selected type.

Príklad AIRFLOW:

```json
{
  "id": "airflow-01",
  "name": "Primary Airflow",
  "description": "Application recovery DAG orchestration.",
  "type": "AIRFLOW",
  "url": "http://10.99.99.55:8080/",
  "ipAddress": "10.99.99.55",
  "port": 22,
  "dagDir": "/home/airflow/dags",
  "credentialId": "airflow-ssh",
  "notificationEmail": "platform-team@example.com"
}
```

Payload nesmie obsahovať napríklad:

```text
fromEmail
disableSsl
disableTls
loggingEnabled
jwtEnabled
realm
clientId
```

Rovnaké pravidlo platí pre ostatné typy.

### A10. Null vs omission policy

Field allow-list a null policy sú dve odlišné veci.

- **nerelevantné field pre type:** key sa vôbec neposiela,
- **relevantné optional field, ktoré používateľ na Edit vyčistí:** poslať `null`, ak BE/OpenAPI používa `null` na explicitné vymazanie hodnoty,
- **relevantné optional field pri Create bez hodnoty:** použiť OpenAPI-konformnú omission/null policy podľa existujúceho endpoint contractu.

Testy musia assertovať exact payload keys, nie iba `toMatchObject()`.

### A11. Detail presentation

Detail drawer bude dispatchovať podľa `provider.type` a zobrazuje iba:

- common configuration fields,
- relevantné fields daného type,
- voliteľne read-only credential status pri AIRFLOW/KEYCLOAK credential.

Nesmie zobrazovať `-` riadky pre fields, ktoré k danému typu vôbec nepatria.

Príklad KEYCLOAK detail:

```text
Provider ID
Name / title
Description
Type
URL
Realm
Client ID
Credential
Credential status   // read-only metadata, ak zostáva v UX
```

Nie:

```text
IP address
Port
DAG directory
Notification email
Disable SSL
Disable TLS
Logging
```

### A12. Table columns

Main list table nemusí dynamicky meniť columns podľa každého row type. Zachovať iba skutočne cross-type summary columns.

Aktuálne type-specific columns ako Endpoint alebo DAG Directory sa musia prehodnotiť:

- ak column nie je významovo spoločný pre všetky štyri typy, buď sa odstráni z hlavnej table,
- alebo sa zmení na bezpečný summary column, ktorý má definovaný význam pre všetky typy.

Type-specific konfigurácia patrí primárne do Detail draweru.

### A13. JSON viewer

JSON viewer má ďalej zobrazovať raw validated GET record zo servera. Nemá sa obmedziť FE type-specific detail allow-listom.

Dôvod: JSON viewer je diagnostický raw API view; Detail/Create/Edit sú product configuration UI.

## Dependency graph

```text
BE/OpenAPI swaggerEnables contract
          |
          v
Generated client/types
          |
          v
Platform Provider type subset + field contract
          |
          v
Discriminated response model + mappers
          |
      +---+-------------------+
      |                       |
      v                       v
Create/Edit form          Detail presentation
      |
      v
Type-specific validation
      |
      v
Type-specific submit mapper
      |
      v
Exact request payload tests
          |
          v
End-to-end browser/network verification
```

---

# Phase 0 — Contract prerequisite

## Task 1: Confirm and expose BACKEND `swaggerEnables` in OpenAPI

**Description:** Overiť presný backend field name z požadovanej štruktúry (`swaggerEnables`). Ak je field skutočne súčasťou Platform Provider BACKEND contractu, doplniť ho na backend schema/OpenAPI source a znovu vygenerovať FE OpenAPI client. FE handwritten types sa nesmú použiť ako náhrada chýbajúceho API contractu.

**Acceptance criteria:**
- [x] BE/OpenAPI jednoznačne definuje exact field name a typ.
- [x] Generated FE `OrchestrationProvider` obsahuje BACKEND swagger field.
- [x] Generated `OrchestrationProviderRecord` obsahuje ten istý field.

**Verification:**
- [x] `npm run api:check` prešiel po generated API sync.
- [x] Generated contract overený pre read aj submit schema shape.

**Dependencies:** None.

**Files likely touched:**
- backend schema/OpenAPI source v BE repo,
- `openapi/abco-api.json` cez štandardný pull/generation flow,
- generated API files cez Orval generation, nie manuálne.

**Estimated scope:** M cross-contract task. Ak sa BE zmena rieši samostatne, tento task je explicitný blocker iba pre `swaggerEnables`; ostatné FE tasky môžu byť pripravené paralelne.

## Checkpoint A — API contract

- [x] `swaggerEnables` exact naming potvrdený.
- [x] No handwritten FE-only contract workaround.
- [x] Generated client synchronizovaný pred final BACKEND UI wiring.

---

# Phase 1 — FE type foundation

## Task 2: Define Platform Provider type subset and field ownership contract

**Description:** Oddeliť orchestration Platform Provider typy od širšieho generated `ProviderType` a zaviesť explicitný field ownership contract pre AIRFLOW/SMTP/BACKEND/KEYCLOAK.

**Acceptance criteria:**
- [ ] Create/Edit type options obsahujú iba AIRFLOW/SMTP/BACKEND/KEYCLOAK.
- [ ] Runtime list je compile-time kompatibilný s generated ProviderType.
- [ ] Field contract presne zodpovedá field matrix z tohto plánu.

**Verification:**
- [ ] Model test odmietne VMWARE/FLASHCOPY/IBM_POWER ako Platform Provider UI type.
- [ ] Field ownership test porovná exact key lists pre všetky štyri typy.

**Dependencies:** None.

**Files likely touched:**
- `src/features/platform-administration/platform-providers/model/platformProviderTypes.ts`
- `src/features/platform-administration/platform-providers/model/platformProviderTypes.test.ts`
- nový `platformProviderFieldContract.ts` iba ak by model file začal byť neprehľadný

**Estimated scope:** M — 2–3 files.

## Task 3: Replace wide record model with discriminated union

**Description:** Zaviesť Base + AIRFLOW/SMTP/BACKEND/KEYCLOAK record typy. Zachovať raw GET record ako diagnostické metadata oddelene od normalized config fields.

**Acceptance criteria:**
- [ ] `provider.type === 'KEYCLOAK'` sprístupní `realm/clientId/credentialId` type-safe.
- [ ] KEYCLOAK record compile-time neobsahuje AIRFLOW `dagDir`.
- [ ] SMTP record compile-time neobsahuje BACKEND `loggingEnabled`.

**Verification:**
- [ ] Type/model tests pre narrowing každého typu.
- [ ] Existing credentialStatus policy zostáva read-only.

**Dependencies:** Task 2.

**Files likely touched:**
- `src/features/platform-administration/platform-providers/model/platformProviderTypes.ts`
- `src/features/platform-administration/platform-providers/model/platformProviderTypes.test.ts`

**Estimated scope:** S–M — 2 files.

## Task 4: Implement base + type-specific response mappers

**Description:** Rozdeliť dnešný široký `mapPlatformProvider()` na dispatcher a štyri type-specific mappers. Runtime mapper musí odmietnuť generated provider type, ktorý nie je Platform Provider subset.

**Acceptance criteria:**
- [ ] Každý mapped record obsahuje iba common + relevant type fields.
- [ ] Mixed AIRFLOW/SMTP/BACKEND/KEYCLOAK GET response sa namapuje bez cross-type fields.
- [ ] VMWARE/FLASHCOPY/IBM_POWER record z platform-provider endpointu je explicit contract error, nie tiché prijatie do Platform Provider UI.

**Verification:**
- [ ] `platformProvidersApi.test.ts` pokryje všetky štyri sample shapes.
- [ ] Test explicitne kontroluje absent cross-type keys.

**Dependencies:** Tasks 2–3.

**Files likely touched:**
- `src/features/platform-administration/platform-providers/api/platformProvidersApi.ts`
- `src/features/platform-administration/platform-providers/api/platformProvidersApi.test.ts`

**Estimated scope:** S — 2 files.

## Checkpoint B — Domain + read mapping

- [ ] Four-type subset je explicitný.
- [ ] Discriminated union funguje.
- [ ] Response mapper neprepúšťa cross-type config fields.
- [ ] Raw JSON record je stále dostupný pre JSON viewer.

---

# Phase 2 — Create/Edit form

## Task 5: Split form state into common + type-specific values

**Description:** Nahradiť jeden široký effective form contract typom, ktorý oddelí common values od type-specific configuration. Komponent nemusí byť štyri samostatné modaly; môže zostať jeden modal s explicitnými type sections.

**Acceptance criteria:**
- [ ] Common fields sú na jednom mieste.
- [ ] AIRFLOW/SMTP/BACKEND/KEYCLOAK state má iba svoje config fields.
- [ ] `vmPrefix`, `vmTags`, `defaultFlashcopyProviderId`, `orchestratorConnId`, `cacheRefreshSeconds` a iné fields mimo dodanej Platform Provider matrix sa v tomto Create/Edit flow nepoužívajú ani neodosielajú.

**Verification:**
- [ ] Form/model test potvrdí initial state pre všetky štyri typy.
- [ ] No hidden field je potrebný na zachovanie cross-type state.

**Dependencies:** Task 3.

**Files likely touched:**
- `src/features/platform-administration/platform-providers/components/PlatformProviderForm.tsx`
- `src/features/platform-administration/platform-providers/components/PlatformProviderForm.test.tsx`
- feature-local form type/helper file iba ak je potrebný

**Estimated scope:** M — 2–3 files.

## Task 6: Render exact type-specific Create/Edit fields

**Description:** Upraviť form sections tak, aby selected `type` zobrazil presne field matrix z plánu.

**Acceptance criteria:**
- [ ] AIRFLOW zobrazuje iba common + IP/Port/DAG/Credential/Notification email.
- [ ] SMTP zobrazuje iba common + IP/Port/From email/Disable SSL/Disable TLS.
- [ ] BACKEND zobrazuje iba common + Notification email/Logging/JWT/Swagger.
- [ ] KEYCLOAK zobrazuje iba common + Realm/Client ID/Credential.

**Verification:**
- [ ] Parameterized form tests kontrolujú visible aj absent labels pre každý type.
- [ ] Credential selector je prítomný iba AIRFLOW a KEYCLOAK.
- [ ] `swaggerEnables` assertion sa aktivuje po splnení Task 1.

**Dependencies:** Task 5; BACKEND Swagger row navyše Task 1.

**Files likely touched:**
- `src/features/platform-administration/platform-providers/components/PlatformProviderForm.tsx`
- `src/features/platform-administration/platform-providers/components/PlatformProviderForm.test.tsx`
- locale files iba pre chýbajúci Swagger label/helper

**Estimated scope:** M — 2 source/test files + locale entries.

## Task 7: Implement type-aware edit initialization and type switching

**Description:** Edit mapper naplní iba fields daného provider type. Zmena Type resetne starý type-specific state a vytvorí nový type-specific default state bez stale hidden values.

**Acceptance criteria:**
- [ ] AIRFLOW edit prefillne presne AIRFLOW fields.
- [ ] KEYCLOAK edit prefillne URL/realm/clientId/credentialId a žiadne IP/port fields.
- [ ] BACKEND -> AIRFLOW type switch nedokáže neskôr odoslať logging/JWT/Swagger fields.

**Verification:**
- [ ] Modal tests pre edit každého typu.
- [ ] Modal tests pre minimálne BACKEND->AIRFLOW a SMTP->KEYCLOAK switch.
- [ ] Unsaved-changes guard stále reaguje na relevantné fields.

**Dependencies:** Tasks 5–6.

**Files likely touched:**
- `src/features/platform-administration/platform-providers/components/PlatformProvidersModal.tsx`
- `src/features/platform-administration/platform-providers/components/PlatformProvidersModal.test.tsx`

**Estimated scope:** S–M — 2 files.

## Task 8: Make validation type-specific

**Description:** Validácia sa vykonáva nad common fields + selected-type config. Hidden/stale values iného typu nesmú blokovať submit.

**Acceptance criteria:**
- [ ] Port validation sa spúšťa iba AIRFLOW/SMTP.
- [ ] Notification email validation sa spúšťa iba AIRFLOW/BACKEND.
- [ ] KEYCLOAK validation nekontroluje IP/port/dagDir.

**Verification:**
- [ ] Parameterized modal validation tests pre všetky štyri typy.
- [ ] Test dokazuje, že invalid stale field starého typu neblokuje nový type submit.

**Dependencies:** Task 7.

**Files likely touched:**
- `src/features/platform-administration/platform-providers/components/PlatformProvidersModal.tsx`
- `src/features/platform-administration/platform-providers/components/PlatformProvidersModal.test.tsx`

**Estimated scope:** S — 2 files.

## Checkpoint C — Form contract

- [ ] Create type dropdown ponúka iba 4 Platform Provider typy.
- [ ] Každý typ zobrazuje exact field matrix.
- [ ] Edit prefill je type-specific.
- [ ] Type switch neuchováva stale cross-type fields.
- [ ] Validation je type-aware.

---

# Phase 3 — Submit mapping

## Task 9: Add type-specific submit payload builders

**Description:** Nahradiť široký inline object v `handleSubmit()` čistými mappermi, ktoré vrátia generated `OrchestrationProvider` shape, ale iba s allowed keys pre selected type.

**Acceptance criteria:**
- [ ] AIRFLOW payload obsahuje iba common + AIRFLOW keys.
- [ ] SMTP payload obsahuje iba common + SMTP keys.
- [ ] BACKEND payload obsahuje iba common + BACKEND keys.
- [ ] KEYCLOAK payload obsahuje iba common + KEYCLOAK keys.

**Verification:**
- [ ] Exact `toEqual()` payload tests pre všetky štyri sample providers.
- [ ] Tests assertujú, že cross-type keys nie sú v objecte (`not.toHaveProperty`).

**Dependencies:** Tasks 1, 7, 8.

**Files likely touched:**
- nový `src/features/platform-administration/platform-providers/helpers/platformProviderSubmitMapper.ts`
- nový colocated test
- `PlatformProvidersModal.tsx` iba wiring na mapper

**Estimated scope:** M — 3 files.

## Task 10: Preserve explicit clear semantics without sending irrelevant keys

**Description:** Pre relevantné optional fields definovať jednotnú null/omission policy, aby Edit vedel hodnotu vymazať bez toho, aby payload obsahoval fields iného typu.

**Acceptance criteria:**
- [ ] Clear relevant optional field odošle `null` iba ak to current OpenAPI/BE semantics vyžaduje na clear.
- [ ] Nerelevantné fields sa neodosielajú ani ako `null`.
- [ ] Create empty optional values používajú contract-conform omission/null policy.

**Verification:**
- [ ] Edit-clear payload test aspoň pre AIRFLOW notificationEmail, SMTP fromEmail a KEYCLOAK credentialId/realm podľa BE optionality.
- [ ] BACKEND boolean `false` sa zachová ako `false`, nie ako omission.

**Dependencies:** Task 9.

**Files likely touched:**
- `platformProviderSubmitMapper.ts`
- jeho test
- `platformProvidersApi.ts` iba ak schema boundary potrebuje technickú úpravu, nie field ownership logiku

**Estimated scope:** S–M — 2–3 files.

## Task 11: Keep generated schema as final API validation boundary

**Description:** Type-specific FE mapper určí allowed keys; generated/OpenAPI Zod schema zostane posledná validácia request objectu pred generated client callom.

**Acceptance criteria:**
- [ ] Submit mapper neobchádza `platformProviderSubmitSchema`.
- [ ] Invalid generated contract stále failne pred HTTP requestom.
- [ ] Handwritten discriminated union nenahrádza API schema source of truth.

**Verification:**
- [ ] `platformProvidersApi.test.ts` pokryje valid four-type payloads a malformed payload rejection.

**Dependencies:** Tasks 9–10.

**Files likely touched:**
- `src/features/platform-administration/platform-providers/api/platformProvidersApi.ts`
- `src/features/platform-administration/platform-providers/api/platformProvidersApi.test.ts`

**Estimated scope:** S — 2 files.

## Checkpoint D — Payload contract

- [ ] Exact request payload pre každý typ sedí s field matrix.
- [ ] Žiadny cross-type key ani `null` placeholder.
- [ ] Explicit clear funguje pre relevantné optional fields.
- [ ] Generated validation zostáva posledná API boundary.

---

# Phase 4 — Detail and list presentation

## Task 12: Implement type-specific detail sections

**Description:** Refaktorovať DetailDrawer presentation na common + type-specific section. Nezobrazovať nerelevantné rows s `-`.

**Acceptance criteria:**
- [ ] AIRFLOW detail: common + IP/Port/DAG/Credential/Notification email.
- [ ] SMTP detail: common + IP/Port/From email/Disable SSL/Disable TLS.
- [ ] BACKEND detail: common + Notification email/Logging/JWT/Swagger.
- [ ] KEYCLOAK detail: common + Realm/Client ID/Credential.

**Verification:**
- [ ] Parameterized table/detail test pre všetky štyri typy.
- [ ] Každý test kontroluje required visible rows aj absent rows iných typov.
- [ ] Read-only credential status môže zostať pri AIRFLOW/KEYCLOAK, ale nie v config field assertions.

**Dependencies:** Tasks 3–4; BACKEND Swagger row navyše Task 1.

**Files likely touched:**
- `src/features/platform-administration/platform-providers/components/PlatformProvidersTable.tsx`
- `src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx`
- nový small detail helper/component iba ak dispatcher výrazne zjednoduší table component

**Estimated scope:** M — 2–3 files.

## Task 13: Simplify main Platform Providers table to cross-type columns

**Description:** Odstrániť alebo nahradiť columns, ktoré dávajú zmysel iba pre AIRFLOW-like rows. Main table je summary pre heterogénne provider types; full config patrí do detailu.

**Acceptance criteria:**
- [ ] Main columns majú význam pre AIRFLOW/SMTP/BACKEND/KEYCLOAK.
- [ ] KEYCLOAK/BACKEND row nevytvára misleading `:0`, prázdny endpoint alebo DAG column ako keby field patril typu.
- [ ] Search fields nepredpokladajú `ipAddress` na každom union memberovi.

**Verification:**
- [ ] Mixed four-type table test.
- [ ] Search test minimálne podľa name/id/type alebo explicitného cross-type search contractu.

**Dependencies:** Task 3.

**Files likely touched:**
- `PlatformProvidersTable.tsx`
- `PlatformProvidersTable.test.tsx`

**Estimated scope:** S–M — 2 files.

## Task 14: Preserve raw JSON viewer behavior

**Description:** Overiť, že type-specific normalized union nezmení diagnostický JSON viewer: `rawRecord` zostáva raw validated backend record.

**Acceptance criteria:**
- [ ] JSON viewer zobrazuje raw response fields, nie iba detail allow-list.
- [ ] Normalized defaults sa nevydávajú za raw backend data.

**Verification:**
- [ ] Existing JSON viewer regression test zostáva zelený pre aspoň AIRFLOW.
- [ ] Pridať KEYCLOAK/BACKEND raw-record case, ak union refactor mení helper typing.

**Dependencies:** Task 4.

**Files likely touched:**
- `platformProviderJson.ts` ideálne bez source zmeny,
- `PlatformProvidersTable.test.tsx` iba test extension.

**Estimated scope:** S.

## Checkpoint E — Read UI

- [ ] Detail zobrazuje exact type fields.
- [ ] Main table je cross-type summary bez AIRFLOW-specific assumptions.
- [ ] Raw JSON zostáva diagnostický backend view.

---

# Phase 5 — End-to-end verification

## Task 15: Focused automated regression suite

**Acceptance criteria:**
- [ ] Model/type/field-contract tests green.
- [ ] API read/submit mapper tests green.
- [ ] Form/modal tests green.
- [ ] Table/detail/JSON tests green.
- [ ] `npm run typecheck` green.
- [ ] Focused ESLint nad changed TS/TSX files green.
- [ ] `git diff --check` green.

**Dependencies:** Tasks 1–14.

**Files likely touched:** None beyond task-local regression fixes.

**Estimated scope:** S verification.

## Task 16: Browser Create/Edit/Detail network matrix

**Description:** Reálne overiť všetky štyri provider types v browseri. Browser/network je autoritatívny pre exact outbound JSON body.

### AIRFLOW

- [ ] Create/Edit zobrazuje common + AIRFLOW fields.
- [ ] Detail zobrazuje iba common + AIRFLOW fields.
- [ ] Network POST body obsahuje iba AIRFLOW allow-list.

### SMTP

- [ ] Create/Edit zobrazuje common + SMTP fields.
- [ ] Detail zobrazuje iba common + SMTP fields.
- [ ] Network POST body obsahuje iba SMTP allow-list.

### BACKEND

- [ ] Create/Edit zobrazuje common + BACKEND fields.
- [ ] Detail zobrazuje iba common + BACKEND fields.
- [ ] Network POST body obsahuje `notificationEmail`, `loggingEnabled`, `jwtEnabled`, `swaggerEnables` a žiadne AIRFLOW/SMTP/KEYCLOAK keys.

### KEYCLOAK

- [ ] Create/Edit zobrazuje common + Realm/Client ID/Credential.
- [ ] Detail zobrazuje iba common + KEYCLOAK fields.
- [ ] Network POST body obsahuje iba KEYCLOAK allow-list.

### Type switching

- [ ] BACKEND -> AIRFLOW odstráni BACKEND config keys z requestu.
- [ ] SMTP -> KEYCLOAK odstráni SMTP keys z requestu.

**Dependencies:** Task 15.

**Files likely touched:** None; browser verification only.

**Estimated scope:** M verification.

## Final Definition of Done

- [ ] Platform Provider UI ponúka iba AIRFLOW/SMTP/BACKEND/KEYCLOAK.
- [ ] FE record je discriminated union, nie široký optional-field bag.
- [ ] Response mapping je base + type-specific.
- [ ] Create/Edit zobrazuje presne fields daného typu.
- [ ] Edit správne prefillne type fields.
- [ ] Type switch odstráni stale fields starého typu.
- [ ] Validation kontroluje iba relevantné fields.
- [ ] Submit používa type-specific payload mapper.
- [ ] Nerelevantné fields sa neposielajú ani ako `null`.
- [ ] Relevantné cleared optional fields používajú BE-konformnú null/omission policy.
- [ ] Detail zobrazuje common + relevant type fields a nie `-` rows pre neexistujúci config.
- [ ] Main table nemá AIRFLOW-specific assumptions pre heterogénne rows.
- [ ] Raw JSON viewer zachová backend response.
- [ ] `swaggerEnables` je implementované až po generated OpenAPI podpore.
- [ ] Focused tests, typecheck, lint, diff check a browser/network matrix green.

## Riziká a mitigácie

| Riziko | Dopad | Mitigácia |
|---|---|---|
| Generated ProviderType sa použije priamo a UI ponúkne VMWARE/FLASHCOPY/IBM_POWER | High | Explicit Platform Provider subset compile-time overený voči generated enum |
| Field ownership sa rozíde medzi Detail/Form/Payload | High | Jeden feature-local field ownership contract + exact-key regression tests |
| Hidden stale field sa odošle po type switchi | High | Discriminated form state + type reset + exact outbound payload tests |
| Edit clear sa stratí pri omission | High | Explicit null-vs-omission policy per relevant optional field |
| FE ručne pridá `swaggerEnables` bez OpenAPI | High | Task 1 contract prerequisite; generated schema zostáva API source of truth |
| Discriminated union rozbije current table search na `ipAddress` | Medium | Main table/search upraviť na cross-type fields; type-specific values patria do detailu |
| Raw JSON viewer začne ukazovať FE-normalized object | Medium | Zachovať `rawRecord` a samostatný JSON helper contract |
| Existing credentials unavailable option sa stratí | Medium | Edit regression test pre missing credential reference AIRFLOW/KEYCLOAK |
| Zmena začne riešiť infra providers alebo provider-connector feature | High | Scope iba `platform-administration/platform-providers`; VMWARE/FLASHCOPY/IBM_POWER sú explicitne out of UI type subset |

## Out of scope

- `providers-connectors/providers` infra provider feature.
- Recovery provider selection logic.
- Backend behavior mimo potrebného OpenAPI `swaggerEnables` contractu.
- Redizajn Platform Providers page layout; to patrí do samostatného page-layout-unification programu.
- Zmena generic `DataTable`.
- Dynamický schema-driven form engine.

## Working-tree safety

Pri vytvorení tohto plánu sú na vetve `test` pre-existing modified source files mimo tohto scope:

- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.tsx`
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupsListPage.tsx`

Tieto súbory nesmú byť resetované, stage-nuté ani zahrnuté do Platform Provider implementačných commitov.

## Odhad

Približne 8–14 hodín focused FE implementation + tests + browser/network verification po dostupnosti `swaggerEnables` OpenAPI contractu.

Implementácia má byť rozdelená do S/M taskov. Task, ktorý začne zasahovať viac ako približne 5 nezávislých files alebo viac subsystémov, sa má ďalej rozbiť.

## Otvorené otázky / blockers

1. Potvrdiť, že exact BE field name je naozaj `swaggerEnables` (nie podobný variant). Aktuálny generated OpenAPI ho neobsahuje.
2. Potvrdiť backend clear semantics pre relevantné optional strings: či explicitný Edit clear vyžaduje `null`, alebo backend interpretuje omission ako clear. Aktuálny FE používa `null` pre viacero cleared values; exact payload test sa musí riadiť backend kontraktom.
