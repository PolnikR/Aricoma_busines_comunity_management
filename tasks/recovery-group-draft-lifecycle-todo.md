# Recovery Group Draft Lifecycle — TODO

Stav: F1–F4 implementované inline podľa schválenia používateľa 2026-10-22. Automatická validácia prešla; ručný browser smoke ostáva neoverený. Bez commitu/pushu.
Referenčný návrh: [PLAN](recovery-group-draft-lifecycle-plan.md).
Rozsah: iba kandidát 3; žiadny Provider Catalog, Editor Session, BE/generated alebo Snapshot Policy refaktor.

## Vykonávacie pravidlá

- [x] Pred implementáciou vykonať code review PLAN/TODO a zaznamenať, či Q1/Q2/Q4/Q6 zostávajú behavior-preserving (bez zmeny produktu).
- [x] Pred každým taskom skontrolovať aktuálny `git status --short`; zachovať cudzie zmeny a aktuálnu vetvu. Nevykonávať stash/reset ani nový worktree.
- [x] Všetky pôvodné assertions zachovať; žiadne skip, mazanie, zníženie prísnosti alebo nahradenie kontrol payloadu slabším snapshotom.
- [x] Každý task overiť samostatne; pred prechodom fázy prejsť príslušný checkpoint. Používateľ následne schválil inline implementáciu; zákaz commitu a pushu zostáva zachovaný.

Všetky relatívne cesty nižšie používajú koreň `$rgRoot = 'src/features/recovery-plans/recovery-groups'`. Prefixy v zoznamoch sú presné repo-relatívne suffixy pod týmto koreňom. Nové súbory sú označené „nový“.

Spoločná focused kontrola každého tasku po jeho testoch:

```powershell
# $changedTs = presné súbory uvedené v konkrétnom tasku, prefixed cez $rgRoot.
npm.cmd exec -- eslint @changedTs --max-warnings 0
git diff --check
```

`$changedTs` sa nastaví len na skutočne zmenené súbory tasku, nie na celý worktree. Na checkpointoch sa spúšťajú explicitné testové skupiny z PLAN §8. Nepoužiť `npm test` ani full build ako skratku.

## F1 — aktuálne pravidlá a charakterizácia

### T1 — Uložený výber a metadata

- [x] Implementovať T1.

**Popis:** Zachytiť rozdiel uloženého disku a čisto odvodeného disku pri odstránení VM; zaznamenať CG a metadata precedence bez zmeny production pravidiel.

**Súbory (2, S):**

- `components/RecoveryGroupBuilder.test.tsx`
- `helpers/mapRecoveryGroups.test.ts`

**Akceptácia:**

- [x] C1 porovná saved DISK-A vs Discovery-only DISK-A po remove VM-A, refetch a submit; explicitný MANUAL sa zachová.
- [x] C4 overí manual CG a jeho flag po category/workload/provider zmene vrátane roundtripu; C6 remove/readd preverí retained metadata.
- [x] **CG1–CG3:** Existing Metro s persistovaným CG `''` (H=false) umožní AUTO-CG; ručne vymazaný CG `''` (H=true) prežije refetch a blokuje úplnosť; persistovaný prázdny auxiliary kľúč `{ 'VOL-01': '' }` neprepíše AUTO-AUX. Overiť aj readiness a rozdiel medzi empty a absent key.
- [x] **L1 baseline:** v existujúcom `RecoveryGroupBuilder.test.tsx` bez remountu cez rerender rovnakej ID overiť oba smery `unpushed↔pushed` a `clean Managed↔provisioned`, aktuálne disabled controls/Save/admission a zachovanie lokálneho draftu, kroku a dirty.
- [x] Mapper testy explicitne zaznamenajú neodoslanie metadata nevybranej VM a precedence uloženého `metadata.order` pri poradí resources B,A; dnešný výsledok sa nemení.

**Overenie:**

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx src/features/recovery-plans/recovery-groups/helpers/mapRecoveryGroups.test.ts
```

- [x] Focused testy, ESLint oboch súborov a diff check prešli.

**Závislosti:** review vstupnej brány. **Riziko:** stredné. Nespraviť z C1 test na nové automatické mazanie uložených diskov.

### T2 — Riadené Discovery poradie

- [x] Implementovať T2.

**Popis:** Pridať integráciu so skutočným QueryClient a deferred fetch, ktorá odlíši wizard identity od HTTP identity a preverí pruning timing.

**Súbory (2, S):**

- `components/RecoveryGroupBuilder.discovery-lifecycle.test.tsx` — nový
- `hooks/useRecoveryGroupRelatedVolumes.test.tsx`

**Akceptácia:**

- [x] C3 pokryje pending → user edit → resolved → refetch → user edit → submit v StrictMode; saved overrides prežijú loading/error a nové manual hodnoty vyhrajú.
- [x] C7 overí Source-only change, compute change, VM add/remove/reorder a neskorú starú odpoveď; disk request stále obsahuje iba vm_name/compute provider_id, Power používa ten istý kontrakt.
- [x] Exclusions a clear all prežijú refetch rovnakej identity; zmena identity má dnešnú semantiku, explicitné readd je možné; cleanup overí aktuálny selected set až po úspešnom settled stave.

**Overenie:**

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.discovery-lifecycle.test.tsx src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupRelatedVolumes.test.tsx src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupMetroMirrorRelationships.test.tsx
```

- [x] Focused testy a ESLint oboch zmenených súborov prešli; žiadne arbitrary sleeps; diff check čistý.

**Závislosti:** T1 (zdieľaný slovník saved/explicit/automatic). **Riziko:** vysoké v test harness, bez zásahov do production. Ak test odhalí skutočný bug, zdokumentovať reprodukciu a oddeliť jeho opravu od extrakcie.

### T3 — Readiness a Legacy Local kontrakt

- [x] Implementovať T3.

**Popis:** Doplniť maticu direct-step readiness a submit legacy výnimky; nezlučovať ich algoritmy.

**Súbory (2, S):**

- `components/RecoveryGroupBuilder.discovery-lifecycle.test.tsx`
- `hooks/useRecoveryGroups.test.tsx`

**Akceptácia:**

- [x] C2 zaznamená !resolved/!loading/!error stav pri preskočení related-storage kroku v Local, Existing s úplnými saved overrides a Managed; preverí priamy Orchestration aj Save.
- [x] C5 overí legitimate legacy edit, nový create bez Source, explicitný null vs omitted topology, Source add/remove a zmenu existujúceho server recordu; assertions rozlišujú wizard a mutation validation.
- [x] Charakterizácie reprodukujú dnešné správanie; Q1–Q7 majú prepojenie na konkrétne testy alebo explicitný neoverený runtime limit. Bez tichej zmeny produktových pravidiel.

**Overenie:**

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.discovery-lifecycle.test.tsx src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroups.test.tsx src/features/recovery-plans/recovery-groups/api/recoveryGroupsValidation.test.ts src/features/recovery-plans/recovery-groups/utils/recoveryGroupTopology.test.ts
```

- [x] Focused testy, lint zmenených dvoch súborov a diff check prešli.

**Závislosti:** T2. **Riziko:** stredné; biznis rozhodnutie o povinnom Discovery nie je súčasť T3.

### Checkpoint F1 — pred prvým presunom pravidiel

- [x] T1–T3 sú overené; production diff je nulový.
- [x] **L1 charakterizácia v existujúcom Builder teste:** mounted edit s rovnakým `initialData.id`, rerender `unpushed→pushed→unpushed` aj `clean Managed→provisioned→clean`. UI disabled/Save a event admission okamžite sledujú live props; bez remountu a bez resetu raw draftu/step/dirty.
- [x] Vykonať 11 baseline súborov z PLAN §8 + nový discovery integration test; zaznamenať počty a výsledok.
- [x] Reviewer rozumie odlišným legacy kontextom a current defaultom Q1/Q2/Q4/Q6; schválil zachovanie správania alebo oddelil požadované behavior changes.
- [x] Testovací plán F1 má pre každú Q1–Q7 súčasný invariant, existujúce pokrytie a nový test; až potom pokračovať F2.

## F2 — čisté draft transitions

### T4 — Initialize a typované udalosti

- [x] Implementovať T4.

**Popis:** Pridať čisté initialize/transition operácie so všetkými resetovými pravidlami a lokálnym bookkeeping; zatiaľ bez migrácie celého Buildera.

**Súbory (2, S):**

- `model/recoveryGroupDraftLifecycle.ts` — nový
- `model/recoveryGroupDraftLifecycle.test.ts` — nový

**Akceptácia:**

- [x] Každý riadok transition tabuľky PLAN §6 má unit test vrátane create/edit defaults, CG1 seed H=false pri persistovanom prázdnom CG, same/different voľby a read-only admission. `selectionObserved` zostáva plánovaný F3 prípad; neexportovať nefunkčný stub.
- [x] **L1 unit:** transitions prijímajú live authoritative lock context nezávisle od stabilného initialize seedu. Oba smery pushed/provisioned lock zmeny tej istej ID nepovoľujú nepovolený edit a neresetujú draft ani dirty.
- [x] User eventy nemajú generic Partial patch; manuálne vymazané CG (`H=true`) a persistovaný auxiliary kľúč s `''` sú overrides, ale persistované prázdne CG pri seede (`H=false`) nie je override. Resety zachovajú dnešné C/H/X a effective-to-raw výnimky pri same-workload/provider.
- [x] Inputs ani initialData sa nemutujú, dve inicializácie nezdieľajú mutable collections; dirty informácia rozlišuje user a metadata/system udalosti.

**Overenie:**

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-groups/model/recoveryGroupDraftLifecycle.test.ts
```

- [x] Focused testy, ESLint nových dvoch súborov a diff check prešli.

**Závislosti:** checkpoint F1. **Riziko:** stredné. Žiadny reducer/event framework, bez production napojenia v T4.

### T5 — Wizard používa doménové udalosti

- [x] Implementovať T5.

**Popis:** Nahradiť inicializáciu a používateľské reset patche v Builderi; topology dieťa vysiela zámer a nevlastní reset policy. Dočasne ponechať dnešnú effective resolution a readiness až do ďalších fáz.

**Súbory (3, M):**

- `components/RecoveryGroupBuilder.tsx`
- `components/RecoveryGroupTopologyStep.tsx`
- `components/RecoveryGroupTopologyStep.test.tsx`

**Akceptácia:**

- [x] **L1 integrácia:** Builder na tom istom mounte reaguje na nové `initialData` read-only facts bez reinitialize. Overiť lock/unlock, Save a disabled inputs aj user event admission, zachovať raw draft/step/dirty.
- [x] Všetky user transitions idú cez lifecycle; TopologyStep nevytvára vlastné C/A reset patche. Jeho test assertions sa zmenia len pre nový event interface, behavior assertions sa zachovajú.
- [x] Dirty callback sa nevolá v React updateri; metadata nemenia dirty; read-only a edit-mode obmedzenia a rovnaký provider/workload zostanú zhodné.
- [x] Všetky F1 aj pôvodné Builder scenáre prejdú bez oslabenia assertions; UI texty/layout/prefetch a page props sú nezmenené.

**Overenie:**

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-groups/model/recoveryGroupDraftLifecycle.test.ts src/features/recovery-plans/recovery-groups/components/RecoveryGroupTopologyStep.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.discovery-lifecycle.test.tsx
```

- [x] Focused testy, ESLint troch zmenených súborov a diff check prešli.

**Závislosti:** T4. **Riziko:** vysoké na shared Builder; serializovať s prípadným Provider Catalog taskom.

### Checkpoint F2

- [x] T4–T5 sú overené; 11 baseline + F1 integration + F2 unit/TopologyStep skupina prešli.
- [x] Resetové pravidlá majú jediného vlastníka; scope neobsahuje catalog/session extrakciu.
- [x] Reviewer porovnal current transition tabuľku s unit a UI pokrytím; pred F3 nie sú nevysvetlené behavioral rozdiely.

## F3 — efektívny draft a Discovery reconciliation

### T6 — Čisté projekcie

- [x] Implementovať T6.

**Popis:** Centralizovať tri reprezentácie a lookup plán; zavolať existujúci reconcileMetroMirrorPrefill bez prepisovania algoritmu.

**Súbory (3, M):**

- `model/resolveRecoveryGroupDraft.ts` — nový
- `model/resolveRecoveryGroupDraft.test.ts` — nový
- `model/recoveryGroupDraftLifecycle.ts` — lokálny export/interface

**Akceptácia:**

- [x] Union zachová poradie raw V a pridá unique Discovery names; X key, removed/all, source/provider/VM identity a same-source refetch majú F1 semantiku. R sa nesortuje.
- [x] Local, Existing a Managed majú doterajšie effective C/A: **CG1** persisted `''` má H=false a môže prijať automatic CG; **CG2** manuálne vymazané `''` má H=true a prefill ho neprepíše; **CG3** persisted auxiliary key s `''` zostane override. Automatic hodnoty sa neprenesú do raw state. Sole eligible orchestration default zostane projekcia.
- [x] Resolver je pure; lookup plán má dnešné enabled podmienky; snapshoty loading/error/resolved a prázdne query dáta nesmú byť zamenené.

**Overenie:**

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-groups/model/resolveRecoveryGroupDraft.test.ts src/features/recovery-plans/recovery-groups/model/recoveryGroupDraftLifecycle.test.ts src/features/recovery-plans/recovery-groups/utils/reconcileMetroMirrorPrefill.test.ts src/features/recovery-plans/recovery-groups/utils/recoveryGroupTopology.test.ts
```

- [x] Focused testy, lint troch zmenených súborov a diff check prešli.

**Závislosti:** checkpoint F2. **Riziko:** stredné; nenapájať query HTTP ani vlastnú cache.

### T7 — Pozorovanie Discovery a bezpečný cleanup

- [x] Implementovať T7.

**Popis:** Napojiť čisté projekcie do Buildera a render-time pruning nahradiť idempotentným selectionObserved eventom nad latest state.

**Súbory (4, M):**

- `model/recoveryGroupDraftLifecycle.ts`
- `model/recoveryGroupDraftLifecycle.test.ts`
- `components/RecoveryGroupBuilder.tsx`
- `components/RecoveryGroupBuilder.discovery-lifecycle.test.tsx`

**Akceptácia:**

- [x] Builder nemá vlastný Discovery union/exclusion/prefill/pruning algoritmus ani render-time setDraft. Existing reconciliation zostáva v pôvodnom helperi.
- [x] selectionObserved revaliduje current identity a selectedVolumes nad latest stavom; opakovanie je no-op; pending/error zachovajú saved A. Volume-only pruning nečaká na VM Discovery.
- [x] Deferred full sekvencia PLAN §8 prejde aj v StrictMode: nová user editácia a exclusions prežijú neskoré responses/refetch; submit dostane najnovší efektívny draft.

**Overenie:**

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-groups/model/recoveryGroupDraftLifecycle.test.ts src/features/recovery-plans/recovery-groups/model/resolveRecoveryGroupDraft.test.ts src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.discovery-lifecycle.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupRelatedVolumes.test.tsx src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupMetroMirrorRelationships.test.tsx
```

- [x] Focused testy, ESLint štyroch zmenených súborov a diff check prešli.

**Závislosti:** T6. **Riziko:** vysoké. Nepridávať request revision systém bez dokázanej medzery v existujúcej query izolácii.

### Checkpoint F3

- [x] T6–T7 sú overené; kombinovaný baseline + F1/F2/F3 skupiny prešli s pôvodnými assertions.
- [x] Manual/persisted/automatic precedence aj raw/effective rozdiel preukazuje unit aj integration test, nielen mock výsledku resolvera.
- [x] Reviewer preveril cleanup proti najnovšiemu user eventu, error/retry a background refetch s cached dátami; isLoading/isFetching sa potichu nezamenili.

## F4 — readiness, integrácia a regresie

### T8 — Readiness ako doménová projekcia

- [x] Implementovať T8.

**Popis:** Presunúť readiness a lock pravidlá do pure funkcie; Builder ponechá step state, render a prefetch efekty.

**Súbory (4, M):**

- `model/recoveryGroupDraftReadiness.ts` — nový
- `model/recoveryGroupDraftReadiness.test.ts` — nový
- `model/recoveryGroupDraftLifecycle.ts` — lokálny export/interface
- `components/RecoveryGroupBuilder.tsx`

**Akceptácia:**

- [x] Truth table pokrýva všetkých 11 požadovaných readiness výstupov, prefetch readiness a locks; oba layouts (8 VM / 7 volume), direct navigation, sole/multiple Airflow, providers refresh/error a isInitialLoading.
- [x] Pushed, Managed partial rollback a clean Managed rollback majú dnešný Save/edit behavior. **L1:** live `initialData` na rovnakej ID bez remountu prepína readOnly/canCreate/prefetch a transition admission oboma smermi, bez prepísania raw draftu či dirty. Complete manual Existing môže pokračovať pri relationship error; related Discovery error blokuje ako dnes.
- [x] Payload validator a mutation hook sa nemenia; canCreate naďalej nevyžaduje zapnutý push toggle. Nepridáva sa nový isResolved gate bez rozhodnutia.

**Overenie:**

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-groups/model/recoveryGroupDraftReadiness.test.ts src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.discovery-lifecycle.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.prefetch.test.tsx src/features/recovery-plans/recovery-groups/utils/calculateRecoveryGroupStepIndices.test.ts
```

- [x] Focused testy, lint štyroch zmenených súborov a diff check prešli.

**Závislosti:** checkpoint F3. **Riziko:** vysoké: navigation/Save/prefetch gating.

### T9 — Create/edit kontrakt a finálna regresia

- [x] Implementovať T9.

**Popis:** Doplniť chýbajúce kontraktové regresie, overiť page dirty/session správanie aj skutočný Builder. Page mocks nepoužívať ako náhradu Discovery integration.

**Súbory (3, M; dopĺňať iba potrebné assertions):**

- `components/RecoveryGroupBuilder.discovery-lifecycle.test.tsx`
- `pages/RecoveryGroupBuilderPage.test.tsx`
- `pages/RecoveryGroupEditorPage.test.tsx`

**Akceptácia:**

- [x] Skutočný Builder odovzdá správny effective draft create/edit; user edit vyvolá dirty, Discovery/metadata ho samy nevyvolajú, submit neodošle lokálne H/X/observation údaje.
- [x] Page kontrakt: cancel/unsaved guard, save failure ponechá edit, úspech resetuje dirty a zachová navigáciu alebo push result modal. Ak page mocks guard nepokrývajú, doplniť príslušné assertions, neextrahovať session.
- [x] Focused finálna matica vrátane **piatich wizard-step suites z PLAN §8**, L1 a CG1–CG3, typecheck a zmenené súbory ESLint sú zelené; endpoints/query keys/payloady a VM/metadata precedence sa nezmenili.

**Overenie:**

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.discovery-lifecycle.test.tsx src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.test.tsx src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.test.tsx src/features/recovery-plans/recovery-groups/helpers/mapRecoveryGroups.test.ts src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroups.test.tsx src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx
npm.cmd run typecheck
```

- [x] Focused testy, lint zmenených súborov a diff check prešli; výsledky sú zaznamenané.

**Závislosti:** T8. **Riziko:** stredné v testoch, vysoký význam finálnej regresie. Ak treba ďalší production fix, vrátiť sa do owning tasku a opakovať jeho focused overenie.

### Checkpoint F4 — finálna akceptácia

- [x] Vykonať celý explicitný baseline zoznam z PLAN §8, všetky pridané F1–F4/extra testy **a päť existujúcich wizard-step suites** (`RecoveryGroupTypeStep.test.tsx`, `RecoveryGroupProviderStep.test.tsx`, `RecoveryGroupResourcesStep.test.tsx`, `RecoveryGroupMetroMirrorFields.test.tsx`, `RecoveryGroupOrchestrationStep.test.tsx`) v kombinovanom focused rune.
- [x] `npm.cmd run typecheck`, ESLint všetkých skutočne zmenených TS/TSX súborov a `git diff --check` prešli.
- [x] Overiť nulové zmeny BE/generated/query keys/invalidácie a nezmenené create/edit/push/rollback výsledky; skontrolovať diff voči scope, nie iba zelené testy.
- [ ] Manuálne prejsť create Local, Existing manual overrides, new Managed; legacy edit; pushed lock; Managed partial/clean rollback; cancel s unsaved guard; rýchlu navigáciu počas prefetch. Bez zmeny účtov alebo testovacích dát mimo oprávneného prostredia. **Evidence 2026-10-27:** Microsoft Edge + Playwright verified Local Create wizard gates/VMware inventory, HTML5 drop with a simulated browser DragEvent, pushed Group read-only, editable Group dirty Back-cancel, missing-provider Edit disabled, Managed Edit warning and Existing Metro Mirror Edit/topology. **Still open:** new Managed Create, actual partial/clean rollback and rapid prefetch navigation; no live backend. Do not treat this partial smoke as complete.
- [x] L1 preukázal live same-ID locks bez remountu/straty draftu; CG1–CG3 rozlišujú persistované a manuálne prázdne CG/auxiliary; všetkých 5 child-step suites je zelených bez oslabenia assertions.
- [x] Reviewer potvrdil, že Builder je wizard/query orchestrátor a nepozná reset/union/prefill/pruning/readiness pravidlá; nevznikol generic framework ani druhá cache.
- [x] Záverečný report oddelí vykonané focused checks od nespusteného kompletného suite/production buildu a uvedie zvyšné produktové otázky.

## Závislosti a rozsah

```text
Review → T1 → T2 → T3 → checkpoint F1
       → T4 → T5 → checkpoint F2
       → T6 → T7 → checkpoint F3
       → T8 → T9 → checkpoint F4
```

F1: 5 unikátnych test súborov, stredné riziko. F2: 5 súborov, stredné až vysoké. F3: 6 súborov, vysoké. F4: 7 súborov, vysoké. Union naprieč fázami: 16 súborov; každý jednotlivý task má najviac 4 súbory. Overované nezmenené regresné súbory sa do počtu dotknutých súborov nezapočítavajú.

Úlohy zdieľajú Builder a lifecycle interface, preto majú uvedené sekvenčné závislosti. Možná je nezávislá ľudská revízia testov alebo kontraktu; tento plán nevyžaduje paralelných agentov ani ďalší worktree.

## Priebežný záznam vykonania — 2026-10-22

- Používateľ schválil inline vykonanie spresneného plánu. Q1/Q2/Q4/Q6 zachovávajú dnešné správanie; L1 a CG1–CG3 sú regresné požiadavky. Bez worktree, zmeny vetvy, commitu alebo pushu.
- F1: charakterizácie saved/derived volumes, live same-ID locks, prázdnych overrides, CG pri zmene kategórie, metadata.order, Source/cache scope a legacy submit. Baseline a nové testy prešli pred zmenou produkcie; po oprave názvov UI prvkov prešlo 53/53 v oboch Builder suites. Focused ESLint piatich F1 súborov prešiel.
- T4: unit suite najprv zlyhala na chýbajúcom novom module; po implementácii 15/15 testov prešlo. Následne doplnené same-provider/workload a volume removal edge cases sú zahrnuté vo finálnom rune.
- F2 checkpoint: 75/75 testov v 4 súboroch prešlo. TopologyStep assertions sa zmenili iba na sémantické event payloads; reset assertions sú v lifecycle a pôvodné behavior testy Buildera ostali.
- F3 checkpoint: 85/85 testov v 6 súboroch prešlo. Pôvodný Metro helper aj query hooks zostali nezmenené. Cleanup je idempotentný selectionObserved event z committed efektu cez zrušiteľný microtask. Identity aj latest selection sa znovu overujú v transition; bez lint suppressions.
- F4: readiness, live locks a prefetch gates sú v čistom module; page testy overujú cancel/dirty, neúspešný a úspešný save. Read-only review nenašlo produkčné regresie. Nájdená medzera v async cleanup coverage bola doplnená deferred testom so zmenou VM identity, late old response a payload assertion. Následná revízia: žiadne otvorené nálezy.
- Ručný browser smoke NEBOL vykonaný: CUA oznámilo „Browser is not available: iab“; inventár browsers je prázdny a Chrome DevTools MCP nie je dostupný. Dočasný Vite server bol zastavený. Automatické testy nie sú vydávané za ručný browser smoke.
- Súbežná zmena `src/app/routing/__snapshots__/routeContract.test.tsx.snap` sa objavila počas práce a zostala nedotknutá.

### Finálne verifikačné výsledky

- `node node_modules/vitest/vitest.mjs run @testPaths` — explicitných 23 paths z PLAN §8 (baseline + F1–F4 + TopologyStep + inventory/index + päť child suites): **309/309 testov, 23/23 súborov**, exit 0, 129,67 s.
- `npm.cmd run typecheck` — exit 0 po finálnych TS/TSX zmenách.
- `node node_modules/eslint/bin/eslint.js @lintPaths --max-warnings 0` — všetkých 16 zmenených TS/TSX paths, exit 0.
- `git diff --check` a obsahové kontroly všetkých 18 task súborov — prešli. Builder neobsahuje pôvodné reset/union/prefill/pruning funkcie; diff chránených produkčných kontraktov je prázdny.
- Kompletný suite ani production build nebol spustený. Ručný browser smoke zostáva jediná nesplnená položka.
- Vetva `spike/ant-design-shell` ponechaná bez zmeny. Bez commitu, pushu, stash/reset či worktree. BE/generated, HTTP hooks, query keys, invalidácie, produkčný mapper/validator ani Snapshot Policy sa nemenili.
