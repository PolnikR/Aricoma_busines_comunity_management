# Plán: Preklady Overview a HTML návrh s PageHeader

## Rozsah a rozhodnutia
Doplniť všetky texty existujúceho Overview cez useTranslation v EN/SK/CS vrátane prístupných názvov grafov, čísel a dátumu. Zachovať demo dáta a filtrovanie ochrany. Samostatný HTML návrh v prototypes/dashboard-modern/overview-pageheader.html ukáže titulok a popis v PageHeader, filter v oblasti actions a existujúce karty pod ním. Komponent PageHeader v aplikácii sa týmto návrhom nemení.

Predošlá úloha Resources bola dokončená; výsledky zostávajú v resources-table-scroll-measurements.md.

## Úlohy a závislosti
1. Preklady a cielená regresia (komponenty dashboardu, model formátovania, tri katalógy, test). Kritérium: EN/SK/CS texty a ARIA sú preložené; prepnutie jazyka zachová filter. Overenie: dva testy OverviewPage a ESLint zmenených TS/TSX. Rozsah rozdeliť na katalógy, komponenty a regresiu; tvoria jeden závislý tok.
2. HTML návrh (jeden súbor). Závisí na textoch a existujúcom vzhľade. Kritérium: samostatne otvoriteľné HTML s PageHeader, štyrmi KPI a štyrmi panelmi; desktop aj mobil bez vodorovného pretečenia. Overenie: izolovaný prehliadač, screenshoty a kontrola rozloženia.
3. Kontrola a commit. Závisí na 1 a 2. Kritérium: cielené kontroly prejdú, commit obsahuje iba túto úlohu. Overenie: git diff --check, git diff --cached --check, git log -1.

## Riziká
Dlhšie SK/CS texty overiť v prehliadači. Použiť celé prekladové vety s parametrami. Simulované údaje nezamieňať za reálny stav; zachovať ich označenie. Celý test suite ani produkčný build nie sú potrebné pre tento rozsah.
