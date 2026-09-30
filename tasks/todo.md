# Úlohy: Recovery Group topology UI + backend

## Aktívne rozšírenie: Metro Mirror predvyplnenie (2026-09-30)

Plán: `tasks/plan.md`, fáza MM1–MM7. MM1–MM6 implementované inline; pôvodná implementačná história nižšie zostáva zachovaná.

- [x] MM1: Generated relationship lookup hook a focused testy.
- [x] MM2: Reconciliácia automatických, ručných a uložených hodnôt.
- [x] Kontrolný bod MM-A: Reset pravidlá a ochrana ručných úprav.
- [x] MM3: Oddeliť Topology gate od úplnej storage/submit validácie.
- [x] MM4: Presun CG do controlled storage panelu zo shared komponentov.
- [x] Kontrolný bod MM-B: Topology bez CG a jediný zdroj draft stavu.
- [x] MM5: Integrácia do Related storage aj volume-only Resources.
- [x] MM6: en/sk/cs a contract test uloženia ručných opráv.
- [x] Kontrolný bod MM-C: Payload a edit round-trip bez provenance.
- [ ] MM7: Responzívny browser smoke a autorizovaný read-only backend lookup — browser unavailable; API bez prihlásenia 401. Verejné OpenAPI overené, kontrakt súhlasí.
- [x] Focused testy/lint/typecheck podľa plánu, výsledky a limity zaznamenané.
- [x] Overené implementačné zmeny atomicky commitnuté na prototype; bez merge/push.

### Overenie rozšírenia (2026-09-30)

- Implementačné commity: `6f9abb7` (MM1), `a6759e8` (MM2), `ee22237` (MM3), `0896550` (MM4), `06c7e19` (MM5), `4dd957c` (MM6).
- Focused Vitest: **13 súborov / 131 testov prešlo**. Po následnej úprave typovania mocku opätovne prešlo 5 testov lookup hooku.
- `npm.cmd exec eslint -- <zmenené .ts/.tsx súbory oproti a7166aa>`: prešlo.
- `npm.cmd run typecheck`: prešlo. `git diff --check`: prešlo. Upravené locales boli parsované ako JSON a overené locale testom.
- Celý test suite ani production build neboli spustené.
- Browser: `cua.getState()` vrátil prázdny zoznam; pokus vytvoriť Chrome tab skončil `Browser is not available: chrome`. Responzívne rozmery, zoom a vizuálny smoke nie sú overené.
- Read-only backend: `/openapi.json` 200 potvrdzuje required `provider_id` (master FLASHCOPY), `volume_names[]` a existujúcu response schému. `/get_providers?role=all` 401 bez prihlásenia. Reálny relationship lookup ani CRUD nebol vykonaný; orchestration sa nespúšťala.
- Implementačné rozhodnutie: automatické hodnoty sú odvodené z aktuálneho query výsledku, draft uchováva iba ručné/persistované auxiliary hodnoty a príznak ručne zadaného CG. Takto refetch neprepisuje opravy a nevzniká effect s časovačom. Prerezanie odstránených overrides čaká na dokončené discovery.

Reprodukcia focused testov (PowerShell, z prototype worktree):

```powershell
$rg = 'src/features/recovery-plans/recovery-groups'
npm.cmd exec vitest run "$rg/hooks/useRecoveryGroupMetroMirrorRelationships.test.tsx" "$rg/utils/reconcileMetroMirrorPrefill.test.ts" "$rg/utils/recoveryGroupTopology.test.ts" "$rg/api/recoveryGroupsValidation.test.ts" "$rg/hooks/useRecoveryGroups.test.tsx" "$rg/components/RecoveryGroupTopologyStep.test.tsx" "$rg/components/RecoveryGroupMetroMirrorFields.test.tsx" "$rg/components/RecoveryGroupBuilder.test.tsx" "$rg/components/RecoveryGroupResourcesStep.test.tsx" "$rg/helpers/mapRecoveryGroups.test.ts" src/locales/recoveryGroupTopologyTranslations.test.ts "$rg/pages/RecoveryGroupBuilderPage.test.tsx" "$rg/pages/RecoveryGroupEditorPage.test.tsx"
$changedFiles = @(git diff --name-only a7166aa -- '*.ts' '*.tsx')
& npm.cmd exec eslint -- $changedFiles
npm.cmd run typecheck
git diff --check
```

## Pôvodná fáza — historický stav

Autoritatívny plán: tasks/plan.md. Pracovisko: .worktrees/topology-preview, vetva prototype/recovery-group-topology. Implementácia prebieha v tejto konverzácii.

- [x] T1: Read model a Local/Metro round-trip fixture mapovanie.
- [x] T2: Submit validácia a generated payload pre VM aj volume-only.
- [x] Kontrolný bod A: Zachovaný kontrakt, metadata a legacy Local.
- [x] T3: Generated submit hooks, response record, refresh a chyby.
- [x] T4: Shared resource row slot a dostupný úplný názov.
- [x] T5: Controlled Topology komponent a partner validácia.
- [x] T6: Wizard indexy, edit initialization, Source/discovery prechody.
- [x] Kontrolný bod B: Local regresia a Metro inventory kontext.
- [x] T7: Auxiliary input v každom vybranom drag-and-drop volume riadku.
- [ ] T8: en/sk/cs a responzívny app layout s viditeľným footerom (browserové rozlíšenia a zoom neoverené: browser service unavailable).
- [x] T9: Create/edit round-trip kontrakt a focused testy.
- [ ] Kontrolný bod C: Browser výsledky chýbajú; živý backend smoke test nebol vykonaný.

Pri každej úlohe:
- [x] Akceptačné kritériá implementačných úloh a focused testy podľa tasks/plan.md.
- [x] Cielený lint, relevantný typecheck a git diff --check.
- [ ] Atomic commit výhradne na prototype/recovery-group-topology.

Focused testy: 14 súborov, 115 testov prešlo; tsc, ESLint a git diff --check prešli. Browserový vizuálny test nebolo možné spustiť, pretože browser service nebola dostupná. Neprepínať hlavný checkout, nepushovať ani nemergovať do test bez samostatného zadania.
