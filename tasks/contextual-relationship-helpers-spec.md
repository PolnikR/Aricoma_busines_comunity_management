# Spec: Kontextové relationship helpery v DetailDrawer helpe

Stav: schválené s úpravami 1–4 (2026-10-04), čaká na kontrolu aktualizovaných dokumentov.
Kód sa nemení, kým používateľ kontrolu nepotvrdí.
Overené voči: FE `spike/ant-design-shell` @ `9976978e` (čistý working tree), BE `abco-be`
`main` @ `78233ff` (čistý). Plán: `tasks/contextual-relationship-helpers-plan.md`,
úlohy: `tasks/contextual-relationship-helpers-todo.md`.

## 1. Cieľ

Existujúci `?` v hlavičke DetailDraweru (`KeyedHelpPopover` → `HelpPopover`) dostane pri
providerovi a troch resource draweroch malú **kontextovú** relationship grafiku vybranej
entity. Žiadny globálny graf, druhý trigger, modal ani nové API.

```
Shared relationship presentation (src/shared/components/relationship-graph/)
    +-- Provider contextual view-model + content
    +-- VMware VM contextual view-model + content
    +-- IBM Power partition contextual view-model + content
    +-- FlashSystem volume contextual view-model + content
```

Vizuál a interakcia: HTML mockup `provider-topology-helper-mockups.html`, **Variant C ·
Chains**. Doménové pravidlá: aktuálny FE a BE (nižšie), nie mockup (`TYPE_LABEL`,
generické „storage partner“ a demo dáta sa nepreberajú).

## 2. Potvrdený contract (FE + BE)

### Provider
- Typy (`providerCategory.ts`): compute `VMWARE`, `IBM_POWER`; storage `FLASHCOPY`, `HITACHI`;
  partner iba `FLASHCOPY`. `providerTypeLabel`: VMware, FlashCopy, Hitachi, IBM Power (nemení sa).
- `backingStorageProviderIds` (BE `provider.py:128-157`): nesie iba VMWARE/IBM_POWER, ciele
  musia existovať a byť FLASHCOPY/HITACHI, bez duplicít. Jednosmerné, many-to-many, storage
  nemá spätnú referenciu → „ktoré compute ho používajú“ sa odvodzuje na FE.
- `partnerProviderId` (BE `provider.py:91-125`): nesie iba FLASHCOPY, cieľ FLASHCOPY, nie sám
  seba. **One-way je povolené** pri uložení; zamietne sa iba konflikt (partner už ukazuje na
  tretieho). Na jeden FlashSystem teda môže ukazovať **viac** jednosmerných partnerov.
  Symetria sa vynucuje až pri recovery group `metro_mirror`.
- `/delete_provider` nekontroluje referencie → dangling ID (unresolved) sú reálny stav.
- `resolveProviderTopology` (FE) už počíta `resolved | unresolved | mismatch` a `mutual`.
- `ProvidersCatalogueTable`: `selected` je z role-filtrovaného zoznamu, vzťahy sa resolvujú
  voči `allProviders` (`role: 'all'`).

### Resource-level backing (`/vdisks_by_vm`)
- VMware: VM → VMFS NAA → FlashSystem `lsvdisk vdisk_UID`. Key = NAA.
- IBM Power LPAR: LPAR → NPIV WWPN → presne jeden FlashSystem host na array →
  `lshostvdiskmap` → vdisky; výsledky z viacerých arrays sa zlučujú. Key =
  `"{storage_provider_id}:{vdisk_id}"` (opaque, nikdy NAA).
- Oba flowy berú iba **FLASHCOPY** backing providery, **HITACHI sa preskakuje**.
- Odpoveď **neobsahuje**: FlashSystem host (meno/id), WWPN, VIOS, SCSI id, datastore na NAA,
  remote copy partnera. LPAR bez NPIV → prázdne vdisky + warning (vSCSI nepodporované).
- FE `StorageVolume`: `key`, `naa` (iba VMware), `volumeId`, `vdiskUid`, `storageProviderId`,
  pool, I/O group, status, capacity, `snapshots{snapshotCount, sourceMappings, targetMappings}`.
- VMware disky (`DiscoveredVirtualDisk`) nemajú NAA (mapper ho zahadzuje) → **mapovanie
  disk → NAA sa nedá zobraziť**.
- `mapPowerInventory` zahadzuje VIOS (`if (partitionKind === 'VIOS') return []`, produktové
  pravidlo) → VIOS drawer je z UI nedosiahnuteľný. **VIOS relationship helper nie je v scope**
  (rozhodnutie 2026-10-04). Existujúca VIOS vetva a testy `IbmPowerDetailPanel` ostávajú bez zmeny.

### FlashSystem volume (`/get_volumes`)
- `FlashSystemVolumeResource`: `providerId`, `pool{name, capacity…}`, `resolvedHostMaps
  [{hostName, clusterName, scsi_id}]`, `resolvedConsistencyGroups[{name, status}]` (FlashCopy
  CG), `FC_id`, `FC_name`, `fc_map_count`, `RC_id`, `RC_name`, `RC_change`, `copy_count`.
- **Nie je dostupné**: cieľ FlashCopy mappingu, remote copy target volume/systém,
  RC consistency group. `partnerProviderId` sa v discovery nepoužíva.
- Panel dnes nedostáva providerov; `FlashSystemInventoryView.providers` znamená FLASHCOPY
  providerov roly (`sourceProviders`) a tento význam ostáva. Helper dostane **nový explicitný
  prop `allProviders`** (plný zoznam, ktorý stránka už má), bez nového requestu.

### Help shell
- `KeyedHelpPopover({ helpKey, sections, width?, children? })`: `children` za sekciami.
- `HelpPopover`: hover (150 ms), focus, click/touch, Escape v capture fáze (zatvorí iba help),
  panel je scroll kontajner s `maxHeight` po spodok viewportu, `width="wide"` =
  `min(55rem, 100vw-2rem)`. Focus vnútri panelu ho drží otvorený.
- Locale contract: kľúče s `.help.` musia byť v en/sk/cs; `.title` pod help prefixom
  vyžaduje `.text`. Texty grafiky preto **nebudú** pod `.help.`.

## 3. Kontextové grafy

Notácia: `[uzol]`, `—label→` hrana. Farba hrany: backing = accent (modrá), partner = orange,
problém = error dashed, neutral = border-strong (súvislosť bez sémantiky backing/partner).

### Provider VMWARE / IBM_POWER (vybraný compute)
```
[Selected compute] —Backing storage→ [Storage A] —Partner ↔/→/←→ [Partner of A] (0..n)
[Selected compute] —Backing storage→ [Storage B]
[Selected compute] —Unresolved/Mismatch (dashed)→ [problem: id]
```
Jeden riadok na backing vzťah, v poradí API. Partner sa zobrazí pri každom resolved
storage, ktorý ho má (všetky partner vzťahy daného storage, smer podľa dát).
Bez backingu: `[Selected]` + „No backing storage relationships“.

### Provider FLASHCOPY (vybraný storage)
```
[Compute A] —Backing storage→ [Selected FlashSystem] —Partner→ [Partner]
[Compute B] —Backing storage→ [Selected FlashSystem]
```
Ľavý stĺpec: všetci provideri s backing referenciou na selected (problémový zdroj = mismatch
hrana). Pravý stĺpec: všetky partner vzťahy selected (mutual ↔, one-way so skutočným smerom,
unresolved/mismatch). Okolie partnera sa neťahá. Bez vzťahov: „No provider relationships“.

### Provider HITACHI
```
[Compute A] —Backing storage→ [Selected Hitachi]
```
Žiadny partner lane. Ak by dáta (legacy) obsahovali `partnerProviderId` na Hitachi,
zobrazí sa ako mismatch, nič sa nedopočítava. Bez vzťahov: „Not used as backing storage“.

### VMware VM
```
Discovered from:   [vCenter provider] —Discovers→ [VM: name, n virtual disks, power state]
Backing storage (zoskupené podľa storage providera):
  [VM] —Backing · NAA→ [Volume: name, NAA, capacity · status] —FlashCopy→ [FlashCopy: N snapshots,
                                                                         source/target mappings]
```
Bez mappingov: koniec riadku „No FlashCopy mappings“ (volume sa zobrazí). Loading/error/empty:
VM uzol ostane, pod ním neutrálny stav. Žiadne `Hard disk → NAA` hrany.

### IBM Power LPAR
```
Discovered from:   [IBM Power provider] —Discovers→ [LPAR: name, state]
Backing storage (zoskupené podľa FlashSystem providera, viac arrays je validné):
  [LPAR] —Backing · NPIV→ [Volume: name, Volume ID, Volume UID, capacity · status] —FlashCopy→ [FlashCopy]
Vysvetlenie: „Resolved through the LPAR's NPIV WWPNs and the matching FlashSystem host.“
```
Host sa nekreslí (API ho nevracia). Žiadne NAA.

### FlashSystem volume
```
Placement:     [FlashSystem provider] —Contains→ [Pool: name, capacity] —Contains→ [Volume]
Host mappings: [Volume] —Mapped to→ [Host: name, cluster, SCSI id]       (per resolvedHostMap)
Groups:        [Volume] —Member of→ [Consistency group: name, status]     (per resolved CG)
FlashCopy:     [Volume] —FlashCopy→ [FlashCopy: FC name/id, N mappings]   (iba ak fc_map_count > 0 alebo FC_id)
Remote Copy:   [Volume] —Remote Copy→ [Relationship: RC name/id]          (iba ak RC_id; target „not reported“)
Provider partnership (configured, provider-level):
               [FlashSystem provider] —Partner ↔/→→ [Partner provider]
               caption: „Configured provider partner. It does not show that this volume is replicated.“
```
Chýbajúce časti sa vynechajú; ak nie je nič, neutral „No host mappings or copy relationships“.

## 4. Vizuál (z mockupu, cez tokeny)

| Prvok | Implementácia |
|---|---|
| Node card | `rounded-xl border border-border bg-surface px-3 py-2.5`, `transition-[opacity,border-color,box-shadow] duration-150`, hover/focus `border-accent` |
| Názov / meta / ID | `text-[13px] font-semibold truncate` / `text-[11px] text-text-muted` / `font-mono text-text-subtle` |
| Icon chip | `size-6.5 rounded-lg grid place-items-center`, ikona `size-3.75` |
| Tón `compute` | `bg-surface-muted text-text-secondary` |
| Tón `storage` | `bg-accent-soft text-accent` (podľa mockupu, nie purple z drawer sekcií) |
| Tón `protection` | `bg-theme-pink-500/10 text-theme-pink-500` (FlashCopy, rovnaká rodina ako drawer `protection`) |
| Tón `infrastructure` | `bg-brand-500/10 text-brand-500 dark:text-brand-400` (host, pool) |
| Problem node | `border-dashed border-error-500 bg-surface-subtle`, chip `bg-error-50 text-error-600 dark:bg-error-500/15`, `AlertTriangleIcon`, názov mono |
| Hrana backing | `border-accent`, label `text-accent`, hrot accent |
| Hrana partner | `border-orange-500 dark:border-orange-400`, label `text-orange-600 dark:text-orange-400`; mutual = hroty na oboch stranách, one-way = iba skutočný smer. **Žiadne `warning-*`.** |
| Hrana problem | `border-dashed border-error-500`, label `text-error-600` |
| Hrana neutral | `border-border-strong`, label `text-text-muted` |
| Layout | `@container/relationship-graph`; od `@min-[40rem]` riadok = grid `minmax(0,1fr) 7.5rem minmax(0,1fr) 6.25rem minmax(0,1fr)` (mockup 120/100 px), horizontálna čiara s hrotmi ◀/▶ |
| Úzky layout | vertikálny stack, vertikálna čiara a **malé vertikálne hroty** (CSS trojuholníky ako mockup `.tip`, otočené): `forward` = hrot dole (A → B), `backward` = hrot hore (A ← B), `both` = hroty hore aj dole (A ↔ B). Smer nikdy nezmizne; žiadny horizontálny overflow (`min-w-0`, `truncate`, žiadne pevné šírky) |
| Skupina | `rounded-xl border` + hlavička `bg-surface-muted` eyebrow (mockup `.chain-group`), riadky oddelené `border-dashed` |

Farba uzla nikdy neznamená stav; stav ide textom alebo `Badge`.

## 5. Hover / focus highlight (presne podľa mockupu)

- Stav `activeId` v kontexte `RelationshipGraph`. Adjacency sa počíta z hrán view-modelu
  (`from`, `to` = stabilné entity ID, napr. `provider:<id>`, `volume:<key>`, `problem:<id>`).
- `pointerenter` / `focus` uzla → `activeId = entityId`. `pointerleave` → späť na práve
  fokusovaný uzol, inak `null`; `blur` → `null` (ak pointer nie je nad uzlom).
- Aktívny graf (`data-dimmed`):
  - uzol = active alebo priamy sused → `opacity-100`, inak `opacity-35`;
  - hrana incidentná s active → čiara aj label 100 %, inak čiara `opacity-[0.12]`, label `opacity-15`.
- One-hop, nie tranzitívne (Compute → Storage → Partner: hover Compute nechá Partnera dimnutého).
- Rovnaká entita renderovaná viackrát (napr. compute v každom riadku) sa zvýrazní všade.
- Klávesnica: `Tab` cez uzly dáva rovnaký efekt; focus ring `focus-visible:ring`.

## 6. Prístupnosť

- Uzol: `<div role="group" tabIndex={0} aria-labelledby={nameId} aria-describedby={relId}>`.
- **Logické `entityId`** (napr. `provider:flash-01`) je rovnaké pre všetky výskyty entity a
  riadi highlight. **DOM ID** pre `aria-labelledby` a `aria-describedby` sú per inštancia
  (`useId()`), takže opakovaná entita nikdy nevytvorí duplicitné ID.
  Žiadny falošný `button` (uzol nemá akciu). Vzor `role="group"` už používa
  `TopologyNodeShell`. Nie je tam `jsx-a11y` lint, rozhodnutie je vecné, nie kvôli lintu.
- Skrytý popis vzťahov (`hidden` span, ako mockup `relDescriptions`): napr.
  „backing storage IBM Flash Source 01, partner IBM Flash Target 02“ alebo „backs Production
  vCenter Source“. Generuje ho shared helper z hrán.
- Riadky sú `ul/li` s `aria-label` skupiny, konektor má `sr-only` text, viditeľný label je
  `aria-hidden` (ako dnes `RelationshipConnector`).
- Existujúce textové sekcie helpu ostávajú; grafika ich dopĺňa.

## 7. Non-goals

VIOS relationship helper (VIOS nie je v inventory; doplní sa, keď sa VIOS sprístupní),
backend refactor, Hitachi resource inventory, globálna topology stránka, graph framework
(D3, Cytoscape, canvas, WebGL), nový modal alebo backdrop, druhý help trigger, toolbar
tlačidlo, hardcoded vzťahy, vymyslené resource vzťahy (disk→NAA, FlashSystem host, RC target,
FlashCopy target vo FlashSystem view), globálny rename `providerTypeLabel`, ručné zmeny
`src/generated/**`, nový API request.
