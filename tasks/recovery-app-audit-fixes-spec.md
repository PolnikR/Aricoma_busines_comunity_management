# Spec: Recovery Applications – audit FE voči BE kontraktu

Cesty: BE `abco-be/` (len na čítanie). Pri FE je `RA/` skratka pre `src/features/recovery-plans/recovery-applications/`.

## Overené BE pravidlá (zdrojový kód abco-be)

| # | Pravidlo | Zdroj |
|---|---|---|
| B1 | **VMware:** source aj target musia byť typu `VMWARE`. Source musí mať `role=source`, target `role=target`. Provider bez roly sa počíta ako `source`. | `recovery/recovery.py:132-149` |
| B2 | **IBM Power:** source aj target musia byť typu `IBM_POWER`. Rola sa nekontroluje a ten istý provider môže byť na oboch stranách („single-HMC lab“). | `recovery/recovery.py:135, 148` |
| B3 | `platform` sa porovnáva bez ohľadu na veľkosť písmen. Čokoľvek iné ako `IBM_POWER` ide cestou VMware. | `recovery/recovery.py:138` |
| B4 | **Re-submit prepíše stav orchestrácie:**<br>• `orchestration.pushed` vždy dostane hodnotu query parametra `push_to_orchestrator`,<br>• `run_id` sa zachová,<br>• `provider_id` sa prepíše (default `airflow-01`).<br>Pri `push=false` sa DAG v Airflow **nezmaže**. Recovery appky nemajú read-only ochranu, akú majú recovery groups. | `api/routers/recovery_apps.py:148-152, 163-164`; `recovery/groups.py:122-140` |
| B5 | **Delete:** o rollbacku rozhoduje iba query parameter `rollback_from_orchestrator`; `pushed` sa nečíta. Artefakty sa odstraňujú podľa `orchestration.run_id`. | `recovery_apps.py:448`; `recovery/rollback.py:50-52` |
| B6 | **Delete pre IBM Power** používa `compute_provider_id`, teda IBM_POWER providera (default `target_provider_id`). Potrebuje aj uložený `target_lpar_prefix`. | `recovery_apps.py:297-306, 349-350, 463` |
| B7 | **`/get_recovery_app_inventory`** podporuje iba VMware (`_resolve_vcenter_provider` a kontrola `role=target`). Pre IBM Power appku vráti 400 „is not a VMWARE provider“. | `recovery_apps.py:189-278`; `api/deps.py:20-21` |
| B8 | **`notificationEmail`** je voliteľný a uloží sa tak, ako príde. Záznam sa celý nahradí (bez merge), takže vynechaný email sa uloží ako `null`. | `recovery_apps.py:97`; `providers/provider.py:44-46` |
| B9 | **`target_lpar_prefix`** je top-level pole záznamu, ktoré nastavuje BE. **V OpenAPI nie je.** Prechádza len vďaka `extra="allow"` na `RecoveryAppRecord`. | `api/schemas.py:416-423`; `recovery_apps.py:144-147` |

## Potvrdené FE problémy

| Úloha | Problém | Príčina vo FE |
|---|---|---|
| T1 | IBM Power target musí mať `role=target` a IBM Power source nesmie mať `role=target`. Ten istý Power provider sa nedá vybrať na oboch stranách. | `RA/utils/eligibleProviders.ts`: `isEligibleSourceProvider` (`role !== 'target'`) a `getEligibleTargetProviders` (`role === 'target'`) |
| T2 | Editor dovolí uložiť pushnutú appku s vypnutým push. BE potom nastaví `pushed=false` a FE pri Delete rollback nepošle (`if (app.pushToOrchestrator)`), takže DAG v Airflow ostane bez záznamu o nasadení. | `RA/components/RecoveryAppBuilder.tsx` (prepínač), `RA/hooks/useDeleteRecoveryApplication.ts` |
| T3 | Inventár pre IBM Power volá endpoint, ktorý Power nepodporuje (B7), a výsledkom je chyba 400. | `RA/components/RecoveryApplicationInventory.tsx` (pre `isPower` povolený request) |
| T4 | `notificationEmail` sa pri editácii stratí. | `RA/utils/recoveryApplicationFormMapper.ts`: `toRecoveryApplicationData` ho neposiela, form state ho nemá |
| T5 | Detail neukazuje cieľového providera, policy set ani notification email. | `RA/components/RecoveryApplicationsTable.tsx` (DetailOverview) |

## Rozhodnutia

- **T1:** IBM Power ponúka ako source aj target všetkých `IBM_POWER` providerov s `credentialStatus=ok`, bez ohľadu na rolu. Pravidlá pre VMware sa nemenia. Kontrola credentials ostáva FE pravidlom, BE ju pri submite nerobí.
- **T2:** Za nasadenú appku sa považuje iba `orchestration.pushed === true`, nie samotný `run_id`.
  - V editore takej appky je prepínač „Push to orchestrator“ zamknutý v stave zapnutý a pri ňom je vysvetlenie.
  - Uložiť ju teda možno len s opätovným pushom, ktorý nahradí ten istý DAG `dag_<run_id>`.
  - Delete sa nemení.
- **T3:** Pre IBM Power sa request vôbec nespustí. Zobrazí sa lokalizovaná informácia (`Alert` variant `info`), že funkcia zatiaľ nie je podporovaná. Rozhoduje jedna podmienka `isPower`, takže po doplnení BE podpory stačí túto vetvu odstrániť.
- **T4:** `notificationEmail` sa zachová vo form state (`string | null`) a odošle sa bez zmeny.
  - Recovery app UI dnes notification email nemá a nové pole by bola nová funkcionalita, preto UI ostáva bez zmeny.
  - Pri create sa posiela `null`, čo je BE default.
- **T5:** V Overview sa zobrazuje cieľový provider, `policy_set_id` a notification email. Zobrazenie Policy Set ID bolo následne výslovne schválené; test vylučujúci interné identifikátory z Overview ho už nezakazuje. Polia orchestrácie (`run_id`, `provider_id`, stav) naďalej zobrazuje sekcia Orchestration. `target_lpar_prefix` sa nezobrazí, kým nebude v OpenAPI (B9); nesúlad je zdokumentovaný.

## Čo FE nedokáže garantovať bez zmeny na BE

- Appka, ktorú už niekto uložil s `pushed=false`, hoci DAG existuje, sa z FE nedá spoľahlivo rozpoznať. Rozhodnúť len podľa `run_id` sme zámerne vylúčili.
- Ochranu z T2 obíde každý klient mimo tohto FE (API, skripty). Riešením na BE je zachovať `pushed=true` pri re-submite bez push alebo zaviesť read-only ochranu ako pri recovery groups.
- Ak sa pri re-submite nepošle `provider_id`, BE ho prepíše defaultom `airflow-01`. FE pri pushi posiela vybraného providera.
