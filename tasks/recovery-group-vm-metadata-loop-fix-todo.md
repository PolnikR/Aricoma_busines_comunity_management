# Todo: Recovery Group VMware metadata render-loop fix

## Phase 1: Regression test

- [ ] Task 1: Pridať test stability VMware recovery `data` / `vmMetadataByName` referencie pri rerenderi bez zmeny inventory.
- [ ] Potvrdiť, že test používa reálny recovery inventory hook.

## Phase 2: Root fix

- [ ] Task 2: Memoizovať VMware recovery projection podľa `vmwareQuery.data`.
- [ ] Nemeniť `useVmwareResourceInventory`, debounce, API request ani query key.
- [ ] Nemeniť Builder/ResourcesStep, pokiaľ testy nepreukážu ďalšiu chybu.

## Checkpoint

- [ ] Metadata referencia je stabilná pri nesúvisiacom rerenderi.
- [ ] Nový VMware inventory response stále vytvorí nový správny projection.
- [ ] IBM Power/FlashSystem regresné testy ostávajú zelené.

## Phase 3: Verification

- [ ] Spustiť focused recovery + VMware hook testy.
- [ ] Spustiť focused ESLint.
- [ ] Spustiť `npm run typecheck`.
- [ ] Spustiť `git diff --check`.
- [ ] Skontrolovať task-owned diff.
- [ ] Commitnúť iba plan/todo, regression test a root fix.

## Definition of Done

- [ ] `Maximum update depth exceeded` root cause je odstránený stabilnou derived-data referenciou.
- [ ] Server-side Recovery Group VMware `name_prefix` filtering zostáva funkčný.
- [ ] Focused testy, lint, typecheck a diff check prešli.
- [ ] Zmena je v atomickom commite.
