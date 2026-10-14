# ABCO Overview – TODO pre implementačného agenta

Zdroj pravdy: [plan.md](plan.md) a aktuálna React implementácia v `src/features/dashboard/`.
**Stav:** T0–T6 vykonané a overené. T7 je samostatná neschválená API fáza. Dôkazy a obmedzenia: [verification.md](verification.md).

## T0 – Bezpečný baseline (pred implementáciou)
- [x] `git status --short` a `git branch --show-current`, nesiahaj na cudzie rozpracované zmeny ani vetvy.
- [x] Pôvodná HTML referencia bola skontrolovaná počas implementácie; po prenose do Reactu bola odstránená.
- [x] Screenshot referencie 1600×900, 1366×768, 1280×720; uložiť merania pozície 4 KPI a 4 panelov.
- [x] Porovnať aktuálne Resources/Recovery Groups page shell a route layout, vrátane minimálnej výšky a reálneho viewportu. Zistiť otvorený/zatvorený sidebar. Screenshot baseline.

## T1 – React page route + layout frame
- [x] Vytvoriť `src/features/dashboard/pages/OverviewPage.tsx`, lokálne komponenty a importované dashboard fixture.
- [x] Použiť `routes.home`, lazy index route, handle `contentScroll: contained`, `Suspense` s existujúcim fallbackom.
- [x] Overview pridať do EXISTUJÚCEHO `AppSidebar` ako top-level položku a logo navigovať na `routes.home`. Pre `/` nesmie byť implicitne zvýraznené/rozbalené Discovery. Regresia ostatných menu nesmie nastať.
- [x] Nevykresliť duplicitný sidebar/header; page root `flex min-h-full min-w-0 flex-1 flex-col lg:h-full lg:min-h-0` a vlastný contained grid.
- [x] Browser checkpoint: správne shell hranice, h1, actions, 2×2 kontajnery, žiadny scroll 1600×900.

## T2 – 4 KPI cards (vizuálny checkpoint)
- [x] `DashboardMetricCard` + `DashboardSummary`, 4 rovnako široké, 1 rad pri 1366×768.
- [x] Poradie: Critical issues, Warnings, Running operations, Unverified signals.
- [x] Rozmer ikony, číslice, subtitle a interakcie podľa schváleného dizajnu. Použiť ABCO tokens + Icons.
- [x] Testy malých/veľkých čísiel, empty/loading a dlhého textu.
- [x] Historické porovnanie screenshotov bolo vykonané pred T3; pri ďalších zmenách kontrolovať aktuálny React vzhľad.

## T3 – Requires Attention + Recovery Groups Topology
- [x] `RequiresAttention` presne 3 incidentové karty (nie tabuľka, žiadny scroll/paginácia); detail click a `View all` funkčne/preview jednoznačne.
- [x] `RecoveryTopologyDonut`: Local + Metro Mirror, center total, percentages; dáta z jednej konzistentnej mock kolekcie. Semantické aria legendy.
- [x] Dva panely majú šírku 50/50 a rovnakú výšku; CSS grid minmax(0,1fr), žiadne overflow.
- [x] Browser screenshot 1366×768 v normal + collapsed sidebar; vizuálne overiť presnosť.

## T4 – Recent Activity + Infrastructure Overview
- [x] `RecentActivity`: presne 3 vecné eventy v timeline, nie raw HTTP access logs. Bez vnútorného scrollovania.
- [x] `InfrastructureOverview`: presne 2×2 VMware/Power/FlashSystem/Hitachi karty, názvy, totals, jednotky, progress.
- [x] Rovnaká šírka a výška oboch spodných panelov, alignment bottom hraníc aj pri 1366×768.
- [x] Dlhé názvy/long event texts nezničia geometriu; zrozumiteľný fallback a navigácia.
- [x] Browser screenshot 1600×900, 1366×768 a 1280×720.

## T5 – Lokalizácia, stav a prístupnosť
- [x] `dashboard.*` a `nav.overview` pre en/sk/cs, reuse `useTranslation`.
- [x] Mock/demonstration jasne označené počas celého UI; žiadne predstieranie backendového Refresh.
- [x] Loading, unknown, empty, error stavy nemenia rozmery kontajnerov; error neprepisovať na 0.
- [x] Theme Light/Dark/System používajú len existujúci ThemeProvider. Fokus/ARIA/keyboard ESC pri detaile.
- [x] Zaistiť click actions, hover/focus, textové statusy bez závislosti iba na farbe.

## T6 – Prehliadačové a technické prebratie
- [x] Rozlíšenia: 1600×900, 1366×768, 1280×720, 1024×768, 390×844, 1920×1080.
- [x] Reálny `document`, `main` a panely: pri 1366×768 a 1600×900 `scrollHeight<=clientHeight` a `scrollWidth<=clientWidth`. Pri 390px bezpečný natural page scroll.
- [x] Žiadne clipped incident/event/resource údaje, žiadne skryté riadky pod `overflow:hidden`.
- [x] Pôvodné porovnanie screenshotov bolo vykonané; pre ďalšie zmeny overovať React vzhľad priamo v ABCO AppShell. Skontrolovať expanded/collapsed sidebar, light/dark, browser zoom.
- [x] Focused Vitest, `npm run lint`, `npm run typecheck`, `npm run build`, `git diff --check`: PASS; focused 33/33, kompletná sada 2089/2089, build exit 0.
- [x] Diff review: nepribudli nové BE endpointy, nie sú dotknuté iné feature pages, nebol zmenený AppShell; žiadne nekontrolované dependencies.
- [x] Report: presný zoznam changed files, screenshot miesta, pass/fail a NEOVERENÉ body, BE gaps oddelene.

## T7 – Live API phase (zablokované do samostatného súhlasu)
- [ ] Vytvoriť mapovanie medzi widget fields a aktuálnym OpenAPI, s indikáciou proven/derived/missing.
- [ ] Použiť React Query a existujúce hooky pre totals/config, ale NIKDY nie N+1 connection tests/snapshots/DAG runs pri otvorení Overview.
- [ ] Bez agregovaného health endpointu neoznačovať status Protected/Healthy. Missing signal => Unknown.
- [ ] Implementovať až po schválení vzhľadu a údajových pravidiel používateľom.

**Stop-rule pre agenta:** po T1–T4 vykonať skutočný browser screenshot checkpoint; ak aktuálny vzhľad nezodpovedá schválenej kompozícii, neopakovať slepo ďalší task. Najprv doladiť vizuál. Necommitovať/nepushovať, kým používateľ nežiada.
