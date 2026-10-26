# Globálny vizuálny redesign dátových tabuliek – implementačný plán

Dátum: 2026-10-26
Cieľová vývojová vetva: `test` (po bezpečnom merge zo `spike/ant-design-shell`).
Schválená vizuálna referencia: `prototypes/technical-pages/index.html`, `workspace.css` a `workspace.js` (commit `ae389042`).
Tento dokument je plán; produkčný redesign zatiaľ nie je implementovaný.

## Cieľ

Zjednotiť vizuál dátových tabuliek **naprieč celou aplikáciou**, vrátane najnáročnejších Resources (VMware, IBM Power, FlashSystem), bez zmien funkcionality, dátového modelu, API ani navigácie. Odstrániť zbytočné vnorené karty a veľké odsadenia, použiť jediný existujúci hlavný rám `AppShell`, jemné deliace čiary a dostupnú šírku pre tabuľku.

Vizuál prototypu je autoritatívny **iba pre vzhľad**: plochý workspace, pás metrík, toolbary, hustota a štýlovanie tabuliek. Fixture obsah, demo navigácia, mock filtre, demo KPI, detailové panely a prototypový header nie sú funkčným zadáním. Presun používateľského menu do sidebaru je samostatná požiadavka z pôvodného plánu; nerieši sa spolu s týmto vizuálnym rezom.

## Hranice zmien

- Zachovať existujúce `AppShell`, routing, `DetailView`, editory, dialogy, filtre, vyhľadávanie, URL stav, sort, výber, stránkovanie, refresh/retry, loading/empty/error/cached stavy, metriky a ich význam, virtualizáciu, accessibility a oba režimy hustoty.
- Nezasahovať do `src/generated/**`, endpointov, hookov, dátových kontraktov, query keys ani business logiky.
- Nemení sa globálny `Card` (používa sa aj mimo tabuliek). Vizuálne odľahčenie realizovať na tabuľkových/inventory obaloch.
- Nevyžadovať prepis každej tabuľkovej stránky. Tam, kde je odlišná štruktúra alebo lokálne CSS, vykonať iba potrebné cielené úpravy.
- Zachovať existujúce vetvy a cudzie lokálne zmeny; nič nepushovať bez ďalšieho zadania.

## Shared prvky a vizuálny kontrakt

1. `src/shared/components/inventory-shell/InventoryShell.tsx`: odstrániť vnorený `Card` vizuál (rám, shadow, dvojité paddingy) **pre tabuľkový workspace**, nie plošne pre každé použitie `Card`. Zachovať štruktúru a `min-h-0`/scroll kontrakt.
2. `src/shared/components/inventory-shell/InventoryPanel.tsx` a `src/shared/components/data-table/DataTableSurface.tsx`: jedna plochá tabuľková plocha, tenké oddeľovače, toolbar/pagination mimo scrollovaného tela, bez ďalšieho zaobleného vnútorného rámu.
3. `src/shared/components/data-table/DataTable.tsx` a `src/shared/components/table/Table.tsx`: technická tabuľka podľa prototypu: jemná sticky hlavička, subtílne deliace čiary, čitateľné 12–13 px, kompaktné riadky ~32 px pri jednoriadkovom obsahu, zreteľný hover/selection/focus; nevnucovať pevnú výšku viacriadkovým záznamom. Zachovať prístupnosť a horizontálny scroll. Sticky prvý stĺpec iba ak sa overí pri všetkých typoch tabuliek; inak samostatný opt-in, nie globálny default.
4. `DataTableToolbar`, príslušné resource toolbary a `DataTablePagination`: kompaktnejšie vizuálne odsadenia, bez zmeny ovládacích akcií, modálnych filtrov a výsledkov. V prípade rozdielnych API toolbarov zjednotiť len spoločné vizuálne pravidlá.
5. Metriky `CollapsibleMetrics` a Resources: pás deliacich čiar namiesto samostatných kariet; zachovať výpočty, loading aj uložený stav zbalenia.

Pred globálnou zmenou overiť všetkých konzumentov `InventoryShell`, `DataTableSurface`, `DataTable` a nízkoúrovňového `Table`. Ak niektorý komponent slúži inej než databázovej tabuľke alebo má odlišné vizuálne požiadavky, zaviesť **jediný explicitný vzhľadový variant** (napríklad `appearance='technical'`), nie skryté selektory ani duplicitu tabuliek. Preferovať nový jednotný default iba tam, kde audit potvrdí kompatibilitu.

## Realizačné kroky (malé rezy)

### K1 – Inventarizácia a baseline
- Zoznam produkčných tabuľkových stránok, ich shared wrapperov a prípadných špecifických override štýlov.
- Screenshot aktuálneho Resources (3 typy), Platform providers, Providers, Recovery Applications/Groups, Recovery runs a aspoň jednej Identity Access tabuľky pri rovnakých viewportoch.
- Zaznamenať výšku toolbaru, tabuľky, počet viditeľných riadkov, scrolling a existujúce kritické funkcionality.

### K2 – Centrálna vizuálna zmena
- Upravovať len shared tabuľkové/inventory komponenty podľa schváleného HTML/CSS.
- Zachovať public props a správanie. Pridať appearance variant len ak je zdôvodnený konzumentmi.
- Skontrolovať dve témy, focus/hover/selection, scroll, loading a pagination na reprezentatívnej jednoduchšej stránke.

### K3 – Resources ako kompatibilitný test
- VMware `VirtualMachinesTable.tsx`: zosúladiť lokálne `headerCellClassName` a `cellClassName`, neodstrániť `min-w-260`, dlhé hodnoty ani comfortable detaily.
- IBM Power a FlashSystem: zachovať ich konfigurácie stĺpcov, minimum šírky, provider-specific filtre a dialogy.
- Porovnať skutočne viditeľné riadky a scrolling pred/po; neporušiť loading/empty/cached error, VM selection, Back/Forward a virtuálne zoznamy.

### K4 – Globálna kontrola a malé lokálne dorovnania
- Prejsť všetkých konzumentov shared tabuliek (najmä Platform providers, Providers, Recovery Groups/Applications, Policies, Recovery runs, Identity Access a Audit).
- Len stránky s vlastnými wrappermi či CSS, ktoré bránia výsledku prototypu, opraviť lokálne. V prípade samostatných tabuliek dokumentovať dôvod a aplikovať vizuálny kontrakt bez zmeny logiky.
- Nezavádzať nový paralelný Table component ani neprepisovať feature-only column definitions bez potreby.

### K5 – Overenie a odovzdanie
- Po každom malom reze: focused Vitest pre dotknuté komponenty, focused ESLint, `git diff --check`; pri zmene shared kontraktu aj `npm run typecheck`.
- Reálny browser: desktop 1440×900 a 1280×600, tablet 768 px, mobil 320/390 px, dark/light, compact/comfortable, dlhé hodnoty, horizontálny scroll, modal focus/Escape, sticky header, loading a retry.
- Vizuálne porovnať s `prototypes/technical-pages/index.html`; nezamieňať fixture obsah za reálny dátový kontrakt. Žiadne tvrdenie „vizuálne overené“ bez browser dôkazu.
- Atomické commity len vlastných súborov. Žiadny push alebo ďalší merge bez zadania.

## Akceptačné kritériá

- Celá aplikácia používa konzistentný technický vizuál dátových tabuliek tam, kde sú zdieľané tabuľkové komponenty; zostávajúce výnimky sú explicitne zdokumentované.
- Tabuľkové stránky už netvoria „Card v Card v Card“; maximálny priestor patrí dátam a metriky používajú kompaktnejšiu prezentáciu.
- Resources všetkých troch typov a ostatné tabuľky zachovávajú pôvodné funkcie a dáta; bez regresií v modaloch, URL, filtroch, stránkovaní či interakciách.
- Bez globálneho zásahu do nesúvisiacich kariet, Dashboardu či formulárov.

## Závislosť od vetiev

Najprv bezpečne preniesť **iba commitnutú históriu** `spike/ant-design-shell` do `test`: overiť ich aktuálne HEAD, worktrees, divergence a zmeny, nenechať prepísať cudzie rozpracované zmeny. Ak existuje konflikt alebo súbežná úloha zasahuje do `test`, merge zastaviť a opísať blokátor. Tento plán má byť dostupný na `test` a samotný redesign sa má vyvíjať iba na `test`.