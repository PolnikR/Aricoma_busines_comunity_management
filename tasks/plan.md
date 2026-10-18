# Plán: Začlenenie Overview do PageHeader

Dátum: 2026-10-18. Stav: plán pripravený; implementácia nezačala.

## Cieľ a rozsah

Preniesť usporiadanie z [HTML návrhu](../prototypes/dashboard-modern/overview-pageheader.html) do React stránky Overview: názov a popis cez spoločný PageHeader, filter výrobcov v actions, kontext filtra/dátumu a existujúce KPI/panely pod hlavičkou.

Predpoklad: HTML je vizuálna predloha pre aplikáciu. Nejde o ďalšiu úpravu samotného prototypu. Predošlý plán prekladov a HTML je dokončený a zachovaný v histórii commitu `4af33f9d`; tento plán nadväzuje na jeho výsledok.

## Zistený stav

| Súbor | Zistenie |
|---|---|
| `src/features/dashboard/pages/OverviewPage.tsx` | Vlastní stav výrobcu, spúšťa prefetch, renderuje OverallToolbar, 4 KPI a 4 panely; nemá PageHeader. |
| `src/features/dashboard/components/overall/OverallToolbar.tsx` | Spája kontext filtra, lokalizovaný dátum ukážky a prepínač výrobcov. |
| `src/shared/components/page/PageHeader.tsx` | Už má title, description a actions; od 640 px používa riadok. Zmena rozhrania nie je potrebná. |
| `src/features/dashboard/pages/overview.css` | Tokeny sú na .overall-page; desktop skrýva overflow a panely vypĺňajú dostupnú výšku. |
| `src/app/AppRoutes.tsx`, `src/layouts/app-shell/AppShell.tsx` | Index route používa contentScroll: contained a contentFit: viewport. Shell obmedzuje výšku obsahu. |
| `src/locales/en.json`, `sk.json`, `cs.json` | Existuje nav.overview aj preklady filtra; chýba popis z návrhu. |
| `scripts/qa/verify-overview-pageheader.mjs` | Overuje statické HTML cez file://, nie integráciu v aplikácii. |

## Návrh riešenia

### Kompozícia

Lokálny obal `.overview-page-shell` bude obsahovať PageHeader a pod ním existujúci `.overall-page` s kontextovým riadkom, KPI, panelmi a footerom. PageHeader použije `t('nav.overview')`, nový `t('overview.description')` a komponent `OverallVendorFilter` v actions.

Nový `src/features/dashboard/components/overall/OverallVendorFilter.tsx` prevezme existujúce tlačidlá s props vendor: StorageVendor a onVendorChange. Viditeľný názov overview.storageVendor prepojiť s role=group cez aria-labelledby a React useId. Zachovať natívne tlačidlá, aria-pressed, ovládanie klávesnicou a viditeľný focus.

OverallToolbar zostane malým kontextovým riadkom: dostane aktuálny scope a zobrazí overview.protectionFilter v aria-live=polite spolu s dátumom a označením ukážkového inventára. Dátum zostáva lokalizovaná hodnota 2026-10-16 s timeZone: UTC; nie je to čas synchronizácie. Stav výrobcu a výpočet ochrany zostanú v OverviewPage.

Použiť existujúce komponenty; nekopírovať HTML snapshot ani jeho JavaScript do Reactu. Horná lišta prototypu, prepínač témy, breadcrumb a rám stránky sú iba prezentácia ukážky; aplikácia má vlastný shell.

### Layout a scroll

Odporúčaný variant: lokálny vertikálny scroll celej Overview vrátane hlavičky. Obal má flex: 1, min-width: 0, min-height: 0 a overflow-y: auto. Vnútorný obsah rastie podľa obsahu. Odstrániť konflikt desktopového overflow: hidden, mobilného height/max-height: 100% a núteného stláčania panelov. Nenechať dva vnorené scroll kontajnery. AppShell aj route handle zostávajú zachované.

Premiestniť dashboardové CSS premenné vrátane dark variantu na spoločný lokálny obal, aby ich zdedil filter v hlavičke. Typografiu PageHeader ponechať spoločnému komponentu; drobné písmo dashboardu nesmie zmeniť titulok. Medzeru pod hlavičkou riadi existujúce mb-4, nepridávať k nej nechcený rodičovský gap.

Prevziať relevantné rozmery návrhu: prirodzené riadky panelov, minimálna výška panelu 270 px, KPI padding 14 px/gap 8 px, padding hlavičky panelu 16/16/12 px a obsahu 0/16/16 px. Pod 950 px jeden stĺpec panelov; zachovať dvojstĺpcové KPI a vnútorné mobilné varianty kariet. Filter, kontext a dlhé stavové texty sa môžu zalamovať. Od 640 px filter vpravo, pod 640 px pod titulkom zarovnaný doľava.

Alternatívy: vynútené zmestenie do viewportu zvyšuje po pridaní hlavičky riziko orezania; globálna úprava AppShell/PageHeader zbytočne rozširuje zásah. Lokálny scroll najlepšie zodpovedá predlohe.

### Texty a dáta

Nový kľúč overview.description:

| EN | SK | CS |
|---|---|---|
| Data protection, recovery and infrastructure in one place. | Ochrana dát, obnova a infraštruktúra na jednom mieste. | Ochrana dat, obnova a infrastruktura na jednom místě. |

Zachovať demo fixture, označenia simulácie a prefetch. Filter mení iba KPI zväzkov a panel ochrany: All 1 280/80, IBM 820/40, Hitachi 460/40 (so snímkami/bez snímok). Poskytovatelia 13, skupiny 24, aplikácie 34 a hodnoty nasadenia sa nemenia. Zmena EN/SK/CS zachová vybraného výrobcu.

## Úlohy a závislosti

Podrobný checklist: [todo.md](todo.md).

1. T1: Preklady popisu a kontrakt katalógov (4 súbory).
2. T2: PageHeader, filter, lokálny layout a funkčná regresia (5 súborov); závisí na T1.
3. Kontrolný bod: cielené testy a prvé browser overenie krátkeho desktopu/mobilu. Orezanie vyriešiť pred T3.
4. T3: Jazyková, klávesnicová a vizuálna regresia integrovanej stránky; zaznamenať dôkazy (2–3 súbory); závisí na T2.
5. Záverečný kontrolný bod: kritériá splnené, kontroly úspešné, atomické commity vytvorené.

Postupovať sekvenčne, lebo úlohy zdieľajú komponenty. Každý implementačný krok uzavrieť overeným commitom. Táto požiadavka končí vypracovaním plánu, nie realizáciou.

## Overenie pri implementácii

```powershell
npm.cmd exec vitest run src/features/dashboard/pages/OverviewPage.test.tsx src/features/dashboard/pages/OverviewPage.translations.test.tsx src/shared/components/page/PageHeader.test.tsx src/locales/dashboardConsoleTranslations.test.ts
npm.cmd exec eslint -- src/features/dashboard/pages/OverviewPage.tsx src/features/dashboard/pages/OverviewPage.test.tsx src/features/dashboard/pages/OverviewPage.translations.test.tsx src/features/dashboard/components/overall/OverallToolbar.tsx src/features/dashboard/components/overall/OverallVendorFilter.tsx
git diff --check
git diff --cached --check
```

Nové regresie najprv preukážu chýbajúcu hlavičku/popisy, po implementácii musia prejsť. Testovať používateľské správanie, nie kópiu CSS. PageHeader test je malá kontrola použitého kontraktu.

Browser: `npm.cmd run dev -- --host 127.0.0.1`, index route v reálnom AppShell s dostupnou vývojovou session. Matica: 1440×1000, 1280×600, 768×1024, 390×844 a 320×740; oba režimy a EN/SK/CS. Navyše skontrolovať prechody 639/640 a 949/950 px a otvorený/zbalený sidebar na desktope.

Kontroly: jeden h1, filter v hlavičke, 4 KPI/4 panely, všetky tri voľby filtra, Tab a Enter/Space, zachovaný focus/výber pri zmene jazyka, nulový horizontálny overflow a neorezané názvy. Scrollom dosiahnuť celý posledný panel a footer najmä pri 1280×600. Screenshoty vizuálne skontrolovať; zaznamenať konzolové chyby súvisiace so zmenou oddelene od problémov prostredia.

Bez dostupnej autentifikácie môže izolované vykreslenie overiť komponent, ale nenahrádza kontrolu vo výškovom kontrakte AppShell; tento bod ponechať neoverený. Statický HTML QA skript nie je integračný dôkaz. Voliteľný nový scripts/qa/verify-overview-pageheader-app.mjs musí cieliť na bežiacu aplikáciu s izolovaným profilom a dostupným Playwright runtime; URL a predpoklady session/runtime zdokumentovať.

Celý suite, globálny typecheck a produkčný build nie sú predvolené kontroly tejto lokálnej zmeny. Rozšíriť ich len pri preukázanej potrebe, napríklad zmene spoločného kontraktu.

## Riziká a hranice

| Riziko | Opatrenie |
|---|---|
| Hlavička zmenší priestor panelov. | Lokálny scroll, prirodzená výška; krátky desktop overiť už po T2. |
| Filter mimo .overall-page stratí tokeny/písmo. | Tokeny na lokálnom obale, písmo filtra nastaviť lokálne, skontrolovať obe témy. |
| Actions so shrink-0 a dlhé preklady pretečú. | Zalamovanie a kontrola mobilu aj hraničných šírok. |
| Statický prototyp zakryje chybu integrácie. | Finálne dôkazy z React stránky v AppShell. |

Mimo rozsahu: backend API, živé metriky, nový význam filtra, nové KPI, globálny redesign a zmeny autentifikácie/routovania. Nová závislosť nie je potrebná. Otvorený realizačný predpoklad: dostupná vývojová session pre finálne browser overenie; návrh komponentov od nej nezávisí.
