# Implementačný plán: Recovery App `target_provider_id` + odstránenie `orchestratorConnId`

Úlohy: `tasks/recovery-app-target-provider-todo.md`.

## Prehľad

Backend (abco-be) zmenil kontrakt a Orval ho vygeneroval (necommitnuté v `openapi/abco-api.json` a `src/generated/query/zod/**`):

1. `application.source_connection` / `target_connection` sú odstránené. Nahrádzajú ich `source_provider_id` a `target_provider_id`.
   - Submit (`RecoveryApplication`, `SubmitRecoveryDagBody`): obe polia sú **povinné**.
   - Read (`RecoveryApplicationRecord` v list, submit a delete response): obe sú voliteľné, nullable. Legacy záznam ich nemusí mať.
2. `orchestratorConnId` je odstránený zo všetkých schém providera.
3. Default `compute_provider_id` pre delete a inventár je teraz `application.target_provider_id`.

## Rozhodnutia (schválené v chate)

- **Výber cieľa:** nový select „Cieľový provider“ v kroku Details. Ponúka providerov rovnakého typu ako zdroj s `role === 'target'` a `credentialStatus === 'ok'`. Pri zmene typu zdroja sa cieľ vynuluje.
- **IBM Power rollback sa odblokuje.** `compute_provider_id = target_provider_id` pre VMware aj IBM Power. Inventár pre IBM Power ostáva bez `compute_provider_id`, backend si doplní default.
- **Legacy záznam bez `target_provider_id`:**
  - Editor vynúti výber cieľa (gate kroku Details aj Save).
  - Rollback a VMware inventár skončia chybou `missing_compute_provider` na FE. Request sa nepošle.
  - Delete bez rollbacku funguje ako doteraz.
- **Ruší sa** `resolveTargetComputeProviderId`, teda párovanie cez `orchestratorConnId`.
- **Mimo scope:** provider formulár nedostane náhradu za `orchestratorConnId`. Fallback `sourceProviderIdOf` (provider id v `platform`) sa nemení.

## Stratégia commitov

- **Task 1 commitne iba kontrakt** (`chore(api): sync OpenAPI contract`), rovnako ako `0a8bba5d`.
  - Od tohto commitu `tsc -b` na HEAD hlási chyby, kým ich neodstránia Tasky 2–8.
  - Vitest typy nekontroluje, takže focused testy bežia aj medzi commitmi.
- **Každý ďalší task je jeden atomický commit**, ktorý vznikne až po overení:
  1. `npm exec vitest run <test súbory tasku>`: všetky zelené.
  2. `npx eslint <zmenené súbory>`: bez chýb.
  3. `npx tsc -b`:
     - žiadna **nová** chyba,
     - chyby v súboroch, ktoré task rieši, zmizli,
     - celkový počet chýb neklesá nahor (baseline sa zapíše po Tasku 1).
  4. `git diff --check`.
  5. `git add <explicitné cesty tasku>` (worktree zdieľajú paralelné sessions, nikdy `git add -A`) a `git commit`.
- **Po Tasku 8 musí byť `tsc -b` čistý.** Až potom je séria hotová.

## Graf závislostí

```
T1 kontrakt
 ├─ T2 provider formulár bez orchestratorConnId
 ├─ T3 provider detail/katalóg bez orchestratorConnId
 └─ T4 getEligibleTargetProviders
      └─ T5 select cieľa v AppMetadataForm (form state targetProviderId)
           └─ T6 builder gate + validácia
                └─ T7 wire typy + mapper (target_provider_id, bez connections)
                     └─ T8 rollback + inventár cez target_provider_id
```

T2 a T3 sú nezávislé od recovery vetvy.

## Zoznam úloh

### Fáza 1: Kontrakt a provideri
- [x] Task 1: Commit OpenAPI kontraktu (XS)
- [x] Task 2: Provider create/edit formulár bez `orchestratorConnId` (S)
- [x] Task 3: Provider detail a katalóg bez `orchestratorConnId` (S)

### Checkpoint A
- [x] V `tsc -b` nie je žiadna chyba so slovom `orchestratorConnId` mimo `recovery-applications/**`.
- [x] `npm exec vitest run src/features/providers-connectors/providers` je zelené.

### Fáza 2: Recovery app, write path
- [x] Task 4: `getEligibleTargetProviders` (XS)
- [x] Task 5: Select cieľového providera v `AppMetadataForm` (M)
- [x] Task 6: Builder gate a validácia cieľa (M)
- [x] Task 7: Wire typy a mapper na `target_provider_id` (L, zámerne nedelený, zdôvodnenie v todo)

### Checkpoint B
- [x] Zostávajúce chyby `tsc -b` sú iba v `useDeleteRecoveryApplication*` a `RecoveryApplicationInventory*`.
- [x] `npm exec vitest run src/features/recovery-plans/recovery-applications src/features/recovery-plans/recovery-runs` je zelené.

### Fáza 3: Rollback a inventár
- [x] Task 8: Rollback a inventár cez `target_provider_id`, odblokovaný IBM Power (M)

### Checkpoint C (koniec)
- [x] `npx tsc -b`: 0 chýb.
- [x] `npx eslint` nad všetkými zmenenými súbormi série.
- [x] `node scripts/orval/check-generated.mjs`: exit 0.
- [x] `npm exec vitest run src/features/recovery-plans src/features/providers-connectors`.
- [ ] Voliteľne, ak beží backend: manuálna kontrola cez CDP (Edge :9333). Vytvoriť appku s cieľom a overiť body requestu, potom delete s rollbackom a overiť `compute_provider_id` v query.
- [x] Celú test suite ani `npm run build` nespúšťame (CLAUDE.md §5).

## Riziká

| Riziko | Dopad | Mitigácia |
|---|---|---|
| HEAD medzi T1 a T8 neprejde `tsc -b` | Stredný | Rovnaký postup ako pri `0a8bba5d`. Séria sa dokončí naraz, Checkpoint C vyžaduje 0 chýb. |
| Paralelná session zmení generované súbory | Stredný | T1 commitne explicitné cesty. Pred commitom sa overí `check-generated.mjs`. |
| T7 je veľký (typy + fixtures v ~10 testoch) | Nízky | Zmeny fixtures sú mechanické (`source_connection`/`target_connection` → `target_provider_id`). Rozdelenie by nechalo commit s padajúcimi testmi. |
| Legacy záznamy v prostredí nemajú `target_provider_id` | Stredný | Editor vynúti výber a rollback zobrazí zrozumiteľnú chybu. Migráciu dát robí backend skript. |
| Provider je `IBM_POWER` bez `role` | Nízky | `role !== 'target'` znamená, že nie je ponúknutý ako cieľ. Ak to v prostredí nesedí, je to nová otázka, nie tichá zmena. |

## Otvorené otázky

Žiadne. Všetky boli zodpovedané v chate.
