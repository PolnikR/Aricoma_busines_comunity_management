# Plán: Kompaktná notifikácia — variant 03

Dátum: 2026-10-14. Stav: variant 03 implementovaný; browserové overenie čaká.
Používateľ vybral variant 03 a schválil samostatné umiestnenie tohto plánu.
Existujúce `tasks/plan.md` a `tasks/todo.md` patria Recovery Group a zostávajú zachované.

## Výsledok a rozsah

Zaviesť variant 03 z `prototypes/connection-notification-design/` do existujúcej
notifikácie testu pripojenia. Karta obsahuje stavovú ikonu, výsledok testu,
samostatný názov providera, akciu View result a zatvorenie. Opisný odsek sa
neprenáša; podrobnosti zostávajú v existujúcom výsledkovom dialógu.
Notifikácie budú vpravo dole, s odstupom 16 px na mobile a 24 px od breakpointu
`sm` (640 px), vrátane safe-area insets. Šírka vychádza zo šablóny (400 px)
a obmedzí sa podľa dostupného viewportu.

## Implementačné rozhodnutia

- Upraviť existujúce `ConnectionTestNotification` a `ConnectionTestHost`;
  nevytvárať ďalší notifikačný systém ani produkčný prepínač variantov.
- Použiť existujúce farby, typografiu a preklady aplikácie. Stav odlíši text,
  ikona a farebný pásik; názov providera zostáva čitateľný aj pri zalomení.
- Zachovať `onViewResult`, `onDismiss`, polite live region, klávesnicové
  ovládanie a existujúci návrat fokusu. Nepridávať automatické zatváranie.
- Zachovať poradie fronty, najviac päť viditeľných kariet a čakanie ďalších
  výsledkov. Pri rastúcej výške sa horný okraj zásobníka posúva nahor;
  obsah vyšší než viewport sa posúva, karty sa nezmenšujú.
- Zachovať priechodnosť klikov mimo kariet a vrstvu pod výsledkovým dialógom.
  Overiť aj capacity/session alerty, ktoré používajú ten istý host.
- API, manager, dátové kontrakty a prototypy sa nemenia.

## Úlohy a poradie

Úlohy sú evidované v GitHub Issues podľa `CLAUDE.md` a
`docs/agents/issue-tracker.md`; samostatný duplicitný todo súbor sa nevytvára.
Akceptačné kritériá, súbory, rozsah a overenie sú uvedené v každej úlohe.

1. [#14 — Kompaktná karta](https://github.com/PolnikR/Aricoma_busines_comunity_management/issues/14).
   Bez závislosti; dva súbory: `ConnectionTestNotification.tsx` a jeho test.
   Výsledok: variant 03, úspech/chyba, zachované akcie a prístupnosť.
2. [#15 — Umiestnenie vpravo dole](https://github.com/PolnikR/Aricoma_busines_comunity_management/issues/15).
   Závisí od #14; dva súbory: `ConnectionTestHost.tsx` a jeho test.
   Výsledok: responzívne ukotvenie a čitateľný zásobník bez zmeny fronty.
3. [#16 — Záverečné overenie](https://github.com/PolnikR/Aricoma_busines_comunity_management/issues/16).
   Závisí od #14 a #15; zaznamenať dôkazy do tohto plánu.

Kontrolný bod po #14 a #15: cielené testy oboch komponentov prechádzajú,
akcie fungujú a zmeny sú overené a atomicky commitnuté. Potom vykonať #16.
Postup je sekvenčný; rozsah nevyžaduje paralelné implementácie.

## Overenie pri implementácii

```powershell
npm.cmd exec vitest run src/shared/components/notification/ConnectionTestNotification.test.tsx src/shared/connection-test/ConnectionTestHost.test.tsx
npm.cmd exec eslint -- src/shared/components/notification/ConnectionTestNotification.tsx src/shared/components/notification/ConnectionTestNotification.test.tsx src/shared/connection-test/ConnectionTestHost.tsx src/shared/connection-test/ConnectionTestHost.test.tsx
git diff --check
```

V prehliadači overiť 320, 768, 1024 a 1440 px, krátky viewport, dlhé názvy,
svetlý/tmavý režim, úspech/chybu, päť kariet a čakajúci šiesty výsledok.
Skontrolovať Tab/Enter, viditeľný fokus, zatvorenie a otvorenie cached výsledku
bez ďalšieho API volania. Bežný text musí mať kontrast aspoň 4.5:1; nesmie
vzniknúť horizontálny overflow ani nové chyby konzoly.
Kompletný test suite, production build ani globálny typecheck sa predvolene
nespúšťajú; rozšíriť overenie iba pri zistenom zásahu do širších kontraktov.

## Riziká a podmienky dokončenia

- Veľa kariet alebo krátka obrazovka: obmedziť výšku kontajnera a overiť scroll.
- Dlhé názvy: zalamovať bez skrytia identifikácie providera.
- Nedostupný browser: DOM testy nenahrádzajú vizuálnu kontrolu; #16 zostáva
  otvorená, kým sú potrebné browserové dôkazy nedostupné.
- Implementácia je uložená; finálny variant sa ešte vizuálne porovná so šablónou
  03 v prehliadači a predloží používateľovi na kontrolu.

## Overenie tohto plánovacieho kroku

Overiť obsah, existenciu referencovaných komponentov a testov a
`git diff --cached --check`. Commit zahŕňa iba tento plán. Funkčné testy a build
sa pri samotnom plánovaní nespúšťajú, pretože aplikačný kód sa nemení.

## Realizácia a dôkazy — 2026-10-14

- [x] #14: kompaktná karta obsahuje samostatný názov providera, stav, ikonu,
  View result a zatvorenie; opisný odsek je odstránený. Zachované preklady,
  callbacks, polite live region a návrat fokusu.
- [x] #15: host je ukotvený vpravo dole s mobilným/desktopovým odstupom,
  safe-area insets, šírkou 400 px obmedzenou viewportom a posúvaním vysokého
  zásobníka. Fronta, limit piatich kariet a čakajúce výsledky sa nemenia.
- [x] Cielené DOM testy: dva súbory, päť testov prešlo. Najprv tri testy
  očakávane zlyhali na chýbajúcom samostatnom názve providera; po úprave prešli.
  Overené otvorenie výsledku klávesnicou, fokus na zatvorení, cached výsledok
  bez ďalšieho requestu, čakajúca šiesta karta a zatvorenie session alertu.
- [x] Cielený ESLint a `git diff --check` prešli.
- [x] Jednorazová kontrola cez `node --input-type=module` použila
  `@tailwindcss/node.compile` nad `src/index.css` a triedami oboch komponentov.
  Generovanie bottom/right, viewport height, overflow, wrapping a shrink-0
  pravidiel prešlo. Výpočet kontrastu pre text a link v oboch témach: minimum
  5.86:1, teda nad požadovanými 4.5:1.
- [ ] #16: vizuálna kontrola pri 320/768/1024/1440 px, krátkom viewporte,
  dlhých názvoch a piatich kartách; browser konzola a návrat fokusu z dialógu
  nie sú overené. `cua.listBrowsers()` vrátil `[]`. DOM a CSS overenie tieto
  dôkazy nenahrádzajú; finálny browser checkpoint zostáva otvorený.

Spustené príkazy (priame Node vstupy do lokálnych nástrojov):

```powershell
node node_modules/vitest/vitest.mjs run src/shared/components/notification/ConnectionTestNotification.test.tsx src/shared/connection-test/ConnectionTestHost.test.tsx
node node_modules/eslint/bin/eslint.js src/shared/components/notification/ConnectionTestNotification.tsx src/shared/components/notification/ConnectionTestNotification.test.tsx src/shared/connection-test/ConnectionTestHost.tsx src/shared/connection-test/ConnectionTestHost.test.tsx
git diff --check
git diff --cached --check
```

Implementácia #14 a #15 tvorí jeden atomický commit `8b449569`, keďže test hosta
závisí od nového obsahu karty. Práca prebehla inline na `master` podľa zadania
používateľa. Kompletný test suite, production build ani globálny typecheck
neboli spustené. Žiadny push ani merge nebol vykonaný.
