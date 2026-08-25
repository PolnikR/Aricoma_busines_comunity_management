# TODO: Oprava zlyhaných Vitest testov

- [ ] Obnoviť `node_modules` podľa `package-lock.json`, najmä `keycloak-js@26.2.4`.
- [ ] Overiť reprezentatívny UI a unit/API test.
- [ ] Stabilizovať `formatCapacityBytes` pre locale-independent výstup.
- [ ] Pridať alebo potvrdiť regresný test pre `6.98 TB` v `sk-SK` locale.
- [ ] Spustiť `parseCapacity.test.ts`.
- [ ] Spustiť kompletný `vitest run --reporter=verbose`.
- [ ] Spustiť `git diff --check` a cielený lint/typecheck.
- [ ] Vytvoriť atomický commit až po úspešnom overení implementácie.
