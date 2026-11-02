# Recovery Applications: DAG lifecycle — TODO

Stav: implementované inline; focused testy, mocked browser a review dokončené. Dátum 2026-10-27. Kontrakt, rozhodnutia a testovacia matica: [PLAN](recovery-applications-dag-lifecycle-plan.md).

## Pravidlá vykonania po schválení

- [x] Human review a samostatné schválenie implementácie vrátane rozhodnutí PLAN §13.
- [x] Obnoviť status FE/BE; chrániť cudzie Orval, Recovery Groups, locales a task zmeny. Žiadny BE/generated/Group zásah.
- [x] Každý slice dopĺňa focused testy a vykoná ich pred pokračovaním; nečakať až na T7. Žiadny automatický commit/push v tomto zadaní.

Skratka `A` v cestách nižšie = `src/features/recovery-plans/recovery-applications`. Príkazy používajú úplné repo-relative cesty. Podúlohy sú sekvenčné slices S/M (najviac približne 5 dotknutých súborov vrátane testov); hlavné T1–T8 sú tematické skupiny, nie jeden veľký commit. Nové súbory sú označené „nový“.

## T1 — Contract/Orval audit

**Požiadavka:** Pred implementáciou obnoviť audit proti BE HEAD a pracovnej verzii Orval. Zachytiť permissions, HTTP obálky, raw cache shape, key factories pre inventory/runs a error cause. Neopravovať generated ručne.

**Súbory (read-only):** BE `api/routers/recovery_apps.py`, `recovery/recovery.py`, `api/schemas.py`, `apache_airflow/template_versions.py`; FE `src/generated/query/recovery-apps/recovery-apps.gen.ts`, `src/generated/query/zod/{appOrchestrationState,dagTemplateVersion,dagTemplateVersionsResponse,rollbackAppFromOrchestratorParams,getDagTemplateVersionsParams,recoveryAppsResponse,recoveryAppSubmitResponse}.gen.ts`, `src/generated/query/responseSchemas.gen.ts`, shared `orvalMutator.ts`, `validatingMutator.ts`, relevantné generated run key factories. Zápis iba prípadnej korekcie týchto dvoch plánov.

**Akceptácia:**
- [x] Submit 409, push 502 persistencia, rollback ok/skipped vs partial/failed, permissions a stored provider defaulty sú potvrdené aktuálnym BE kódom.
- [x] Generated volanie je `{ params: { recovery_app_id } }`; registry validuje success; 502 detail.rollback sa spracuje ako error body.
- [x] Presné list/inventory/runs keys a všetky nové polia sú zmapované; každý prípadný nesúlad je klasifikovaný OpenAPI/generator/FE mapper.

**Overenie:** Read-only Git status/log oboch repo, source audit a `git diff --check -- tasks/recovery-applications-dag-lifecycle-plan.md tasks/recovery-applications-dag-lifecycle-todo.md`. Žiadny api:update.

**Závislosti:** schválenie plánu. **Scope:** S, dokumentačný audit. **DoD:** kontrakt bez nevysvetlenej medzery a scope bez cudzích zmien.

## T2 — Read-only pushed lifecycle

**Požiadavka:** Pushed zakazuje všetky mutácie; Display a čítanie wizardu zostávajú. Fresh GET a 409 riešia stale cache; retained run_id nie je lock.

### T2a — Menu a drawer

**Súbory:** `A/components/RecoveryApplicationsTable.tsx`, `.test.tsx`, `.orchestration.test.tsx`; `A/pages/RecoveryApplicationsListPage.tsx`, `.test.tsx`. **Scope:** M, 5 súborov.
- [x] Draft Edit dostupný; pushed row menu aj drawer Edit umožňujú otvoriť wizard v read-only režime (rovnako ako Recovery Groups), bez mutácií alebo Save. Pending rollback/delete Edit blokuje.
- [x] Display/JSON/provider/run informácie fungujú pre oba stavy; tiers Active badge nemení lock pravidlá.
- [x] List navigačný callback umožní vstup do read-only Edit aj pri pushed, ale nie pri rollback/delete pending; Editor pred povolením mutácií vynúti fresh GET.

### T2b — Priamy Edit a save guards

**Súbory:** `A/pages/RecoveryApplicationEditorPage.tsx`, `.test.tsx`; `A/components/RecoveryAppBuilder.tsx`, `.test.tsx`. **Scope:** M, 4 súbory.
- [x] Entry refetch pred mutáciami, pushed read-only prop a submit-time guard; 409 znamená lock do authoritative refresh.
- [x] Native/custom edit, tiers drop/reorder a Save sú zablokované; všetky štyri kroky a Back zostanú čitateľné. `WizardSteps.disabled` aj Next/canContinue v read-only obídu `detailsValid`/`tiersValid`/`policySetValid`, aj keď provider, skupina, Policy Set alebo katalóg nie sú dostupné; mutation guards a provider locks ostanú účinné.
- [x] Refetch draft→pushed uzamkne bez tichého prepísania dirty draftu; refresh error po konflikte nesprístupní stale edit.

**Overovacie testy:** `npm.cmd exec -- vitest run src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.orchestration.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationsListPage.test.tsx` pre T2a; T2b `npm.cmd exec -- vitest run src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx`. Zahrnúť stale cache, direct URL, 409 race a keyboard/custom callback; testovať navigáciu do každého read-only kroku pri missing provider/group/policy, vrátane disabled Next/stepper brán v editovateľnom režime.

**Závislosti:** T1, T2b po T2a. **DoD:** všetky vstupy do mutácie chránené a configuration čitateľná; oba focused runy green. Produkčný build sa predvolene nespúšťa.

## T3 — Rollback action, ConfirmDialog, mutation a result

**Požiadavka:** Nová samostatná akcia podľa Group UX, bez Delete. Reuse Application result modalu; žiadna Group extrakcia.

### T3a — Generated mutation adapter a cache

**Súbory:** `A/hooks/useRollbackRecoveryApplication.ts` (nový), `.test.tsx` (nový); `A/pages/RecoveryApplicationsListPage.tsx`, `.test.tsx`. **Scope:** M, 4 súbory.
- [x] Obaliť useRollbackAppFromOrchestrator, odoslať iba recovery_app_id query, žiadne provider defaulty/overrides, žiadny source compute ani custom HTTP.
- [x] Raw success response aktualizuje list; cancel stale GET, invalidovať affected inventory/runs. onError refetch; bez optimistic unlock a automatic retry.
- [x] 403/409/400/502/network/invalid report rozlíšené; detail.rollback safeParse vracia report aj pri chybe, unknown settlement zostáva konzervatívny. `usePermissions` používa mockované údaje: neimplementovať na nich bezpečnostný gate; reálnu autorizáciu vynucuje BE (`ROLLBACK_RECOVERY_PLAN`, HTTP 403).

### T3b — Confirm a report UX

**Súbory:** `A/components/RecoveryApplicationsTable.tsx`, `.test.tsx`; `A/hooks/useRollbackRecoveryApplication.test.tsx` (nový z T3a); `A/components/RecoveryApplicationRollbackResultModal.test.tsx`. **Scope:** M, 4 súbory; existujúci modal source predvolene bez zmeny.
- [x] RowActionsMenu rollback slot je dostupný len pre pushed, nezávisí od onDelete. Confirm zachová konfiguráciu; Cancel bez requestu. Pri absencii reálneho permission source sa rollback podľa mockPermissions neschováva/nepovoľuje; BE 403 sa zobrazí zrozumiteľne, stav pushed zostane zamknutý.
- [x] Pending/double click/konkurenčný Delete blokované. ok/skipped ponechá app v zozname a odomkne až podľa BE; partial/failed report zostáva locked s potvrdeným retry.
- [x] Existing modal zobrazí airflow/storage/compute/vcenter a errors/raw report; missing report nepredstiera úspech.

**Overovacie testy:** `npm.cmd exec -- vitest run src/features/recovery-plans/recovery-applications/hooks/useRollbackRecoveryApplication.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationsListPage.test.tsx` (T3a); `npm.cmd exec -- vitest run src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryApplicationRollbackResultModal.test.tsx src/features/recovery-plans/recovery-applications/hooks/useDeleteRecoveryApplication.test.ts` (T3b). Fixtures s dvoma Airflow providermi a odlišným source/target; overiť absence override parametrov, nie len úspešný modal.

**Závislosti:** T1, T2; T3b po T3a. **DoD:** celý mock lifecycle zachová record a BE zámok, Delete regresia green, error report dostupný.

## Checkpoint C1 — Lifecycle po T1–T3

- [x] Focused T2/T3 testy green; changed-file ESLint a whitespace check.
- [x] Review pushed guard, 409 race, 502 report, retained run_id a cache reconciliation.
- [x] Žiadny BE/generated/Group diff; štítky dočasne využívajú existujúce kľúče, finálne texty v T6.

## T4 — DAG Template Version selector

**Požiadavka:** Krok 4, serverový katalóg/default a description; Save-only zachová výber; loading/error/empty/unknown/Retry bez hardcode.

### T4a — Selector a query

**Súbory:** `A/components/RecoveryAppBuilder.tsx`, `.test.tsx`; `A/components/DagTemplateVersionSelect.tsx` (nový lokálny komponent), `.test.tsx` (nový). **Scope:** M, 4 súbory.
- [x] Platform key z VMWARE/IBM_POWER source/stored lock; query disabled bez platformy. Neskorý starý response sa neuplatní.
- [x] Null/default možnosť z flagu default, presné explicitné hodnoty a description; uložená unknown verzia zostane viditeľná, nie nahradená.
- [x] Selector pri Save-only aj Push, rozlíšené loading/error/empty a Retry; read-only režim čitateľný. Žiadny nový wizard step.

### T4b — Source transition a readiness

**Súbory:** `A/model/recoveryApplicationDraft.ts`, `.test.ts`; `A/model/recoveryApplicationDraftReadiness.ts`, `.test.ts`; `A/components/RecoveryAppBuilder.tsx`. **Scope:** M, 5 súborov.
- [x] Potvrdená zmena platformy resetuje verziu na null, same-platform source zachová; Cancel nemení hodnotu.
- [x] Readiness rozlišuje `Save-only + null` (aj pri nedostupnom/nekonzistentnom katalógu povoliť s warning) od `Push` (blokovať do overenia) a `Save-only + explicitná neoverená verzia` (blokovať); read-only navigácia nevyžaduje platné details/tiers/policy ani katalóg.
- [x] Push toggle/refetch nemení explicitnú voľbu; chýbajúci/viacnásobný default je error, nie v1 fallback.

**Overovacie testy:** `npm.cmd exec -- vitest run src/features/recovery-plans/recovery-applications/components/DagTemplateVersionSelect.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx`; T4b `npm.cmd exec -- vitest run src/features/recovery-plans/recovery-applications/model/recoveryApplicationDraft.test.ts src/features/recovery-plans/recovery-applications/model/recoveryApplicationDraftReadiness.test.ts`. Testovať aj BE default v2 a iné budúce version labely.

**Závislosti:** T1, T2b, T5a; T4b po T4a. **DoD:** štyri kroky zachované, všetky stavy katalógu a source confirmation overené, bez straty Save-only voľby.

## T5 — Form mapping a GET/Edit/POST round-trip

**Požiadavka:** Oddeliť configured a deployed verziu v type/model/cache aj payload. T5a vykonať pred T4.

### T5a — Spotrebiteľské modely a mappere

**Súbory:** `A/model/recoveryApplicationTypes.ts`, `A/helpers/mapRecoveryApplications.ts`, `.test.ts`; `A/utils/recoveryApplicationFormMapper.ts`, `.test.ts`. **Scope:** M, 5 súborov.
- [x] Použiť AppOrchestrationStateOutput, configured form/wire/list pole a samostatnú deployed verziu.
- [x] GET→form→POST zachová explicitnú/null/absent hodnotu aj pri Save-only; rawRecord a fallback JSON zachovajú nové polia.
- [x] Deployed nikdy neprepíše configured; legacy missing fields a provider/notificationEmail round-trip ostávajú kompatibilné.

### T5b — Submit validácia a wire

**Súbory:** `A/utils/validateRecoveryApplication.ts`, `.test.ts`; `A/hooks/recoveryApplicationsWire.test.tsx`; `A/components/RecoveryAppBuilder.tsx`. **Scope:** M, 4 súbory.
- [x] Submit-time validácia používa tú istú template readiness ako UI podľa `pushToOrchestrator` a null/explicitnej verzie: nedostupný katalóg povoľuje iba Save-only null s warning, nie neoverenú explicitnú verziu ani Push; stale callback nemôže odoslať nepodporovanú voľbu.
- [x] Generated submit dostáva application.dag_template_version pri Save-only aj Push; form run/provider locks ostávajú.
- [x] Integration test rozlíši požadovanú a skutočne nasadenú verziu a spracuje null/absent po rollbacku.

### T5c — Save/Push settlement

**Súbory:** `A/hooks/useRecoveryApplications.ts`, `.test.tsx`; `A/pages/RecoveryApplicationSaveCompletion.integration.test.tsx`; `A/pages/RecoveryApplicationBuilderPage.tsx`, `A/pages/RecoveryApplicationEditorPage.tsx`. **Scope:** M, 5 súborov.
- [x] Raw response → list cache, riadený refresh; 409 a 502 invalidujú aj pri error/unmount; stale GET nevráti starý lock.
- [x] Push 502 po persistencii zachová draft/ID, bez success dialogu; fresh pushed=false dovolí opravu/retry a nevytvorí duplicate app.
- [x] Zachovať beginSave/failSave/completeSave, pending freeze, guards, submitted provider context a once-only navigation. Refresh failure po úspešnej mutácii sa nehlási ako zlyhanie uloženia.

**Overovacie testy:** T5a `npm.cmd exec -- vitest run src/features/recovery-plans/recovery-applications/helpers/mapRecoveryApplications.test.ts src/features/recovery-plans/recovery-applications/utils/recoveryApplicationFormMapper.test.ts`; T5b `npm.cmd exec -- vitest run src/features/recovery-plans/recovery-applications/utils/validateRecoveryApplication.test.ts src/features/recovery-plans/recovery-applications/hooks/recoveryApplicationsWire.test.tsx`; T5c `npm.cmd exec -- vitest run src/features/recovery-plans/recovery-applications/hooks/useRecoveryApplications.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationSaveCompletion.integration.test.tsx src/features/recovery-plans/recovery-applications/hooks/useRecoveryApplicationSaveCompletion.test.tsx`.

**Závislosti:** T5a po T1; T5b po T4b/T5a; T5c po T2/T3/T5b. **DoD:** presný wire round-trip a cache/error regressions green; Save Completion source sa nemení bez preukázanej potreby.

## Checkpoint C2 — Verzie po T5a, T4, T5b–c

- [x] Focused mapper/builder/wire/completion testy green; `npm.cmd run typecheck` pre cross-cutting model/props zmeny.
- [x] Review null/default semantics, unknown/unavailable Save policy a authoritative cache settlement.
- [x] Konfigurácia v Save-only prežije GET/Edit/POST; nasadená verzia ostáva samostatná.

## T6 — Display a EN/SK/CS

### T6a — Application Orchestration detail

**Súbory:** `A/components/RecoveryApplicationsTable.tsx`, `.orchestration.test.tsx`, `.test.tsx`. **Scope:** M, 3 súbory.
- [x] Airflow provider, pushed badge, stored run ID a version v existujúcom DetailView layout.
- [x] Pushed používa deployed, legacy missing „unknown“; draft configured je označené ako konfigurácia, nie deployment.
- [x] Run ID po rollbacku historický bez aktívneho DAG odkazu; nemení sa shared Group orchestration hook.

### T6b — Lokalizácia

**Súbory:** `src/locales/en.json`, `src/locales/sk.json`, `src/locales/cs.json`, `src/locales/recoveryRollbackTranslations.test.ts`, nový `src/locales/recoveryApplicationLifecycleTranslations.test.ts`. **Scope:** M, 5 súborov.
- [x] Rovnaké kľúče/interpolácie pre readonly, rollback confirm/loading/errors, template states/default a configured/deployed/history vo všetkých jazykoch.
- [x] Reuse existujúce result texty, descriptions prichádzajú z BE; žiadny Notification Email/help scope.
- [x] Žiadne prepísanie súbežných locale zmien ani plošné formátovanie JSON.

**Overovacie testy:** T6a `npm.cmd exec -- vitest run src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.orchestration.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx`; T6b `npm.cmd exec -- vitest run src/locales/recoveryRollbackTranslations.test.ts src/locales/recoveryApplicationLifecycleTranslations.test.ts`. JSON parse každého locale.

**Závislosti:** T2/T3/T4/T5. **DoD:** žiadna zámena configured/deployed, EN/SK/CS parity, layout regresia bez Group zmien.

## T7 — Vitest regresia

**Požiadavka:** Dopĺňať medzery matice PLAN §12 a spustiť affected suites; produkčné zmeny pri zlyhaní riešiť v príslušnom slice, nie rozširovať scope.

**Slices/súbory:** T7a `A/hooks/{useRecoveryApplications.test.tsx,useRollbackRecoveryApplication.test.tsx,recoveryApplicationsWire.test.tsx}`, `A/pages/RecoveryApplicationSaveCompletion.integration.test.tsx` (4); T7b `A/components/{RecoveryAppBuilder.test.tsx,RecoveryApplicationsTable.test.tsx,RecoveryApplicationsTable.orchestration.test.tsx}`, `A/pages/{RecoveryApplicationEditorPage.test.tsx,RecoveryApplicationsListPage.test.tsx}` (5). Mappere/locales/modal/Delete/completion existujúce testy sa spustia read-only podľa affected zmeny. **Scope:** M na slice.

**Akceptácia:**
- [x] Deterministické race fixtures: stale GET, 409, push 502 lokálne uložený, rollback 502 partial/failed, refresh failure a unmount; žiadne sleeps ako náhrada synchronizácie.
- [x] Obe platformy, VMware v1/Power v1/v2, server defaults, unknown/unavailable/Retry, Save-only null pri výpadku katalógu (s warning), blokovaný Push/explicitná verzia pri výpadku, round-trip a celý lifecycle pokryté; 403 rollback nesmie závisieť na mockPermissions.
- [x] Delete, provider locks, Save Completion once-only/guard/pending a result modal bez regresie; žiadne skipped/deleted testy ani oslabené assertions.

**Overenie:** Explicitné príkazy T2–T6 nad dotknutými súbormi; navyše `npm.cmd exec -- vitest run src/features/recovery-plans/recovery-applications/hooks/useDeleteRecoveryApplication.test.ts src/features/recovery-plans/recovery-applications/hooks/useRecoveryApplicationSaveCompletion.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryApplicationRollbackResultModal.test.tsx`. Spustiť `npm.cmd exec -- eslint <explicitný zoznam zmenených ts/tsx súborov>` po nahradení zoznamu skutočným diffom. Nie full npm test/build.

**Závislosti:** T6 a predchádzajúce slices. **DoD:** zaznamenať presné príkazy, počty, výsledky a nevykonané širšie kontroly.

## Checkpoint C3 — Po T6–T7

- [x] Matica PLAN má ku každému riadku test dôkaz; focused suites/locale parse/lint green.
- [x] Review raw vs mapped cache, BE authorization errors, report parsing a žiadne optimistic unlock.
- [x] Browser runtime/prerekvizity potvrdené pred T8; žiadny live rollout.

## T8 — Playwright/browser integration a finálna kontrola

**Požiadavka:** Samostatný mockovaný Application browser smoke podľa existujúcich QA patterns. Oddeliť ho od skutočného BE testovania.

**Súbory:** nový `scripts/qa/verify-recovery-applications-dag-lifecycle.mjs`; prípadný nový lokálny fixture modul pre tento skript; tieto dva PLAN/TODO dokumenty pre dôkazy. **Scope:** M, do 4 súborov; `scripts/qa/verify-recovery-groups.mjs` ostáva nedotknutý.

**Akceptácia:**
- [x] Všetky /api requesty mocked, unknown endpoint fail; Create→Save-only version→Push→Edit prístupné, wizard read-only/direct URL→Rollback→Edit→re-push pre VMware aj IBM Power; Confirm Cancel/pending/report/403/409/502/Retry, EN/SK/CS a console/network.
- [x] Reálne browser reload/keyboard/focus, všetky štyri kroky v read-only aj pri neplatných/chýbajúcich referenciách, version description a Save-only null warning pri výpadku katalógu overené; report, retained ID/run ID a configured/deployed správne po refetch. Screenshot/network dôkazy bez credentials.
- [x] Reálna BE integrácia označená zvlášť ako nevykonaná, kým nie je explicitné oprávnenie na test provisioning/rollback a určené izolované fixtures. Mock smoke nie je BE integration dôkaz.

**Overenie (až pri implementácii):** `node --check scripts/qa/verify-recovery-applications-dag-lifecycle.mjs`; overiť dostupnosť PLAYWRIGHT_MODULE/browser a lokálneho dev servera; `node scripts/qa/verify-recovery-applications-dag-lifecycle.mjs` s dokumentovaným APP_URL a runtime. Chýbajúci runtime je blocker browser výsledku, nie úspešný test. `git diff --check`; skontrolovať tracked diff aj untracked nové zdroje/dokumenty. Full build iba pri zdôvodnenej potrebe/schválení.

**Závislosti:** C3, browser runtime. **DoD:** mock browser dôkazy a finálny scope review uložené, otvorené otázky a limity uvedené; žiadna živá deštruktívna akcia, commit ani push podľa tohto zadania.

## Checkpoint C4 — Odovzdanie implementácie (budúca práca)

- [x] T1–T8 acceptance a DoD splnené; nezávislé code review dokončené.
- [ ] Finálne používateľské review implementácie po odovzdaní.
- [x] Celá matica pokrytá alebo explicitne blokované reálne integrácie; žiadne tvrdenie o neuskutočnenom teste/build.
- [x] Diff obsahuje iba schválený Application scope a locales; backend/generated/Group/rozpracované cudzie zmeny zachované.

## Verifikácia vykonania — 2026-10-27

T1–T8 vykonané inline, bez commitu/pushu. Finálny focused run: **24 súborov, 529 testov passed**, Vitest 4.1.11, 168.94 s. Následná unsupported-platform regresia: **1 passed** (ostatné testy v tomto cielenom `-t` rune filtrované, žiadny source test preskočený). Spolu 530 odlišných overených test cases v dotknutej sade; celý repo test suite nebol spustený.

Reprodukovateľný finálny focused príkaz (PowerShell):

```powershell
$app = 'src/features/recovery-plans/recovery-applications'
$focusedTests = @(
  "$app/components/RecoveryAppBuilder.test.tsx"
  "$app/components/DagTemplateVersionSelect.test.tsx"
  "$app/model/recoveryApplicationDraft.test.ts"
  "$app/model/recoveryApplicationDraftReadiness.test.ts"
  "$app/utils/recoveryApplicationFormMapper.test.ts"
  "$app/utils/validateRecoveryApplication.test.ts"
  "$app/helpers/mapRecoveryApplications.test.ts"
  "$app/hooks/useRecoveryApplications.test.tsx"
  "$app/hooks/useRollbackRecoveryApplication.test.tsx"
  "$app/hooks/useRecoveryApplicationSaveCompletion.test.tsx"
  "$app/hooks/recoveryApplicationsWire.test.tsx"
  "$app/hooks/useDeleteRecoveryApplication.test.ts"
  "$app/components/RecoveryApplicationsTable.test.tsx"
  "$app/components/RecoveryApplicationsTable.lifecycle.test.tsx"
  "$app/components/RecoveryApplicationsTable.orchestration.test.tsx"
  "$app/components/RecoveryApplicationRollbackResultModal.test.tsx"
  "$app/pages/RecoveryApplicationBuilderPage.test.tsx"
  "$app/pages/RecoveryApplicationEditorPage.test.tsx"
  "$app/pages/RecoveryApplicationEditorPage.cache.test.tsx"
  "$app/pages/RecoveryApplicationSaveCompletion.integration.test.tsx"
  "$app/pages/RecoveryApplicationsListPage.test.tsx"
  'src/shared/components/data-table/RowActionsMenu.test.tsx'
  'src/locales/recoveryRollbackTranslations.test.ts'
  'src/locales/recoveryApplicationLifecycleTranslations.test.ts'
)
npm.cmd exec -- vitest run @focusedTests --maxWorkers=2
```

Doplňujúci run po explicitnom platform mapping fixe:

```powershell
npm.cmd exec -- vitest run src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx -t 'unsupported' --maxWorkers=2
```

Ďalšie vykonané kontroly:

- `npm.cmd run typecheck` (`tsc -b`) — passed.
- Focused ESLint nad každým modified/untracked TS/TSX súborom v `src` — passed; dodatočne Builder source/test po poslednej platform regresii — passed. Zoznam bol získaný `git diff --name-only -- src` + `git ls-files --others --exclude-standard src`, filtrovaný na `.ts/.tsx`, odovzdaný cez `npm.cmd exec -- eslint @lintPaths`.
- `node --check scripts/qa/verify-recovery-applications-dag-lifecycle.mjs` a `npm.cmd exec -- eslint scripts/qa/verify-recovery-applications-dag-lifecycle.mjs` — passed.
- `node scripts/qa/verify-recovery-applications-dag-lifecycle.mjs` nad vlastným Vite `http://127.0.0.1:5198` — **21 scenario records passed**, `mode=mocked-browser`, `errors=[]`, žiadne neznáme API/external requesty. Runtime existujúci `node_modules/.cache/scroll-probe/node_modules/playwright-core/index.mjs`, headless Edge. Vlastný server po kontrole ukončený; iné servery nedotknuté.
- JSON parse EN/SK/CS — 31 lifecycle kľúčov v každom jazyku, parity/interpolácie overené Vitest testom.
- `git diff --check`, scope kontrola tracked aj nových untracked súborov — passed. Nové source/QA dokumenty zahrnuté do kontroly; nič nestaged.

Browser dôkazy: `node_modules/.cache/application-lifecycle-qa/report.json`, `network.json` a screenshoty VMware/Power readonly, Save-only, rollback ok/skipped/partial/failed a version/history/locale scenárov. Artefakty sú lokálne ignored QA výstupy, nie produkčné súbory. Screenshoty vrátane mobilného SK readonly view vizuálne skontrolované.

Pokrytá matica: create/default/explicit Save-only, VMware a Power lifecycle, Power v2 push/deployed display, katalóg failure/Retry, pending a Cancel, všetky rollback statuses + 403/409/502, lokálne uložený push failure a retry, configured≠deployed, historical run, EN/SK/CS a missing-reference read-only štyri kroky. Unit/wire testy dopĺňajú cache races/unmount, 409 recovery, 502/network verifikáciu Create, mapper round-trip, default/unknown/empty a platform/source confirmation.

Nezávislé review: tri material findings opravené (Create permanent409 lock, Create uncertain-result retry bez GET, retained ID aktívny link), scoped re-review bez zostávajúcich material findings. Prvý stale-cache Editor draft problém zachytený samostatným review a pokrytý `RecoveryApplicationEditorPage.cache.test.tsx`.

Limity: reálna BE integrácia ani živé provisioning/rollback akcie neboli spustené; mocked browser nie je live integration dôkaz. Celá test suite ani production build neboli spustené podľa focused-verification pravidiel. BE, generated Orval, OpenAPI a Recovery Groups zostali bez zmien. HEAD nezmenený `bea04841`, žiadny commit ani push.

## Oprava siedmich hlásených zlyhaní po úprave UX

Priložený full-suite výpis hlásil 7 zlyhaní v 4 súboroch. Rozpracované zmeny boli zosúladené bez návratu starého UX: default template je jedna položka `version (default)`, jej wire hodnota ostáva null; explicitný Save-only test vyberá nondefault v2. Pushed menu/drawer Edit otvára readonly wizard, pričom Editor naďalej blokuje mutácie. Preklady EN/SK/CS a browser QA očakávania zodpovedajú týmto pravidlám. Nesúvisiaci routing snapshot nie je súčasťou opravy.

Pri kontrole navyše reprodukované zlyhanie uloženej explicitnej default verzie pri failed refresh cached katalógu: default option sa odfiltrovala a select ukazoval prázdnu hodnotu. Nový regression test bol najprv red; selector teraz zachová takúto uloženú hodnotu ako disabled option bez duplicity.

Overenie: štyri pôvodne zlyhávajúce súbory 127/127 green; súvisiace Editor/cache/Table/orchestration/locale regresie 81/81 green pred pridaním novej regresie. Finálny spoločný focused run: **9 súborov, 209/209 testov passed**, 103.56 s. Focused ESLint dotknutých TS/TSX/QA súborov, `node --check scripts/qa/verify-recovery-applications-dag-lifecycle.mjs` a `git diff --check` prešli. Full suite, production build ani live infra akcie sa v tejto oprave neopakovali; rozsah zlyhaní je presne známy.

Finálny testovací príkaz používal explicitne tieto cesty:

```powershell
$app = 'src/features/recovery-plans/recovery-applications'
$failedTestRegression = @(
  "$app/components/DagTemplateVersionSelect.test.tsx"
  "$app/components/RecoveryAppBuilder.test.tsx"
  "$app/components/RecoveryApplicationsTable.lifecycle.test.tsx"
  "$app/pages/RecoveryApplicationsListPage.test.tsx"
  "$app/pages/RecoveryApplicationEditorPage.test.tsx"
  "$app/pages/RecoveryApplicationEditorPage.cache.test.tsx"
  "$app/components/RecoveryApplicationsTable.test.tsx"
  "$app/components/RecoveryApplicationsTable.orchestration.test.tsx"
  'src/locales/recoveryApplicationLifecycleTranslations.test.ts'
)
npm.cmd exec -- vitest run @failedTestRegression --maxWorkers=2
```

Počas overovania pribudol súbežný commit `c57c1dc2` zahŕňajúci hlavné opravy aj novú cached-default regresiu. Následná oprava ponecháva iba lintom potvrdené odstránenie redundantného null fallbacku v selecte a tento verifikačný záznam; routing snapshot sa nestaguje.
