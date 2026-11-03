# Plán: Used in cez shared tabuľky

Dátum: 2026-11-03. Východiskový commit: `6fd813cb`.
Stav: T1–T5 implementované a overené inline 2026-11-03.
Úlohy: [policy-set-used-in-table-todo.md](policy-set-used-in-table-todo.md).
Návrh: [policy-set-used-in.html](../prototypes/policy-set-used-in.html).

## 1. Schválený smer a záväzné požiadavky

- Zachovať dve samostatné tabuľky: Recovery Groups a Recovery Applications.
- Stĺpce na všetkých šírkach v poradí **ID → Name → Open detail**. ID sa na mobile neschováva ani nepresúva pod názov; pri nedostatku šírky sa posúva tabuľka horizontálne.
- Used in dostane existujúci `NetworkIcon`. Hlavičky zdrojov môžu použiť existujúce `LayersIcon` a `GridIcon`; počty vychádzajú len z už načítaných dát.
- Vertikálne aj horizontálne sa posúva vlastný viewport každej tabuľky. Dialog, jeho hlavička/pätička, názov sekcie a navigácia zostávajú na mieste. Hlavička stĺpcov je sticky v príslušnej tabuľke.
- Produkcia musí použiť existujúce shared `DataTable` a `DataTableSurface`, nie kopírovať HTML/CSS prototypu do novej vlastnej tabuľky.
- Lazy načítanie, query keys, staleTime, invalidácie, GET/DELETE ochrana a presné URL ID zostávajú zachované. Nevytvára sa nový endpoint, API model, query key, hľadanie, stránkovanie alebo prepínač hustoty.

Plán a HTML boli schválené používateľom; následná implementácia prebehla inline. Pôvodný dokončený `policy-reference-protection-plan.md`/TODO ani iné existujúce plány sa neprepisujú.

## 2. Overený aktuálny kód

| Súbor | Relevantný stav |
| --- | --- |
| `src/features/recovery-plans/policy-sets/components/PolicySetUsage.tsx` | Dva generated query hooks, spoločný selector; dnes listy `<ul>` s Link názvom a ID. Oddelené loading/refreshing/paused/error/cached-error/empty stavy. |
| `.../policy-sets/components/PolicySetsTable.tsx` | Priamy `DetailViewSection id="used-in"` bez ikony. Overview a delete/result dialógy existujú a nemenia sa týmto návrhom. |
| `src/shared/components/data-table/DataTable.tsx` | Existujú `ColumnDef`, `isLoading`, skeleton rows, `emptyContent`, `ariaLabel`, `minWidthClassName`, density a layout. Hlavička má `sticky top-0`. Scroll wrapper má `overflow-x-auto`, `touch-pan-x`, `tabIndex=0`, ale nemá finite/fill výšku. |
| `src/shared/components/data-table/DataTableSurface.tsx` | Grid `auto minmax(0,1fr) auto`, `min-h-0 flex-1 overflow-hidden`, body `overflow-y-auto`. Toolbar je prvý slot, body druhý, pagination tretí. |
| `src/shared/components/table/Table.tsx` | Shared semantické table/thead/tbody/tr/th/td, ktoré už používa DataTable; nevytvárať ich duplikát. |
| `src/shared/components/detail-view/DetailView.tsx` | Aktívny region má `overflow-y-auto`. Sekcia renderuje header a neobmedzený children wrapper. `flush` iba upravuje padding; nezabezpečuje fill výšku ani vypnutie scrollu regionu. Pri zmene sekcie sa obsah mountuje lazy. |
| `src/shared/icons/Icons.tsx` | `NetworkIcon`, `LayersIcon`, `GridIcon` a `ExternalLinkIcon` už existujú. |

Samotné nahradenie `<ul>` komponentom DataTable nestačí: bez ohraničenej výšky sa roztiahne content a bude sa naďalej posúvať detail. Samotné vonkajšie `max-height` navyše nestačí na sticky header, ak jeho najbližší overflow ancestor ostane neobmedzený vnútorný wrapper DataTable. Preto plán explicitne určuje výškový reťazec a scroll owner.

## 3. Minimálne rozšírenia shared komponentov

### DataTable: voliteľné vyplnenie výšky

Navrhovaný nový prop `fillHeight?: boolean`, default `false`.

- Default vetva sa nemení; existujúce inventory tabuľky majú rovnaký layout a scroll ako dnes.
- Pri `fillHeight=true` má vnútorný DataTable wrapper `h-full min-h-0 overflow-auto`, umožňuje touch pohyb v oboch osiach a používa `overscroll-contain`. Nesmie mu zostať iba `touch-pan-x`, inak sa na mobile stratí vertikálny dotykový scroll.
- Sticky table header zostáva vo vnútri práve tohto ohraničeného scrolleru. Zachovať loading semantiku, focusable scroll viewport, skeletons, emptyContent a pôvodné key pravidlá.
- Used in volá `layout="scroll"`, `density="compact"`, vhodné `minWidthClassName` približne 36 rem a `fillHeight`. Žiadne selektory závislé od privátnej DOM štruktúry typu `[&>div]`.

`DataTableSurface` sa má použiť priamo bez nových props. Do `toolbar` vložiť skutočný viditeľný source header (ikona, názov, počet/status), aby body zostalo druhým grid child a dostalo `minmax(0,1fr)` výšku. Nenechať `toolbar={null}` a nespoliehať sa na implicitné umiestnenie jediného child v prvom auto riadku.

Body Surface má tú istú pridelenú výšku ako jeho DataTable child; pri bežnom zobrazení dát nemá vlastný vertikálny overflow. Skutočný scroll vykonáva iba vnútorný viewport DataTable. Geometrické browser assertions musia overiť túto vlastnosť, nie iba názov CSS triedy.

### DetailViewSection: opt-in fill layout

Navrhovaný prop `layout?: 'flow' | 'fill'`, default `'flow'`.

- `flow` zachová dnešný scrolling a padding pre všetky existujúce detaily vrátane Policy Set Overview.
- Ak aktívna sekcia používa `fill`, jej region je flex column s `overflow-hidden` a `min-h-0`; header sekcie sa nezmršťuje a children wrapper vyplní zvyšok cez `flex-1 min-h-0 overflow-hidden`.
- `PolicySetsTable` nastaví `layout="fill"` a `icon={NetworkIcon}` iba na priamom Used in child. Nie globálne na celý DetailView.
- Zachovať klávesovú navigáciu sekcií, Escape, focus trap, reset sekcie a mount iba aktívneho obsahu. Nová výška nesmie závisieť od výpočtov cez window event listeners ani pevného odhadu výšky dialogu v pixeloch.

## 4. Produkčný layout Used in

```text
DetailView: pevná výška v rámci viewportu, overflow hidden
  Header: pevný
  Body: flex-1 min-h-0
    Navigation: existujúca
    Used in region (layout=fill): flex column, overflow hidden
      Section header: pevný
      Children wrapper: flex-1 min-h-0
        PolicySetUsage: flex column / min-h-0
          Globálny stav nepoužitia, ak je potvrdený: shrink-0
          Dva zdroje: grid rows minmax(0,1fr), min-h-0, gap
            DataTableSurface: min-h-0 flex-1
              Toolbar: pevný názov zdroja, count/status
              Body: finite výška
                DataTable fillHeight: jediný skutočný scroller, obe osi
                  Sticky stĺpce: ID | Name | Open detail
  Footer Delete/Edit: pevný
```

Obe tabuľky dostanú spravodlivý podiel zostávajúcej výšky a posúvajú sa nezávisle. Dlhší obsah jednej nesmie posunúť druhú tabuľku alebo footer mimo viewportu. Krátky zoznam sa nerozťahuje pridávaním prázdnych dátových riadkov.

### Obsah stĺpcov

1. **ID:** celé presné ID, monospace, čitateľný textový token, podľa potreby zalamovanie dlhého reťazca. Bez odstraňovania `.json`, zmeny case alebo skrátenia uloženého ID.
2. **Name:** obyčajný text so zvýraznením váhou. Názov sa netvári ako ďalší odkaz; navigácia je výslovne až v treťom stĺpci.
3. **Open detail:** skutočný router Link, text a `ExternalLinkIcon`, accessible name z existujúceho `policyReferences.openDetail` s názvom objektu. Existujúce `routes.recoveryGroups`/`routes.recoveryApplications` a `URLSearchParams({ detail: consumer.id })` sa zachovajú.

Použiť existujúce `ColumnDef<ReferenceConsumer>` a `rowKey={consumer => consumer.id}`. Riadok nemá `onRowClick`; rozhranie má jednu jasnú navigačnú akciu. Pri ID rovnakom medzi group/app nehrozí kolízia, pretože ide o dva oddelené table zoznamy.

Pri krátkej šírke sa zachovajú všetky tri stĺpce v rovnakom poradí a horizontálny scroll zostáva v tabuľke. Nezaviesť starý mobile variant s ID pod Name. Celý dokument ani dialog nesmú získať horizontálny scroll.

## 5. Dáta, stavy a prístupnosť

- Query hooks a `findPolicySetConsumers` zostať v lazy child `PolicySetUsage`, nie v rodičovi kvôli ikonke alebo countu. Počet zobrazovať až keď existujú dáta; neznámy výsledok nevydávať za 0.
- Pre `isLoading` bez dát použiť existujúce DataTable skeletony. Refresh ponechá existujúce rows s informáciou o obnovovaní. Nepridávať duplicitné hlasové loading oznámenia.
- No-cache error má alert a Retry v zdrojovej ploche, nie text „nepoužíva sa“. Cached error ponechá rows s varovaním a Retry. Paused/offline aj per-source/global empty zostanú odlíšené podľa dnešnej implementácie.
- Stavové správy majú zostať v príslušnom source paneli a nesmú roztiahnuť region dialogu. Pri dlhom backend detaile overiť dostupnosť celej správy/Retry v obmedzenej ploche; samotné skrytie textu cez overflow bez dostupnej alternatívy nie je riešenie.
- Keyboard: viewport tabuľky je focusable, dá sa posúvať klávesnicou, následný Tab dosiahne Link. Focus indikátor a ciele odkazov ostávajú čitateľné aj pri sticky hlavičke.
- Header/body styling cez existujúce className/column možnosti a sémantické tokeny; ID aj malé hlavičky musia mať čitateľný kontrast. Žiadny nový CSS framework alebo balík.
- Potrebné preklady: tri nové hlavičky/viditeľný text `policyReferences.columns.id`, `.name`, `.openDetail` v EN/SK/CS. Existujúce source, state a link aria texty znovu použiť.

## 6. Konkrétne súbory a poradie

1. `DataTable.tsx` + `DataTable.test.tsx`: opt-in finite-height scroll režim; overiť aj pôvodné defaults a fit layout.
2. `DetailView.tsx` + `DetailView.test.tsx`: scoped fill sekcia, pôvodné flow správanie a mount lifecycle.
3. Tri locale JSON + nový `src/locales/policySetUsageTableTranslations.test.ts`: presné hlavičky/labely.
4. `PolicySetUsage.tsx`, `PolicySetUsage.test.tsx`, existujúci `PolicySetUsage.cache.test.tsx`, `PolicySetsTable.tsx`, `PolicySetsTable.test.tsx`: shared tabuľky, fill layout, ikona a integračné regresie. Toto je najväčšia úloha, presne päť súborov; cache test meniť iba ak sa zmenil DOM selector, zachovať jeho HTTP/cache assertions.
5. Cielené regresie, skutočný browser scroll a výsledky v týchto dvoch dokumentoch. Presný checklist a príkazy sú v TODO.

DataTableSurface, Table primitives, query hooks, reference guard, backend, generated a OpenAPI nemajú plánované zdrojové zmeny. Ak sa ukáže, že bez zmeny Surface nie je možné dosiahnuť jediný scroll owner, najskôr pomenovať konkrétny geometrický dôkaz a upraviť plán; nepridávať preventívne všeobecné styling APIs.

## 7. Overenie pri implementácii

RTL/Vitest:

- Hlavičky sú v presnom poradí ID/Name/Open detail pre oba zdroje, správne ID a názov sú v správnych bunkách. Jediná navigačná akcia používa pôvodný presný detail Link.
- Loading/error/paused/cached-error/empty/partial failure, retry iba chybného zdroja a uchovanie cached rows.
- Lazy mount bez groups/apps GET pri Overview, fresh cache reuse a existing mutation invalidation tests bez oslabenia assertions.
- Default flow DetailView a default DataTable správanie ostávajú zachované; len Used in opt-in napĺňa výšku.

Skutočný browser, pretože jsdom nemeria scroll:

- 40–100 rows v oboch tabuľkách. Wheel v groups mení iba jej scrollTop, apps zostáva na mieste a naopak. Na dne tabuľky nedochádza k scroll chaining do dialogu.
- Header/footer dialogu aj source heading majú pred/po scroll rovnaký bounding box; content region a dialog nemajú scrollTop ani vertical overflow.
- Sticky column header zostáva na hornom okraji svojho viewportu. Na mobile touch/keyboard funguje vertikálne aj horizontálne; nemení sa poradie stĺpcov.
- 320/768/1024/1440 px a aspoň jeden nízky viewport 768×600. Dlhé ID/názvy, malý/prázdny zoznam a dlhá error správa nesmú zneprístupniť Close, Delete/Edit alebo druhý source.
- Reálne kliknutie Open detail otvorí existujúci Group/App detail, focus trap a Escape ostávajú správne.

Spustiť iba pomenované affected test files, focused ESLint a raz `npm.cmd run typecheck`, pretože nové optional props sú zdieľaným typed kontraktom. Kompletnú suite ani production build nespúšťať predvolene.

## 8. Riziká

| Riziko | Ošetrenie |
| --- | --- |
| Prerušený reťazec finite výšky | `min-h-0` a flex/grid fill od aktívneho regionu až po table viewport; browser merania, nie iba CSS assertions. |
| Dva skutočné scrolly / nefunkčný sticky header | DataTable wrapper je ohraničený scroll owner; Surface body sa obsahom neroztiahne; overiť oba scrollTop a nearest overflow ancestor. |
| Regressie vo všetkých detailoch | Voliteľný section layout s default flow; shared regresné testy. |
| Mobil blokuje vertikálny touch | fill režim nepoužije existujúci `touch-pan-x` ako jediné povolené gesto. |
| Dlhá chyba spotrebuje celú výšku | Otestovať malý viewport aj dlhé správy a dostupný Retry; nepresunúť scroll na dialog. |
| Ikonka/count vyvolá eager GET | Statická existujúca ikona, counts iba z už načítaných query dát. |

## 9. Overené teraz

HTML prototyp ukazuje schválený návrh a režim **Many records** so 40 riadkami na zdroj. Produkčná implementácia používa shared komponenty, ikonu a lokalizované stĺpce ID/Name/Open detail. Query logika a ochrana mazania zostali zachované; existujúci cache test sa nemenil.

Produkčný browser probe `node node_modules/.cache/verify-policy-usage-tables.mjs` prešiel s izolovanými API fixtures (100 riadkov na zdroj), EN/SK/CS, šírkami 320/768/1024/1440, oknami 768×600 a 320×600. Overil wheel, keyboard, touch, horizontálny scroll, nezávislosť zdrojov, sticky hlavičky, pevný dialog/footer, lazy/cache správanie, presné ID v reálnych detailoch, dlhú cached/no-cache chybu, Retry a prázdne dáta. Žiadne page errors; console obsahovala iba očakávané fixture HTTP 503.

Browser odhalil kolíziu dvoch min-width tried; lokálne `w-144 min-w-full` zachováva šírku aj horizontálny scroll. Fill sekcia má kompaktnejšie odsadenie iba v opt-in režime. Cached chyba má samostatný focusable scroll pre úplnú správu/Retry a tabuľka rezervovaných 5.25rem; pri 320×600 sa nameralo 34px pre správu a 84px pre tabuľku (37px hlavička), Open detail aj Retry boli dostupné bez scrollovania dialogu. Bežný stav má jediný scroller na tabuľku.

Spoločné overenie: 106/106 testov v deviatich súboroch uvedených v TODO, `npm.cmd run typecheck`, focused ESLint všetkých deviatich zmenených TS/TSX súborov a `git diff --check` prešli. Nezávislé review nenašlo potvrdený nedostatok. Kompletná test suite ani production build sa nespúšťali.

Produkčné commity: `0a91faba` (shared fill režimy), `5352d5f5` (Used in tabuľky a preklady). Výsledky a checklist sú v súvisiacom TODO.
