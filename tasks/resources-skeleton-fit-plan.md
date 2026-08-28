# Implementačný plán: Resources skeleton bez scrollbarov

## Prehľad

Upraviť počiatočný loading skeleton na Resources obrazovkách tak, aby sa
prispôsobil dostupnej šírke a výške inventory panelu. Skeleton nesmie vytvárať
vlastný horizontálny scrollbar ani zväčšovať stránku mimo desktopového
viewportu. Načítané tabuľky, ich dáta a ich existujúce scroll správanie zostanú
bez zmeny.

Tento dokument je iba implementačný plán. Produkčný kód sa v tejto fáze
nemení.

## Overený aktuálny stav a root cause hypotéza

- `ResourceInventoryLoading` používa zdieľaný `DataTableSkeleton` bez určenia
  layoutu, preto sa aktivuje predvolený `layout="scroll"`.
- Scroll layout vytvára `overflow-x-auto` kontajner a tabuľku s vlastnou
  minimálnou šírkou, hoci placeholdery nemajú dátový dôvod zachovávať
  intrinsic šírku stĺpcov.
- Vnútorný flex prvok skeletonu nemá explicitný `min-h-0`; jeho tabuľka preto
  môže vstúpiť do `min-content` výpočtu Outlet wrappera a zväčiť Resources
  stránku namiesto prispôsobenia sa dostupnej výške.
- `ResourceInventoryLoading` používajú VMware, FlashSystem aj IBM Power Resources
  stránky. Oprava má preto pokryť všetky tri zdroje cez tento spoločný boundary.
- JSDOM nedokáže overiť skutočný overflow ani rozmery. Unit testy môžu chrániť
  iba class/prop kontrakt; konečný dôkaz musí prebehnúť v browseri.

## Rozhodnutia a hranice

1. `ResourceInventoryLoading` explicitne použije fit layout. Zdieľaný default
   `DataTableSkeleton` sa nezmení, aby ostatní konzumenti zostali kompatibilní.
2. Fit vetva vnútornej table oblasti dostane výškový containment
   (`min-h-0 overflow-hidden`) a zachová `w-full table-fixed`. Skeleton tak využije
   zostávajúci priestor bez vlastného scrollovania.
3. Toolbar, hlavička tabuľky a pagination skeleton zostanú vo svojich existujúcich
   flex pozíciách. Ak nie je dostatok priestoru pre všetkých šesť dekoratívnych
   riadkov, prebytok tela sa skryje; stránka sa kvôli placeholderom neroztiahne.
4. `DataTable`, `VirtualMachinesTable`, dátové hooky, metriky, filtre a loaded/error/
   empty stavy sú mimo scope.
5. Nebude sa pridávať pevná viewportová výška, JavaScript meranie ani nový
   responzívny breakpoint.

## Závislostný tok

```text
Browser baseline a vlastník overflowu
                 |
                 v
Failing layout-contract testy
                 |
                 v
Resources fit layout + výškový containment
                 |
                 v
Focused testy, lint a browser kontrola
                 |
                 v
Atomický commit
```

## Task tracking

Repozitár určuje GitHub Issues ako task list. Počas plánovania nebolo možné
issue vytvoriť, pretože `gh auth status` hlási neplatný token pre účet `PolnikR`.
Po obnovení autentifikácie sa majú nižšie uvedené úlohy vytvoriť ako jeden
implementačný issue; samostatný `tasks/todo.md` sa nevytvára, aby sa neporušila
repo konvencia ani neprepísal existujúci task list.

## Úloha 1: Potvrdiť rozmery a overflow baseline v browseri

**Popis:** Reprodukovať loading stav Resources pri viewporte zo screenshotu a
identifikovať presné DOM prvky, ktoré vlastnia horizontálny a vertikálny scrollbar.
Porovnať rozmery loading skeletonu s načítanou tabuľkou pri rovnakom viewporte.

**Akceptačné kritériá:**

- [ ] Loading stav reprodukuje horizontálny scrollbar vo vnútri skeletonu a
      vertikálny scrollbar Resources obsahu.
- [ ] Načítaná tabuľka sa pri rovnakom viewporte zmestí tak, ako uviedol produktový
      vlastník.
- [ ] DevTools meranie určí `clientWidth`, `scrollWidth`, `clientHeight`,
      `scrollHeight`, `min-height` a `overflow` pre skeleton section, table wrapper,
      inventory card a AppShell `main`.

**Verification:**

- [ ] Screenshot loading stavu pred opravou.
- [ ] Screenshot načítanej tabuľky pri rovnakom viewporte.
- [ ] Browser konzola bez nesúvisiacich runtime chýb, ktoré by menili layout.

**Závislosti:** žiadne

**Súbory pravdepodobne dotknuté:** žiadne

**Odhad:** XS

## Úloha 2: Pridať failing testy layout kontraktu

**Popis:** Doplniť focused testy, ktoré pred produkčnou zmenou dokazujú, že
Resources loading boundary nevyžaduje fit layout a že fit table wrapper nemá
výškový containment. Testy nemajú predstierať meranie CSS layoutu v JSDOM.

**Akceptačné kritériá:**

- [ ] Test `ResourceInventoryLoading` vyžaduje fit variant bez horizontálneho
      scroll kontajnera.
- [ ] Test `DataTableSkeleton` vyžaduje pre fit wrapper `min-h-0` a skrytý overflow.
- [ ] Nové assertions pred implementáciou zlyhajú z očakávaného dôvodu.

**Verification:**

- [ ] Spustiť focused testy pre
      `src/shared/components/data-table/DataTableSkeleton.test.tsx` a nový alebo
      existujúci test `ResourceInventoryStates`.
- [ ] Zaznamenať red stav iba nových layout assertions.

**Závislosti:** Úloha 1

**Súbory pravdepodobne dotknuté:**

- `src/shared/components/data-table/DataTableSkeleton.test.tsx`
- `src/features/discovery-inventory/resources/components/ResourceInventoryStates.test.tsx`

**Odhad:** S

## Úloha 3: Prispôsobiť Resources skeleton dostupnej ploche

**Popis:** Nastaviť fit layout na `ResourceInventoryLoading` a doplniť výškový
containment fit vetvy v `DataTableSkeleton`. Zachovať scroll variant a všetkých
loaded konzumentov bez zmeny.

**Akceptačné kritériá:**

- [ ] VMware, FlashSystem a IBM Power initial loading použijú skeleton so šírkou
      presne podľa Resources inventory panelu.
- [ ] Fit skeleton nevytvára vlastný horizontálny ani vertikálny scrollbar a
      nezvyšuje min-content výšku stránky.
- [ ] Predvolený scroll variant `DataTableSkeleton` a načítané `DataTable`
      správanie zostanú nezmenené.

**Verification:**

- [ ] Nové layout-contract testy prejdú do green stavu.
- [ ] Existujúce `DataTableSkeleton` testy zostanú zelené.
- [ ] Diff neobsahuje zmeny v Resources page, data hookoch ani loaded tabuľkách.

**Závislosti:** Úloha 2

**Súbory pravdepodobne dotknuté:**

- `src/features/discovery-inventory/resources/components/ResourceInventoryStates.tsx`
- `src/shared/components/data-table/DataTableSkeleton.tsx`

**Odhad:** S

## Checkpoint: Po úlohách 1–3

- [ ] Browser meranie potvrdilo root cause pred aplikovaním CSS zmeny.
- [ ] Red/green test cyklus pokrýva Resources boundary aj zdieľaný fit kontrakt.
- [ ] Produkčný diff je obmedzený na dva skeleton súbory.
- [ ] Nie je pridaný pevný `height`, `max-height`, viewport výpočet ani JavaScript
      meranie.

## Úloha 4: Overiť viewport, focused scope a commit

**Popis:** Overiť opravu v reálnom browseri pre všetky Resources typy, spustiť
najmenšiu automatickú kontrolu dokazujúcu zmenu a vytvoriť jeden atomický commit.

**Akceptačné kritériá:**

- [ ] Skeleton sa na VMware, FlashSystem aj IBM Power zmestí do Resources panelu
      bez vlastných scrollbarov pri desktopových viewportoch 1366x768 a 1920x1080.
- [ ] Pri úzkom alebo skutočne krátkom viewporte zostane obsah dostupný cez
      existujúce AppShell správanie; oprava nevytvorí clipping statického obsahu.
- [ ] Načítaná tabuľka, background refresh, error a empty stav nemajú vizuálnu
      ani behaviorálnu regresiu.

**Verification:**

- [ ] `npm exec vitest run src/shared/components/data-table/DataTableSkeleton.test.tsx src/features/discovery-inventory/resources/components/ResourceInventoryStates.test.tsx`
- [ ] `npm exec eslint src/shared/components/data-table/DataTableSkeleton.tsx src/shared/components/data-table/DataTableSkeleton.test.tsx src/features/discovery-inventory/resources/components/ResourceInventoryStates.tsx src/features/discovery-inventory/resources/components/ResourceInventoryStates.test.tsx --max-warnings 0`
- [ ] Browser kontrola loading a loaded stavu pri 1366x768 a 1920x1080; doplnková
      kontrola pri 1024 px šírke.
- [ ] `git diff --check` a kontrola staged diffu.
- [ ] Atomický commit, napríklad `fix: fit resource loading skeleton to inventory`.
- [ ] Plný test suite, typecheck a produkčný build sa nespúšťajú štandardne,
      pretože zmena nemení TypeScript kontrakt ani loaded komponenty. Spustia sa
      iba ak focused kontroly odhalia širší dopad.

**Závislosti:** Úloha 3

**Súbory pravdepodobne dotknuté:** žiadne ďalšie

**Odhad:** S

## Riziká a mitigácie

| Riziko | Dopad | Mitigácia |
|---|---|---|
| `overflow-hidden` iba zakryje chybu a odreže dôležitú časť skeletonu | stredný | Toolbar a pagination sú `shrink-0`; skryť sa môžu iba dekoratívne body riadky. Potvrdiť browserom. |
| Zmena fit vetvy ovplyvní budúcich konzumentov | nízky | Meniť iba explicitný fit variant, zdokumentovať jeho no-scroll kontrakt testom. |
| Vertikálny scrollbar vlastní AppShell z iného dôvodu | stredný | Najprv zmerať overflow chain; ak hypotéza neplatí, zastaviť implementáciu a aktualizovať plán. |
| Oprava Resources zmení loaded tabuľku | vysoký | Nedotýkať sa `DataTable`, `VirtualMachinesTable` ani page loaded vetiev; porovnať loaded stav pred/po. |
| Mobilné zobrazenie skryje obsah | stredný | Overiť existujúce prirodzené page scrollovanie na úzkom viewporte. |

## Finálne acceptance criteria

- Resources loading skeleton vyplní dostupnú plochu inventory panelu.
- Skeleton nemá vlastný horizontálny ani vertikálny scrollbar.
- Loading stav nevytlačí Resources stránku mimo bežného desktopového viewportu.
- Načítané tabuľky a ich scroll správanie zostanú nezmenené.
- VMware, FlashSystem aj IBM Power použijú rovnaké opravené správanie.
- Focused testy, focused ESLint, browser kontrola a `git diff --check` prejdú.
- Implementácia bude odovzdaná v jednom atomickom commite bez nesúvisiacich
  worktree zmien.

## Odhad náročnosti

**Nízka, približne 1–2 hodiny**, vrátane browser diagnostiky, red/green testu,
chirurgickej CSS/prop zmeny a focused verifikácie.

## Otvorené otázky

Žiadne produktové otázky. Implementačná hypotéza sa musí pred zmenou potvrdiť
browser meraním. GitHub issue zostáva administratívne zablokovaný do obnovenia
`gh` autentifikácie.
