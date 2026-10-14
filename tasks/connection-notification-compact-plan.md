# Plán: Kompaktná notifikácia — variant 03

Dátum: 2026-10-14. Stav: pripravený plán, implementácia nezačala.
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
- Plán je pripravený na realizáciu; tento dokument nehlási hotovú UI zmenu.
  Finálny variant sa porovná so šablónou 03 a predloží používateľovi na kontrolu.

## Overenie tohto plánovacieho kroku

Overiť obsah, existenciu referencovaných komponentov a testov a
`git diff --cached --check`. Commit zahŕňa iba tento plán. Funkčné testy a build
sa pri samotnom plánovaní nespúšťajú, pretože aplikačný kód sa nemení.
