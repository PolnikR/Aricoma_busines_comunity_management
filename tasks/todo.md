# Úlohy: Preklady Overview a HTML PageHeader

Plán: [plan.md](plan.md).

- [x] T1: EN/SK/CS katalógy, komponenty, čísla a dátum; test pre prepínanie jazyka a zachovanie filtra.
- [x] Kontrolný bod: focused testy OverviewPage a katalógov, ESLint zmenených TS/TSX prejdú.
- [x] T2: Samostatný HTML návrh v prototypes/dashboard-modern/overview-pageheader.html; titulok/popis/actions podľa PageHeader, existujúci obsah pod hlavičkou.
- [x] Kontrolný bod: browser kontrola desktop/mobil, screenshoty, žiadne vodorovné pretečenie ani runtime chyby.
- [x] T3: Kontrola diffu a uloženie overených zmien do commitu tejto úlohy.

## Výsledky

- 7 testov / 3 súbory: existujúce správanie Overview, SK → CS so zachovaním filtra, lokalizované čísla a skloňovanie, konzistentné kľúče a parametre katalógov.
- Regresný test pred implementáciou zlyhal na chýbajúcom slovenskom názve Prehľad ochrany.
- ESLint dotknutých komponentov, modelu, testu a QA skriptu: bez chýb.
- Izolovaný headless Edge: 1440×1000, 1280×600, 768×1024, 390×844, 320×740; svetlý aj tmavý režim. Funkčný filter, stabilné počty obnovy/poskytovateľov, ovládanie klávesnicou, bez horizontálneho pretečenia, orezaných kontrolovaných názvov a konzolových chýb.
- Screenshoty a výsledky: node_modules/.cache/overview-pageheader/. Desktopové, mobilné a tmavé tabletové zobrazenie boli vizuálne skontrolované.
- HTML používa snapshot existujúcich komponentov, lokálne vložené CSS/SVG a jednoduchý JS pre filter; nevyžaduje server, CDN ani backend. Zobrazuje simulované údaje. PageHeader v aplikácii zostáva samostatným komponentom; jeho zasadenie je predmetom tejto HTML ukážky.

## Príkazy overenia

```powershell
npm.cmd exec vitest run src/features/dashboard/pages/OverviewPage.test.tsx src/features/dashboard/pages/OverviewPage.translations.test.tsx src/locales/dashboardConsoleTranslations.test.ts
npm.cmd exec eslint -- src/features/dashboard/components/overall src/features/dashboard/pages/OverviewPage.tsx src/features/dashboard/pages/OverviewPage.translations.test.tsx src/features/dashboard/model/overallPreviewMetrics.ts scripts/qa/verify-overview-pageheader.mjs
node scripts/qa/verify-overview-pageheader.mjs
git diff --check
git diff --cached --check
```

Browser skript používa lokálny playwright-core z node_modules/.cache/scroll-probe/node_modules/playwright-core/index.mjs a inštalovaný Edge. Cestu k inému existujúcemu Playwright runtime možno zadať cez PLAYWRIGHT_MODULE. Skript používa izolovaný profil a otvára iba lokálne HTML.

Celý test suite, globálny typecheck ani produkčný build sa nespúšťali; overenie bolo cielené na túto zmenu. Živý backend nebol súčasťou overenia.
