# Úlohy: Zjednotenie vizuálnych štýlov Overview

Plán: [overview-visuals-plan.md](overview-visuals-plan.md). Dátum: 2026-10-19.

## T1: Zistiť a zachovať baseline

**Rozsah:** bez úprav produkčných súborov. **Závislosti:** žiadne.

- [x] Overená vetva `spike/ant-design-shell`, zaznamenané necommitnuté zmeny.
- [x] Identifikované tokeny, spoločné povrchy panelov a rozdiel vnútorných kariet.
- [x] Zmeraných päť viewportov v oboch témach v existujúcom Edge QA profile.

**Overenie:** `node node_modules/.cache/overview-visuals/verify.mjs baseline`.

## T2: Zjednotiť povrchy a doplniť ikony

**Rozsah:** S, lokálne CSS a DeploymentCoverage, plus zdieľaná SVG ikona.
**Závislosti:** T1.

- [x] Šesť vnútorných kariet má spoločný background, border a radius.
- [x] Production/20 / 25 a Test/6 / 9 majú server/flask ikonu vľavo.
- [x] Nezmenené dáta, grafy, filtre ani geometria panelov; nepridaná závislosť.

**Overenie:** review diffu, computed styles, rovnaký text a výšky pred/po v Edge.

## Kontrolný bod: Vizuálna a funkčná kontrola

- [x] Edge: všetkých 10 kombinácií viewportu a témy bez clippingu a horizontálneho overflow.
- [x] Desktop bez vertikálneho scrollu, mobil má dostupný footer.
- [x] Všetky KPI/panely a spodný súhrn majú rovnaké výšky ako browser baseline.
- [x] Screenshoty light/dark skontrolované, ikony majú kontrast 4,72 : 1 / 6,59 : 1.
- [x] Filtre nemenia text nezávislých panelov; KPI href zostávajú rovnaké.
- [x] Finálny TypeScript, ESLint, focused testy a diff kontrola zaznamenané v reporte.

**Overenie:** `node node_modules/.cache/overview-visuals/verify.mjs final`,
`npm.cmd run typecheck`, cielený ESLint a dva explicitné Overview testovacie súbory.
Kompletný suite ani produkčný build sa nespúšťajú. Bez commitu, merge a push.

Výsledky: [overview-visuals-verification.md](overview-visuals-verification.md).
