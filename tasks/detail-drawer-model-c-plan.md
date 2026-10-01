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

### 2. `DetailDrawerSection`

```ts
interface DetailDrawerSectionProps {
  title: string
  /** Text vpravo v hlavičke, napr. „VMware VM“, „VMs: 12“, „Not configured“. */
  summary?: ReactNode
  /** Neinteraktívny badge hneď za nadpisom (počet, varovanie). */
  badge?: ReactNode
  /** Uncontrolled režim. Predvolene false. */
  defaultOpen?: boolean
  /** Controlled režim. Ak je zadané, komponent nedrží vlastný stav. */
  open?: boolean
  onToggle?: (open: boolean) => void
  /** Bez paddingu tela, pre obsah s vlastným paddingom (inventory, tabuľky). */
  flush?: boolean
  children: ReactNode
}
```

- **Oba režimy, jedno pravidlo:**
  - Keď je `open` zadané, je to controlled režim a `onToggle` dostane nový stav.
  - Inak je to uncontrolled režim s `defaultOpen` a `onToggle` sa volá len ako notifikácia.
  - Interne to rieši malý hook v tom istom súbore, nebude exportovaný.
  - Recovery Groups vystačia s uncontrolled režimom. Controlled je pripravený pre prípady, keď
    feature potrebuje otvoriť sekciu zvonka. Žiadny prípad ho dnes nevyžaduje, preto bude
    pokrytý iba testom.
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
  <div id=panelId role="region" aria-labelledby=btnId class="px-5 pb-4">…</div>  // iba keď open
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
- **Úzky drawer:** pri minime 360px ostane po `px-5` 320px. Label stĺpec má 112px, gap 16px,
  hodnota asi 190px, takže stohovanie nie je potrebné.
- **Poradie `dt` a `dd` ostáva.** Testy používajú `getAllByRole('term')` a
  `nextElementSibling`, preto sa nesmie zmeniť.
- Mimo sekcií si consumer ponechá `<dl className="px-5 py-2">`. V sekcii stačí čisté `<dl>`,
  padding dodá sekcia.

### 4. Footer

Footer layout patrí do `DetailDrawer`, consumer dodá iba tlačidlá:

```
<div class="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3">
  <div class="mr-auto flex items-center gap-2">{footerStart}</div>   // iba ak je zadané
  <div class="flex items-center gap-2">{footer}</div>
</div>
```

- **Deštruktívna akcia** je v `footerStart` ako `Button variant="danger" size="sm"`. Existujúci
  `danger` je už outline (červený text, surface pozadie), takže je slabší ako primárna akcia.
  Nový variant tlačidla netreba.
- **Primárna akcia** je v `footer` ako `Button size="sm"` bez `flex-1`. Sekundárne akcie (napr.
  „View runs“) idú do `footer` pred primárnu.
- **Kompatibilita:** starí consumeri dávajú obe tlačidlá do `footer` s `flex-1`. Vnútorný
  `flex` kontajner ich roztiahne rovnako ako dnes, takže vzhľad sa nezmení, kým sa nemigrujú.
- **Pinned:** footer ostáva súrodenec scrollujúceho tela v `flex-col` shell, takže je stále
  pripnutý dole.
- **Mobil:** `flex-wrap`. Pri 359px sa Delete, View runs aj Edit (`sm`) zmestia do jedného
  riadku. Ak by sa nezmestili, `footer` skupina sa zalomí pod `footerStart`, nič sa neoreže.

### 5. Recovery Groups: referenčná migrácia (Task 4)

Header:

- `title` = `selected.name`
- `meta`:
  1. `t('drawer.entity.recoveryGroup')`, nový kľúč „Recovery group“, nahrádza
     `drawer.selectedRecoveryGroup`.
  2. Status badge: `Active` → success, `Draft` → warning (existujúce kľúče).
  3. `providerResolution === 'unresolved'`: warning badge `pages.recoveryGroups.providerUnavailable`
     (existuje, „Provider unavailable“).
  4. Run fakt, podľa dát, ktoré `useLatestOrchestratorRun` už načítava (žiadny nový query):

     | Stav | Text |
     |---|---|
     | `!pushToOrchestrator` | `recoveryGroups.drawer.notOrchestrated` (nový, „Not orchestrated“) |
     | orchestrated, hook `isLoading` | položka sa vynechá (žiadne blikanie) |
     | orchestrated, hook `error` | položka sa vynechá, detail je v sekcii Orchestration |
     | orchestrated, `latestRun === null` | `recoveryRuns.table.noRuns` (existuje, „No runs yet“) |
     | `latestRun` | `recoveryGroups.drawer.lastRun` = „Last run: {{status}} · {{duration}}“, duration z `formatRunDuration` |

     `pushToOrchestrator` bez `airflowRunId` alebo bez providera (`isSelectedOrchestrated` je
     false): zobrazí sa „Not orchestrated“, rovnako ako dnešná podmienka v kóde.

Sekcie (uncontrolled, telo `key={selected.id}`):

| Sekcia | defaultOpen | summary | Obsah |
|---|---|---|---|
| Overview | **true** | `t(getWorkloadTypeLabelKey(...))`, ak `workloadType` nie je null, inak `t(getResourceTypeLabelKey(...))` | Description, Policy set, Provider ID (mono), Source category, Workload type, Resource type, Resources, Status |
| Orchestration | **false** | názov orchestration providera z `platformProviders` (dáta už sú v komponente), inak `recoveryGroups.drawer.notConfigured` (nový, „Not configured“) | Orchestration yes/no, Airflow run ID (`AirflowDagLink`), Latest run status, Last executed, Duration, `View recovery runs →` (Button `soft`, mimo `<dl>`) |
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
| **Recovery Applications** (T6) | áno | Overview (summary: platform), Orchestration (provider alebo „Not configured“), Inventory (počet tierov „Tiers: {{count}}“) | Delete / Edit iba ak sú handlery | entity • status • run fakt | – |
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
| `footer` | pravá skupina, staré `flex-1` vyzerajú ako dnes | bez `flex-1` | ostáva |
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
| Šírka default | 420px (`useResizablePanel` default, bez zmeny) |
| Resizable | 360–720px, krok 16px, `maxWidth: 92vw` (bez zmeny) |
| Mobil | `max-width: 92vw`, pri 390px je to 359px (CSS max vyhráva nad min 360). Backdrop ostáva viditeľný na zatvorenie ťuknutím. Full-width pod `sm` je otázka #4. |
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
- **Escape** zatvorí drawer. Vnorený popover (help) musí Escape zachytiť a zastaviť
  (`stopPropagation`). Shell sa nemení.
- **Close button** má `aria-label={closeLabel}` a ikona `aria-hidden`.
- **Sekcia:**
  - Skutočné `<button>` vnútri `<h3>`, takže Enter a Space fungujú natívne.
  - `aria-expanded`, `aria-controls` (iba keď existuje panel), `aria-labelledby` (nadpis) a
    `aria-describedby` (summary).
  - Panel má `role="region"` a `aria-labelledby`. Drawer má maximálne 5 sekcií, čo je v
    hraniciach APG.
  - Hlavička sekcie nesmie obsahovať interaktívne prvky (`badge` a `summary` sú iba text).
  - Interaktívny obsah je iba v tele sekcie.
- **Hierarchia nadpisov:** nadpis drawera je `h2` a sekcie `h3`. Vnútorné nadpisy (audit body,
  inventory) prejdú na `h4`, ak sú v sekcii.
- **Focus-visible:** každý interaktívny prvok má ring, žiadny `outline-none` bez náhrady.
- **Resizer:**
  - `role="separator"`, `aria-orientation`, `aria-valuenow/min/max` a ovládanie šípkami
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
- **Footer:** `footerStart` je pred `footer` a footer chýba, keď nie je zadaný ani jeden.
- **Resizer:** `resizeLabel` sa prenesie do `aria-label` separatora.

**Shared, `DetailDrawerSection.test.tsx`:**

- Predvolene je zbalená, klik ju otvorí a obsah sa mountne.
- `aria-expanded` sa prepína a `aria-controls` ukazuje na panel s `role="region"`.
- Ovládanie klávesmi: Enter aj Space (cez `userEvent`).
- `summary` a `badge` sa vyrenderujú. Prístupné meno je iba `title`, summary je v
  `aria-describedby`.
- `flush` vynechá padding.
- Uncontrolled: `defaultOpen` a `onToggle` notifikácia.
- Controlled: `open` + `onToggle`, bez vlastného stavu (rerender s `open={false}` sekciu zbalí).
- Viac sekcií otvorených naraz je nezávislých.
- Reduced motion: overí sa iba prítomnosť triedy `motion-reduce:transition-none`. CSS media sa v
  jsdom netestuje.

**`useResizablePanel.test.ts`:** `resizeLabel` sa prenesie do handle props.

**Recovery Groups, `RecoveryGroupsTable.test.tsx`:**

- `queryByRole('tab')` je null.
- Overview má `aria-expanded="true"`, Orchestration a Inventory `false`.
- Prepínanie sekcií a ich nezávislosť.
- Summary: workload label, provider name alebo „Not configured“, „VMs: N“, „Volumes: N“ a
  „No resources“.
- Meta: entity, Active alebo Draft badge, „Provider unavailable“, run fakt vo všetkých 5 stavoch
  (mock `useLatestOrchestratorRun` už v teste existuje).
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
  - šírka drawera a resize handle (myš aj šípky)
  - overflow obsahu, orezanie a pinned footer
  - rozbaľovanie sekcií a sticky hlavičky
  - dlhé názvy (truncate, akcie ostanú viditeľné) a dlhé ID (zalamovanie)
  - viac badge v meta (VMware: 3 badge, ich zalamovanie)
  - inventory obsah, mobil a dark mode

## Úlohy (index)

Detailné kritériá, súbory a commit hranice sú v `tasks/detail-drawer-model-c-todo.md`.

### Fáza 1: Shared základ

- Task 1: `DetailDrawer` header shell a API (meta, subtitle, headerActions, CloseIcon,
  resizeLabel, prechodné eyebrow a headerExtra)
- Task 2: `DetailDrawerSection`
- Task 3: `DetailRow` restyle a footer (`footerStart`)
- **Checkpoint A:** celá sada consumerov, tsc, browser na nemigrovaných drawerov

### Fáza 2: Referencia

- Task 4: Recovery Groups → Model C
- Task 5 (voliteľný, vyžaduje súhlas): shared `HelpPopover` + help v Recovery Groups (z prototypu)
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
| R1 | T1 a T3 menia vzhľad všetkých 19 drawerov naraz | Vysoký | Prechodné renderovanie `eyebrow` a `headerExtra`, staré footery vyzerajú rovnako, celá sada consumerov a browser Checkpoint A pred T4 |
| R2 | `no-deprecated` + `--max-warnings 0` | Stredný | Žiadny JSDoc `@deprecated`, obyčajný komentár + grep brána, `tsc` v T18 |
| R3 | Prístupné meno tlačidla sekcie by obsahovalo summary a rozbilo testy aj čitateľnosť | Stredný | `aria-labelledby` (title) + `aria-describedby` (summary) |
| R4 | Unmount zbalenej sekcie zmení, kedy bežia query | Stredný | Rovnaká sémantika ako dnešné tabs (render iba keď viditeľné). Pri každej migrácii overiť, či obsah nefetchuje inak (VMware snapshots/disks, inventory). Hook `useLatestOrchestratorRun` ostáva na úrovni tabuľky. |
| R5 | Sticky hlavička sekcie vs. sticky `TableHeader` vo VM disks | Stredný | V T14 je Disks `flush` a sticky header tabuľky dostane `top-11` (výška hlavičky sekcie) alebo sticky stratí. Rozhodne browser. |
| R6 | Testy viazané na DOM (FlashSystem `nextElementSibling` a `closest('div')`, Clients a Users „only button“) | Stredný | T3 zachová `div > dt + dd`. Konkrétne asercie sa upravia v tasku daného consumera. |
| R7 | Dlhý nadpis + `headerActions` v jednom riadku (Test connection) | Nízky | `min-w-0 truncate` na h2, `shrink-0` na akciách, browser s dlhými názvami |
| R8 | Mobil 390: `maxWidth 92vw` (359) < `minWidth 360` | Nízky | CSS max vyhráva a resize handle na mobile nemá zmysel. Overiť v matici. Otázka #4. |
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
4. **Mobil:** full-width drawer pod `sm` namiesto 92vw?
5. **Run fakt v meta:** dĺžka behu (plán) alebo relatívny čas spustenia („pred 14 min“)? Na
   relatívny čas dnes nie je helper.
