# Overview: overenie vizuálneho zjednotenia

Dátum: 2026-10-19. Vetva: `spike/ant-design-shell`. Bez stagingu, commitu, merge a push.

## Výsledok

Hlavné panely naďalej používajú `--app-surface`. Šesť vnútorných kariet má
spoločný `--app-surface-subtle`, border a radius. Symboly infraštruktúry používajú
existujúci modrý akcent; stavové indikátory a grafy zostávajú zachované.
Production a Test majú server/flask ikonu 17 px v 30 px kontajneri,
existujúci svetlomodrý podklad a pôvodné hodnoty 20 / 25 a 6 / 9.

Upravené produkčné súbory: `overview.css`, `DeploymentCoverage.tsx`,
`src/shared/icons/Icons.tsx`. Nové dokumenty sú oddelené od PageHeader plánu.
QA skript a screenshoty sú v ignorovanej cache, bez novej závislosti.

## Kontroly

- `npm.cmd run typecheck`: PASS pri finálnom behu.
- `npm.cmd exec eslint -- src/features/dashboard/components/overall/DeploymentCoverage.tsx src/shared/icons/Icons.tsx --max-warnings 0`: PASS.
- `npm.cmd exec -- vitest run src/features/dashboard/pages/OverviewPage.test.tsx src/features/dashboard/pages/OverviewPage.translations.test.tsx`: PASS, 9 testov.
- CSS načítané existujúcim PostCSS parserom: PASS.
- Cielený `git diff --check` pre tri produkčné súbory tejto úlohy: PASS.
- Kompletný suite ani produkčný build sa nespúšťali.

Úvodný beh Overview testov mal 2 chyby očakávajúce ešte neintegrovaný PageHeader.
Prvý TypeScript beh hlásil nepodporované `exact` v existujúcich PageHeader testoch.
Počas relácie prebiehali súbežné zmeny tejto samostatnej integrácie; finálne behy
už prešli. Táto úloha nemenila PageHeader, jeho testy ani OverviewPage.
Globálny diff-check v jednom medzikroku upozornil na prázdny riadok na konci
cudzieho `tasks/todo.md`; súbor sa kvôli tomu nemenil.

## Microsoft Edge

Použitý skutočný HTTP dashboard v autentifikovanom existujúcom QA profile,
Microsoft Edge 155.0.4283.62 cez Playwright/CDP. Bez mockovania siete alebo auth.

| Viewport | Light | Dark |
|---|---|---|
| 1366 × 768 | PASS | PASS |
| 1024 × 768 | PASS | PASS |
| 950 × 640 | PASS | PASS |
| 390 × 844 | PASS | PASS |
| 320 × 700 | PASS | PASS |

Príkazy: `node node_modules/.cache/overview-visuals/verify.mjs baseline`
a `node node_modules/.cache/overview-visuals/verify.mjs final`.
Baseline browser meranie už zachytilo súbežne integrovaný PageHeader;
neporovnáva jeho pôvodnú a novú podobu.

Overené computed styles, totožný text dashboardu a KPI odkazy pred/po,
všetky výšky KPI a hlavných panelov bez zmeny. Spodný Deployment súhrn
má vo všetkých prípadoch pôvodných 60,5 px vrátane borderu/paddingu.
Obe metriky sú vodorovne zarovnané. Desktop nemá vertikálny scroll,
žiadny prípad nemá orezaný text ani horizontálny overflow. Mobilný footer
je dostupný scrollovaním. Filtre zachovávajú obsah ostatných troch panelov.
Konzola bez chýb a warningov. Kontrast ikon: light 4,72 : 1, dark 6,59 : 1.
Primárny text vo vnútorných kartách: light 15,32 : 1, dark 14,41 : 1.

## Artefakty

Adresár: `node_modules/.cache/overview-visuals/`.

- `working-tree-before.patch`, `hashes-before.json`, `overview-before.css`.
- `baseline-results.json`, `final-results.json`: geometria a konzola všetkých 10 prípadov.
- `baseline-{šírka}-{téma}.png`, `final-{šírka}-{téma}.png`.
- `final-{šírka}-{téma}-deployment.png`: detail Deployment Coverage.
- Mobilné `*-footer.png`: dostupnosť spodnej časti.

Vizuálne skontrolované celé dashboardy 1366 px light/dark a detaily Deployment
Coverage pri 320 px light/dark. Referenčný obrázok používateľa nebol dostupný;
implementácia vychádza z jeho textového opisu.
