# Úlohy: Recovery App orchestration state + IBM Power polia v Recovery App Policy

Plán: `tasks/recovery-app-orchestration-power-policy-plan.md`. Cesty nižšie sú relatívne k `src/features/recovery-plans/` (ak nie je uvedené inak).

---

## Fáza 1 — Orchestration state (commit 1: `fix: adapt recovery apps to orchestration state`)

### Task 1: Overiť generated vrstvu voči OpenAPI

**Popis:** Pred akoukoľvek úpravou potvrdiť, že `src/generated/**` je presne výstup `npm run api:generate` z aktuálneho `openapi/abco-api.json`, a vyriešiť osirelý `groupOrchestrationState.gen.ts` (generátor ho už nevytvára). Ručne sa needituje obsah žiadneho generated súboru.

**Akceptačné kritériá:**
- [x] `node scripts/orval/check-generated.mjs` hlási jediný rozdiel, `groupOrchestrationState.gen.ts` navyše (alebo žiadny). Ak hlási čokoľvek iné, zastaviť a reportovať.
  - Výsledok: exit 0. Skript regeneruje na mieste a Orval staré súbory nemaže, takže stale súbor nezachytí; osirelosť overená samostatne (spec nemá `GroupOrchestrationState`, `index.ts` ho neexportuje, nič ho neimportuje, po regenerácii sa znovu nevytvorí).
- [x] `groupOrchestrationState.gen.ts` odstránený (`git rm`), nič ho neimportuje (`grep` v `src`).
- [x] Baseline `npm run typecheck` = práve 9 známych chýb (plán, audit).

**Overenie:**
- [x] `node scripts/orval/check-generated.mjs` → bez rozdielov po odstránení
- [x] `git diff --stat -- src/generated` obsahuje iba súbory z auditu

**Závislosti:** žiadne
**Súbory:** `src/generated/query/zod/groupOrchestrationState.gen.ts` (delete)
**Rozsah:** XS

### Task 2: Mapper a ručné typy na `orchestration`

**Popis:** `mapRecoveryApplications` číta `record.orchestration?.run_id|pushed|provider_id` do interných `airflowRunId|pushToOrchestrator|orchestrationProviderId` so zachovanou null/undefined sémantikou. `toRecoveryApplicationJson` (fallback bez `rawRecord`) skladá `orchestration: {...}` namiesto troch root polí. V `recoveryApplicationTypes.ts` nahradiť staré wire polia generovaným `OrchestrationStateOutput`.

**Akceptačné kritériá:**
- [x] Mapper: `run_id` → `airflowRunId` (vrátane `null`), `pushed` → `pushToOrchestrator` (null vynechá), `provider_id` → `orchestrationProviderId`; `orchestration: null` aj chýbajúce → žiadne z troch polí.
- [x] Fallback JSON obsahuje `orchestration` s definovanými kľúčmi, nikdy `airflow_run_id` / `push_to_orchestrator` / `orchestration_provider_id`; bez orchestration údajov kľúč `orchestration` chýba.
- [x] `RecoveryApplicationApiRecord` má `orchestration?: OrchestrationStateOutput | null | undefined`; `ListItem.data.application` bez `airflow_run_id` / `push_to_orchestrator`. `grep -rn "airflow_run_id\|orchestration_provider_id" src --exclude-dir=generated` vráti iba komentáre/testy, ktoré rieši Task 3.

**Testy (`mapRecoveryApplications.test.ts`):** mapovanie každého z 3 polí; `orchestration: null`; chýbajúce `orchestration`; `run_id: null` → `airflowRunId: null`; fallback JSON tvar + absencia starých kľúčov.

**Overenie:**
- [x] `npm exec vitest run src/features/recovery-plans/recovery-applications/helpers/mapRecoveryApplications.test.ts`

**Závislosti:** Task 1
**Súbory:** `recovery-applications/helpers/mapRecoveryApplications.ts`, `…/mapRecoveryApplications.test.ts`, `recovery-applications/model/recoveryApplicationTypes.ts`
**Rozsah:** S

### Task 3: Fixtures, komentáre a Recovery Runs na nový kontrakt

**Popis:** Aktualizovať test fixtures a komentáre, ktoré opisujú starý BE response. Doplniť test, že Recovery Runs odvodia `dag_<run_id>` z recordu s `orchestration` (cez reálny mapper, nie len cez interné polia). Policy test fixtures dostanú 4 nové polia iba kvôli typecheku (funkcionalita až vo Fáze 2).

**Akceptačné kritériá:**
- [x] `RecoveryApplicationsTable.test.tsx`: `rawRecord.orchestration = { run_id, pushed: true, provider_id }`; JSON viewer assert `"run_id": "260811133132_fbffbefb"`, `"pushed": true`, a `"airflow_run_id"` sa nezobrazí.
- [x] `useOrchestratedApps`: komentár hovorí o `orchestration.run_id` / `orchestration.pushed`; názov testu na r. 68 bez starých wire polí; nový test: wire record `{ orchestration: { run_id: 'X', provider_id: 'airflow-01', pushed: true } }` → `mapRecoveryApplications` → entita s `dagId: 'dag_X'`; record bez `orchestration` → žiadna entita.
- [x] `orchestratorRunsQuery.ts:7` komentár odkazuje na `orchestration.run_id`.
- [x] Fixtures v `RecoveryAppPoliciesTable.test.tsx` a `RecoveryAppPolicyModal.test.tsx` majú 4 Power polia s BE defaultmi; existujúce asserty bez zmeny.
- [x] `npm run typecheck` bez chýb.

**Overenie:**
- [x] `npm exec vitest run src/features/recovery-plans/recovery-applications src/features/recovery-plans/recovery-runs src/features/recovery-plans/recovery-policies/application-recovery src/locales/recoveryModalTranslations.test.ts`
- [x] `npm run typecheck`

**Závislosti:** Task 2
**Súbory:** `recovery-applications/components/RecoveryApplicationsTable.test.tsx`, `recovery-runs/hooks/useOrchestratedApps.ts`, `…/useOrchestratedApps.test.tsx`, `recovery-runs/model/orchestratorRunsQuery.ts`, `recovery-policies/application-recovery/components/RecoveryAppPoliciesTable.test.tsx`, `…/RecoveryAppPolicyModal.test.tsx`
**Rozsah:** M

## Checkpoint 1
- [x] `npm run typecheck` zelený
- [x] Focused testy z Task 2–3 zelené
- [x] `npx eslint --max-warnings 0 <zmenené súbory>` zelený
- [x] `node scripts/orval/check-generated.mjs` bez rozdielov — **podmienka** pre zahrnutie `openapi/abco-api.json` a `src/generated/**` do commitu; inak stop a report (generated sa ručne neupravuje)
- [x] `git diff --check` + review diffu; `git diff --cached` prázdne pred `git add`
- [x] Commit 1 s explicitným zoznamom ciest: `openapi/abco-api.json`, zmenené + nové + zmazané `src/generated/query/zod/*`, súbory z Task 2–3

---

## Fáza 2 — IBM Power policy (commit 2: `feat: support IBM Power recovery policy settings`)

### Task 4: Model — form data, defaulty, edit a submit payload

**Popis:** Rozšíriť `RecoveryAppPolicyFormData` o `target_lpar_prefix: string`, `manual_zoning: boolean`, `source_shutdown_timeout_seconds: string`, `zoning_wait_minutes: string`. `EMPTY_FORM` z generated default konštánt, `toFormData` z recordu, `toRecoveryAppPolicySubmitPayload` posiela všetky 4 vždy (`Number(...)` pre čísla, `trim()` pre prefix).

**Akceptačné kritériá:**
- [x] Create bez dotyku Power polí pošle `target_lpar_prefix: 'dr_'`, `manual_zoning: false`, `source_shutdown_timeout_seconds: 300`, `zoning_wait_minutes: 240`.
- [x] Edit policy s `{ 'p8_', true, 600, 30 }`, zmena iba description → request body obsahuje presne tieto 4 hodnoty.
- [x] Všetky tri existujúce submit testy (time_range, latest, exact_time) majú v `toEqual` body 4 Power polia.

**Overenie:**
- [x] `npm exec vitest run src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPolicyModal.test.tsx`

**Závislosti:** Checkpoint 1
**Súbory:** `…/components/RecoveryAppPolicyForm.tsx` (iba interface), `…/components/RecoveryAppPolicyModal.tsx`, `…/model/recoveryAppPolicySubmit.ts`, `…/components/RecoveryAppPolicyModal.test.tsx`
**Rozsah:** S

### Task 5: Formulár — sekcia IBM Power recovery a validácia

**Popis:** V `RecoveryAppPolicyForm` pridať sekciu „IBM Power recovery“ v rovnakom boxe ako snapshot sekcia, s helper textom „These settings are used only for IBM Power recovery. VMware recovery ignores them.“ a poliami Target LPAR prefix, Manual zoning (checkbox), Source shutdown timeout (seconds), Zoning wait (minutes). Validácia v `RecoveryAppPolicyModal.validate()`. Preklady en/cs/sk.

**Akceptačné kritériá:**
- [x] Sekcia je viditeľná v Create aj Edit, vždy (bez platform podmienky), polia majú labely a sú `disabled` počas submitu.
- [x] Prefix mimo `^[A-Za-z0-9._-]{0,12}$` (napr. `'dr prod'`, 13 znakov) → chyba pod poľom, žiadny request; prázdny prefix je platný.
- [x] Timeout aj zoning wait: `'0'`, `'-1'`, `'1.5'`, `''` → `positiveInteger` chyba, žiadny request.
- [x] Zaškrtnutie Manual zoning → body `manual_zoning: true`.
- [x] Nové kľúče existujú v `en.json`, `cs.json`, `sk.json` (`recoveryAppPolicies.form.ibmPowerSection`, `.ibmPowerHint`, `.targetLparPrefix`, `.manualZoning`, `.sourceShutdownTimeout`, `.zoningWait`, `recoveryAppPolicies.validation.lparPrefix`).

**Overenie:**
- [x] `npm exec vitest run src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPolicyModal.test.tsx`
- [x] Manuálne (voliteľne, CDP :9333): modal Create/Edit, sekcia vizuálne zodpovedá snapshot sekcii

**Závislosti:** Task 4
**Súbory:** `…/components/RecoveryAppPolicyForm.tsx`, `…/components/RecoveryAppPolicyModal.tsx`, `…/components/RecoveryAppPolicyModal.test.tsx`, `src/locales/{en,cs,sk}.json`
**Rozsah:** M

### Task 6: Detail drawer — IBM Power fields v Overview

**Popis:** V `RecoveryAppPoliciesTable` drawer pridať 4 `DetailField` na koniec existujúceho `DetailOverview` (za `Status`). Žiadna nová sekcia ani navigácia. Timeout a zoning wait cez existujúci `formatInterval`. Tabuľka a JSON viewer bez zmeny.

**Akceptačné kritériá:**
- [x] Navigácia drawera zostáva iba `['Overview']`.
- [x] Existujúce Overview polia a ich poradie nezmenené; `detailSectionsLabels` = `['Policy ID', 'Description', 'Level', 'Frequency', 'Retention', 'Snapshot selection', 'Boot verification', 'Status', 'Target LPAR prefix', 'Manual zoning', 'Source shutdown timeout', 'Zoning wait']`.
- [x] Prázdny `target_lpar_prefix` → `-`.
- [x] `manual_zoning` → `Yes` / `No` (existujúce `recoveryAppPolicies.yes/no`).
- [x] Timeout a zoning wait s jednotkou: `300 seconds`, `240 minutes`.
- [x] Žiadny nový stĺpec v tabuľke.
- [x] JSON viewer bez architektonickej zmeny; test overí, že payload obsahuje `"target_lpar_prefix"` a `"zoning_wait_minutes"`.
- [x] Preklady `details.targetLparPrefix`, `details.manualZoning`, `details.sourceShutdownTimeout`, `details.zoningWait`, `recoveryAppPolicies.unit.seconds` v en/cs/sk.

**Overenie:**
- [x] `npm exec vitest run src/features/recovery-plans/recovery-policies/application-recovery src/locales`

**Závislosti:** Task 4
**Súbory:** `…/components/RecoveryAppPoliciesTable.tsx`, `…/components/RecoveryAppPoliciesTable.test.tsx`, `src/locales/{en,cs,sk}.json`
**Rozsah:** S

## Checkpoint 2
- [x] `npm run typecheck` zelený
- [x] `npm exec vitest run src/features/recovery-plans/recovery-policies/application-recovery src/features/recovery-plans/recovery-applications src/features/recovery-plans/recovery-runs src/locales`
- [x] `npx eslint --max-warnings 0 <zmenené súbory>` + `node scripts/orval/check-feature-layout.mjs`
- [x] `git diff -U0 src/locales` obsahuje iba moje kľúče; `git diff --check`
- [x] Commit 2 s explicitným zoznamom ciest
- [x] Report: zmenené súbory, zmeny, príkazy overenia (full suite/build nespustené), commity, zostávajúce BE → FE rozdiely
