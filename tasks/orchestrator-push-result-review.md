# Zjednotenie výsledku Orchestrator Push

Vetva: `spike/ant-design-shell`. Implementácia bola pôvodne odovzdaná bez commitu,
merge a pushu podľa zadania. Následná požiadavka používateľa autorizovala commit a push
vlastných zmien na túto vetvu; ostatné rozpracované zmeny ostávajú mimo commitu.

## Výsledné správanie

Create aj Edit stránka pre Recovery Applications a Recovery Groups používajú priamo
`OrchestratorPushResultDialog`, postavený na pôvodnom `ChecklistResultDialog`.
Rozmery, typografia, rozloženie a tlačidlá vychádzajú z pôvodného modalu Applications.

Oba toky odovzdávajú skutočný `orchestrator_push` z API. Hook Groups vracia existujúce
polia skupiny rozšírené o `orchestratorPush`; jeho ostatní konzumenti ostávajú kompatibilní.
Applications zachovávajú aj nullable a neúplné odpovede, ktoré pôvodný adaptér odmietal.

`pushed` označuje nasadenie DAG-u. Žiadny stav vykonávania DAG-u sa nevymýšľa.
Kontroly vychádzajú zo stavu API a prípadnej neprázdnej DAG cesty; chýbajúce polia
nevytvárajú ďalšie úspešné kontroly. `skipped` zobrazuje dôvod, ak existuje.
Bez výsledku sa nezobrazuje zoznam úspešných kontrol. Úplná odpoveď zostáva v response body.
Airflow odkaz používa iba DAG ID z výsledku API a URL providera vybraného podľa
`orchestrationProviderId`. Zatvorenie zachováva navigáciu na príslušný zoznam.

## Upravené súbory

Nové:

- `src/shared/components/modal/OrchestratorPushResultDialog.tsx`
- `src/shared/components/modal/OrchestratorPushResultDialog.test.tsx`
- `src/shared/components/modal/OrchestratorPushResultDialog.response.test.tsx` — presunuté regresie pôvodného modalu Applications.

Upravené:

- `src/features/recovery-plans/recovery-applications/hooks/useRecoveryApplications.ts`
- `src/features/recovery-plans/recovery-applications/hooks/recoveryApplicationsWire.test.tsx`
- `src/features/recovery-plans/recovery-applications/model/recoveryApplicationTypes.ts`
- `src/features/recovery-plans/recovery-applications/model/submitDagResponse.ts`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.tsx`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.test.tsx`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.tsx`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx`
- `src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroups.ts`
- `src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroups.test.tsx`
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.tsx`
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.test.tsx`
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.tsx`
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.test.tsx`
- `src/locales/en.json`
- `src/locales/sk.json`
- `src/locales/cs.json`
- `tasks/orchestrator-push-result-review.md`

Odstránené po overení referencií:

- `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationOrchestratorSuccessModal.tsx`
- `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationOrchestratorSuccessModal.test.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupOrchestratorSuccessModal.tsx`
- `src/shared/components/modal/OrchestratorResultModal.tsx`
- `src/shared/components/modal/OrchestratorResultModal.test.tsx`

`ChecklistResultDialog`, backend a generované Orval súbory ostávajú bez zmeny.

## Overenie

- Cielené testy: **110 testov / 10 súborov prešlo**.
- `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --incremental false`: prešlo.
- Kontrola JSON a nových prekladových kľúčov EN/SK/CS: prešla.
- `git diff --check`: prešlo.
- Izolovaný headless Edge, lokálny fixture so skutočným komponentom a CSS: prešlo.
  Rovnaké dáta pre Applications a Groups mali rovnaké rozmery **672 × 686 px**.
  Overené zalamovanie dlhej cesty, šírka **390 px** bez presahu, `skipped`, chýbajúci
  výsledok a Close; **0 runtime chýb**. Nešlo o test proti živému backendu/Airflow.
- `npm.cmd run build`: **prešlo, exit code 0**. Zahŕňa celorepozitárový ESLint,
  kontrolu rozloženia feature modulov, TypeScript, kompletnú sadu
  **2 293 testov / 332 súborov**, **38 testov API kontrolných skriptov**,
  porovnanie generovaného výstupu a finálny produkčný Vite build.
  Vite upozornil na chunky nad 500 kB a podiel času strávený v pluginoch;
  upozornenia neblokovali build. Limity ani kontrolné pravidlá sa nemenili.

Cielený príkaz:

```powershell
node node_modules/vitest/vitest.mjs run src/shared/components/modal/OrchestratorPushResultDialog.test.tsx src/shared/components/modal/OrchestratorPushResultDialog.response.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.test.tsx src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.test.tsx src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroups.test.tsx src/features/recovery-plans/recovery-applications/hooks/recoveryApplicationsWire.test.tsx src/features/recovery-plans/recovery-applications/hooks/useRecoveryApplications.test.tsx src/shared/components/modal/ChecklistResultDialog.test.tsx
```

Snímky lokálnej kontroly sú v ignorovanom adresári `.worktrees`:
`orchestrator-push-application.png`, `orchestrator-push-group.png`, `orchestrator-push-mobile.png`.

## Review a otvorené riziká

Vlastné review preverilo dátový tok všetkých štyroch stránok, návratové typy hookov,
nullable polia, počty kontrol, navigáciu a zostávajúce referencie odstránených komponentov.
Nebola zistená potreba zmeny backend kontraktu ani ďalší blokujúci problém v rozsahu úlohy.

Existujúci `buildAirflowDagUrl()` pri chýbajúcej URL providera používa pevnú fallback URL
`http://10.99.99.55:8080`. Toto správanie je ponechané podľa zadania; môže viesť na iný
Airflow než zamýšľaný provider. Živý backend a skutočný stav vykonávania DAG-u sa neoverovali.

## Git stav pri pôvodnom odovzdaní implementácie

Vetva zostáva `spike/ant-design-shell`, HEAD `c4b47568`, 15 commitov pred remote.
Zmeny tejto úlohy sú necommitnuté a nestagované. Commit, merge ani push sa nevykonal.
Po kompletnom API overení nemajú generované súbory žiadny Git diff.

Počas behu dlhého buildu pribudli v spoločnom worktree aj zmeny mimo tejto úlohy:

- `public/config.js` — doplnené `AUTH_ENABLED: 'false'`.
- `src/app/routing/__snapshots__/routeContract.test.tsx.snap` — Git hlási zmenu,
  ale `git diff` neukazuje textový rozdiel.
- `tasks/visual-audit-2026-10-21/` — nový nesledovaný adresár.

Tieto súbory sa v tejto úlohe neupravovali ani neobnovovali. Nastavenie vypnutej
autentifikácie je potrebné odlíšiť od zjednotenia modalov pri review spoločného worktree.
