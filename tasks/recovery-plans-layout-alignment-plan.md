# Implementačný plán: Zjednotenie layoutu Recovery Plans stránok

Tasks: `tasks/recovery-plans-layout-alignment-todo.md`.
Revízia: 2026-10-01 (r3; Tasks 1–3 implementované, Task 4 čaká na človeka) — rozhodnutia zapracované; short-viewport floor mimo scope; concurrency protocol kontroluje aj zmenu HEAD.

## Stav repozitára — iba snapshot pri poslednej revízii

> Toto **nie je invariant plánu**. Na vetve paralelne pracuje iná session (Model C drawer); HEAD aj working
> tree sa menia aj počas revízie plánu. Pred implementáciou **každého** tasku sa aktuálny HEAD a stav musia
> znovu overiť podľa **Concurrency / worktree protocol** nižšie.

Snapshot pri poslednej revízii (2026-10-01, r3):

- Branch: `spike/ant-design-shell`, HEAD `224a6632`, ahead 16 voči `github/spike/ant-design-shell`, behind 0.
- Working tree: cudzie rozpracované `src/shared/components/data-table/DetailDrawer.tsx` / `.test.tsx`
  + untracked súbory tohto plánu.
- Od pôvodnej analýzy (`0468f329`) paralelné commity menili iba súbory, ktoré plán nevlastní
  (napr. policy `*Table.tsx`, `DetailDrawer`, locale drawer kľúče). Task-owned súbory (Recovery pages,
  `RecoveryPolicyPageShell`, shared layout primitives) boli pri tomto snapshote nezmenené.

## Prehľad

Recovery Plans stránky používajú rovnaké shared primitives ako canonical table pages
(`TableToolbar` → `PageHeader`, `InventoryShell` → `Card`, `DataTableSurface`, `DataTableToolbar`,
`DataTablePagination`). Platform Administration nemá vlastný všeobecný shell — Platform Providers, Audit,
Identity Access, Providers aj Recovery stavajú na tých istých shared primitives. Vizuálne rozdiely
nespôsobujú shared komponenty, ale **neúplné použitie ich API** v Recovery stránkach:

1. Recovery Apps a Recovery Groups sú jediní consumers `InventoryShell` bez surface headera.
2. Recovery Runs opakuje page title aj page description v surface headeri a má voľný scope note nad Card.
3. Snapshot policies posiela tabs bez title/description (sesterské stránky ich majú).
4. Recovery Runs a `RecoveryPolicyPageShell` renderujú tabs iným receptom než canonical surface tabs.

Plán mení iba props, ktoré stránky posielajú do `InventoryShell` / `Tabs`, a locale stringy.
Nemení `*Table.tsx`, business logiku, hooky, drawery, mutácie, modaly ani routing.

## Canonical reference

- **Bez tabs:** Policy Sets, Platform Providers, Providers — `TableToolbar` + `InventoryShell`
  (title/description) + `DataTableSurface`. Policy Sets ostáva bez zmeny ako referenčný príklad v Recovery.
- **S tabs:** Resources VMware (visual reference, nie dependency).

```text
PageHeader (TableToolbar)        h1 + description | [Create] [Refresh]
InventoryShell Card              rounded-[20px], border, shadow, p-0
├─ surface header                px-4 py-2.5, border-b
│  ├─ h2 "<Entity> records"      text-sm semibold (vľavo)
│  ├─ description                text-xs muted
│  └─ tabs (optional)            surface-tabs recept (vpravo)
└─ inset well                    bg-surface-subtle p-3
   └─ DataTableSurface           toolbar / minmax(0,1fr) scroll / pagination
```

Card → sivý well → `DataTableSurface` je zámerný canonical vzor (`tasks/page-layout-unification-plan.md`,
Task 6). Problém nastáva iba vtedy, keď Card nemá surface header.

## Architektonické rozhodnutia (schválené)

- Používať shared `PageHeader`, `TableToolbar`, `InventoryShell`, `DataTable*`.
- **Nevytvárať** `RecoveryPlansShell`, `RecoveryPlansInventoryShell`, `RecoveryPlansPageFrame` ani iný nový komponent.
- **Neimportovať** `ResourceInventoryShell` ani `ResourceViewportFrame`.
- **Nemeniť shared komponenty** (`PageHeader`, `TableToolbar`, `InventoryShell`, `Card`, `Tabs`, `DataTable*`).
- **Apps/Groups** dostanú surface header cez `inventoryTitle` + `inventoryDescription` v štýle
  "`<Entity> records`" + krátky vecný popis (ako Policy set records / Snapshot policy records / Platform providers).
- **Recovery Runs:** `inventoryTitle` "Orchestrated entities"; statický krátky `inventoryDescription` bez `{count}`
  (počet už komunikuje pagination; žiadny layout shift po načítaní); voľný scope note nad Card sa odstráni.
- **`RecoveryPolicyPageShell` zostáva.** `inventoryTitle` a `inventoryDescription` sa stanú povinnými props.
  `SnapshotPoliciesPage` znova posiela `pages.snapshotPolicies.inventoryTitle/inventoryDescription`
  (`e4cf4534` ich odstránil len ako následok optional props, nie ako produktové rozhodnutie).
- **Surface-tabs recept** (bez nového shared variantu):
  `indicator="inset" compact className="w-full shrink-0 border-b-0 bg-surface px-0 sm:w-auto"`.
  Dnes 4 použitia (Resources, Resources ISE, Discovery Settings, Identity Access navigation),
  po zmene 6 (+ Recovery Runs, `RecoveryPolicyPageShell`).

## Concurrency / worktree protocol (povinný pre každý implementačný task)

Na spike vetve beží paralelná session. Môže meniť working tree **aj vytvárať commity počas tasku**, pričom
working tree ostane clean — kontrola samotného `git status` preto nestačí. *Task-owned files* = súbory v sekcii
**Files** daného tasku v TODO.

**A. Na začiatku tasku**
1. `git status --short`
2. `git rev-parse HEAD` → zapamätať ako **task-start HEAD**.
3. `git diff -- <task-owned files>` → zaznamenať pre-existing (cudzie) hunky.
4. Načítať aktuálny obsah task-owned files (editovať až po prečítaní aktuálnej verzie).

**Počas tasku**
- V locale súboroch iba cielené edity vlastných kľúčov; nikdy neprepisovať celý súbor, nemeniť poradie,
  formátovanie ani line endings okolitých kľúčov. Existujúci obsah (vrátane cudzích kľúčov ako
  `drawer.entity.platformProvider`) musí ostať.

**B. Pred stagingom/commitom**
5. Znovu `git rev-parse HEAD` a porovnať s task-start HEAD.

**C. Ak sa HEAD zmenil → STOP**
6. `git log --oneline <task-start-head>..HEAD` — zistiť nové commity.
7. `git diff --name-only <task-start-head>..HEAD -- <task-owned files>` — menili task-owned files?
8. Ak áno: znovu načítať tieto súbory a porovnať nové zmeny s vlastnými (`git diff <task-start-head>..HEAD -- <súbor>`).
9. **Nerebaseovať, neresetovať, neprepisovať cudzie zmeny**, nerobiť `checkout`/`stash` cudzieho obsahu.
10. Pokračovať iba ak je jasné, že zmeny nekolidujú; inak STOP a eskalovať používateľovi.
    Po pokračovaní sa nový HEAD stáva task-start HEAD a krok B sa zopakuje.

**D. Až potom**
11. Focused verification (testy tasku, podľa potreby typecheck/eslint).
12. `git diff -- <task-owned files>` = pre-existing hunky nezmenené + iba hunky tohto tasku.
13. Selektívny staging iba task-owned súborov. Ak súbor obsahuje aj cudzie necommitnuté hunky (napr. locale),
    stageovať iba vlastné hunky (`git add -p` nie je interaktívne dostupný → `git apply --cached` s patchom
    obsahujúcim iba vlastné hunky).
14. `git diff --cached` — overiť, že staged obsahuje iba zmeny tohto tasku.
15. Bezprostredne pred commitom ešte raz `git rev-parse HEAD`; ak sa zmenil, späť na C.
16. Commit.

Nikdy nestageovať súbory mimo tasku (napr. rozpracovaný `DetailDrawer` inej session).

## Task List

### Phase 1: Surface header pre stránky bez tabs
- [ ] Task 1: Recovery Apps + Recovery Groups surface headers

### Phase 2: Tabbed stránky
- [ ] Task 2: Recovery Runs — odstrániť duplicitu, statický surface description, surface tabs
- [ ] Task 3: Recovery Policies — povinný title/description, Snapshot texty, surface tabs

### Checkpoint: Po Tasks 1–3
- [ ] Focused testy zelené
- [ ] `npm run typecheck` zelený
- [ ] Focused `npx eslint <changed files>` zelený
- [ ] `git diff --check` zelený

### Phase 3: Browser verification (human gate)
- [ ] Task 4: Browser checklist — agent pripraví, človek vykoná, agent zapíše iba dodané výsledky

## Overenie

- Focused testy per task (zoznam v TODO). Kompletný `npm test` ani `npm run build` sa nespúšťajú —
  zmena ostáva v layout props a locale stringoch a focused testy ju spoľahlivo pokrývajú.
- `npm run typecheck` je dôkaz pre povinné props v `RecoveryPolicyPageShell`.
- Agent **nevymýšľa** browser measurements. Izolovaný prehliadač sa nemusí dostať cez interný Keycloak;
  autentifikovanú kontrolu vykonáva človek.

## Mimo scope (možné follow-upy)

- **Short-viewport floor** (`lg:min-h-[480px]`) pre Recovery / Providers / Platform Providers / Policy Sets.
  Je to dnes resource-specific správanie; rozšírenie je cross-feature rozhodnutie a mení scroll ownership.
  Samostatný plán vznikne iba ak browser kontrola (Task 4) ukáže reálny problém na 1366×600.
- **Shared `Tabs` variant** pre surface-tabs recept (6 použití). Nie súčasť tejto implementácie.
- Duplicitné `policyTabs` pole v troch policy stránkach — nezmenené.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Prepísanie pre-existing locale zmien | High | Worktree protocol: cielené edity, diff pred/po, selektívny staging hunkov |
| Surface header ubere ~58 px výšky tabuľke Apps/Groups | Med | Rovnaká cena ako Platform Providers / Policy Sets; overiť v Task 4 na 1366×768 a 1366×600 |
| Tabs recept zmení výšku headera Runs/Policies | Low | Cieľ je zhoda s Resources; prepínanie tabov nesmie meniť X/W/H Card — Task 4 |
| Odstránenie `recoveryRuns.scopeNote` | Low | Pred zmazaním grep, že kľúč nemá iné použitie; test sa upraví |
| Povinné props v `RecoveryPolicyPageShell` | Low | Shell test už posiela obe props; `tsc` overí consumers |

## Open Questions

Žiadne.

sk/cs preklady nových kľúčov sú implementačný detail Tasks 1–2: musia významovo zodpovedať schválenému EN copy
a štýlu existujúcich `*.inventoryTitle` / `*.inventoryDescription` stringov v danom locale.
