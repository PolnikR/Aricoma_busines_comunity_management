# TODO: Oprava zlyhaných Vitest testov

- [ ] Obnoviť `node_modules` podľa `package-lock.json`, najmä `keycloak-js@26.2.4`.
- [ ] Spustiť reprezentatívny UI a API/unit test, ktoré predtým padali na importe `keycloak-js`.
- [ ] Upraviť `formatCapacityBytes` na locale-independent technické formátovanie.
- [ ] Pridať alebo potvrdiť regresný test pre `6.98 TB` v locale `sk-SK`.
- [ ] Spustiť `parseCapacity.test.ts`.
- [ ] Spustiť kompletný `vitest run --reporter=verbose`.
- [ ] Spustiť `git diff --check` a cielený lint/typecheck.
- [ ] Vytvoriť atomický commit až po úspešnom overení.
