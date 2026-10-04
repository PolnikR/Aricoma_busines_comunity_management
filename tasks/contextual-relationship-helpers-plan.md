# Plán: Kontextové relationship helpery

Spec: `tasks/contextual-relationship-helpers-spec.md` (contract, grafy, vizuál, a11y,
non-goals). Úlohy: `tasks/contextual-relationship-helpers-todo.md`.
Stav: schválené s úpravami 1–4 (2026-10-04), čaká na kontrolu aktualizovaných dokumentov.

## Architektúra

### Shared primitives — `src/shared/components/relationship-graph/`
Shared, lebo ich používajú dve features (providers-connectors a discovery-inventory).

| Súbor | Zodpovednosť |
|---|---|
| `relationshipGraphTypes.ts` | `RelationshipEdgeKind = 'backing' \| 'partner' \| 'problem' \| 'neutral'`, `RelationshipDirection = 'forward' \| 'backward' \| 'both'`, `RelationshipNodeTone = 'compute' \| 'storage' \| 'infrastructure' \| 'protection' \| 'problem'`, `RelationshipEdge { from, to, kind }` |
| `relationshipAdjacency.ts` | pure: `buildAdjacency(edges)`, `isNodeHighlighted`, `isEdgeHighlighted` (one-hop) |
| `RelationshipGraph.tsx` | root `@container/relationship-graph`, kontext `activeId` + adjacency, `data-dimmed` |
| `RelationshipGroup.tsx` | ohraničená skupina s eyebrow hlavičkou + `ul` riadkov |
| `RelationshipChain.tsx` | jeden riadok (`li`), grid node/connector/node/connector/node, na úzko vertikálny stack |
| `RelationshipNode.tsx` | card: icon chip podľa `tone`, názov, meta, mono ID, `role="group"`, `tabIndex=0`, hover/focus → kontext, skrytý popis; logické `entityId` pre highlight, DOM ID cez `useId()` per inštancia |
| `RelationshipConnector.tsx` | CSS čiara + hroty podľa `direction` v oboch layoutoch (wide ◀/▶, narrow ▲/▼), label, `sr-only` text, highlight podľa `from`/`to` |
| `RelationshipNote.tsx` | neutrálny stav / koniec riadku („No FlashCopy mappings“, limitation info) |
| `index.ts` | exporty |

Bez nových závislostí. Existujúce `ProviderRelationshipParts.tsx` (karty bez ikon) sa nahradí
shared primitívami a odstráni, keď ho nič nepoužíva.

### Ikony — `src/shared/icons/Icons.tsx`
- Nové: `StorageIcon` (valec podľa mockupu), `AlertTriangleIcon`. Štýl 20×20, stroke
  `currentColor` 1.5, `aria-hidden`.
- Priradenie:

  | Uzol | Ikona | Tón |
  |---|---|---|
  | compute provider (VMware, IBM Power) | `ServerIcon` | compute |
  | storage provider (FlashSystem, Hitachi) | `StorageIcon` (nová) | storage |
  | VM, LPAR | `CpuIcon` | compute |
  | backing volume | `DiskIcon` | storage |
  | pool | `LayersIcon` | infrastructure |
  | FlashSystem host | `ServerIcon` | infrastructure |
  | consistency group | `GridIcon` | protection |
  | FlashCopy, Remote Copy | `CopyIcon` | protection |
  | problem (unresolved/mismatch) | `AlertTriangleIcon` (nová) | problem |

  `NetworkIcon` sa nepoužije: NPIV/WWPN nie je uzol (host ani WWPN API nevracia), iba text.

### Provider — `src/features/providers-connectors/providers/`
- `helpers/buildSelectedProviderRelationships.ts` (pure, nový): vstup `allProviders`,
  `selectedProviderId`; interne `resolveProviderTopology`. Výstup diskriminovaný podľa
  kategórie selected:
  - `{ kind: 'compute', selected, backing: [{ relationship, partners: PartnerLink[] }] }`
  - `{ kind: 'storage', selected, consumers: BackingStorageRelationship[] (target = selected), partners: PartnerLink[], partnerSupported: boolean }`
  - `{ kind: 'missing' }` ak selected nie je v `allProviders`.
  Plus `edges: RelationshipEdge[]` pre highlight.
- `components/SelectedProviderRelationships.tsx` (nový, nahrádza
  `ProviderRelationshipsContent.tsx`): loading/error zo `allProviders`, intro text, graf.
- `ProvidersCatalogueTable.tsx`: `children` helpu dostane `selectedProviderId={selected.id}`.
- Odstrániť: `buildRelationshipRows.ts` (+ test), `ProviderRelationshipsContent.tsx` (+ test),
  `ProviderRelationshipParts.tsx` a locale kľúče, ktoré tým osirejú (`otherStorage`,
  `computeProviders`, `sr.partnerOf` ak nepoužité…). `resolveProviderTopology` a
  `BackingStorageValue` ostávajú.

### Resources — `src/features/discovery-inventory/resources/`
- `helpers/buildVmRelationships.ts` + `components/vmware/VmRelationshipHelp.tsx`
- `helpers/buildLparRelationships.ts` + `components/ibm-power/LparRelationshipHelp.tsx` (iba LPAR)
- `helpers/buildFlashVolumeRelationships.ts` + `components/flash-system/FlashVolumeRelationshipHelp.tsx`
- Každý panel odovzdá komponent ako `children` do svojho `KeyedHelpPopover` s `width="wide"`.
  Dáta: už načítaný `useVdisksByVm` výsledok (panel ho odovzdá propsom, help nevolá hook),
  `providers`, vybraná entita. `useMemo` pre view-model.
- FlashSystem: `FlashSystemResourcesPage` odovzdá plný zoznam ako **nový prop `allProviders`**
  cez `FlashSystemInventoryView` do panelu. Existujúci `providers` (FLASHCOPY providery roly pre
  filtre) si zachová význam. Bez nového requestu.

## Rozhodnutia

1. **Jeden help mechanizmus, kontextový obsah.** Grafika je `children` existujúceho
   `KeyedHelpPopover`; shell sa nemení (žiadny druhý `?`, modal, toolbar).
2. **Variant C (chains).** Riadkový layout, CSS konektory (žiadne SVG merania DOM), čo
   zjednodušuje responzivitu aj testy.
3. **Texty grafiky mimo `.help.`** (`providers.relationships.*`, `resources.relationships.*`,
   shared `relationships.*`), aby sa nezmenil locale contract helpu. Existujúce help texty
   ostávajú; upraví sa iba wording o globálnej topológii.
4. **Nič sa nedopočítava.** Unresolved/mismatch sa kreslia ako problem uzly a hrany, presne
   podľa `resolveProviderTopology`. Žiadne vymyslené resource hrany (spec §2).
5. **Storage chip = `accent-soft`** podľa mockupu (výslovná požiadavka). FlashCopy uzly
   používajú `protection` (pink) a host/pool `infrastructure` (brand), teda rovnaké rodiny ako
   drawer sekcie. Farba hrany má vlastnú sémantiku (backing/partner/problem/neutral).
6. **Help dostane dáta propsom** z panelu, nie vlastným hookom (žiadna duplicita, žiadny request
   pri hoveri; react-query by ho aj tak deduplikoval).
7. **VIOS nie je v scope.** `mapPowerInventory` VIOS zahadzuje (produktové pravidlo), helper by
   bol dead code. Existujúca VIOS vetva a testy panelu sa nemenia ani nemažú.
8. **Smer hrany je viditeľný aj na úzko** cez vertikálne hroty (forward ▼, backward ▲, both ▲▼).
9. **Logické `entityId` vs. DOM ID:** highlight podľa `entityId`, a11y ID cez `useId()` per inštancia.
10. **FlashSystem props:** `providers` (dnešný FLASHCOPY kontext) a `allProviders` (helper) sú oddelené.

## Commity / checkpointy

| # | Obsah | Dôvod |
|---|---|---|
| C0 | spec + plán + TODO | tento dokument |
| C1 | `StorageIcon`, `AlertTriangleIcon`; shared relationship primitives + adjacency + highlight; testy | základ, najvyššie riziko (interakcia) skoro |
| C2 | `buildSelectedProviderRelationships` + `SelectedProviderRelationships`, migrácia provider helpu, odstránenie global topology + osirelých kľúčov; en/sk/cs | prvé reálne použitie primitív |
| CP1 | checkpoint: testy, typecheck, **prehliadač provider helpu** (light/dark, desktop/úzko, hover/Tab, mismatch) | overiť vizuál a highlight pred rozšírením na resources |
| C3 | VMware VM helper (view-model, content, panel napojenie, locales) | |
| C4 | IBM Power LPAR helper (VIOS mimo scope) | |
| C5 | FlashSystem helper + nový prop `allProviders` | |
| C6 | wording help textov, cleanup, finálny prehliadač všetkých 4 helperov | |

Rozdelenie zodpovedá návrhu C1–C6, len s checkpointom po C2: highlight a popover layout (šírka
`wide` z drawera širokého 420 px) sa overí v prehliadači skôr, ako sa naň postavia resources.

## Test matrix

| Oblasť | Súbor | Prípady |
|---|---|---|
| Adjacency | `relationshipAdjacency.test.ts` | one-hop susedia, incidentné hrany, opakovaná entita, problem uzly |
| Shared UI | `RelationshipGraph.test.tsx` | ikona a tón chipu; problem štýl (dashed error + alert ikona); hover → active 100 %, susedia 100 %, ostatné `opacity-35`, hrany `opacity-[0.12]`, labely `opacity-15`; focus = rovnaký efekt; pointerleave/blur obnoví; mutual = 2 hroty, one-way = 1; **smer `forward`/`backward`/`both` aj v narrow variante** (vertikálne hroty prítomné a správne orientované); container triedy pre wide/narrow; `role="group"`, `tabIndex`, `aria-describedby` text; **rovnaká entita 2×: highlight na oboch výskytoch a žiadne duplicitné ID cieľov `aria-labelledby`/`aria-describedby`** |
| Provider VM | `buildSelectedProviderRelationships.test.ts` | VMware, IBM Power, FlashCopy (consumers + partner), Hitachi (bez partner lane), viac backingov, mutual, one-way (`forward` / `backward`), viac jednosmerných partnerov, unresolved, mismatch (backing aj partner), bez vzťahov, nesúvisiaci provider sa neobjaví, selected chýba |
| Provider UI | `SelectedProviderRelationships.test.tsx`, `ProvidersCatalogueTable.test.tsx` | iba okolie selected (žiadny „Other storage relationships“, žiadni nesúvisiaci), Role/Credential ostávajú, loading/error |
| VMware | `buildVmRelationships.test.ts`, `VirtualMachineDetailPanel.test.tsx` | provider→VM, volume uzly s NAA, viac volumes a storage providerov (skupiny), zero snapshots = volume + „No FlashCopy mappings“, FlashCopy uzol pri mappingoch, žiadne Hard disk→NAA hrany, loading/error/empty |
| IBM Power | `buildLparRelationships.test.ts`, `IbmPowerDetailPanel.test.tsx` | LPAR graf, viac FlashSystems, Volume ID/UID a žiadne NAA ani composite key, FlashCopy, NPIV vysvetlenie bez hostu; existujúce VIOS testy panelu ostávajú zelené bez zmeny |
| FlashSystem | `buildFlashVolumeRelationships.test.ts`, `FlashSystemVolumeDetailPanel.test.tsx`, `FlashSystemInventoryView.test.tsx` | `allProviders` sa dostane do helpu a `providers` naďalej obsahuje iba FLASHCOPY kontext, provider→pool→volume, hosty, CG, FlashCopy iba pri dátach, Remote Copy iba pri `RC_id` a bez targetu, configured partner označený ako provider-level a nie dôkaz replikácie, bez partnera |
| Help shell | `HelpPopover.test.tsx`, `KeyedHelpPopover.test.tsx` (bez zmeny, musia prejsť), nový test: Tab do uzlov drží popover otvorený, Escape z uzla zavrie iba help | |
| Locales | `detailDrawerHelpTranslations.test.ts` + nový test parity `relationships.*` / `providers.relationships.*` / `resources.relationships.*` v en/sk/cs | |
| Prehliadač | Edge CDP :9333, vlastná karta | light/dark, 1366×768 a 390 px, hover a Tab, viac uzlov, unresolved/mismatch (provider s neexistujúcim ID iba ak je v dátach; inak cez test) |

Na konci každého commitu: focused testy, eslint na zmenených súboroch, `npm run typecheck`,
`git diff --check`. Celá suite iba na konci (cross-cutting).

## Dotknuté súbory

Nové:
- `src/shared/components/relationship-graph/{relationshipGraphTypes,relationshipAdjacency}.ts`,
  `{RelationshipGraph,RelationshipGroup,RelationshipChain,RelationshipNode,RelationshipConnector,RelationshipNote}.tsx`,
  `index.ts`, testy `relationshipAdjacency.test.ts`, `RelationshipGraph.test.tsx`
- `src/features/providers-connectors/providers/helpers/buildSelectedProviderRelationships.ts` (+ test)
- `src/features/providers-connectors/providers/components/SelectedProviderRelationships.tsx` (+ test)
- `src/features/discovery-inventory/resources/helpers/{buildVmRelationships,buildLparRelationships,buildFlashVolumeRelationships}.ts` (+ testy)
- `src/features/discovery-inventory/resources/components/vmware/VmRelationshipHelp.tsx`
- `src/features/discovery-inventory/resources/components/ibm-power/LparRelationshipHelp.tsx`
- `src/features/discovery-inventory/resources/components/flash-system/FlashVolumeRelationshipHelp.tsx`
- `src/locales/relationshipTranslations.test.ts`

Upravené:
- `src/shared/icons/Icons.tsx`
- `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.tsx` (+ test)
- `src/features/discovery-inventory/resources/components/vmware/VirtualMachineDetailPanel.tsx` (+ test)
- `src/features/discovery-inventory/resources/components/ibm-power/IbmPowerDetailPanel.tsx` (+ test)
- `src/features/discovery-inventory/resources/components/flash-system/{FlashSystemVolumeDetailPanel,FlashSystemInventoryView,FlashSystemResourcesPage}.tsx` (+ testy)
- `src/locales/{en,sk,cs}.json`

Odstránené:
- `src/features/providers-connectors/providers/helpers/buildRelationshipRows.ts` (+ test)
- `src/features/providers-connectors/providers/components/{ProviderRelationshipsContent,ProviderRelationshipParts}.tsx` (+ test)

Nemenené: `HelpPopover.tsx`, `KeyedHelpPopover.tsx`, `resolveProviderTopology.ts`,
`providerTypeLabel.ts`, `src/generated/**`, BE.

## Riziká

| Riziko | Dopad | Mitigácia |
|---|---|---|
| `wide` popover (55rem) z drawera 420 px: pozícia a orezanie | Stredný | `HelpPopover` posúva panel do viewportu; overiť v CP1 v prehliadači pred resources |
| Fokusovateľné uzly v popoveri vs. focus trap drawera a Escape | Stredný | existujúce testy shellu + nový test Tab/Escape |
| Veľa uzlov (napr. 20 host mappingov) | Nízky | popover scrolluje; žiadny limit, aby sa nič neskrývalo |
| Opacity triedy a highlight sa testujú cez triedy (jsdom bez layoutu) | Nízky | `data-*` stav + triedy; vizuál v prehliadači |
| Paralelné sessions v rovnakom working tree a locale súboroch | Stredný | commitovať iba explicitné vlastné cesty, kontrolovať `git diff -U0 src/locales` |

## Otvorené otázky

Žiadne. O1 (VIOS) rozhodnuté 2026-10-04: mimo scope, doplní sa, keď bude VIOS v inventory.
