# TODO: Type-specific Platform Provider fields

Detailný plán: `tasks/platform-provider-type-specific-fields-plan.md`.

## Safety

- [ ] Pracovať na vetve `test`.
- [ ] Pred implementáciou skontrolovať `git status --short`.
- [ ] Nedotknúť sa pre-existing Recovery Groups zmien:
  - `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.tsx`
  - `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupsListPage.tsx`
- [ ] Platform Provider refactor nesmie meniť `providers-connectors/providers` infra provider feature.

# Phase 0 — Contract prerequisite

- [x] Task 1 — Potvrdiť exact BACKEND field `swaggerEnables` v BE/OpenAPI.
- [x] FE OpenAPI client vygenerovaný štandardným Orval flow; žiadny handwritten workaround.

## Checkpoint A

- [x] `swaggerEnables` exact name/type potvrdený.
- [x] Generated `OrchestrationProvider` a `OrchestrationProviderRecord` ho obsahujú.

# Phase 1 — FE type foundation

- [ ] Task 2 — Platform Provider subset iba `AIRFLOW | SMTP | BACKEND | KEYCLOAK` + field ownership contract.
- [ ] Task 3 — Discriminated union record model.
- [ ] Task 4 — Base mapper + 4 type-specific response mappers.

## Checkpoint B

- [ ] VMWARE/FLASHCOPY/IBM_POWER nie sú Platform Provider UI options.
- [ ] Mixed four-type response sa mapuje type-safe.
- [ ] Cross-type config keys sa v normalized recordoch nenachádzajú.
- [ ] Raw GET record zostáva pre JSON viewer.

# Phase 2 — Create/Edit

- [ ] Task 5 — Common + type-specific form state.
- [ ] Task 6 — Exact type-specific field rendering.
- [ ] Task 7 — Type-aware edit initialization + reset pri zmene type.
- [ ] Task 8 — Type-specific validation.

## Exact form field matrix

### Common
- [ ] ID.
- [ ] Name.
- [ ] Description.
- [ ] Type.
- [ ] URL.

### AIRFLOW
- [ ] IP address.
- [ ] Port.
- [ ] DAG directory.
- [ ] Credential.
- [ ] Notification email.
- [ ] Žiadne SMTP/BACKEND/KEYCLOAK fields.

### SMTP
- [ ] IP address.
- [ ] Port.
- [ ] From email.
- [ ] Disable SSL.
- [ ] Disable TLS.
- [ ] Žiadne AIRFLOW/BACKEND/KEYCLOAK fields.

### BACKEND
- [ ] Notification email.
- [ ] Enable logging.
- [ ] Enable JWT.
- [ ] Swagger enabled po OpenAPI contract update.
- [ ] Žiadne AIRFLOW/SMTP/KEYCLOAK fields.

### KEYCLOAK
- [ ] Realm.
- [ ] Client ID.
- [ ] Credential.
- [ ] Žiadne AIRFLOW/SMTP/BACKEND fields.

## Type-switch regression

- [ ] BACKEND -> AIRFLOW odstráni logging/JWT/Swagger state.
- [ ] SMTP -> KEYCLOAK odstráni SMTP state.
- [ ] Common fields zostanú.
- [ ] Dirty-state porovnáva iba relevantné fields.

## Checkpoint C

- [ ] Create/Edit visible fields sedia presne s matrix.
- [ ] Edit prefilluje správne hodnoty.
- [ ] Hidden stale values neblokujú validáciu.

# Phase 3 — Submit payload

- [ ] Task 9 — 4 type-specific submit payload builders.
- [ ] Task 10 — Explicit clear null/omission semantics pre relevantné optional fields.
- [ ] Task 11 — Generated schema zostáva final API validation boundary.

## Exact payload assertions

### AIRFLOW payload
- [ ] common keys.
- [ ] `ipAddress`.
- [ ] `port`.
- [ ] `dagDir`.
- [ ] `credentialId`.
- [ ] `notificationEmail`.
- [ ] bez `fromEmail`, SSL/TLS, logging/JWT/Swagger, realm/clientId.

### SMTP payload
- [ ] common keys.
- [ ] `ipAddress`.
- [ ] `port`.
- [ ] `fromEmail`.
- [ ] `disableSsl`.
- [ ] `disableTls`.
- [ ] bez DAG/credential/notificationEmail/logging/JWT/Swagger/realm/clientId.

### BACKEND payload
- [ ] common keys.
- [ ] `notificationEmail`.
- [ ] `loggingEnabled`.
- [ ] `jwtEnabled`.
- [ ] `swaggerEnables`.
- [ ] bez IP/port/DAG/credential/SMTP/Keycloak fields.

### KEYCLOAK payload
- [ ] common keys.
- [ ] `realm`.
- [ ] `clientId`.
- [ ] `credentialId`.
- [ ] bez IP/port/DAG/email/SMTP/BACKEND fields.

## Checkpoint D

- [ ] Exact `toEqual()` tests pre 4 request payloads.
- [ ] Nerelevantné fields sa neposielajú ani ako `null`.
- [ ] Relevantný boolean `false` sa zachová.
- [ ] Edit clear používa BE-konformný null/omission contract.

# Phase 4 — Detail + table

- [ ] Task 12 — Type-specific DetailDrawer sections.
- [ ] Task 13 — Main table iba cross-type summary columns.
- [ ] Task 14 — Raw JSON viewer regression.

## Exact detail matrix

### AIRFLOW detail
- [ ] Common.
- [ ] IP address.
- [ ] Port.
- [ ] DAG directory.
- [ ] Credential.
- [ ] Notification email.

### SMTP detail
- [ ] Common.
- [ ] IP address.
- [ ] Port.
- [ ] From email.
- [ ] Disable SSL.
- [ ] Disable TLS.

### BACKEND detail
- [ ] Common.
- [ ] Notification email.
- [ ] Logging enabled.
- [ ] JWT enabled.
- [ ] Swagger enabled.

### KEYCLOAK detail
- [ ] Common.
- [ ] Realm.
- [ ] Client ID.
- [ ] Credential.

- [ ] Detail nezobrazuje nerelevantné `-` rows.
- [ ] `credentialStatus`, ak ostáva, je len read-only metadata pri credential.
- [ ] JSON viewer stále ukazuje raw validated GET response.

## Checkpoint E

- [ ] Detail, main table a JSON majú oddelené zodpovednosti.
- [ ] Main table nepredpokladá `ipAddress`/`dagDir` na každom provider type.

# Phase 5 — Verification

- [ ] Task 15 — Focused model/API/form/modal/table tests + typecheck/lint/diff check.
- [ ] Task 16 — Browser Create/Edit/Detail + Network matrix pre všetky 4 typy.

## Browser/network

- [ ] AIRFLOW create/edit/detail/request.
- [ ] SMTP create/edit/detail/request.
- [ ] BACKEND create/edit/detail/request.
- [ ] KEYCLOAK create/edit/detail/request.
- [ ] BACKEND -> AIRFLOW type switch request bez BACKEND keys.
- [ ] SMTP -> KEYCLOAK type switch request bez SMTP keys.
- [ ] Browser console bez nových errors/warnings.

# Final Definition of Done

- [ ] Platform Provider type options sú presne 4.
- [ ] FE domain model je discriminated union.
- [ ] Response mapper je type-specific.
- [ ] Create/Edit fields sú type-specific.
- [ ] Edit initialization je type-specific.
- [ ] Type switching odstraňuje stale fields.
- [ ] Validation je type-specific.
- [ ] Submit payload je type-specific.
- [ ] Nerelevantné fields sa neposielajú.
- [ ] Detail zobrazuje iba relevantné config fields.
- [ ] Main table je cross-type summary.
- [ ] Raw JSON viewer zachovaný.
- [ ] `swaggerEnables` nejde do FE mimo OpenAPI contractu.
- [ ] Focused tests/typecheck/lint/diff/browser/network green.
