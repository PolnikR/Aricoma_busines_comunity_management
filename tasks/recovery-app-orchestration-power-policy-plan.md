# Plán: Recovery App orchestration state + IBM Power polia v Recovery App Policy

Úlohy: `tasks/recovery-app-orchestration-power-policy-todo.md`. Vetva `spike/ant-design-shell`. Zdroj pravdy: BE `abco-be/main` → `openapi/abco-api.json` → Orval/Zod v `src/generated/**` (ručne sa needituje).

## Prehľad

BE zmenil dve veci, ktoré ručne písaná FE vrstva ešte nereflektuje:

1. **Recovery App record**: tri root polia `airflow_run_id`, `push_to_orchestrator`, `orchestration_provider_id` nahradil objekt `orchestration?: { run_id?, pushed?, provider_id? } | null` (generovaný `OrchestrationState` / `OrchestrationStateOutput`, rovnaký ako pri Recovery Group).
2. **RecoveryAppPolicy** má nové IBM Power polia s BE defaultmi: `target_lpar_prefix = "dr_"` (regex `^[A-Za-z0-9._-]{0,12}$`), `manual_zoning = false`, `source_shutdown_timeout_seconds = 300` (int > 0), `zoning_wait_minutes = 240` (int > 0). VMware template ich ignoruje.

## Audit — aktuálny stav (2026-10-07)

### `npm run typecheck` (`tsc -b`) — 9 chýb, všetky z regenerácie
| Súbor | Chyba |
|---|---|
| `recovery-applications/helpers/mapRecoveryApplications.ts:38-43` | číta `record.airflow_run_id`, `push_to_orchestrator`, `orchestration_provider_id` (6×) |
| `recovery-applications/helpers/mapRecoveryApplications.test.ts:25` | fixture `orchestration_provider_id` |
| `application-recovery/components/RecoveryAppPoliciesTable.test.tsx:15` | fixture `RecoveryAppPolicyRecordOutput` bez 4 nových polí |
| `application-recovery/components/RecoveryAppPolicyModal.test.tsx:13` | to isté |

### Skryté (typecheck ich nezachytí)
- **Strata dát pri Edit policy.** `toRecoveryAppPolicySubmitPayload` vracia `RecoveryAppPolicy` (= `zod.input`), kde polia s `.default()` sú voliteľné. Kompiluje sa aj bez nich → dnes FE 4 Power polia neposiela a BE pri uložení existujúcej policy dosadí defaulty. Ochranou musia byť testy na request body, nie typy.
- `toRecoveryApplicationJson` (fallback JSON bez `rawRecord`) skladá staré root polia — typ je `RecoveryAppRecordOutput | object`, takže TS chybu nehlási.
- `recoveryApplicationTypes.ts`: `RecoveryApplicationApiRecord` (r. 86–93) má tri staré polia; `RecoveryApplicationListItem.data.application` (r. 107–108) má `airflow_run_id` / `push_to_orchestrator`, ktoré `application` schéma nikdy neobsahovala a nikto ich nečíta.
- Zavádzajúce komentáre: `recovery-runs/hooks/useOrchestratedApps.ts:13-21`, `recovery-runs/model/orchestratorRunsQuery.ts:7`; názov testu v `useOrchestratedApps.test.tsx:68`.
- Fixture `RecoveryApplicationsTable.test.tsx:195-207` posiela `rawRecord` so starými poliami a assertuje ich v JSON vieweri.

### Generated vrstva
- Diff `src/generated/**` zodpovedá diffu `openapi/abco-api.json` (orchestration objekt, 4 policy polia, popisy delete parametrov, `GroupOrchestrationState` → `OrchestrationState`).
- **`src/generated/query/zod/groupOrchestrationState.gen.ts` zostal na disku** (tracked), hoci `index.ts` ho už neexportuje a nič ho neimportuje. Orval bez `clean` staré súbory nemaže; `scripts/orval/check-generated.mjs` (regeneruje do temp a porovnáva adresáre) ho nahlási ako navyše. Odstránenie = výstup generátora, nie ručná úprava obsahu.

### Mimo rozsahu (platné, nemeniť)
- `push_to_orchestrator` ako query parameter: `useRecoveryApplications.ts:28-29`, `useRecoveryGroups.ts:89` a ich testy.
- Interné FE názvy `airflowRunId` / `pushToOrchestrator` / `orchestrationProviderId` vo formulári, builderi, tabuľke, delete hooku, Recovery Runs.
- Recovery Group (`orchestration` už mapuje správne).

## Architektonické rozhodnutia

1. **Interné FE názvy zostávajú.** Mení sa iba hranica wire → FE v `mapRecoveryApplications.ts`. Sémantika sa zachová 1:1:
   - `orchestration?.run_id !== undefined` → `airflowRunId` (null sa prenáša),
   - `orchestration?.pushed != null` → `pushToOrchestrator`,
   - `orchestration?.provider_id !== undefined` → `orchestrationProviderId`.
   `orchestration` null/chýbajúce → žiadne z troch polí.
2. **Fallback JSON** (`toRecoveryApplicationJson` bez `rawRecord`) emituje `orchestration: { run_id?, pushed?, provider_id? }` iba ak je aspoň jedno interné pole definované a obsahuje iba definované kľúče (rovnaký štýl podmienených spreadov ako dnes). Typ objektu = `OrchestrationStateOutput`.
3. **Ručné wire typy:** v `RecoveryApplicationApiRecord` nahradiť tri polia za `orchestration?: OrchestrationStateOutput | null | undefined`; z `ListItem.data.application` odstrániť `airflow_run_id` / `push_to_orchestrator`. Žiadny nový manuálny duplikát kontraktu.
4. **Power defaulty a regex z generated konštánt** (`submitRecoveryAppPolicyBody*Default`, `submitRecoveryAppPolicyBodyTargetLparPrefixRegExp`) namiesto ručných literálov — jeden zdroj pravdy, ak BE default zmení.
5. **Submit payload vždy posiela všetky 4 Power polia** (v `common`, nezávisle od snapshot módu). Edit ich načíta z `RecoveryAppPolicyRecordOutput` (validatingMutator dopĺňa defaulty, takže sú vždy definované; `selectRecoveryAppPolicies` už castuje na Output).
6. **Form data** v existujúcom štýle: čísla ako `string` (`'300'`, `'240'`), prefix `string`, `manual_zoning` `boolean`. Validácia v `RecoveryAppPolicyModal.validate()` rovnakým vzorom ako `frequency_value` (`Number.isInteger && >= 1`, kľúč `recoveryAppPolicies.validation.positiveInteger`); prefix cez generated regex + nový kľúč `recoveryAppPolicies.validation.lparPrefix`. Prázdny prefix je podľa BE platný.
7. **UI formulára:** nová sekcia v rovnakom boxe ako „Snapshot selection“ (`rounded-lg border border-border-subtle bg-surface-subtle p-4` + `h3`), pod ňou helper `<p className="text-xs text-text-muted">`. Polia: `Input` prefix, `Input type=number` timeout, `Input type=number` zoning wait, `CheckboxField variant="bordered"` manual zoning. Jednotky v labeloch („Source shutdown timeout (seconds)“, „Zoning wait (minutes)“). Žiadny nový vizuálny pattern, žiadny platform selector.
8. **Detail drawer:** štruktúra drawera sa nemení — zostáva jediná sekcia `Overview`. 4 Power polia sa pridajú ako `DetailField` na **koniec existujúceho `DetailOverview`** (za `Status`), sú to properties tej istej policy, nie samostatný view. Poradie: Policy ID, Description, Level, Frequency, Retention, Snapshot selection, Boot verification, Status, Target LPAR prefix, Manual zoning, Source shutdown timeout, Zoning wait. Prázdny prefix → `-`; manual zoning → existujúce `recoveryAppPolicies.yes/no`; timeout a zoning wait cez existujúci `formatInterval(value, unit, t)` → „300 seconds“, „240 minutes“ (jediný nový unit kľúč `recoveryAppPolicies.unit.seconds`, nepridáva sa do `RECOVERY_APP_POLICY_TIME_UNITS`). Tabuľka bez nových stĺpcov, JSON viewer bez zmeny (zobrazí `responseData`).
9. **Commity (2):**
   1. `fix: adapt recovery apps to orchestration state` — `openapi/abco-api.json` + všetky `src/generated/**` zmeny (vrátane odstránenia `groupOrchestrationState.gen.ts`) + orchestration úpravy + **iba** doplnenie 4 polí do dvoch policy test fixtures, aby commit prešiel typecheckom. **Podmienka (rozhodnuté):** contract súbory sa commitnú iba ak `node scripts/orval/check-generated.mjs` potvrdí, že generated súbory presne zodpovedajú `openapi/abco-api.json`; inak stop a report. Generated súbory sa ručne neupravujú.
   2. `feat: support IBM Power recovery policy settings` — model, formulár, validácia, drawer, preklady, testy.

## Úlohy

### Fáza 1 — Orchestration state (commit 1)
- [x] T1: Overiť generated vrstvu voči OpenAPI a vyriešiť stale `groupOrchestrationState.gen.ts`
- [x] T2: Mapper + ručné typy čítajú/píšu `orchestration`
- [x] T3: Fixtures, komentáre a Recovery Runs testy na nový kontrakt; typecheck zelený

### Checkpoint 1
- [x] `npm run typecheck` bez chýb, focused testy zelené, `check-generated` bez rozdielov, commit 1

### Fáza 2 — IBM Power policy (commit 2)
- [x] T4: Model: form data, `EMPTY_FORM`, `toFormData`, submit payload
- [x] T5: Formulár: sekcia IBM Power recovery, validácia, preklady
- [x] T6: Detail drawer: IBM Power polia na konci Overview, preklady

### Checkpoint 2
- [x] typecheck, focused testy, focused lint, review diffu, commit 2, záverečný report

## Riziká

| Riziko | Dopad | Mitigácia |
|---|---|---|
| Edit policy potichu resetne Power hodnoty (typ to nezachytí) | High | Test na request body pri Edit s ne-defaultnými hodnotami; zmena len description |
| Paralelné sessions v rovnakom worktree (`src/locales/*.json`, staging) | Med | Stage iba explicitný zoznam ciest; `git diff --cached` prázdne pred `git add`; `git diff -U0 src/locales` obsahuje iba moje kľúče |
| `openapi/abco-api.json` + generated zmeny nie sú moje (pripravené pred session) | Med | Commitnúť ich až po `check-generated` = žiadny rozdiel; v reporte uviesť, že pochádzajú z regenerácie |
| `CRLF` warning pri `openapi/abco-api.json` | Low | Bez normalizácie; `git diff --check` pred commitom |

## Rozhodnutia používateľa (2026-10-07)
- Contract súbory (`openapi/abco-api.json`, `src/generated/**`, odstránenie `groupOrchestrationState.gen.ts`) idú do commitu 1 za podmienky čistého `check-generated`.
- IBM Power polia v draweri na konci existujúceho Overview, bez novej sekcie/navigácie. Formulár má samostatný IBM Power box.

## Otvorené otázky
Žiadne.
