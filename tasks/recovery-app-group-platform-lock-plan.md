# Implementačný plán: Recovery App – Recovery Groups podľa platformy a uzamknutie providerov

Spec: `tasks/recovery-app-group-platform-lock-spec.md`. Úlohy: `tasks/recovery-app-group-platform-lock-todo.md`.

Každá úloha je samostatný commit. Pred commitom sa overí:
1. cielený vitest,
2. eslint na zmenených súboroch,
3. `npx tsc -b` s 0 chybami,
4. `git diff --check`.

Do commitu idú iba explicitne vymenované cesty. Zmeny sa nepushujú.

## Úlohy
- [ ] T1: Filtrovanie skupín podľa typu zdroja (S)
- [ ] T2: Potvrdenie zmeny zdroja pri vytváraní a odpojenie skupín (M)
- [ ] T3: Uzamknutie zdroja aj cieľa pri editácii, aj v logike a mapperi (M)
- [ ] T4: Validácia skupín a LPAR pred uložením (M)
- [ ] T5: Regresia: celé `recovery-applications` testy, tsc a lint (XS, bez commitu kódu)

## Riziká
| Riziko | Mitigácia |
|---|---|
| Riadené selecty v `AppMetadataForm` zmenia jeho správanie | Hodnoty už dnes chodia cez `initialValues` z form state. Existujúce testy formulára to overia. |
| Legacy záznam bez provider id ostane odomknutý | Zámerné, je to v spec. Inak by sa záznam nedal uložiť. |
