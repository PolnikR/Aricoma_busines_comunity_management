# Plán: Overview so spoločným kompaktným PageHeader

Dátum: 2026-10-19. Repozitár: ABCO FE (`abcm-fe`). Vetva: `spike/ant-design-shell`.
Stav: schválené cez executing-plans inline, implementované a overené. Checklist: [todo.md](todo.md). Výsledky: [overview-pageheader-verification.md](overview-pageheader-verification.md).

## Zadanie a hranice

Nahradiť horný riadok Overview spoločným PageHeader s názvom **Prehľad**, podnadpisom **Stav ochrany, infraštruktúry a obnovy** a filtrom Všetci / IBM FlashSystem / Hitachi VSP vpravo. Zachovať štyri KPI, štyri panely, dáta, prefetch, light/dark a mobilné scrollovanie. Na podporovanom desktopovom rozložení zachovať celý dashboard v dostupnom viewporte bez vertikálneho scrollovania a bez orezania obsahu.

Tento dokument aktualizuje predchádzajúci plán toho istého rozpracovaného zadania. Nahrádza jeho návrh dodatočného kontextového riadka, desktopového scrollu, panelov s minimálnou výškou 270 px a starého podnadpisu. Statický `prototypes/dashboard-modern/overview-pageheader.html` nie je záväzná geometria ani dôkaz integrácie.

Pôvodná fáza plánovania menila iba `tasks/plan.md` a `tasks/todo.md`; následnú implementáciu používateľ schválil cez executing-plans inline. Zákaz stagingu, commitu, merge a push zostáva v platnosti. **Pracovný strom už nie je čistý**: na `spike/ant-design-shell` sú rozpracované úpravy `OverallKpis.tsx`, `RecoveryOverview.tsx`, `OverviewPage.test.tsx`, `overview.css`, prekladov EN/SK/CS a týchto dvoch plánovacích súborov. Žiadne existujúce zmeny nepovažovať automaticky za súčasť PageHeader úlohy; pred realizáciou zaznamenať baseline (HEAD aj working tree) a zachovať ich bez resetu či prepisu. Realizácia následne prebehla na schválený pokyn používateľa; presná evidencia je vo výsledkovom reporte.

## 1. Zistený stav a závislosti

| Miesto | Skutočný stav a dôsledok |
|---|---|
| `src/shared/components/page/PageHeader.tsx:3` | API: `title: ReactNode`, voliteľné `description` a `actions`. Variant ani `className` nemá. Actions už umožňujú vložiť filter bez nového slotu. |
| `PageHeader.tsx:12` | Koreň má `mb-4`, `shrink-0`, pod 640 px stĺpec, od 640 px riadok; actions majú `shrink-0` a vnútorné zalamovanie. H1 má 36 px riadok; popis štandardne 20 px. Bežná nezalomená hlavička teda zaberá približne 72 px vrátane spodného marginu. To je odhad zo štýlov, nie nové browser meranie. |
| `src/shared/components/page/PageHeader.test.tsx` | Chráni nadpis, popis, actions, dnešné triedy aj variant bez voliteľných props. Slovo „compact“ v názve existujúceho testu neznamená existenciu variantového API. |
| `src/shared/components/table/TableToolbar.tsx:28` | Deleguje nadpis, popis, obnovovanie a akcie na PageHeader. Zmena predvolenej geometrie by sa preniesla aj na tabuľkové stránky. |
| `InfrastructurePage.tsx:108`, `RecoveryActionsPageShell.tsx:55` | Používajú title/description/actions s malým tlačidlom obnovy. Potvrdzujú vhodnosť existujúcej kompozície. CodeGraph uvádza 27 odkazov na PageHeader; nejde o 27 nezávislých stránok. |
| `src/features/dashboard/pages/OverviewPage.tsx:14` | Vlastní `vendor`, volá `useInitialResourcePrefetch(true)`, používa fixture a `selectOverallProtection`. Renderuje OverallToolbar, OverallKpis, štyri panely a footer. PageHeader chýba. |
| `components/overall/OverallToolbar.tsx` | Spája kontext filtra, lokalizovaný pevný dátum 2026-10-16, označenie demo inventára a jediné tri tlačidlá filtra s `aria-pressed`. |
| `components/overall/` | OverallKpis, ProtectionOverview, RecoveryOverview, InfrastructureOverviewPanel, DeploymentCoverage a OverallPanel už majú oddelené zodpovednosti. Ich dátovú logiku netreba meniť. |
| `components/overall/OverallKpis.tsx`, `src/app/routes.ts` | Aktuálne rozpracované KPI už majú navigačné odkazy „Zobraziť skupiny“ a „Zobraziť aplikácie“ cez `Link`, `routes.recoveryGroups` a `routes.recoveryApplications`. Pri PageHeader zmene tieto odkazy, ich lokalizáciu, pozíciu a navigáciu zachovať; na tento účel neprepisovať KPI komponent. |
| `src/features/dashboard/pages/OverviewPage.translations.test.tsx` | Jazykový test vykresľuje `OverviewPage` bez React Router kontextu, zatiaľ čo aktuálne KPI obsahujú `Link`. Pri predchádzajúcej cielenej kontrole kombinovaný Vitest beh skončil `exit code 1`; konkrétnu príčinu potvrdiť uloženým testovacím logom. Testovací baseline stabilizovať **pred** prácou na PageHeader, napr. použitím `MemoryRouter` v testovacom obale, bez zmeny produkčného routovania. |
| `pages/overview.css` | `.overall-page`: flex stĺpec, gap 10 px, min-height: 0, lokálne tokeny a 11 px písmo. Toolbar: min-height 30 px. Panely: 12 stĺpcov, dva pružné riadky; desktop skrýva overflow. Šírky 950–1280 px majú všetky panely cez 6 stĺpcov. Pod 950 px má stránka vlastný vertikálny scroll a prirodzené riadky; pod 700 px jeden stĺpec panelov. |
| `src/app/AppRoutes.tsx:23` | Overview je index route `/`, s `contentScroll: 'contained'` aj `contentFit: 'viewport'`. |
| `src/layouts/app-shell/AppShell.tsx:16` | Viewport režim znamená `h-dvh`, min-height: 0 a skrytý overflow v main; automaticky zahŕňa contained režim. `contentScroll: contained` samo osebe povoľuje spravovať scroll vnútornému obsahu, negarantuje viditeľnosť obsahu. |
| `AppShell.tsx:47`, `AppHeader.tsx:16`, `AppSidebar.tsx:130` | Shell od lg pridáva vonkajší padding a sidebar; AppHeader má 56 px. Main má 40 px vertikálny padding. Sidebar má od lg šírku aspoň 272 px, pri zbalení 72 px; viditeľný desktopový prepínač je až od xl. |
| `src/index.css:86` | sm=640, lg=1024, xl=1280. Dashboardový breakpoint 950 px sa nezhoduje so shellovým lg: pri 950 px ešte sidebar nie je v toku; pri 1024 px zrazu výrazne zúži obsah. Nestačí preveriť len šírku okna. |
| `src/locales/{en,sk,cs}.json` | `nav.overview` je Overview / Prehľad / Přehled, filter je preložený. `overview.description` zatiaľ chýba. |
| `package.json` | `typecheck` = `tsc -b`. `build` navyše spúšťa globálny lint, celý Vitest a API kontroly pred Vite buildom; na požadovaný TypeScript build použiť `npm.cmd run typecheck`. |
| `scripts/qa/verify-overview-pageheader.mjs` | Používa Playwright/Edge, ale otvára HTML cez file://. Jeho úspech neoveruje React, AppShell, autentifikáciu ani požadovanú maticu. |

Historický plán `tasks/compact-page-header-plan.md` opisuje už vykonané globálne zmenšenie hlavičky. Jeho výsledok je dnešný default; túto globálnu úpravu neopakovať. Staršie reporty v `tasks/dashboard/` opisujú aj predošlé dashboard komponenty a nie sú baseline terajšieho Overall dashboardu.

Závislosti: route handles → AppShell → dostupný obsahový obdĺžnik → Overview → PageHeader/filter + KPI + panely + footer. Stav filtra a výpočty zostávajú v Overview; hlavička ani filter nezískajú dátovú zodpovednosť.

**Východiskový kontrolný bod:** T0 najprv zopakuje `OverviewPage.test.tsx` a `OverviewPage.translations.test.tsx` samostatne aj spolu, uloží presný výstup a rozlíši chybu existujúceho router test harnessu od zmien PageHeader. Oprava neplatného testovacieho obalu patrí do T0, pred T1; neprisudzovať existujúcu chybu novej implementácii. Zachovať súčasné rozdelenie 16/8 a 23/11, percentá a KPI navigáciu.

## 2. Varianty a odporúčanie

| Možnosť | Konzistentnosť UI | Zložitosť | Riziko regresií | Záver |
|---|---|---|---|---|
| A: Existujúce API bez zmeny | Spoločný komponent aj štandardný vzhľad. Filter v actions funguje ihneď. | Najnižšia, kým sa nemusí obchádzať geometria. | Ostatné stránky bez zásahu; dashboard spotrebuje približne o 42 px viac než minimálny toolbar, ešte pred rodičovskými medzerami. | Funkčne stačí, pri požadovanom výškovom rozpočte nie je preferované. Lokálne zásahy do vnútorných elementov PageHeader by boli krehké. |
| **B: Opt-in kompaktný variant** | Stále ten istý PageHeader, s explicitnou hustotou pre dashboard. | Malé aditívne API a cielené testy. | Riadené: default zostane presne dnešný, variant zapne iba Overview; treba overiť spoločný komponent aj jeho spotrebiteľov. | **Odporúčané.** Umožňuje nahradiť toolbar pri zachovaní dostupnej výšky. |
| C: Bez PageHeader | Dashboard zostane výnimkou, chýba požadovaná jednotná hlavička. | Najnižšia. | Malé pri ponechaní stavu, ale nesplní hlavný cieľ. | Neodporúčané. |

Navrhnuté jediné nové API: `variant?: 'default' | 'compact'`, predvolene `default`. Nemení sa typ title/description/actions, DOM hierarchia defaultu ani správanie existujúcich volaní. Nevytvárať CompactPageHeader, ďalší všeobecný slot či verejné konfigurovateľné rozmery.

### Kompaktná kompozícia

- PageHeader vložiť **namiesto** OverallToolbar ako prvého potomka `.overall-page`, nie ako ďalší blok nad ním. Tokeny filtra tak zostanú v dnešnom lokálnom scope.
- Nadpis: `t('nav.overview')`. Nový `overview.description`: SK „Stav ochrany, infraštruktúry a obnovy“, EN „Protection, infrastructure and recovery status“, CS „Stav ochrany, infrastruktury a obnovy“.
- Variant compact: cieľový h1 20 px / 24 px, popis 12 px / 16 px, bez spodného marginu; nezalomený textový blok približne 40 px. Default zostáva 36 + 20 + 16 px. Na compact zachovať štandardné písmo hlavičky, nepoužiť zdedených 11 px dashboardu pre nadpis.
- **Flex kontrakt compact variantu:** neupravovať default. V compact variante riešiť vonkajší `sm:flex-row`, textový `min-w-0`, rozmery `actions` a možnosť jeho zalomenia/presunu na ďalší riadok pri nedostatku priestoru. Samotné `flex-wrap` na vnútornej skupine pri rodičovi `shrink-0` nestačí. Použiť cielené `min-w-0`, bezpečné šírkové obmedzenia a shrink/wrap podľa nameranej šírky; pri zalomení nesmie filter prekryť nadpis, podnadpis ani okraj stránky. Testovať najmä 1024×768, 950×640 a SK/CS dlhé texty.
- Extrahovať iba prepínač do `OverallVendorFilter.tsx`; zachovať props `vendor` a `onVendorChange`, natívne tlačidlá, group s prístupným názvom, aria-pressed a focus-visible. Viditeľný názov skupiny môže byť vedľa tlačidiel; na mobile sa zalomí. Filter bude vpravo cez actions, pri nedostatku miesta pod textom bez pretečenia.
- Odstrániť použitie a po kontrole referencií aj osirelý OverallToolbar. Nenechať samostatný filter ani nový kontextový riadok. Scope už zostáva v podnadpise ProtectionOverview; nepridávať duplicitnú informáciu nad KPI.
- **Dátum ukážky a označenie demo inventára nepresúvať automaticky.** Najprv overiť pri T0/T3, či ich súčasná prezentácia môže zostať v rámci compact hlavičky bez duplicity, pretečenia a zvýšenia výšky. Presun do existujúceho footeru je iba podmienená dizajnová alternatíva na výslovné potvrdenie používateľom, ak ho meranie ukáže ako potrebný. V oboch prípadoch zachovať lokalizáciu a pevný UTC dátum 2026-10-16 (nie čas synchronizácie), štyri SIMULOVANÉ označenia a dosiahnuteľný footer bez orezania.
- Dátové komponenty, fixture, výpočty a prefetch bez zmeny. Zastaralé prekladové kľúče hromadne nečistiť.

### Výškový rozpočet a responzivita

Prvým krokom realizácie bude baseline v reálnom AppShell. Meranie je súčasťou implementačného overenia; pri tejto analýze sa browser nespúšťal a žiadne rozlíšenie ešte neoznačujeme ako overené.

Zmerať skutočnú výšku toolbaru, obsahový obdĺžnik main, KPI, oba riadky panelov, footer a všetky medzery. Pre nezalomený desktop cieliť na vzťah:

`nová hlavička + nové medzery + nový footer <= pôvodný toolbar + pôvodné medzery + pôvodný footer`.

Pri štyroch priamych potomkoch má stránka tri medzery. Návrh compact hlavičky 40 px namiesto min. 30 px toolbaru možno vykompenzovať lokálnym desktopovým gapom 6 px namiesto 10 px (úspora 12 px). Je to počiatočný návrh, nie preukázaný výsledok; zalomenie textu či prípadný schválený presun dátumu do footeru túto bilanciu zmení. Finálne hodnoty určí meranie. Nezmenšovať samotné KPI alebo texty panelov len na zamaskovanie nedostatku priestoru. Všetky štyri horné KPI musia zostať rovnako vysoké.

Zachovať pružné dva riadky panelov, dnešné pomery stĺpcov a pravidlá vnútorných kariet. Nepridávať pevné výšky podľa monitora, JS výpočty viewportu ani minimálnu výšku panelov 270 px. AppShell, route handles a globálne tokeny sa nemenia. Pravidlá compact variantu musia dovoliť zalamovanie actions **aj vonkajšieho flex rozloženia**; pri malom dostupnom obsahovom obdĺžniku odstrániť konfliktné `shrink-0` iba pre compact. Kontrolovať skutočnú šírku rodiča (sidebar + padding), nie len viewport. Nesmie vzniknúť clipping z `overflow:hidden` ani zmena default variantu.

Od 950 px zachovať desktopový dashboard bez vertikálneho scrollu všade, kde je celý obsah skutočne zobraziteľný. Pri 950×640 a pri 1024×768 s rozbaleným sidebarom preveriť zalamovanie najskôr. Skrytý overflow bez viditeľnosti posledného obsahu nie je splnenie kritéria. Ak meranie ukáže fyzický nedostatok priestoru aj po odstránení duplicít a medzier, zdokumentovať konkrétnu kombináciu a pred rozšírením rozsahu vyžiadať rozhodnutie; nezaviesť potichu desktopový scroll alebo orezanie.

Pod 950 px zachovať dnešné vertikálne scrollovanie celej Overview vrátane hlavičky a footeru, bez druhého vnoreného scroll kontajnera. Pod 700 px zachovať jeden stĺpec panelov; malé KPI zostanú dvojstĺpcové. Mobilný filter nesmie vyžadovať horizontálne scrollovanie. Dlhé SK/CS/EN texty sa zalomia bez skrývania podnadpisu.

## 3. Súbory budúcej implementácie

| Súbory | Zásah |
|---|---|
| `src/shared/components/page/PageHeader.tsx`, `PageHeader.test.tsx` | Opt-in compact; zachovanie defaultu; testy oboch kontraktov. |
| `src/locales/en.json`, `sk.json`, `cs.json` | Pridať iba `overview.description` s textami vyššie; zachovať všetky aktuálne kľúče vrátane `overview.viewRecoveryGroups` a `overview.viewRecoveryApplications`. |
| `src/features/dashboard/pages/OverviewPage.translations.test.tsx` | Najprv v T0 stabilizácia router test harnessu a dôkaz východiskových testov, potom kontrakt nového popisu a prepínanie EN/SK/CS bez resetu výrobcu. |
| `src/features/dashboard/components/overall/OverallVendorFilter.tsx` (nový) | Presunuté tlačidlá filtra bez novej logiky. |
| `src/features/dashboard/components/overall/OverallToolbar.tsx` | Po presune zodpovedností odstrániť, ak už nemá referencie. |
| `src/features/dashboard/pages/OverviewPage.tsx`, `overview.css`, `OverviewPage.test.tsx` | Kompozícia, podmienené premiestnenie informácie o demo dátume, lokálny výškový rozpočet a funkčné regresie; existujúce KPI navigačné odkazy zachovať a testovať, bez refaktoringu `OverallKpis.tsx`. |
| `scripts/qa/verify-overview-pageheader-app.mjs` (nový) | Automatizácia nad skutočnou aplikáciou v Edge. Existujúci HTML skript neprezentovať ako integračný test. |
| `tasks/overview-pageheader-verification.md` (nový), `tasks/todo.md` | Baseline, výsledky, screenshoty, limity a skutočný stav checklistu. |

Bez plánovaného zásahu: AppShell/AppHeader/AppSidebar, AppRoutes, TableToolbar, ostatné stránky, existujúce KPI/panely/model/mocks, API/backend a závislosti. Existujúce skeletony patria štandardnému headeru; nemenia sa globálne kvôli opt-in variantu. Skontrolovať aj načítanie Overview a zaznamenať prípadný rozdiel dnešného generického fallbacku.

## 4. Postup a kontrolné body

Podrobné úlohy T0–T6 sú v [todo.md](todo.md). Poradie: **T0 → T1 → T2 → T3 → T4 → T5 → T6**. Postupovať sekvenčne; jednotlivé kroky zdieľajú header, CSS a testy. Žiadne paralelné úpravy tých istých súborov.

- T0: odfotiť a zaznamenať aktuálny **dirty working tree** (vrátane KPI odkazov), uložiť presný výstup východiskových testov; stabilizovať chýbajúci router kontext v jazykovom testovacom obale a preukázať zelený baseline. Zmerať aktuálny AppShell a dostupnosť Edge/session; najprv riziko najmenšej výšky/šírky.
- T1: aditívny variant PageHeader s ochranou defaultu.
- T2: nový popis vo všetkých katalógoch.
- Kontrolný bod A: cielené testy T1/T2 prechádzajú; default bez vizuálnej zmeny.
- T3: presun filtra, náhrada toolbaru, zachovanie dát, KPI odkazov a prístupnosti. O umiestnení demo dátumu rozhodnúť podľa merania a používateľského potvrdenia; bez automatického presunu do footeru.
- T4: lokálne doladenie výšky a mobilného scrollu podľa meraní.
- Kontrolný bod B: najtesnejšie desktopové rozmery a oba mobily fungujú v reálnom AppShell pred rozšírením browser matice.
- T5: jazykové regresie vrátane už existujúcej KPI navigácie a opakovateľný Edge/Playwright skript; všetky kombinácie automaticky otestovať, vizuálne screenshoty uchovávať cielene.
- T6: celá požadovaná matica, TypeScript build a evidencia, záverečná kontrola rozsahu.

## 5. Testovacia stratégia po schválenej implementácii

**Pred prvým implementačným testom** vykonať samostatný a spoločný beh existujúcich Overview testov a zaznamenať úplnú diagnostiku. Aktuálny jazykový test neobsahuje router wrapper, hoci KPI renderujú `Link`; toto najprv stabilizovať pomocou `MemoryRouter` alebo ekvivalentného router kontextu v teste (bez zmeny produkčnej navigácie). Až po zdokumentovanom zelenom baseline doplniť zlyhávajúce testy nového variantu/hlavičky/popisu. Následne overiť jeden h1, filter v PageHeader iba raz, správne hodnoty, zachovaný výber a funkčné KPI odkazy na skutočné routy. JSDOM netestuje reálnu geometriu; o fit rozhoduje Edge.

Príkazy z koreňa repozitára:

```powershell
npm.cmd run typecheck
npm.cmd exec vitest run src/shared/components/page/PageHeader.test.tsx src/features/dashboard/pages/OverviewPage.test.tsx src/features/dashboard/pages/OverviewPage.translations.test.tsx src/locales/dashboardConsoleTranslations.test.ts src/shared/components/table/TableToolbar.test.tsx src/features/discovery-inventory/infrastructure/pages/InfrastructurePage.test.tsx
npm.cmd exec eslint -- src/shared/components/page/PageHeader.tsx src/shared/components/page/PageHeader.test.tsx src/features/dashboard/pages/OverviewPage.tsx src/features/dashboard/pages/OverviewPage.test.tsx src/features/dashboard/pages/OverviewPage.translations.test.tsx src/features/dashboard/components/overall/OverallVendorFilter.tsx scripts/qa/verify-overview-pageheader-app.mjs
npm.cmd run dev -- --host 127.0.0.1
# V samostatnom termináli po sprístupnení vývojovej session:
node scripts/qa/verify-overview-pageheader-app.mjs
git diff --check
```

`npm.cmd run typecheck` je povinný požadovaný TypeScript build (`tsc -b`, v projekte s noEmit). Kompletný `npm.cmd run build` a celý suite sa pri tejto lokálnej zmene nespúšťajú automaticky; build má navyše nesúvisiace API kontroly. Ak sa zmení spoločný kontrakt nad plánovaný variant, prehodnotiť rozsah testov. Lint zoznam zodpovedá finálnym existujúcim zmeneným JS/TS súborom; odstránený toolbar nelintovať. JSON validovať parserom a testami katalógov.

### Edge/Playwright a screenshoty

Použiť Microsoft Edge cez Playwright `chromium.launch({ channel: 'msedge' })` nad HTTP URL skutočnej index route. V repozitári nie je Playwright deklarovanou závislosťou; existujúci QA skript podporuje `PLAYWRIGHT_MODULE`. Pri analýze existovala cache `node_modules/.cache/scroll-probe/node_modules/playwright-core/index.mjs` aj Edge executable; dostupnosť znovu preveriť pri realizácii. Nový skript nech podporí explicitné URL, runtime a storage state vývojovej session; nepísať tokeny/heslá do repozitára. Session nemožno predpokladať z existencie runtime.

Povinná matica CSS viewportov (nie fyzických rozmerov monitora):

| Rozmer | Očakávanie |
|---|---|
| 1920×1080 | Celý dashboard bez vertikálneho scrollu. |
| 1440×900 | Celý dashboard bez vertikálneho scrollu. |
| 1366×768 | Celý dashboard bez vertikálneho scrollu. |
| 1100×700 | Celý dashboard; zvýšená kontrola šírky pri sidebare. |
| 1024×768 | Celý dashboard; kritický prechod lg a šírka actions. |
| 950×640 | Celý dashboard; kritický prechod do dvoch riadkov panelov. |
| 390×844 | Jeden vertikálny scroll Overview, celý obsah a footer dosiahnuteľné. |
| 320×700 | To isté, bez horizontálneho overflow a orezaného filtra. |

**Automatické DOM/behaviorálne kontroly** spustiť v každej kombinácii ôsmich rozmerov, light/dark a EN/SK/CS (48 kombinácií); rozbalený desktopový sidebar je základ, zbalený overiť tam, kde ho UI podporuje (od xl). Pod lg preveriť mobilné otvorenie/zavretie sidebaru. Navyše hraničné šírky 639/640, 699/700/701, 949/950, 1023/1024 a 1279/1280 pri výške 700 px pre riziká zalamovania. Tieto kontroly neznamenajú povinnosť ukladať 48 screenshotov.

Meranie musí overiť document/main/Overview a obsah panelov: scrollHeight voči clientHeight s toleranciou najviac 1 px, obdĺžnik footeru a posledných položiek v dostupnom viewporte, neorezané texty, žiadny horizontálny overflow. Nestačí nulový scrollbar pri overflow:hidden. Na mobile scrollom dosiahnuť footer a potvrdiť jediného vlastníka scrollu. Vyskúšať Tab, Enter/Space a viditeľný focus, všetky filtre, prechod na All aj zachovanie výberu pri zmene jazyka a témy. Samostatne otestovať obidva existujúce KPI odkazy: klik naviguje cez React Router na `routes.recoveryGroups` a `routes.recoveryApplications`, bez full-page reloadu; samotné `href` nie je dostatočný dôkaz.

**Screenshoty ukladať cielene:** minimálne pred/po pre 1366×768 light/dark, najtesnejšie 1024×768 a 950×640 (vrátane dlhšieho SK/CS prekladu), 390×844 a 320×700 (vrch aj footer po scrollovaní). Ďalšie screenshoty len pre reálny problém, nezvyčajné zalomenie alebo hraničný stav. Vizuálne ich skontrolovať, s jasnými názvami/kontextom. Ostatné kombinácie pokrýva automatická DOM matica s výsledkami, nie 48 povinných obrazových súborov. Pred/po reprezentatívne porovnať default PageHeader na Platform providers (actions), Infrastructure (dlhší popis/obnova) a jednej Resources stránke cez TableToolbar, s light/dark a aspoň jedným užším viewportom. Tieto stránky sa nemenia.

Artefakty do ignorovaného `node_modules/.cache/overview-pageheader-app/`; pred zápisom overiť ignorovanie. Report uvedie HEAD a preexistujúci working-tree diff baseline, presnú diagnostiku/opravu pôvodného testu, URL, runtime/session predpoklady, rozmer dostupného obsahu, výšky pred/po, výsledky všetkých automaticky testovaných kombinácií, vybrané screenshoty a súvisiace konzolové chyby. Ak chýba autentifikovaná session, browser body zostávajú neoverené; izolovaný komponent ani HTML tento dôkaz nenahrádzajú.

## 6. Akceptačné kritériá

1. Overview používa existujúci PageHeader s compact variantom; v SK má presne „Prehľad“ a „Stav ochrany, infraštruktúry a obnovy“. EN/CS sú preložené, bez surových kľúčov.
2. Filter existuje iba raz v actions, na dostatočnej šírke vpravo; na mobile sa zalomí, je pomenovaný a ovládateľný klávesnicou. Samostatný toolbar/context riadok nezostane.
3. Zostanú štyri **rovnako vysoké** KPI a štyri existujúce panely. Filter mení iba ochranu: All 1280/80, IBM 820/40, Hitachi 460/40 (so snímkami/bez snímok). Poskytovatelia 13, skupiny 24, aplikácie 34, aktuálne pomery Recovery Overview 16/8 a 23/11 i nasadenie 18/23, 8/11, 20/25, 6/9 zostávajú. Existujúce KPI odkazy „Zobraziť skupiny/aplikácie“ sa zobrazujú a navigujú správne; prefetch a demo označenia zostanú.
4. Desktopová matica zobrazí všetok obsah bez scrollu a bez maskovaného orezania tam, kde existujúce podporované rozloženie fit umožňuje; každý prípadný limit bude konkrétne preukázaný a pred zmenou požiadavky predložený používateľovi. Mobil zachová jeden vertikálny scroll a dostupný footer.
5. Default PageHeader a ostatné stránky majú nezmenený vzhľad; opt-in nemení AppShell, routovanie ani TableToolbar. Flex layout compact variantu bezpečne zalamuje vonkajšie actions bez kolízie/shrink-0 pretečenia; light/dark, EN/SK/CS a dlhé preklady sú overené. Zachovanie alebo prípadný presun demo dátumu sa riadi meraním a explicitným schválením, nie automaticky.
6. Východiskové Overview testy sú najprv opravené na zelený baseline bez produkčných zmien. TypeScript build, cielený ESLint, relevantné testy a reálny Edge/Playwright prejdú; automatická matica sa vykoná v plnom rozsahu a vybrané reprezentatívne screenshoty sa skontrolujú. Neoverené body sa nevydávajú za splnené.

## 7. Riziká a opatrenia

| Riziko | Opatrenie |
|---|---|
| Compact stále zvýši spotrebu výšky pri zalomení. | Baseline najprv; celkový rozpočet header + gap + footer; skorý test 950×640 a 1024×768; žiadne orezanie ako náhrada fit. |
| Globálna regresia cez spoločný komponent. | Variant iba opt-in, default bez zmeny DOM/tried; existujúce testy a pred/po screenshoty reprezentatívnych stránok. |
| 950 px dashboard vs. 1024 px shell a šírka sidebaru. | Testovať obsahový obdĺžnik a oba zlomy, nie len media query okna. |
| Malé dashboardové písmo zmení hlavičku alebo tokeny filtra. | Explicitná typografia variantu; filter pod .overall-page; existujúce light/dark tokeny. |
| Dlhé preklady a rodičovské `sm:flex-row` / `shrink-0` actions pretečú. | Opt-in kompakt: limitovať šírku actions aj rodiča, `min-w-0` + adekvátny shrink/wrap, reálne merania s rozbaleným sidebarom; default sa nemení. |
| Presun dátumu do footeru zvýši výšku alebo vytvorí nový problém. | Dátum nepremiestňovať automaticky; pred rozhodnutím merať a vyžiadať explicitné potvrdenie, výsledný footer musí zostať dostupný. |
| Rozpracované zmeny KPI, lokalizácií a testov sa omylom prepíšu alebo sa ich chyba označí ako regresia PageHeader. | V T0 zapísať HEAD + working-tree diff a výsledok oboch testov, stabilizovať testovací router, zachovať KPI navigáciu, testovať ju po integrácii. |
| Staré QA/reporty vytvoria falošný úspech. | Nové meranie nad React/AppShell, úplná viewport matica, jasne oddeliť staré HTML a chýbajúcu session. |

**Jednoznačné odporúčanie: B — rozšíriť existujúci PageHeader o explicitný kompaktný variant, ktorý použije iba Overview.** Plán navrhuje nahradiť toolbar, zachovať existujúce KPI navigačné odkazy a podmieniť prípadný presun dátumu meraním a samostatným súhlasom používateľa. Realizácia je dokončená; výsledky a limity zachytáva prepojený overovací report.
