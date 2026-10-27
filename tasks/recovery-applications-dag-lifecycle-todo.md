# Recovery Applications: DAG lifecycle — TODO

Stav: iba plán, žiadna implementácia vykonaná ani schválená. Dátum 2026-10-27. Kontrakt, rozhodnutia a testovacia matica: [PLAN](recovery-applications-dag-lifecycle-plan.md).

## Pravidlá vykonania po schválení

- [ ] Human review a samostatné schválenie implementácie vrátane rozhodnutí PLAN §13.
- [ ] Obnoviť status FE/BE; chrániť cudzie Orval, Recovery Groups, locales a task zmeny. Žiadny BE/generated/Group zásah.
- [ ] Každý slice dopĺňa focused testy a vykoná ich pred pokračovaním; nečakať až na T7. Žiadny automatický commit/push v tomto zadaní.

Skratka `A` v cestách nižšie = `src/features/recovery-plans/recovery-applications`. Príkazy používajú úplné repo-relative cesty. Podúlohy sú sekvenčné slices S/M (najviac približne 5 dotknutých súborov vrátane testov); hlavné T1–T8 sú tematické skupiny, nie jeden veľký commit. Nové súbory sú označené „nový“.

## T1 — Contract/Orval audit

**Požiadavka:** Pred implementáciou obnoviť audit proti BE HEAD a pracovnej verzii Orval. Zachytiť permissions, HTTP obálky, raw cache shape, key factories pre inventory/runs a error cause. Neopravovať generated ručne.

**Súbory (read-only):** BE `api/routers/recovery_apps.py`, `recovery/recovery.py`, `api/schemas.py`, `apache_airflow/template_versions.py`; FE `src/generated/query/recovery-apps/recovery-apps.gen.ts`, `src/generated/query/zod/{appOrchestrationState,dagTemplateVersion,dagTemplateVersionsResponse,rollbackAppFromOrchestratorParams,getDagTemplateVersionsParams,recoveryAppsResponse,recoveryAppSubmitResponse}.gen.ts`, `src/generated/query/responseSchemas.gen.ts`, shared `orvalMutator.ts`, `validatingMutator.ts`, relevantné generated run key factories. Zápis iba prípadnej korekcie týchto dvoch plánov.

**Akceptácia:**
- [ ] Submit 409, push 502 persistencia, rollback ok/skipped vs partial/failed, permissions a stored provider defaulty sú potvrdené aktuálnym BE kódom.
- [ ] Generated volanie je `{ params: { recovery_app_id } }`; registry validuje success; 502 detail.rollback sa spracuje ako error body.
- [ ] Presné list/inventory/runs keys a všetky nové polia sú zmapované; každý prípadný nesúlad je klasifikovaný OpenAPI/generator/FE mapper.

**Overenie:** Read-only Git status/log oboch repo, source audit a `git diff --check -- tasks/recovery-applications-dag-lifecycle-plan.md tasks/recovery-applications-dag-lifecycle-todo.md`. Žiadny api:update.

**Závislosti:** schválenie plánu. **Scope:** S, dokumentačný audit. **DoD:** kontrakt bez nevysvetlenej medzery a scope bez cudzích zmien.

## T2 — Read-only pushed lifecycle

**Požiadavka:** Pushed zakazuje všetky mutácie; Display a čítanie wizardu zostávajú. Fresh GET a 409 riešia stale cache; retained run_id nie je lock.

### T2a — Menu a drawer

**Súbory:** `A/components/RecoveryApplicationsTable.tsx`, `.test.tsx`, `.orchestration.test.tsx`; `A/pages/RecoveryApplicationsListPage.tsx`, `.test.tsx`. **Scope:** M, 5 súborov.
- [ ] Draft Edit dostupný, pushed row menu aj drawer Edit disabled s vysvetlením; callback neobíde guard.
- [ ] Display/JSON/provider/run informácie fungujú pre oba stavy; tiers Active badge nemení lock pravidlá.
- [ ] List navigačný callback nevstúpi do Edit pre aktuálne pushed/rollback pending app.

### T2b — Priamy Edit a save guards

**Súbory:** `A/pages/RecoveryApplicationEditorPage.tsx`, `.test.tsx`; `A/components/RecoveryAppBuilder.tsx`, `.test.tsx`. **Scope:** M, 4 súbory.
- [ ] Entry refetch pred mutáciami, pushed read-only prop a submit-time guard; 409 znamená lock do authoritative refresh.
- [ ] Native/custom edit, tiers drop/reorder a Save sú zablokované; kroky a Back zostanú čitateľné; provider locks zachované.
- [ ] Refetch draft→pushed uzamkne bez tichého prepísania dirty draftu; refresh error po konflikte nesprístupní stale edit.

**Overovacie testy:** `npm.cmd exec -- vitest run src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.orchestration.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationsListPage.test.tsx` pre T2a; T2b `npm.cmd exec -- vitest run src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx`. Zahrnúť stale cache, direct URL, 409 race a keyboard/custom callback.

**Závislosti:** T1, T2b po T2a. **DoD:** všetky vstupy do mutácie chránené a configuration čitateľná; oba focused runy green. Produkčný build sa predvolene nespúšťa.

## T3 — Rollback action, ConfirmDialog, mutation a result

**Požiadavka:** Nová samostatná akcia podľa Group UX, bez Delete. Reuse Application result modalu; žiadna Group extrakcia.

### T3a — Generated mutation adapter a cache

**Súbory:** `A/hooks/useRollbackRecoveryApplication.ts` (nový), `.test.tsx` (nový); `A/pages/RecoveryApplicationsListPage.tsx`, `.test.tsx`. **Scope:** M, 4 súbory.
- [ ] Obaliť useRollbackAppFromOrchestrator, odoslať iba recovery_app_id query, žiadne provider defaulty/overrides, žiadny source compute ani custom HTTP.
- [ ] Raw success response aktualizuje list; cancel stale GET, invalidovať affected inventory/runs. onError refetch; bez optimistic unlock a automatic retry.
- [ ] 403/409/400/502/network/invalid report rozlíšené; detail.rollback safeParse vracia report aj pri chybe, unknown settlement zostáva konzervatívny.

### T3b — Confirm a report UX

**Súbory:** `A/components/RecoveryApplicationsTable.tsx`, `.test.tsx`; `A/hooks/useRollbackRecoveryApplication.test.tsx` (nový z T3a); `A/components/RecoveryApplicationRollbackResultModal.test.tsx`. **Scope:** M, 4 súbory; existujúci modal source predvolene bez zmeny.
- [ ] RowActionsMenu rollback slot je dostupný len pre pushed, nezávisí od onDelete. Confirm zachová konfiguráciu; Cancel bez requestu.
- [ ] Pending/double click/konkurenčný Delete blokované. ok/skipped ponechá app v zozname a odomkne až podľa BE; partial/failed report zostáva locked s potvrdeným retry.
- [ ] Existing modal zobrazí airflow/storage/compute/vcenter a errors/raw report; missing report nepredstiera úspech.

**Overovacie testy:** `npm.cmd exec -- vitest run src/features/recovery-plans/recovery-applications/hooks/useRollbackRecoveryApplication.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationsListPage.test.tsx` (T3a); `npm.cmd exec -- vitest run src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryApplicationRollbackResultModal.test.tsx src/features/recovery-plans/recovery-applications/hooks/useDeleteRecoveryApplication.test.ts` (T3b). Fixtures s dvoma Airflow providermi a odlišným source/target; overiť absence override parametrov, nie len úspešný modal.

**Závislosti:** T1, T2; T3b po T3a. **DoD:** celý mock lifecycle zachová record a BE zámok, Delete regresia green, error report dostupný.

## Checkpoint C1 — Lifecycle po T1–T3

- [ ] Focused T2/T3 testy green; changed-file ESLint a whitespace check.
- [ ] Review pushed guard, 409 race, 502 report, retained run_id a cache reconciliation.
- [ ] Žiadny BE/generated/Group diff; štítky dočasne využívajú existujúce kľúče, finálne texty v T6.

## T4 — DAG Template Version selector

**Požiadavka:** Krok 4, serverový katalóg/default a description; Save-only zachová výber; loading/error/empty/unknown/Retry bez hardcode.

### T4a — Selector a query

**Súbory:** `A/components/RecoveryAppBuilder.tsx`, `.test.tsx`; `A/components/DagTemplateVersionSelect.tsx` (nový lokálny komponent), `.test.tsx` (nový). **Scope:** M, 4 súbory.
- [ ] Platform key z VMWARE/IBM_POWER source/stored lock; query disabled bez platformy. Neskorý starý response sa neuplatní.
- [ ] Null/default možnosť z flagu default, presné explicitné hodnoty a description; uložená unknown verzia zostane viditeľná, nie nahradená.
- [ ] Selector pri Save-only aj Push, rozlíšené loading/error/empty a Retry; read-only režim čitateľný. Žiadny nový wizard step.

### T4b — Source transition a readiness

**Súbory:** `A/model/recoveryApplicationDraft.ts`, `.test.ts`; `A/model/recoveryApplicationDraftReadiness.ts`, `.test.ts`; `A/components/RecoveryAppBuilder.tsx`. **Scope:** M, 5 súborov.
- [ ] Potvrdená zmena platformy resetuje verziu na null, same-platform source zachová; Cancel nemení hodnotu.
- [ ] Query readiness blokuje Save pri unknown/unverified katalógu podľa schváleného PLAN; read-only step navigation sa neblokuje.
- [ ] Push toggle/refetch nemení explicitnú voľbu; chýbajúci/viacnásobný default je error, nie v1 fallback.

**Overovacie testy:** `npm.cmd exec -- vitest run src/features/recovery-plans/recovery-applications/components/DagTemplateVersionSelect.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx`; T4b `npm.cmd exec -- vitest run src/features/recovery-plans/recovery-applications/model/recoveryApplicationDraft.test.ts src/features/recovery-plans/recovery-applications/model/recoveryApplicationDraftReadiness.test.ts`. Testovať aj BE default v2 a iné budúce version labely.

**Závislosti:** T1, T2b, T5a; T4b po T4a. **DoD:** štyri kroky zachované, všetky stavy katalógu a source confirmation overené, bez straty Save-only voľby.

## T5 — Form mapping a GET/Edit/POST round-trip

**Požiadavka:** Oddeliť configured a deployed verziu v type/model/cache aj payload. T5a vykonať pred T4.

### T5a — Spotrebiteľské modely a mappere

**Súbory:** `A/model/recoveryApplicationTypes.ts`, `A/helpers/mapRecoveryApplications.ts`, `.test.ts`; `A/utils/recoveryApplicationFormMapper.ts`, `.test.ts`. **Scope:** M, 5 súborov.
- [ ] Použiť AppOrchestrationStateOutput, configured form/wire/list pole a samostatnú deployed verziu.
- [ ] GET→form→POST zachová explicitnú/null/absent hodnotu aj pri Save-only; rawRecord a fallback JSON zachovajú nové polia.
- [ ] Deployed nikdy neprepíše configured; legacy missing fields a provider/notificationEmail round-trip ostávajú kompatibilné.

### T5b — Submit validácia a wire

**Súbory:** `A/utils/validateRecoveryApplication.ts`, `.test.ts`; `A/hooks/recoveryApplicationsWire.test.tsx`; `A/components/RecoveryAppBuilder.tsx`. **Scope:** M, 4 súbory.
- [ ] Submit-time validácia používa tú istú template readiness ako UI; stale callback nemôže odoslať nepodporovanú voľbu.
- [ ] Generated submit dostáva application.dag_template_version pri Save-only aj Push; form run/provider locks ostávajú.
- [ ] Integration test rozlíši požadovanú a skutočne nasadenú verziu a spracuje null/absent po rollbacku.

### T5c — Save/Push settlement

**Súbory:** `A/hooks/useRecoveryApplications.ts`, `.test.tsx`; `A/pages/RecoveryApplicationSaveCompletion.integration.test.tsx`; `A/pages/RecoveryApplicationBuilderPage.tsx`, `A/pages/RecoveryApplicationEditorPage.tsx`. **Scope:** M, 5 súborov.
- [ ] Raw response → list cache, riadený refresh; 409 a 502 invalidujú aj pri error/unmount; stale GET nevráti starý lock.
- [ ] Push 502 po persistencii zachová draft/ID, bez success dialogu; fresh pushed=false dovolí opravu/retry a nevytvorí duplicate app.
- [ ] Zachovať beginSave/failSave/completeSave, pending freeze, guards, submitted provider context a once-only navigation. Refresh failure po úspešnej mutácii sa nehlási ako zlyhanie uloženia.

**Overovacie testy:** T5a `npm.cmd exec -- vitest run src/features/recovery-plans/recovery-applications/helpers/mapRecoveryApplications.test.ts src/features/recovery-plans/recovery-applications/utils/recoveryApplicationFormMapper.test.ts`; T5b `npm.cmd exec -- vitest run src/features/recovery-plans/recovery-applications/utils/validateRecoveryApplication.test.ts src/features/recovery-plans/recovery-applications/hooks/recoveryApplicationsWire.test.tsx`; T5c `npm.cmd exec -- vitest run src/features/recovery-plans/recovery-applications/hooks/useRecoveryApplications.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationSaveCompletion.integration.test.tsx src/features/recovery-plans/recovery-applications/hooks/useRecoveryApplicationSaveCompletion.test.tsx`.

**Závislosti:** T5a po T1; T5b po T4b/T5a; T5c po T2/T3/T5b. **DoD:** presný wire round-trip a cache/error regressions green; Save Completion source sa nemení bez preukázanej potreby.

## Checkpoint C2 — Verzie po T5a, T4, T5b–c

- [ ] Focused mapper/builder/wire/completion testy green; `npm.cmd run typecheck` pre cross-cutting model/props zmeny.
- [ ] Review null/default semantics, unknown/unavailable Save policy a authoritative cache settlement.
- [ ] Konfigurácia v Save-only prežije GET/Edit/POST; nasadená verzia ostáva samostatná.

## T6 — Display a EN/SK/CS

### T6a — Application Orchestration detail

**Súbory:** `A/components/RecoveryApplicationsTable.tsx`, `.orchestration.test.tsx`, `.test.tsx`. **Scope:** M, 3 súbory.
- [ ] Airflow provider, pushed badge, stored run ID a version v existujúcom DetailView layout.
- [ ] Pushed používa deployed, legacy missing „unknown“; draft configured je označené ako konfigurácia, nie deployment.
- [ ] Run ID po rollbacku historický bez aktívneho DAG odkazu; nemení sa shared Group orchestration hook.

### T6b — Lokalizácia

**Súbory:** `src/locales/en.json`, `src/locales/sk.json`, `src/locales/cs.json`, `src/locales/recoveryRollbackTranslations.test.ts`, nový `src/locales/recoveryApplicationLifecycleTranslations.test.ts`. **Scope:** M, 5 súborov.
- [ ] Rovnaké kľúče/interpolácie pre readonly, rollback confirm/loading/errors, template states/default a configured/deployed/history vo všetkých jazykoch.
- [ ] Reuse existujúce result texty, descriptions prichádzajú z BE; žiadny Notification Email/help scope.
- [ ] Žiadne prepísanie súbežných locale zmien ani plošné formátovanie JSON.

**Overovacie testy:** T6a `npm.cmd exec -- vitest run src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.orchestration.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx`; T6b `npm.cmd exec -- vitest run src/locales/recoveryRollbackTranslations.test.ts src/locales/recoveryApplicationLifecycleTranslations.test.ts`. JSON parse každého locale.

**Závislosti:** T2/T3/T4/T5. **DoD:** žiadna zámena configured/deployed, EN/SK/CS parity, layout regresia bez Group zmien.

## T7 — Vitest regresia

**Požiadavka:** Dopĺňať medzery matice PLAN §12 a spustiť affected suites; produkčné zmeny pri zlyhaní riešiť v príslušnom slice, nie rozširovať scope.

**Slices/súbory:** T7a `A/hooks/{useRecoveryApplications.test.tsx,useRollbackRecoveryApplication.test.tsx,recoveryApplicationsWire.test.tsx}`, `A/pages/RecoveryApplicationSaveCompletion.integration.test.tsx` (4); T7b `A/components/{RecoveryAppBuilder.test.tsx,RecoveryApplicationsTable.test.tsx,RecoveryApplicationsTable.orchestration.test.tsx}`, `A/pages/{RecoveryApplicationEditorPage.test.tsx,RecoveryApplicationsListPage.test.tsx}` (5). Mappere/locales/modal/Delete/completion existujúce testy sa spustia read-only podľa affected zmeny. **Scope:** M na slice.

**Akceptácia:**
- [ ] Deterministické race fixtures: stale GET, 409, push 502 lokálne uložený, rollback 502 partial/failed, refresh failure a unmount; žiadne sleeps ako náhrada synchronizácie.
- [ ] Obe platformy, VMware v1/Power v1/v2, server defaults, unknown/unavailable/Retry, Save-only, round-trip a celý lifecycle pokryté.
- [ ] Delete, provider locks, Save Completion once-only/guard/pending a result modal bez regresie; žiadne skipped/deleted testy ani oslabené assertions.

**Overenie:** Explicitné príkazy T2–T6 nad dotknutými súbormi; navyše `npm.cmd exec -- vitest run src/features/recovery-plans/recovery-applications/hooks/useDeleteRecoveryApplication.test.ts src/features/recovery-plans/recovery-applications/hooks/useRecoveryApplicationSaveCompletion.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryApplicationRollbackResultModal.test.tsx`. Spustiť `npm.cmd exec -- eslint <explicitný zoznam zmenených ts/tsx súborov>` po nahradení zoznamu skutočným diffom. Nie full npm test/build.

**Závislosti:** T6 a predchádzajúce slices. **DoD:** zaznamenať presné príkazy, počty, výsledky a nevykonané širšie kontroly.

## Checkpoint C3 — Po T6–T7

- [ ] Matica PLAN má ku každému riadku test dôkaz; focused suites/locale parse/lint green.
- [ ] Review raw vs mapped cache, BE authorization errors, report parsing a žiadne optimistic unlock.
- [ ] Browser runtime/prerekvizity potvrdené pred T8; žiadny live rollout.

## T8 — Playwright/browser integration a finálna kontrola

**Požiadavka:** Samostatný mockovaný Application browser smoke podľa existujúcich QA patterns. Oddeliť ho od skutočného BE testovania.

**Súbory:** nový `scripts/qa/verify-recovery-applications-dag-lifecycle.mjs`; prípadný nový lokálny fixture modul pre tento skript; tieto dva PLAN/TODO dokumenty pre dôkazy. **Scope:** M, do 4 súborov; `scripts/qa/verify-recovery-groups.mjs` ostáva nedotknutý.

**Akceptácia:**
- [ ] Všetky /api requesty mocked, unknown endpoint fail; Create→Save-only version→Push→locked menu/direct URL→Rollback→Edit→re-push pre VMware aj IBM Power; Confirm Cancel/pending/report/403/409/502/Retry, EN/SK/CS a console/network.
- [ ] Reálne browser reload/keyboard/focus, čitateľné kroky readonly a version description overené; report, retained ID/run ID a configured/deployed správne po refetch. Screenshot/network dôkazy bez credentials.
- [ ] Reálna BE integrácia označená zvlášť ako nevykonaná, kým nie je explicitné oprávnenie na test provisioning/rollback a určené izolované fixtures. Mock smoke nie je BE integration dôkaz.

**Overenie (až pri implementácii):** `node --check scripts/qa/verify-recovery-applications-dag-lifecycle.mjs`; overiť dostupnosť PLAYWRIGHT_MODULE/browser a lokálneho dev servera; `node scripts/qa/verify-recovery-applications-dag-lifecycle.mjs` s dokumentovaným APP_URL a runtime. Chýbajúci runtime je blocker browser výsledku, nie úspešný test. `git diff --check`; skontrolovať tracked diff aj untracked nové zdroje/dokumenty. Full build iba pri zdôvodnenej potrebe/schválení.

**Závislosti:** C3, browser runtime. **DoD:** mock browser dôkazy a finálny scope review uložené, otvorené otázky a limity uvedené; žiadna živá deštruktívna akcia, commit ani push podľa tohto zadania.

## Checkpoint C4 — Odovzdanie implementácie (budúca práca)

- [ ] T1–T8 acceptance a DoD splnené; human review.
- [ ] Celá matica pokrytá alebo explicitne blokované reálne integrácie; žiadne tvrdenie o neuskutočnenom teste/build.
- [ ] Diff obsahuje iba schválený Application scope a locales; backend/generated/Group/rozpracované cudzie zmeny zachované.

## Verifikácia aktuálneho plánovacieho výstupu

Toto je checklist implementácie, preto T1–T8 zostávajú unchecked. Aktuálna práca vytvorila iba PLAN/TODO. PowerShell content assertions overili vzájomné odkazy, T1–T8 a povinné polia; whitespace/encoding/fence kontroly prešli. `git diff --check -- <oba dokumenty>` a `git diff --no-index --check -- /dev/null <dokument>` pre každý nový untracked dokument prešli. FE status/diff a BE status boli skontrolované, BE je čistý. Implementačné/browser/live testy, full suite a build neboli spustené. Žiadny commit/push. Implementácia čaká na samostatné schválenie.
