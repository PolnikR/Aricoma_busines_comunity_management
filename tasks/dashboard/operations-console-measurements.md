# Operations Console — vstupné meranie

2026-10-15, Edge headless, skutočný React AppShell, CSS viewport pri 100 % zoome. Overenie používa v izolovanom tabe existujúci auth-off režim a prázdny provider inventory; dashboard ostáva na existujúcej demo fixture. Žiadne produkčné prihlasovanie alebo API sa nemenilo.

## Baseline

| Viewport | Sidebar | Dashboard content W × H | Zistenie |
| --- | --- | --- | --- |
| 1366 × 650 | expanded | 980 × 520 | Infrastructure má scrollHeight 169 pri clientHeight 155; clipping aj bez document scrollu |
| 1366 × 650 | collapsed | 1180 × 520 | rovnaký overflow Infrastructure |
| 1280 × 720 | expanded | 894 × 590 | všetky panely sa zmestia, KPI zaberajú priveľa vertikálneho priestoru |
| 1280 × 720 | collapsed | 1094 × 590 | všetky panely sa zmestia |
| 1440 × 900 | expanded | 1054 × 770 | existujúci 2 × 2 board vyplní host |
| 1440 × 900 | collapsed | 1254 × 770 | existujúci 2 × 2 board vyplní host |
| 1920 × 1080 | expanded | 1534 × 950 | panely využívajú host; nový vizuál musí tento kontrakt zachovať |
| 1920 × 1080 | collapsed | 1734 × 950 | rovnaký kontrakt |
| 390 × 844 | mobilný overlay | 343 × 1873 | document scrollHeight 1969; nutný route viewport opt-in a Sections režim |

Pri desktopoch je horná hrana hostu y=93 a spodný okraj viewportu je vzdialený 37 px. Rozbalený sidebar a rámec zaberajú 386 px šírky; collapsed 186 px. Tieto hodnoty sú namerané, nie nové pevné offsety v CSS.

## Rozmerové rozhodnutia

- Rozhodovať podľa `.dashboard-host` (šírka aj výška), nie iba podľa window breakpointu.
- Wide začína približne na 1150 × 600 host px. Kompaktne zobraziť všetko od 850 × 440 host px. Hranice sa musia potvrdiť konečnou vizuálnou verifikáciou vrátane prekladov.
- Pri 1366 × 650 expanded treba prejsť na úspornejšiu kompozíciu; zmenšovanie existujúcich donutov alebo skrytie overflow nestačí.
- Na malých plochách zobraziť jednu zvolenú sekciu, pri nedostatku výšky jednu položku. Žiadna automatická rotácia, každý údaj dostupný cez pager.
- Koreňový grid vyplní pridelený host. Šírka nemá max-width, panelové riadky používajú pružný zvyšok výšky. Výškový kontrakt na mobile vlastní iba Overview opt-in v AppShell.
- Minimá nového vizuálu: hlavné labely 12 px, pomocný text 11 px, hodnoty 20 px. Staré 8–10px texty sa nepovažujú za prijateľné riešenie fitu.

## Reprodukcia a checkpoint

Baseline bol zmeraný cez Chrome DevTools Protocol na izolovanom Edge a lokálnom Vite `http://127.0.0.1:5177/`. Opakovateľné konečné meranie bude v `scripts/qa/verify-operations-console.mjs`; baseline JSON a screenshoty sú pracovné artefakty, nie produkčný zdroj dát.

Focused baseline: `npm.cmd exec vitest run src/features/dashboard/pages/OverviewPage.test.tsx src/features/dashboard/components/DashboardMetricCard.test.tsx src/features/dashboard/model/selectDashboardMetrics.test.ts src/contexts/ThemeContext.test.tsx src/layouts/app-shell/AppShell.test.tsx` — **5 súborov, 27 testov prešlo**.

Toto je meranie východiska. Light/Dark/EN/SK/CS, veľké hodnoty a minimálne malé plochy sa overia na konečnom návrhu; nejde o tvrdenie, že starý dashboard spĺňa novú zmluvu.
