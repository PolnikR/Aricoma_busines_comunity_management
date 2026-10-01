# TODO: Zjednotenie layoutu Recovery Plans stránok

Plán: `tasks/recovery-plans-layout-alignment-plan.md` (revízia r3, 2026-10-01).
Stav: Tasks 1–3 hotové (`f35e3d73`, `fef4faa0`, `354e58d0`); Task 4 čaká na kontrolu človekom.

## Safety

- Nemeniť `*Table.tsx`, business logiku, hooky, drawery, mutácie, modaly ani routing.
- Nemeniť shared `PageHeader`, `TableToolbar`, `InventoryShell`, `Card`, `Tabs`, `DataTable*`.
- Nevytvárať nový shell/komponent; neimportovať `ResourceInventoryShell` / `ResourceViewportFrame`.
- Locale zmeny vždy v `en.json`, `sk.json`, `cs.json` naraz.
- sk/cs preklady významovo zodpovedajú EN copy a štýlu existujúcich `*.inventoryTitle/Description` stringov.
- Stav repa v pláne je iba snapshot; HEAD sa mení (paralelná session).
- **Concurrency / worktree protocol** (detail v pláne) — povinný v každom implementačnom tasku (1–3):
  - [x] **A.** `git status --short`; `git rev-parse HEAD` → task-start HEAD; `git diff -- <task-owned files>`; načítať aktuálny obsah task-owned files.
  - [x] Počas tasku iba cielené edity; existujúci obsah (aj cudzie locale kľúče) zachovať.
  - [x] **B.** Pred stagingom/commitom znovu `git rev-parse HEAD`.
  - [x] **C.** Ak sa HEAD zmenil → STOP: `git log --oneline <task-start-head>..HEAD`; `git diff --name-only <task-start-head>..HEAD -- <task-owned files>`; ak áno, znovu načítať a porovnať; žiadny rebase/reset/prepis cudzích zmien; pokračovať iba bez kolízie, inak eskalovať. _(HEAD sa počas Tasks 1–3 nezmenil; krok C sa nespustil.)_
  - [x] **D.** Focused verification → selektívny staging iba vlastných súborov/hunkov → `git diff --cached` → posledná kontrola HEAD → commit.
  - [x] Nikdy nestageovať cudzie zmeny.
- Každý task = samostatný atomický commit po focused verifikácii.

---

## Task 1: Recovery Apps + Recovery Groups surface headers

**Description:** Jediní dvaja consumers `InventoryShell` bez surface headera — Card okolo `DataTableSurface`
nemá funkciu. Pridať `inventoryTitle` + `inventoryDescription` v štýle Policy Sets / Platform Providers.
`notice` (delete/mutation error Alert) ostáva nezmenený.

Copy (en; sk/cs v rovnakom štýle ako existujúce `*.inventoryTitle/Description`):
- `pages.recovery.inventoryTitle` = "Recovery application records"
- `pages.recovery.inventoryDescription` = krátky vecný popis, napr. "Browse and manage recovery application definitions."
- `pages.recoveryGroups.inventoryTitle` = "Recovery group records"
- `pages.recoveryGroups.inventoryDescription` = krátky vecný popis, napr. "Browse and manage resource groups available to recovery applications."

**Acceptance criteria:**
- [x] Obe stránky renderujú h2 surface headera s textom odlišným od h1.
- [x] Props `RecoveryApplicationsTable` / `RecoveryGroupsTable` a `notice` sú nezmenené.
- [x] Nové kľúče v en/sk/cs; pre-existing locale hunky zachované.

**Verification:**
- [x] `npm exec vitest run src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationsListPage.test.tsx src/features/recovery-plans/recovery-groups/pages/RecoveryGroupsListPage.test.tsx`
- [x] Do oboch testov assertion na `heading` level 2 s inventory title.
- [x] JSON parse en/sk/cs.

**Dependencies:** None

**Files:**
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationsListPage.tsx` (+ `.test.tsx`)
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupsListPage.tsx` (+ `.test.tsx`)
- `src/locales/en.json`, `src/locales/sk.json`, `src/locales/cs.json`

**Scope:** M

---

## Task 2: Recovery Runs — duplicita, statický description, surface tabs

**Description:** Surface header dnes opakuje page title aj page description a scope note visí nad Card.
- `inventoryTitle` → nový kľúč `recoveryRuns.inventoryTitle` = "Orchestrated entities".
- `inventoryDescription` → nový statický kľúč `recoveryRuns.inventoryDescription`, krátky, bez `{count}`,
  napr. "Latest run per orchestrated entity. Entities never pushed to orchestration aren't queried."
- Odstrániť `notice` so scope note; po grep-overení zmazať `recoveryRuns.scopeNote` zo všetkých locale.
- Tabs: `indicator="inset" compact className="w-full shrink-0 border-b-0 bg-surface px-0 sm:w-auto"`.
- Tabs All / Applications / Recovery Groups, `?tab=`, filtrovanie, entity selection a drawer funkčne nezmenené.

**Acceptance criteria:**
- [x] Žiadny text z `PageHeader` sa neopakuje v surface headeri; nad Card nie je voľný text.
- [x] Description je statický (žiadny `{count}`, nemení sa po načítaní).
- [x] Tabs majú surface recept a prepínanie funguje ako doteraz.

**Verification:**
- [x] `npm exec vitest run src/features/recovery-plans/recovery-runs/pages/RecoveryRunsPage.test.tsx`
- [x] Upraviť test so scope note textom; pridať assertion h2 ≠ h1 a na statický description.
- [x] `RecoveryRunsTable.test.tsx` iba ak treba potvrdiť nezmenený contract (tabuľka sa nemení). _(Nespustené — tabuľka nezmenená.)_
- [x] JSON parse en/sk/cs.

**Dependencies:** None

**Files:**
- `src/features/recovery-plans/recovery-runs/pages/RecoveryRunsPage.tsx` (+ `.test.tsx`)
- `src/locales/en.json`, `src/locales/sk.json`, `src/locales/cs.json`

**Scope:** M

---

## Task 3: Recovery Policies — povinný title/description, Snapshot texty, surface tabs

**Description:** `RecoveryPolicyPageShell` ostáva.
- Tabs na surface recept (dnes `inset` bez `compact`, s vlastným `border-b` a `px-3`).
- `inventoryTitle` a `inventoryDescription` → povinné props; odstrániť podmienené spready.
- `SnapshotPoliciesPage` znova posiela `pages.snapshotPolicies.inventoryTitle` a
  `pages.snapshotPolicies.inventoryDescription` (kľúče existujú v en/sk/cs; locale sa nemení).

**Acceptance criteria:**
- [x] Všetky tri policy stránky: title + description vľavo, tabs vpravo.
- [x] Vynechanie title/description je chyba `tsc`.
- [x] Prepínanie tabov naviguje na správnu route; tabuľky a modaly nezmenené.

**Verification:**
- [x] `npm exec vitest run src/features/recovery-plans/recovery-policies/components/RecoveryPolicyPageShell.test.tsx src/features/recovery-plans/recovery-policies/snapshot/pages/SnapshotPoliciesPage.test.tsx src/features/recovery-plans/recovery-policies/application-recovery/pages/RecoveryAppPoliciesPage.test.tsx src/features/recovery-plans/recovery-policies/clean-room/pages/CleanRoomPoliciesPage.test.tsx`
- [x] Do Snapshot testu assertion na h2 "Snapshot policy records".
- [x] Do `RecoveryPolicyPageShell.test.tsx` focused assertion na surface-tabs recept (dnešný test overuje iba navigáciu):
  inset indicator na vybranom tabe, compact tabs, a tablist className kompatibilný so surface headerom
  (`border-b-0`, `px-0`, bez vlastného border-bottom).

**Dependencies:** None

**Files:**
- `src/features/recovery-plans/recovery-policies/components/RecoveryPolicyPageShell.tsx` (+ `.test.tsx`)
- `src/features/recovery-plans/recovery-policies/snapshot/pages/SnapshotPoliciesPage.tsx` (+ `.test.tsx`)

**Scope:** S

---

## Checkpoint: Po Tasks 1–3

- [x] Všetky focused testy z Tasks 1–3 zelené
- [x] `npm run typecheck` zelený
- [x] `npx eslint <všetky zmenené .ts/.tsx súbory>` zelený
- [x] `git diff --check` zelený
- [x] Cudzie rozpracované zmeny (ak existujú) ostali v working tree nestageované; `drawer.entity.platformProvider` v locale zachovaný
- [x] Celý test suite ani build sa nespúšťajú (iba layout props + locale)

---

## Task 4: Browser verification checklist (human gate)

**Description:** Agent sa nemusí dostať cez interný Keycloak, preto authenticated meranie vykonáva človek.

**Agent:**
- [x] Pripraví checklist do `tasks/recovery-plans-layout-measurements.md`: routes, viewporty, čo merať, očakávané invarianty.

**Človek:**
- [ ] Vykoná kontrolu v autentifikovanom prehliadači (`http://localhost:5173`) a dodá screenshots alebo merania.

**Agent (až potom):**
- [ ] Zapíše **iba dodané** výsledky do evidence súboru. Žiadne vymyslené merania.

**Routes:** Recovery Apps, Recovery Groups, Recovery Runs (All / Applications / Recovery Groups),
Snapshot / Application Recovery / Clean Room policies, Policy Sets; referencie Platform Providers, Resources VMware.

**Viewporty:** 1536×864, 1366×768, 1366×600.

**Merať:** top/height `PageHeader`; top/X/W/H Card; výška surface headera; padding wellu; top `DataTableToolbar`;
výška data viewportu a počet viditeľných riadkov; pozícia pagination; empty / loading / error / mutation-error state;
X/W/H Card pri prepínaní tabov (Runs, Policies); horizontálny page scroll.

**Očakávané invarianty:**
- [ ] Card X/W všetkých Recovery stránok = canonical Platform Providers layout (±1 px).
- [ ] Card top/Y porovnávať iba pri rovnakej slot topológii — normálny stav bez `notice`/`metrics` — voči Platform Providers normal state (±1 px).
- [ ] Ak je prítomný `notice` (napr. mutation/error alert), posun Card nadol je očakávaný, nie regresia; error/mutation states sa merajú, ale nevyžaduje sa rovnaké Card Y ako pri Platform Providers normal state.
- [ ] `notice` nemení X/W Card a nevytvára horizontálny overflow.
- [ ] Surface header s tabs má rovnakú výšku ako Resources VMware.
- [ ] Žiadny prázdny surface header, žiadny duplikovaný text.
- [ ] Žiadny voľný informačný text mimo Card; explicitný `InventoryShell.notice` (napr. error/mutation Alert) je povolený a zámerne sa renderuje nad Card.
- [ ] Prepínanie tabov nemení X/W/H Card.
- [ ] Žiadny horizontálny page scroll.

**Follow-up gate:** ak 1366×600 ukáže kolaps tabuľky, vznikne **samostatný** plán pre short-viewport floor —
nie súčasť tohto TODO.

**Dependencies:** Tasks 1–3 + Checkpoint

**Files:** `tasks/recovery-plans-layout-measurements.md`

**Scope:** S
