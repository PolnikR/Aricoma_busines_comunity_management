# TODO: Type-specific Platform Provider fields

Detailný plán: `tasks/platform-provider-type-specific-fields-plan.md`.

## Safety

- [x] Pracovať na vetve `test`.
- [x] Pred implementáciou skontrolovať `git status --short`.
- [x] Nedotknúť sa pre-existing Recovery Groups zmien:
  - `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.tsx`
  - `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupsListPage.tsx`
- [x] Platform Provider refactor nesmie meniť `providers-connectors/providers` infra provider feature.

# Phase 0 — Contract prerequisite

- [x] Task 1 — Potvrdiť exact BACKEND field `swaggerEnabled` v BE/OpenAPI.
- [x] FE OpenAPI client vygenerovaný štandardným Orval flow; žiadny handwritten workaround.

## Checkpoint A

- [x] `swaggerEnabled` exact name/type potvrdený.
- [x] Generated `OrchestrationProvider` a `OrchestrationProviderRecord` ho obsahujú.

# Phase 1 — FE type foundation

- [x] Task 2 — Platform Provider subset iba `AIRFLOW | SMTP | BACKEND | KEYCLOAK` + field ownership contract.
- [x] Task 3 — Discriminated union record model.
- [x] Task 4 — Base mapper + 4 type-specific response mappers.

## Checkpoint B

- [x] VMWARE/FLASHCOPY/IBM_POWER nie sú Platform Provider UI options.
- [x] Mixed four-type response sa mapuje type-safe.
- [x] Cross-type config keys sa v normalized recordoch nenachádzajú.
- [x] Raw GET record zostáva pre JSON viewer.

# Phase 2 — Create/Edit

- [x] Task 5 — Common + type-specific effective form state.
- [x] Task 6 — Exact type-specific field rendering.
- [x] Task 7 — Type-aware edit initialization + reset pri zmene type.
- [x] Task 8 — Type-specific validation.

## Exact form field matrix

### Common
- [x] ID.
- [x] Name.
- [x] Description.
- [x] Type.
- [x] URL.

### AIRFLOW
- [x] IP address.
- [x] Port.
- [x] DAG directory.
- [x] Credential.
- [x] Notification email.
- [x] Žiadne SMTP/BACKEND/KEYCLOAK fields.

### SMTP
- [x] IP address.
- [x] Port.
- [x] From email.
- [x] Disable SSL.
- [x] Disable TLS.
- [x] Žiadne AIRFLOW/BACKEND/KEYCLOAK fields.

### BACKEND
- [x] Notification email.
- [x] Enable logging.
- [x] Enable JWT.
- [x] Swagger enabled cez generated OpenAPI contract.
- [x] Žiadne AIRFLOW/SMTP/KEYCLOAK fields.

### KEYCLOAK
- [x] Realm.
- [x] Client ID.
- [x] Credential.
- [x] Žiadne AIRFLOW/SMTP/BACKEND fields.

## Type-switch regression

- [x] BACKEND -> AIRFLOW odstráni logging/JWT/Swagger state z effective payloadu.
- [x] SMTP -> KEYCLOAK odstráni SMTP state z effective payloadu.
- [x] Common fields zostanú.
- [x] Dirty-state porovnáva resetnutý effective form state bez stale cross-type hodnôt.

## Checkpoint C

- [x] Create/Edit visible fields sedia presne s matrix.
- [x] Edit prefilluje správne hodnoty.
- [x] Hidden stale values neblokujú validáciu.

# Phase 3 — Submit payload

- [x] Task 9 — 4 type-specific submit payload builders.
- [x] Task 10 — Explicit clear null/omission semantics pre relevantné optional fields.
- [x] Task 11 — Generated schema zostáva final API validation boundary.

## Exact payload assertions

### AIRFLOW payload
- [x] common keys.
- [x] `ipAddress`.
- [x] `port`.
- [x] `dagDir`.
- [x] `credentialId`.
- [x] `notificationEmail`.
- [x] bez `fromEmail`, SSL/TLS, logging/JWT/Swagger, realm/clientId.

### SMTP payload
- [x] common keys.
- [x] `ipAddress`.
- [x] `port`.
- [x] `fromEmail`.
- [x] `disableSsl`.
- [x] `disableTls`.
- [x] bez DAG/credential/notificationEmail/logging/JWT/Swagger/realm/clientId.

### BACKEND payload
- [x] common keys.
- [x] `notificationEmail`.
- [x] `loggingEnabled`.
- [x] `jwtEnabled`.
- [x] `swaggerEnabled`.
- [x] bez IP/port/DAG/credential/SMTP/Keycloak fields.

### KEYCLOAK payload
- [x] common keys.
- [x] `realm`.
- [x] `clientId`.
- [x] `credentialId`.
- [x] bez IP/port/DAG/email/SMTP/BACKEND fields.

## Checkpoint D

- [x] Exact `toEqual()` tests pre 4 request payloads.
- [x] Nerelevantné fields sa neposielajú ani ako `null`.
- [x] Relevantný boolean `false` sa zachová.
- [x] Cleared relevant optional strings sa normalizujú na `null`; pokryté AIRFLOW, SMTP a KEYCLOAK testami.

# Phase 4 — Detail + table

- [x] Task 12 — Type-specific DetailDrawer sections.
- [x] Task 13 — Main table iba cross-type summary columns.
- [x] Task 14 — Raw JSON viewer regression.

## Exact detail matrix

### AIRFLOW detail
- [x] Common.
- [x] IP address.
- [x] Port.
- [x] DAG directory.
- [x] Credential.
- [x] Notification email.

### SMTP detail
- [x] Common.
- [x] IP address.
- [x] Port.
- [x] From email.
- [x] Disable SSL.
- [x] Disable TLS.

### BACKEND detail
- [x] Common.
- [x] Notification email.
- [x] Logging enabled.
- [x] JWT enabled.
- [x] Swagger enabled.

### KEYCLOAK detail
- [x] Common.
- [x] Realm.
- [x] Client ID.
- [x] Credential.

- [x] Detail nezobrazuje nerelevantné `-` rows.
- [x] `credentialStatus` ostáva len read-only metadata pri AIRFLOW/KEYCLOAK credential.
- [x] JSON viewer stále ukazuje raw validated GET response.

## Checkpoint E

- [x] Detail, main table a JSON majú oddelené zodpovednosti.
- [x] Main table nepredpokladá `ipAddress`/`dagDir` na každom provider type.

# Phase 5 — Verification

- [x] Task 15 — Focused model/API/form/modal/table tests + forced TypeScript build + focused lint + diff check.
- [ ] Task 16 — Browser Create/Edit/Detail + Network matrix pre všetky 4 typy.

Automated verification evidence:

- [x] Platform Provider + dependent Recovery Group focused suite: 10 files / 75 tests green pred final clear-semantics extension.
- [x] Clear-semantics mapper suite: 1 file / 6 tests green po extension.
- [x] `tsc -b --force` green.
- [x] Focused ESLint (`--no-cache`) green pre všetky zasiahnuté TS/TSX groups.
- [x] `en/sk/cs` locale JSON parse green.
- [x] `git diff --check` green.

## Browser/network

- [ ] AIRFLOW create/edit/detail/request.
- [ ] SMTP create/edit/detail/request.
- [ ] BACKEND create/edit/detail/request.
- [ ] KEYCLOAK create/edit/detail/request.
- [ ] BACKEND -> AIRFLOW type switch request bez BACKEND keys.
- [ ] SMTP -> KEYCLOAK type switch request bez SMTP keys.
- [ ] Browser console bez nových errors/warnings.

Browser blocker (2026-09-01): lokálny FE na `127.0.0.1:5173` sa korektne pokúsil presmerovať na Keycloak `10.99.99.53:8081`, ale Rel.AI Chromium povoľuje iba loopback porty. OIDC authorize request bol zablokovaný ako `outside_allowed_loopback_ports` / `ERR_BLOCKED_BY_CLIENT`, takže autentizovanú Platform Providers page ani reálny POST network body nemožno v tomto browser prostredí overiť bez obchádzania auth.

# Final Definition of Done

- [x] Platform Provider type options sú presne 4.
- [x] FE domain model je discriminated union.
- [x] Response mapper je type-specific.
- [x] Create/Edit fields sú type-specific.
- [x] Edit initialization je type-specific.
- [x] Type switching odstraňuje stale fields z effective payloadu.
- [x] Validation je type-specific.
- [x] Submit payload je type-specific.
- [x] Nerelevantné fields sa neposielajú.
- [x] Detail zobrazuje iba relevantné config fields.
- [x] Main table je cross-type summary.
- [x] Raw JSON viewer zachovaný.
- [x] `swaggerEnabled` používa generated OpenAPI contract.
- [ ] Browser/network matrix green — blokované externým Keycloak redirectom v Rel.AI browseri.
