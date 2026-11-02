# Recovery Applications – Phase 2 Technical Help Popovers: PLAN

## 1. Executive Summary

Pôvodný návrh bol pripravený 2026-10-27. Používateľ následne schválil vykonávanie inline s atómovými commitmi; implementačný stav a skutočné verifikácie sú v TODO. Nasledujúci audit zaznamenáva stav pri plánovaní. FE audit: HEAD `1b0417fc`. BE bol výhradne read-only; Git odmietol zobraziť HEAD pre ownership. FE bol skúmaný najprv cez CodeGraph, BE priamo po oznámení chýbajúceho indexu.

Navrhujeme **9 logických helperov H1–H9: 3 shared (H6/H8/H9), 6 s platformovým obsahom (H1/H2/H3/H4/H5/H7)**. Varianty vrátane bezpečných generic fallbackov tvoria 22 obsahových záznamov, nie 22 ikon naraz. Použiť existujúce `KeyedHelpPopover` a `HelpPopover`, lokálny jednoduchý mapping a flat EN/SK/CS kľúče. Žiadny nový popover, modal ani localization framework.

Najväčšie implementačné riziko je dostupnosť tlačidiel vo vnorenom disabled fieldsete read-only wizardu. Navrhnutá úprava iba zúži disabled DOM obaly na editovateľné ovládania; business guards, navigation, lifecycle, requesty a provider locks zostanú zachované. H6 sa integruje až po existencii emailového poľa z Phase 1.

Autoritatívny checklist: [Phase 2 TODO](recovery-applications-technical-helpers-phase2-todo.md), **15 taskov**. Presné dva názvy výstupov určuje zadanie; `tasks/plan.md`, `tasks/todo.md`, Phase 1 a súbežné zmeny zostávajú nedotknuté. Následný výslovný pokyn používateľa povoľuje implementáciu a atómové commity inline; push/merge sa nevykonáva. Nezávislé review finálneho diffu ostáva samostatným krokom.

## 2. Aktuálny stav Recovery Applications

Všetky skrátené FE cesty v tomto dokumente začínajú v `src/features/recovery-plans/recovery-applications/`, ak nie je uvedené inak.

- `components/AppMetadataForm.tsx` má source/target Select bez field helperov. Notification Email input bol pridaný v rozpracovanej Phase 1; jeho integráciu a testy treba pred H6 potvrdiť. Email existuje aj v drafte, type a mapperi. Phase 2 nevytvára email input ani validáciu.
- `components/RecoveryAppBuilder.tsx:88–99` odvodzuje platformu z uloženého `lockedProviders.platform` alebo typu vybraného source providera. Draft `platform` obsahuje **provider ID**, nie platformový enum. Query template catalogu už čistí placeholder a filtruje platformu.
- Builder obsahuje Details/Tiers/Policy Set/Orchestration. Tiers majú ResourceSidebar a TierCanvas; `TierCanvas.tsx:35–39` triedi podľa `order`. `TierCard.tsx:110–111` používa vybrané `recovery_group.vms`; nejde o helper pri názve alebo ID skupiny.
- Policy Set a Push/Airflow ovládania sú inline v builderi. Airflow Select je dnes podmienený Push=true, s loading/error/empty vetvami. Zachovať jeho podmienky, nepridávať nové pole pri Save-only.
- `components/DagTemplateVersionSelect.tsx:19–35` už vykresľuje default raz, mapuje jeho voľbu na wire `null` a explicitnú nedostupnú hodnotu nezahadzuje. Phase 2 tento problém znovu neopravuje.
- `components/RecoveryApplicationsTable.tsx:436` má všeobecnú hlavičkovú pomoc `recoveryApplications.help` s tiers/policySet/orchestration. Overview a Orchestration majú technické hodnoty bez field helpers; DetailView nemá editor tier order ani zoznam konfigurovaných tier workloadov.
- Builder `:258` má outer disabled fieldset počas loading/saving, `:271` inner disabled fieldset pre readOnly. Nová help ikona vo vnútri read-only fieldsetu by bola disabled aj pri `disabled={false}` na tlačidle. Samotné pridanie ikon teda nespĺňa read-only požiadavku.
- `utils/recoveryApplicationFormMapper.ts:45–101` zachováva email, template a uložený platformový typ; source ID je oddelené od wire platform. Phase 2 mapper a business typy iba číta.

## 3. Audit existujúceho Recovery Groups UX

| Existujúci vzor | Zdroj | Použitie v Phase 2 |
|---|---|---|
| Label + samostatná ikona v jednom flex riadku | `recovery-groups/components/RecoveryGroupDetailsStep.tsx:86–95`, email | Ikona ako sibling `<label>`, nie button vnorený do labelu; zachovať htmlFor/input ID. |
| Platformový mapping s generic variantom | `recovery-groups/helpers/recoveryGroupFieldHelp.ts:1–4`; `RecoveryGroupProviderStep.tsx:47` | Rovnaká myšlienka v aplikačnom mappingu, bez importovania group copy. |
| Pomoc pri výbere workloadov/volumes | `RecoveryGroupResourcesStep.tsx:108–110` | H3 pri spoločnom kontexte výberu, nie pri group name/ID. |
| Policy Set heading helper | `RecoveryGroupPolicySetStep.tsx:26` | H5 pri nadpise Policy Set, dostupný aj pri error/empty stave. |
| Storage-specific helpery | `RecoveryGroupTopologyStep.tsx:50,93`, `RecoveryGroupMetroMirrorFields.tsx:50` | Auditované: topology, targetPool, existing/managed lookup. Obsah nepreberať do aplikácií, konfigurujú inú vrstvu. |
| Orchestration provider label | `RecoveryGroupOrchestrationStep.tsx:82–85` | H9 rovnaké zarovnanie pri Selecte; H8 samostatne pri Push. |
| DetailField `labelHelp` | `RecoveryGroupsTable.tsx:468–502` | Zdieľať aplikačné kľúče medzi wizardom a detailom, bez kopírovania textov. |
| Flat locale parity | `src/locales/recoveryGroupFieldHelpTranslations.test.ts` | Explicitný zoznam aplikačných variantov + neblank EN/SK/CS parity. |

Audit zahŕňa všetky skupinové field-help rodiny: compute generic/VMware/Power, email, topology, volumes, policySet, orchestration a targetPool; navyše existujúci topology lookup a všeobecnú group header pomoc. Všetky ostanú bez zmien.

`src/shared/components/help-popover/KeyedHelpPopover.tsx:15–40` používa `${helpKey}.trigger/title/intro`, sekcie `${helpKey}.${section}.title/text`, spoločné `help.close` a optional width. `HelpPopover.tsx` má hover 150 ms/close 200 ms, focus open, click open, Escape/close s návratom focusu, click outside, portál do body, `aria-owns`, `aria-haspopup=dialog`, `aria-expanded`, `aria-controls`, unikátne panel/title IDs, dialog scope pre Tab a capture scroll/resize reposition. Panel má vlastný scroll a viewport width limit. Toto sú existujúce implementačné mechanizmy, nie výsledok vykonanej browser QA.

## 4. Overenie technických tvrdení proti BE

Cesty BE sú relatívne k uvedenému BE rootu; čísla riadkov patria auditovaným súborom, implementátor ich musí pred použitím znovu skontrolovať. Žiadne tvrdenie nižšie nie je odvodené iba z názvu parametra alebo starých komentárov.

| Ref | Overený zdroj | Zistenie a hranice tvrdenia |
|---|---|---|
| B1 | `recovery/recovery.py:42–56,146–163` | Source/target provider IDs sú twin Airflow Connection IDs. VMware vyžaduje VMWARE source/target role; Power oboch IBM_POWER bez role checku, rovnaký HMC povolený. |
| B2 | VMware `apache_airflow/dags/recovery_app_template.py:48–61,451–452,732,815`; Power v1 `:46–61,180–187`, v2 `:48–63,230–237` | VMware číta source vCenter a registruje/remapuje/zapína VM na target vCenter. Power číta zdrojový LPAR cez HMC, určuje target managed system a vytvára LPAR cez target HMC. HMC nie je storage pole ani Airflow host. |
| B3 | `recovery/recovery.py:114–143,166–213`; všetky DAG `tier_vms` | `recovery_group.id` sa validuje a rozbalí na current group orchestration run ID; Power aj na storage provider/connection podľa snapshot targetu (Metro Mirror auxiliary, inak volume provider). Autoritatívny výber workloadov je `recovery_group.vms`; legacy `tier.vms` DAG nečíta. |
| B4 | VMware `:392,545–555`; Power v1 `:164–166,238–246`, v2 `build_lpar_group` a snapshot selection | Group run suffix filtruje FlashCopy kandidátov, potom sa uplatní recovery policy selection. Group run ID nie je application run ID ani ID konkrétneho Airflow DagRun. Pri missing historickom group run ID filter nemá spoľahlivé zúženie; FE už vyžaduje published RG s run ID. Netvrdiť, že BE vždy vynucuje presnú source-ID zhodu alebo že referencia skupiny je živá synchronizácia. |
| B5 | VMware `:52,839–850,951–961`; Power v1 `:50,523–530`; v2 `:52,575–605` | Všetky triedia tiers podľa `order`. VMware má nezávislé VM chains v tier task group; tier groups sú za sebou. Power v1 reťazí LPAR groups cez jeden `previous` naprieč tiermi. Power v2 má vonkajšiu tier group, vnútorné LPAR groups, `done` a `chain`, stále serial LPAR aj tiers; prázdne tiers vynechá. Komentár Power v1 „same as VMware“ nie je dôkaz VM serializácie. |
| B6 | `policy/policy_sets.py:92–123`; `api/routers/recovery_apps.py:133–175`; `apache_airflow/dag_handler.py:40–103` | Push rieši `recovery_app_policy_id`, optional Clean Room a zapeká schedule, snapshot selection/age/time do DAG constants. Power manual_zoning/manual_wwpn_entry nastavujú schedule=None; Power nemá Clean Room task. Prefix sa berie z policy a ukladá top-level `target_lpar_prefix` pri Push kvôli rollbacku. |
| B7 | `policy/recovery_app_policies.py:23–68`; VMware template `:34, task_clean_room` | Policy model obsahuje aj retention/boot_verify/enabled, ale renderer nepreukazuje uplatnenie všetkých týchto polí. Stará module docstring „future work“ nie je aktuálna autorita. Helper nesľúbi retention cleanup, health verification ani účinok enabled. VMware Clean Room enable ovláda teardown existujúcich target resources v rámci runu; nejde o záruku izolácie prostredia. |
| B8 | VMware `:50,963–992`; Power v1 `:48,531–543`; v2 `:50,606–620`; group router `api/routers/recovery_groups.py:171` | Aplikačný email je priamo `app.get('notificationEmail')`; iba truthy hodnota vytvára success/failure EmailOperator tasks s ALL_SUCCESS/ONE_FAILED. Null/empty nevytvorí tasks; žiadny fallback. Group má vlastný fallback na snapshot provider. VMware zachytáva niektoré vSphere chyby bez rethrow; email nie je úplné potvrdenie recovery úspechu a terminal trigger rules nie sú univerzálny failure alarm. |
| B9 | `apache_airflow/template_versions.py:31–43,65–87`; Power v2 `:78–105,575–620`; `dag_handler.py:97–103` | Aktuálne VMware v1 default, Power v1 default + explicit v2. Null znamená release default pri resolve. V2 pridáva grouping, lineárne wiring, parse-time duplicate/collision guards a template metadata; neznamená paralelnejšie alebo automaticky bezpečnejšie recovery. |
| B10 | `api/routers/recovery_apps.py:105–224`; `dag_handler.py:318–336`; všetky DAG decorators | Save-only persistuje bez SFTP DAG deploy. Push najprv validuje provider/credentials, persistuje pushed=true a resolved template, potom zapisuje JSON a Python DAG cez SFTP. Nové DAGy deklarujú paused-on-creation; upload sám nevolá trigger. Existujúci DAG stav/neskorší unpause/schedule sa nesmie zamieňať s uploadom. |
| B11 | router `:177–214`; FE `pages/RecoveryApplicationEditorPage.tsx:53–85,144–150`, `hooks/useRecoveryApplications.ts:19–44` | Bad provider/credentials môžu zlyhať pred persistenciou. Deploy exception po persistencii sa pokúsi uložiť pushed=false a vráti 502 „saved locally“. JSON-first nie je transakcia: nemožno zaručiť absenciu remote leftovers/partial Python súboru. FE má retry=false, reconcile a 409/502/network conflict lock + fresh reload. Helpers nesmú hlásiť vlastný úspech ani odomykať aplikáciu. |
| B12 | `recovery/recovery.py:91–98`; router `:474–500` | Každá úprava pushed app je BE 409, nielen version change. Rollback sa pokúša odstrániť nasadený DAG aj recovered resources a ponecháva aplikačný record; ok/skipped vedie k pushed=false, partial/failed necháva lock a vracia 502. Skutočný úplný cleanup nemožno bez výsledného reportu garantovať. FE potrebuje potvrdený fresh stav pred editáciou. |
| B13 | router `:108,168–172`; FE `hooks/useRecoveryApplications.ts:25–31` | Vybraný Airflow provider je cieľ SFTP deploy a uložené `orchestration.provider_id`; BE default query je airflow-01 aj pri Save-only. FE pri prázdnom Save-only ID parameter vynechá. „Nemusí byť vybraný“ teda neznamená „BE nikdy neuloží provider ID“. |
| B14 | `ibm_power/lpar_ops.py:220` a Power context `same_system` | Rovnaký HMC neznamená automaticky rovnaký managed system. Pri recovery na rovnaký systém je potrebný odlišujúci prefix; meno musí splniť LPAR obmedzenia. Helper nepodsúva, že každý single-HMC scenár bude úspešný. |

Policy Set je dnes vo FE povinný aj pre Save-only; BE ho vyžaduje pre Push a pri Save-only validuje zadanú referenciu. Vybraná skupina potrebuje vlastnú snapshot konfiguráciu a dostupné snapshoty; aplikačná policy určuje ich výber pri recovery, neprepisuje group snapshot schedule.

## 5. Finálny mapping H1–H9

Prefix všetkých nasledujúcich kľúčov: `recoveryApplications.fieldHelp.`. Každá bunka Key je `helpKey` prefix, nie text samotného triggera.

| ID | Step → komponent → presná poloha | Key / podmienka | BE dôkaz | Testy |
|---|---|---|---|---|
| H1 | Details → AppMetadataForm → sibling ikona za Source Provider labelom | `source.{vmware,ibmPower,generic}` podľa source platformy | B1/B2/B3 | Label association, Create switch, locked Edit missing provider, generic loading, read-only. |
| H2 | Details → AppMetadataForm → za Target Provider labelom | `target.{vmware,ibmPower,generic}`, platforma aplikácie, nie náhodný target | B1/B2/B14 | Same HMC, unknown target, VMware roles text, žiadny FlashSystem=HMC text. |
| H3 | Tiers → RecoveryAppBuilder → samostatný riadok „Recovery Groups and workload selection“ medzi opisom kroku a sidebar/canvas gridom | `workloads.{vmware,ibmPower,generic}` | B3/B4 | Jeden kontextový helper, aj bez assignmentu, selected workloads bez zmeny payloadu. |
| H4 | Tiers → RecoveryAppBuilder → za nadpisom Tiers, pri existujúcom opise poradia | `tierOrder.vmware.v1`, `tierOrder.ibmPower.v1/v2`, inak `tierOrder.generic` | B5/B9 | null+verified default, explicit v1/v2, catalog pending/error, tier reorder, read-only. |
| H5 | Policy Set → RecoveryAppBuilder → za heading Policy Set, pred picker/request stavmi | `policySet.{vmware,ibmPower,generic}` | B6/B7/B10/B12 | Error/empty/loading/pushed; Save-only text nesľubuje redeploy. |
| H6 | Details → AppMetadataForm → za Phase 1 Notification Email labelom | `email`, shared | B8 | F1 prerequisite, blank/null, RG fallback distinction, keyboard; žiadna nová email validácia. |
| H7 | Orchestration → DagTemplateVersionSelect → za DAG Template Version labelom | `template.{vmware,ibmPower,generic}` | B5/B9/B12 | Default raz, null zachované, v2 selection, unknown catalog, locked select + enabled help. |
| H8 | Orchestration → RecoveryAppBuilder → za textovým nadpisom Push to Orchestrator v toggle karte, mimo toggle labelu | `push`, shared | B10/B11/B12 | Toggle sa neprepne klikom na help; 502/partial zodpovedá existujúcim správam; read-only. |
| H9 | Orchestration → RecoveryAppBuilder → jeden label/help riadok nad Airflow provider request vetvami pri Push=true | `airflow`, shared | B10/B13 | Presne jedna ikona v normal/loading/error/empty vetve; Save-only nemá nový Select. |

H3 je pomoc pre vzťah skupina/výber, nie pre jej bežný názov. H4 patrí k poradiu celého grafu a nemusí sa opakovať na každej karte. Tiers tak pridajú dva odlišné, viditeľne pomenované kontexty, bez ikon pri každom workload riadku. H9 zostáva skrytý pri Push=false rovnako ako jeho ovládanie; H8 vtedy vysvetľuje, prečo Airflow výber nie je potrebný.

## 6. Platformový a template context

Použiť jeden malý feature-local `helpers/recoveryApplicationFieldHelp.ts`, podobne ako Recovery Groups. Obsahuje iba prevod známeho platformového typu na suffix a H4 version key; žiadny druhý provider resolver, fetch, state, registry service ani generický Help komponent.

- **Create:** existujúci builder `platform` odvodený z providera s ID `formState.platform`; typ normalizovať len na hranici mappingu (`VMWARE`/`IBM_POWER`, bez hádania podľa názvu). Ak provider pri loading/error/absencii nemá dôveryhodný typ, generic. Pri zmene source sa kľúče prerenderujú; otvorený starý panel sa nesmie ponechať s predchádzajúcou platformou. Pre dynamický keyed popover použiť React `key={helpKey}` v mieste renderu, ak by ostával otvorený pri zmene významu.
- **Edit/read-only:** autoritatívny uložený `lockedProviders.platform`; missing provider nemení Power pomoc na VMware. Unknown/legacy uložený typ → generic; pri existujúcom locku sa nesmie typ potichu odvodiť z iného mutable providera. Nezasahovať do validácie referencií.
- **DetailView:** `selected.data.application.platform` určuje platformu aj bez provider recordu. Provider ID/meno nerozhoduje o variante.
- **H4 configured:** explicitná verzia + známa platforma môže použiť známy lokálny opis; null potrebuje presne jeden aktuálny verified catalog default. Pending/error/multiple defaults/unknown future version → generic, nikdy tiché v1. Táto pomoc nesmie riadiť validáciu selectoru.
- **H4 deployed context, ak sa neskôr použije pri order údajoch:** vyžaduje skutočnú deployedTemplateVersion, nie dnešný default. Pri missing deployed metadata zobraziť generic. V aktuálnom DetailView sa H4 nepridáva, lebo nemá order ovládanie/hodnoty.
- **H7:** obsah popisuje voľbu a aktuálne podporované rozdiely; označenie default verzie v samotnom Selecte zostáva z BE catalogu. Nehardcodovať default option label ani nemeniť null semantiku.

## 7. Navrhnutý anglický obsah

Každá položka nižšie zodpovedá jednému obsahovému prefixu. `trigger` je vždy **“About {Title}”** s explicitne preloženým celým stringom, nie runtime skladaním. Sekcie pre všetky varianty: `sections={['effect', 'limitations']}`; nadpisy **Technical effect** a **Dependencies and limitations**. Texty sú návrh na obsahové review, zatiaľ nie vložené do locale súborov. Dôkaz/testy pre každý H sú v mappingu a audite vyššie.

### H1 – Source Provider

**`source.vmware`**
- **Title:** Source vCenter
- **Intro:** Select the production vCenter used to read the selected VMs and their storage configuration.
- **Technical effect:** The application source provider ID becomes the Airflow Connection ID used by the VMware recovery DAG.
- **Dependencies / Limitations:** Use a VMware provider with the source role and Recovery Groups for this source vCenter. The connection must be available on the selected Airflow instance.

**`source.ibmPower`**
- **Title:** Source HMC
- **Intro:** Select the HMC used to read the production LPAR configuration for recovery.
- **Technical effect:** The source provider ID becomes the Airflow Connection ID used to discover the selected LPARs and their recovery layout at run time.
- **Dependencies / Limitations:** Select Recovery Groups for this source HMC. Their FlashSystem snapshots are configured separately from the HMC connection.

**`source.generic`**
- **Title:** Source compute provider
- **Intro:** This provider identifies the production compute environment used by the recovery application.
- **Technical effect:** Its provider ID supplies the source compute connection for the generated DAG.
- **Dependencies / Limitations:** Platform-specific behavior is shown once the application platform is known. Recovery Groups must belong to the intended source environment.

### H2 – Target Provider

**`target.vmware`**
- **Title:** Target vCenter
- **Intro:** Select the vCenter where the recovered VMs will be registered and started.
- **Technical effect:** The target provider ID supplies the DAG connection for target checks, storage remapping, VM registration and power-on.
- **Dependencies / Limitations:** Use a VMware provider with the target role. Selecting it does not create snapshots or configure storage connectivity.

**`target.ibmPower`**
- **Title:** Target HMC
- **Intro:** Select the HMC that manages the system where recovered LPARs will be created.
- **Technical effect:** The DAG uses the target provider connection and its managed-system configuration to create and boot the recovered LPARs.
- **Dependencies / Limitations:** Source and target may use the same HMC. Recovery on the same managed system requires a distinguishing LPAR prefix. FlashSystem storage and Airflow orchestration are separate providers.

**`target.generic`**
- **Title:** Target compute provider
- **Intro:** This provider identifies the compute environment used for recovered workloads.
- **Technical effect:** Its ID supplies the target compute connection for the generated recovery DAG.
- **Dependencies / Limitations:** Platform-specific behavior requires a known application platform. This is separate from the storage provider and the Airflow deployment target.

### H3 – Recovery Groups and workload selection

**`workloads.vmware`**
- **Title:** VMware recovery workload selection
- **Intro:** Assign a Recovery Group for the source vCenter and choose the VMs this tier should recover.
- **Technical effect:** The DAG reads the selected list in recovery_group.vms. The backend resolves recovery_group.id to the group's current orchestration run ID, whose suffix scopes snapshot candidates.
- **Dependencies / Limitations:** The group must already have the required storage and snapshot configuration. Application recovery selects snapshots using its recovery policy; selecting the group does not create new snapshots.

**`workloads.ibmPower`**
- **Title:** Power recovery workload selection
- **Intro:** Assign a Recovery Group for the source HMC and choose the LPARs this tier should recover.
- **Technical effect:** The selected recovery_group.vms list controls the LPAR recovery tasks. The backend embeds the group's run ID and FlashSystem connection so the DAG can find its snapshot candidates.
- **Dependencies / Limitations:** The group's configured snapshot target determines the FlashSystem, including the auxiliary array for Metro Mirror. Select workloads from the intended source HMC and ensure their snapshots are available.

**`workloads.generic`**
- **Title:** Recovery Groups and selected workloads
- **Intro:** Each tier references a Recovery Group and an explicit selection of its workloads.
- **Technical effect:** The group ID resolves recovery context; recovery_group.vms determines which workloads enter the recovery DAG.
- **Dependencies / Limitations:** The group's storage and snapshot configuration must already support those workloads. Platform-specific details require a known application platform.

Phase 1 F2 porovnáva compute source Recovery Group (vCenter/HMC, `provider_id_vm`) s application source bez ohľadu na local/metro_mirror. **F3 nie je plošný zákaz duplicitných VM/LPAR:** VMware v1 a Power v1/default null sa neblokujú; iba explicitné Power v2 blokuje presné duplicity LPAR v rámci aj naprieč tiermi. H3 nič nevaliduje a nesmie sľubovať univerzálny BE zákaz; F2/F3 vlastní Phase 1.

### H4 – Tier execution

**`tierOrder.vmware.v1`**
- **Title:** VMware tier execution order
- **Intro:** The DAG processes tiers in ascending order of their order value.
- **Technical effect:** Each tier waits for the previous tier. Within a tier, VM recovery chains have no dependency on one another and can run concurrently, subject to Airflow capacity.
- **Dependencies / Limitations:** Reordering tiers changes recovery dependencies after the configuration is pushed. Parallel branches do not guarantee simultaneous starts or application readiness.

**`tierOrder.ibmPower.v1`**
- **Title:** Power v1 execution order
- **Intro:** Tiers are sorted by order, then their selected LPARs are linked in sequence.
- **Technical effect:** The last LPAR group of one tier precedes the first LPAR group of the next. Power v1 uses a single chain across tiers rather than outer tier Task Groups.
- **Dependencies / Limitations:** LPAR recovery is sequential within and between tiers. Reordering has an effect on the deployed DAG only after Push.

**`tierOrder.ibmPower.v2`**
- **Title:** Power v2 execution order
- **Intro:** Power v2 groups recovery by tier and by LPAR while retaining sequential execution.
- **Technical effect:** LPAR Task Groups run in sequence inside each tier, followed by a tier completion task. Non-empty tier groups are then linked in ascending order.
- **Dependencies / Limitations:** Empty tiers create no group. This layout does not enable parallel LPAR recovery; Airflow task success is not proof of workload readiness.

**`tierOrder.generic`**
- **Title:** Tier recovery order
- **Intro:** The order value determines how tiers are sorted for DAG generation.
- **Technical effect:** The selected platform and resolved template define the dependencies within and between tiers.
- **Dependencies / Limitations:** An exact execution description requires a known template version. Saving a reordered configuration alone does not deploy a new DAG.

### H5 – Policy Set

**`policySet.vmware`**
- **Title:** VMware application recovery policy
- **Intro:** The Policy Set selects the Recovery Application policy used when generating the VMware DAG.
- **Technical effect:** Push embeds the recovery schedule and snapshot selection rules. An optional Clean Room policy controls cleanup of conflicting target resources during the run.
- **Dependencies / Limitations:** This form requires a Policy Set for saving; Push also requires it to resolve a Recovery Application policy. Policy edits do not update a deployed DAG automatically. Roll back a deployed application before changing and pushing its configuration.

**`policySet.ibmPower`**
- **Title:** Power application recovery policy
- **Intro:** The Policy Set selects the policy used to generate the Power recovery DAG.
- **Technical effect:** Push embeds snapshot selection, scheduling and Power recovery options. The backend also stores the policy's target LPAR prefix for consistent target naming and rollback.
- **Dependencies / Limitations:** This form requires a Policy Set. Push needs a resolvable Recovery Application policy; manual zoning or manual WWPN entry makes the DAG manual-trigger only. Saved policy changes do not update Airflow automatically; deployed application changes require successful rollback and Push.

**`policySet.generic`**
- **Title:** Application recovery policy
- **Intro:** The Policy Set links this application to the policy used for DAG generation.
- **Technical effect:** Push resolves its Recovery Application policy and embeds schedule and snapshot selection values into the DAG.
- **Dependencies / Limitations:** This form requires a Policy Set; Push requires a resolvable application policy. Saving alone does not update a deployed DAG, and platform-specific options require a known platform.

### H6 – Notification Email, shared

**`email`**
- **Title:** Application DAG notifications
- **Intro:** Optional recipient for this Recovery Application DAG's success and failure notification tasks.
- **Technical effect:** A non-empty application email adds Airflow email tasks using terminal-task success and failure trigger rules. Null or empty creates no application email tasks.
- **Dependencies / Limitations:** There is no fallback to the Recovery Group or storage-provider email. Delivery needs working Airflow email configuration. A notification is not proof that every workload recovered successfully; inspect run and task logs. Saving alone sends no notification and deploys no DAG.

### H7 – DAG Template Version

**`template.vmware`**
- **Title:** VMware DAG template version
- **Intro:** Choose the backend template used to generate this application's DAG. VMware currently provides v1 as its default.
- **Technical effect:** The default option sends dag_template_version=null and follows the backend default at Push. An explicit stored version selects that registered template.
- **Dependencies / Limitations:** This selector displays the default only once and maps that choice to null. A deployed application is read-only; successful rollback is required before changing its template and pushing again.

**`template.ibmPower`**
- **Title:** Power DAG template version
- **Intro:** Power currently defaults to v1; v2 is an explicit alternative with tier and LPAR Task Groups.
- **Technical effect:** Null follows the backend default at Push; an explicit version selects that registered layout. Both v1 and v2 run LPAR recovery sequentially. V2 adds tier completion tasks and explicit dependency wiring, with duplicate-name and group-ID collision checks.
- **Dependencies / Limitations:** This selector maps the displayed default to null. V2 is not automatically preferable for every scenario. A deployed application must be successfully rolled back before changing its version and pushing again.

**`template.generic`**
- **Title:** Recovery DAG template version
- **Intro:** This setting selects the template used to generate the recovery DAG.
- **Technical effect:** Null means the backend default, not an invalid version. An explicit value selects a registered template for the application platform.
- **Dependencies / Limitations:** Available versions and their default come from the backend catalog. Exact layout differences require a known platform. Deployed application changes require successful rollback.

Explicit v1 môže prísť z uloženého recordu/API, ale aktuálny Select zobrazuje default raz a jeho zvolenie odosiela null. Nepridávať druhú v1 položku len preto, aby UI ponúkalo explicitné pripnutie defaultu. Pri budúcej zmene registry skontrolovať obsah H7; selector zostáva catalog-driven.

### H8 – Push to Orchestrator, shared

**`push`**
- **Title:** Save and deploy to Airflow
- **Intro:** Save-only stores the application configuration. Push additionally generates and uploads its DAG and configuration to the selected Airflow instance.
- **Technical effect:** Push resolves the platform template and policy values and marks the application as deployed. Newly created DAGs are paused; uploading does not trigger a recovery run or prove recovery succeeded.
- **Dependencies / Limitations:** Deployed applications remain read-only until rollback succeeds and the refreshed state confirms they can be edited. Rollback attempts to remove the deployed DAG and recovered resources; partial or failed cleanup can leave resources behind and the application locked. A failed Push can leave a local record or remote artifacts; inspect the result and refreshed state before retrying.

### H9 – Airflow Provider, shared

**`airflow`**
- **Title:** Airflow deployment provider
- **Intro:** Choose the Airflow instance that will receive this application's DAG and configuration during Push.
- **Technical effect:** The backend uses that provider's deployment connection and DAG directory and records its ID in orchestration.provider_id.
- **Dependencies / Limitations:** Push requires a selected Airflow provider in this form. Save-only does not require a selection. Compute and storage connections used by the DAG must be available on that Airflow instance; choosing it does not select a vCenter, HMC or FlashSystem.

## 8. Lokalizačná architektúra EN/SK/CS

Zachovať existujúci flat JSON model. Každý z 22 prefixov má 7 povinných leaf kľúčov: `.trigger`, `.title`, `.intro`, `.effect.title`, `.effect.text`, `.limitations.title`, `.limitations.text`. Spolu **154 nových kľúčov na jazyk**, bez prípadného nového H3 viditeľného heading labelu (ten patrí pod existujúci page namespace, nie medzi 22 obsahových variantov). Nepoužiť dynamic string interpolation na celé technické odseky. Shared `help.close` sa neduplikuje.

Preklady musia zachovať null/default/Push/Rollback význam aj negatívne tvrdenia. Zachovať UI terminológiu a produktové mená; žiadne tvrdenie o recovery účinku sa nesmie stratiť pri preklade. Odporúčané ekvivalenty:

| EN | SK | CS |
|---|---|---|
| Source / target compute provider | Zdrojový / cieľový compute provider | Zdrojový / cílový compute provider |
| Recovery Group | Recovery Group (skupina obnovy) | Recovery Group (skupina obnovy) |
| Workload selection | Výber workloadov | Výběr workloadů |
| Tier execution order | Poradie vykonávania tierov | Pořadí provádění tierů |
| Snapshot selection rules | Pravidlá výberu snapshotov | Pravidla výběru snapshotů |
| Backend default | Predvolená verzia backendu | Výchozí verze backendu |
| Explicit version | Explicitne zvolená verzia | Explicitně zvolená verze |
| Save-only | Iba uložiť | Pouze uložit |
| Push to Orchestrator | Nasadiť do orchestrátora (Push) | Nasadit do orchestrátoru (Push) |
| Rollback | Vrátenie nasadenia (Rollback) | Vrácení nasazení (Rollback) |
| Read-only | Iba na čítanie | Jen pro čtení |
| Technical effect | Technický účinok | Technický účinek |
| Dependencies and limitations | Závislosti a obmedzenia | Závislosti a omezení |

Airflow Connection ID, DAG, HMC, LPAR, Task Group, FlashSystem, vCenter a Clean Room ponechať ako technické názvy. Rollback opísať ako pokus o odstránenie DAG a recovered resources, bez záruky úplného cleanupu; partial/failed môže ponechať resources aj read-only lock. Neopisovať ho ako neškodné vrátenie textovej zmeny.

## 9. UX, accessibility a read-only návrh

1. `Field` v `src/shared/components/form/FormControls.tsx:46–51` dnes obaľuje children labelom a label je string. Nevkladať interaktívnu help ikonu do tohto labelu a nerozširovať shared API. Iba dotknuté polia prepísať na existujúci Recovery Groups lokálny `<div>` + flex label/sibling help + pôvodné ovládanie. Zachovať ID, required, aria-describedby, errors a handler props.
2. Zachovať outer disabled fieldset počas initial loading/saving. Read-only po načítaní musí umožniť help aj wizard navigation. Nahradiť široký inner readOnly disabled obal úzkymi fieldsetmi **iba okolo mutujúcich controls**, mimo help headingov. AppMetadataForm dostane readOnly prop a obalí ovládania bez label/help riadkov; provider locks zostanú navyše. Tier sidebar/canvas ostanú v lokálnom disabled readOnly fieldsete, H3/H4 sú pred ním. Policy picker ostane v disabled obale, H5 mimo. Template Select už má disabled prop; Push Toggle a Airflow Select výslovne dostanú readOnly disabled. Nemení sa žiadny `isFormDisabled` callback guard, save guard ani drop capture guard. **Pred zúžením širokého fieldsetu najprv pridať read-only negatívne testy všetkých mutujúcich ovládaní**; prijatie úpravy vyžaduje nezmenený draft, nulové dirty/save callbacky a nulové write requesty. Testovať aj delayed lifecycle lock.
3. Nerobiť úpravu TierCard/TierCanvas len kvôli ikonám: žiadne ikony vo vnútri ich read-only fieldsetu nepotrebujeme. Tým sa zníži počet props a konfliktov s Phase 1.
4. H9 label/help renderovať raz pred error/empty/normal vetvami Push provider časti. Ovládanie zachová required aj conditional mount. Pri chýbajúcom Selecte label nemá neexistujúci htmlFor: použiť textový heading v error/empty vetve, rovnakú jednu help ikonu.
5. Zachovať compact default width, žiadne `wide` pre krátke helpery. Flex riadky: `min-w-0`, gap podľa Recovery Groups, shrink-0 help, text môže zalomiť. Overiť 360 px viewport a dlhšie SK/CS texty, vnútorný scroll panelu, žiadny horizontálny overflow.
6. Trigger názov obsahuje konkrétny technický kontext. Zachovať interný button type=button a jedinečné ARIA väzby. Focus, click, hover, Escape, Tab/Shift+Tab a portál v DetailView modale sa testujú cez existujúci HelpPopover, bez nových event handlerov alebo z-index pravidiel.
7. Ikony nikdy nevolajú onMetadataChange/onDirtyChange/save/toggle/select a nepridávajú payload fields. Žiadne live Push/Rollback kvôli QA. Read-only po DOM zmene musí **pozitívne** umožniť help keyboard/mouse + navigáciu a **negatívne** blokovať File Name, Name, Description, Environment, Email, source/target, Recovery Group a VM/LPAR výber, tier add/edit/reorder/DnD, Policy Set, DAG template, Push Toggle, Airflow Provider a Save. Nula zmien draftu, metadata/dirty/save callbackov aj submit/rollback write requestov; neoslabovať existujúce assertions.

## 10. DetailView integrácia a zdieľanie

`RecoveryApplicationsTable.tsx` využije existujúce `DetailField.labelHelp`:

- Overview Source/platform hodnota → H1; Target → H2; Policy Set → H5; Notification Email → H6; Tiers count → H3.
- Orchestration provider → H9; pushed status → H8; configured/deployed template version → H7. Zachovať rozlíšenie configured version / deployed version / unknown version; pomoc nesmie premeniť missing deployed metadata na aktuálny default.
- H4 nepridávať k obyčajnému počtu tierov: neexistuje tam order hodnota a H3 je už pri count. Žiadny nový detail tab, tier editor, input pre run_id/pushed/template_version/target_lpar_prefix/storage.
- Všeobecná header pomoc zostane navigačným prehľadom. Nekopírovať do nej nové technické odseky. Každý technický kontext má v detaile jeden trigger; rovnaké locale prefixy a sections ako wizard.
- Ak sa neskôr rozšíri detail o skutočné poradie tierov, H4 je pripravený na reuse, ale takáto zmena nie je súčasťou Phase 2.

## 11. Väzba na Phase 1

Autoritatívny Phase 1 PLAN a TODO obsahujú **12 taskov**. F1 email normalizácia/patch = Tasks 1–2, F1 UI = **Task 9**, funkčné locale = **Task 8**. F2 source-scoped Recovery Groups = Tasks 3/5/6/7/9; F3 = **Power-v2-only** presné duplicity LPAR v Tasks 4/5/7/9; F4 spoločná validácia a readiness = Tasks 5/7. Odstránený fresh-reference preflight sa **nesmie obnoviť**: Save nevynucuje ďalší GET. Detailný zdroj: [Phase 1 PLAN](recovery-applications-functional-phase1-plan.md) a [Phase 1 TODO](recovery-applications-functional-phase1-todo.md).

V aktuálnom FE worktree už existujú rozpracované Phase 1 zmeny vrátane Notification Email inputu, source-scoped eligibility a Power-v2-only validátora. Tieto zmeny zatiaľ nemajú potvrdené dokončenie/finálne testy; prítomnosť kódu nie je dôkaz hotovosti. Pred integráciou Phase 2 znovu preveriť aktuálny diff a výsledky Phase 1, neprepísať prácu iného agenta.

| Phase 1 požiadavka | Stav / overený kontrakt | Phase 2 závislosť |
|---|---|---|
| F1 Notification Email | Input a validácia sú rozpracované vo FE | H6 vo wizardi až po integrovaní a otestovaní Phase 1 **Tasks 1/2/9**; Phase 2 nemení input, mapper ani normalizáciu. |
| F2 Source provider compatibility | Compute source vCenter/HMC z `provider_id_vm`; platí pre local aj metro_mirror | H1/H3 využijú správny význam source; QA pokrýva local, metro_mirror managed/existing, aj nezhodný source. |
| F3 Duplicate workloads | **Iba Power v2** blokuje presné duplicity LPAR v tieri/medzi tiermi; VMware v1 a Power v1/null bez nového zákazu | H3/H7 nesmú tvrdiť globálny zákaz, Phase 2 nepridáva duplicate validator. |
| F4 Create/Edit/Save/Push parity | Spoločná validácia/readiness sú predmetom rozpracovanej Phase 1 | Help nesmie meniť `canSave`, Save/Push, query cache ani lifecycle; po zmene read-only DOM sú povinné regresie. |

Mapping/preklady/H7 možno pripraviť nezávisle. `AppMetadataForm` a `RecoveryAppBuilder` majú počas fáz jedného vlastníka. Ak príslušné Phase 1 testy nie sú dokončené, H6/integration/QA označiť ako blokované; F1–F4 nedoimplementovať v Phase 2.

## 12. Súbory plánovaných implementačných zmien

**Produkčné FE:**

- Nový `helpers/recoveryApplicationFieldHelp.ts` (iba mapping kľúčov).
- `components/AppMetadataForm.tsx` (H1/H2/H6 a readOnly disabled scope).
- `components/RecoveryAppBuilder.tsx` (platform props, H3/H4/H5/H8/H9 a narrow disabled obaly).
- `components/DagTemplateVersionSelect.tsx` (H7 pri labeli).
- `components/RecoveryApplicationsTable.tsx` (labelHelp reuse).
- `src/locales/en.json`, `src/locales/sk.json`, `src/locales/cs.json`.

**Testy/QA:** nový mapping test, `src/locales/recoveryApplicationFieldHelpTranslations.test.ts`; existujúce AppMetadataForm, DagTemplateVersionSelect, RecoveryAppBuilder, RecoveryApplicationsTable tests; nový `components/RecoveryApplicationFieldHelp.integration.test.tsx`; nový izolovaný `scripts/qa/verify-recovery-application-field-help.mjs`. Úplné príkazy a vlastníctvo v TODO.

**Read-only referencie:** TierCard, TierCanvas, recoveryApplicationTypes, recoveryApplicationFormMapper, existujúce lifecycle/wire tests, shared HelpPopover/KeyedHelpPopover a Recovery Groups. BE, OpenAPI, Orval/generated, shared HelpPopover framework, business submit/rollback, Phase 1 docs sa nemenia.

## 13. Testovacia stratégia

Nasledujúce sú plánované testy, **neboli spustené** pri tvorbe dokumentov. Testy sa zamerajú na user behavior, nie na snapshot každej JSX vetvy. Použiť existujúci Vitest + Testing Library a reálny help komponent; integration test mockuje API/externé služby, nie celý builder.

| Vrstva | Scenáre | Konkrétny dôkaz |
|---|---|---|
| Mapping unit | VMWARE/IBM_POWER/case, unknown/null; explicit v1/v2, null verified default, failed/stale/multiple-default catalog | Správny prefix, žiadny VMware fallback pre unknown; H4 bez neovereného serial/concurrent tvrdenia. |
| Locales | Všetkých 22 prefixov × 7 leaf keys × EN/SK/CS | Explicitná očakávaná sada, neprázdnosť, rovnaké placeholders, bez missing-key fallbacku. Len parity voči EN nestačí, lebo všetky tri môžu vynechať helper. |
| Details component | H1/H2 labels, switch source VMware→Power→unknown; F1 H6 edit/blank; provider fetching/error | Správna copy; label click stále fokusuje pôvodný input; help click nemení provider/email/dirty. |
| Tiers component | H3/H4 bez skupiny, assigned group, subset VM/LPAR, reorder; Power null/v1/v2 | Presne 2 odlišné heading helpers; zmena order/selection nezmení copy na nesprávnu platformu; legacy tier.vms nie je prezentovaný ako autoritatívny. |
| Policy component | Obe platformy, loading/error/empty, readonly | H5 dostupný nezávisle od picker dát; žiadny automatický Airflow refresh v copy. |
| Template component | Default iba raz, null wire, explicit v2, unknown v9, query error | Pomoc dostupná aj pri disabled Select; selection handlers a option count sa nezmenili. |
| Orchestration component | Push on/off; Airflow loading/error/empty/normal; toggle lock | H8 stále dostupný, H9 raz iba v Push kontexte; help nikdy neprepína toggle ani neodosiela formulár. |
| Read-only | Pushed VMware/Power, missing provider a delayed lock; všetky 4 kroky | Help je keyboard/mouse dostupná, wizard navigovateľný; metadata/email/provider, RG/VM/LPAR, tier DnD, policy, template, toggle, Airflow aj Save sú bez draft/dirty/save a write mutation. |
| Detail modal | Obe platformy, missing provider, deployed v1/v2/unknown; switching selected record | Osem relevantných kontextov H1/H2/H3/H5/H6/H7/H8/H9; rovnaké kľúče, žiadne stale texty/duplicity, bez H4 pri count. |
| Keyboard/shared | Focus open, Tab do portálu, Shift+Tab späť, Escape, close, click outside | Žiadny parent modal close pri Escape panelu; focus sa vráti; žiadne zmeny shared frameworku. |
| Integration | Create VMware/Power → všetky kroky; Edit obe; mocked pushed readonly; detail | Skutočný builder + mapper/submit facade: identické dáta a request count pred/po interakcii s help; Power same-HMC povolený podľa existujúcich pravidiel. |
| Lifecycle regression | Mock 409, 502 saved locally, network uncertainty, partial rollback, fresh GET | Existujúce locks/reload fungujú; helper ich neodomkne. Bez živých recovery operácií. |

### Browser QA / Playwright scenáre

Repo nemá Playwright package script/dependency, ale **má existujúci standalone Playwright-core vzor** `scripts/qa/verify-recovery-applications-dag-lifecycle.mjs`. Používa externý `PLAYWRIGHT_MODULE` alebo cache path, Edge, lokálny APP_URL, mocked API a fail-closed neznáme routy. Cache runtime pri audite existuje; nie je garantovaný na inom stroji. Nový focused skript má prevziať tento spôsob, nie inštalovať framework ani meniť dependency lockfile. Existujúci lifecycle QA používa aj alternatívny Power v2 default fixture zámerne; nemeníme ho na základe dnešného BE defaultu.

1. Spustiť lokálny Vite a pre každý jazyk EN/SK/CS vykonať VMware Create, Power Create, uložený Edit oboch typov, mocked pushed read-only a DetailView modal. Fixtures provider/group/policy/catalog/application sú konzistentné; source/target HMC rovnaké v jednom Power scenári.
2. Každý H1–H9 otvoriť hoverom, klikom a klávesovým focusom. Pri hover→panel presune zostane otvorený; touch click funguje bez hover predpokladu. Overiť title/sections a accessible name v aktuálnom jazyku.
3. Tab/Shift+Tab cez trigger, portál, close a ďalšie ovládanie. Escape zatvorí len panel; DetailView ostane otvorený. Close vráti focus bez okamžitého znovuotvorenia. Click outside zatvorí panel bez resetu formulára.
4. Otvoriť pomoc v scrollovateľnom Details/Orchestration a v Tiers canvas kontexte. Scroll wizardu/DetailView a resize nesmie panel odtrhnúť od triggera alebo orezať; vnútorný scroll panela sa nesmie resetovať.
5. Viewports 1440×1000, 768×1024, 360×800; žiadny horizontal page overflow, title/help/control nekolidujú, dlhá SK/CS copy je čitateľná a panel dosiahnuteľný.
6. Create source switch, pomalý/error provider fetch a saved Power s missing providerom: generic alebo uložená platforma podľa pravidiel, nikdy predchádzajúci VMware obsah. Null+catalog resolving → H4 generic; po verified default zodpovedajúca verzia; explicit v2 → Power v2 text.
7. Pushed read-only VMware/Power (aj missing provider/delayed lock): prejsť všetky kroky a klávesnicou otvoriť helpery. Pokusy o metadata/email/provider, group/VM/LPAR, tier reorder/DnD, policy, DAG selector, toggle, Airflow Select a Save nesmú zmeniť draft, dirty/save callbacky ani vyvolať write request. DetailView rozlišuje configured/default od deployed/unknown.
8. Zachytiť baseline a payload po help interakciách: rovnaký submit body/params a presne jeden request pri následnom autorizovanom mocked Save. Samotná pomoc vytvorí nula submit/rollback requestov. Mockovať všetky Push/Rollback odpovede, žiadny živý deploy.
9. Zaznamenať console/page errors a screenshoty len do QA cache; výsledky uviesť pri tasku v TODO. Nenazývať UI test úspešnou reálnou obnovou.

Focused príkazy sú pri každom tasku v TODO. `npm run build` obsahuje lint/typecheck/**celú suite**/api:check; nespúšťať ho automaticky pre help-only zmenu. Lint len explicitne zmenené TS/TSX; **`npm run typecheck` povinne vykonať pri finálnom Phase 2 review** (props a disabled scope sa menia). Celá suite/build len na výslovné zadanie alebo preukázaný cross-cutting dôvod.

## 14. Poradie a bezpečné vlastníctvo

Dependency graph: `1 → 2 → 3 → 4 → 5 → 6`; `1+2 → 8`; `3+F1 → 7`; `4+6 → 9 → 10`; `1+2 → 11`; `3..11 → 12 → 13 → 14 → 15`. Čísla sú stabilné task IDs, nejde o povinné sériové vykonanie všetkých nezávislých taskov.

Odporúčané checkpointy: 1–2 mapping/content; 3–5 readonly/Details/Tiers; 6–8 policy/email/template; 9–11 orchestration/detail; 12–13 automated coverage; 14–15 browser/final. Pri checkpointoch overiť focused rozsah, nie celú suite automaticky.

Po schválení možno paralelne robiť Task 8 (DagTemplateVersionSelect) a Task 11 (table), keď sú mapping/locales hotové; Task 7 vlastní AppMetadataForm a musí byť po Task 3 a F1. **Tasky 4/5/6/9/10 menia ten istý builder/test a musia byť serializované u jedného vlastníka.** Locales má jediný vlastník Task 2. Mapping test Task 1 a locale test Task 2 sa potom nemenia súbežne bez dohody. Integration/browser až po ustálení komponentov. V tejto planning práci nebola spustená paralelná implementácia.

## 15. Riziká, regresie a otvorené body review

| Riziko | Dopad | Mitigácia |
|---|---|---|
| Broad disabled fieldset zablokuje help alebo jeho odstránenie odomkne inputs | Vysoký | Negatívne mutačné regresie každého kroku a delayed lock pred zúžením DOM, potom pozitívne keyboard testy help; existujúce mutation guards nedotknuté. |
| Phase 1 rozpracovaná / súbežné zmeny | Vysoký | Pred integráciou overiť Phase 1 výsledky (F1 Task 9 a iba Power v2 F3); jediné vlastníctvo metadata/builder, neimplementovať F1–F4 tu. |
| Power v1 mylne označená ako parallel, v2 ako „bezpečnejšia“ | Vysoký | Copy odvodzovať zo skutočných graph edges B5/B9; obe Power serial. |
| Partial Push vnímaný ako transakčný rollback | Vysoký | Žiadna garancia remote cleanup; existujúci report/fresh-state flow, bez nových lifecycle handlerov. |
| Email chápaný ako dôkaz health/recovery | Stredný | Opísať task trigger rules, no fallback, logy; nevytvárať nové notifikácie. |
| Registry default sa pri ďalšom release zmení | Stredný | Selector/H4 catalog-driven, H7 review pri registry change; žiadny hardcoded UI default. |
| Missing provider/stale catalog zamení platformu | Stredný | Saved platform authoritative, unknown generic; dynamic helpKey remount. |
| HMC zamenený za managed system alebo FlashSystem | Vysoký | B14 a explicitné oddelenie provider rolí v H2/H3/H9. |
| Locale parity prejde aj s chýbajúcimi variantmi | Stredný | Explicitná očakávaná sada 22 prefixov a 7 parts, neblank a placeholders. |
| Popover clipping/focus trap v modale | Stredný | Existing portál/keyboard mechanismy bez zmeny, reálny browser QA v detaile aj scroll wizardi. |

Ďalšie overenie vyžaduje runtime dostupnosť Airflow compute/storage Connections, SMTP/doručovanie, scheduler capacity a reálny recovery výsledok; to nie je dokázané statickým čítaním a nie je to podmienka mocked helper QA. Kopírované texty preto nič z toho negarantujú. Nie je potvrdené všeobecné uplatnenie retention/boot_verify/enabled polí RecoveryAppPolicy v týchto DAGoch: nezahrnúť ich ako účinky H5. V2 collision guard a same-system prefix sú potvrdené v zdroji, ale nenahrádzajú integráciu F2/F3 ani úspešný reálny recovery test.

Review má potvrdiť presné umiestnenie H3/H4, dostatočnosť zúžených disabled obalov, wording email trigger rules a plán F1 integrácie. Neisté runtime vlastnosti nie sú prezentované ako fakty v helperoch.

## 16. Definition of Done

- [ ] Architektonické/content review schválilo tento PLAN a TODO; implementácia nebola spustená pred review.
- [x] H1–H9 sú na dohodnutých miestach, s 3 shared/6 platform-specific rodinami a bezpečným unknown contextom.
- [x] F1 input je dostupný pred H6 wizard integráciou; Phase 1 F2/F3/F4 neboli duplikované ani oslabené.
- [x] EN/SK/CS majú kompletných 22 variantov a 154 field-help kľúčov na jazyk, technický význam zostal rovnaký.
- [x] Používajú sa existujúce KeyedHelpPopover/HelpPopover a DetailField.labelHelp, bez framework zmien a inputov pre BE-generated hodnoty.
- [x] Read-only umožňuje help/navigation; mutujúce metadata/email/provider, group/VM/LPAR, tier/DnD, policy, template, toggle, Airflow aj Save sú blokované: nula draft/dirty/save/write mutation zmien. Provider locks a delayed lifecycle guards prešli regresiami.
- [x] Default v1 sa nezobrazuje duplicitne, null je BE default, Power v2 copy nesľubuje parallel recovery ani univerzálne zlepšenie.
- [x] Helper interakcie nemenia request payload, validáciu, Save/Push/Rollback ani query/cache správanie.
- [x] Component/integration/browser matica má zaznamenaný skutočný výsledok; žiadna živá backend Push/Rollback operácia nebola potrebná.
- [x] Relevantné focused testy, focused lint, **`npm run typecheck`** a diff validácia prešli; rozsah nespustenej celej suite/build je výslovne uvedený.
- [x] Žiadne zmeny BE/OpenAPI/generated/Recovery Groups/Phase 1/shared popover frameworku a žiadne prepisovanie cudzej práce.

Táto Definition of Done opisuje budúcu implementáciu. Aktuálne výsledky implementácie a overenia sú zaznamenané v TODO; pôvodné planning tvrdenia o nevykonaných testoch sa vzťahujú na čas vzniku návrhu.

Implementačné overenie: 15/15 taskov a 24/24 mockovaných browser scenárov sú zaznamenané v TODO; focused testy, lint a typecheck prešli. Ľudské review finálneho diffu ostáva otvorené.
