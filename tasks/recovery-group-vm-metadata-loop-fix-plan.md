# Implementation Plan: Recovery Group VMware metadata render-loop fix

## Overview

Opraviť regresiu `Maximum update depth exceeded`, ktorá vznikla po migrácii Recovery Group VMware inventára na zdieľaný `useVmwareResourceInventory`. Problém je v tom, že `useRecoveryGroupResourceInventory` dnes pri každom renderi vytvorí nový odvodený `data` objekt a nový `vmMetadataByName` objekt. `RecoveryGroupResourcesStep` má `useEffect` závislý od tejto referencie, volá `onMetadataAvailable`, a `RecoveryGroupBuilder` následne vykoná `setDraft`, čo spustí nekonečný render loop.

Cieľom je odstrániť nestabilnú referenciu bez zmeny API transportu, debounce, query key, cache alebo server-side `name_prefix` searchu.

## Architecture Decisions

- Root fix bude v `useRecoveryGroupResourceInventory`, teda na mieste, kde nestabilná odvodená hodnota vzniká.
- VMware recovery projection sa memoizuje podľa `vmwareQuery.data`; pokiaľ sa inventory response nezmení, `resourceNames` a `vmMetadataByName` zostanú referenčne stabilné.
- `RecoveryGroupResourcesStep` effect ani `RecoveryGroupBuilder.handleMetadataAvailable` sa nebudú meniť, pokiaľ regression test neukáže ďalší problém. Tým zostane zmena chirurgická.
- Existujúci `useVmwareResourceInventory`, 300 ms debounce, `POST /vms/search`, `name_prefix`, canonical query key a metadata merge ostanú nezmenené.

## Dependency Graph

```text
Task 1: Regression test reprodukujúci nestabilnú metadata referenciu
  -> Task 2: Memoizovať VMware recovery projection
    -> Task 3: Focused verification a commit
```

## Task 1: Add regression coverage for stable VMware recovery data

**Description:** Rozšíriť hook test tak, aby po úspešnom VMware query vykonal ďalší render bez zmeny inventory dát a overil, že `data` a najmä `vmMetadataByName` zostanú referenčne rovnaké.

**Acceptance criteria:**
- [ ] Test reprodukuje podmienku, ktorá pred opravou spúšťala ResourcesStep effect pri každom parent rerenderi.
- [ ] Test používa reálny `useRecoveryGroupResourceInventory`, nie mock komponentového hooku.
- [ ] Test nevyžaduje backend ani browser.

**Verification:**
- [ ] Pred opravou by assertion identity zlyhala.
- [ ] Po oprave test prejde spolu s existujúcimi recovery hook testami.

**Dependencies:** None.

**Files likely touched:**
- `src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx`

**Estimated scope:** Small.

## Task 2: Memoize the VMware recovery projection

**Description:** V `useRecoveryGroupResourceInventory` vytvoriť memoizovanú `RecoveryGroupResourceInventory` projekciu z `vmwareQuery.data` a vo VMware return vetve použiť túto stabilnú hodnotu namiesto vytvárania nového objektu pri každom renderi.

**Acceptance criteria:**
- [ ] Rovnaká `vmwareQuery.data` referencia produkuje rovnakú recovery `data` referenciu.
- [ ] `vmMetadataByName` nemení referenciu pri nesúvisiacom rerenderi.
- [ ] Pri skutočnej zmene VMware inventory sa recovery projection aktualizuje.
- [ ] IBM Power a FlashSystem flow ostanú nedotknuté.
- [ ] VMware server-side search, debounce a cache ostanú nezmenené.

**Verification:**
- [ ] Focused hook test suite prejde.
- [ ] Existing VMware search lifecycle test suite prejde.

**Dependencies:** Task 1.

**Files likely touched:**
- `src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.ts`

**Estimated scope:** Small.

## Checkpoint: Render-loop contract

- [ ] `vmMetadataByName` je stabilný medzi renderami bez zmeny inventory.
- [ ] `RecoveryGroupResourcesStep` effect už po parent rerenderi nedostane falošnú dependency zmenu.
- [ ] `RecoveryGroupBuilder.setDraft` sa preto nespúšťa v nekonečnom cykle.
- [ ] Reálny server-side VM search flow zostáva funkčný.

## Task 3: Focused verification and atomic commit

**Description:** Overiť iba priamo dotknutý flow a statické kontrakty, potom commitnúť plan, test a fix v jednom atomickom bugfix commite.

**Acceptance criteria:**
- [ ] Recovery Group inventory hook tests prejdú.
- [ ] Shared VMware inventory hook tests prejdú.
- [ ] Focused ESLint nad zmenenými TS/TSX súbormi prejde bez warningov.
- [ ] TypeScript typecheck prejde.
- [ ] `git diff --check` prejde.
- [ ] Commit obsahuje iba task-owned súbory.

**Verification:**
```text
npm exec vitest run src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx
npm exec eslint src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.ts src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx --max-warnings 0
npm run typecheck
git diff --check
```

**Dependencies:** Tasks 1-2.

**Files likely touched:** No additional production files.

**Estimated scope:** Small.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Memoizácia sa naviaže na nesprávnu dependency | High | Závisieť priamo od `vmwareQuery.data` a pokryť identity regression testom |
| Search výsledok sa po reálnom requeste neaktualizuje | High | Existing `useVmwareResourceInventory` lifecycle test + recovery hook search test ostávajú súčasťou focused verification |
| Zmena ovplyvní IBM Power/FlashSystem | Low | Nemeniť ich `useQuery/select` vetvu a ponechať existujúce testy |
| Fix iba maskuje loop v Builderi | Medium | Opraviť zdroj nestabilnej dependency; nemeníť effect alebo setState bez dôkazu ďalšej chyby |

## Open Questions

Žiadne. Root cause je potvrdený commitom `7cb95d3` a aktuálnym runtime stackom.
