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

### Task 1: `DetailDrawer` header shell a API

**Cieľ:** Nový header (nadpis, meta riadok, subtitle, header akcie, ikonové zatvorenie) a
lokalizovateľný resizer. Prechodné `eyebrow` a `headerExtra` ostávajú funkčné.

**Súbory:**

- `src/shared/components/data-table/DetailDrawer.tsx`
- `src/shared/components/data-table/DetailDrawer.test.tsx`
- `src/shared/icons/Icons.tsx` (+ `CloseIcon`)
- `src/shared/hooks/useResizablePanel.ts` (+ voliteľné `resizeLabel`, default „Resize panel“)
- `src/shared/hooks/useResizablePanel.test.ts`

**Akceptačné kritériá:**

- [ ] Props `meta`, `subtitle`, `headerActions` a `resizeLabel` fungujú podľa plánu (§1 a
      vizuálne pravidlá).
- [ ] Zatvorenie je `CloseIcon` bez rámika a s `aria-label={closeLabel}`.
- [ ] `eyebrow` sa renderuje ako prvá meta položka a `headerExtra` pod meta. Oba majú komentár
      `// Transitional (detail-drawer-model-c): removed in Task 18.` a **nemajú** JSDoc
      `@deprecated`.
- [ ] Focus trap, Escape, restore focus, `inert`, resize a reset šírky sú bez zmeny.
      Existujúce testy sú zelené bez úprav.

**Testy:**

- Nové: meta poradie a falsy položky, `aria-hidden` oddeľovače, subtitle, eyebrow ako meta,
  `headerActions` v riadku nadpisu a vo focus trape, klik na backdrop, `resizeLabel`.
- V + celá **SC**.

**Závislosti:** žiadne. **Rozsah / riziko:** M / vysoké (R1). **Commit:**
`feat: Model C header for the shared detail drawer`.

### Task 2: `DetailDrawerSection`

**Cieľ:** Shared rozbaľovacia sekcia v controlled aj uncontrolled režime, bez zmeny consumerov.

**Súbory:**

- `src/shared/components/data-table/DetailDrawerSection.tsx` (nový)
- `src/shared/components/data-table/DetailDrawerSection.test.tsx` (nový)
- `src/shared/components/data-table/index.ts` (export)

**Akceptačné kritériá:**

- [ ] API podľa plánu §2, `defaultOpen = false`, zbalený obsah sa unmountne, podporuje `flush`.
- [ ] Markup podľa plánu:
  - `h3 > button` s `aria-expanded` a `aria-controls` (iba keď je otvorená)
  - `aria-labelledby` = title, `aria-describedby` = summary
  - panel s `role="region"`
- [ ] Hlavička je sticky, chevron sa otáča s `motion-reduce:transition-none` a focus ring je
      `ring-inset`.

**Testy:**

- Nové: collapsed a expanded, `aria-expanded`, Enter a Space, summary a badge, prístupné meno
  iba title, `flush`, uncontrolled `defaultOpen` + `onToggle`, controlled `open` + `onToggle`,
  viac otvorených naraz.
- V.

**Závislosti:** T1 (`ChevronRightIcon` už existuje, závislosť je iba poradie commitov).
**Rozsah / riziko:** S / nízke. **Commit:** `feat: shared DetailDrawerSection`.

### Task 3: `DetailRow` restyle a footer

**Cieľ:** Ľahší riadok vhodný do sekcií a footer so slotmi `footerStart` a `footer`.

**Súbory:**

- `src/shared/components/data-table/DetailDrawer.tsx`
- `src/shared/components/data-table/DetailDrawer.test.tsx`

**Akceptačné kritériá:**

- [ ] `DetailRow` je grid `minmax(7rem,35%) / 1fr`, `py-2`, bez `border-b`, `dd` s
      `wrap-anywhere`, zachováva `div > dt + dd`.
- [ ] Footer je `flex flex-wrap px-5 py-3`. `footerStart` je vľavo (`mr-auto`) a `footer`
      vpravo. Footer sa nerenderuje, keď chýbajú oba sloty.
- [ ] Starí consumeri s `flex-1` tlačidlami v `footer` vyzerajú ako predtým.

**Testy:**

- Nové: poradie `footerStart` pred `footer`, absencia footera, `secondary` text v riadku.
- V + celá **SC** (FlashSystem `closest('div')` a `nextElementSibling` musia prejsť bez úprav).

**Závislosti:** T1. **Rozsah / riziko:** S / stredné (R1, R6). **Commit:**
`feat: lighter DetailRow and split footer slots`.

## Checkpoint A: shared základ

- [ ] V + celá **SC** sú zelené.
- [ ] Browser 1366×768 a 390×844 na **nemigrovaných** draweroch:
  - Providers (`headerExtra` s Test connection, eyebrow v meta)
  - VMware (tabs, 3 badge, `bodyClassName`)
  - Audit (body sekcie)

  Nič sa neorezáva a footer vyzerá ako predtým.
- [ ] Review s človekom (vizuál headera a riadkov) pred T4.

## Fáza 2: Referencia

### Task 4: Recovery Groups → Model C

**Cieľ:** Prvý consumer. Tabs nahradia tri `DetailDrawerSection`, header dostane meta riadok a
footer nové sloty.

**Súbory:**

- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx`
- L

**Akceptačné kritériá:**

- [ ] Tabs a `detailTab` sú preč. Overview je otvorený, Orchestration a Inventory zatvorené,
      sekcie sú nezávislé a telo má `key={selected.id}`.
- [ ] Meta a summary podľa plánu §5:
  - entity, status, provider unavailable
  - run fakt vo všetkých 5 stavoch
  - workload label, provider name alebo „Not configured“
  - „VMs: N“, „Volumes: N“, „No resources“

  Žiadny natvrdo zapísaný text, všetko pochádza z existujúcich dát.
- [ ] `footerStart` = Delete. `footer` = Edit so zachovaným disabled stavom, `title`,
      `aria-describedby` a sr-only hintom.
- [ ] Nové kľúče sú v L:
  - `drawer.entity.recoveryGroup`, `drawer.resize`
  - `recoveryGroups.drawer.notOrchestrated`, `.notConfigured`, `.lastRun`
  - `recoveryGroups.drawer.vmCount`, `.volumeCount`, `.noResources`
- [ ] `drawer.selectedRecoveryGroup` je zmazaný, ak osirie.
- [ ] Žiadna zmena query, routing, dátového modelu ani orchestration logiky.

**Testy:**

- Upraviť 5 testov z tab kliku na klik na sekciu.
- Nové:
  - tab neexistuje, default open stavy, toggling
  - summary (vm, volume, 0, orchestrated alebo nie)
  - meta run fakt (loading, error, no run, run), Draft, unresolved
  - inventory sa mountne až po otvorení
  - navigácia na recovery runs, footer poradie, close, reset sekcií po výbere iného záznamu
- V + `RecoveryGroupInventory.test.tsx`.

**Závislosti:** T1–T3. **Rozsah / riziko:** M / stredné. **Commit:**
`feat: Recovery groups drawer uses Model C sections`.

### Task 5 (voliteľný, iba so súhlasom): shared `HelpPopover` + relation help

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

## Checkpoint B: referencia

- [ ] V + celá **SC**.
- [ ] Browser matica (390×844, 1024×768, 1366×768, 1920×1080) na Recovery Groups:
  - šírka a resize (myš aj šípky)
  - sekcie a sticky hlavičky, pinned footer
  - dlhý názov skupiny, dlhé provider ID
  - Draft, unresolved provider, orchestrated aj neorchestrovaná skupina
  - inventory obsah, dark mode
- [ ] Review s človekom. Odpovede na otvorené otázky 1–5 zapísať do plánu pred T6.

## Fáza 3: Rollout

Spoločné kritériá pre T6–T17, platia ku kritériám jednotlivých taskov:

- [ ] `eyebrow` → prvá `meta` položka s typom objektu, nový kľúč `<feature>.drawer.entity` v L.
      Starý kľúč sa zmaže, ak osirie.
- [ ] Badge z `headerExtra` → `meta`, tlačidlá a odkazy → `headerActions`. `headerExtra` už
      nepoužívať.
- [ ] Footer: `footerStart` = Delete, `footer` = ostatné, bez `flex-1`.
- [ ] Odovzdať `resizeLabel={t('drawer.resize')}`, ak je drawer resizable.
- [ ] Asercie naviazané na štruktúru upraviť v tom istom commite. Žiadny test sa nemaže bez
      náhrady.

### Task 6: Recovery Applications

**Súbory:** `recovery-applications/components/RecoveryApplicationsTable.tsx` + test, L.

**Akceptačné kritériá:**

- [ ] Tabs → sekcie:
  - Overview (open, summary platform)
  - Orchestration (closed, provider alebo „Not configured“)
  - Inventory (closed, `flush`, „Tiers: N“)
- [ ] Meta: entity • status • run fakt (ako T4).
- [ ] Delete a Edit sa zobrazia iba pri dostupných handleroch (bez zmeny).

**Testy:** tab → sekcia (:270, :288), summary, meta. V + `RecoveryApplicationInventory.test.tsx`.

**Závislosti:** T4. **Rozsah:** M. **Commit:** `feat: Recovery apps drawer uses Model C sections`.

### Task 7: Platform Providers

**Súbory:** `platform-providers/components/PlatformProvidersTable.tsx` + test, L.

**Akceptačné kritériá:**

- [ ] Meta: entity • type badge • credential status (AIRFLOW a KEYCLOAK).
- [ ] SMTP tlačidlo → `headerActions` (outline/sm, trieda z testu :119-125 ostáva).
- [ ] Subtitle = mono id.
- [ ] Bez sekcií.

**Testy:** existujúce + nová kontrola meta. V.

**Závislosti:** Checkpoint B. **Rozsah:** S. **Commit:** `feat: Platform providers drawer uses Model C header`.

### Task 8: Providers + Credentials

**Súbory:**

- `providers/components/ProvidersCatalogueTable.tsx` + test
- `credentials/components/CredentialsTable.tsx` + test
- L

**Akceptačné kritériá:**

- [ ] Providers: Test connection → `headerActions` (triedy z :278, disabled stav a sr-only hint
      ostávajú), meta: entity • role • credential status.
- [ ] Credentials: meta entity, subtitle id.

**Testy:** V.

**Závislosti:** T7. **Rozsah:** M. **Commit:** `feat: Providers and Credentials drawers use Model C header`.

### Task 9: Users + Application roles

**Súbory:** `identity-access/components/UsersSection.tsx` + test, `RealmRolesSection.tsx` + test, L.

**Akceptačné kritériá:**

- [ ] Meta: entity • status badge (Users), entity • clientId badge (Roles).
- [ ] Eyebrow asercie (:140, :143) prejdú na meta text.
- [ ] „Only close button“ (:181, :182) ostáva pravdou.

**Testy:** V.

**Závislosti:** T7. **Rozsah:** M. **Commit:** `feat: Identity users and roles drawers use Model C header`.

### Task 10: Clients

**Súbory:** `identity-access/components/ClientsSection.tsx` + test, L.

**Akceptačné kritériá:**

- [ ] Meta: entity • status • preview badge.
- [ ] Asercie :201 (eyebrow), :278 (no tabs) a :279 (only button) ostávajú zelené.
- [ ] Skeleton riadky s `aria-busy` fungujú.

**Testy:** V.

**Závislosti:** T9. **Rozsah:** S. **Commit:** `feat: Identity clients drawer uses Model C header`.

### Task 11: Audit

**Súbory:** `audit/components/AccessLogDetailDrawer.tsx`, `AccessLogsTable.test.tsx`,
`audit/pages/AuditPage.test.tsx`, L.

**Akceptačné kritériá:**

- [ ] Sekcie:
  - Request (open, summary method · status)
  - Request body, Response body, Raw entry (closed, `flush`, `<pre>` ostáva)
- [ ] Meta: entity • status code.
- [ ] cs asercie (:151–156) sú upravené na meta.

**Testy:** sekcie sa otvárajú a body sa mountnú až po otvorení. V.

**Závislosti:** T4. **Rozsah:** M. **Commit:** `feat: Access log drawer uses Model C sections`.

## Checkpoint C

- [ ] V + celá **SC**.
- [ ] Browser 1366×768 a 390×844: Platform providers, Providers (Test connection v
      `headerActions` s dlhým názvom), Credentials, Users, Roles, Clients, Audit.
- [ ] Grep brána: zoznam zostávajúcich `eyebrow=` a `headerExtra=` zapísaný sem.

### Task 12: IBM Power

**Súbory:** `ibm-power/IbmPowerDetailPanel.tsx`, `PowerInventoryView.tsx` (labels),
`PowerInventoryView.test.tsx`, L.

**Akceptačné kritériá:**

- [ ] Lokálny `DetailSection` je zmazaný a nahradený `DetailDrawerSection`. Všetkých 5 sekcií
      je predvolene otvorených.
- [ ] Skrývanie riadkov s hodnotou „-“ ostáva.
- [ ] Prázdny `subtitle=""` je preč.

**Testy:** :110–120, :172, :176. V.

**Závislosti:** T4. **Rozsah:** M. **Commit:** `feat: IBM Power drawer uses shared sections`.

### Task 13: FlashSystem

**Súbory:** `flash-system/FlashSystemVolumeDetailPanel.tsx`, `FlashSystemInventoryView.tsx`
(labels), `FlashSystemInventoryView.test.tsx`, L.

**Akceptačné kritériá:**

- [ ] 4 skupiny polí a pool → sekcie, prvé dve otvorené.
- [ ] CG chip zoznam ostáva.

**Testy:** :189–197 naviazať na nový markup (`within(region)`). V.

**Závislosti:** T12. **Rozsah:** M. **Commit:** `feat: FlashSystem volume drawer uses shared sections`.

### Task 14: VMware

**Súbory:**

- `vmware/VirtualMachineDetailPanel.tsx` + test
- `VmwareResourcesPage.test.tsx`
- L

**Akceptačné kritériá:**

- [ ] Tabs → sekcie:
  - Overview (open; `DetailStat` a tagy ostávajú)
  - Disks (closed, `flush`, „Disks: N“)
  - Backing storage info (closed, `flush`)
- [ ] 3 status badge → `meta`. Subtitle hostname/IP.
- [ ] `bodyClassName="flex flex-col overflow-hidden"` je preč a scroll rieši shared telo.
- [ ] Sticky `TableHeader` v Disks nekoliduje s hlavičkou sekcie (R5, rozhodnúť v browseri).
- [ ] Fetchovanie disks a snapshots sa spúšťa rovnako ako pri tabs (R4).

**Testy:** tab „Backing storage info“ (:110, :133, :160, :186, :247) → sekcia; šírky resize
(:256–288) ostávajú. V.

**Závislosti:** T12. **Rozsah:** M / stredné riziko. **Commit:**
`feat: VMware VM drawer uses Model C sections`.

## Checkpoint D

- [ ] V + celá **SC**.
- [ ] Browser matica (4 veľkosti) na VMware, FlashSystem a IBM Power:
  - sticky hlavičky a tabuľky
  - 3 badge v meta
  - dlhé hostname a ID
  - pinned footer (ak nie je, telo ide až dole)
  - dark mode

### Task 15: Policy sets + Snapshot policies

**Súbory:** `policy-sets/components/PolicySetsTable.tsx` + test,
`recovery-policies/snapshot/components/SnapshotPoliciesTable.tsx` + test, L.

**Akceptačné kritériá:**

- [ ] Meta: entity (Policy sets), entity • level badge (Snapshot).
- [ ] Subtitle id. Nové footer sloty.

**Testy:** V.

**Závislosti:** Checkpoint D. **Rozsah:** M. **Commit:**
`feat: Policy set and snapshot policy drawers use Model C header`.

### Task 16: App recovery + Clean room policies

**Súbory:** `recovery-policies/application-recovery/components/RecoveryAppPoliciesTable.tsx` + test,
`recovery-policies/clean-room/components/CleanRoomPoliciesTable.tsx` + test, L.

**Akceptačné kritériá:**

- [ ] Meta: entity • level badge, alebo entity • enabled badge.
- [ ] Nové footer sloty.

**Testy:** V.

**Závislosti:** T15. **Rozsah:** M. **Commit:**
`feat: App recovery and clean room policy drawers use Model C header`.

### Task 17: Recovery runs history, Recovery actions history, Metro mirror review

**Súbory:**

- `recovery-runs/components/RecoveryRunHistoryDrawer.tsx` + test
- `recovery-actions/pages/RecoveryActionsHistoryPage.tsx` (import cez `data-table` index)
- `recovery-groups/components/RecoveryGroupMetroMirrorFields.tsx` (bez vizuálnej zmeny okrem
  shellu)
- L

**Akceptačné kritériá:**

- [ ] Runs: Airflow link → `headerActions`, meta entity, subtitle id.
- [ ] Actions history: meta entity • status, subtitle dátum.
- [ ] Portál a `parentElement === document.body` pri Metro mirror ostávajú.
- [ ] Pribudne render test drawera Recovery actions history (dnes nemá test).

**Testy:** V + `RecoveryGroupMetroMirrorFields.test.tsx`.

**Závislosti:** T16. **Rozsah:** M. **Commit:**
`feat: Run and action history drawers use Model C header`.

## Checkpoint E

- [ ] V + celá **SC**.
- [ ] Grep brána je **prázdna**:
      `rg -n "eyebrow=|headerExtra=" src --glob "*.tsx" --glob "!*.test.tsx"`.
- [ ] Žiadny drawer nepoužíva `Tabs`.

## Fáza 4: Cleanup

### Task 18: Odstrániť prechodné API

**Súbory:**

- `src/shared/components/data-table/DetailDrawer.tsx` + test
- L (osirelé `*.drawer.eyebrow` a `drawer.selected*`)
- prípadne zvyšní consumeri, ktorých nájde `tsc`

**Akceptačné kritériá:**

- [ ] `eyebrow` a `headerExtra` sú zmazané z `DetailDrawerProps` aj z renderovania a prechodné
      komentáre sú preč.
- [ ] `bodyClassName` je zmazaný, iba ak `rg "bodyClassName=" src` nič nenájde.
- [ ] Test `headerExtra` (:27) je nahradený testom `headerActions`.
- [ ] `tsc` prejde, čím je dokázané, že žiadny consumer nezostal.
- [ ] Žiadny locale kľúč nie je osirelý (grep každého zmazaného kľúča).

**Testy:** V + celá **SC**.

**Závislosti:** Checkpoint E. **Rozsah:** S / nízke. **Commit:**
`refactor: remove transitional detail drawer props`.

### Task 19: Záverečná browser matica

**Súbory:** iba `tasks/detail-drawer-model-c-todo.md` (zápis výsledkov).

**Akceptačné kritériá:**

- [ ] Všetkých 19 drawerov v 4 veľkostiach a v light aj dark mode.
- [ ] Skontrolovať:
  - šírka a resize handle
  - overflow a orezanie, pinned footer
  - sekcie a sticky hlavičky
  - dlhé názvy a ID, viac badge
  - inventory, mobil
- [ ] Nájdené chyby sú opravené v samostatných commitoch alebo zapísané ako issue.

**Závislosti:** T18. **Commit:** `docs: detail drawer Model C browser matrix`.

## Checkpoint F: hotovo

- [ ] Všetky akceptačné kritériá sú splnené a otvorené otázky z plánu sú uzavreté.
- [ ] Jeden shell, jedna sekcia, jeden riadok, žiadny prechodný prop.
- [ ] Review s človekom.
