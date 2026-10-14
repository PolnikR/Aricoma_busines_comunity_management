# Dashboard Overview – výsledok overenia

**Stav:** React vizuálna integrácia dokončená na vetve `spike/ant-design-shell`. Živé API zostáva mimo rozsahu.

## Implementácia

- `src/features/dashboard/pages/OverviewPage.tsx` skladá samostatné komponenty `DashboardSummary`, `RequiresAttention`, `RecoveryTopologyDonut`, `RecentActivity` a `InfrastructureOverview`. Zdieľané vizuálne prvky sú v `DashboardMetricCard` a `DashboardPanel`.
- Mock dáta sú oddelené v `mocks/dashboardFixtures.ts` a výpočty v `model/selectDashboardMetrics.ts`.
- Lazy-loaded index route `/` je vložená do pôvodného `AppShell` s `contentScroll: 'contained'`; žiadny druhý sidebar či header.
- Pôvodná samostatná HTML referencia bola po prenose dizajnu do Reactu odstránená. Aktuálnu kompozíciu obsahuje `OverviewPage.tsx` a `overview.css`.
- Demo režim je výslovne označený; Refresh a detailné modaly nevolajú BE. Bez agregovaných API sa nezobrazujú tvrdenia o reálnom stave ochrany.

## Overenie (14. 10. 2026)

- Focused dashboard + sidebar testy: **PASS** (exit code 0, znovu vykonané pri audite).
- `npm run typecheck`: **PASS** (exit code 0, znovu vykonané pri audite).
- Agent uviedol úspešný celkový `npm run build` vrátane lint, testov a API kontrol; pri tomto následnom audite sme kompletný build neopakovali.
- Agentove uložené DOM merania pred cleanupom potvrdzovali pri **1600×900, 1366×768 a 1280×720** štyri KPI, štyri panely, tri incidenty, tri udalosti, štyri infra položky a neprítomnosť vertikálneho scrollu na `document`/`main`/paneloch.
- Pri **1024×768** má stránka adaptívny layout s jedným scroll ownerom; pri **390×844** používa mobilný prirodzený scroll.
- Porovnanie referencie a Reactu s hláseným 0 px rozdielom platilo **len pre geometriu po prepočte referencie na rovnaký content rectangle**, nie pre pixel-perfect zhodu grafiky, farieb ani textu.
- Skutočný Keycloak login s načítanými live dátami, ručné testovanie browser zoomu a nový kompletný build neboli v tomto audite zopakované.

Dočasné screenshoty `tasks/dashboard/evidence/` a jednorazový browser harness `tasks/dashboard/qa/` boli po vyhodnotení odstránené na výslovnú žiadosť používateľa. Tento report zostáva ako stručný audit, ale už neodkazuje na neexistujúce súbory.

## Rozsah zmeny

Úpravy zasiahli len dashboard feature, jeho route/sidebar integráciu, potrebné nové ikony, locales a dashboardový plán. Produkčný backend, API schémy, Orval a ostatné feature pages nie sú dotknuté. Žiadne zmeny neboli commitnuté ani pushnuté.
