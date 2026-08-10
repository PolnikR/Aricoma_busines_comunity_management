# Implementačný plán: Variant A v hornom resource tab bare

## Prehľad

Cieľom je použiť variant A — jeden horizontálny riadok tabov s posúvaním a ľavou/pravou šípkou pri pretečení — priamo v existujúcom hornom prepínači `VMware VMs`, `FlashSystem Volumes` a `IBM Power Partitions`, teda v riadku vyznačenom červeným rámikom na screenshote.

Každý konkrétny provider bude samostatným tabom v tomto jedinom hornom riadku. Ak bude napríklad nakonfigurovaných 10 VMware zdrojov, vznikne 10 rozlíšiteľných VMware tabov v hornom riadku. FlashSystem a IBM Power zdroje budú používať rovnaký model. Nevznikne žiadny druhý tab bar vo vnútri tabuľky.

## Presná definícia variantu A

- Všetky source taby sú v existujúcej hlavičke karty `Inventory records`.
- Zoznam je plochý a zoradený po skupinách: VMware, FlashSystem, IBM Power; v každej skupine stabilne podľa provider name a ID.
- Pri jednom providerovi daného typu ostane krátky existujúci label, napr. `VMware VMs`.
- Pri viacerých provideroch rovnakého typu bude label rozlíšený providerom, napr. `VMware VMs · Production vCenter` a `VMware VMs · DR vCenter`.
- Ak pre typ provider neexistuje, jeho základný tab zostane dostupný, aby sa zachoval existujúci empty state `No provider configured`.
- Taby sú vždy v jednom riadku a nezalamujú sa.
- Ak sa všetky zmestia, šípky sa nezobrazia.
- Pri overflow sa ľavá a pravá šípka zobrazia po stranách toho istého horného riadka; nevytvorí sa druhý riadok.
- Šípky posúvajú zoznam po častiach, na hraniciach sú disabled a aktívny tab sa automaticky odkryje.
- Touch/trackpad posúvanie a existujúce klávesy `ArrowLeft`, `ArrowRight`, `Home`, `End` zostanú funkčné.

## Scope guard

- Nepridávať provider taby pod hlavičku ani dovnútra `ResourceInventoryPanel`.
- Nevytvárať druhý tablist.
- Provider vybraný horným tabom je navigačný kontext, nie aktívny filter.
- Provider dropdowny vo filter oknách sa po zavedení source tabov odstránia, aby neexistovali dva konfliktné spôsoby výberu toho istého zdroja.
- Discovery API kontrakty sa nemenia; existujúce `providerId` sa iba odovzdá do existujúcich query hookov.
- Ostatné filtre, tabuľky, metriky a detail panely ostávajú mimo rozsahu okrem nutného resetu pri zmene source tabu.

## Architektonické rozhodnutia

- Existujúci shared `Tabs` dostane opt-in konfiguráciu, napr. `scrollControls`. Bez nej sa ostatné použitia nezmenia.
- `ResourcesPage` vytvorí jeden plochý zoznam descriptorov `{ value, resourceType, providerId, label }` z providerov. Hodnota tabu bude stabilná kombinácia resource typu a provider ID; label nebude použitý ako identita.
- URL ostane zdrojom pravdy. Navigácia bude zapisovať `resource` a `providerId` atomicky. Neplatné alebo chýbajúce provider ID sa po načítaní providerov nahradí prvým platným providerom daného typu cez `replace`.
- Výber nového source tabu resetuje stránkovanie a source-dependent lokálny stav, ale zachová nesúvisiace nastavenia, pokiaľ nie sú neplatné pre nový resource typ.
- VMware, FlashSystem a IBM Power stránky dostanú vybraný `providerId` zhora. Žiadna z nich nebude vlastniť paralelný provider selection state.
- Clear filters zachová provider z horného tabu a provider nebude započítaný do badge aktívnych filtrov.
- Pre overflow sa použije `scrollWidth > clientWidth`, aktualizácia pri scroll/resize/zmene položiek a voliteľný `ResizeObserver`.
- Accessible názvy šípok budú lokalizované v EN/SK/CS. Vizuál použije existujúce Tailwind tokeny a chevron ikony.

## Závislosti a poradie

```text
Shared Tabs overflow behavior
            |
            v
Source-tab descriptor + URL contract
            |
            v
Single top-row integration in ResourcesPage
            |
            +----------------+----------------+
            v                v                v
     VMware source      FlashSystem       IBM Power
       selection         selection         selection
            \                |                /
             +---------------+---------------+
                             v
              Responsive/browser verification
```

## Úlohy

### Úloha 1: Definovať failing testy shared overflow tabov

**Popis:** Testami najprv definovať variant A pri 10 položkách aj stav bez overflow. Geometriu scroll kontajnera v JSDOM nastaviť explicitne.

**Akceptačné kritériá:**

- [ ] Pri 10 taboch a reálnom overflow sa zobrazia lokalizovateľné previous/next tlačidlá.
- [ ] Test overí scroll, disabled stav na hraniciach a odkrytie aktívneho tabu.
- [ ] Bez overflow a bez opt-in konfigurácie sa ovládacie šípky nezobrazia.

**Overenie:**

- [ ] RED: `npm test -- src/shared/components/tabs/Tabs.test.tsx`.
- [ ] Existujúce click a keyboard testy zostanú zachované.

**Závislosti:** Žiadne.

**Pravdepodobne dotknuté súbory:**

- `src/shared/components/tabs/Tabs.test.tsx`

**Odhad rozsahu:** S (1 súbor).

### Úloha 2: Implementovať opt-in variant A v shared `Tabs`

**Popis:** Rozšíriť shared komponent o meranie overflow, šípky a automatické odkrytie selected tabu bez behaviorálnej zmeny existujúcich použití.

**Akceptačné kritériá:**

- [ ] Bez novej konfigurácie ostane správanie komponentu rovnaké.
- [ ] Pri overflow sú šípky v tom istom riadku a tab track podporuje myš, touch aj trackpad.
- [ ] WAI-ARIA tab semantika a klávesová navigácia zostanú funkčné.

**Overenie:**

- [ ] GREEN: `npm test -- src/shared/components/tabs/Tabs.test.tsx`.
- [ ] `npm run typecheck`.

**Závislosti:** Úloha 1.

**Pravdepodobne dotknuté súbory:**

- `src/shared/components/tabs/Tabs.tsx`

**Odhad rozsahu:** S (1 súbor).

## Kontrolný bod po úlohách 1–2

- [ ] Shared `Tabs` zvláda 10 tabov v jednom riadku.
- [ ] Ostatné použitia `Tabs`, vrátane detail draweru, sú nezmenené.
- [ ] Focused testy a typecheck prejdú.

### Úloha 3: Vytvoriť a otestovať model horných source tabov

**Popis:** Extrahovať čistý helper, ktorý z dostupných providerov vytvorí stabilne zoradené top-level tab descriptory pre VMware, FlashSystem a IBM Power.

**Akceptačné kritériá:**

- [ ] Jeden provider typu vytvorí krátky existujúci label; viac providerov vytvorí samostatné rozlíšené taby.
- [ ] Typ bez providera vytvorí jeden fallback tab pre existujúci no-provider stav.
- [ ] Poradie je deterministické a `value` je založené na type + provider ID, nie na labeli.

**Overenie:**

- [ ] RED/GREEN focused test helpera pre 0, 1 a 10 providerov.
- [ ] Test pokrýva duplicitné provider names s rozdielnymi ID.

**Závislosti:** Úloha 2.

**Pravdepodobne dotknuté súbory:**

- `src/features/discovery-inventory/resources/helpers/buildResourceSourceTabs.ts`
- `src/features/discovery-inventory/resources/helpers/buildResourceSourceTabs.test.ts`

**Odhad rozsahu:** S (2 súbory).

### Úloha 4: Rozšíriť URL kontrakt o konkrétny source tab

**Popis:** Upraviť existujúci resource-tab search-param hook tak, aby čítal a zapisoval dvojicu `resource` + `providerId` atomicky a vedel kanonizovať neplatný provider po načítaní zoznamu.

**Akceptačné kritériá:**

- [ ] Refresh/back/forward obnoví rovnaký resource typ aj provider.
- [ ] Kliknutie na iný source tab zmení oba parametre naraz a resetuje `page` na 1.
- [ ] Neplatné provider ID pre zvolený typ bezpečne prejde na prvý platný zdroj alebo fallback no-provider tab.

**Overenie:**

- [ ] RED/GREEN: `npm test -- src/features/discovery-inventory/resources/hooks/useResourceTabSearchParam.test.tsx`.
- [ ] Test overí zachovanie nesúvisiaceho search parametra.

**Závislosti:** Úloha 3.

**Pravdepodobne dotknuté súbory:**

- `src/features/discovery-inventory/resources/hooks/useResourceTabSearchParam.ts`
- `src/features/discovery-inventory/resources/hooks/useResourceTabSearchParam.test.tsx`

**Odhad rozsahu:** S (2 súbory).

### Úloha 5: Doplniť lokalizované popisy overflow ovládania

**Popis:** Pridať accessible previous/next labely pre source tab bar do všetkých podporovaných locales ešte pred zapojením komponentu do page.

**Akceptačné kritériá:**

- [ ] EN/SK/CS obsahujú prirodzené popisy pre predchádzajúce a nasledujúce source taby.
- [ ] JSON ostane validný a množiny locale kľúčov sú zhodné.
- [ ] Nepridávajú sa nové vizuálne texty mimo accessible názvov ovládacích prvkov.

**Overenie:**

- [ ] JSON parse všetkých troch locales.
- [ ] Projektová kontrola rovnosti locale kľúčov prejde.

**Závislosti:** Úloha 2.

**Pravdepodobne dotknuté súbory:**

- `src/locales/en.json`
- `src/locales/sk.json`
- `src/locales/cs.json`

**Odhad rozsahu:** S (3 mechanicky zhodné súbory).

### Úloha 6: Zapracovať jediný horný source tab bar v `ResourcesPage`

**Popis:** Vytvoriť tab items z descriptorov, zapnúť variant A a odovzdať selected provider do zvolenej resource page. Doplniť preklady previous/next.

**Akceptačné kritériá:**

- [ ] V DOM je iba jeden resource tablist a je v existujúcej hlavičke `Inventory records`.
- [ ] Viac VMware/FlashSystem/IBM Power providerov pridá taby do tohto istého riadka.
- [ ] Shared scroll controls používajú pripravené lokalizované accessible popisy.

**Overenie:**

- [ ] RED/GREEN: `npm test -- src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx`.
- [ ] Test s 10 VMware providermi overí 10 rozlíšiteľných VMware source tabov v hornom tabliste a nulový počet vnútorných provider tablistov.

**Závislosti:** Úlohy 3–5.

**Pravdepodobne dotknuté súbory:**

- `src/features/discovery-inventory/resources/pages/ResourcesPage.tsx`
- `src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx`
- `src/features/discovery-inventory/resources/components/SourceResourcesPageProps.ts`

**Odhad rozsahu:** M (3 súbory).

## Kontrolný bod po úlohách 3–6

- [ ] Pri 10 VMware zdrojoch vzniknú top-level taby v červeno označenom riadku.
- [ ] Nevznikne druhý riadok/provider tablist vo vnútri inventory panelu.
- [ ] URL jednoznačne identifikuje resource typ aj provider.
- [ ] Focused helper, hook a page testy prejdú.

### Úloha 7: Napájať VMware inventory na provider z horného tabu

**Popis:** Použiť selected provider z top-level tabu pre `useDiscoveryInventory`, odstrániť duplicitný provider dropdown z VMware filtrov a zachovať provider pri clear/reset filtrov.

**Akceptačné kritériá:**

- [ ] Zmena VMware source tabu odošle správny `providerId` do discovery query.
- [ ] Provider dropdown zmizne z filter okna a provider sa nepočíta do active-filter badge.
- [ ] Zmena zdroja zavrie detail drawer, zruší selected VM a resetne stránkovanie bez straty provider kontextu.

**Overenie:**

- [ ] Focused testy `VmwareResourcesPage`/`ResourcesPage` a `VirtualMachinesToolbar` prejdú.
- [ ] Test dokazuje, že clear filters zachová selected provider.

**Závislosti:** Úloha 6.

**Pravdepodobne dotknuté súbory:**

- `src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.tsx`
- `src/features/discovery-inventory/resources/components/vmware/VirtualMachinesToolbar.tsx`
- `src/features/discovery-inventory/resources/components/vmware/VirtualMachinesToolbar.test.tsx`
- `src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx`

**Odhad rozsahu:** M (4 súbory).

### Úloha 8: Napájať FlashSystem inventory na provider z horného tabu

**Popis:** Nahradiť lokálny `providerId` selected providerom z horného tabu a odstrániť provider dropdown z FlashSystem filtrov.

**Akceptačné kritériá:**

- [ ] Query načíta iba provider z aktívneho FlashSystem source tabu.
- [ ] Provider dropdown a jeho active-filter stav sú odstránené; ostatné filtre fungujú bez zmeny.
- [ ] Zmena FlashSystem source tabu resetuje source-dependent filtre a zobrazí dáta nového providera.

**Overenie:**

- [ ] Focused testy `FlashSystemResourcesPage`/`FlashSystemInventoryView` prejdú.
- [ ] Test overí provider-scoped argument `useResourceInventoryQueries`.

**Závislosti:** Úloha 6.

**Pravdepodobne dotknuté súbory:**

- `src/features/discovery-inventory/resources/components/flash-system/FlashSystemResourcesPage.tsx`
- `src/features/discovery-inventory/resources/components/flash-system/FlashSystemInventoryView.tsx`
- `src/features/discovery-inventory/resources/components/flash-system/FlashSystemInventoryView.test.tsx`

**Odhad rozsahu:** M (3 súbory).

### Úloha 9: Napájať IBM Power inventory na provider z horného tabu

**Popis:** Nahradiť lokálny `providerId` selected providerom z horného tabu a odstrániť provider dropdown z IBM Power filtrov.

**Akceptačné kritériá:**

- [ ] Query načíta iba provider z aktívneho IBM Power source tabu.
- [ ] Provider dropdown a jeho active-filter stav sú odstránené; ostatné filtre fungujú bez zmeny.
- [ ] Zmena IBM Power source tabu resetuje source-dependent filtre a zobrazí dáta nového providera.

**Overenie:**

- [ ] Focused testy `IbmPowerResourcesPage`/`PowerInventoryView` prejdú.
- [ ] Test overí provider-scoped argument `useResourceInventoryQueries`.

**Závislosti:** Úloha 6.

**Pravdepodobne dotknuté súbory:**

- `src/features/discovery-inventory/resources/components/ibm-power/IbmPowerResourcesPage.tsx`
- `src/features/discovery-inventory/resources/components/ibm-power/PowerInventoryView.tsx`
- `src/features/discovery-inventory/resources/components/ibm-power/PowerInventoryView.test.tsx`

**Odhad rozsahu:** M (3 súbory).

## Kontrolný bod po úlohách 7–9

- [ ] Každý z troch resource typov načítava provider vybraný horným tabom.
- [ ] Žiadny filter panel neobsahuje duplicitný provider selector.
- [ ] Clear filters nemení aktívny source tab.
- [ ] Všetky focused resource testy prejdú.

### Úloha 10: Overiť responzivitu, prístupnosť a regresie

**Popis:** Overiť celý flow v reálnom prehliadači s 1 aj 10 zdrojmi a spustiť projektové quality gates.

**Akceptačné kritériá:**

- [ ] Na desktopoch ostane tab bar vpravo od `Inventory records`; na úzkej šírke sa taby nezalomia.
- [ ] Pri 10 zdrojoch sú oba smery dostupné, selected tab je viditeľný a nevznikne druhý riadok.
- [ ] Kliknutie na source tab aktualizuje URL, odošle správny provider do API query a zobrazí iba jeho inventár.

**Overenie:**

- [ ] `npm run lint`, `npm run typecheck`, `npm test` a `npm run build` skončia s exit code 0.
- [ ] Browser kontrola pri 320, 768 a 1440 px bez console errorov.
- [ ] Manuálne overiť VMware, FlashSystem a IBM Power s minimálne dvoma providermi rovnakého typu alebo deterministickým mockom.

**Závislosti:** Úlohy 7–9.

**Pravdepodobne dotknuté súbory:** Žiadne, iba opravy regresií v už uvedenom scope.

**Odhad rozsahu:** S.

## Záverečný kontrolný bod

- [ ] Existuje iba jeden horný source tab bar v mieste označenom na screenshote.
- [ ] Viac providerov vytvára viac tabov priamo v tomto riadku.
- [ ] Nevznikol druhý tab bar vo vnútri tabuľky.
- [ ] Selected provider je URL-backed navigačný kontext, nie filter.
- [ ] Každý tab zobrazuje reálne API dáta z príslušného providera.
- [ ] Testy, lint, typecheck a build prešli a UI bolo overené v prehliadači.
- [ ] Používateľ schválil plán pred implementáciou.

## Riziká a mitigácie

| Riziko | Dopad | Mitigácia |
|---|---|---|
| Provider taby sa omylom vykreslia v druhom riadku | Vysoký | `ResourcesPage` bude jediné miesto tvorby tablistu; integračný test vyžaduje presne jeden resource tablist. |
| Labely providerov sa opakujú | Stredný | React key a URL identita použijú provider ID; label pri kolízii môže doplniť ID/title tooltip. |
| Invalidný provider v URL spustí nesprávny query | Vysoký | Validácia provider ID voči selected resource typu pred zapnutím query a kanonizácia cez replace. |
| Provider dropdown a source tab sa rozídu | Vysoký | Odstrániť provider dropdowny; provider bude mať jediný zdroj pravdy v hornom tabu/URL. |
| Scroll merania v JSDOM vracajú nuly | Stredný | Explicitne mockovať `clientWidth`, `scrollWidth`, `scrollLeft` a scroll metódy. |
| Zmena shared `Tabs` ovplyvní detail drawer | Vysoký | Overflow bude opt-in a existujúce testy bez konfigurácie zostanú povinné. |
| Flash/Power lokálny filter state ostane na starom providerovi | Stredný | Spraviť provider controlled z parentu a pri zmene source key resetnúť source-dependent stav. |

## Otvorené otázky

- Pred implementáciou potvrdiť finálny formát labelu pri viacerých zdrojoch. Plán odporúča `Resource type · Provider name`, pretože zachová kontext aj jednoznačnosť.
