# Plán: Responzívna VMware tabuľka

## Cieľ a rozsah

Na stránke Discovery & Inventory / Resources udržať krátke údaje VMware tabuľky v jednom riadku aj pri menšej dostupnej šírke. Primerane zmenšiť hlavné písmo a odsadenie buniek bez straty čitateľnosti. Na širokej obrazovke zachovať súčasný vzhľad.

Používateľ odsúhlasil samostatné súbory plánu a checklistu, pretože `tasks/plan.md` a `tasks/todo.md` obsahujú inú nedokončenú prácu. Následne požiadal vykonať plán a commitnúť zmeny aj po oznámení nedostupného prehliadača. Checklist tejto úlohy je [vmware-table-responsive-todo.md](vmware-table-responsive-todo.md).

## Implementácia a odchýlka od merania

- Implementované v aktuálnom pracovisku podľa požiadavky vykonať plán inline. Ostatné rozpracované súbory nie sú súčasťou zmeny.
- Browser nástroj vracia prázdny zoznam a `Browser is not available` pre iab aj Edge. T1 meranie a vizuálne časti T3 zostávajú neoverené.
- Predbežný prah je 80 rem dostupnej šírky kontajnera (1280 px pri základnom písme 16 px). Pod ním je hlavný text 12 px a odsadenie 8 px; od prahu text 13 px a odsadenie 12 px. Je to implementačný odhad na neskoršie browser overenie, nie nameraná hodnota.
- Pomenovaný kontajner je umiestnený mimo horizontálne posúvanej tabuľky, aby sa dotaz riadil viditeľným priestorom, nie minimálnou šírkou tabuľky. Existujúce `min-w-260` a posúvanie zostávajú.
- Názov VM dedí veľkosť bunky. Compute, Connection a Power majú cielené `whitespace-nowrap`; tagy aj doplnkové riadky Comfortable ostávajú nezmenené.
- Existujúce skrátenie názvov/OS/placement a prístup k detailu zostávajú. Provider nedostal nové obmedzenie šírky, keďže detail nezobrazuje jeho plnú hodnotu.
- Konzumentom je `VmwareResourcesPage`, používaný v Resources aj Resources ISE. Shared DataTable ani StateCell sa nemenia.

## Overený východiskový stav

- `src/features/discovery-inventory/resources/components/vmware/VirtualMachinesTable.tsx` používa `min-w-260`, hlavné písmo 13 px, hlavičku 11 px a vodorovné odsadenie `px-3`.
- `src/features/discovery-inventory/resources/config/vmwareColumns.tsx` má explicitné písmo 13 px aj na názve VM; samotná zmena písma bunky ho preto nezmenší.
- Hlavný údaj Compute nemá zákaz zalamovania. Comfortable zámerne pridáva druhý riadok s diskami a ďalšie metadáta v iných stĺpcoch.
- Dlhé názvy už čiastočne používajú `truncate` a `title`; tagy používajú `flex-wrap`.
- Shared `DataTable` poskytuje vodorovné posúvanie. Nie je potrebný nový tabuľkový komponent ani zmena dátových kontraktov.
- Rozdiel medzi snímkami môže ovplyvňovať zoom alebo škálovanie systému; príčina rozdielnej mierky nebola zmeraná.

## Rozhodnutia

1. Rozsah je VMware tabuľka a definície jej stĺpcov. Nemeniť globálne písmo, sidebar, ostatné typy inventory ani API.
2. Reagovať na dostupnú šírku kontajnera tabuľky, prednostne lokálnou CSS container query. Prah určiť meraním v T1, nie podľa fyzického rozlíšenia monitora. Nepoužívať JavaScript na meranie šírky, ak postačí CSS.
3. Pri užšom priestore znížiť hlavný text z 13 na 12 px a vodorovné odsadenie z 12 na 8 px. Hlavičky a sekundárne texty ďalej nezmenšovať. Nepoužiť CSS zoom ani transformáciu celej tabuľky.
4. CPU/RAM a krátke stavové údaje sa nesmú zalamovať. Comfortable zachová doplnkové riadky; nevnucovať jeden riadok celej bunke ani tagom.
5. Dlhé názvy skracovať vizuálne cez elipsu v obmedzenej šírke. Úplný údaj musí zostať dostupný cez existujúci detail alebo dostupné zobrazenie celého textu; samotný hover title nestačí pre klávesnicu a dotyk.
6. Pri šírke, kde sa všetky stĺpce čitateľne nezmestia, zachovať vodorovné posúvanie v tabuľke. Neskrývať stĺpce a nesľubovať zobrazenie všetkých stĺpcov bez posúvania na mobile.

## Poradie implementácie

### T1: Zmerať správanie a určiť prah (S)

Opis: Reprodukovať zalamovanie s reálnymi alebo existujúcimi testovacími dátami a zaznamenať šírku kontajnera, vypočítané písmo a výšku riadkov. Preskúmať aj existujúce štýly StateCell a všetkých konzumentov VMware tabuľky.

Akceptačné kritériá:
- Zaznamenané porovnanie pri viewportoch 1280, 1440 a 1920 px, pri 100 % a 125 % zoome a oboch režimoch hustoty.
- Určený konkrétny prah kontajnera pre 12 px text a 8 px odsadenie vrátane kontroly tesne pod a nad prahom.
- Identifikované stĺpce spôsobujúce zalamovanie a potvrdené hranice lokálnej úpravy.

Overenie: Browser meranie a snímky pred zmenou; zoom prehliadača nezamieňať s device pixel ratio. Výsledky zapísať do tohto plánu.

Závislosti: Žiadne. Súbory: tento plán; aplikačné súbory iba čítať.

### T2: Upraviť lokálne responzívne štýly (S)

Opis: V jednom funkčnom kroku zaviesť menšie písmo a medzery pri nameranom prahu, odstrániť nechcené zalamovanie krátkych údajov a overiť obmedzenie dlhých názvov.

Akceptačné kritériá:
- Compute a krátke stavy zostávajú v jednom riadku; hlavný text vrátane názvu VM má pri užšom kontajneri 12 px a pri širokom 13 px.
- Dlhé hodnoty neprekrývajú susedné bunky; zostávajú dostupné v plnom znení a posledný stĺpec je dosiahnuteľný posúvaním.
- Comfortable zachová doplnkové informácie, Compact zostane kompaktný; výber VM, loading a empty stav fungujú bez regresie.

Overenie: Cielený komponentový test, ESLint dotknutých súborov a browser kontrola nameraného prahu. Nepridávať testy, ktoré iba porovnávajú reťazce CSS tried; jsdom nedokazuje rozloženie.

Závislosti: T1. Súbory: `VirtualMachinesTable.tsx`, `vmwareColumns.tsx`; `VirtualMachinesTable.test.tsx` iba ak je potrebný zmysluplný test správania. Preferovať existujúce Tailwind utility bez zmeny shared DataTable.

### Kontrolný bod po T2

Porovnať so snímkami z T1. Ak menšie písmo a odsadenie nestačia, zachovať scroll; neznižovať hlavné písmo pod 12 px ani nerozširovať rozsah na celý layout.

### T3: Overiť výsledok a vytvoriť commit (S)

Opis: Dokončiť browser overenie, zaznamenať výsledky a commitnúť iba súbory tejto úlohy.

Akceptačné kritériá:
- Overené šírky 320, 768, 1024, 1280, 1440 a 1920 px; desktop aj pri 125 % zoome. Na úzkych šírkach funguje scroll tabuľky, nie nechcené pretečenie celej stránky.
- Overené oba režimy hustoty, dlhé názvy, tagy, vyššie CPU/RAM hodnoty, dostupné jazyky en/sk/cs a ovládanie výberu VM aj posúvania klávesnicou.
- Cielené kontroly úspešné, výsledky zapísané v checkliste a atomický commit vytvorený bez nesúvisiacich zmien.

Overenie z koreňa repozitára:

```powershell
npm exec vitest run src/features/discovery-inventory/resources/components/vmware/VirtualMachinesTable.test.tsx
npm exec eslint -- src/features/discovery-inventory/resources/components/vmware/VirtualMachinesTable.tsx src/features/discovery-inventory/resources/config/vmwareColumns.tsx --max-warnings 0
git diff --check
```

Ak sa zmení testovací súbor, zahrnúť ho do cieleného lintovania. Rozšíriť testy iba pri zistenom dopade na ďalšie komponenty. Kompletnú testovaciu sadu, typecheck ani produkčný build predvolene nespúšťať. Nedostupný browser zaznamenať ako neoverenú časť, nie ako úspešný výsledok.

Závislosti: T2. Súbory: tento plán a checklist; opravovať iba chyby patriace do uvedeného rozsahu.

## Riziká a otvorené body

- Presný breakpoint ostáva meraním v T1; nie je potrebné rozhodnutie používateľa.
- Zákaz zalamovania môže zväčšiť minimálnu šírku obsahu; riešením je lokálne posúvanie, nie skrytie údajov.
- Dlhé preklady a tagy môžu meniť výšku riadka; zákaz zalamovania aplikovať cielene.
- Menšia výška obrazovky nemusí umožniť zobraziť desať riadkov naraz ani po úprave. Zachovanie všetkých desiatich riadkov bez zvislého scrollu nie je akceptačnou podmienkou.
- Úlohy vykonávať postupne: T1 → T2 → kontrolný bod → T3. Paralelné úpravy rovnakých komponentov neprinášajú výhodu.
