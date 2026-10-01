# Todo: Detail drawer Model C

Plán: `tasks/detail-drawer-model-c-plan.md`. Tasky idú **sekvenčne**, lebo zdieľajú
`DetailDrawer.tsx` a locale súbory. Každý task je jeden atomický commit.

**Štandardná verifikácia (V)** platí pre každý task, ak nie je uvedené inak:

```
npm exec vitest run <test súbory tasku>
npx eslint --max-warnings 0 <zmenené súbory>
npx tsc -p tsconfig.app.json --noEmit
git diff --check
```

**Sada consumerov (SC)** je zoznam 22 test súborov v pláne, sekcia „Sada testov consumerov
drawera“.

**Locale triplet (L)** sú súbory `src/locales/en.json`, `cs.json` a `sk.json`. Každý nový text
dostane kľúč vo všetkých troch.

---

## Fáza 1: Shared základ

### Task 1: `DetailDrawer` header shell a API ✅

**Stav:** hotovo, commit `36409336` (`feat: Model C header for the shared detail drawer`).
Schválené vrátane implementačného detailu focus trapu (pozri posledné kritérium).

**Cieľ:** Nový header (nadpis, meta riadok, subtitle, header akcie, ikonové zatvorenie),
lokalizovateľný resizer aktívny iba od `lg`. Prechodné `eyebrow` a `headerExtra` ostávajú
funkčné.

**Súbory:**

- `src/shared/components/data-table/DetailDrawer.tsx`
- `src/shared/components/data-table/DetailDrawer.test.tsx`
- `src/shared/icons/Icons.tsx` (+ `CloseIcon`)
- `src/shared/hooks/useResizablePanel.ts` (+ voliteľné `resizeLabel`, default „Resize panel“)
- `src/shared/hooks/useResizablePanel.test.ts`
- `src/features/discovery-inventory/resources/components/vmware/VirtualMachineDetailPanel.test.tsx`
  (iba asercie šírky :256–288, `style.width` → CSS premenná)

**Akceptačné kritériá:**

- [x] Props `meta`, `subtitle`, `headerActions` a `resizeLabel` fungujú podľa plánu (§1 a
      vizuálne pravidlá).
- [x] Resizer podľa plánu §1 „Šírka a resizer“:
  - Šírka ide cez `--detail-drawer-width` a triedy `w-[min(420px,92vw)]
    lg:w-(--detail-drawer-width) lg:max-w-[92vw]`. Inline `style.width` sa už nepoužíva.
  - Handle sa renderuje iba pri `resizable` a má `hidden lg:block`. Pod `lg` nie je viditeľný,
    fokusovateľný ani v accessibility tree.
  - Bez viewport JS logiky a bez nového `enabled` v hooku.
- [x] Zatvorenie je `CloseIcon` bez rámika a s `aria-label={closeLabel}`.
- [x] `eyebrow` sa renderuje ako prvá meta položka a `headerExtra` pod meta. Oba majú komentár
      `// Transitional (detail-drawer-model-c): removed in Task 18.` a **nemajú** JSDoc
      `@deprecated`.
- [x] Focus trap, Escape, restore focus, `inert`, resize (od `lg`) a reset šírky fungujú ako
      predtým.
- [x] Existujúce testy sú zelené. Jediné povolené úpravy sú asercie šírky `style.width` →
      `style.getPropertyValue('--detail-drawer-width')` v `DetailDrawer.test.tsx` a
      `VirtualMachineDetailPanel.test.tsx`, s rovnakými hodnotami 420, 436, 476 a 480.
- [x] **Schválený implementačný detail:** focus trap vynecháva fokusovateľné prvky skryté cez
      CSS (`checkVisibility()`, keď ho prehliadač podporuje). Ide najmä o resize handle pod
      `lg`, takže Shift+Tab z close tlačidla neopustí drawer. jsdom `checkVisibility` nemá a
      prvky v ňom ostávajú. Test to simuluje stubom.

**Testy:**

- Nové: meta poradie a falsy položky, `aria-hidden` oddeľovače, subtitle, eyebrow ako meta,
  `headerActions` v riadku nadpisu a vo focus trape, klik na backdrop, `resizeLabel`.
- Nové, resizer gating:
  - `resizable` → separator má `hidden lg:block`, aside má `lg:w-(--detail-drawer-width)` a
    premennú 420px
  - bez `resizable` → separator neexistuje a aside má `w-[min(420px,92vw)]`
- Nové, focus trap: skrytý handle (`checkVisibility: () => false`) sa vynechá a Shift+Tab z
  close prejde na posledný prvok.
- V + celá **SC**.

**Výsledok verifikácie (commit `36409336`):**

- [x] `npx vitest run` na `DetailDrawer.test.tsx` a `useResizablePanel.test.ts`: 2 súbory,
      27/27 testov.
- [x] `npx vitest run` na celú **SC** (22 súborov): 22/22 súborov, 221/221 testov.
- [x] `npx eslint --max-warnings 0` na 6 zmenených súboroch: OK.
- [x] `npx tsc -p tsconfig.app.json --noEmit`: OK.
- [x] `git diff --check`: OK.
- Celá suita ani build sa nespúšťali. Browser kontrola je naplánovaná v Checkpointe A.

**Závislosti:** žiadne. **Rozsah / riziko:** M / vysoké (R1). **Commit:**
`feat: Model C header for the shared detail drawer`.

### Task 2: `DetailDrawerSection` ✅

**Stav:** hotovo, commit `c2664c43` (`feat: shared DetailDrawerSection`). Schválené vrátane
odchýlky v pomenovaní regiónu (pozri kritériá).

**Cieľ:** Shared rozbaľovacia sekcia, **iba uncontrolled** (`defaultOpen`), bez zmeny consumerov.

**Súbory:**

- `src/shared/components/data-table/DetailDrawerSection.tsx` (nový)
- `src/shared/components/data-table/DetailDrawerSection.test.tsx` (nový)
- `src/shared/components/data-table/index.ts` (export)

**Akceptačné kritériá:**

- [x] API podľa plánu §2: `title`, `summary`, `badge`, `defaultOpen = false`, `flush`,
      `children`. Zbalený obsah sa unmountne.
- [x] Komponent **nemá** props `open` ani `onToggle`. Controlled režim sa pridá neskôr iba ako
      discriminated union (plán §2, budúce rozšírenie).
- [x] Markup podľa plánu:
  - `h3 > button` s `aria-expanded` a `aria-controls` (iba keď je otvorená)
  - `aria-labelledby` = title, `aria-describedby` = summary
  - panel s `role="region"` a **`aria-labelledby={titleId}`** (schválená odchýlka: plán mal
    button id; región sa tak volá iba podľa nadpisu sekcie, bez badge a summary)
- [x] Hlavička je sticky, chevron sa otáča s `motion-reduce:transition-none` a focus ring je
      `ring-inset`.

**Testy:**

- Nové:
  - collapsed a expanded, `aria-expanded`, Enter a Space
  - summary a badge, prístupné meno iba title, `flush`
  - `defaultOpen` + následný klik (vlastný stav), viac otvorených naraz
  - `// @ts-expect-error` pri odovzdaní `open` (typový kontrakt)
- V.

**Výsledok verifikácie (commit `c2664c43`):**

- [x] `npx vitest run src/shared/components/data-table/DetailDrawerSection.test.tsx`: 11/11.
- [x] `npx eslint --max-warnings 0` na 3 zmenených súboroch: OK.
- [x] `npx tsc -p tsconfig.app.json --noEmit`: OK (testy sú v `include`, takže overí aj
      `@ts-expect-error`).
- [x] `git diff --check`: OK.

**Závislosti:** T1 (`ChevronRightIcon` už existuje, závislosť je iba poradie commitov).
**Rozsah / riziko:** S / nízke. **Commit:** `feat: shared DetailDrawerSection`.

### Task 3: `DetailRow` restyle a footer ✅

**Stav:** hotovo, commit `1f0bc403` (`feat: lighter DetailRow and split footer slots`).

**Cieľ:** Ľahší riadok vhodný do sekcií a footer so slotmi `footerStart` a `footer`.

**Súbory:**

- `src/shared/components/data-table/DetailDrawer.tsx`
- `src/shared/components/data-table/DetailDrawer.test.tsx`

**Akceptačné kritériá:**

- [x] `DetailRow` je grid `minmax(7rem,35%) / 1fr`, `py-2`, bez `border-b`, `dd` s
      `wrap-anywhere`, zachováva `div > dt + dd`.
- [x] Footer podľa plánu §4:
  - vonkajší `flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3`
  - `footerStart` v ľavej skupine
  - `footer` v end kontajneri `flex min-w-0 flex-1 flex-wrap items-center justify-end gap-3`
  - footer sa nerenderuje, keď chýbajú oba sloty
- [x] **Legacy:** bez `footerStart` je end kontajner jediné dieťa a má celú šírku. Dve tlačidlá s
      `className="flex-1"` sa delia na polovice ako dnes. Mení sa iba padding `p-4` →
      `px-5 py-3`.
- [x] **Model C:** s `footerStart` je deštruktívna akcia vľavo a primárna skupina vpravo.
- [x] Na 359px sa footer zalomí bez orezania a bez horizontálneho scrollu (overí Checkpoint A).

**Testy:**

- Nové:
  - **legacy footer** bez `footerStart` s dvoma `flex-1` tlačidlami: rodič tlačidiel má `flex-1`
    a je jediné dieťa footera (full-width end kontajner)
  - **Model C footer** s `footerStart` (Delete) a `footer` (Edit): prvé dieťa footera obsahuje
    Delete, druhé dieťa (`flex-1 justify-end`) obsahuje Edit, DOM poradie Delete pred Edit
  - absencia footera, `secondary` text v riadku
- V + celá **SC** (FlashSystem `closest('div')` a `nextElementSibling` musia prejsť bez úprav).

**Výsledok verifikácie (commit `1f0bc403`):** SC 22/22 súborov, 227/227 testov (FlashSystem
`closest('div')` a `nextElementSibling` bez úprav); eslint, tsc a `git diff --check` OK.

**Závislosti:** T1. **Rozsah / riziko:** S / stredné (R1, R6). **Commit:**
`feat: lighter DetailRow and split footer slots`.

## Checkpoint A: shared základ ✅

- [x] V + celá **SC** sú zelené (po T3: 22/22, 227/227; po fixe `a274d142`: 22/22, 246/246).
- [x] Browser 1366×768, 1024×768 a 390×844 na **nemigrovaných** draweroch:
  - Providers (`headerExtra` s Test connection, eyebrow v meta, legacy footer)
  - VMware (tabs, 3 badge, `bodyClassName`)
  - Audit (body sekcie)

  Skontrolovať:
  - Legacy footer delí Delete a Edit na polovice ako pred T3, nič sa neorezáva.
  - Resizer: na 390×844 handle nie je viditeľný ani dosiahnuteľný Tabom a šírka je 92vw. Na
    1024×768 a 1366×768 funguje myšou aj šípkami a `aria-valuenow` sedí so zmeranou šírkou.
  - Zúženie okna z 1366 na 1000 pri roztiahnutom draweri vráti šírku `min(420px,92vw)`.

  **Výsledok browser behu (2026-10-01, Edge cez CDP, dev server `localhost:5173` tohto repa):**

  | Drawer | Veľkosť | Výsledok |
  |---|---|---|
  | Providers | 1366×768 | šírka 420; handle viditeľný; ArrowLeft×2 → 452 = `aria-valuenow`; roztiahnuté na 580 a zúžené okno na 1000 → 420 a handle skrytý; legacy footer Delete 185px / Edit 183px (50/50); footer pripnutý (0px od spodku); bez overflow; Escape zavrie |
  | Providers | 1024×768 | šírka 420; handle aktívny, resize 452 = `aria-valuenow`; legacy footer 50/50; bez overflow |
  | Providers | 390×844 | šírka 359 (92vw); handle `display: none`; Shift+Tab z close → Edit (focus trap vynecháva skrytý handle); Tab cyklus ostáva v draweri a nikdy nepadne na handle; footer 154/152px; bez overflow |
  | VMware | 390×844, 1024×768 | šírka 359 / 420; handle skrytý / aktívny (resize 452 = `aria-valuenow`); 3 badge v `headerExtra`; bez overflow |

  - **Nájdená chyba (existovala pred T1):** pri VMware drawerovi Tab cyklus opustil drawer.
    Trap počítal roving `tabindex=-1` taby za posledný prvok. Opravené v `a274d142`
    (`fix: detail drawer focus trap ignores tabindex=-1 elements`) s unit testom.
  - **Nedokončené:** VMware 1366×768 (drawer sa v behu neotvoril) a Audit (riadok sa
    nenašiel). Beh bol prerušený (pozri blocker nižšie) a tieto drawery sa overia v Task 19.
  - **Blocker browser behu:** merania vyššie bežali v Edge na CDP porte 9222, ktorý patril
    **inej paralelnej session** (profil `454c7d31`). Po zistení som ho prestal ovládať a
    spustil vlastný Edge na porte 9333, ten však čaká na manuálny Keycloak login. Zvyšné
    browser checky (Checkpointy B–E a Task 19) sú **pending**, kým sa niekto neprihlási v okne
    „Sign in to aricoma“ (Edge s profilom `…/4c3e5949-…/scratchpad/edge-profile`).
  - **Vyriešené:** používateľ sa prihlásil v Edge na porte 9333; VMware 1366, Audit a všetky
    ostatné drawery sú overené v Task 19.
- [x] Review s človekom: na pokyn používateľa (2026-10-01) prebieha plán autonómne a review je
      vo finálnom reporte.

## Fáza 2: Referencia

### Task 4: Recovery Groups → Model C ✅

**Stav:** hotovo, commit `0468f329` (`feat: Recovery groups drawer uses Model C sections`).

**Cieľ:** Prvý consumer. Tabs nahradia tri `DetailDrawerSection`, header dostane meta riadok a
footer nové sloty.

**Súbory:**

- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx`
- `src/features/recovery-plans/recovery-groups/helpers/recoveryGroupOrchestrationState.ts` (nový,
  čistá funkcia)
- `src/features/recovery-plans/recovery-groups/helpers/recoveryGroupOrchestrationState.test.ts`
  (nový)
- L

**Akceptačné kritériá:**

- [x] Tabs a `detailTab` sú preč. Overview je otvorený, Orchestration a Inventory zatvorené,
      sekcie sú nezávislé a telo má `key={selected.id}`.
- [x] Meta a summary podľa plánu §5:
  - entity, status, resource „Provider unavailable“ badge
  - orchestration fakt a summary sekcie Orchestration podľa tabuľky stavov A, B, C0, C1, C, D,
    E1–E4
  - workload label, „VMs: N“, „Volumes: N“, „No resources“
- [x] „Not orchestrated“ a „Not configured“ sa zobrazia **iba** pri `pushToOrchestrator === false`
      (stav A).
  - Nekompletná orchestrácia (B), nedostupný orchestrátor (C) a chýbajúce run ID (D) majú
    vlastné texty.
  - Počas načítania alebo chyby providerov (C0, C1) sa fakt nezobrazí.
- [x] Mapovanie je čistá funkcia `getRecoveryGroupOrchestrationState`. Čítajú sa iba existujúce
      polia a existujúce `isLoading` a `isError` z `useGetPlatformProviders` a
      `useLatestOrchestratorRun`.
- [x] Žiadny nový query a žiadna zmena `enabled` ani parametrov. Viditeľnosť riadkov Latest
      run, Last executed, Duration a „View recovery runs →“ ostáva pod dnešnou podmienkou
      `isSelectedOrchestrated`.

  Žiadny natvrdo zapísaný text, všetko pochádza z existujúcich dát.
- [x] `footerStart` = Delete. `footer` = Edit so zachovaným disabled stavom, `title`,
      `aria-describedby` a sr-only hintom.
- [x] Nové kľúče sú v L:
  - `drawer.entity.recoveryGroup`, `drawer.resize`
  - `recoveryGroups.drawer.notOrchestrated`, `.notConfigured`, `.orchestrationIncomplete`
  - `recoveryGroups.drawer.orchestratorUnavailable`, `.noRunId`, `.lastRun`
  - `recoveryGroups.drawer.vmCount`, `.volumeCount`, `.noResources`
  - Existujúce kľúče sa znovu použijú: `recoveryRuns.table.noRuns`,
    `pages.recoveryGroups.providerUnavailable`.
- [x] `drawer.selectedRecoveryGroup` je zmazaný, ak osirie.
- [x] Žiadna zmena query, routing, dátového modelu ani orchestration logiky.

**Testy:**

- Upraviť 5 testov z tab kliku na klik na sekciu (Orchestration je predvolene zatvorená).
- **Unit, `recoveryGroupOrchestrationState.test.ts`, stavová matica:**

  | Stav | Vstup | Očakávaný stav |
  |---|---|---|
  | A | `pushToOrchestrator=false` (s providerId aj run ID aj bez nich) | `A` |
  | B | push, bez providerId | `B` |
  | C0 | push + providerId, providers `isLoading` | `C0` |
  | C1 | push + providerId, providers `isError` | `C1` |
  | C | push + providerId, provider sa v zozname nenájde | `C` |
  | D | provider nájdený, bez run ID | `D` |
  | E1 | provider + run ID, latest run `isLoading` | `E1` |
  | E2 | provider + run ID, latest run `error` | `E2` |
  | E3 | provider + run ID, `latestRun === null` | `E3` |
  | E4 | provider + run ID, `latestRun` | `E4` so status a duration |

- **Render, `RecoveryGroupsTable.test.tsx`:**
  - tab neexistuje, default open stavy (Overview true, Orchestration a Inventory false), toggling
  - summary: vm, volume, 0 resources
  - Orchestration summary a meta fakt pre A („Not configured“ / „Not orchestrated“), B, C, D, E3
    a E4
  - **žiadny stav okrem A** neukáže „Not orchestrated“ ani „Not configured“
  - Draft badge, unresolved resource provider badge a disabled Edit s hintom
  - inventory sa mountne až po otvorení
  - navigácia na recovery runs, footer poradie (Delete v ľavej skupine)
  - close, reset sekcií po výbere iného záznamu
- V + `RecoveryGroupInventory.test.tsx` + `recoveryGroupOrchestrationState.test.ts`.

**Výsledok verifikácie (commit `0468f329`):**

- `RecoveryGroupsTable.test.tsx` 38/38 (18 nových Model C testov), `recoveryGroupOrchestrationState.test.ts`
  10/10, `RecoveryGroupInventory.test.tsx` zelený, locale testy 4/4.
- eslint, tsc a `git diff --check` OK.
- Render test pokrýva E1. E2 (chyba latest run) pokrýva unit test, lebo meta pri E1 aj E2 iba
  vynechá fakt.

**Závislosti:** T1–T3. **Rozsah / riziko:** M / stredné. **Commit:**
`feat: Recovery groups drawer uses Model C sections`.

### Task 5 (voliteľný, iba so súhlasom): shared `HelpPopover` + relation help ⏭️

**Stav:** preskočené ako voliteľné (pokyn používateľa 2026-10-01). Model C funguje bez neho.

**Cieľ:** Preniesť `HelpPopover` a `RecoveryGroupRelationHelp` z prototypu `3eb0fd0a` do
`headerActions` Recovery Groups.

**Súbory:**

- `src/shared/components/help-popover/HelpPopover.tsx` + test
- `src/shared/icons/Icons.tsx` (`HelpIcon`)
- `RecoveryGroupRelationHelp.tsx`
- `RecoveryGroupsTable.tsx`
- L

**Akceptačné kritériá:**

- [ ] Popover sa otvára kliknutím.
- [ ] Escape zavrie iba popover a nie drawer, focus sa vráti na otáznik a klik mimo popover
      zavrie.
- [ ] Texty sú v L.

**Testy:** HelpPopover (otvorenie, zatvorenie, outside click, Escape nezavrie drawer) + jeden
test v RecoveryGroupsTable. V.

**Závislosti:** T4. **Rozsah / riziko:** M / nízke. **Commit:**
`feat: relation help in the recovery group drawer`.

## Checkpoint B: referencia ✅

- [x] V + celá **SC** (+ `DetailDrawerSection` a stavový unit test): 24/24 súborov, 266/266 testov.
- [x] Browser matica (390×844, 1024×768, 1366×768, 1920×1080) na Recovery Groups:
  - šírka a resize: na 390×844 handle chýba a šírka je 92vw; od 1024×768 funguje myšou aj
    šípkami
  - sekcie a sticky hlavičky, pinned footer (Delete vľavo, Edit vpravo, zalomenie na 390)
  - dlhý názov skupiny, dlhé provider ID
  - Draft, unresolved provider
  - orchestračné stavy, ktoré dáta umožnia: A, B, C, D a E (run existuje alebo žiadne runy)
  - inventory obsah, dark mode
  **Browser:** overené vo finálnej matici Task 19 (OK).
- [x] Review s človekom: presunuté do finálneho reportu (autonómny režim). Otvorené otázky 1–5
      ostávajú podľa odporúčaní plánu: hodnota vľavo, riadok Status ostáva, Task 5 preskočený,
      mobil 92vw, run fakt = dĺžka behu.

## Fáza 3: Rollout

Spoločné kritériá pre T6–T17, platia ku kritériám jednotlivých taskov:

- [x] `eyebrow` → prvá `meta` položka s typom objektu, nový kľúč `<feature>.drawer.entity` v L.
      Starý kľúč sa zmaže, ak osirie.
- [x] Badge z `headerExtra` → `meta`, tlačidlá a odkazy → `headerActions`. `headerExtra` už
      nepoužívať.
- [x] Footer: `footerStart` = Delete, `footer` = ostatné, bez `flex-1`.
- [x] Odovzdať `resizeLabel={t('drawer.resize')}`, ak je drawer resizable.
- [x] Asercie naviazané na štruktúru upraviť v tom istom commite. Žiadny test sa nemaže bez
      náhrady.

### Task 6: Recovery Applications ✅

**Stav:** hotovo, commit `9f2912ea` (`feat: Recovery apps drawer uses Model C sections`). Verifikácia: RecoveryApplicationsTable 18/18 (5 nových), RecoveryApplicationInventory zelený. Pred T6 refactor `860447f1` presunul texty stavov A–E do helpera, aby ich T6 nekopíroval. eslint, tsc a `git diff --check` OK.

**Súbory:** `recovery-applications/components/RecoveryApplicationsTable.tsx` + test, L.

**Akceptačné kritériá:**

- [x] Tabs → sekcie:
  - Overview (open, summary platform)
  - Orchestration (closed, summary podľa stavovej tabuľky A–E z plánu §5 nad poľami aplikácie;
    ak sa polia aplikácie líšia, rozšíriť mapovanie v tomto tasku, nie kopírovať)
  - Inventory (closed, `flush`, „Tiers: N“)
- [x] Meta: entity • status • orchestration fakt (stavy A–E ako T4, „Not orchestrated“ iba pri
      A).
- [x] Delete a Edit sa zobrazia iba pri dostupných handleroch (bez zmeny).

**Testy:** tab → sekcia (:270, :288), summary, meta. V + `RecoveryApplicationInventory.test.tsx`.

**Závislosti:** T4. **Rozsah:** M. **Commit:** `feat: Recovery apps drawer uses Model C sections`.

### Task 7: Platform Providers ✅

**Stav:** hotovo, commit `8e11fc87` (`feat: Platform providers drawer uses Model C header`). Verifikácia: PlatformProvidersTable 18/18 (3 nové; SMTP trieda z :119-125 nezmenená). eslint, tsc a `git diff --check` OK.

**Súbory:** `platform-providers/components/PlatformProvidersTable.tsx` + test, L.

**Akceptačné kritériá:**

- [x] Meta: entity • type badge • credential status (AIRFLOW a KEYCLOAK).
- [x] SMTP tlačidlo → `headerActions` (outline/sm, trieda z testu :119-125 ostáva).
- [x] Subtitle = mono id.
- [x] Bez sekcií.

**Testy:** existujúce + nová kontrola meta. V.

**Závislosti:** Checkpoint B. **Rozsah:** S. **Commit:** `feat: Platform providers drawer uses Model C header`.

### Task 8: Providers + Credentials ✅

**Stav:** hotovo, commit `df83e506` (`feat: Providers and Credentials drawers use Model C header`). Verifikácia: ProvidersCatalogueTable + CredentialsTable 20/20; Test connection triedy (:278), disabled stav a hint nezmenené. Osirelé `drawer.selectedProvider` a `credentials.detail.eyebrow` zmazané. eslint, tsc a `git diff --check` OK.

**Súbory:**

- `providers/components/ProvidersCatalogueTable.tsx` + test
- `credentials/components/CredentialsTable.tsx` + test
- L

**Akceptačné kritériá:**

- [x] Providers: Test connection → `headerActions` (triedy z :278, disabled stav a sr-only hint
      ostávajú), meta: entity • role • credential status.
- [x] Credentials: meta entity, subtitle id.

**Testy:** V.

**Závislosti:** T7. **Rozsah:** M. **Commit:** `feat: Providers and Credentials drawers use Model C header`.

### Task 9: Users + Application roles ✅

**Stav:** hotovo, commit `34f785d9` (`feat: Identity users and roles drawers use Model C header`). Verifikácia: UsersSection + RealmRolesSection 27/27; „only close button“ asercie ostávajú pravdivé. eslint, tsc a `git diff --check` OK.

**Súbory:** `identity-access/components/UsersSection.tsx` + test, `RealmRolesSection.tsx` + test, L.

**Akceptačné kritériá:**

- [x] Meta: entity • status badge (Users), entity • clientId badge (Roles).
- [x] Eyebrow asercie (:140, :143) prejdú na meta text.
- [x] „Only close button“ (:181, :182) ostáva pravdou.

**Testy:** V.

**Závislosti:** T7. **Rozsah:** M. **Commit:** `feat: Identity users and roles drawers use Model C header`.

### Task 10: Clients ✅

**Stav:** hotovo, commit `1137f78b` (`feat: Identity clients drawer uses Model C header`). Verifikácia: ClientsSection 16/16. eslint, tsc a `git diff --check` OK.

**Súbory:** `identity-access/components/ClientsSection.tsx` + test, L.

**Akceptačné kritériá:**

- [x] Meta: entity • status • preview badge.
- [x] Asercie :201 (eyebrow), :278 (no tabs) a :279 (only button) ostávajú zelené.
- [x] Skeleton riadky s `aria-busy` fungujú.

**Testy:** V.

**Závislosti:** T9. **Rozsah:** S. **Commit:** `feat: Identity clients drawer uses Model C header`.

### Task 11: Audit ✅

**Stav:** hotovo, commit `67680e2e` (`feat: Access log drawer uses Model C sections`). Verifikácia: Audit 36/36. Odchýlka: telá požiadavky a odpovede používajú bežný padding sekcie (nie `flush`), lebo `<pre>` potrebuje okraj; raw záznam je jediná sekcia a je preto predvolene otvorený. eslint, tsc a `git diff --check` OK.

**Súbory:** `audit/components/AccessLogDetailDrawer.tsx`, `AccessLogsTable.test.tsx`,
`audit/pages/AuditPage.test.tsx`, L.

**Akceptačné kritériá:**

- [x] Sekcie:
  - Request (open, summary method · status)
  - Request body, Response body, Raw entry (closed, `flush`, `<pre>` ostáva)
- [x] Meta: entity • status code.
- [x] cs asercie (:151–156) sú upravené na meta.

**Testy:** sekcie sa otvárajú a body sa mountnú až po otvorení. V.

**Závislosti:** T4. **Rozsah:** M. **Commit:** `feat: Access log drawer uses Model C sections`.

## Checkpoint C

- [x] V + celá **SC**. (po T11: 24/24 súborov, 278/278 testov)
- [x] Browser 1366×768 a 390×844: Platform providers, Providers (Test connection v
      `headerActions` s dlhým názvom), Credentials, Users, Roles, Clients, Audit.
      Overené vo finálnej matici Task 19 (OK).
- [x] Grep brána po T11: zostávali `eyebrow=` v IBM Power, FlashSystem, VMware, Policy sets,
      3× Recovery policies, Run history a Recovery actions history; `headerExtra=` v VMware,
      Snapshot, App recovery, Clean room, Run history a Recovery actions history.

### Task 12: IBM Power ✅

**Stav:** hotovo, commit `3e05c935` (`feat: IBM Power drawer uses shared sections`). Verifikácia: IBM Power 5/5. Lokálny helper sa volá `PartitionSection` a iba obaľuje shared `DetailDrawerSection` (skrýva prázdne riadky a sekcie). eslint, tsc a `git diff --check` OK.

**Súbory:** `ibm-power/IbmPowerDetailPanel.tsx`, `PowerInventoryView.tsx` (labels),
`PowerInventoryView.test.tsx`, L.

**Akceptačné kritériá:**

- [x] Lokálny `DetailSection` je zmazaný a nahradený `DetailDrawerSection`. Všetkých 5 sekcií
      je predvolene otvorených.
- [x] Skrývanie riadkov s hodnotou „-“ ostáva.
- [x] Prázdny `subtitle=""` je preč.

**Testy:** :110–120, :172, :176. V.

**Závislosti:** T4. **Rozsah:** M. **Commit:** `feat: IBM Power drawer uses shared sections`.

### Task 13: FlashSystem ✅

**Stav:** hotovo, commit `8eb60e9a` (`feat: FlashSystem volume drawer uses shared sections`). Verifikácia: FlashSystem 11/11; :189-197 naviazané na `region` a `term`, zbalené sekcie test otvára helperom `expandAll`. Sekcie sa pri zmene zväzku resetujú (`key={volume.id}`), CG chips zarovnané vľavo ako hodnota riadku. eslint, tsc a `git diff --check` OK.

**Súbory:** `flash-system/FlashSystemVolumeDetailPanel.tsx`, `FlashSystemInventoryView.tsx`
(labels), `FlashSystemInventoryView.test.tsx`, L.

**Akceptačné kritériá:**

- [x] 4 skupiny polí a pool → sekcie, prvé dve otvorené.
- [x] CG chip zoznam ostáva.

**Testy:** :189–197 naviazať na nový markup (`within(region)`). V.

**Závislosti:** T12. **Rozsah:** M. **Commit:** `feat: FlashSystem volume drawer uses shared sections`.

### Task 14: VMware ✅

**Stav:** hotovo, commit `f33bb5ed` (`feat: VMware VM drawer uses Model C sections`). Verifikácia: VMware 32/32 + VmwareResourcesPage 5/5. Sticky `TableHeader` je v `overflow-x-auto` kontajneri, ktorý vertikálne nescrolluje, takže s hlavičkou sekcie nekoliduje (R5). `useVdisksByVm` beží s panelom ako predtým (R4). `bodyClassName` už VMware nepoužíva. Osirelý `drawer.vmSections` zmazaný. eslint, tsc a `git diff --check` OK.

**Súbory:**

- `vmware/VirtualMachineDetailPanel.tsx` + test
- `VmwareResourcesPage.test.tsx`
- L

**Akceptačné kritériá:**

- [x] Tabs → sekcie:
  - Overview (open; `DetailStat` a tagy ostávajú)
  - Disks (closed, `flush`, „Disks: N“)
  - Backing storage info (closed, `flush`)
- [x] 3 status badge → `meta`. Subtitle hostname/IP.
- [x] `bodyClassName="flex flex-col overflow-hidden"` je preč a scroll rieši shared telo.
- [x] Sticky `TableHeader` v Disks nekoliduje s hlavičkou sekcie (R5, rozhodnúť v browseri).
- [x] Fetchovanie disks a snapshots sa spúšťa rovnako ako pri tabs (R4).

**Testy:** tab „Backing storage info“ (:110, :133, :160, :186, :247) → sekcia; šírky resize
(:256–288, od T1 cez `--detail-drawer-width`) ostávajú. V.

**Závislosti:** T12. **Rozsah:** M / stredné riziko. **Commit:**
`feat: VMware VM drawer uses Model C sections`.

## Checkpoint D

- [x] V + celá **SC**. (po T14: 24/24 súborov, 279/279 testov)
- [x] Browser matica (4 veľkosti) na VMware, FlashSystem a IBM Power:
  - sticky hlavičky a tabuľky
  - 3 badge v meta
  - dlhé hostname a ID
  - pinned footer (ak nie je, telo ide až dole)
  - dark mode
  Overené vo finálnej matici Task 19 (OK).

### Task 15: Policy sets + Snapshot policies ✅

**Stav:** hotovo, commit `1f736ece` (`feat: Policy set and snapshot policy drawers use Model C header`). Verifikácia: PolicySetsTable + Snapshot 29/29. eslint, tsc a `git diff --check` OK.

**Súbory:** `policy-sets/components/PolicySetsTable.tsx` + test,
`recovery-policies/snapshot/components/SnapshotPoliciesTable.tsx` + test, L.

**Akceptačné kritériá:**

- [x] Meta: entity (Policy sets), entity • level badge (Snapshot).
- [x] Subtitle id. Nové footer sloty.

**Testy:** V.

**Závislosti:** Checkpoint D. **Rozsah:** M. **Commit:**
`feat: Policy set and snapshot policy drawers use Model C header`.

### Task 16: App recovery + Clean room policies ✅

**Stav:** hotovo, commit `658a0c1d` (`feat: App recovery and clean room policy drawers use Model C header`). Verifikácia: Recovery policies 53/53. eslint, tsc a `git diff --check` OK.

**Súbory:** `recovery-policies/application-recovery/components/RecoveryAppPoliciesTable.tsx` + test,
`recovery-policies/clean-room/components/CleanRoomPoliciesTable.tsx` + test, L.

**Akceptačné kritériá:**

- [x] Meta: entity • level badge, alebo entity • enabled badge.
- [x] Nové footer sloty.

**Testy:** V.

**Závislosti:** T15. **Rozsah:** M. **Commit:**
`feat: App recovery and clean room policy drawers use Model C header`.

### Task 17: Recovery runs history, Recovery actions history, Metro mirror review ✅

**Stav:** hotovo, commit `4d36eee4` (`feat: Run and action history drawers use Model C header`). Verifikácia: RecoveryRunHistoryDrawer + Recovery actions (nový `RecoveryActionsHistoryPage.test.tsx`) + MetroMirror 15/15. Metro mirror review nemal prechodné props, preto bez zmeny. eslint, tsc a `git diff --check` OK.

**Súbory:**

- `recovery-runs/components/RecoveryRunHistoryDrawer.tsx` + test
- `recovery-actions/pages/RecoveryActionsHistoryPage.tsx` (import cez `data-table` index)
- `recovery-groups/components/RecoveryGroupMetroMirrorFields.tsx` (bez vizuálnej zmeny okrem
  shellu)
- L

**Akceptačné kritériá:**

- [x] Runs: Airflow link → `headerActions`, meta entity, subtitle id.
- [x] Actions history: meta entity • status, subtitle dátum.
- [x] Portál a `parentElement === document.body` pri Metro mirror ostávajú.
- [x] Pribudne render test drawera Recovery actions history (dnes nemá test).

**Testy:** V + `RecoveryGroupMetroMirrorFields.test.tsx`.

**Závislosti:** T16. **Rozsah:** M. **Commit:**
`feat: Run and action history drawers use Model C header`.

## Checkpoint E

- [x] V + celá **SC**. (po T17: 25/25 súborov, 280/280 testov)
- [x] Grep brána je **prázdna pre `DetailDrawer`**:
      `rg -n "eyebrow=|headerExtra=" src --glob "*.tsx" --glob "!*.test.tsx"`. Zostali iba 4
      `eyebrow=` na `IdentityResourceDetailPage` (UserFederation, Organizations,
      IdentityProviders, ClientScopes). To je stránka, nie drawer, a je mimo scope.
- [x] Žiadny drawer nepoužíva `Tabs`: žiadny súbor s `<DetailDrawer` neimportuje `tabs/Tabs`.

## Fáza 4: Cleanup

### Task 18: Odstrániť prechodné API ✅

**Stav:** hotovo, commit `8dcb48b0` (`refactor: remove transitional detail drawer props`).
`eyebrow`, `headerExtra` a nepoužívaný `bodyClassName` sú preč; `tsc` prešiel bez úprav
consumerov. Test `headerExtra` aj test prechodného `eyebrow` sú zmazané (`headerActions` test
existuje od T1). Osirelé kľúče: všetkých 18 kľúčov eyebrow/selected odstránených počas rolloutu
plus `drawer.selectedVm`, ktorý bol mŕtvy už pred Model C. Všetkých 31 nových kľúčov sa
používa a en/cs/sk majú zhodnú sadu. Verifikácia: SC 27/27 súborov, 282/282 testov; eslint,
tsc a `git diff --check` OK.

**Súbory:**

- `src/shared/components/data-table/DetailDrawer.tsx` + test
- L (osirelé `*.drawer.eyebrow` a `drawer.selected*`)
- prípadne zvyšní consumeri, ktorých nájde `tsc`

**Akceptačné kritériá:**

- [x] `eyebrow` a `headerExtra` sú zmazané z `DetailDrawerProps` aj z renderovania a prechodné
      komentáre sú preč.
- [x] `bodyClassName` je zmazaný, iba ak `rg "bodyClassName=" src` nič nenájde.
- [x] Test `headerExtra` (:27) je nahradený testom `headerActions`.
- [x] `tsc` prejde, čím je dokázané, že žiadny consumer nezostal.
- [x] Žiadny locale kľúč nie je osirelý (grep každého zmazaného kľúča).

**Testy:** V + celá **SC**.

**Závislosti:** Checkpoint E. **Rozsah:** S / nízke. **Commit:**
`refactor: remove transitional detail drawer props`.

### Task 19: Záverečná browser matica ✅

**Stav:** hotovo na finálnom kóde (HEAD po `8dcb48b0`), 2026-10-01. Edge s vlastným profilom na
CDP porte 9333, dev server `localhost:5173` tohto repa, prihlásenie Keycloak manuálne používateľom.
Skripty: scratchpad session `4c3e5949-…` (`checkpoint.mjs`, `matrix.sh`).

| Drawer | Veľkosti | Téma | Výsledok |
|---|---|---|---|
| Recovery groups | 390, 1024, 1366, 1920 (+ dlhý obsah) | light, dark (1366) | OK: Overview/Orchestration/Inventory, sticky hlavičky, meta „Recovery group • Active • Last run: success · 8s“, Delete vľavo / Edit vpravo |
| Recovery apps | – | – | **neoverené v browseri:** prostredie nemá žiadnu recovery app (prázdna tabuľka); kryté testami |
| Platform providers | 390, 1024, 1366, 1920 (+ dlhý obsah) | light | OK |
| Providers | 390, 1024, 1366, 1920 (+ dlhý obsah) | light, dark (1366) | OK: Test connection v title row aj pri dlhom názve, 3 badge v meta |
| Credentials | 390, 1366 | light | OK |
| Users, Clients, Application roles | 390, 1366 | light | OK, bez footera |
| Audit | 390, 1366 (rozbalené), 1366 | light, dark | OK: Request/Request body/Response body |
| VMware | 390, 1024, 1366, 1920 (+ dlhý obsah), 1366 rozbalené | light, dark | OK: 3 badge, Disks tabuľka bez kolízie sticky hlavičiek |
| FlashSystem | 390, 1366 (rozbalené) | light | OK, 5 sekcií |
| IBM Power | 390, 1366 | light | OK, sekcie s dátami (prázdne skryté) |
| Policy sets, Snapshot, App recovery, Clean room | 390, 1366 | light | OK |
| Run history, Recovery actions history | 390, 1366 | light | OK, neresizable (bez handle) |
| Metro mirror review | – | – | bez zmeny kódu, v browseri neoverované |

Kontroly v každej kombinácii (49 kombinácií, 0 nálezov):

- šírka 359 px pri 390, inak 420; handle skrytý pod `lg`, aktívny od 1024
- ArrowLeft×2 → 452 = `aria-valuenow`; roztiahnuté na 580 a zúžené okno na 1000 → 420 a skrytý
  handle (1366)
- Tab cyklus ostáva v draweri a pod `lg` nikdy nepadne na handle; Shift+Tab z close zabalí
  na posledný prvok
- Escape zatvorí; footer pripnutý (0 px); bez horizontálneho scrollu stránky, tela, headera
  a footera
- dlhý názov sa skráti a close ostane v draweri; dlhé ID sa zalomí
- Nájdené chyby: počas Checkpointu A bola nájdená a opravená chyba focus trapu s
  `tabindex=-1` (`a274d142`). Vo finálnej matici žiadne.

**Súbory:** iba `tasks/detail-drawer-model-c-todo.md` (zápis výsledkov).

**Akceptačné kritériá:**

- [x] Všetkých 19 drawerov v 4 veľkostiach a v light aj dark mode.
- [x] Skontrolovať:
  - šírka a resize handle
  - overflow a orezanie, pinned footer
  - sekcie a sticky hlavičky
  - dlhé názvy a ID, viac badge
  - inventory, mobil
- [x] Nájdené chyby sú opravené v samostatných commitoch alebo zapísané ako issue.

**Závislosti:** T18. **Commit:** `docs: detail drawer Model C browser matrix`.

## Checkpoint F: hotovo

- [x] Všetky akceptačné kritériá sú splnené. Otvorené otázky uzavreté podľa odporúčaní plánu
      (Checkpoint B). Výnimka: Recovery apps a Metro mirror review nie sú overené v browseri
      (bez dát / bez zmeny).
- [x] Jeden shell, jedna sekcia, jeden riadok, žiadny prechodný prop.
- [x] Finálna verifikácia: `npm run build` exit 0 (ESLint celé repo, `tsc -b`, celá suita
      281/281 súborov a 1564/1564 testov, `api:check`, `vite build`). Samostatný beh celej
      suity mal 1 zlyhanie v `RecoveryPolicyPageShell.test.tsx`, ktoré spôsobili rozpracované
      zmeny paralelnej session (`354e58d0`). Na HEAD test prechádza.
- [ ] Review s človekom (finálny report).
