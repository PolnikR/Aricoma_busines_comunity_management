# ABCO Overview – požiadavky na BE pre štyri prevádzkové KPI

**Stav:** návrh rozhrania na implementáciu BE; nie popis hotového endpointu.  
**Dátum auditu:** 2026-10-15  
**FE:** `src/features/dashboard/` (aktívne iba demo/fixture)  
**BE:** repozitár `abco-be`, vetva `main`, skontrolované implementácie

## 1. Účel a hranice

Overview má zobraziť štyri **jednoznačne definované prevádzkové počítadlá**:

| Kľúč v kontrakte | UI názov | Jednotka |
|---|---|---|
| `failedSnapshotJobs` | Failed snapshot jobs | jedinečné Recovery Groups |
| `replicationIssues` | Replication issues (IBM Metro Mirror + Hitachi TrueCopy) | jedinečné Recovery Groups s replikáciou |
| `connectionFailures` | Connection failures | jedineční provideri |
| `missingVolumes` | Missing volumes | jedinečné volumes podľa `(provider_id, volume_name)` |

Nie sú to „Protection at risk“, RPO, SLA ani hodnotenie obchodnej kritickosti aplikácií. Jedna chyba môže ovplyvniť viac skupín/aplikácií; každá metrika má **vlastnú jednotku**, čísla sa nesmú sčítať do „celkových incidentov“.

Zákaz náhradných/odvodených metrík: `orchestration.pushed = false` **nie je** neúspešný snapshot job; `credentialStatus = missing` **nie je** dôkaz neúspešného connection testu; `get_recovery_app_inventory().tiers[].vms[].found = false` znamená VM chýbajúcu *na recovery targete po obnove*, nie produkčnú chybu inventára.

## 2. Overené existujúce BE operácie

| Doména | Súbory v `abco-be` | Čo už existuje |
|---|---|---|
| Recovery Groups | `recovery/groups.py`, `api/routers/recovery_groups.py` | `get_recovery_groups()`, `orchestration.{run_id,pushed,provider_id}`, `topology`, `metro_mirror.{mode,consistency_group_id}`, `volumes[]` |
| Airflow | `api/routers/operations.py`, `apache_airflow/client.py` | `GET /get_orchestrator_runs?provider_id=&dag_id=`, interné `list_dag_runs()`; dnes per-DAG, nie dashboardová agregácia |
| IBM Metro Mirror | `ibm_flashsystem/discovery.py`, `api/routers/recovery_groups.py` | `get_metro_mirror_status()` – consistency group `state`, mappings `state`, `progress`, `error`; `_metro_mirror_status()` |
| Hitachi TrueCopy (plánované) | Hitachi CCI/HORCM integrácia / CCI daemon (mimo dnes overeného `abco-be` kontraktu) | Potrebný adapter na čítanie TrueCopy párov, ich reálneho stavu a mapovanie na ABCO Recovery Group; nemožno predstierať hotový endpoint |
| Provider checks | `api/routers/providers.py`, `api/routers/platform_providers.py`, `{vcenter,ibm_flashsystem,ibm_power}/health.py`, `orchestrator_sync/health.py` | `GET /test_provider`: VMware / FLASHCOPY / IBM_POWER vracia `ok` + `checks[]`; obsahuje aj Airflow twin checks. `GET /test_platform_provider`: AIRFLOW |
| Storage | `ibm_flashsystem/topology.py`, `recovery/groups.py` | `get_volume_relations(provider_id, volume_names)` => `{volume: {found, vdisk, relations}}`; `resolve_snapshot_target(group)` určuje správny storage a názvy volumes |
| Cache | `ibm_flashsystem/topology.py`, `discovery_cache/` | Volume relations využívajú existujúci cached raw storage inventory; `discovery/cache/history` loguje discovery, NIE provider connection health |

**BE v súčasnosti nemá** hotové agregované `GET /dashboard/overview`, uložený posledný connection-test status všetkých providerov, priebežný „protection health“ verdict ani jednotný health collector. Hitachi `/test_provider` nie je podporovaný; uvedené FlashSystem discovery/relations **nepredstavujú univerzálne Hitachi discovery**.

## 3. Presné pravidlá počítania

### KPI 1 – `failedSnapshotJobs`

**Definícia:** počet jedinečných nasadených Recovery Groups, ktorých **posledný dokončený plánovaný snapshot DAG run** v Airflow má `state = failed`.

- Vstup: `get_recovery_groups()`; zohľadniť iba skupiny s platnou referenciou na nasadený plánovaný snapshot DAG (typicky `orchestration.pushed === true`, príslušná policy/schedule a Airflow provider). Samotné `pushed=true` však nie je dôkaz funkčného DAG-u.
- Zdroj výsledkov: Airflow `list_dag_runs(dag_id, order_by=-logical_date)`, teda backendová implementácia `/get_orchestrator_runs`. Použiť skutočné mapovanie Recovery Group `orchestration.run_id` na `DAG_ID` podľa `apache_airflow/dag_handler.py` a vytvoreného DAG; toto mapovanie musí byť v implementácii otestované.
- Vybrať najnovší **dokončený** plánovaný run; `running` / `queued` neprepisujú posledný dokončený výsledok. Manuálne spustené recovery testy alebo recovery-app DAGy nepatria do tejto KPI. Airflow typ `run_type` a stav treba overiť proti reálnej v2 odpovedi.
- Započítať **jednu skupinu jedenkrát**, nie každú chybnú úlohu alebo historické zlyhanie. Nasledujúci úspešný dokončený run vyradí skupinu z počtu.
- Zlyhaný snapshot DAG **neznamená** automaticky absenciu použiteľného recovery pointu. `skipped`, prázdna história, nenájdený DAG, nemožnosť načítať Airflow alebo iba vytvorený `pushed` záznam majú samostatný stav, nie automaticky `failed` či `success`. Ak pri AirflowSkipException vznikne DAG `success` bez snapshotu, **nevyvodzovať z toho protection health**.
- Nutné preveriť Airflow response a výkon pri množstve DAG-ov; BE nesmie pri každom otvorení dashboardu robiť N+1 fan-out.

### KPI 2 – `replicationIssues` (IBM Metro Mirror + Hitachi TrueCopy)

**Definícia:** počet jedinečných Recovery Groups s nakonfigurovanou vzdialenou synchronnou replikáciou **IBM Metro Mirror alebo Hitachi TrueCopy**, pri ktorých posledné **úspešne načítané a dostatočne čerstvé** overenie potvrdilo problém konfigurácie alebo stavu očakávaných replikačných párov. **Jednotka je Recovery Group, nie počet párov.** Ak viac párov z jednej Recovery Group zlyhá, počíta sa iba raz.

- **IBM Metro Mirror (dnes existujúce BE operácie):** `get_recovery_groups()` + `_metro_mirror_status()`/`get_metro_mirror_status()` z `ibm_flashsystem/discovery.py`. Dnešný model rozpoznáva `topology=metro_mirror`.
- **Hitachi TrueCopy (potrebné doplniť):** Hitachi CCI/HORCM (cez CCI daemon / BE driver) musí sprístupniť *read-only* identitu párov, source/target LDEV, ich vzťah, vendor status, synchronizačný/procesný stav a čas merania. Konkrétne CCI príkazy a response schéma sa musia overiť v integračnom kontrakte, nie predpokladať. Aktuálny BE model `RecoveryGroup.topology: local | metro_mirror` nemá explicitné modelovanie TrueCopy. Backend preto musí doplniť vendorovo nezávislý typ replikácie a väzbu TrueCopy párov/CTG na Recovery Group; nesmie si túto väzbu domýšľať iba z názvu LDEV.
- Výsledok `consistent_synchronized` je normálne očakávaný stav CG; zároveň overiť väzbu a stav očakávaných mappings, nielen generické `!= consistent_synchronized`.
- **Nie každé nesynchronizovanie je incident**: pri `mode=managed` BE DAG `verify_mirror_consistency()` počas úvodnej synchronizácie/resync používa `AirflowSkipException`. Takýto stav je `pending` / dočasný, nie automaticky `issue`.
- Pre **IBM** BE developer musí schváliť explicitnú tabuľku `CG.state` a `mapping.state` → `ok | issue | pending | unknown` pre `managed` / `existing`, vrátane očakávaných volumes.
- Pre **Hitachi TrueCopy** musí samostatne zdokumentovať mapovanie CCI/HORCM pair statusov na `ok | issue | pending | unknown`, so zohľadnením prevádzkového režimu a zámerných operácií (napr. plánovaný split). Hitachi statusy nie sú zameniteľné s IBM stavmi; "nie je synchronizované" nie je samo osebe dôkaz chyby. Neznáme vendor statusy alebo chyby CCI klasifikovať `unknown`.
- Pri IBM chýbajúci `consistency_group_id`, pri Hitachi chýbajúca registrácia párov/CTG alebo chýbajúce prepojenie párov na Recovery Group, ako aj nedostupný provider, patria do `unknown`/config gap, nie automaticky `issue`. Deduplikácia podľa `recovery_group_id` naprieč viacerými párovými vzťahmi a vendor adaptérmi.
- **Pokrytie:** súčasné `abco-be` vie čítať IBM Metro Mirror; Hitachi TrueCopy nie je v skontrolovanom BE zapojené do tejto KPI. Cieľový výsledok je súčet potvrdene dotknutých Recovery Groups pre IBM Metro Mirror **aj** Hitachi TrueCopy, so samostatným rozsahom pokrytia po technológiách. Kým TrueCopy nie je podporované, musí byť v `coverage` označené ako `unsupported` / `unknown`, nie falošne vykázané ako zdravé; celková KPI nesmie mať stav `ok`, ak relevantné konfigurované TrueCopy skupiny zostávajú neoverené. Nenavrhovať automatické zahrnutie ostatných Hitachi technológií (GAD/UR) bez osobitného schválenia.

### KPI 3 – `connectionFailures`

**Definícia:** počet jedinečných registrovaných providerov, ktorých posledná **automaticky uložená, platná a čerstvá kontrola dostupnosti zariadenia** skončila `failed`.

- Podporované dnes: `test_vmware_provider()` (`vcenter/health.py`), `test_flashsystem_provider()` (`ibm_flashsystem/health.py`), `test_power_provider()` (`ibm_power/health.py`), AIRFLOW cez `airflow_platform_checks()` (`apache_airflow/health.py`). Platform AIRFLOW sa má zahrnúť explicitne, ostatné nepodporované platform typy nie.
- `/test_provider` vracia zmiešané **device** a **orchestrator_sync/airflow** kontroly. Do count započítať zlyhanie skutočnej kontroly pripojenia/overenia daného providera; zlyhanie samotnej Airflow twin synchronizácie sa musí evidovať oddelene, nie ako „FlashSystem connection failed“. Pre AIRFLOW platform provider použiť jeho vlastné kontroly.
- **Nová BE práca:** vyextrahovať a znovupoužiť existujúce health funkcie v plánovanom procese (nie volať HTTP endpoint z vlastného servera), zaviesť konfigurovateľnú periodicitu, obmedzenie súbežnosti a timeouty. Napr. 5 min je návrh, nie existujúca vlastnosť.
- Persistovať posledný výsledok po `provider_id` + `kind`: `state = ok | failed | unknown`, `checked_at` (ISO8601 TZ), prípadne bezpečné redigované `error_code` a čiastkové `checks[]`. Pri každej novej úspešnej kontrole prepísať predošlé zlyhanie. Manuálny test môže zdieľať tú istú logiku, ale politika, či mení automatickú „latest“ metriku, musí byť výslovne definovaná.
- `credentialStatus` nie je konektivita. Bez `credentialId`, bez platného testu, pri starnutí výsledku, nepodporovanom provideri `HITACHI` alebo nedokončenom teste musí byť `unknown`/unsupported; nie `OK` ani `FAILED` bez vykonaného testu.
- Backend musí oddeliť `VIEW` práva na výsledok od privilégia `RUN_HEALTH_CHECK`; bezpečná serverová background úloha s oprávneniami v súlade s existujúcou security vrstvou.

### KPI 4 – `missingVolumes`

**Definícia:** počet jedinečných očakávaných FlashSystem storage volumes uvedených v nakonfigurovaných Recovery Groups, pre ktoré validné úložiskové overenie vrátilo `found=false`.

- Vstup: `get_recovery_groups()` a `volumes[].name`. Pre každú skupinu použiť **`resolve_snapshot_target(group)`** z `recovery/groups.py`: `local` používa `provider_id_volume` a master `name`, `metro_mirror` používa auxiliary `partnerProviderId` a `auxiliary_name` (nie master), pretože tu žijú snapshoty.
- Čítanie `get_volume_relations(snapshot_provider_id, volume_names)` v `ibm_flashsystem/topology.py` vracia `found` v `_volume_relations`. Využíva cached raw inventory; ide o internú funkciu, **nie verejný endpoint**. `GET /get_recovery_group_inventory?run_id=...` je existujúci obal volajúci túto funkciu pre jednu skupinu.
- Napočítať iba `found === false` po úspešnom overení príslušného poľa. Unikátny identifikátor `(snapshot_provider_id, volume_name)`. Viaceré Recovery Groups zdieľajúce jeden volume ho nezapočítajú viackrát.
- V prípade chýbajúceho `partnerProviderId`, `auxiliary_name`, nepodporovaného storage (Hitachi), zlyhaného fetchu alebo neúplného cache záznamu je výsledok `unknown` / `not_supported`, **nie chýbajúci volume**.
- Nepreberať `get_recovery_app_inventory().tiers[].vms[].found` – kontroluje recovery target, nie existenciu master/aux volumes.
- Optimalizácia: zoskupiť požiadavky na storage provider, z jednej cached raw inventarizačnej snímky overiť všetky očakávané volumes, nevykonať fetch na každý volume/skupinu. Jednotka a deduplikácia musia byť testované.

## 4. Navrhovaný nový endpoint – návrh, zatiaľ neexistuje

`GET /dashboard/overview` (FastAPI; read-only; FE vykoná **jeden** request). Navrhovaný response model:

```json
{
  "generatedAt": "2026-10-15T10:00:00Z",
  "metrics": {
    "failedSnapshotJobs": {
      "count": null, "state": "unknown", "checked": 0, "eligible": 0,
      "unknown": 0, "lastCheckedAt": null
    },
    "replicationIssues": {
      "count": null, "state": "unknown", "checked": 0, "eligible": 0,
      "unknown": 0, "lastCheckedAt": null
    },
    "connectionFailures": {
      "count": null, "state": "unknown", "checked": 0, "eligible": 0,
      "unknown": 0, "lastCheckedAt": null
    },
    "missingVolumes": {
      "count": null, "state": "unknown", "checked": 0, "eligible": 0,
      "unknown": 0, "lastCheckedAt": null
    }
  }
}
```

**Tieto JSON hodnoty sú iba príklad po inicializácii, nie údaje prostredia.** Definície:

- `count`: počet potvrdených chýb; `0` iba ak bol relevantný rozsah úspešne pokrytý; `null` ak neexistuje použiteľný výsledok. Pri `partial` môže `count` obsahovať **počet potvrdených chýb v overenej časti**, nie definitívny celkový počet.
- `state`: `ok | partial | unknown | stale`. `ok` = úspešne vyhodnotený celý podporovaný rozsah; `partial` = aspoň niečo overené, niečo nie; `unknown` = nič spoľahlivo overené; `stale` = jediný posledný výsledok prekročil maximálny vek. Pri `stale` UI **nesmie prezentovať starý count ako aktuálny**.
- `eligible`: počet objektov v rámci skutočne podporovaného a vyhodnocovaného rozsahu; `checked`: koľko z nich má čerstvý overený výsledok; `unknown`: koľko nie. **Nesmie sa počítať nulový `eligible` ako zdravie celej platformy**, ak chýba načítanie zoznamu alebo sú nepodporované providery.
- `lastCheckedAt`: posledný úspešný čas kontroly v ISO8601 s timezone; `generatedAt` je čas zostavenia API odpovede, nie čas overenia.
- Podporovaný rozsah a nepodporované entity má BE dokumentovať v OpenAPI a prípadne vo voliteľných `coverage` údajoch; **neprezentovať IBM metriky ako úplný multi-vendor health stav**.
- Bez zistených problémov pri úplnej čerstvej kontrole UI zobrazí `0` s neutrálnym stavom `NONE`; pri `unknown`/bez podpory `—` a `UNKNOWN`. Pri `partial` UI musí jasne označiť neúplné pokrytie; samotný súčet bez kontextu by zavádzal.

Konkrétny dátový model/časový prah starnutia a intervaly background kontrol vybrať až s BE developerom podľa produkčných nárokov. Odporúča sa **server-side snapshot/agregovaná cache**, ktorú BE aktualizuje periodicky a/alebo na zmeny konfigurácie. Načítanie Overview nemá spúšťať provider connection check ani full Airflow/storage fan-out.

## 5. Práva, chyby, záťaž, testy

- Dashboard endpoint pod existujúcou autentifikáciou/autorizáciou; zvoliť explicitné read oprávnenie podľa `security/permissions.py` alebo nové s migráciou rolí. **Nikdy neprenášať prihlasovacie údaje ani tajné detaily `checks` v agregovanom JSON-e.**
- Pri chybe jednej domény nezhodiť celú odpoveď; vrátiť `partial/unknown` len danej metriky. Čerstvosť definovať per metrika (a podľa potreby per provider). `refresh` na FE nesmie implicitne spúšťať drahé live kontroly.
- Použiť existujúce adaptery/cache a per-provider rate/concurrency limit; timeouty, retries s limitmi; neprepisovať spoločnú cache nekonzistentnými čiastkovými výsledkami.
- Zoznamy chybových identít (pre neskorší Requires Attention/drill-down) sú **samostatná etapa**; tento kontrakt definuje výlučne KPI súhrn.

**Akceptačné scenáre pre BE testy:**

1. Dve failed Airflow task instances v jednom najnovšom scheduled run-e → **1** failed Recovery Group; neskorší úspešný scheduled run → **0**.
2. Failed recovery-app DAG a zlyhanie manuálne spusteného testu → **0** Failed Snapshot Jobs.
3. Managed Metro Mirror počas očakávanej synchronizácie → **nie** `issue`; jedno skutočne problémové CG s 3 mappings → **1** affected RG.
3a. Hitachi TrueCopy: jedna Recovery Group s viacerými problémovými TC pármi → **1** affected RG; úmyselný split v podporovanom plánovanom režime nie je automaticky `issue`.
3b. BE bez CCI adaptéra alebo bez mappingu TrueCopy párov na Recovery Group → Hitachi rozsah `unknown` / `unsupported`, nie `ok=0`; IBM čiastočné hodnoty môžu byť zobrazené len ako `partial`.
3c. Jedna Recovery Group využívajúca dva podporované replikačné vzťahy → pri problémoch v oboch vzťahoch počítať skupinu len raz.
4. Zlyhá Airflow twin check, ale VMware device check je OK → VMware sa **nepočíta** medzi device Connection Failures.
5. Provider vracia posledný device check `failed` a následne `ok` → karta ho po úspešnej kontrole **nepočíta**.
6. HITACHI bez connection implementácie alebo bez overenia, Airflow nedostupné, nemožný storage fetch → `unknown/partial`, nikdy falošné `0`.
7. Ten istý volume v dvoch Recovery Groups → pri úspešnom `found=false` sa počíta **raz**, podľa správneho `snapshot_provider_id`.
8. Metro Mirror RG: overovať auxiliary volume cez `resolve_snapshot_target`, nie master.
9. Načítanie Overview spúšťa iba agregovaný read, bez nové pripojení na storage/vCenter/Airflow na request path.
10. Stav `partial` a `stale` musí FE vedieť rozlíšiť od `ok=0`.
11. `metrics.replicationIssues` je vendorovo neutrálne; odporúča sa pridať `coverage.byTechnology` (IBM Metro Mirror, Hitachi TrueCopy) pre počet skúmaných, neoverených a nepodporovaných skupín, aby dashboard neprezentoval čiastočnú IBM metriku ako kompletný výsledok.

## 6. Rozsah práce a integračné kroky

**BE implementácia:** zdrojové collectors/evaluation služby, per-provider health history/snapshot, scheduler, agregácia, FastAPI router + response schema + security, jednotkové/integračné testy, aktualizovaný OpenAPI contract. Pre druhú KPI navyše **Hitachi TrueCopy CCI adapter** a jednoznačné priradenie TC párov/CTG k Recovery Groups.

**FE integračná etapa:** po dodaní API vytvoriť React Query hook + adapter do dashboard metrics; následne načítavať `metrics.*` namiesto `dashboardFixture.issues` a implementovať stavy `ok/partial/unknown/stale` spolu s coverage v UI. Zachovať `Auto/Compact/Spacious`, mobilné 2×2, české/slovenské/anglické preklady. Až potom odstrániť `Demo data`.

**Aktuálna FE zmena:** zmenené len štyri názvy, jednotky a ilustratívne údaje v horných kartách; ostatné panely (Requires Attention, Recent Activity, Infrastructure, Topology) ostávajú demo a **nie sú podložené týmto endpointom**.

**Mimo rozsahu:** vymýšľanie „protection at risk“, health severity ranking, univerzálne Hitachi checky, business priority, nový Requires Attention feed, nové FE requesty bez hotového BE API.
