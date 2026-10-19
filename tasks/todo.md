# Úlohy: Overview s kompaktným PageHeader

Plán: [plan.md](plan.md). Dátum: 2026-10-19. Vetva: `spike/ant-design-shell`.
Stav: T0–T6 dokončené a overené inline. Evidencia: [overview-pageheader-verification.md](overview-pageheader-verification.md). Používateľ následne schválil commit vlastných zmien; nezávislé úpravy zostávajú mimo neho. Bez merge a push.
Tento checklist aktualizuje to isté zadanie; nahrádza skorší návrh desktopového scrollu.

## T0: Stabilizovať baseline testov a zmerať aktuálny AppShell

**Popis:** Pred PageHeader zásahom zaznamenať aktuálny HEAD, rozpracovaný working tree a jeho súbory (najmä KPI odkazy na skupiny/aplikácie, Recovery Overview, testy, CSS a lokalizácie). Spustiť `OverviewPage.test.tsx` a `OverviewPage.translations.test.tsx` osobitne aj spolu a uložiť úplný výstup. Predchádzajúci kombinovaný beh skončil `exit code 1`; potvrdiť príčinu, potom stabilizovať testovací router obal (jazykový test aktuálne renderuje `Link` bez routera), bez zmeny produkčného routovania. Až po zelenom baseline zaznamenať geometriu, dostupnosť Edge/Playwright a session. Najprv preveriť 950×640, 1024×768 so sidebarom a 320×700; potom zvyšok povinnej matice z plánu. Merania starej HTML predlohy nepovažovať za baseline aplikácie.

**Akceptačné kritériá:**
- [x] Zaznamenaný HEAD a pôvodný working-tree diff; neprepisujú sa rozpracované zmeny `OverallKpis`, `RecoveryOverview`, `OverviewPage.test`, `overview.css`, EN/SK/CS ani iné nezávislé súbory.
- [x] Uložený presný výstup východiskových testov, potvrdená príčina pôvodného pádu, opravený iba neplatný testovací router obal; obidva Overview testy prejdú samostatne aj spolu ešte pred T1.
- [x] Známe výšky toolbaru, KPI, riadkov panelov, footeru, medzier a dostupný content rectangle; odlíšený fit od orezania.
- [x] Zaznamenané súčasné limity, viewport, jazyk/téma, sidebar a session/runtime; existujúce nedostatky nie sú vydávané za regresie.
- [x] Baseline screenshoty Overview aj reprezentatívnych stránok s default PageHeader sú uložené podľa plánu.

**Overenie:** Vitest pre obe Overview suites (každú osobitne aj kombinovane), Edge nad HTTP aplikáciou, skontrolované baseline screenshoty a DOM merania. Pri chýbajúcej session označiť browser overenie ako blokované, neobchádzať autentifikáciu.
**Závislosti:** Schválenie plánu. **Rozsah:** M, 1 nový report + prípadná úprava testovacieho obalu.
**Súbory:** `src/features/dashboard/pages/OverviewPage.translations.test.tsx` (iba stabilizácia testovacej navigácie podľa diagnostiky), nový `tasks/overview-pageheader-verification.md`; artefakty v ignorovanej cache podľa plánu.

## T1: Zaviesť opt-in compact variant spoločnej hlavičky

**Popis:** Rozšíriť existujúci PageHeader o variant default/compact. Default má dnešnú geometriu aj DOM; compact cieli na 40 px nezalomený textový blok bez spodného marginu a bezpečné zalomenie **celého rodičovského flex riadka aj actions** (nielen vnútorné `flex-wrap`). Ošetriť `sm:flex-row`, `shrink-0`, `min-w-0` a hranice šírky pri otvorenom sidebare bez zmeny default variantu.

**Akceptačné kritériá:**
- [x] Volania bez variantu majú nezmenené title/description/actions a dnešný vzhľad; nový variant používa rovnaký komponent.
- [x] Compact zachová h1, podnadpis aj actions; neobsahuje pravidlá špecifické pre výrobcov alebo dátovú logiku.
- [x] Pri 1024×768, 950×640 a dlhších SK/CS textoch sa actions buď zmestia vedľa popisu, alebo prejdú pod neho bez pretečenia, prekrytia a maskovania overflow; samotný `flex-wrap` vo vnútri `shrink-0` kontajnera sa nepovažuje za riešenie.
- [x] Nepribudne nový PageHeader komponent ani zmena TableToolbar, AppShell či ostatných stránok.

**Overenie:** Nový relevantný test najprv zlyhá; potom `npm.cmd exec vitest run src/shared/components/page/PageHeader.test.tsx src/shared/components/table/TableToolbar.test.tsx`. Cielený ESLint oboch zmenených PageHeader súborov. Geometriu neskôr preukáže Edge.
**Závislosti:** T0. **Rozsah:** S, 2 súbory.
**Súbory:** `src/shared/components/page/PageHeader.tsx`, `PageHeader.test.tsx`.

## T2: Pripraviť presný lokalizovaný podnadpis

**Popis:** Doplniť `overview.description` v EN/SK/CS podľa plánu, názov používa existujúci `nav.overview`. Zachovať všetky existujúce kľúče, vrátane lokalizovaných odkazov `overview.viewRecoveryGroups` a `overview.viewRecoveryApplications`.

**Akceptačné kritériá:**
- [x] SK obsahuje presne „Stav ochrany, infraštruktúry a obnovy“; EN/CS sú rovnocenné a neprázdne.
- [x] Katalógy majú rovnaké kľúče a parametre; test explicitne vyžaduje nový popis.

**Overenie:** Nová kontrola najprv zlyhá; potom `npm.cmd exec vitest run src/features/dashboard/pages/OverviewPage.translations.test.tsx src/locales/dashboardConsoleTranslations.test.ts`; parser JSON a cielený ESLint zmeneného testu.
**Závislosti:** T1. **Rozsah:** M, 4 súbory.
**Súbory:** `src/locales/en.json`, `sk.json`, `cs.json`, `src/features/dashboard/pages/OverviewPage.translations.test.tsx`.

## Kontrolný bod A: Spoločný kontrakt a preklady

- [x] Testy T1/T2 prešli, default hlavička sa nezmenila a verejné rozšírenie je iba opt-in.
- [x] Diff neobsahuje zmeny nesúvisiacich stránok ani dát.

## T3: Nahradiť toolbar hlavičkou a presunúť filter

**Popis:** V Overview nahradiť OverallToolbar spoločným compact PageHeader. Tlačidlá extrahovať do OverallVendorFilter v actions. Dátum demo inventára **nepresúvať automaticky**: preveriť jeho ponechanie v compact hlavičke, presun do footeru iba ak je preukázateľne nutný a používateľ ho explicitne schváli. Odstrániť toolbar po kontrole referencií. Existujúce KPI odkazy na skupiny/aplikácie ani aktuálne Recovery Overview neupravovať.

**Akceptačné kritériá:**
- [x] Jeden h1, správny podnadpis, jedna pomenovaná skupina filtra v actions; žiadny ďalší horný filter/context riadok.
- [x] Všetky tri filtre vrátane návratu na All majú správne hodnoty ochrany; poskytovatelia, obnova, nasadenie, prefetch a demo označenia zostali.
- [x] Obe už rozpracované KPI navigácie („Zobraziť skupiny“, „Zobraziť aplikácie“) zostali funkčné, správne preložené a kliknutie prejde na `routes.recoveryGroups` / `routes.recoveryApplications` cez React Router bez úplného reloadu; KPI rozdelenie ostalo bez duplicitných celkových čísel.
- [x] Klávesnica, aria-pressed a focus fungujú; scope zostáva v ProtectionOverview. Pevný lokalizovaný dátum 2026-10-16 zostane správne označený ako demo údaj; akýkoľvek presun do footeru vyžaduje meranie a explicitné schválenie a nesmie spôsobiť overflow.

**Overenie:** Najprv zlyhávajúci test hlavičky/umiestnenia filtra; potom `npm.cmd exec vitest run src/features/dashboard/pages/OverviewPage.test.tsx src/features/dashboard/pages/OverviewPage.translations.test.tsx`. Cielený ESLint existujúcich zmenených TSX súborov.
**Závislosti:** T1, T2. **Rozsah:** M, 4 súbory vrátane odstránenia.
**Súbory:** `src/features/dashboard/pages/OverviewPage.tsx`, `OverviewPage.test.tsx`, nový `src/features/dashboard/components/overall/OverallVendorFilter.tsx`, odstránený `OverallToolbar.tsx`.

## T4: Uzavrieť výškový rozpočet a mobilný scroll

**Popis:** Podľa baseline doladiť lokálnu overview.css. Compact hlavička nahradí toolbar; rozdiel výšky kompenzovať medzerami, nie novým desktopovým scrollom alebo zmenou obsahu. Zachovať existujúcu štruktúru panelov, mobilné zlomy a rovnakú výšku všetkých štyroch KPI. Skontrolovať prípadný schválený presun dátumu vrátane jeho vplyvu na footer.

**Akceptačné kritériá:**
- [x] Pri nezalomenom desktope nový horný blok + medzery + footer nespotrebujú viac než baseline; pri zalomení je fit preukázaný meraním. Zmeny neskrývajú ani nestláčajú KPI a obsah panelov; ich vizuálne mierky a pomery zostanú.
- [x] 950×640 a 1024×768 zobrazia všetky KPI/panely/footer bez orezania alebo zaznamenajú konkrétny limit na rozhodnutie podľa plánu.
- [x] Mobily 390×844 a 320×700 majú jediný vertikálny scroll Overview; filter, dlhé texty a footer nepretečú horizontálne.

**Overenie:** Edge/Playwright v light/dark a EN/SK/CS nad reálnym AppShell; porovnanie rozpočtu s T0, viewportové screenshoty a kontrola vnútorného overflow; `git diff --check`.
**Závislosti:** T3. **Rozsah:** S, 2 súbory.
**Súbory:** `src/features/dashboard/pages/overview.css`, `tasks/overview-pageheader-verification.md`.

## Kontrolný bod B: Najtesnejšie rozloženia

- [x] Krátky desktop, desktop so sidebarom a oba mobily overené v reálnej aplikácii.
- [x] Overflow:hidden nemaskuje chýbajúci obsah; AppShell a route handles zostali bez zásahu.
- [x] Každý fyzický limit vyžadujúci zmenu požiadavky bol predložený používateľovi; neprešlo sa potichu na desktopový scroll.

## T5: Doplniť jazykové regresie a opakovateľné browser QA

**Popis:** Na už stabilizovanom router test harness-e rozšíriť jazykový test o hlavičku a zachovanie výrobcu medzi EN/SK/CS. Pripraviť Edge/Playwright skript nad aplikáciou s explicitným URL, runtime a session predpokladmi, podľa celej **automatickej** matice v pláne. Overiť aj obidve existujúce KPI navigácie; screenshoty ukladať cielene, nie pre každú kombináciu.

**Akceptačné kritériá:**
- [x] EN/SK/CS správne prepnú názov, podnadpis a filter bez resetu výrobcu a bez surových kľúčov.
- [x] Skript cieli na HTTP React aplikáciu a kontroluje fit, vnútorné orezanie, mobilný scroll, klávesnicu, všetky filtre a obidva KPI navigačné odkazy; výsledok zaznamená pre všetkých 8 viewportov × 2 témy × 3 jazyky plus hraničné šírky.
- [x] Screenshoty vzniknú iba pre reprezentatívne desktopové a mobilné stavy (vrátane mobilného vrchu/footeru), dlhšie preklady, regresie a problémové rozlíšenia; nepovažovať 48 kombinácií za povinných 48 obrázkov.
- [x] Nový skript využíva existujúci runtime bez pridania závislosti; tajomstvá session nie sú v repozitári ani reporte.

**Overenie:** `npm.cmd exec vitest run src/features/dashboard/pages/OverviewPage.translations.test.tsx`; cielený ESLint testu a `scripts/qa/verify-overview-pageheader-app.mjs`; spustenie skriptu proti vývojovej session.
**Závislosti:** T4. **Rozsah:** S, 2 súbory.
**Súbory:** `src/features/dashboard/pages/OverviewPage.translations.test.tsx`, nový `scripts/qa/verify-overview-pageheader-app.mjs`.

## T6: Vykonať finálne overenie a zaznamenať dôkazy

**Popis:** Uzavrieť úplnú maticu aj regresiu ostatných stránok. Presné príkazy a postup sú v sekcii 5 plánu; úspešné kontroly neopakovať bez ďalšej zmeny alebo dôvodu.

**Akceptačné kritériá:**
- [x] Prešli TypeScript build, cielený ESLint a relevantné testy; skutočne spustené príkazy a výsledky sú zaznamenané.
- [x] Edge/Playwright automaticky overil všetkých 8 povinných viewportov, obe témy, EN/SK/CS, hraničné šírky, relevantné stavy sidebaru a navigáciu z KPI; vybrané reprezentatívne a problémové screenshoty boli vizuálne skontrolované.
- [x] Default PageHeader na Platform providers, Infrastructure a Resources má nezmenený vzhľad; report obsahuje porovnanie baseline/finál a každý neoverený bod.

**Overenie:** `npm.cmd run typecheck` (tsc -b); explicitné Vitest/ESLint príkazy z plánu; `node scripts/qa/verify-overview-pageheader-app.mjs`; `git diff --check`; kontrola rozsahu diffu. Kompletný suite ani produkčný build sa automaticky nespúšťajú.
**Závislosti:** T5. **Rozsah:** S, 2 dokumenty.
**Súbory:** `tasks/overview-pageheader-verification.md`, `tasks/todo.md`.

## Záverečný kontrolný bod

- [x] Splnené kritériá 1–6 z plánu, nezmenené dáta/API/backend a žiadny nesúvisiaci refactoring.
- [x] Prvotný zlyhaný test je zdokumentovaný a testovací baseline pre T1 je zelený; existujúce KPI odkazy a rozpracované zmeny zostali zachované.
- [x] Plánové odhady sú odlíšené od reálnych meraní; chýbajúca autentifikovaná session zostáva neovereným bodom.
- [x] Používateľ dostal výsledok s vykonanými príkazmi, screenshotmi a limitmi.

## Schválenie

- [x] Používateľ schválil vykonanie variantu B cez executing-plans inline; existujúce nezávislé zmeny zostávajú zachované.

## Následná úprava: odstránenie spodného riadka

- [x] Na následný pokyn používateľa odstránený footer s ABCO, sloganom a demo textom aj jeho osirelé CSS; pôvodné kritérium zachovania footeru tým bolo nahradené.
- [x] Upravený existujúci jazykový test a QA kontrola posledného panelu; 9 cielených testov a ESLint prešli.
- [x] Playwright/Edge overil 1366×768, 950×640 a 320×700 v light/dark (6/6 PASS); screenshoty a výsledky sú vo výsledkovom reporte. Bez commitu.
