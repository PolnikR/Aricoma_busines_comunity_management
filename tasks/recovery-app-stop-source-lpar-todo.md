# TODO: stop_source_lpar

Podrobnosti, konkrétne súbory, akceptačné kritériá a príkazy: [implementačný plán](recovery-app-stop-source-lpar-plan.md).
Implementácia schválená používateľom 2026-11-04 a vykonaná inline. Automatické kontroly prešli; vizuálna kontrola a potvrdenie cieľového BE zostávajú otvorené.

## Fáza 0 — vstupná kontrola

- [x] Skontrolovať plán s používateľom pred začatím implementácie.
- [x] Znovu preveriť Git stav a zachovať všetky cudzie zmeny; v čase analýzy boli schémy v commite `f5f02628`.
- [x] Overiť dostupnosť štyroch generovaných schém a defaultu `true`; neupravovať Orval výstupy ručne.

## Fáza 1 — kontrakt a texty

- [x] Úloha 1 (S, bez závislostí): doplniť boolean do troch existujúcich typovaných component fixtures bez oslabenia typov.
- [x] Staršie GET odpovede bez poľa aj explicitné `false` pokryť existujúcim integračným testom v úlohe 5, nevytvárať nový contract test.
- [x] Spustiť dotknuté component testy a typecheck podľa úlohy 1.
- [x] Úloha 2 (M, závisí od 1): doplniť label a help trigger/title/intro do EN, SK, CS.
- [x] Vysvetliť rovnaký managed systém, ponechanie zdroja v behu, potrebu novej MAC a odlišnej IP cez DHCP aj riziko statickej IP/hostname pri súbežnom behu.
- [x] Spresniť timeout a manual zoning help bez zmeny ostatných významov.
- [x] Overiť JSON parse, neprázdnosť nových kľúčov a existujúce help testy.

### Kontrolný bod 1

- [x] Kontrakt zachováva false a defaultuje iba chýbajúcu hodnotu.
- [x] Typované fixtures sú kompletné a tri katalógy pripravené.

## Fáza 2 — celý používateľský tok

- [x] Úloha 3 (M, závisí od 1–2): rozšíriť form type, create default a edit mapovanie.
- [x] Pridať riadený checkbox s labelom, disabled stavom a KeyedHelpPopover do IBM Power sekcie.
- [x] Explicitne odosielať boolean v common submit payload-e pre všetky snapshot režimy.
- [x] Zachovať viditeľný/editovateľný timeout, jeho hodnotu, validáciu a odosielanie aj pri false.
- [x] Doplniť modal scenáre: default true, create false, nezmenené edit false, oba smery prepnutia, reset/dirty, `true/false × latest/time_range/exact_time` a zachovanie timeoutu 600; kontrolovať skutočný JSON request.
- [x] Spustiť modal test a ESLint zmenených súborov.
- [x] Úloha 4 (M, závisí od 3): pridať DetailField do Overview pred timeout, bez nového stĺpca alebo filtra.
- [x] Rozšíriť table test o hodnoty Áno/Nie a správne poradie polí.
- [x] Rozšíriť help test pre EN/SK/CS a create/edit/display, obsah varovania, Escape/focus a nemennosť formulára.
- [x] Spustiť table/help testy.

### Kontrolný bod 2

- [x] Create → submit aj GET → edit → submit zachovávajú hodnotu.
- [x] Overview a nápoveda zobrazujú správne lokalizované informácie.
- [x] Prepínanie nemení timeout ani ostatné nastavenia.

## Fáza 3 — regresie a odovzdanie

- [x] Úloha 5 (S, závisí od 3–4): rozšíriť existujúci Refetch integračný test o reálny GET bez poľa a s `false`, Overview a edit checkbox; neobísť runtime validáciu mockom hooku.
- [x] Mapper overiť cez existujúce modal testy a odosielané JSON telo; nový unit test pridávať len pri zistenom nepokrytom scenári.
- [x] Spustiť presný výber štyroch existujúcich Vitest súborov z plánu; nespúšťať celú sadu.
- [x] Spustiť `npm run typecheck`, cielený ESLint, JSON parse a `git diff --check`.
- [ ] Manuálne overiť create/edit/Overview/help a úzke zobrazenie bez spúšťania obnovy.
- [x] Overiť diff: žiadne ručné zmeny generovaných súborov ani nesúvisiace úpravy.

### Záverečný kontrolný bod

- [x] Všetky scenáre testovacej matice majú dôkaz; prípadné východiskové chyby sú oddelené od regresií.
- [ ] Potvrdiť podporu parametra na cieľovom BE pred nasadením.
- [x] Vytvoriť overený atomický commit iba implementačných zmien; bez push/merge.
- [x] Odovzdať výsledok s príkazmi overenia a informáciou, že celá sada ani produkčný build neboli spustené.

## Výsledok overenia — 2026-11-04

- Východiskový Vitest: 4 súbory / 82 testov prešlo. Východiskový typecheck identifikoval tri chýbajúce Output fixture polia; všetky boli doplnené.
- Red fáza: dva nové create testy zlyhali na chýbajúcom checkboxe pred implementáciou.
- `npm.cmd exec -- vitest run` s presnými štyrmi cestami z plánu: 4 súbory / 98 testov prešlo. Po doplnení troch modal scenárov opakovaný beh iba `RecoveryAppPolicyModal.test.tsx`: 72/72 prešlo; spolu 101 pokrytých testov.
- `npm.cmd run typecheck`, cielený ESLint ôsmich dotknutých TS/TSX súborov, JSON parse a kontrola štyroch nových kľúčov v EN/SK/CS, `git diff --check`: prešlo. Po posledných testových úpravách bol opakovaný typecheck a ESLint modal testu.
- `git diff --exit-code -- src/generated openapi`: bez zmien. Celá testovacia sada ani produkčný build neboli spustené.
- Browser host bol nedostupný. Pokus o natívny Chrome ukončil Computer Use, pretože nevedel spoľahlivo určiť URL na vynútenie pravidiel. Vizuálna kontrola vrátane úzkeho zobrazenia nebola vykonaná; žiadne ďalšie UI akcie sa nevykonali. Dočasný lokálny dev server bol zastavený.
- Potvrdenie podpory na cieľovom BE ostáva podmienkou nasadenia; tento krok nebol nasadením.
