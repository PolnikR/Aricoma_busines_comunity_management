# Redesign of pages — shared komponenty ABCO

Plán: [redesign-of-pages-plan.md](redesign-of-pages-plan.md).
Stav: implementácia nezačala. Globálny rozsah zdieľaných tabuľkových komponentov je potvrdený používateľom.

Spoločné pravidlo pre každý rez: focused ESLint zmenených TS/TSX cez `npm.cmd exec eslint -- <konkrétne súbory> --max-warnings 0`, `git diff --check`, výsledok browser kontroly a atomický commit vlastných overených zmien. Testy nepridávať iba na kopírovanie CSS tried; nové testy chránia reálny behavior kontrakt.

## T1: Audit existujúceho spoločného layoutu

**Popis:** Zmapovať všetkých konzumentov a dnešné odchýlky; vychádzať z aktuálneho existujúceho redesignu, nie predpokladať jeho absenciu.

**Akceptačné kritériá:**
- [ ] Matica obsahuje route/umiestnenie, shared obaly, lokálne override, scroll owner, virtualizáciu a konkrétne testy každého konzumenta.
- [ ] Baseline pokrýva Resources, Providers, Identity, Policy sets, Recovery runs a Audit; screenshoty a preexistujúce chyby sú označené.
- [ ] Zvolený spoločný default a nevyhnutné layoutové výnimky sú zdokumentované; žiadny nový appearance opt-in pre každú stránku.

**Overenie:** CodeGraph audit, kontrola ciest/testov, browser baseline light/dark a 1280×600; `git diff --check` dokumentácie.
**Závislosti:** Žiadne.
**Súbory (S, 2):** `tasks/redesign-of-pages-plan.md`, nový `tasks/redesign-of-pages-audit.md`.

## T2: Spoločné dátové plochy

**Popis:** Upraviť default InventoryShell a DataTableSurface tak, aby všetci konzumenti zdedili ľahký ABCO vzhľad bez nadbytočných vnorených rámov.

**Akceptačné kritériá:**
- [ ] Existujúci AppShell ostáva; spoločné obaly používajú tokeny ABCO a nerozmnožujú border/shadow/padding.
- [ ] Krátky obsah a dlhý dataset pri nízkom desktope majú dostupnú pagination; zachovaný min-h-0/min-w-0 a jediný vertikálny scroll owner.
- [ ] InventoryPanel/ResourceInventoryPanel zmenu zdedia bez kópie štýlov; mobil a vložené tabuľky ostávajú použiteľné.

**Overenie:**
- [ ] `npm.cmd exec vitest run src/shared/components/inventory-shell/InventoryShell.test.tsx src/shared/components/data-table/DataTableSurface.test.tsx src/features/discovery-inventory/resources/components/ResourceInventoryPanel.test.tsx`
- [ ] Browser krátky/dlhý zoznam na Policy sets a Resources, light/dark. Ak je potrebný nový layout prop, pokryť oba režimy pred zmenou konzumentov.

**Závislosti:** T1.
**Súbory (M, 4):** `InventoryShell.tsx`, `InventoryShell.test.tsx` v `src/shared/components/inventory-shell/`; `DataTableSurface.tsx`, `DataTableSurface.test.tsx` v `src/shared/components/data-table/`.

## T3: Spoločná tabuľka a loading vzhľad

**Popis:** Upraviť default typografiu, hlavičku, bunky, hover/selection/focus a skeleton pre všetkých konzumentov DataTable.

**Akceptačné kritériá:**
- [ ] Jemná hlavička a oddeľovače, čitateľný text a konzistentná hustota v light/dark; fit/scroll layout a viacriadkové hodnoty fungujú.
- [ ] Zachované selection keys, column alignment, hideInCompact a klávesnicové akcie; skeleton zodpovedá tabuľke bez novej zmeny rozmerov pri načítaní.
- [ ] Žiadne feature-specific odznaky alebo dátové pravidlá v shared tabuľke; nízkoúrovňový Table nezíska plošné štýly mimo auditu.

**Overenie:**
- [ ] `npm.cmd exec vitest run src/shared/components/data-table/DataTable.test.tsx src/shared/components/data-table/DataTableSkeleton.test.tsx src/shared/components/data-table/DataTableRequestState.test.tsx`
- [ ] Browser Providers + Identity: viacriadkové bunky, statusy, tabulárne čísla, loading a focus.

**Závislosti:** T2.
**Súbory (M, 4):** `src/shared/components/data-table/DataTable.tsx`, `DataTable.test.tsx`, `DataTableSkeleton.tsx`, `DataTableSkeleton.test.tsx` v rovnakom adresári.

## Checkpoint A: Spoločný základ

- [ ] T1–T3 doložené; nový vzhľad je viditeľný na viacerých existujúcich stránkach bez lokálnej migrácie.
- [ ] Scroll, loading, selection a obe témy zachované; screenshot výsledku pripravený na review.
- [ ] Vlastné overené zmeny commitnuté.

## T4: Spoločný toolbar a hustota

**Popis:** Zjednotiť rozostupy a vzhľad search, filtrov, segmentov a density ovládača cez ich existujúce shared komponenty.

**Akceptačné kritériá:**
- [ ] Toolbar zodpovedá hierarchii HTML v ABCO tokenoch; mobile sa zalamuje bez skrytých akcií.
- [ ] Zachované všetky filter callbacky, apply/cancel/clear, disabled/pending, segmenty, preklady a oba density režimy.
- [ ] Globálny Input/Button nemení vzhľad formulárov; tabuľkový vzhľad sa rieši na príslušnej kompozičnej vrstve.

**Overenie:**
- [ ] `npm.cmd exec vitest run src/shared/components/data-table/DataTableToolbar.test.tsx src/shared/components/data-table/useTableState.test.ts`
- [ ] Browser Resources filter dialog a Identity bez filtra: Tab, Enter/Space, Escape a návrat focusu.

**Závislosti:** T3.
**Súbory (M, 3):** `src/shared/components/data-table/DataTableToolbar.tsx`, `src/shared/components/data-table/DataTableToolbar.test.tsx`, `src/shared/components/table/RowDensityToggle.tsx`.

## T5: Spoločná hlavička a pagination

**Popis:** Dorovnať tabuľkové akcie a pätičku bez zmeny ich funkcionality alebo globálneho vzhľadu netabuľkových stránok.

**Akceptačné kritériá:**
- [ ] TableToolbar a DataTablePagination používajú jednotné rozostupy a čitateľnosť ABCO; PageHeader funkčný kontrakt ostáva.
- [ ] Počet výsledkov, page size, navigácia strán, refresh/pending a lokalizácia sa nemenia; krátky aj dlhý zoznam ostávajú ovládateľné.
- [ ] Shared kontrola typov prejde; prípadná nutnosť upraviť PageHeader je najprv auditovaná a rozdelená na samostatný rez do 5 súborov.

**Overenie:**
- [ ] `npm.cmd exec vitest run src/shared/components/table/TableToolbar.test.tsx src/shared/components/page/PageHeader.test.tsx src/shared/components/data-table/DataTablePagination.test.tsx`
- [ ] `npm.cmd run typecheck`; browser page size/next/previous/search reset a nízky viewport.

**Závislosti:** T4.
**Súbory (M, 4):** `src/shared/components/table/TableToolbar.tsx`, `TableToolbar.test.tsx` v rovnakom adresári; `src/shared/components/data-table/DataTablePagination.tsx`, `DataTablePagination.test.tsx` v rovnakom adresári.

## Checkpoint B: Shared redesign pripravený

- [ ] T4–T5 overené; všetci shared konzumenti dostávajú nový default, nejde o vzhľad vyhradený Policy sets.
- [ ] Funkčné kontrakty a preklady zachované, bez novej závislosti či API zmeny.
- [ ] Vlastné overené zmeny commitnuté; ďalšia fáza rieši iba preukázané lokálne odchýlky.

## T6: Odstránenie Policy sets vizuálnej výnimky

**Popis:** Odstrániť posledné lokálne štýly, ktoré by prebíjali centrálny redesign, a overiť zdedený výsledok.

**Akceptačné kritériá:**
- [ ] PolicySetsPage.module.css už neprebíja shared hlavičku/riadky; ak nezostane potrebné pravidlo, odstrániť súbor aj import.
- [ ] Existujúci počet politík, search, density, CRUD, JSON a katalogové stavy fungujú; nevnášať nové odznaky/filter z prototypu.
- [ ] Bez novej lokálnej kópie shared layoutu alebo štýlov; pagination a post-delete refresh sú zachované.

**Overenie:**
- [ ] `npm.cmd exec vitest run src/features/recovery-plans/policy-sets/pages/PolicySetsPage.test.tsx src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx src/features/recovery-plans/policy-sets/pages/PolicySetsRefetch.test.tsx`
- [ ] Browser JSON vs. detail vrátane klávesnice a refresh/error stavov.

**Závislosti:** T5.
**Súbory (M, najviac 4):** `PolicySetsPage.tsx`, `PolicySetsPage.module.css`, `PolicySetsPage.test.tsx` v `src/features/recovery-plans/policy-sets/pages/`; podľa potreby `src/features/recovery-plans/policy-sets/components/PolicySetsTable.tsx`.

## T7: VMware kompatibilita

**Popis:** Zosúladiť iba tie lokálne header/cell overrides VMware tabuľky, ktoré bránia spoločnému vzhľadu.

**Akceptačné kritériá:**
- [ ] Typografia/rozostupy zodpovedajú shared pravidlám, zachované min-width, fit/scroll kontrakt a comfortable obsah.
- [ ] Provider tabs, filtre, URL Back/Forward, metriky, selection a virtualizácia (kde prítomná) nemenia správanie.
- [ ] Viac riadkov a dlhé hodnoty na nízkom viewporte neorežú akcie ani pagination.

**Overenie:**
- [ ] `npm.cmd exec vitest run src/features/discovery-inventory/resources/components/vmware/VirtualMachinesTable.test.tsx src/features/discovery-inventory/resources/components/ResourceInventoryShell.test.tsx src/features/discovery-inventory/resources/components/ResourceInventoryPanel.test.tsx`
- [ ] Browser VMware v oboch hustotách/témach; neprepísať testy tak, aby len akceptovali stratu informácie.

**Závislosti:** T5; sekvenčne po T6 kvôli stabilnej baseline.
**Súbory (S, 2):** `src/features/discovery-inventory/resources/components/vmware/VirtualMachinesTable.tsx`, `VirtualMachinesTable.test.tsx` v rovnakom adresári. Ak sa vzhľad dedí bez konfliktu, iba overiť a nemení sa kód.

## T8: Power a FlashSystem kompatibilita

**Popis:** Overiť a prípadne minimálne dorovnať platformové inventory views po shared zmene.

**Akceptačné kritériá:**
- [ ] Obe platformy používajú nový spoločný vizuál bez kópie tabuľky; odchýlky majú zdokumentovaný dôvod.
- [ ] Zachované platformové stĺpce, filtre, detailové akcie a hustota; žiadne zmeny API/dát.
- [ ] Scroll a prípadná virtualizácia majú správne merané rozmery aj po zmene typografie.

**Overenie:**
- [ ] `npm.cmd exec vitest run src/features/discovery-inventory/resources/components/ibm-power/PowerInventoryView.test.tsx src/features/discovery-inventory/resources/components/flash-system/FlashSystemInventoryView.test.tsx`
- [ ] Browser Power a FlashSystem: dlhé hodnoty, empty/loading/cached-error a nízky viewport.

**Závislosti:** T7.
**Súbory (M, najviac 4):** `PowerInventoryView.tsx`, `PowerInventoryView.test.tsx` v `src/features/discovery-inventory/resources/components/ibm-power/`; `FlashSystemInventoryView.tsx`, `FlashSystemInventoryView.test.tsx` v `src/features/discovery-inventory/resources/components/flash-system/`. Bez preukázanej odchýlky žiadne zmeny.

## Checkpoint C: Zložité stránky kompatibilné

- [ ] T6–T8 overené; Resources všetkých troch platforiem aj Policy sets zachovávajú funkcie.
- [ ] Lokálne zásahy odstránili konflikty, nevytvorili nový paralelný štýl.
- [ ] Overené zmeny commitnuté; rozdiely oproti baseline zdokumentované.

## T9: Úplné pokrytie ostatných konzumentov

**Popis:** Uzavrieť maticu z T1 pre Providers/Credentials, Identity, Recovery Groups/Applications/Policies/Runs, Audit a všetkých ďalších nájdených konzumentov. Nie je to hromadná prepisovacia úloha.

**Akceptačné kritériá:**
- [ ] Každý konzument má záznam zdedeného vzhľadu a kontroly; Users/Clients/Roles ani vložené tabuľky sa nevynechali.
- [ ] Každá zistená výnimka má pred úpravou vlastný očíslovaný rez T9.x s konkrétnymi súbormi (max. 5), kritériami a explicitným focused test príkazom z auditu. Takýto rez nevyžaduje nové povolenie rozsahu.
- [ ] Všetky T9.x sú vykonané a overené pred uzavretím T9; bez výnimky sa feature súbory nemenia.

**Overenie:**
- [ ] Browser matica a konkrétne feature testy uvedené v T1/T9.x; žiadny všeobecný npm test ako náhrada výberu scope.
- [ ] `git diff --check` a kontrola úplnosti matice voči CodeGraph zoznamu.

**Závislosti:** T8.
**Súbory (S, 2 pre audit):** `tasks/redesign-of-pages-audit.md`, tento task list. Kódové výnimky patria iba do samostatných T9.x, nie do neobmedzeného spoločného diffu.

## T10: Browser QA a odovzdanie spoločného redesignu

**Popis:** Doložiť celkovú konzistenciu a interakcie reálnym browser overením naprieč rodinami stránok.

**Akceptačné kritériá:**
- [ ] Každá rodina z plánu má screenshot a scenáre; všetky layoutové typy pokrývajú 320/768/1024/1440 px aj 1280×600, obe témy/hustoty a krátky/dlhý dataset.
- [ ] Overené focus/keyboard/Escape, kontrast, scroll, loading/empty/no-match/fatal/cached error/retry a relevantné akcie; bez nových runtime/console/network chýb.
- [ ] Evidence uvádza host, fixture vs. reálne dáta, presné príkazy a limity. Bez dostupného browsera zostáva vizuálne overenie otvorené.

**Overenie:**
- [ ] Skutočný browser, screenshots, computed styles a accessibility tree. HTTP 200/jsdom nie sú browser dôkaz.
- [ ] Po opravách zopakovať iba relevantné focused kontroly; finálny diff a commity obsahujú iba túto prácu. Plný build/suite len pri zdôvodnení dopadu.

**Závislosti:** T9 a všetky vzniknuté T9.x.
**Súbory (S, 2):** nový `tasks/redesign-of-pages-browser-qa.md`, tento task list. Opravy z QA rozdeliť na malé samostatné rezy podľa ich skutočného scope.

## Checkpoint D: Dokončenie

- [ ] Centrálny redesign je viditeľný naprieč všetkými konzumentmi; výnimky explicitné, bez otvorených lokálnych regresií.
- [ ] Funkčné a browser overenie doložené, používateľ môže posúdiť výsledok na Resources, Providers, Identity a ďalších rodinách.
- [ ] Overené zmeny atomicky commitnuté; bez push/merge, cudzích zmien alebo nepravdivého tvrdenia o browser QA.
