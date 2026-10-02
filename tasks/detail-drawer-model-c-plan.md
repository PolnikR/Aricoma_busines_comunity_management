# Implementačný plán: Detail drawer Model C (globálne, shared)

Úlohy: `tasks/detail-drawer-model-c-todo.md`.
Vizuálna referencia: https://claude.ai/artifact/1UFzoLiDaYpFPgRkjcR51S, šablóna **C · Sekcie**.
Prototyp (iba referencia, nemergovať): commit `3eb0fd0a` na vetve `test` vo worktree
`…/Aricoma_busines_comunity_management-test`.

## Prehľad

Shared `DetailDrawer` dostane Model C priamo, bez náhradného komponentu. Mení sa:

- **Header:** nadpis, meta riadok, header akcie a jednoduché ikonové zatvorenie.
- **Sekcie:** nový shared `DetailDrawerSection`, nezávislé rozbaľovacie sekcie namiesto tabs.
- **Riadky:** ľahší `DetailRow` bez čiary pod každým riadkom.
- **Footer:** deštruktívna akcia vľavo, primárna vpravo.

Recovery Groups budú prvý referenčný consumer. Ostatných 18 consumerov sa migruje po
skupinách, každá skupina v samostatnom commite. Na konci sa odstránia prechodné props, takže
`tsc` nájde každého zabudnutého consumera.

Plán nemení backend ani API kontrakty, generated súbory, business logiku, dátový model Recovery
Group, routing, query správanie ani orchestráciu. Nezavádza nové UI knižnice ani nový theme
systém. Všetko používa tokeny z `src/index.css` a existujúce `Button`, `Badge` a `Icons`.

## Súčasný stav (analýza)

- **Shell:** `src/shared/components/data-table/DetailDrawer.tsx`.
  - Exportuje `DetailDrawer`, `DetailRow` a `DetailStat` cez `data-table/index.ts`.
    `RecoveryActionsHistoryPage` ho importuje priamo z `data-table/DetailDrawer`.
  - Header má `p-5` a nad nadpisom eyebrow. Zatvorenie je ✕ v orámovanom 32px boxe.
    `headerExtra` je samostatný riadok pod nadpisom.
  - Footer: `flex gap-3 p-4`.
  - Focus trap, Escape, obnova focusu a `inert` fungujú a ostávajú.
  - Šírka je 420px, `w-[min(420px,92vw)]`.
- **`useResizablePanel`:** 420 / 360–720 px, krok 16px. Handle má `role="separator"`,
  `aria-value*` a natvrdo anglický `aria-label="Resize panel"`.
- **`DetailRow`:** `flex justify-between border-b py-3`, `dt text-xs`, `dd text-right text-sm`.
  Žiadny súbor mimo testov ho nepoužíva mimo `DetailDrawer`.
- **`DetailStat`:** používa ho iba `VirtualMachineDetailPanel`.
- **19 consumerov.** Všetky resource panely (VMware, FlashSystem, IBM Power), audit aj recovery
  runs obaľujú shared `DetailDrawer` a žiadny nemá vlastný shell.
  - Footer je všade rovnaký: `Delete variant="danger" flex-1` a `Edit primary flex-1`.
  - Tabs používajú iba Recovery Groups, Recovery Applications a VMware.
  - `IbmPowerDetailPanel` má lokálnu funkciu `DetailSection`, preto sa nový shared komponent
    volá `DetailDrawerSection`.
- **ESLint:** `typescript-eslint` 8.65 so `strictTypeChecked` obsahuje `@typescript-eslint/no-deprecated`
  a lint beží s `--max-warnings 0`. JSDoc `@deprecated` na prechodných props by zhodil lint
  každému nemigrovanému consumerovi, preto ho plán nepoužíva (viď Backward compatibility).
- **i18n:** `t(key, params)` nahrádza iba `{{param}}` a nemá plurálové formy. cs/sk majú 3 formy,
  preto počty v summary používajú tvar „VMs: 12“ namiesto „12 VMs“.
- **Reduced motion:** `src/index.css` globálne skracuje transitions a animácie na 0.01ms.

## Cieľová architektúra

```
src/shared/components/data-table/
  DetailDrawer.tsx         DetailDrawer (shell), DetailRow, DetailStat
  DetailDrawerSection.tsx  DetailDrawerSection (nový)
  index.ts                 exportuje všetky štyri
src/shared/hooks/useResizablePanel.ts   + voliteľný resizeLabel
src/shared/icons/Icons.tsx              + CloseIcon
```

Žiadny `NewDetailDrawer`, `ModernDetailDrawer` ani feature-špecifický accordion. Feature drawery
skladajú shell, sekcie a riadky. Feature komponenty vo vnútri sekcií
(`RecoveryGroupInventory`, VM disks a podobne) ostávajú vo feature.

### 1. `DetailDrawer`: finálne API

```ts
interface DetailDrawerProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  /** Jeden riadok pod nadpisom, napr. mono ID. Truncate. */
  subtitle?: ReactNode
  /** Meta riadok: typ objektu, status badge, krátke fakty. Falsy položky sa vynechajú. */
  meta?: readonly ReactNode[]
  /** Ikonové alebo malé akcie v riadku nadpisu, pred zatvorením (help, test connection…). */
  headerActions?: ReactNode
  children?: ReactNode
  /** Pravá (primárna) skupina footer akcií. */
  footer?: ReactNode
  /** Ľavá skupina footer akcií, typicky deštruktívna. */
  footerStart?: ReactNode
  /** Resizer je aktívny iba od `lg`, pod `lg` má drawer fixnú šírku (viď Šírka a resizer). */
  resizable?: boolean
  ariaLabel?: string
  closeLabel?: string
  resizeLabel?: string
  bodyClassName?: string
}
```

Prechodné props (odstránia sa v Task 18):

- **`eyebrow?: string`** sa počas migrácie renderuje ako **prvá položka meta riadku**. Starý
  consumer tak nestratí text a testy, ktoré ho hľadajú, prejdú (Clients, Roles, Users, Audit).
  V meta pôsobí „Selected provider“ trochu cudzo, migrácia preto mení text na typ objektu
  („Provider“).
- **`headerExtra?: ReactNode`** sa renderuje ako doteraz, celou šírkou pod meta riadkom.
  Migrácia presunie badge do `meta` a tlačidlá do `headerActions`.

Ostáva: `subtitle`, `bodyClassName` (posúdi sa pri cleanupe podľa grep) a `DetailStat`.

**Rozhodnutie k `eyebrow`:** nemazať hneď, ale ponechať ho ako prechodný prop a zmazať po
migrácii. Takto to urobil aj compact page header. Okamžité zmazanie by v jednom commite rozbilo
19 súborov a 5 testových sád.

Layout headera:

```
┌──────────────────────────────────────────────────────┐
│ group-name (truncate)                 [actions] [×]  │  riadok 1: h2, leading-8 = výška ikon
│ Recovery group • [Active] • Last run: success · 7s   │  riadok 2: meta (flex-wrap)
│ vc-brno-01-7f3a                                      │  riadok 3: subtitle (voliteľný)
│ (headerExtra – len počas migrácie)                   │
└──────────────────────────────────────────────────────┘
```

#### Šírka a resizer (rozhodnutie)

**Resizer je aktívny iba od breakpointu `lg` (1024px). Pod `lg` drawer nie je resizable**,
ani keď má consumer `resizable`.

Problém, ktorý to rieši:

- Hook pracuje s 360–720px, ale CSS drawer obmedzuje na `max-width: 92vw`.
- Pri 390px viewporte je to 359px. Hook by hlásil `aria-valuenow=420` a `aria-valuemin=360`,
  zatiaľ čo drawer by bol fyzicky užší.
- Rovnaký nesúlad by vznikol pri `aria-valuemax=720` medzi 640 a 783px (92vw je tam menej ako
  720px).
- Pri `lg` je 92vw = 942px, čo je viac ako 720. Rozsah hooku sa teda vždy zmestí a hodnoty
  `aria-value*` zodpovedajú skutočnej šírke.
- Prah `sm` by preto nestačil. Bez viewport JS logiky (clamp podľa `window.innerWidth`) je jediný
  konzistentný prah `lg`.

Riešenie iba cez CSS a render, bez viewport JS:

- **Šírka ide cez CSS premennú, nie cez inline `width`:**
  - `style={{ '--detail-drawer-width': `${width}px` }}`
  - triedy `w-[min(420px,92vw)] lg:w-(--detail-drawer-width) lg:max-w-[92vw]`
  - Pod `lg` tak platí rovnaká šírka ako pri neresizable draweri a hodnota hooku sa na šírku
    vôbec neaplikuje.
- **Handle sa renderuje iba pri `resizable`, s triedou `hidden lg:block`:**
  - `display: none` ho pod `lg` vyradí z tab poradia aj z accessibility tree.
  - Jeho `role="separator"` a `aria-value*` tak existujú pre asistenčné technológie iba vtedy,
    keď je resizer naozaj aktívny.
  - Myšou ani klávesnicou sa nedá chytiť.
- **Neresizable drawer:** `w-[min(420px,92vw)]` na všetkých šírkach, bez handle (ako dnes).
- **`useResizablePanel`:** API sa nemení okrem voliteľného `resizeLabel`. Nepotrebuje `enabled`,
  lebo gating rieši render a CSS v `DetailDrawer`. Reset šírky pri zatvorení ostáva.
- **Testovateľnosť:** jsdom media queries nevyhodnocuje, preto testy overia:
  - separator má triedu `hidden lg:block`
  - aside má `lg:w-(--detail-drawer-width)` a premennú `--detail-drawer-width` (nie
    `style.width`)
  - pri neresizable draweri separator neexistuje

  Fyzické správanie na 390, 1024 a 1366 overí browser checkpoint.
- **Dopad na testy:** existujúce asercie na `drawer.style.width` sa prepíšu na
  `drawer.style.getPropertyValue('--detail-drawer-width')` v T1. Ide o `DetailDrawer.test.tsx`
  a `VirtualMachineDetailPanel.test.tsx` :256–288.

### 2. `DetailDrawerSection`

```ts
interface DetailDrawerSectionProps {
  title: string
  /** Text vpravo v hlavičke, napr. „VMware VM“, „VMs: 12“, „Not configured“. */
  summary?: ReactNode
  /** Neinteraktívny badge hneď za nadpisom (počet, varovanie). */
  badge?: ReactNode
  /** Počiatočný stav. Predvolene false. Sekcia drží stav sama. */
  defaultOpen?: boolean
  /** Bez paddingu tela, pre obsah s vlastným paddingom (inventory, tabuľky). */
  flush?: boolean
  children: ReactNode
}
```

- **Iba uncontrolled režim (rozhodnutie).** Komponent nemá props `open` ani `onToggle`.
  - **Dôvod:** žiadny z 19 consumerov ani žiadny plánovaný task (T4–T17) nepotrebuje otvárať
    sekciu zvonka ani čítať jej stav.
  - Reset pri zmene záznamu rieši `key={selected.id}` a stav sa nikam neukladá.
  - Discriminated union `open + onToggle | defaultOpen` by pridal kód aj testy bez consumera
    (CLAUDE.md §2) a voľný kontrakt `open? + onToggle?` by umožnil neplatný stav.
- **Budúce rozšírenie:** keď vznikne reálny use case (napr. „otvor Inventory po akcii“), pridá sa
  controlled režim **ako discriminated union**, nie ako dva voľné optional props:

  ```ts
  type Controlled = { open: boolean; onToggle: (open: boolean) => void; defaultOpen?: never }
  type Uncontrolled = { open?: never; onToggle?: never; defaultOpen?: boolean }
  type DetailDrawerSectionProps = BaseProps & (Controlled | Uncontrolled)
  ```

  Rozšírenie je aditívne, takže existujúci consumeri sa nemenia.
- **`defaultOpen = false`.** Otvorenie je explicitné a drahý obsah sa predvolene nemountuje.
- **Zbalený obsah sa unmountne.** Inventory a ďalšie panely, ktoré si dáta načítavajú samé,
  sa tak správajú rovnako ako dnes pri tabs: query sa spustí až pri zobrazení. Query
  správanie sa tým nemení.
- **Sekcie sú nezávislé.** Naraz môže byť otvorených viac sekcií, nejde o single-open accordion.
- **Stav sa resetuje pri zmene vybraného záznamu.** Consumer obalí telo do `key={selected.id}`.
  To zodpovedá dnešnému `setDetailTab('overview')` pri kliknutí na riadok.

Markup:

```html
<section class="border-b border-border last:border-b-0">
  <h3 class="sticky top-0 z-1 bg-surface">
    <button id=btnId aria-expanded aria-controls=panelId(iba keď open)
            aria-labelledby=titleId aria-describedby=summaryId>
      <Chevron/> <span id=titleId>Title</span> {badge} <span id=summaryId>summary</span>
    </button>
  </h3>
  <div id=panelId role="region" aria-labelledby=titleId class="px-5 pb-4">…</div>  // iba keď open
</section>
```

Prístupné meno tlačidla je iba `title` (cez `aria-labelledby`) a summary je popis (cez
`aria-describedby`). Testy tak môžu hľadať `getByRole('button', { name: 'Orchestration' })` a
čítačka obrazovky pritom summary stále prečíta.

### 3. `DetailRow`

Jemná zmena, API ostáva (`label`, `value`, `secondary`):

```
grid grid-cols-[minmax(7rem,35%)_minmax(0,1fr)] gap-x-4 py-2   (bez border-b)
dt  text-sm text-text-muted
dd  min-w-0 text-sm font-medium text-text-primary wrap-anywhere
    secondary: mt-0.5 text-xs font-normal text-text-muted
```

- Label je vľavo a hodnota v pravom stĺpci, **zarovnaná vľavo v rámci stĺpca**. Dlhé hodnoty
  a mono ID sa tak zalamujú do šírky stĺpca a nie do úzkeho pravého okraja. Toto je
  odporúčanie a otázka #1 nižšie ponecháva možnosť `text-right`.
- `wrap-anywhere` láme aj dlhé ID bez medzier. Mono hodnoty ostávajú na consumerovi
  (`<span className="font-mono">`).
- **Úzky drawer:** pri 390px viewporte (92vw = 359px) ostane po `px-5` 319px. Label stĺpec má 112px, gap 16px,
  hodnota asi 190px, takže stohovanie nie je potrebné.
- **Poradie `dt` a `dd` ostáva.** Testy používajú `getAllByRole('term')` a
  `nextElementSibling`, preto sa nesmie zmeniť.
- Mimo sekcií si consumer ponechá `<dl className="px-5 py-2">`. V sekcii stačí čisté `<dl>`,
  padding dodá sekcia.

### 4. Footer

Footer layout patrí do `DetailDrawer`, consumer dodá iba tlačidlá. Platí jedno pravidlo bez
režimov. **End kontajner (`footer`) vždy rastie do zvyšnej šírky a obsah zarovnáva vpravo.**

```
<div class="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-t border-border px-5 py-3">
  {footerStart ?
    <div class="flex flex-wrap items-center gap-3">{footerStart}</div> : null}
  {footer ?
    <div class="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-3">{footer}</div> : null}
</div>
```

Footer sa nerenderuje, keď chýba `footerStart` aj `footer`.

- **Legacy, bez `footerStart`, tlačidlá s `className="flex-1"`:**
  - End kontajner má `flex-1` a je jediné dieťa, takže vyplní **celú šírku** footera.
  - Tlačidlá s `flex-1` v ňom rastú a rozdelia šírku na polovice ako dnes. `justify-end` sa pri
    rastúcich deťoch neprejaví.
  - `gap-3` zodpovedá dnešnému `flex gap-3`.
  - **Zmení sa iba padding** (`p-4` → `px-5 py-3`), aby footer sedel s headerom a telom na
    `px-5`. Rozloženie a šírka tlačidiel sa nemenia.
  - Overí to explicitný test a browser Checkpoint A.
- **Model C, s `footerStart`:**
  - Start skupina je vľavo.
  - End kontajner vyplní zvyšok a tlačidlá bez `flex-1` sú vpravo.
- **Iba primárna akcia, bez `footerStart`, bez `flex-1`:** tlačidlo je vpravo (napr. Recovery
  Apps bez `onDelete`).
- **Deštruktívna akcia** je v `footerStart` ako `Button variant="danger" size="sm"`. Existujúci
  `danger` je už outline (červený text, surface pozadie), takže je slabší ako primárna akcia.
  Nový variant tlačidla netreba.
- **Primárna akcia** je v `footer` ako `Button size="sm"` bez `flex-1`. Sekundárne akcie (napr.
  „View runs“) idú do `footer` pred primárnu.
- **Pinned:** footer ostáva súrodenec scrollujúceho tela v `flex-col` shell (`shrink-0`), takže je
  stále pripnutý dole. Scrolluje iba telo.
- **Mobil a zalamovanie:**
  - Vonkajší kontajner aj obe skupiny majú `flex-wrap`, end skupina `min-w-0`.
  - Pri 359px sa Delete, View runs aj Edit (`size="sm"`, asi 70 až 90px) zmestia do jedného
    riadku.
  - Ak sa nezmestia, end skupina sa zalomí na nový riadok. Tam má celú šírku (`flex-1`) a
    tlačidlá ostanú vpravo (`justify-end`).
  - Legacy `flex-1` tlačidlá sa zalomia v rámci end kontajnera.
  - Nič sa neoreže a nevznikne horizontálny scroll.

### 5. Recovery Groups: referenčná migrácia (Task 4)

Header:

- `title` = `selected.name`
- `meta`:
  1. `t('drawer.entity.recoveryGroup')`, nový kľúč „Recovery group“, nahrádza
     `drawer.selectedRecoveryGroup`.
  2. Status badge: `Active` → success, `Draft` → warning (existujúce kľúče).
  3. `providerResolution === 'unresolved'`: warning badge `pages.recoveryGroups.providerUnavailable`
     (existuje, „Provider unavailable“).
  4. Orchestration fakt podľa stavov nižšie.

#### Stavy orchestrácie (rovnaké pre meta fakt aj summary sekcie Orchestration)

Mapujú sa iba existujúce polia. Nevzniká žiadny nový backend stav ani nový query. Vstupy:

- `pushToOrchestrator`, `orchestrationProviderId`, `airflowRunId` z `RecoveryGroup`
- `platformProviders` z už existujúceho `useGetPlatformProviders`
  - Z toho istého volania sa navyše čítajú `isLoading` a `isError`.
  - Query, parametre ani `enabled` sa nemenia.
- `latestRun`, `isLoading` a `error` z už existujúceho `useLatestOrchestratorRun`
  - Hook beží ako dnes iba pri `pushToOrchestrator && orchestrationProviderId && airflowRunId`.

Stavy sa vyhodnocujú v poradí, platí prvý vyhovujúci:

| # | Podmienka | Meta fakt | Summary sekcie Orchestration |
|---|---|---|---|
| A | `!pushToOrchestrator` | „Not orchestrated“ `recoveryGroups.drawer.notOrchestrated` | „Not configured“ `recoveryGroups.drawer.notConfigured` |
| B | push, `orchestrationProviderId` chýba | „Orchestration incomplete“ `recoveryGroups.drawer.orchestrationIncomplete` | „Orchestration incomplete“ (rovnaký kľúč) |
| C0 | push + providerId, `platformProviders` sa ešte načítavajú | vynechať | vynechať (žiadne blikanie) |
| C1 | push + providerId, `platformProviders` skončili chybou | vynechať (nepotvrdená nedostupnosť sa nehlási) | vynechať |
| C | push + providerId, provider sa v načítaných `platformProviders` nenájde | „Orchestrator unavailable“ `recoveryGroups.drawer.orchestratorUnavailable` | „Orchestrator unavailable“ (rovnaký kľúč) |
| D | provider nájdený, `airflowRunId` chýba | „No run ID yet“ `recoveryGroups.drawer.noRunId` | názov providera |
| E1 | provider + `airflowRunId`, latest run `isLoading` | vynechať | názov providera |
| E2 | provider + `airflowRunId`, latest run `error` | vynechať (chyba ostáva v sekcii) | názov providera |
| E3 | provider + `airflowRunId`, `latestRun === null` | „No runs yet“ `recoveryRuns.table.noRuns` (existuje) | názov providera |
| E4 | provider + `airflowRunId`, `latestRun` existuje | „Last run: {{status}} · {{duration}}“ `recoveryGroups.drawer.lastRun`, duration z `formatRunDuration` | názov providera |

Poznámky:

- **Prečo „Orchestrator unavailable“ a nie „Provider unavailable“:** meta riadok môže zároveň
  ukázať badge `pages.recoveryGroups.providerUnavailable`. Ten sa týka **resource** providera
  (`providerResolution === 'unresolved'`), nie orchestrátora. Dva rovnaké texty s rôznym
  významom vedľa seba by boli zavádzajúce.
- **D znamená, že orchestrácia je nakonfigurovaná a provider existuje**, ale chýba
  server-assigned run ID z pushu. To nie je „Not orchestrated“ ani „No runs yet“, lebo bez run
  ID sa runy nedajú dohľadať. Preto vlastný text „No run ID yet“.
- **Stav B, C alebo D nie je „Not orchestrated“.** Ten text patrí iba stavu A.
- **Telo sekcie Orchestration ostáva vecne rovnaké:** Orchestration yes/no a Airflow run ID
  (alebo „—“). Riadky Latest run, Last executed, Duration a tlačidlo „View recovery runs →“
  ostávajú pod **dnešnou** podmienkou `isSelectedOrchestrated` (push + providerId + run ID) a
  ich viditeľnosť sa nemení. Mení sa iba text v meta riadku a v summary, nie business logika.
- **Pomocná funkcia:** mapovanie bude čistá funkcia
  `getRecoveryGroupOrchestrationState(...)` v
  `recovery-groups/helpers/recoveryGroupOrchestrationState.ts` s vlastným unit testom. Vracia
  diskriminovaný stav `A | B | C0 | C1 | C | D | E1–E4`. Komponent iba mapuje stav na text, takže
  stavová matica sa testuje bez renderu.

Sekcie (uncontrolled, telo `key={selected.id}`):

| Sekcia | defaultOpen | summary | Obsah |
|---|---|---|---|
| Overview | **true** | `t(getWorkloadTypeLabelKey(...))`, ak `workloadType` nie je null, inak `t(getResourceTypeLabelKey(...))` | Description, Policy set, Provider ID (mono), Source category, Workload type, Resource type, Resources, Status |
| Orchestration | **false** | podľa tabuľky stavov orchestrácie (stĺpec Summary) | Orchestration yes/no, Airflow run ID (`AirflowDagLink`), Latest run status, Last executed, Duration, `View recovery runs →` (Button `soft`, mimo `<dl>`) |
| Inventory | **false**, `flush` | `resourceType === 'vm'` → `recoveryGroups.drawer.vmCount` „VMs: {{count}}“, `volume` → `…volumeCount` „Volumes: {{count}}“, `resourceCount === 0` → `recoveryGroups.drawer.noResources` „No resources“ | `RecoveryGroupInventory` bez zmeny |

Prečo je Orchestration predvolene zatvorená: stav posledného runu je už v meta riadku a provider
v summary. Otvorenú sekciu potrebuje iba ten, kto ide do detailov runu. Telo tak pri otvorení
ukáže iba Overview bez scrollovania aj na 768p. Status ostane v Overview aj v meta riadku, lebo
používateľ ho chcel v zozname riadkov. Duplicita je zámerná a dá sa odstrániť (otázka #2).

Footer: `footerStart` = Delete (danger). `footer` = Edit (primary, disabled pri unresolved
providerovi, so zachovaným `title`, `aria-describedby` a sr-only hintom).

`Tabs` a `detailTab` state z `RecoveryGroupsTable` zmiznú. `Tabs` ostáva v shared pre stránky.

### 6. Globálny rollout: skupiny

| Skupina / drawer | Sekcie? | Sekcie a summary | Footer | Header meta / actions | Môže ostať na starom API |
|---|---|---|---|---|---|
| **Recovery Groups** (T4) | áno | viď vyššie | Delete / Edit | entity • status • provider unavailable • run fakt | nie, je to referencia |
| **Recovery Applications** (T6) | áno | Overview (summary: platform), Orchestration (summary podľa rovnakej stavovej tabuľky A–E ako Recovery Groups, nad poľami aplikácie), Inventory (počet tierov „Tiers: {{count}}“) | Delete / Edit iba ak sú handlery | entity • status • orchestration fakt (stavy A–E) | – |
| **Platform Providers** (T7) | nie (4 až 10 riadkov) | – | Delete / Edit | entity • type badge • credential status; SMTP tlačidlo → `headerActions`; subtitle = mono id | až do T7 `headerExtra` |
| **Providers** (T8) | nie | – | Delete / Edit | entity • role badge • credential status; Test connection → `headerActions` (trieda testovaná v :278 ostáva) | až do T8 |
| **Credentials** (T8) | nie | – | Delete / Edit | entity; subtitle = id | až do T8 |
| **Users, Application roles** (T9) | nie | – | žiadny | entity • status badge / clientId badge | až do T9 |
| **Clients** (T10) | nie | – | žiadny | entity • status a preview badge | až do T10 |
| **Audit** (T11) | áno | Request (open, summary method + status), Request body (closed), Response body (closed), Raw entry (closed), body sekcie `flush` | žiadny | entity • status code | až do T11 |
| **IBM Power** (T12) | áno | lokálny `DetailSection` → `DetailDrawerSection`, všetkých 5 otvorených (dnes je všetko viditeľné), summary iba kde je jasný fakt | žiadny | entity • (state) | až do T12 |
| **FlashSystem** (T13) | áno | 4 skupiny polí a pool, prvé dve otvorené | žiadny | entity • (status) | až do T13 |
| **VMware** (T14) | áno | Overview (open; DetailStat a tagy ostávajú), Disks (closed, „Disks: N“, `flush`), Backing storage info (closed, `flush`) | žiadny | entity • 3 status badge v `meta`; subtitle = hostname / IP | až do T14 (`bodyClassName` flex) |
| **Policy sets, Snapshot** (T15) | nie | – | Delete / Edit | entity • level badge (Snapshot) | až do T15 |
| **App recovery, Clean room** (T16) | nie | – | Delete / Edit | entity • level / enabled badge | až do T16 |
| **Recovery runs history, Recovery actions history, Metro mirror review** (T17) | nie | – | žiadny | entity • status; Airflow link → `headerActions` | až do T17 |

Pri migrácii každého drawera sa:

- `eyebrow` nahradí prvou `meta` položkou s typom objektu. Text bez „Selected“ ide do kľúča
  `<feature>.drawer.entity` a starý `*.drawer.eyebrow` / `drawer.selected*` sa zmaže, ak osirie.
- badge z `headerExtra` presunú do `meta` a tlačidlá do `headerActions`.
- footer prepíše na `footerStart` a `footer` bez `flex-1`.
- odovzdá `resizeLabel={t('drawer.resize')}` (kľúč pridá T4).

## Backward compatibility

| Prvok | Task 1–3 | Počas migrácie | Task 18 (cleanup) |
|---|---|---|---|
| `title`, `open`, `onClose`, `children`, `resizable`, `ariaLabel`, `closeLabel`, `bodyClassName` | bez zmeny | – | `bodyClassName` zmazať, iba ak ho grep nenájde |
| `subtitle` | nový vzhľad (riadok 3) | – | ostáva |
| `eyebrow` | prechodný, renderuje sa ako prvá meta položka | consumer → `meta` | **zmazať z typu** |
| `headerExtra` | prechodný, renderuje sa pod meta | consumer → `meta` / `headerActions` | **zmazať z typu** |
| `meta`, `headerActions`, `footerStart`, `resizeLabel` | nové, voliteľné | – | ostávajú |
| `resizable` | od `lg` aktívny resizer, pod `lg` fixná šírka `min(420px,92vw)` a skrytý handle. Inline `style.width` → CSS premenná `--detail-drawer-width`. | – | ostáva |
| `footer` | end kontajner vždy `flex-1 justify-end`. Bez `footerStart` je to jediné dieťa a má celú šírku, takže staré `flex-1` tlačidlá sa delia ako dnes (explicitný test + Checkpoint A). Mení sa iba padding `p-4` → `px-5 py-3`. | tlačidlá bez `flex-1`, deštruktívne do `footerStart` | ostáva |
| `DetailRow` | nový vzhľad, rovnaké API | – | ostáva |
| `DetailStat` | bez zmeny | – | ostáva (VM) |

**Prečo nie JSDoc `@deprecated`:** `@typescript-eslint/no-deprecated` je zapnuté cez
`strictTypeChecked` a lint beží s `--max-warnings 0`. Tag by zhodil lint každému nemigrovanému
súboru. Prechodné props majú preto obyčajný komentár
`// Transitional (detail-drawer-model-c): removed in Task 18.` a postup sa sleduje grepom.

**Brána pred cleanupom** (spúšťa sa na každom checkpointe a zapisuje sa do todo):

```
rg -n "eyebrow=|headerExtra=" src --glob "*.tsx" --glob "!*.test.tsx"
rg -n "role=\"tab\"|<Tabs" src --glob "*DetailPanel.tsx" --glob "*Table.tsx" --glob "*Drawer.tsx"
```

Task 18 zmaže `eyebrow` a `headerExtra` z `DetailDrawerProps`. Ak niekto zostal nemigrovaný,
`npx tsc -p tsconfig.app.json --noEmit` zlyhá s chybou na konkrétnom riadku.

**Ako nevzniknú dva paralelné systémy:**

- Existuje jeden shell, jedna sekcia a jeden riadok, žiadny druhý komponent.
- Počas prechodu sa staré a nové drawery líšia iba obsahom tela (tabs vs. sekcie) a prvou meta
  položkou. Header, zatvorenie, riadky a footer sú od Task 3 všade nové.
- Prechodné props majú termín zmazania (T18). Grep brána musí byť pred T18 prázdna.
- Prototyp `3eb0fd0a` na vetve `test` používa iné meno (`DetailSection`) a iné props
  (`status`, `titleExtra`). Do `spike/ant-design-shell` sa nemerguje. Pri neskoršom merge
  `test` → hlavná vetva sa tento commit revertne alebo vynechá (riziko R9).

## Vizuálne pravidlá (shared)

| Prvok | Pravidlo |
|---|---|
| Šírka default | `w-[min(420px,92vw)]` na všetkých šírkach pre neresizable drawer a pod `lg` aj pre resizable |
| Resizable | **iba od `lg` (≥1024px):** `lg:w-(--detail-drawer-width) lg:max-w-[92vw]`, 360–720px, krok 16px, default 420px. Pri `lg` je 92vw ≥ 942px, takže rozsah hooku vždy sedí so skutočnou šírkou. |
| Pod `lg` (mobil, tablet) | **Nie je resizable.** Šírka `min(420px,92vw)` (pri 390px je to 359px), handle `hidden lg:block`, takže nie je viditeľný, fokusovateľný ani v accessibility tree. Backdrop ostáva viditeľný na zatvorenie ťuknutím. 92vw vs. 100vw pod `sm` je iba vizuálna voľba (otázka #4). |
| Backdrop | `bg-black/45`, fade 200ms (bez zmeny) |
| Tieň a hrana | `border-l border-border shadow-[-14px_0_40px_-20px_rgba(20,35,70,0.4)]` (bez zmeny) |
| Header | `px-5 pt-4 pb-3 border-b border-border` |
| Nadpis | `h2 min-w-0 flex-1 truncate text-base font-semibold leading-8 text-text-primary` |
| Meta riadok | `mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-text-muted`, oddeľovač `size-0.75 rounded-full bg-text-subtle` (`aria-hidden`), badge `size="sm"` |
| Subtitle | `mt-0.5 truncate text-xs text-text-muted` |
| Header akcie | `flex shrink-0 items-center gap-1`, ikonové tlačidlá `size-8` |
| Zatvorenie | `size-8 rounded-lg text-text-muted hover:bg-surface-hover hover:text-text-primary`, `CloseIcon size-4`, bez rámika |
| Ikony | 16px (`size-4`) v headri, sekcii a footeri |
| Sekcia, hlavička | tlačidlo `px-5 py-3 text-sm font-semibold`, výška 44px; `ChevronRightIcon size-4 text-text-subtle`, `rotate-90` keď je otvorená; summary `text-xs text-text-muted truncate max-w-[50%]` |
| Sekcia, telo | `px-5 pb-4`, alebo bez paddingu pri `flush` |
| Oddeľovače | iba medzi sekciami (`border-b border-border last:border-b-0`), header a footer; riadky bez čiar |
| Riadok | `py-2`, `text-sm` (viď DetailRow), výška asi 36px |
| Body scroll | `custom-scrollbar flex-1 overflow-y-auto`; hlavička sekcie `sticky top-0 z-1 bg-surface` |
| Footer | `px-5 py-3 border-t`, pinned (viď Footer) |
| Hover / focus | hover `bg-surface-subtle` (sekcia) alebo `bg-surface-hover` (ikony); focus `focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15`, v sekcii `ring-inset` |
| Animácia | iba rotácia chevronu `transition-transform duration-150`. Telo sa pri rozbalení neanimuje, lebo je unmountnuté a animácia výšky by ho musela držať v DOM. Drawer slide ostáva 200ms. |
| Reduced motion | globálne pravidlo v `index.css` ostáva, navyše `motion-reduce:transition-none` na chevrone |

## Accessibility

- **Dialóg:** `<aside role="dialog" aria-modal="true" aria-label>`, zatvorený má `inert` a
  `aria-hidden` (bez zmeny).
- **Focus:** pri otvorení ide na close button (bez zmeny). Trap Tab/Shift+Tab beží cez všetky
  fokusovateľné prvky vrátane `headerActions` a tlačidiel sekcií. Pri zatvorení sa focus vráti
  na opener.
- **Focus trap vynecháva prvky skryté cez CSS (schválený implementačný detail z T1, commit
  `36409336`):**
  - Zoznam prvkov trapu sa filtruje cez `element.checkVisibility()`, keď ho prehliadač podporuje.
  - Týka sa to najmä resize handle pod `lg` (`hidden lg:block`, teda `display: none`). Bol by
    prvým fokusovateľným prvkom, prehliadač ho pri Tab preskočí, ale trap by ho bral ako
    `first` a Shift+Tab z close tlačidla by vyhodil focus z drawera.
  - jsdom `checkVisibility` nemá, preto sa tam prvky nefiltrujú. Test simuluje skrytý handle
    stubom `checkVisibility: () => false`.
- **Focus trap vynecháva aj prvky s `tabIndex < 0` (oprava z Checkpointu A, commit `a274d142`):**
  roving `tabindex=-1` položky (neaktívne taby) sa predtým počítali ako `last`. Tab z reálne
  posledného prvku potom opustil drawer (zistené vo VMware drawerovi). Chyba existovala už pred
  Model C.
- **Escape** zatvorí drawer. Vnorený popover (help) musí Escape zachytiť a zastaviť
  (`stopPropagation`). Shell sa nemení.
- **Close button** má `aria-label={closeLabel}` a ikona `aria-hidden`.
- **Sekcia:**
  - Skutočné `<button>` vnútri `<h3>`, takže Enter a Space fungujú natívne.
  - `aria-expanded`, `aria-controls` (iba keď existuje panel), `aria-labelledby` (nadpis) a
    `aria-describedby` (summary).
  - Panel má `role="region"` a `aria-labelledby={titleId}` (schválená odchýlka z T2, commit
    `c2664c43`: nie button id, aby meno regiónu bolo iba nadpis bez badge a summary). Drawer má maximálne 5 sekcií, čo je v
    hraniciach APG.
  - Hlavička sekcie nesmie obsahovať interaktívne prvky (`badge` a `summary` sú iba text).
  - Interaktívny obsah je iba v tele sekcie.
- **Hierarchia nadpisov:** nadpis drawera je `h2` a sekcie `h3`. Vnútorné nadpisy (audit body,
  inventory) prejdú na `h4`, ak sú v sekcii.
- **Focus-visible:** každý interaktívny prvok má ring, žiadny `outline-none` bez náhrady.
- **Resizer:**
  - **Aktívny iba od `lg`.** Handle sa renderuje iba pri `resizable` a má `hidden lg:block`.
  - Pod `lg` je `display: none`. Nie je v tab poradí ani v accessibility tree, takže jeho
    `aria-valuenow/min/max` sa nikde nehlásia a nemôžu odporovať skutočnej šírke.
  - Od `lg` platí `role="separator"`, `aria-orientation="vertical"`, `aria-valuenow/min/max`
    zhodné so skutočnou šírkou (360–720 sa vždy zmestí do 92vw) a ovládanie šípkami
    (bez zmeny).
  - `aria-label` bude lokalizovaný cez `resizeLabel`, predvolene „Resize panel“ kvôli
    kompatibilite.
- **Screen-reader texty:** sr-only hint pri disabled Edit ostáva. Badge v meta majú čitateľný
  text a nie iba farbu.

## Testovací plán

**Shared, `DetailDrawer.test.tsx`:** existujúce testy ostávajú (open, close, Escape, focus trap,
restore, resize, reset šírky, footer). Pribudnú tieto:

- **Backdrop:** klik zavolá `onClose`.
- **Header:** `meta` vyrenderuje položky v poradí, falsy vynechá a oddeľovače sú `aria-hidden`.
  `subtitle` je samostatný riadok.
- **Prechodné props:** `eyebrow` sa zobrazí ako prvá meta položka. `headerExtra` ostáva
  (pôvodný test na :27 ostáva do T18).
- **`headerActions`:** sú v riadku nadpisu pred close a patria do focus trapu.
- **Focus trap a skryté prvky:** keď `checkVisibility()` vráti false, handle sa z trapu vynechá
  a Shift+Tab z close tlačidla zabalí focus na posledný prvok drawera.
- **Footer, legacy:** bez `footerStart` s dvoma `<button className="flex-1">` v `footer`. Rodič
  tlačidiel (end kontajner) má `flex-1` a je jediné dieťa footera, teda full-width. Obe tlačidlá
  sú v ňom v pôvodnom poradí.
- **Footer, Model C:** s `footerStart` (Delete) a `footer` (Edit).
  - Prvé dieťa footera obsahuje Delete, druhé (end kontajner s `flex-1 justify-end`) obsahuje
    Edit.
  - Delete je v DOM poradí pred Edit, takže je vľavo.
- **Footer, absencia:** footer chýba, keď nie je zadaný ani `footerStart` ani `footer`.
- **Resizer, gating:**
  - `resizable`: separator má triedy `hidden lg:block`. Aside má `lg:w-(--detail-drawer-width)` a
    `style.getPropertyValue('--detail-drawer-width') === '420px'`, nie `style.width`.
  - Bez `resizable`: separator neexistuje a aside má `w-[min(420px,92vw)]`.
- **Resizer, hodnoty:** existujúce testy šírky (ArrowLeft 436, drag 480, reset 420) sa prepíšu z
  `style.width` na CSS premennú.
- **Resizer, label:** `resizeLabel` sa prenesie do `aria-label` separatora.

**Shared, `DetailDrawerSection.test.tsx`:**

- Predvolene je zbalená, klik ju otvorí a obsah sa mountne.
- `aria-expanded` sa prepína a `aria-controls` ukazuje na panel s `role="region"`.
- Ovládanie klávesmi: Enter aj Space (cez `userEvent`).
- `summary` a `badge` sa vyrenderujú. Prístupné meno je iba `title`, summary je v
  `aria-describedby`.
- `flush` vynechá padding.
- `defaultOpen` otvorí sekciu pri mounte, potom ju klik zbalí (vlastný stav).
- Typový kontrakt: komponent neprijíma `open` ani `onToggle`. V teste ich hlási
  `// @ts-expect-error`, takže neplatný controlled stav sa nedá skompilovať.
- Viac sekcií otvorených naraz je nezávislých.
- Reduced motion: overí sa iba prítomnosť triedy `motion-reduce:transition-none`. CSS media sa v
  jsdom netestuje.

**`useResizablePanel.test.ts`:** `resizeLabel` sa prenesie do handle props.

**Recovery Groups, `RecoveryGroupsTable.test.tsx`:**

- `queryByRole('tab')` je null.
- Overview má `aria-expanded="true"`, Orchestration a Inventory `false`.
- Prepínanie sekcií a ich nezávislosť.
- Summary: workload label, „VMs: N“, „Volumes: N“ a „No resources“.
- **Stavová matica orchestrácie:**
  - Unit test `recoveryGroupOrchestrationState.test.ts` pokrýva každý stav A, B, C0, C1, C, D a
    E1–E4.
  - Render test v `RecoveryGroupsTable.test.tsx` overí aspoň A, B, C, D, E3 a E4 v meta riadku
    aj v summary sekcie Orchestration.
  - Žiadny stav okrem A neukáže „Not orchestrated“.
  - Mock `useLatestOrchestratorRun` už v teste existuje. Platform providers sa mockujú cez
    existujúci setup testu.
- Meta: entity, Active alebo Draft badge, resource „Provider unavailable“ badge pri unresolved.
- Orchestration dáta a Airflow link. Existujúcich 5 testov dnes klikne na tab, po novom
  klikne na tlačidlo sekcie s rovnakým menom.
- Inventory sa mountne až po otvorení.
- „View recovery runs →“ naviguje.
- Footer: Delete je vľavo (v `footerStart`), Edit je disabled pri unresolved a má hint.
- Drawer close.
- Po výbere iného záznamu sa sekcie vrátia na default.

**Migrácia, pre každý task T6–T17:**

- Testová sada daného consumera musí prejsť.
- Asercie naviazané na štruktúru sa upravia v tom istom commite:
  - VMware a Recovery Applications: tab role → section button.
  - FlashSystem :189-197: `closest('div')` a `nextElementSibling` sa naviažu na nový markup.
  - Clients, Roles, Users, Audit: text eyebrow → text meta.
  - Clients :279 a Users :182 tvrdia, že „jediné tlačidlo je close“. Ostane pravda, kým
    consumer nepridá `headerActions`.

**Po každom tasku:** `npx tsc -p tsconfig.app.json --noEmit` musí prejsť.

### Sada testov consumerov drawera (spúšťa sa celá v T1, T3 a T18)

```
src/shared/components/data-table/DetailDrawer.test.tsx
src/shared/hooks/useResizablePanel.test.ts
src/features/discovery-inventory/resources/components/vmware/VirtualMachineDetailPanel.test.tsx
src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx
src/features/discovery-inventory/resources/components/ibm-power/PowerInventoryView.test.tsx
src/features/discovery-inventory/resources/components/flash-system/FlashSystemInventoryView.test.tsx
src/features/platform-administration/identity-access/components/ClientsSection.test.tsx
src/features/platform-administration/identity-access/components/RealmRolesSection.test.tsx
src/features/platform-administration/identity-access/components/UsersSection.test.tsx
src/features/platform-administration/audit/components/AccessLogsTable.test.tsx
src/features/platform-administration/audit/pages/AuditPage.test.tsx
src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx
src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx
src/features/providers-connectors/credentials/components/CredentialsTable.test.tsx
src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx
src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPoliciesTable.test.tsx
src/features/recovery-plans/recovery-policies/clean-room/components/CleanRoomPoliciesTable.test.tsx
src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPoliciesTable.test.tsx
src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx
src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx
src/features/recovery-plans/recovery-groups/components/RecoveryGroupMetroMirrorFields.test.tsx
src/features/recovery-plans/recovery-runs/components/RecoveryRunHistoryDrawer.test.tsx
```

`RecoveryActionsHistoryPage` nemá test. Jeho task (T17) pridá aspoň render test drawera.

## Verifikácia (každý task)

```
npm exec vitest run <dotknuté test súbory>
npx eslint --max-warnings 0 <zmenené súbory>
npx tsc -p tsconfig.app.json --noEmit
git diff --check
```

Celá suita ani `npm run build` sa nespúšťajú bez explicitnej požiadavky (CLAUDE.md §5). Výnimka:
v T1, T3 a T18 sa spúšťa celá sada testov consumerov drawera.

**Browser checkpointy** (`run` skill, `http://localhost:5173`, reálny backend ako pri compact
headeri):

- **Matica:** 390×844, 1024×768, 1366×768, 1920×1080.
- **Kontroluje sa:**
  - šírka drawera a resize handle:
    - 390×844: handle neexistuje vizuálne ani pre Tab, šírka 92vw
    - 1024×768 a viac: handle funguje myšou aj šípkami a `aria-valuenow` zodpovedá zmeranej
      šírke
    - zúženie okna z 1366 na 1000 pri roztiahnutom draweri vráti šírku `min(420px,92vw)`
  - overflow obsahu, orezanie a pinned footer
  - rozbaľovanie sekcií a sticky hlavičky
  - dlhé názvy (truncate, akcie ostanú viditeľné) a dlhé ID (zalamovanie)
  - viac badge v meta (VMware: 3 badge, ich zalamovanie)
  - inventory obsah, mobil a dark mode

## Úlohy (index)

Detailné kritériá, súbory a commit hranice sú v `tasks/detail-drawer-model-c-todo.md`.

### Fáza 1: Shared základ

- Task 1: `DetailDrawer` header shell a API (meta, subtitle, headerActions, CloseIcon,
  resizeLabel, resizer iba od `lg`, prechodné eyebrow a headerExtra)
- Task 2: `DetailDrawerSection`
- Task 3: `DetailRow` restyle a footer (`footerStart`, legacy full-width end kontajner)
- **Checkpoint A:** celá sada consumerov, tsc, browser na nemigrovaných draweroch (legacy footer,
  resizer gating 390 / 1024 / 1366)

### Fáza 2: Referencia

- Task 4: Recovery Groups → Model C
- Task 5 (voliteľný, vyžaduje súhlas): shared `HelpPopover` + help v Recovery Groups (z prototypu) — doplnený 2026-10-02 (`ad40ceb7`), nemodálny dialog renderovaný v DOM drawera
- **Checkpoint B:** browser matica na Recovery Groups, review s človekom

### Fáza 3: Rollout

- Task 6: Recovery Applications
- Task 7: Platform Providers
- Task 8: Providers + Credentials
- Task 9: Users + Application roles
- Task 10: Clients
- Task 11: Audit
- **Checkpoint C**
- Task 12: IBM Power
- Task 13: FlashSystem
- Task 14: VMware
- **Checkpoint D**
- Task 15: Policy sets + Snapshot policies
- Task 16: App recovery + Clean room policies
- Task 17: Recovery runs history, Recovery actions history, Metro mirror review
- **Checkpoint E:** grep brána je prázdna

### Fáza 4: Cleanup

- Task 18: odstrániť `eyebrow` a `headerExtra` (tsc), prípadne `bodyClassName`, osirelé locale
  kľúče
- Task 19: záverečná browser matica všetkých drawerov
- **Checkpoint F:** hotovo

## Riziká a mitigácie

| # | Riziko | Dopad | Mitigácia |
|---|---|---|---|
| R1 | T1 a T3 menia vzhľad všetkých 19 drawerov naraz | Vysoký | Prechodné renderovanie `eyebrow` a `headerExtra`. Legacy footer má full-width end kontajner, overený explicitným testom. Celá sada consumerov a browser Checkpoint A pred T4. |
| R2 | `no-deprecated` + `--max-warnings 0` | Stredný | Žiadny JSDoc `@deprecated`, obyčajný komentár + grep brána, `tsc` v T18 |
| R3 | Prístupné meno tlačidla sekcie by obsahovalo summary a rozbilo testy aj čitateľnosť | Stredný | `aria-labelledby` (title) + `aria-describedby` (summary) |
| R4 | Unmount zbalenej sekcie zmení, kedy bežia query | Stredný | Rovnaká sémantika ako dnešné tabs (render iba keď viditeľné). Pri každej migrácii overiť, či obsah nefetchuje inak (VMware snapshots/disks, inventory). Hook `useLatestOrchestratorRun` ostáva na úrovni tabuľky. |
| R5 | Sticky hlavička sekcie vs. sticky `TableHeader` vo VM disks | Stredný | V T14 je Disks `flush` a sticky header tabuľky dostane `top-11` (výška hlavičky sekcie) alebo sticky stratí. Rozhodne browser. |
| R6 | Testy viazané na DOM (FlashSystem `nextElementSibling` a `closest('div')`, Clients a Users „only button“) | Stredný | T3 zachová `div > dt + dd`. Konkrétne asercie sa upravia v tasku daného consumera. |
| R7 | Dlhý nadpis + `headerActions` v jednom riadku (Test connection) | Nízky | `min-w-0 truncate` na h2, `shrink-0` na akciách, browser s dlhými názvami |
| R8 | Nesúlad hook a CSS: pri 390px je 92vw = 359px < `minWidth` 360 a medzi 640 a 783px je 92vw < `maxWidth` 720, takže `aria-value*` by klamali | Stredný | **Rozhodnuté:** resizer je aktívny iba od `lg` (92vw ≥ 942). Pod `lg` je handle `hidden` (mimo a11y tree a tab poradia) a šírka je CSS `min(420px,92vw)` cez premennú, nie inline `width`. Bez viewport JS. Overí browser matica (390 / 1024 / 1366 a zúženie okna). |
| R9 | Prototyp `3eb0fd0a` na vetve `test` sa rozchádza (iné mená) | Stredný | Nemergovať do spike. Pri merge `test` vynechať alebo revertnúť, kód brať iba ako referenciu. |
| R10 | Locale súbory zdieľa takmer každý task | Nízky | Tasky idú sekvenčne, nie paralelne. Kľúče sa pridávajú v rovnakom bloku `drawer.*` / `<feature>.drawer.*`. |
| R11 | cs/sk plurály | Nízky | Tvar „VMs: {{count}}“ bez plurálu |
| R12 | Počas rolloutu má časť drawerov tabs a časť sekcie | Nízky | Prijaté, header, riadky a footer sú zjednotené už od T3. Grep brána, termín T18. |

## Otvorené otázky

1. **DetailRow:** hodnota v pravom stĺpci zarovnaná vľavo (odporúčanie) alebo `text-right` ako
   dnes?
2. **Recovery Groups Overview:** ponechať riadok Status, keď je status už v meta? Plán ho
   ponecháva podľa zadania.
3. **Task 5:** preniesť `HelpPopover` a relation help z prototypu, alebo ho riešiť samostatne?
4. **Mobil, iba vizuálna voľba:** pod `sm` 92vw (plán, backdrop ostáva viditeľný) alebo 100vw?
   Resizer je pod `lg` vypnutý v oboch prípadoch.
5. **Run fakt v meta:** dĺžka behu (plán) alebo relatívny čas spustenia („pred 14 min“)? Na
   relatívny čas dnes nie je helper.
