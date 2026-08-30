# Checklist: server-side VMware name search v Recovery Groups

Patrí k `tasks/recovery-group-vm-server-search-plan.md`.

Implementácia sa má vykonať až po schválení plánu.

## Phase 1 — Shared search contract

- [ ] Task 1: Rozšíriť `ResourceSidebar` o opt-in controlled server-search mód.
- [ ] Zachovať default client-side `includes()` behavior pre existujúcich callerov.
- [ ] Server mód nesmie lokálne filtrovať serverom vrátené `items` podľa search textu.
- [ ] Pokryť client aj server mód focused testami.

### Checkpoint A — Sidebar

- [ ] `ResourceSidebar.test.tsx` je zelený.
- [ ] Recovery Application sidebar nepotrebuje produkčnú zmenu.
- [ ] Default props zachovávajú backward compatibility.

## Phase 2 — VMware query reuse

- [ ] Task 2: Upraviť `useRecoveryGroupResourceInventory` na options vstup s `vmwareNamePrefix`.
- [ ] VMware vetvu delegovať na existujúci `useVmwareResourceInventory`.
- [ ] Nevytvárať nový debounce, nový API wrapper ani nový VMware query key.
- [ ] Zachovať Power/FlashSystem request a mapping flow.
- [ ] Zachovať VMware VM metadata mapping.

### Checkpoint B — Data lifecycle

- [ ] Recovery hook test overuje delegovanie `providerId + vmwareNamePrefix`.
- [ ] `useVmwareResourceInventory.test.tsx` stále potvrdzuje 300 ms debounce.
- [ ] Rovnaký provider + prefix používa canonical `vmwareSearch` cache identitu.
- [ ] No-provider stav nevykoná request.

## Phase 3 — Recovery Group UI wiring

- [ ] Task 3: Napájať VMware search input v `RecoveryGroupResourcesStep` na recovery inventory hook.
- [ ] Použiť server-search mód `ResourceSidebar` iba pre VMware.
- [ ] Power/FlashSystem ponechať na local search.
- [ ] Search scope resetovať pri zmene provider/workload identity bez transient requestu so starým prefixom.
- [ ] Zachovať selected resources pri search zmene.
- [ ] Zachovať merge nazbieraných VM metadata.

### Checkpoint C — User flow

- [ ] `W -> WE -> WEB` nevytvorí request pre medzihodnoty pred 300 ms.
- [ ] Settled search odošle `POST /api/vms/search` s `{ "name_prefix": "WEB" }`.
- [ ] VMware server result nie je secondary substring-filtrovaný.
- [ ] Vymazanie searchu obnoví provider-only query.
- [ ] IBM Power/FlashSystem search nevytvára nový backend request pri písaní.

## Phase 4 — Verification

- [ ] Task 4: Spustiť focused test matrix.
- [ ] Spustiť:

  ```text
  npm exec vitest run \
    src/shared/components/resource-sidebar/ResourceSidebar.test.tsx \
    src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx \
    src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.test.tsx \
    src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx \
    src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx
  ```

- [ ] Spustiť focused ESLint nad zmenenými TS/TSX súbormi.
- [ ] Spustiť `npm run typecheck`.
- [ ] Spustiť `git diff --check`.
- [ ] Manual Network: jeden settled request po debounce, správny `provider_id` + `name_prefix`.
- [ ] Manual Network: Power/Flash search nevytvára per-keystroke request.
- [ ] Skontrolovať, že OpenAPI a `src/generated/**` neboli zmenené.

## Definition of Done

- [ ] Recovery Group VMware search používa backend `name_prefix`.
- [ ] 300 ms debounce a query lifecycle vlastní iba `useVmwareResourceInventory`.
- [ ] Recovery Groups a Resources zdieľajú canonical VMware cache pre rovnaký search.
- [ ] Server-side VMware search nepoužíva starý Recovery Group substring filter.
- [ ] Ostatné resource typy a shared sidebar callery zachovávajú dnešné behavior.
- [ ] Selected VM a získané metadata ostávajú stabilné počas searchovania.
- [ ] Všetky focused testy a statické kontroly prešli.
