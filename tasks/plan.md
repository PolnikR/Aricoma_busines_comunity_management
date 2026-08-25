# Implementation Plan: Oprava zlyhaných Vitest testov

## Overview

Kompletný beh Vitest (`vitest run --reporter=verbose`) skončil s výsledkom `67 failed`, `193 passed` test súborov a `1 failed`, `776 passed` testov. Zlyhania majú dve odlišné príčiny: 66 testových súborov nevie načítať deklarovaný balík `keycloak-js`, pretože chýba v lokálnom `node_modules`, a test `parseCapacity.test.ts` je závislý od slovenského locale (`6,98 TB` namiesto očakávaného stabilného `6.98 TB`).

## Root-cause findings

- `keycloak-js@^26.2.4` je prítomný v `package.json` aj `package-lock.json`, ale `Test-Path node_modules/keycloak-js` vrátil `False`.
- Chýbajúci balík spôsobuje import-resolution chyby v UI aj unit testoch; súvisiace mocking chyby sú sekundárnym prejavom neúspešného importu.
- `formatCapacityBytes` používa `toLocaleString(undefined, ...)`, takže výsledok závisí od locale procesu. Test vyžaduje stabilný bodkový desatinný oddeľovač.
- Predchádzajúce zmeny v pracovnom strome neboli zistené; plán nemení existujúci aplikačný kód.

## Architecture Decisions

- Najprv obnoviť konzistentnú dependency inštaláciu podľa existujúceho lockfile; nemeníme importy ani testy iba preto, aby sa obišiel chýbajúci balík.
- Formátovanie kapacity bude mať explicitné locale pre technickú hodnotu, aby rovnaký vstup dával rovnaký výstup v CI, lokálne aj pri slovenskom/českom jazyku UI.
- Overovanie bude vrstvené: najprv reprodukovať oba koreňové problémy, potom spustiť dotknuté testy, následne celý Vitest beh.

## Task List

### Phase 1: Obnova testovacieho prostredia

## Task 1: Doplniť chýbajúce runtime dependency

**Description:** Obnoviť `node_modules` z `package-lock.json` tak, aby bol dostupný deklarovaný `keycloak-js@26.2.4`. Použiť existujúci lockfile a nemeniteľné/clean install nastavenie podľa pravidiel projektu.

**Acceptance criteria:**
- [ ] `node_modules/keycloak-js` existuje a dá sa načítať cez Vite/Vitest.
- [ ] `package.json` ani `package-lock.json` sa nemenia bez dôvodu.
- [ ] Import-resolution chyba z `src/config/keycloak.ts` zmizne.

**Verification:**
- [ ] Spustiť `vitest run` na jednom pôvodne zlyhávajúcom API teste a jednom UI teste.
- [ ] Potom spustiť celý `vitest run`.

**Dependencies:** None

**Files likely touched:**
- `node_modules/` (lokálny generovaný obsah; necommitovať)

**Estimated scope:** XS

### Phase 2: Oprava deterministického formátovania

## Task 2: Stabilizovať formátovanie kapacity

**Description:** Upraviť `formatCapacityBytes` tak, aby technické kapacitné hodnoty používali explicitné locale s bodkou, pričom zachovajú existujúce jednotky, zaokrúhlenie a nulovú hodnotu.

**Acceptance criteria:**
- [ ] `formatCapacityBytes(6_980_000_000_000)` vracia `6.98 TB` bez ohľadu na locale procesu.
- [ ] `formatCapacityBytes(0)` vracia `0 B`.
- [ ] Existujúce testy helpera a spotrebitelia formátovanej hodnoty zostanú funkčné.

**Verification:**
- [ ] Spustiť `src/features/discovery-inventory/resources/helpers/parseCapacity.test.ts` v predvolenom locale.
- [ ] Spustiť ten istý test s locale `sk-SK` alebo ekvivalentným locale nastavením, ak to runner podporuje.

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/discovery-inventory/resources/helpers/parseCapacity.ts`
- `src/features/discovery-inventory/resources/helpers/parseCapacity.test.ts` iba ak bude potrebné doplniť locale regresný test

**Estimated scope:** S

### Checkpoint: Po Task 2

- [ ] Všetky dotknuté testy prejdú.
- [ ] Počet zlyhaní už nie je spôsobený chýbajúcim `keycloak-js` ani locale formátovaním.

### Phase 3: Celkové overenie

## Task 3: Overiť celý Vitest beh a oddeliť nové regresie

**Description:** Spustiť celý testovací projekt po oboch opravách a pri prípadných zostávajúcich zlyhaniach ich analyzovať ako nové, samostatné koreňové príčiny.

**Acceptance criteria:**
- [ ] `vitest run --reporter=verbose` prejde bez zlyhaní.
- [ ] Výsledok obsahuje všetkých pôvodných 260 testových súborov bez import-resolution chyby.
- [ ] Neboli upravené nesúvisiace súbory.

**Verification:**
- [ ] `vitest run --reporter=verbose`
- [ ] `git diff --check`
- [ ] Cielený lint alebo typecheck pre zmenené súbory podľa dostupných skriptov.

**Dependencies:** Task 2

**Files likely touched:**
- Súbory z Task 1–2

**Estimated scope:** S

### Checkpoint: Complete

- [ ] Všetky testy prejdú.
- [ ] Diff je minimálny a obsahuje iba opravu locale formátovania; `node_modules` nie je commitnutý.
- [ ] Zmena je pripravená na samostatný commit.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Lokálny `node_modules` je neúplný | High | Obnoviť dependency z existujúceho lockfile; nepovažovať import chyby za 66 nezávislých bugov. |
| Locale oprava zmení UX čísiel v UI | Medium | Obmedziť zmenu na `formatCapacityBytes`; overiť existujúce helper a komponentové testy. |
| Po obnove dependency sa odkryjú ďalšie zlyhania | Medium | Spustiť najprv reprezentatívne testy a potom celý Vitest beh; nové chyby evidovať oddelene. |
| `npm` nie je dostupné v PATH | Medium | Použiť dostupný Node/npm launcher alebo upraviť PATH iba v shelli; neinštalovať náhodné verzie balíkov. |

## Open Questions

- Nie sú potrebné na začatie opravy. Ak nebude v prostredí dostupný npm klient, treba ho sprístupniť alebo potvrdiť alternatívny spôsob obnovy `node_modules`.
