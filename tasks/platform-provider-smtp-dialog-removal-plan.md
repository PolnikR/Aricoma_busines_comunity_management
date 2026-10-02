# Implementation Plan: Odstránenie SMTP tlačidla z Platform Provider drawera

## Overview

Detail drawer SMTP providera má v hlavičke tlačidlo `SMTP`, ktoré otvára `SmtpProviderDetailsDialog`. Dialóg iba zopakuje štyri polia, ktoré drawer už zobrazuje, a raw JSON providera. Tlačidlo aj dialóg sa odstránia. Drawer pre SMTP sa bude správať rovnako ako pre ostatné typy providerov.

## Architecture Decisions

- Odstraňuje sa celý `SmtpProviderDetailsDialog`, nielen tlačidlo. Bez tlačidla by bol mŕtvy kód.
- `DetailDrawer` dostane `open={selected !== null}`. Podmienka `!isSmtpDialogOpen` slúžila iba na skrytie drawera počas otvoreného dialógu.
- Zdieľaný `ChecklistResultDialog` a JSON zobrazenie v tabuľke (`jsonViewId`) sa nemenia.
- Locale súbory majú rozpracované zmeny používateľa mimo tejto úlohy. Do commitu sa zaradia iba odstránené `smtpDialog` kľúče (cez `git add -p`).

## Dependency Graph

```text
Task 1 (drawer bez SMTP tlačidla + testy tabuľky)
    └── Task 2 (zmazať dialóg, jeho test a locale kľúče)
```

## Task 1: Drawer SMTP providera bez SMTP tlačidla

**Description:** V `PlatformProvidersTable` odstrániť `headerActions` s tlačidlom, stav `isSmtpDialogOpen`, render `SmtpProviderDetailsDialog` a jeho import. Tri testy, ktoré tlačidlo a dialóg používajú, nahradiť jedným testom, ktorý overí, že po otvorení drawera SMTP providera tlačidlo `SMTP` nie je.

**Acceptance criteria:**
- [x] Nový test najprv zlyhá (red), po úprave komponentu prejde (green).
- [x] Drawer SMTP providera nezobrazuje tlačidlo `SMTP`. Edit, Delete a detail ostávajú.
- [x] `PlatformProvidersTable.tsx` neobsahuje žiadnu referenciu na `SmtpProviderDetailsDialog` ani `isSmtpDialogOpen`.

**Verification:**
- [x] `npm exec vitest run src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx`
- [x] `npm exec eslint -- src/features/platform-administration/platform-providers/components/PlatformProvidersTable.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx`

**Dependencies:** None

**Files likely touched:**
- `src/features/platform-administration/platform-providers/components/PlatformProvidersTable.tsx`
- `src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx`

**Estimated scope:** S

## Task 2: Odstrániť `SmtpProviderDetailsDialog` a jeho preklady

**Description:** Zmazať komponent a jeho test. Z `en.json`, `cs.json` a `sk.json` odstrániť `platformProviders.smtpDialog.button` a `platformProviders.smtpDialog.title`.

**Acceptance criteria:**
- [x] Súbory `SmtpProviderDetailsDialog.tsx` a `SmtpProviderDetailsDialog.test.tsx` neexistujú.
- [x] `grep -r "smtpDialog\|SmtpProviderDetailsDialog" src` nič nenájde.
- [x] Všetky tri locale súbory sú validný JSON. V commite sú iba odstránené `smtpDialog` riadky.

**Verification:**
- [x] `npm exec vitest run src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx`
- [x] Parse check všetkých troch locale súborov (`node -e "JSON.parse(...)"`)
- [x] Focused typecheck: `npm exec tsc -- -b` (overí, že nič neimportuje zmazaný súbor)

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/platform-administration/platform-providers/components/SmtpProviderDetailsDialog.tsx` (delete)
- `src/features/platform-administration/platform-providers/components/SmtpProviderDetailsDialog.test.tsx` (delete)
- `src/locales/en.json`, `src/locales/cs.json`, `src/locales/sk.json`

**Estimated scope:** M

## Checkpoint: Complete

- [x] Focused testy a lint prejdú
- [x] `git diff --cached` obsahuje iba súbory a riadky tejto úlohy
- [x] Atomický commit (Task 1 a Task 2 spolu alebo samostatne)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Rozpracované zmeny v locale súboroch sa dostanú do commitu | Med | `git add -p` iba pre `smtpDialog` riadky, skontrolovať `git diff --cached` |
| Iný test alebo modul importuje dialóg | Low | grep + focused typecheck v Task 2 |

## Open Questions

- Žiadne. Dizajn bol schválený v chate 2026-10-02.
