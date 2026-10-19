# Plán: Zjednotenie vizuálnych štýlov Overview

Dátum: 2026-10-19. Vetva: `spike/ant-design-shell`.
Checklist: [overview-visuals-todo.md](overview-visuals-todo.md).

## Rozsah a rozhodnutia

Výhradne vizuálna úprava existujúcich panelov. Hlavné panely už používajú
`--overall-surface` → `--app-surface`; zachovať ich border, radius a geometriu.
Recovery používa `--app-surface-subtle`, Infrastructure pôvodne tmavší
`--overall-raised` → `--app-surface-muted`. Zdieľať pravidlo pre podklad,
border a radius šiestich vnútorných kariet; padding zostáva podľa obsahu.
Existujúce primárne modré akcenty použiť aj na symboly infraštruktúry.
Zelené/žlté/červené indikátory dostupnosti a grafy zostávajú nezmenené.

Production a Test dostanú ikonu vľavo v 30 × 30 px kontajneri s existujúcim
`--app-accent-soft` podkladom, modrým akcentom a 6 px radiusom.
Ikony majú 17 × 17 px. Použiť ServerIcon a doplniť FlaskIcon do existujúceho
zdieľaného SVG systému; žiadna nová závislosť. Text a hodnoty zostávajú vpravo,
dve metriky zostávajú v rovnakom riadku. Zachovať výšku súhrnu.

Referenčný obrázok nebol prístupný; záväzný je textový opis používateľa.
Nemenia sa dáta, výpočty, filtre, navigácia, AppShell, routovanie, PageHeader
ani existujúce plánovacie súbory. Bez stagingu, commitu, merge a push.

## Poradie a overenie

1. Zaznamenať working-tree baseline, preskúmať tokeny a zmerať dashboard v Edge.
2. Zjednotiť povrchy lokálnym CSS a pridať dve dekoratívne ikony.
3. Kontrolný bod: diff iba súvisiacich pravidiel a komponentov, rovnaké hodnoty.
4. Spustiť TypeScript, cielený ESLint a obe Overview testovacie sady.
5. Edge: 1366 × 768, 1024 × 768, 950 × 640, 390 × 844, 320 × 700,
   každý v light/dark. Porovnať výšky, text, odkazy, clipping a scroll pred/po.
6. Uložiť screenshoty a výsledky, skontrolovať ich vizuálne a odovzdať bez commitu.

## Závislosti a riziká

Existujúce tokeny a zdieľané SVG ikony → komponent a lokálne CSS → browser QA.
Rozpracovaný PageHeader sa počas tejto relácie menil mimo tejto úlohy;
jeho súbory neprepisovať. Počiatočné testovacie chyby a TypeScript nálezy
odlíšiť od finálneho stavu. Nevykonávať rollback cudzích zmien.
Pôvodný diff a kópie na porovnanie sú v ignorovanej cache
`node_modules/.cache/overview-visuals/`.

## Súbory implementácie

- `src/features/dashboard/pages/overview.css`
- `src/features/dashboard/components/overall/DeploymentCoverage.tsx`
- `src/shared/icons/Icons.tsx`

Existujúce `tasks/plan.md` a `tasks/todo.md` zostávajú vyhradené PageHeader úlohe.
