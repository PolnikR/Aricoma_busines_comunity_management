# Plán: Recovery App `platform` = typ providera, `source_provider_id` = konkrétny provider

Úlohy: `tasks/recovery-app-source-provider-todo.md`. Vetva `spike/ant-design-shell`. Zdroj pravdy: `openapi/abco-api.json` → `src/generated/**` (ručne sa needituje).

## Prehľad

BE rozlišuje `application.platform` (typ `VMWARE | IBM_POWER`) a `application.source_provider_id` (ID vybraného source providera). FE dnes do `platform` zapisuje provider ID. Cieľ: na API hranici posielať `platform = provider.type`, `source_provider_id = provider.id`; edit vyberá provider podľa `source_provider_id` (s legacy fallbackom). Rollback/inventory **nesmú** spoliehať na BE default `compute_provider_id ← source_provider_id` — pozri audit BE nižšie (T5 prepracovaný, čaká na rozhodnutie).

## Audit (2026-10-07)

### Generated diff (necommitnutý, pripravený pred session)
- **Táto úloha:** `source_provider_id?: string | null` v `recoveryApplication`, `recoveryAppRecord`, `recoveryAppSubmission`, `recoveryAppSubmitResponse`, `recoveryAppsResponse`, `submitRecoveryDagBody`; `compute_provider_id` bez defaultu a voliteľný v `deleteRecoveryAppParams` a `getRecoveryAppInventoryParams`. `application.platform` zostáva `zod.string()`.
- **Nesúvisiace:** `managedSystem` v `provider`, `providerRecord`, `providersResponse`, `submitProviderBody`, `orchestrationProvider(Record)`, `platformProvidersResponse`, `submitPlatformProviderBody`.
- `npm run typecheck` je už teraz zelený (nové polia sú voliteľné) → chyby kontraktu typecheck nezachytí, musia ich chytiť testy.

### Handwritten použitia `application.platform` / form `platform`
| Miesto | Dnes | Po zmene |
|---|---|---|
| `components/AppMetadataForm.tsx` 41–44, 130–147 | dropdown `value = platform` (= provider ID), „unavailable {id}“ option | **bez zmeny** — form `platform` zostáva interné UI = ID vybraného providera |
| `components/RecoveryAppBuilder.tsx` 59, 239, 310 | default `''`, `detailsValid` porovnáva `provider.id === formState.platform` | bez zmeny (interné ID) |
| `utils/validateRecoveryApplication.ts` 52–59 | `provider.id === formState.platform` | bez zmeny (interné ID) |
| `utils/recoveryApplicationFormMapper.ts` 54 `toRecoveryApplicationFormState` | `platform: data.platform` | **zmena:** `platform: sourceProviderIdOf(data)` |
| `utils/recoveryApplicationFormMapper.ts` 74 `toRecoveryApplicationData` | `platform: formState.platform` (ID do wire!) | **zmena:** `platform = provider.type`, `source_provider_id = provider.id` z providers datasetu |
| `pages/RecoveryApplicationBuilderPage.tsx`, `pages/RecoveryApplicationEditorPage.tsx` | `toRecoveryApplicationData(formState)` | **zmena:** načítať `useGetProviders({ role: 'all' })` (rovnaký query key ako builder → cache) a odovzdať do mappera |
| `components/RecoveryApplicationsTable.tsx` 108 stĺpec „Platform“ | `getProviderLabel(platform, providers)` → meno providera | **zmena:** `getProviderLabel(sourceProviderIdOf(app), providers)` |
| `RecoveryApplicationsTable.tsx` 160, 168 filter „Platform“ | hodnoty/porovnanie podľa `platform` | **zmena:** podľa `sourceProviderIdOf(app)` (vizuál filtra rovnaký) |
| `RecoveryApplicationsTable.tsx` 454 drawer „Platform“ | `getProviderLabel(platform)` (bez providers → ID) | **zmena:** `getProviderLabel(sourceProviderIdOf(app))` — zachová dnešný výstup (ID) |
| `RecoveryApplicationsTable.tsx` 520 JSON badge | `platform` | bez zmeny — badge zobrazí typ (`IBM_POWER`), čo je správne |
| `model/recoveryApplicationTypes.ts` 46–56 `RecoveryApplicationData`, 97–106 `ListItem.data.application` | bez `source_provider_id` | **zmena:** doplniť `source_provider_id` |

### Rollback / inventory — FE dnes
- `hooks/useDeleteRecoveryApplication.ts` `resolveRollbackProviderIds` posiela ako `compute_provider_id` prvý `VMWARE` provider s `role=target` — **pre každú platformu**, teda aj pre IBM Power app (BE tam vráti 400 „not IBM_POWER“).
- `rollback_orphans`: FE ho nikde nepoužíva (0 výskytov) → orphan flow v FE neexistuje.
- `components/RecoveryApplicationInventory.tsx` `compute_provider_id` neposiela. Doteraz BE defaultoval na hardcoded `vmware-vcenter-02`; po BE zmene defaultuje na `source_provider_id`.

## Audit BE (abco-be `origin/main` @ `3fbccab`, 2026-10-07)

Lokálny klon `abco-be` bol na `2c98102` (bez `source_provider_id`); urobil som iba `git fetch` a čítal `origin/main` (commity `55826ab` „store application.source_provider_id and default rollback compute provider to it“, `3fbccab` „default inventory compute provider to application.source_provider_id“). BE som nemenil.

| Miesto (origin/main) | Zistenie |
|---|---|
| `recovery/recovery.py` `RecoveryApplication.source_provider_id` | komentár: *„compute provider holding the **recovered** workloads (VMWARE **target** vCenter / IBM_POWER HMC)“* → BE ho myslí ako **target**, hoci sa volá `source_` |
| `api/routers/recovery_apps.py` `delete_recovery_app_route` | `compute_provider_id = compute_provider_id or application.source_provider_id`; 400 ak oboje chýba; orphan vždy explicitný |
| `_run_rollback` (VMware) | `_resolve_vcenter_provider` + **`role == "target"` povinné** (inak 400); jeho credentials mažú recovered VMs/datastore |
| `_run_power_rollback` | IBM_POWER provider, ktorého HMC drží **target** LPARy; `managedSystem` providera vyberá **target** managed system; rola sa nekontroluje |
| `get_recovery_app_inventory` | ten istý default zo `source_provider_id` + `role == "target"` povinné; iba VMware (`_resolve_vcenter_provider`) |
| Recovery DAG (`recovery_app_template.py`, `recovery_app_power_template.py`) | target sa **nevyberá cez provider ID**, ale cez Airflow connection `application.target_connection` (Power: + `extra.managed_system` tej connection) |
| `providers/models.py` | `role: source/target`; `partnerProviderId` = **iba FLASHCOPY** (Metro Mirror peer pole), nie compute; `orchestratorConnId` = Airflow connection providera (unikátnosť nevynútená); `managedSystem` = IBM_POWER target systém pre rollback |
| `recovery/groups.py` | `provider_id_vm` = compute provider zdrojových VM/LPAR (Power app ho musí mať IBM_POWER); `provider_id_volume` = FLASHCOPY; žiadne target compute pole |
| Lab dáta `persistency/providers/providers.json` | `vmware-vcenter-01` source (conn `vcenter_default`), `vmware-vcenter-03` source (conn `vcenter_default`), `vmware-vcenter-02` **target** (conn `vcenter_default_destination`), `ibm-power-01` source (bez `managedSystem`) |
| `persistency/recovery_applications.json` | app `ibu`: `platform = "vmware-vcenter-01"` (legacy ID), bez `source_provider_id` |
| FE builder | `source_connection = 'vcenter_default'`, `target_connection = 'vcenter_default_destination'` **natvrdo pre každú app**, aj IBM Power |

### Výsledok
1. **`source_provider_id`** — podľa názvu, zadania a FE dropdownu (`isEligibleSourceProvider` vylučuje `role=target`) je to **source** compute provider. BE komentár a defaulty ho však používajú ako **target**. → **Sémantický konflikt v BE kontrakte.**
2. **Rollback `compute_provider_id`** — target compute provider: VMware = vCenter s `role=target`, kde sú recovered VMs; IBM Power = IBM_POWER provider (HMC + `managedSystem`) s target LPARmi.
3. **VMware target dnes** — nikde nepersistovaný. Recovery: Airflow connection `target_connection` (FE natvrdo). Rollback: FE posiela prvý `VMWARE` `role=target`. Inventory: predtým BE hardcoded `vmware-vcenter-02`, teraz default zo `source_provider_id`.
4. **IBM Power target dnes** — nikde nepersistovaný. Recovery: `target_connection` + jej `managed_system`. Rollback: FE posiela VMWARE target (chyba, BE 400). V lab dátach neexistuje IBM_POWER provider s `role=target` ani `managedSystem`.
5. **Odvodenie zo source** — **nie**. `partnerProviderId` je iba FLASHCOPY. Jediná nepriama väzba: provider s `orchestratorConnId == application.target_connection` (+ typ, pri VMware `role=target`) — heuristika, unikátnosť nevynútená, BE ju nepoužíva.
6. **Ďalšie pole** — **áno**, Recovery App potrebuje perzistovaný target compute provider (napr. `application.target_provider_id`), ideálne aj s odvodením `source_connection`/`target_connection` z `orchestratorConnId` providerov namiesto FE hardcodu.
7. **BE/OpenAPI zmena** — **potrebná**. Default `compute_provider_id ← source_provider_id` je pri source sémantike chybný: VMware → vždy 400 (`role=source`), IBM Power → rollback na source HMC/managed system. FE samo správny target odvodiť nevie.

### Dopad na T1–T4
T1–T4 (posielanie `source_provider_id` = vybraný source provider) zostávajú správne **iba ak FE posiela `compute_provider_id` explicitne** a nikdy sa nespolieha na BE default. Preto T5 nesmie odstrániť explicitný `compute_provider_id`.

### Fixtures, ktoré obsahujú `platform` ako provider ID alebo label
`AppMetadataForm.test.tsx` (`'airflow-01'`), `RecoveryAppBuilder.test.tsx` (`'vmware-01'`), `RecoveryApplicationBuilderPage.test.tsx`, `RecoveryApplicationEditorPage.test.tsx` (`'airflow-01'`), `useDeleteRecoveryApplication.test.ts` (`'vmware-source-01'`), `recoveryApplicationFormMapper.test.ts`, `RecoveryApplicationsTable.test.tsx`, `RecoveryApplicationsListPage.test.tsx`, `recoveryApplicationsWire.test.tsx`, `useRecoveryApplications.test.tsx` (`'VMware vCenter ESXi'` – label). Upravím iba tie, ktoré prechádzajú zmenenými cestami (form state ↔ wire, tabuľka, rollback); čisto opisné labely v testoch, ktoré platform nečítajú, nechám.

## Rozhodnutia

1. **Form state `platform` zostáva interné ID vybraného providera** (dropdown, builder gate, validácia bez zmeny, vizuál dropdownu bez zmeny). Wire tvar sa skladá iba v `toRecoveryApplicationData`.
2. **Jeden helper v `utils/sourceProvider.ts`:**
   - `SOURCE_PROVIDER_TYPES = ['VMWARE', 'IBM_POWER'] as const satisfies readonly ProviderType[]` — použije ho aj `isEligibleSourceProvider` (dnes tam sú tie isté dva literály; žiadny nový duplicitný zoznam).
   - `sourceProviderIdOf(application)` = `source_provider_id` ak je vyplnené; inak legacy: `platform`, **ak to nie je typ** zo `SOURCE_PROVIDER_TYPES`; inak `''`.
3. **Legacy edit bez async väzby na providers:** builder berie initial form state iba raz (`useState` init), providers sa načítavajú asynchrónne. Preto mapper nečaká na zoznam providerov:
   - legacy `platform = 'vmware-vcenter-01'` existuje medzi eligible providers → dropdown ho predvyberie; Save pošle nový tvar,
   - legacy ID neexistuje → existujúca option „unavailable {id}“ + validácia blokuje Save (dnešné správanie, nič sa nehádá),
   - `platform = 'VMWARE' | 'IBM_POWER'` bez `source_provider_id` → prázdny výber, používateľ musí vybrať (nehádame).
4. **Submit:** `toRecoveryApplicationData(formState, providers)` nájde provider podľa `formState.platform` v existujúcom providers datasete; ak chýba, vyhodí chybu (rovnaký vzor ako `toSubmittableTier` — Save je už gated validáciou).
5. **Rollback/inventory (rozhodnuté 2026-10-07):** FE vždy posiela explicitný target `compute_provider_id` a nikdy ho neodvodí zo `source_provider_id`. VMware: jednoznačný match `provider.type === 'VMWARE' && provider.role === 'target' && provider.orchestratorConnId === application.target_connection` (0 alebo >1 → FE chyba, request sa neposiela) — pre rollback aj inventory. IBM Power rollback je vo FE zablokovaný. IBM Power inventory mimo scope. Bez nových hardcoded ID, bez `partnerProviderId` (FLASHCOPY-only), bez `managedSystem` logiky. `provider_id = orchestrationProviderId` bez zmeny.
6. **Typy:** handwritten `RecoveryApplicationData.application` dostane `source_provider_id: string`, `ListItem.data.application` `source_provider_id?: string | null | undefined` (mapper už spreaduje `record.application`, takže hodnota prejde bez zmeny mappera).
7. **Commity (2):**
   1. `chore(api): sync OpenAPI contract` — iba `openapi/abco-api.json` + celé `src/generated/**` (vrátane `managedSystem`, lebo `openapi/abco-api.json` sa nedá commitnúť po častiach a generated musí sedieť so spec). Žiadna `managedSystem` funkcionalita. Podmienka: `check-generated` exit 0.
   2. `fix: send provider type and source provider id for recovery apps` — všetka handwritten zmena + testy.

## Úlohy
- [x] T1: Overiť a commitnúť contract (`check-generated`)
- [x] T2: Helper `sourceProvider.ts` + typy + form mapper (create/edit/legacy)
- [x] T3: Pages odovzdávajú providers do mappera; submit testy IBM Power / VMware / legacy
- [x] T4: Tabuľka, filter, drawer cez `sourceProviderIdOf`
- [x] Checkpoint: typecheck, focused testy, focused eslint, `git diff --check`, audit `platform`, commit (T1–T4)
- [ ] T5: explicitný VMware target `compute_provider_id` cez `target_connection ↔ orchestratorConnId` (rollback + inventory); IBM Power rollback zablokovaný

## Riziká

| Riziko | Dopad | Mitigácia |
|---|---|---|
| Typecheck chybu kontraktu nezachytí (polia voliteľné, `platform: string`) | High | Testy na request body (`submit_recovery_dag`, `delete_recovery_app`, `get_recovery_app_inventory`) |
| BE default `compute_provider_id ← source_provider_id` je pri source sémantike chybný (VMware 400 `not role=target`, Power iný HMC) | High | FE vždy posiela explicitný target; BE follow-up nižšie |
| `orchestratorConnId` nemá v BE vynútenú unikátnosť → viac VMware targetov s rovnakou connection | Med | 0 alebo >1 match = FE chyba, request sa neposiela; nič sa nehádá |
| `target_connection` je dnes vo FE natvrdo `vcenter_default_destination`; target provider bez zhodného `orchestratorConnId` → rollback/inventory zablokované chybou | Med | Zámerné; chyba vysvetlí chýbajúci provider s danou connection; oprava na úrovni provider konfigurácie alebo BE follow-up |
| IBM Power rollback vo FE nedostupný do BE follow-upu | Med | Zrozumiteľná `RecoveryApplicationsError`; DELETE sa neposiela (dnes BE vracia 400) |
| IBM Power inventory (BE endpoint iba VMware) | Low | Mimo scope, bez workaroundu |
| FE natvrdo `vcenter_default*` connections aj pre IBM Power app | Med | Mimo scope; súčasť BE follow-upu |
| Commit 1 obsahuje aj generated `managedSystem` | Low | Iba contract sync, žiadna handwritten `managedSystem` logika |
| Legacy record s neexistujúcim provider ID sa neuloží bez nového výberu | Low | Zámerné (nehádame) |
| Paralelné sessions vo worktree | Med | Stage iba explicitný zoznam ciest |

## Rozhodnuté (2026-10-07)
- T1–T4 schválené.
- Contract commit `chore(api): sync OpenAPI contract` (`openapi` + celé `src/generated/**` vrátane generated `managedSystem`, bez handwritten `managedSystem` logiky), podmienka `check-generated` exit 0.
- Drawer „Platform“ vizuálne bez zmeny.
- T5: VMware target cez `target_connection ↔ orchestratorConnId` (presne 1 match), IBM Power rollback zablokovaný, IBM Power inventory mimo scope.

## BE kontraktový problém
Aktuálny BE default `compute_provider_id ← application.source_provider_id` (`delete_recovery_app`, `get_recovery_app_inventory`, commity `55826ab`, `3fbccab`) je pri source sémantike **nesprávny**:
- **VMware:** `source_provider_id` má `role=source`, ale `_run_rollback` aj inventory vyžadujú `role=target` → default vždy skončí 400.
- **IBM Power:** source HMC/provider nemusí byť HMC/provider (resp. managed system), na ktorom vznikli target LPARy → rollback by siahol na zlé miesto.
- BE komentár modelu (`recovery/recovery.py`) opisuje `source_provider_id` ako *„compute provider holding the recovered workloads (target)“* — v rozpore s názvom a s FE dropdownom (source provideri).

FE preto dočasne posiela explicitný target `compute_provider_id` (VMware) a na BE default sa nespolieha.

## BE follow-up: `target_provider_id`
Recovery App by mala explicitne niesť source aj target compute provider:

```json
{
  "application": {
    "platform": "IBM_POWER",
    "source_provider_id": "ibm-power-source-01",
    "target_provider_id": "ibm-power-target-01"
  }
}
```

- `platform` = `VMWARE | IBM_POWER`
- `source_provider_id` = source compute provider
- `target_provider_id` = target compute provider (VMware `role=target` vCenter; IBM_POWER provider s HMC/`managedSystem` target LPARov)

Následne:
- `delete_recovery_app` a `get_recovery_app_inventory` defaultujú `compute_provider_id ← target_provider_id` (nie `source_provider_id`); FE heuristiku `target_connection ↔ orchestratorConnId` odstráni.
- IBM Power rollback vo FE sa odblokuje.
- Ideálne BE odvodí `source_connection`/`target_connection` z `orchestratorConnId` vybraných providerov namiesto voľných stringov z FE (dnes natvrdo `vcenter_default*`, aj pre Power).
- FE doplní výber target providera do builderu (samostatná úloha po BE zmene).

## Otvorené otázky
Žiadne.
