# Plán: DetailDrawer sekcie – samostatný scroll a farebná identita (variant A)

## Prehľad

Dve zmeny v shared `DetailDrawer` / `DetailDrawerSection`, nasadené do všetkých 6 drawerov,
ktoré používajú sekcie:

1. **Scroll sekcií:** telo draweru sa neskroluje ako celok. Hlavičky sekcií ostávajú vždy
   viditeľné a skroluje iba obsah otvorenej sekcie, ktorý pretečie. Viac otvorených sekcií si
   rozdelí výšku a každá skroluje samostatne.
2. **Variant A:** farebný ľavý pruh hlavičky a ikona vo farebnom chipe. Farba vyjadruje **typ
   sekcie, nie stav**. Používa sa malá spoločná paleta 6 akcentov s pevným významom.

Schválený vizuál: prototyp `drawer-sections-proposal.html`, variant A (2026-10-04).
Backend, API ani `src/generated/**` sa nemenia.

## Rozhodnutia

- **Rozsah (potvrdené používateľom):** nový scroll aj akcenty a ikony vo všetkých 6
  draweroch so sekciami. 13 drawerov bez sekcií ostáva bez zmeny.
- **Scroll je opt-in na `DetailDrawer`:** `bodyLayout="sections"`. Default `'scroll'` ostáva
  dnešné správanie, takže drawery bez sekcií sa nemenia.
- **Shared komponent vlastní celý vizuál:** pruh, chip, veľkosť ikony, hover/focus/open
  stav a dark mode. Feature drawer iba vyberá `accent` a `icon` a neskladá vlastné
  border/background triedy.
- **Akcent je sémantický, nie farebný:** prop sa volá podľa významu (`storage`), nie podľa
  farby (`purple`). Rovnaký význam má tak všade rovnaký vizuál a farbu možno neskôr zmeniť
  na jednom mieste.
- **Iba existujúce tokeny, žiadne hex:** `accent`, `brand-*`, `theme-purple-500`,
  `theme-pink-500`, `orange-*`, `gray-*` z `src/index.css`. Statusové rodiny `success`,
  `warning` a `error` sa nepoužijú.
- **Ikony iba z `src/shared/icons/Icons.tsx`,** žiadna nová knižnica. Prop `icon` je
  komponent (`ComponentType<SVGProps<SVGSVGElement>>`), aby veľkosť a farbu určoval shared
  komponent.
- **Fallback:** sekcia bez `accent` a `icon` vyzerá ako dnes (bez pruhu a chipu). Ikona bez
  akcentu dostane neutrálny chip.

## 1. Drawery a ich sekcie

| Drawer | Súbor | Sekcie (default otvorené *) |
|---|---|---|
| VMware VM | `resources/components/vmware/VirtualMachineDetailPanel.tsx` | Overview*, Disks, Backing Storage Info |
| FlashSystem volume | `resources/components/flash-system/FlashSystemVolumeDetailPanel.tsx` | Identity*, Placement and capacity*, State and behavior, Copy relationships, Pool |
| IBM Power partition | `resources/components/ibm-power/IbmPowerDetailPanel.tsx` (`PartitionSection`) | Summary*, Processor & memory*, Network*, Storage*, Virtual I/O* |
| Access log | `platform-administration/audit/components/AccessLogDetailDrawer.tsx` (`BodySection`) | Request*, Request body, Response body / Raw entry* |
| Recovery application | `recovery-plans/recovery-applications/components/RecoveryApplicationsTable.tsx` | Overview*, Orchestration, Inventory |
| Recovery group | `recovery-plans/recovery-groups/components/RecoveryGroupsTable.tsx` | Overview*, Orchestration, Inventory |

Pri IBM Power je `defaultOpen` všetkých 5 sekcií. Potvrdí sa v prehliadači, či si rozdelia
výšku čitateľne (pozri riziká).

## 2. Paleta akcentov (6) a ikony

| `accent` | Význam | Token (light / dark) | Sekcie |
|---|---|---|---|
| `overview` | identita, súhrn, všeobecné údaje | `accent` | VM Overview, Flash Identity, Power Summary, Access log Request, Recovery Overview ×2 |
| `compute` | výpočtové a workload zdroje | `brand-500` / `brand-400` | Power Processor & memory, Power Network, Power Virtual I/O, Recovery Inventory ×2 |
| `storage` | disky, volumes, pooly, umiestnenie | `theme-purple-500` | VM Disks, VM Backing Storage Info, Flash Placement and capacity, Flash Pool, Power Storage |
| `protection` | kópie, snapshoty, replikácia | `theme-pink-500` | Flash Copy relationships |
| `configuration` | konfigurácia, správanie, orchestrácia | `orange-500` / `orange-400` | Flash State and behavior, Recovery Orchestration ×2 |
| `technical` | raw / technické dáta | `gray-500` / `gray-400` | Access log Request body, Response body, Raw entry |

Ikony (všetky existujú v `Icons.tsx`):

| Sekcia | Ikona |
|---|---|
| Overview, Summary, Identity, Request | `GridIcon` |
| Processor & memory | `CpuIcon` |
| Network | `PlugIcon` |
| Virtual I/O | `ServerIcon` |
| Recovery Inventory | `ServerIcon` |
| Disks | `ServerIcon` |
| Backing Storage Info, Placement and capacity, Pool, Power Storage | `LayersIcon` |
| Copy relationships | `RefreshIcon` |
| State and behavior | `SettingsIcon` |
| Orchestration | `ExecutionIcon` |
| Request body, Response body, Raw entry | `ApiIcon` |

V `Icons.tsx` chýbajú ikony disku, databázy, kópie a siete. Mapovanie vyššie preto používa
najbližšie existujúce ikony (otvorená otázka 1).

## 3. Zmena API

```ts
// DetailDrawerSection.tsx
export type DetailDrawerSectionAccent =
  | 'overview' | 'compute' | 'storage' | 'protection' | 'configuration' | 'technical'

interface DetailDrawerSectionProps {
  title: string
  summary?: ReactNode
  badge?: ReactNode
  defaultOpen?: boolean
  flush?: boolean
  accent?: DetailDrawerSectionAccent                // nové, voliteľné
  icon?: ComponentType<SVGProps<SVGSVGElement>>     // nové, voliteľné
  children: ReactNode
}

// DetailDrawer.tsx
interface DetailDrawerProps {
  // ...
  // 'sections': hlavičky sekcií ostávajú na mieste, skroluje obsah otvorenej sekcie.
  bodyLayout?: 'scroll' | 'sections'                // nové, default 'scroll'
}
```

Implementácia:

- Mapa `accent` → statické Tailwind triedy pre pruh (`before:` 3 px na ľavom okraji
  hlavičky, 35 % opacity pri zatvorenej a 100 % pri otvorenej sekcii), chip (`bg-*/10`,
  v dark mode `/15`, `text-*`) a jemné pokračovanie pruhu popri obsahu otvorenej sekcie.
  Pri sekcii je `data-accent` kvôli testom a debugovaniu.
- Ikona je `aria-hidden` v chipe 24×24, samotná ikona má 14 px. Accessible name tlačidla
  ostáva iba `title`.
- Sekcia je vždy `flex min-h-0 flex-col`: zatvorená `shrink-0`, otvorená `shrink`. Panel
  má `min-h-0 overflow-y-auto custom-scrollbar`. V starom (blokovom) tele sa tieto triedy
  neprejavia.
- Pri `bodyLayout="sections"` je telo `flex min-h-0 flex-1 flex-col overflow-y-auto`.
  Sekcie sa zmenšia do dostupnej výšky. `overflow-y-auto` na tele ostáva iba ako poistka,
  ak sa hlavičky nezmestia.
- Wrappery v telách drawerov musia byť súčasťou flex reťazca:
  - VM `<div key className="@container/vm-detail">` dostane `flex min-h-0 flex-col`
    (container query musí ostať).
  - Recovery `<div key>` sa zmení na `Fragment key`.

## 4. Testy

Shared:

- `DetailDrawerSection.test.tsx`
  - `accent` nastaví `data-accent` a zobrazí chip s ikonou (`aria-hidden`)
  - názov tlačidla ostáva iba `title`, aj keď je zadaná ikona
  - bez `accent` a `icon`: žiadny chip ani `data-accent` (fallback)
  - `icon` bez `accent`: neutrálny chip
  - otvorený panel je scroll kontajner (`overflow-y-auto`, `min-h-0`), zatvorený sa
    nerenderuje (existujúce správanie)
- `DetailDrawer.test.tsx`
  - default `bodyLayout`: telo ostáva dnešný scroll kontajner
  - `bodyLayout="sections"`: telo je flex stĺpec a sekcie sú jeho priame deti

Feature (iba kde test súbor existuje):

- `VirtualMachineDetailPanel.test.tsx`, `RecoveryApplicationsTable.test.tsx`,
  `RecoveryGroupsTable.test.tsx`: sekcie majú očakávaný `data-accent`
- FlashSystem, IBM Power a Access log nemajú test súbor drawera. Overia sa cez typecheck a
  v prehliadači; nové test súbory sa iba kvôli akcentom nezakladajú (otvorená otázka 2).

Prehliadač: 1366×768 a 390 px, light aj dark. Overiť VM s viacerými volumes, IBM Power
s 5 otvorenými sekciami a Access log s veľkým body.

## Riziká

| Riziko | Dopad | Mitigácia |
|---|---|---|
| IBM Power má 5 sekcií otvorených naraz, na nízkom viewporte budú tesné | Stredný | Proporcionálne zmenšenie a poistka v podobe scrollu tela; v prehliadači zvážiť menej `defaultOpen` |
| Access log `pre` má vlastné `max-h-80 overflow-auto`, takže vznikne vnorený scroll | Nízky | Ponechať; prípadne odstrániť `max-h-80` až po kontrole v prehliadači |
| Sticky `TableHeader` vo VM Disks je teraz relatívny k panelu | Nízky | Je to žiaduce; overiť v prehliadači |
| `orange` je vizuálne blízko `warning` | Stredný | Iba pruh a chip, nikdy text ani badge; alternatíva `gray` (otvorená otázka 3) |
| Tailwind nevygeneruje dynamické triedy | Stredný | Iba statická mapa celých class stringov |
| Wrapper bez flex triedy rozbije layout sekcií | Stredný | Test `DetailDrawer` a kontrola všetkých 6 drawerov v prehliadači |

## Otvorené otázky

1. Doplniť do `Icons.tsx` 3 chýbajúce ikony v rovnakom štýle (`DiskIcon` pre Disks,
   `CopyIcon` pre Copy relationships, `NetworkIcon` pre Network)? Je to ten istý icon
   systém, nie nová knižnica. Inak ostane mapovanie iba z existujúcich ikon.
2. Stačí pri FlashSystem, IBM Power a Access log overenie typecheckom a v prehliadači, alebo
   pre ne založiť malé test súbory?
3. `configuration` = `orange`, alebo radšej `gray` (a `technical` tiež `gray`)?
