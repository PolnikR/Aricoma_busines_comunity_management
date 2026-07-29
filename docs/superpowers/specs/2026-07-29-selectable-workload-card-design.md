# Selectable workload card – UI design

## Scope

Modernizovať zdieľaný `SelectableCard` používaný pri výbere workloadu v Recovery
Group wizardovi bez zmeny jeho správania alebo dátového modelu.

## Visual design

- Karta zostane svetlá a bude rešpektovať existujúcu modrú farebnú paletu.
- Základný stav použije jemný povrchový gradient, tenký border a decentný tieň.
- Hover stav kartu mierne zdvihne a zvýrazní border.
- Selected stav použije modrý border, svetlomodrý gradient, výraznejší tieň a
  samostatný check indikátor.
- Názov a opis zostanú v hornej časti karty.
- Resource type bude zobrazený ako kompaktný badge v ľavom dolnom rohu.
- Logo technológie bude zarovnané do pravého dolného rohu podľa referenčného IBM
  rozloženia. Logo nebude jediným indikátorom výberu.
- Disabled karty zostanú čitateľné, ale vizuálne utlmené a bez hover elevation.

## Component contract

`SelectableCard` si zachová existujúce props. Prop `icon` bude vizuálne použitý ako
logo v pravom dolnom rohu. Recovery Group workload definície mu dodajú jednoduché
textové alebo SVG značky pre VMware, Oracle, SAP, IBM, Microsoft a FlashSystem.

## Accessibility

- Karta zostane natívny `button`.
- Selected stav zostane oznámený cez `aria-pressed`.
- Disabled stav použije natívny atribút `disabled`.
- Focus-visible ring zostane jasne viditeľný.
- Výber nebude komunikovaný iba farbou; doplní ho check indikátor.

## Verification

- Test shared komponentu overí selected, disabled a logo obsah.
- Test Recovery Group type kroku overí prítomnosť loga na workload kartách.
- ESLint, TypeScript a dotknuté Vitest testy musia prejsť.
