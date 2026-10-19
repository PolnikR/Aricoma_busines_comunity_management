# Overview PageHeader: evidencia realizácie

Dátum: 2026-10-19. Vetva: `spike/ant-design-shell`. Stav: implementované a overené. Následný pokyn používateľa povoľuje commit vlastných zmien; historické záznamy nižšie zachytávajú pôvodný zákaz. Bez merge/push.

## Baseline a nezávislé zmeny

HEAD pri začiatku: `cac4edeedae144a1e60508237c612812f5464846`.
Pôvodný working-tree diff je uložený v ignorovanom `node_modules/.cache/overview-pageheader-app/working-tree-before.patch`; zahŕňa OverallKpis, RecoveryOverview, OverviewPage.test, overview.css, EN/SK/CS a oba plánovacie dokumenty.
Preexistujúce KPI navigačné odkazy a percentuálne rozdelenie obnovy sa zachovávajú. Súbory OverallKpis a RecoveryOverview agent nemení.

SHA256 pri štarte implementácie:

- OverallKpis.tsx: `773E71E028655EFFF5B2A6790A351B5F55187928167C0A5DA46048D171E0B6BE`.
- RecoveryOverview.tsx: `A479B8F7879C42F1528CCEC6DCC1BFBA3177B5D53F23A4BD074A3968DED4015D`.

## T0: Testovací baseline

- `npm.cmd exec vitest run src/features/dashboard/pages/OverviewPage.test.tsx`: PASS, 5 testov pred pridaním nových testov PageHeader; výstup v zázname nástrojov relácie.
- `npm.cmd exec vitest run src/features/dashboard/pages/OverviewPage.translations.test.tsx`: FAIL, 1/2; presný log `baseline-translations-red.log` v cache.
- Kombinovaný beh oboch súborov: FAIL, 6 PASS / 1 FAIL; log `baseline-combined-red.log`.
- Príčina: React Router LinkWithRef nedostal router context (`Cannot destructure property 'basename' ... as it is null`). Súčasné KPI obsahujú Link, jazykový test nemal router.
- Oprava iba v testovacom obale: MemoryRouter okolo LanguageProvider/OverviewPage, bez zmeny produkčného routovania.
- Samostatný jazykový beh po oprave: PASS, 2 testy; `baseline-translations-green.log`.
- Kombinovaný beh po oprave: PASS, 7 testov; `baseline-combined-green.log`.

## Browser prostredie

- Vite: `npm.cmd run dev -- --host 127.0.0.1`; prístup aplikácie cez `http://localhost:5173/`.
- Microsoft Edge, samostatný QA profil v ignorovanej cache, ovládaný Playwright cez CDP `http://127.0.0.1:9225`.
- Runtime: `node_modules/.cache/scroll-probe/node_modules/playwright-core/index.mjs`; nepridáva sa závislosť.
- Pôvodné sandboxové okno nebolo používateľovi viditeľné. Viditeľné okno bolo na jeho žiadosť spustené mimo sandboxu cez Start-Process -WindowStyle Normal.
- Keycloak odmietol redirect URI s 127.0.0.1. Zmena navigácie QA okna na localhost zobrazila štandardný prihlasovací formulár. Konfigurácia aplikácie/autentifikácie sa nemenila.
- Používateľ dokončí login priamo v QA okne; heslá/tokeny sa nečítajú ani neexportujú. Prvý neúspešný pokus baseline bez session sa nepovažuje za overenie layoutu.

Baseline Overview sa meral pred nahradením OverallToolbar; opt-in PageHeader už existoval, jeho default však zostal bez zmeny a Overview ho vtedy nepoužíval.

## Testy nových kontraktov

- PageHeader compact: RED na chýbajúcom leading-6/wrap variante (`header-red.log`), potom PASS spolu s TableToolbar, 8 testov (`header-green.log`).
- Povinný overview.description: RED na chýbajúcom kľúči (`description-red.log`), potom PASS jazykových/katalógových testov, 4 testy (`description-green.log`).
- Integrácia Overview: RED na chýbajúcom h1 (`integration-red.log`), potom PASS oboch Overview suites, 9 testov (`integration-green.log`). Rozšírený jazykový test takisto najprv zlyhal na chýbajúcom h1 (`language-integration-red.log`).
- Cielený ESLint PageHeader, jeho testu, jazykového testu a nového QA skriptu v priebehu realizácie: PASS. Finálny lint sa vykoná po poslednej úprave.

## Výsledná implementácia

- Overview používa spoločný PageHeader s opt-in `variant="compact"`, presným lokalizovaným nadpisom/popisom a jediným pomenovaným filtrom v actions.
- Pôvodný OverallToolbar a jeho osirelé CSS odstránené. Pevný demo dátum zostal v actions hlavičky; nepresúval sa do footeru.
- Default PageHeader zachoval DOM aj triedy. AppShell, route handles, TableToolbar, model, fixture, API a autentifikácia bez zásahu agenta.
- Štyri KPI, ich existujúce odkazy a štyri panely zachované. Mobilné KPI majú tiež jednotnú výšku pomocou grid-auto-rows, desktopové výšky zostali.
- Počas realizácie pribudli nezávislé úpravy DeploymentCoverage, Icons, infraštruktúrnych farieb v overview.css a `tasks/overview-visuals-*`. Agent ich zachoval; snímky finálneho stromu ich obsahujú. Prechodný Vite HMR výpadok exportu FlaskIcon pri týchto úpravách sa v záverečnom načítaní neopakoval.

## Browser výsledky: PASS

`final-results.json` obsahuje **72 úspešných prípadov, žiadne failures**:

- 48 kombinácií: všetkých 8 rozlíšení × EN/SK/CS × light/dark.
- 11 hraničných šírok pri 700 px výšky: 639/640, 699/700/701, 949/950, 1023/1024, 1279/1280.
- 1 prípad so zbaleným sidebarom pri 1366×768; základná matica používala rozbalený sidebar.
- 12 porovnaní default hlavičky: Platform providers, Infrastructure a Resources × 1366/390 px × light/dark. Všetkých 12 má `matchesBaseline: true`.

Navyše prešli behaviorálne assertions: mobilné otvorenie/zavretie sidebaru, Tab + Enter/Space, viditeľný focus, zachovaný Hitachi filter pri zmene jazyka/témy a oba KPI odkazy na skutočné routy bez nového document requestu. Vo všetkých kombináciách filter menil iba ochranu; ostatné tri panely zostali obsahovo stabilné. Nezistil sa horizontálny overflow ani orezanie textu; na desktope document/main/Overview nevyžadovali vertikálny scroll, na mobile sa dosiahol celý footer cez jediný scroll Overview.

| CSS viewport | EN/SK/CS × light/dark | Výsledok |
|---|---|---|
| 1920×1080 | 6/6 PASS | celý dashboard bez scrollu |
| 1440×900 | 6/6 PASS | celý dashboard bez scrollu |
| 1366×768 | 6/6 PASS | celý dashboard bez scrollu |
| 1100×700 | 6/6 PASS | celý dashboard bez scrollu |
| 1024×768 | 6/6 PASS | celý dashboard bez scrollu |
| 950×640 | 6/6 PASS | celý dashboard bez scrollu |
| 390×844 | 6/6 PASS | jediný scroll, dostupný footer |
| 320×700 | 6/6 PASS | jediný scroll, dostupný footer |

### Výškový rozpočet (SK light)

Toolbar mal 34,5 px; nová hlavička vrátane dátumu/filtra má 49,5 px. Tri medzery sa zmenili z 10 na 5 px, footer zostal 15 px. Súčet header + medzery + footer je **79,5 px pred aj po zmene**. Nie je potrebný dodatočný desktopový scroll ani zmenšenie panelov.

| Viewport | Výška jedného riadka panelov pred | Po |
|---|---:|---:|
| 1366×768 | 224,15625 px | 224,15625 px |
| 1024×768 | 223,5625 px | 223,5625 px |
| 950×640 | 174,8125 px | 174,8125 px |

### Stabilita referenčných screenshotov

Prvé raw porovnanie odhalilo prechod sidebaru cez titulok pri zmene desktopového viewportu na mobilný a načítavanie refresh akcie Infrastructure. Nešlo o rozdiel default komponentu. QA nastavuje viewport pred načítaním stránky, čaká na zasunutý mobilný sidebar a na vytvorenie aj dokončenie refresh akcie (prázdny zoznam tlačidiel už nemôže predčasne ukončiť čakanie).

Na presné A/B sa používa pôvodný čistý `PageHeader.tsx` zo začiatočného HEAD, uložený ako `PageHeader-before.tsx`. V tom istom prihlásenom AppShell sa iba tento UI modul dočasne podá cez Playwright route a porovná s aktuálnym defaultom; autentifikácia, API a ostatné komponenty sú skutočné. Snímky `reference-*.png` a `final-*.png` sú po ustálení binárne zhodné. Počiatočný problém CJS/ESM testovacieho JSX runtime bol opravený v QA skripte, bez zásahu do produkcie.

Plná finálna DOM matica a behaviorálne kontroly prešli pred porovnaním hlavičiek; po oprave iba referenčného QA sa opakovali zlyhané porovnania cez `QA_HEADERS_ONLY=true`. Táto voľba obnovuje už úspešné výsledky rovnakého pracovného stromu; po zmene aplikácie treba spustiť celý finálny beh. Logy priebežných chýb zostávajú v cache aj keď ich následný cielený beh vyriešil.

Záverečný konzolový záznam obsahuje iba preexistujúci ELK fallback: chýba voliteľný balík web-worker, používa sa verzia bez workeru. Rovnaký záznam je v baseline; nové aplikačné runtime chyby nezostali. Screenshot pri 1024 px ukazuje už existujúce tesné infraštruktúrne názvy/statusy; predložená zmena tento layout nerefactoringuje.

## Príkazy a dôkazy

- `npm.cmd run typecheck`: PASS (`tsc -b`). Prvý beh zachytil nepodporované `exact` v Testing Library ByRoleOptions; odstránené, následný build prešiel. Finálny log: `final-typecheck.log`.
- `npm.cmd exec vitest run src/shared/components/page/PageHeader.test.tsx src/shared/components/table/TableToolbar.test.tsx src/features/dashboard/pages/OverviewPage.test.tsx src/features/dashboard/pages/OverviewPage.translations.test.tsx src/locales/dashboardConsoleTranslations.test.ts src/features/discovery-inventory/infrastructure/pages/InfrastructurePage.test.tsx`: **26/26 PASS, 6 súborov**, `final-focused-tests.log`.
- Cielený ESLint PageHeader + test, OverviewPage + oba testy, OverallVendorFilter a QA skript: PASS.
- JSON katalógy sa validujú parserom aj testami; nezávislé navigačné preklady zostali.
- `git diff --check`: PASS. AppShell, AppRoutes a TableToolbar nemajú diff; staging je prázdny a vetva zostala `spike/ant-design-shell`. Hashy preexistujúcich OverallKpis a RecoveryOverview zostali zhodné.

Browser príkazy (PowerShell, z koreňa repo; vyžadujú bežiaci Vite a prihlásené QA okno):

```powershell
$env:PLAYWRIGHT_CDP_URL='http://127.0.0.1:9225'
$env:APP_URL='http://localhost:5173/'
$env:QA_PHASE='final'
node scripts/qa/verify-overview-pageheader-app.mjs
# Iba na opakovanie nezmenených referenčných hlavičiek po chybe QA:
$env:QA_HEADERS_ONLY='true'
node scripts/qa/verify-overview-pageheader-app.mjs
```

Pre celý beh treba zachovať cache s `baseline-results.json` a `PageHeader-before.tsx`, vytvorenú pri T0; baseline Overview patrí rozpracovanému stromu zachytenému patchom, nie iba čistému HEAD. Runtime možno určiť cez PLAYWRIGHT_MODULE; skript podporuje aj explicitný PLAYWRIGHT_STORAGE_STATE, v tejto realizácii sa autentifikácia takto neexportovala.

Všetky JSON/log/PNG artefakty sú v ignorovanom `node_modules/.cache/overview-pageheader-app/`. Vizuálne skontrolované reprezentatívne finálne snímky:

- [1366×768 light](../node_modules/.cache/overview-pageheader-app/final-1366-768-sk-light.png), [dark](../node_modules/.cache/overview-pageheader-app/final-1366-768-sk-dark.png), samostatne aj zbalený sidebar.
- [1024×768 light](../node_modules/.cache/overview-pageheader-app/final-1024-768-sk-light.png), dark; [950×640 light](../node_modules/.cache/overview-pageheader-app/final-950-640-sk-light.png), dark.
- [390×844 light](../node_modules/.cache/overview-pageheader-app/final-390-844-sk-light.png), dark a footer; [320×700 light](../node_modules/.cache/overview-pageheader-app/final-320-700-sk-light.png), dark footer.
- Baseline 1024/950 a ustálené reference/final výrezy default hlavičiek, najmä Providers 390 light a Infrastructure 1366 dark, boli vizuálne porovnané.

Celý test suite ani kompletný produkčný `npm run build` neboli spustené. Finálne QA okno zostáva otvorené na Overview v SK/light; zdrojový strom a vetva zostávajú bez commitu podľa zadania.

## Následná požiadavka: odstrániť spodný riadok (2026-10-19)

Na výslovnú požiadavku používateľa bol následne odstránený celý footer s ABCO, sloganom a textom statickej ukážky/demo dát. Odstránené sú aj tri osirelé pravidlá overall-footer v overview.css. Táto požiadavka nahrádza pôvodné kritérium zachovania footeru; historické merania a 72 kontrol vyššie patria verzii pred jeho odstránením.

Upravený existujúci jazykový test najprv zlyhal na stále prítomnom demo texte; po odstránení prešiel. QA skript teraz kontroluje neprítomnosť footeru, dostupnosť posledného panelu a skutočný počet medzier. Rozpracované nezávislé zmeny zostali zachované.

Overenie aktuálnej úpravy:

- `npm.cmd exec vitest run src/features/dashboard/pages/OverviewPage.test.tsx src/features/dashboard/pages/OverviewPage.translations.test.tsx`: **9/9 PASS**.
- `npm.cmd exec eslint -- src/features/dashboard/pages/OverviewPage.tsx src/features/dashboard/pages/OverviewPage.translations.test.tsx scripts/qa/verify-overview-pageheader-app.mjs`: PASS.
- `node node_modules/.cache/overview-pageheader-app/verify-no-footer.mjs`: **6/6 Playwright/Edge PASS**, 1366×768, 950×640 a 320×700, vždy light/dark. Footer chýba, zostali 4 KPI/4 panely, žiadne horizontálne pretečenie; desktop bez vertikálneho scrollu a na mobile spodok posledného panelu dosiahnuteľný.
- Vizuálne skontrolované `no-footer-1366-light.png` a `no-footer-320-dark.png`; všetky snímky a `no-footer-results.json` sú v pôvodnej ignorovanej cache.
- `git diff --check`: záverečná kontrola. Kompletný suite, TypeScript/produkčný build ani nesúvisiace browser porovnania sa pre túto lokálnu úpravu neopakovali. Bez commitu podľa trvajúceho pokynu používateľa.

## Príprava samostatného commitu na následný pokyn používateľa

Základ pri príprave commitu: `c75b89aa5e06c5960e7b5b219e179b2184dc8a77`. V ignorovanej cache `node_modules/.cache/pageheader-commit-20261019/tree` bol zostavený tento HEAD iba s úpravami PageHeader/Overview a odstránením footeru. Nezávislé KPI odkazy, percentuálne zobrazenie Recovery a ich testy, CSS a preklady zostali mimo kandidáta. QA kontrola KPI navigácie sa vykoná iba pri prítomnosti tejto nezávislej funkcionality v katalógu.

- V samostatnom kandidátovi: rovnakých šesť cielených Vitest súborov uvedených vyššie, **25/25 PASS** (bez nezávislého testu KPI navigácie).
- V samostatnom kandidátovi: `npm.cmd run typecheck`, PASS.
- ESLint siedmich zmenených TS/TSX/QA súborov v hlavnom pracovnom strome: PASS. Pokus v cache narazil na resolver aliasov pod `node_modules`; produkčná konfigurácia nebola upravovaná.
- Kompletný suite a produkčný build sa pri príprave commitu nespúšťali; browser evidencia zostáva uvedená vyššie.
