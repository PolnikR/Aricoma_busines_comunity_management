# Operations Console — overenie implementácie

2026-10-16. Implementované inline na vetve `spike/ant-design-shell`, v samostatných atomických commitoch. Referencia je [HTML prototyp](../../prototypes/dashboard-modern/operations-console.html), integrovaná stránka je existujúci React Overview.

## Rozsah a rozmerový kontrakt

Overview používa existujúci AppShell, ThemeProvider a demo dáta. Route opt-in `contentFit: 'viewport'` zabezpečuje výškový rámec aj na mobile; ostatné stránky si ponechávajú pôvodné scrollovanie. Dashboard vypĺňa pridelený host, nie systémový Fullscreen/F11.

Finálne hranice sa odvodzujú od **hostu**, nie rozlíšenia monitora:

| Režim | Rozmery hostu | Obsah |
| --- | --- | --- |
| Wide | W ≥ 1150 a H ≥ 740 CSS px | KPI pás, 3 analytické panely, infrastructure pás |
| Compact | W ≥ 850 a H ≥ 500 CSS px | KPI pás, panely v 2 × 2 mriežke |
| Sections | ostatné podporované rozmery | 11 prepínateľných stránok: 4 KPI, Issues, Applications, Topology, 4 resource bloky |

Počiatočný návrh H440 neprešiel kontrolou pri efektívnom viewporte 960 × 540. Zvýšenie na H500 zachováva plný obsah na všetkých požadovaných desktopoch a pri nízkom okne aktivuje sekcie. Compact rešpektuje minimá 12 px pre hlavné názvy, 11 px pre pomocný text a 20 px pre dominantné hodnoty.

## Reprodukcia

Node ≥ 22.22.0, existujúce dependencies, samostatný Edge/Chromium s CDP portom 9340 a dočasným profilom. Nikdy nepoužiť každodenný profil používateľa. Vite spustiť na porte 5177:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5177 --strictPort
```

Browser spustiť s `--headless=new --disable-gpu --no-first-run --no-default-browser-check --remote-debugging-address=127.0.0.1 --remote-debugging-port=9340 --user-data-dir=<samostatny-docasny-profil>`. Spúšťať kontroly postupne; paralelné headless taby môžu pozastaviť animation frames neaktívneho tabu a vyvolať timeout CDP.

```powershell
node scripts/qa/verify-operations-console.mjs
node scripts/qa/verify-operations-console.mjs --prototype
node scripts/qa/verify-console-interactions.mjs
```

Harness otvára vlastný izolovaný tab, iba v ňom interceptuje lokálny config/API na existujúci auth-off režim a prázdny provider inventory. Nemení `public/config.js`, produkčné prihlasovanie ani backend. Každá navigácia čaká na správnu URL, načítanie prekladov, tému a fonty. Výstupy meraní a screenshoty vytvára v `.dashboard-qa/`.

## Browserová matica

React: 8 desktopov × EN/SK/CS × Light/Dark × expanded/collapsed sidebar = **96 profilov**. Päť malých rozmerov × 3 jazyky × 2 témy = **30 profilov**, každý s kontrolou všetkých 11 stránok. Spolu **126 profilov / 426 zobrazení**; density Compact/Spacious sa navyše kontroluje pri 1366 a 1920 px.

| Desktopové viewporty | Výsledný obsah |
| --- | --- |
| 1280 × 720, 1366 × 650, 1366 × 768 | všetky metriky súčasne |
| 1440 × 900, 1536 × 864, 1600 × 900 | všetky metriky súčasne |
| 1920 × 1080, 2560 × 1440 | všetky metriky súčasne |
| 1024 × 768 expanded, 768 × 1024, 390 × 844, 320 × 568, 320 × 480 | všetky metriky dostupné cez 11 stránok |

Namerané hosty s rozbaleným sidebarom: 894 × 590 pri 1280 × 720; 980 × 520 pri 1366 × 650; 980 × 638 pri 1366 × 768; 1054 × 770 pri 1440 × 900; 1150 × 734 pri 1536 × 864; 1214 × 770 pri 1600 × 900; 1534 × 950 pri 1920 × 1080; 2174 × 1310 pri 2560 × 1440. Mobilné minimum poskytuje host 288 × 384; koreň dashboardu má totožné rozmery.

Samostatné HTML: **26 profilov**, obe témy pri rovnakých 13 rozmeroch. Pri 1024 × 768 bez aplikačného sidebaru sa zmestí plná kompozícia; React s rozbaleným sidebarom používa sekcie.

Kontrola meria document scroll, vyplnenie hostu s toleranciou 2 px, hranice viditeľných panelov, textov a controls aj ich vlastné scroll rozmery. Overuje celý schválený inventár hodnôt, nie len úvodnú mobilnú stránku. Doplnková kontrola porovnáva recty hostu, dashboardu a panelov medzi témami.

Uložené vizuálne dôkazy: [Compact Light](screenshots/console-compact-light.png), [Wide Dark](screenshots/console-wide-dark.png), [mobilná stránka Dark](screenshots/console-mobile-dark.png). Doplnkový `--quick` beh pre React aj HTML prešiel kontrolou zhodnej geometrie tém pri 1366 × 650, 1920 × 1080, 390 × 844 a 320 × 480.

## Robustnosť a prístupnosť

- Päťciferná typografia `12 345` v EN/SK/CS a oboch témach pri 1366 × 650, 320 × 480 a 960 × 540; v sekciách každá stránka. Ide o záťaž textového layoutu, nie zmenu demo datasetu alebo dôkaz nového API kontraktu.
- Loading, unknown, empty, partial a demo: desktop 1366 × 650 a minimum 320 × 480, EN/SK/CS, obe témy, každá dostupná stránka. Unit testy navyše overujú, že unknown nie je nula a partial zachová dostupných providerov. Hlásenie čiastočnej chyby providera sa pružne zalamuje v jednom spoločnom riadku s označením Unknown.
- Detail otvorený na desktope → resize na mobil → Escape: focus zostáva počas otvorenia v dialógu a po zatvorení prejde na viditeľný pager. Regresia bola najprv reprodukovaná zlyhávajúcim testom a potom opravená.
- Normálne zatvorenie detailu obnovuje opener. Hidden sekcie nie sú v tab poradí; zvolená stránka prežije resize do plnej kompozície a späť. Observer sa pri unmount odpojí.
- Refresh zachováva význam demo dát. Prechod cez router na Configuration pri 390 × 844, 1024 × 768 a 1366 × 650 uvoľňuje viewport opt-in; shell regresiu pokrýva aj integračný test.
- Farebné roly majú aj textové vysvetlenie. Issues používa jednu mierku a nezaokrúhlené podiely; count a share majú samostatné názvy. Zachované demo vysvetlivky 42/18 aj kvalifikácia category counts.
- Vypočítaný kontrast na paneli: Light sekundárny text 9.26:1, teal 5.50:1, modrá 5.44:1, focus 3.26:1; Dark sekundárny text 11.04:1, teal 10.44:1, focus 8.34:1. Vizuálne skontrolované kompaktné, široké a mobilné screenshoty.

## Automatizované kontroly

```powershell
npm.cmd exec vitest run src/features/dashboard/pages/OverviewPage.test.tsx src/features/dashboard/components/DashboardMetricCard.test.tsx src/features/dashboard/model/selectDashboardMetrics.test.ts src/features/dashboard/hooks/useDashboardLayout.test.tsx src/contexts/ThemeContext.test.tsx src/layouts/app-shell/AppShell.test.tsx src/layouts/app-shell/AppHeader.test.tsx src/locales/dashboardConsoleTranslations.test.ts
npm.cmd run typecheck
$consoleFiles = git diff --name-only --diff-filter=ACMR 6688add5 -- '*.ts' '*.tsx'
npm.cmd exec eslint -- $consoleFiles --max-warnings 0
node --check scripts/qa/operations-console-browser.mjs
node --check scripts/qa/verify-operations-console.mjs
node --check scripts/qa/verify-console-interactions.mjs
git diff --check
```

Focused suite: **8 súborov, 36 testov**. Typová kontrola a focused ESLint bez chýb. Nový výškový prah má samostatne overenú red → green regresiu. Nezávislé read-only review po opravách nezistilo potvrdený blokujúci problém.

Úplný test suite ani produkčný build sa nespúšťali podľa pravidiel AGENTS.md pre focused verification. Bez pushu, merge alebo deployu.

## Hranice dôkazu

Minimum no-scroll zmluvy je **320 × 480 CSS px**. Pod ním má dostupnosť prednosť pred zákazom scrollovania. Pri 200 % zoome rozhoduje efektívna CSS plocha: kontrola 960 × 540 pokrýva ekvivalent plochy 1920 × 1080 pri 200 %, nie samostatný test browserového zoom ovládača. Dialógy si ponechávajú existujúci prístupný overflow kontrakt pre dlhý obsah.

Browserové overenie prebehlo na Edge/Chromium s fixture dátami a mockovaným provider inventory. Produkčný backend, Safari/Firefox a nový dátový zdroj nie sú predmetom tohto overenia.

## Atomické commity

`91d75b84` meranie, `90507a79` prototyp, `09dd8667` route opt-in, `139fff2b` React rámec, `dfad9b5b` lokalizácia, `7ad0ffdd` Issues, `ddb516d7` Applications/Topology, `f2e4d12c` Infrastructure, `4fe8de7e` stránkovanie, `5678ecb4` fokus po resize, `3f46207e` krátke okná a veľké counts, `2c13ba07` partial hláška, `ccf81a9c` browserové overovanie. Záverečný dokumentačný commit pridáva tento report a screenshoty.
