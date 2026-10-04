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
Plán schválený používateľom s úpravami 1–5 (2026-10-04), zapracované nižšie.
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
  `warning` a `error` sa nepoužijú; `warning-*` tokeny sú zakázané.
- **Orange iba štrukturálne:** `configuration` je orange výhradne ako akcentový pruh
  a chip ikony, nikdy ako text, status ani warning badge. Gray je iba pre `technical`.
- **Ikony iba z `src/shared/icons/Icons.tsx`,** žiadna nová knižnica. Doplnia sa tam
  `DiskIcon`, `CopyIcon` a `NetworkIcon` v rovnakom štýle ako existujúce ikony (`viewBox 0 0
  20 20`, `fill="none"`, `stroke="currentColor"`, `strokeWidth 1.5`, `aria-hidden`). Prop `icon` je
  komponent (`ComponentType<SVGProps<SVGSVGElement>>`), aby veľkosť a farbu určoval shared
  komponent.
- **Každá sekcia má ikonu (rozhodnutie 2026-10-04, nahrádza pôvodný fallback):** `accent` a
  `icon` sú v `DetailDrawerSection` povinné, takže sekcia bez nich neprejde typecheckom.
  Doplnená bola aj IBM Power Backing Storage Info (`storage`/`LayersIcon`), ktorá prišla
  z vetvy `test`.

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
| `infrastructure` | výpočtové, sieťové a workload zdroje | `brand-500` / `brand-400` | Power Processor & memory, Power Network, Power Virtual I/O, Recovery Inventory ×2 |
| `storage` | disky, volumes, pooly, umiestnenie | `theme-purple-500` | VM Disks, VM Backing Storage Info, Flash Placement and capacity, Flash Pool, Power Storage |
| `protection` | kópie, snapshoty, replikácia | `theme-pink-500` | Flash Copy relationships |
| `configuration` | konfigurácia, správanie, orchestrácia (iba pruh a chip) | `orange-500` / `orange-400` | Flash State and behavior, Recovery Orchestration ×2 |
| `technical` | raw / technické dáta (jediné použitie gray) | `gray-500` / `gray-400` | Access log Request body, Response body, Raw entry |

Ikony (z `Icons.tsx`; *nové* sa doplnia v Task 1):

| Sekcia | Ikona |
|---|---|
| Overview, Summary, Identity, Request | `GridIcon` |
| Processor & memory | `CpuIcon` |
| Network | *`NetworkIcon`* |
| Virtual I/O | `ServerIcon` |
| Recovery Inventory | `ServerIcon` |
| Disks | *`DiskIcon`* |
| Backing Storage Info, Placement and capacity, Pool, Power Storage | `LayersIcon` |
| Copy relationships | *`CopyIcon`* |
| State and behavior | `SettingsIcon` |
| Orchestration | `ExecutionIcon` |
| Request body, Response body, Raw entry | `ApiIcon` |


## 3. Zmena API

```ts
// DetailDrawerSection.tsx
export type DetailDrawerSectionAccent =
  | 'overview' | 'infrastructure' | 'storage' | 'protection' | 'configuration' | 'technical'

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
- **Flex contract** (cieľ: hlavička sekcie je vždy viditeľná, skroluje iba jej obsah):

  | Prvok | Triedy |
  |---|---|
  | telo draweru pri `bodyLayout="sections"` | `flex min-h-0 flex-1 flex-col overflow-y-auto` |
  | sekcia (`section`) | `flex min-h-0 flex-col`; zatvorená `shrink-0`, otvorená `flex-1 max-h-fit` |
  | hlavička (`h3`) | `shrink-0` |
  | otvorený panel (`role="region"`) | `flex-1 min-h-0 overflow-y-auto custom-scrollbar` |
  | VMware wrapper `@container/vm-detail` | `flex min-h-0 flex-1 flex-col` (container query ostáva) |
  | Recovery wrapper `<div key>` | nahradiť `Fragment key` |

  Otvorené sekcie si delia výšku rovnakým dielom; sekcia, ktorej stačí menej, zaberie iba
  svoj obsah (`max-h-fit`) a zvyšok dostanú ostatné. Pôvodné `shrink` zmenšovalo sekcie podľa
  veľkosti, takže v prehliadači mal VM Disks na 390 px iba 20 px (zmena schválená
  používateľom 2026-10-04).

  `overflow-y-auto` na tele je iba poistka pre prípad, keď sa nezmestia ani hlavičky.
  V default (blokovom) tele sa flex triedy sekcie neprejavia, takže 13 drawerov bez
  `bodyLayout="sections"` sa správa ako dnes.

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
- Nové malé focused test súbory, ktoré overia `bodyLayout="sections"` (telo je flex
  stĺpec) a očakávané `data-accent` sekcií:
  - `FlashSystemVolumeDetailPanel.test.tsx`
  - `IbmPowerDetailPanel.test.tsx`
  - `AccessLogDetailDrawer.test.tsx`
- `Icons.tsx`: nové ikony sa overia typecheckom a renderom v testoch sekcií (`aria-hidden`
  SVG v chipe).

Prehliadač: 1366×768 a 390 px, light aj dark. Overiť VM s viacerými volumes, IBM Power
s 5 otvorenými sekciami a Access log s veľkým body.

## Riziká

| Riziko | Dopad | Mitigácia |
|---|---|---|
| IBM Power má 5 sekcií otvorených naraz, na nízkom viewporte budú tesné | Stredný | Proporcionálne zmenšenie a poistka v podobe scrollu tela; v prehliadači zvážiť menej `defaultOpen` |
| Access log `pre` má vlastné `max-h-80 overflow-auto`, takže vznikne vnorený scroll | Nízky | Ponechať; prípadne odstrániť `max-h-80` až po kontrole v prehliadači |
| Sticky `TableHeader` vo VM Disks je teraz relatívny k panelu | Nízky | Je to žiaduce; overiť v prehliadači |
| `orange` je vizuálne blízko `warning` | Stredný | Rozhodnuté: orange ostáva, iba pruh a chip, nikdy text ani badge; `warning-*` zakázané |
| Tailwind nevygeneruje dynamické triedy | Stredný | Iba statická mapa celých class stringov |
| Wrapper bez flex triedy rozbije layout sekcií | Stredný | Test `DetailDrawer` a kontrola všetkých 6 drawerov v prehliadači |

## Otvorené otázky

Žiadne. Odpovede z 2026-10-04: ikony doplniť (1), test súbory pre tri drawery založiť (2),
`configuration` ostáva orange (3).
