# Úlohy: Overview s PageHeader v aplikácii

Plán: [plan.md](plan.md). Predloha: [overview-pageheader.html](../prototypes/dashboard-modern/overview-pageheader.html).

Stav: implementácia nezačala. Predošlé dokončené úlohy prekladov/prototypu sú v commite 4af33f9d.

## T1: Pripraviť lokalizovaný popis hlavičky

**Popis:** Doplniť overview.description do EN/SK/CS podľa plánu a explicitne ho vyžadovať v teste katalógov. Názov používa existujúci nav.overview.

**Akceptačné kritériá:**
- [ ] Všetky tri katalógy obsahujú popis podľa plánu bez nesúvisiacich nových kľúčov.
- [ ] Zhodujú sa kľúče aj parametre, popisy sú neprázdne a názov je preložený cez nav.overview.

**Overenie:**
- [ ] Nová kontrola chýbajúceho popisu najprv zlyhá a po doplnení prejde: `npm.cmd exec vitest run src/features/dashboard/pages/OverviewPage.translations.test.tsx src/locales/dashboardConsoleTranslations.test.ts`.
- [ ] `npm.cmd exec eslint -- src/features/dashboard/pages/OverviewPage.translations.test.tsx`; `git diff --check`; úspešný atomický commit.

**Závislosti:** Žiadne. **Rozsah:** M, 4 súbory.

**Súbory:** src/locales/en.json, src/locales/sk.json, src/locales/cs.json, src/features/dashboard/pages/OverviewPage.translations.test.tsx.

## T2: Zapojiť hlavičku, filter a dostupný obsah

**Popis:** Pridať PageHeader, extrahovať OverallVendorFilter do actions, ponechať OverallToolbar ako kontext/dátum. Lokálne upraviť tokeny, responzívny layout a jediný vertikálny scroll podľa predlohy; zachovať dátový tok.

**Akceptačné kritériá:**
- [ ] Jeden h1 a preložený popis; prístupný filter s viditeľným názvom je v hlavičke, kontext s aria-live=polite a dátum pod ňou. PageHeader ani AppShell nemenia kontrakt.
- [ ] All/IBM/Hitachi menia iba ochranu; zostávajú 4 KPI/4 panely, simulované označenia, ostatné počty aj prefetch.
- [ ] Zalamovanie a oba režimy fungujú; krátky desktop/mobil sprístupní všetky panely/footer bez horizontálneho pretečenia a konkurenčného vnoreného scrollu.

**Overenie:**
- [ ] Nový test pre chýbajúcu hlavičku a umiestnenie filtra najprv zlyhá; po zapojení prejde `npm.cmd exec vitest run src/features/dashboard/pages/OverviewPage.test.tsx src/features/dashboard/pages/OverviewPage.translations.test.tsx src/shared/components/page/PageHeader.test.tsx`.
- [ ] Testy overujú aj návrat na All a stabilitu poskytovateľov, obnovy aj nasadenia po filtrovaní.
- [ ] `npm.cmd exec eslint -- src/features/dashboard/pages/OverviewPage.tsx src/features/dashboard/pages/OverviewPage.test.tsx src/features/dashboard/components/overall/OverallToolbar.tsx src/features/dashboard/components/overall/OverallVendorFilter.tsx`; `git diff --check`.
- [ ] Browser kontrola integrovanej stránky pri 1280×600 a 320×740, scroll k footeru, obe témy a klávesnica; úspešný atomický commit.

**Závislosti:** T1. **Rozsah:** M, 5 súborov.

**Súbory:** src/features/dashboard/pages/OverviewPage.tsx, src/features/dashboard/components/overall/OverallToolbar.tsx, nový src/features/dashboard/components/overall/OverallVendorFilter.tsx, src/features/dashboard/pages/overview.css, src/features/dashboard/pages/OverviewPage.test.tsx.

## Kontrolný bod po T1–T2

- [ ] Cielené testy a lint prešli; filtrovanie a obsah zostali funkčné.
- [ ] Reálny AppShell neorezáva novú hlavičku/spodné panely na krátkom desktope ani mobile.
- [ ] Diff obsahuje iba zmeny integrácie; spoločný layout, API a demo dáta bez zásahu.

## T3: Uzavrieť jazykovú a browser regresiu

**Popis:** Rozšíriť integračný jazykový test o h1, popis a filter v hlavičke vrátane zachovania výberu. Vykonať browser maticu z plánu a zaznamenať dôkazy. Prípadná automatizácia cieli na aplikáciu, nie statické HTML.

**Akceptačné kritériá:**
- [ ] EN/SK/CS titulky, popisy, názov filtra aj kontext sa prepínajú bez resetu výrobcu a bez surových prekladových kľúčov.
- [ ] Matica viewportov/jazykov/tém z plánu prešla bez orezania ovládania a obsahu; overené hraničné šírky, sidebar a klávesnica.
- [ ] Výsledky označujú pôvod screenshotov, vykonané príkazy a limity prostredia; úspech HTML sa nevydáva za úspech aplikácie.

**Overenie:**
- [ ] Cielený Vitest/ESLint zo sekcie overenia v pláne; úspešné kontroly po nezmenenom kóde zbytočne neopakovať.
- [ ] Browser meranie: h1/KPI/panely, aria-pressed a hodnoty filtrov, dostupný footer, overflow, focus, konzola; vizuálne skontrolované screenshoty.
- [ ] Pri novom QA skripte: `npm.cmd exec eslint -- scripts/qa/verify-overview-pageheader-app.mjs` a `node scripts/qa/verify-overview-pageheader-app.mjs` s dokumentovaným lokálnym URL/runtime/session.
- [ ] `git diff --check`, kontrola staged diffu, `git diff --cached --check`; úspešný atomický commit.

**Závislosti:** T2 a jeho kontrolný bod. **Rozsah:** S–M, 2 až 3 súbory.

**Súbory:** src/features/dashboard/pages/OverviewPage.translations.test.tsx, nový tasks/overview-pageheader-verification.md; voliteľne nový scripts/qa/verify-overview-pageheader-app.mjs. Screenshoty do ignorovaného node_modules/.cache/overview-pageheader-app/; cesty uviesť vo výsledkoch.

## Záverečný kontrolný bod

- [ ] Akceptačné kritériá splnené, výsledky zaznamenané a implementácia commitnutá.
- [ ] Správa obsahuje skutočne vykonané kontroly a limity; celý suite/build sa nespúšťa bez odôvodnenej potreby.
- [ ] Checklist aktualizovaný podľa skutočného stavu; neoverený AppShell pri chýbajúcej session zostáva otvorený.
