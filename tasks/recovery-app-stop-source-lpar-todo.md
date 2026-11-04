# TODO: stop_source_lpar

Podrobnosti, konkrétne súbory, akceptačné kritériá a príkazy: [implementačný plán](recovery-app-stop-source-lpar-plan.md).
Tento checklist je pre budúcu implementáciu; žiadna implementačná položka zatiaľ nie je dokončená.

## Fáza 0 — vstupná kontrola

- [ ] Skontrolovať plán s používateľom pred začatím implementácie.
- [ ] Znovu preveriť Git stav a zachovať všetky cudzie zmeny; v čase analýzy boli schémy v commite `f5f02628`.
- [ ] Overiť dostupnosť štyroch generovaných schém a defaultu `true`; neupravovať Orval výstupy ručne.

## Fáza 1 — kontrakt a texty

- [ ] Úloha 1 (M, bez závislostí): pridať `recoveryAppPolicyContract.test.ts` pre absenciu, true/false a neplatné null.
- [ ] Doplniť boolean do troch typovaných component fixtures; legacy vstupy parsovať cez schému.
- [ ] Spustiť contract/component testy a typecheck podľa úlohy 1.
- [ ] Úloha 2 (M, závisí od 1): doplniť label a help trigger/title/intro do EN, SK, CS.
- [ ] Vysvetliť rovnaký managed systém, ponechanie zdroja v behu a potrebu samostatnej sieťovej identity klonu.
- [ ] Spresniť timeout a manual zoning help bez zmeny ostatných významov.
- [ ] Overiť JSON parse, neprázdnosť nových kľúčov a existujúce help testy.

### Kontrolný bod 1

- [ ] Kontrakt zachováva false a defaultuje iba chýbajúcu hodnotu.
- [ ] Typované fixtures sú kompletné a tri katalógy pripravené.

## Fáza 2 — celý používateľský tok

- [ ] Úloha 3 (M, závisí od 1–2): rozšíriť form type, create default a edit mapovanie.
- [ ] Pridať riadený checkbox s labelom, disabled stavom a KeyedHelpPopover do IBM Power sekcie.
- [ ] Explicitne odosielať boolean v common submit payload-e pre všetky snapshot režimy.
- [ ] Zachovať viditeľný/editovateľný timeout, jeho hodnotu, validáciu a odosielanie aj pri false.
- [ ] Doplniť modal scenáre: default true, create false, nezmenené edit false, obidva smery prepnutia, reset/dirty; aktualizovať presné payload assertions.
- [ ] Spustiť modal test a ESLint zmenených súborov.
- [ ] Úloha 4 (M, závisí od 3): pridať DetailField do Overview pred timeout, bez nového stĺpca alebo filtra.
- [ ] Rozšíriť table test o hodnoty Áno/Nie a správne poradie polí.
- [ ] Rozšíriť help test pre EN/SK/CS a create/edit/display, obsah varovania, Escape/focus a nemennosť formulára.
- [ ] Spustiť table/help testy.

### Kontrolný bod 2

- [ ] Create → submit aj GET → edit → submit zachovávajú hodnotu.
- [ ] Overview a nápoveda zobrazujú správne lokalizované informácie.
- [ ] Prepínanie nemení timeout ani ostatné nastavenia.

## Fáza 3 — regresie a odovzdanie

- [ ] Úloha 5 (S, závisí od 3–4): nový mapper unit test pre true/false × tri snapshot režimy, explicitný kľúč a timeout 600.
- [ ] Rozšíriť Refetch integračný test o skutočný GET bez poľa a s false, Overview a edit checkbox; neobísť runtime validáciu mockom hooku.
- [ ] Spustiť presný výber šiestich Vitest súborov z plánu; nespúšťať celú sadu.
- [ ] Spustiť `npm run typecheck`, cielený ESLint, JSON parse a `git diff --check`.
- [ ] Manuálne overiť create/edit/Overview/help a úzke zobrazenie bez spúšťania obnovy.
- [ ] Overiť diff: žiadne ručné zmeny generovaných súborov ani nesúvisiace úpravy.

### Záverečný kontrolný bod

- [ ] Všetky scenáre testovacej matice majú dôkaz; prípadné východiskové chyby sú oddelené od regresií.
- [ ] Potvrdiť podporu parametra na cieľovom BE pred nasadením.
- [ ] Vytvoriť overený atomický commit iba implementačných zmien; bez push/merge.
- [ ] Odovzdať výsledok s príkazmi overenia a informáciou, že celá sada ani produkčný build neboli spustené.
