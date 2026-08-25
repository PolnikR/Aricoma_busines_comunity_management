# Plan: Oprava zlyhaných Vitest testov

## Zistenia

Beh `vitest run --reporter=verbose` skončil s výsledkom `67` zlyhaných a `193` úspešných testových súborov; z jednotlivých testov zlyhal iba `1` (`776` prešlo). Zlyhania majú dve koreňové príčiny:

- `keycloak-js@^26.2.4` je deklarovaný v `package.json` aj `package-lock.json`, ale chýba v `node_modules`. Z toho vzniká 66 import-resolution zlyhaní naprieč UI a unit testami; mocking chyby sú sekundárny prejav.
- `formatCapacityBytes` používa `toLocaleString(undefined, ...)`, takže v slovenskom locale vracia `6,98 TB`, zatiaľ čo test očakáva stabilné `6.98 TB`.

## Úlohy

### 1. Obnoviť dependency

- Obnoviť `node_modules` z existujúceho lockfile, najmä `keycloak-js@26.2.4`.
- Overiť jeden UI a jeden unit/API test, ktoré padali na importe `keycloak-js`.
- Nepremieňať importy ani testy na obchádzku neúplnej inštalácie; `package.json` a lockfile meniť iba pri preukázanom dôvode.

**Akceptácia:** `node_modules/keycloak-js` existuje a import `src/config/keycloak.ts` je resolvovaný.

### 2. Stabilizovať formátovanie kapacity

- Upraviť `src/features/discovery-inventory/resources/helpers/parseCapacity.ts`, aby technické kapacitné hodnoty používali explicitné locale s bodkovým desatinným oddeľovačom.
- Zachovať existujúce jednotky, zaokrúhlenie a výstup `0 B`.
- Doplniť alebo potvrdiť regresný test pre slovenské locale.

**Akceptácia:** `formatCapacityBytes(6_980_000_000_000)` vracia `6.98 TB` a `formatCapacityBytes(0)` vracia `0 B` bez ohľadu na locale procesu.

### 3. Overiť opravu

- Spustiť `src/features/discovery-inventory/resources/helpers/parseCapacity.test.ts`.
- Spustiť celý `vitest run --reporter=verbose`.
- Spustiť `git diff --check` a cielený lint/typecheck pre zmenené súbory.
- Ak zostanú zlyhania, analyzovať ich ako nové koreňové príčiny, nie ako samostatných 67 bugov.

## Závislosti a riziká

Úloha 1 je predpokladom pre spoľahlivé overenie úloh 2–3. Ak `npm` nie je dostupné v PATH, treba použiť dostupný npm launcher alebo sprístupniť npm; neinštalovať náhodnú verziu balíka mimo lockfile. Locale oprava má zostať izolovaná v helperi, aby nemenila lokalizáciu ostatných UI čísel.

## Definition of done

- [ ] Dependency je obnovená bez nepotrebných zmien manifestov.
- [ ] Kapacita je locale-independent a regresný test prechádza.
- [ ] Celý Vitest beh prejde bez zlyhaní.
- [ ] Diff je minimálny a overený.
