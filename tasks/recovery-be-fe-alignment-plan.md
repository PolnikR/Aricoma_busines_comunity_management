# Plán zosúladenia Recovery BE/FE

Dátum: 2026-10-30. Stav: návrh na schválenie; implementácia sa nezačala.
Úlohy: [recovery-be-fe-alignment-todo.md](recovery-be-fe-alignment-todo.md).

## Rozsah a východiská

Analyzované sú aktuálne súbory FE `Aricoma_busines_comunity_management` na HEAD
`8066d1d5` a BE `../abco-be` na HEAD `b0b4ab3`, nie iba staršie plány.
BE pracovný strom je čistý. FE má vstupné necommitnuté zmeny
`openapi/abco-api.json` a
`src/generated/query/zod/getRecoveryGroupInventoryParams.gen.ts`.
Tieto zmeny patria používateľovi; tento plán ich neprepisuje ani nepreberá do commitu.
Pri záverečnej kontrole už oba súbory zodpovedali HEAD `8066d1d5` (tento commit
obsahuje práve doplnenie force parametra); aktuálny rozdiel aplikácie bol prázdny.
Počas analýzy sme tieto súbory neupravovali.
V aktuálnom pracovnom strome je `force_refresh` už dostupný cez generated typ.

Výstupom tejto práce sú iba dva dokumenty. Žiadne zmeny aplikácie, BE, generovanie
Orval, testy aplikácie ani build. Existujúce `tasks/plan.md`, `tasks/todo.md`
a historické plány zostávajú zachované. Pred implementáciou znovu overiť HEAD,
pracovné stromy a príslušné AGENTS.md; tento dokument opisuje lokálny checkout,
nie overenú verziu nasadeného servera ani jeho runtime konfiguráciu.

## 1. Overený stav: Inventory

| Zdroj | Potvrdené správanie |
| --- | --- |
| BE `api/routers/recovery_groups.py`, `get_recovery_group_inventory` (180+) | Prijíma `run_id` a `force_refresh=False`; výsledok `resolve_snapshot_target` odovzdáva do `get_volume_relations(snapshot_provider_id, snapshot_volume_names, force_refresh)`. Odpoveď obsahuje `snapshot_provider_id` aj `provider_id_volume`. |
| BE `ibm_flashsystem/topology.py`, `get_volume_relations` | Používa rovnaký raw discovery cache ako volumes/tree; force flag odovzdáva `get_or_refresh`. |
| BE `discovery_cache/service.py`, `get_or_refresh` (21+) | Force obíde TTL, ale pri chybe fetchera vráti existujúce `entry.data`. Endpoint tak môže úspešne vrátiť staré dáta. Bez cache chyba pokračuje vyššie. |
| BE `api/routers/recovery_groups.py`, `_metro_mirror_status` | Samostatné best-effort čítanie; jeho chyba je v sekcii `metro_mirror.error`, nemusí znamenať HTTP chybu celej odpovede. |
| FE `recovery-groups/components/RecoveryGroupInventory.tsx`, `RecoveryGroupInventory` (35+) | Generated query s `{run_id}`, enabled podľa `active` a run. Refresh aj retry dnes používajú obyčajné `query.refetch()`. Pri background chybe zostávajú dáta. |
| FE `recovery-groups/components/RecoveryGroupInventorySummary.tsx` (14+) | Rovnaký generated hook a `{run_id}`; summary je enabled už pri existujúcom run. |
| FE `src/generated/query/recovery-groups/recovery-groups.gen.ts` (263–362) | Fetcher serializuje parametre; query key je `['/get_recovery_group_inventory', params]`. Parameter `force_refresh` vložený do hook params by vytvoril druhý cache záznam. |
| FE `recovery-groups/hooks/useRecoveryGroups.ts`, `invalidateInventory` | Existujúce operácie invalidujú inventory podľa run; nový refresh nesmie znovu vytvoriť odstránený záznam po rollback/delete. |
| FE `discovery-inventory/resources/model/inventoryQueries.ts` | `flashSystemInventoryQuery` používa generated volumes key s `provider_id`; cache obsahuje wire response a UI mapovanie je v `select`. Existuje aj vzor samostatného live fetchera pre VMware. |
| FE `discovery-inventory/infrastructure/hooks/useFlashSystemVolumeTree.ts` | Tree key má `provider_id` a `view`; invalidácia jednej konkrétnej view nestačí na všetky varianty. |

FE cesty bez `src/features/` v tabuľkách sú relatívne k tomuto adresáru.

### Potvrdený rozdiel a návrh

Explicitný Refresh dnes nenúti BE načítať storage. Zachovať generated obyčajný
query pre oboch pozorovateľov a doplniť malý feature hook
`useRefreshRecoveryGroupInventory` pre jednorazový live pokus. Ten použije generated
`getRecoveryGroupInventory({run_id: capturedRunId, force_refresh: true}, {signal})`.
Nezmeniť trvalý `queryFn` na forced a nevytvárať forced query key. Bežný load,
focus/reconnect refetch a automatické retry query naďalej posielajú iba `run_id`.
Forced operácia nemá automatické retry; ďalší live pokus je ďalší explicitný Refresh.
Tlačidlo Retry po HTTP chybe ostáva obyčajným načítaním.

Bezpečnostné invarianty implementácie:

1. Pred requestom zachytiť run, generated canonical key, identitu existujúcej query
   a token operácie. Pending zámok nastaviť synchronne pred prvým `await`.
   Zdieľať operáciu pre rovnaký QueryClient/run aj pri dvoch mounted ovládačoch;
   malá koordinácia zostane v tomto feature hooku, bez globálneho query frameworku.
2. Tlačidlo zakázať pri bežnom `query.isFetching` aj forced pending. Obyčajné query
   rozbehnuté pred force zrušiť cez `cancelQueries({queryKey, exact:true})`.
   Pri dokončení znovu zrušiť obyčajný request, ktorý mohol začať medzičasom
   (napr. focus alebo summary mount), až potom uložiť výsledok.
3. Po každom `await` overiť aktuálnosť tokenu a identitu query. Pri zmene run,
   unmount, rollback/delete alebo zrušení abortovať a ignorovať neskorý výsledok
   aj chybu. Samotný AbortController nestačí, fetch/mock môže odpoveď ešte doručiť.
   A→B→A nesmie prijať starý token A. Pred finálnym zápisom query musí stále
   existovať ako tá istá query; neobnovovať odstránenú cache pomocou `setQueryData`.
4. Uložiť celý validovaný wire response pod captured canonical key, nie `select`
   výstup a nie key odvodený od aktuálneho props run. Overiť zhodu response run.
   Obaja pozorovatelia tak dostanú rovnaký výsledok a zachovajú vlastný `select`.
   Po úspechu neinvalidovať tú istú inventory query okamžite ďalším GET.
5. HTTP/network/response-contract chyba nemení uložené dáta ani rozbalenie volumeov.
   Forced chyba je lokálna a viazaná na run/token; nenahrádza `query.error` celého
   cache záznamu. Zrušenie sa používateľovi nezobrazuje ako chyba.
6. Pri HTTP 200 zobraziť odpoveď bez tvrdenia „storage úspešne obnovený“.
   Pomocný text vysvetlí pokus o storage refresh aj možný návrat cache.
   Čerstvosť ani úspech live fetchu FE z dnešného kontraktu nevie potvrdiť.

Toto riešenie zachová bežný TanStack Query lifecycle a izoluje iba imperatívny
refresh. Alternatíva s dočasným prepisom canonical `queryFn` je riziková: forced
voľba môže uniknúť do neskoršieho refetchu alebo zdieľaného observera. Nepoužiť ju.

### Voliteľné opatrenia

- Cooldown: odporúčanie zatiaľ vynechať. Pending zámok je povinný; cooldown je
  UX voľba, nie ochrana proti požiadavkám z iných klientov. Ak sa schváli 5 s,
  počítať od dokončenia pokusu, viazať na run a testovať s fake timers.
- Volumes/tree: odporúčanie schváliť úzko cielené označenie stale po HTTP 200,
  bez ďalšieho forced fetchu. Použiť `response.snapshot_provider_id`; pri Metro
  Mirror to nemusí byť `provider_id_volume`. Pri chýbajúcom snapshot providerovi
  invalidáciu preskočiť, nehádať master provider. Predicate pre `/get_volumes`
  a `/get_volume_tree` má zachytiť rovnaké `provider_id` a všetky `view`/parametrické
  varianty. Agregované queries bez providera a vdisks-by-VM sú zatiaľ mimo rozsahu.
  `refetchType:'none'` zabráni okamžitému fan-out requestov; dáta sa načítajú pri
  nasledujúcom bežnom použití. Je to cache koherencia, nie dôkaz live úspechu.

### Historický plán

`tasks/recovery-group-inventory-refresh-plan.md` a jeho výsledky nemeníme.
Neplatné pre dnešný checkout sú predpoklady o BE HEAD `7bcce3f`, endpoint bez
force parametra, odporúčanie ponechať explicitný Refresh iba ako `refetch()`
a odstrániť `force_refresh` z OpenAPI s následnou generáciou. Dnes ho endpoint
prijíma aj odovzdáva. Platné zostávajú spoločný key, zachovanie dát pri chybe,
fallback na cache a nemožnosť garantovať čerstvosť. Historická výhrada voči
mock-only refresh testom už nie je úplným opisom stavu: dnešný test má aj real-hook
fetch test s Inventory + Summary; jeho očakávanie GET bez force treba zmeniť.
Staré test/build/browser výsledky sa neprenášajú na budúcu implementáciu.

## 2. Overený stav: frekvencia Recovery App Policy

| Zdroj | Potvrdené správanie |
| --- | --- |
| BE `util/settings.py`, `Settings` (18–21) | Samostatné limity snapshot 15 a recovery-app 600 minút; hodnoty sú konfigurovateľné. 600 je deklarovaný default, efektívnu hodnotu tejto inštancie sme nezisťovali. |
| BE `policy/recovery_app_policies.py`, `RecoveryAppPolicy`, `validate_min_frequency` | Celé kladné číslo; minúty = hodnota × 1/60/1440. Kontrola iba pri `min_minutes > 0`, rovnosť prejde. Žiadne pravidlo násobkov 15. |
| BE `api/routers/recovery_app_policies.py`, `submit_recovery_app_policy` (30+) | Limit sa kontroluje pri každom upsert, aj historickom zázname a manual režime. Chyba je HTTP 422 s `detail` stringom. GET limit nekontroluje. |
| BE API routers/schemas a FE OpenAPI | Nenašlo sa API sprístupňujúce `min_recovery_app_interval_minutes`. GET policies vracia politiky, platform providers konfiguruje iné polia, discovery cache config riadi TTL. Neodvodzovať limit z nich ani z najkratšej existujúcej politiky. |
| FE `application-recovery/components/RecoveryAppPolicyModal.tsx`, `validate` (133+) | Frequency a retention sú v spoločnej slučke: minutes ≥15 a deliteľné 15; hours/days celé ≥1. Efektívne BE minimum sa lokálne nekontroluje. |
| FE `RecoveryAppPolicyForm.tsx` (98, 112) | Rovnaké `min`/`step` 15 pre frequency aj retention v minútach, bez max. |
| FE `RecoveryAppPolicyModal.tsx`, `toFormData`, `handleChange`, `handleSubmit` | Historické hodnoty sa načítajú bez úpravy; zmena jednotky vyprázdni iba jej hodnotu. Submit error nechá modal otvorený. |
| FE `src/shared/api/apiErrorMessage.ts`, `extractBackendErrorDetail` | Už podporuje string detail aj Pydantic pole `detail[].msg` cez OrvalApiError/cause. Modal detail zobrazuje v Alert. Netreba nový globálny error parser ani rozpoznávať anglickú vetu regexom. |
| BE `apache_airflow/dag_handler.py`, `cron_from_frequency` (168+) | Generuje priamo `*/N * * * *`, `0 */N * * *` alebo `0 0 */N * *`. Nie je to všeobecný intervalový scheduler. |

Napríklad pri BE limite 600 neprejde 9 hours, prejde 10 hours a 1 day; FE dnes
9 hours pustí až na server. FE naopak blokuje 601 minutes, hoci min-frequency
kontrola BE ho prijme. Pri limite 0 odpadá iba BE minimum, kladnosť zostáva.

### Odporúčanie a alternatívy

**Odporúčanie bez zmeny BE:** server zostane autoritou pre minimum. Žiadny pevný
600 limit, žiadny nový config endpoint vo FE, žiadne hádanie limitu z 422.
Zachovať detail chyby a draft po zamietnutí, doplniť regresie pre všetky jednotky
a historické hodnoty. Lokálny minimum error nemožno spoľahlivo ukázať pred submitom.

Rozhodnutie D2: či odstrániť iba frequency pravidlo násobkov 15 a nastaviť jej
`min=1, step=1`, aby vstup zodpovedal BE DTO. Retention vetvu a Snapshot Policies
ponechať presne ako sú. Odporúčame odstránenie iba ako zosúladenie vstupného
kontraktu, so schválením nasledujúceho obmedzenia:

**Minimum v minútach nie je záruka správneho cron intervalu.** Napr. 600 minutes
sa do cron vloží ako `*/600`, bez konverzie na 10 hours; ani dnešné 75/90 minutes
nemajú automaticky význam pravidelného N-minútového intervalu. Analýza zdroja
neoverovala správanie cron parsera v nasadenom Airflow. FE nesmie automaticky
prepisovať jednotky, zavádzať nové horné limity alebo tvrdiť podporu ľubovoľnej
cadence. Pred rozšírením prípustných vstupov musí vlastník schváliť oddelenie DTO
validácie od scheduler problému, prípadne ponechať dnešný frequency krok 15 do
samostatného BE rozhodnutia. Toto je explicitná brána úlohy T3, nie tichý fix BE.

Ďalšie možnosti:

| Možnosť | Výhoda | Nevýhoda / rozhodnutie |
| --- | --- | --- |
| BE-only minimum (odporúčané teraz) | Správne aj pri odlišnej konfigurácii a 0; bez BE zmien | Chyba až po submit; nie je známa dopredu. |
| Budúce read-only capabilities API | FE vie zobraziť a kontrolovať efektívny limit | Samostatná BE práca, kontrakt, oprávnenia a následná riadna Orval generácia; mimo tohto plánu. |
| Deployment config vo FE | Bez nového endpointu | Dvojitý zdroj pravdy, drift a potreba explicitnej hodnoty; nepoužiť predvolené 600. Neodporúčané. |

Historické politiky nemigrovať ani pri otvorení nezaokrúhľovať. Nová lokálna
validácia nesmie ich hodnoty prepísať. BE však pri editácii nemá grandfathering:
aj zmena názvu politiky s frekvenciou pod aktuálnym limitom skončí 422. FE to má
vysvetliť a umožniť opravu; nemôže sľúbiť uloženie nezmenenej starej frekvencie.
Manual Power režim frekvenciu nepoužíva na plánovanie, ale policy endpoint minimum
stále validuje. Nevypínať túto kontrolu na FE podľa manual prepínačov.

## 3. Overený stav: DAG šablóny a validácia

### Kontrakt a vykonávanie

BE `apache_airflow/template_versions.py`, `APP_TEMPLATES`,
`DEFAULT_APP_TEMPLATE_VERSION`, `resolve_app_template`, `list_app_templates`:
Power v1/v2/v3, VMware v1/v2; oba defaults sú v1. Verzie sú case-sensitive.
`dag_template_version=null` zostáva požiadavkou na aktuálny default platformy.
GET `/get_dag_template_versions` v `api/routers/recovery_apps.py` (95+) vracia katalóg.
FE `RecoveryAppBuilder` (89–101) filtruje platformu dynamicky; mapper
`utils/recoveryApplicationFormMapper.ts` uchováva null pri čítaní aj zápise.
Tento kontrakt nemeniť a nenahrádzať select pevným zoznamom verzií.

BE `recovery/recovery.py`, `validate_recovery_app` (101+) overuje registráciu verzie,
referencie a Power LPAR syntax. **Nekontroluje kolízie Task Groups.**
`api/routers/recovery_apps.py`, `submit_recovery_dag` (106+) ho volá pre Save aj
Push. Save bez push uloží JSON. Pri Push sa vyberie šablóna a odošle DAG;
`refuse_ambiguous_groups()` je spustené až pri vykonaní/importovaní šablóny DAG,
nie ako policy/DTO validácia endpointu. Úspešný Save ani prenos súboru preto
negarantuje bezchybný Airflow import. BE tu plán nemení.

Priamo porovnané súbory:

- `apache_airflow/dags/recovery_app_power_v2_template.py`: `sanitize_key` (58),
  `tier_group_id` (70), `lpar_group_id` (74), `refuse_ambiguous_groups` (78–108),
  `wire_tier_lpars` a `build_tier_group` (575+).
- `apache_airflow/dags/recovery_app_power_v3_template.py`: rovnaké ID pravidlá
  (59–124), `build_lpar_group` (220+), `wire_tier_lpars` (616+),
  `build_tier_group` (621+), `VIOS_POOL` (70+).
- `apache_airflow/dags/recovery_app_vmware_v2_template.py`: `sanitize_key` (57),
  `tier_group_id`/`vm_group_id`/`refuse_ambiguous_groups` (391–430),
  `build_tier_group` (897+).
- Legacy `recovery_app_power_template.py` a `recovery_app_template.py` majú iné
  rozloženie a nemajú nový `refuse_ambiguous_groups`; nové blokovanie na ne neaplikovať.

### Presné pravidlá nových šablón

| Pravidlo | Power v2/v3 | VMware v2 |
| --- | --- | --- |
| Normalizácia | `re.sub(r'[^a-zA-Z0-9_-]', '_', name)` | Rovnaká |
| Workload group ID | `lpar_` + sanitize(name) | `vm_` + sanitize(name) |
| Tier group ID | `tier_` + order ako Python `:02d` + `_` + sanitize(tier_name) | Rovnaké |
| Presne rovnaký source workload medzi tiers | Odmietnutý globálne v aplikácii | Rovnaké |
| Duplicitný workload v jednom tier | Odmietnutý cez kolíziu group ID | Rovnaké |
| Rôzne mená s rovnakým group ID | Odmietnuté iba v tom istom tier | Rovnaké |
| Tier ID kolízia | Rovnaké celé order a rovnaké sanitized meno; iba neprázdne tiers | Rovnaké |
| Prázdny tier | Nevytvára group a nezúčastní sa tier ID kolízií | Rovnaké |

Bez trim, lower-case, NFC či zlučovania podčiarkovníkov. Bodka, medzera a každý
ďalší nepovolený Unicode znak sa mení na jedno `_`. V JS použiť Unicode-aware
iteráciu/regex (`u`), aby jeden astrálny znak nevytvoril dve `_` oproti Pythonu.
`A.B` a `A_B` kolidujú v jednom tier; `A-B` a `A_B` nie. `VM` a `vm` sú rozdielne.
`A.B` v tier1 a `A_B` v tier2 nekolidujú (odlišný namespace); presné `A.B` v oboch
tiers je však globálna duplicita. Rovnaké sanitized tier mená s rôznym order sú
povolené. Použiť skutočný tier map key a `tier.order`, nie index alebo display label.

### FE rozdiely a návrh

- `utils/validateRecoveryApplication.ts`, `validateRecoveryApplicationTiers`
  (140–184) dnes blokuje iba presné duplicity explicitného Power v2.
  `utils/recoveryApplicationWorkloads.ts`, `findDuplicateRecoveryApplicationWorkloads`
  správne porovnáva presné mená; nenahrádzať ho sanitizáciou.
- Chýbajú pravidlá Power v3, VMware v2, normalized workload IDs a tier IDs.
  Doplniť malý čistý helper `utils/recoveryApplicationDagValidation.ts`, ktorý
  vráti štruktúrovaný problém s tiermi, menami a ID. Existujúci exact duplicate
  helper použiť znovu; žiadna mutácia draftu ani automatické premenovanie.
- Efektívnu verziu pre null vyriešiť iba z overeného jednoznačného defaultu
  správnej platformy; null na wire nemeníme. Dnes je to v1, v teste musí fungovať
  aj server default v3/v2. Pri neoverenom katalógu zachovať dnešné pravidlo:
  Save bez push s null je možný, explicitná verzia/Push vyžadujú overenie.
  Neznáme budúce verzie katalogizované serverom neblokovať iba preto, že FE
  nepozná ich layout; nové lokálne pravidlá aplikovať len na potvrdené kombinácie.
- `model/recoveryApplicationDraftReadiness.ts` (34+) volá tiers validátor aj celkovú
  validáciu. Obe vetvy musia dostať rovnaký template context, inak sa Next a Save
  rozídu. Existujúce provider/reference/LPAR-name kontroly zostávajú spoločné.
- Odporúčanie D3: nové template chyby blokujú Save aj Push rovnako ako dnešná
  Power v2 duplicita. Je to zámerne prísnejšie než BE Save, aby FE neukladal známy
  neimportovateľný DAG. Ak sa majú dať ukladať neplatné drafty, vyžaduje to iné
  explicitné rozhodnutie o Save/Push a samostatné warning UX.
- `RecoveryAppBuilder.tsx` (227–245) má výnimku na vstup do Orchestration iba pre
  messageKey prefix duplicít. Nahradiť ju explicitným rozlíšením template problému,
  vrátane normalized workload aj tier ID kolízií. Pri takom probléme musí zostať
  dostupná oprava tiers aj zmena DAG verzie v kroku 4; Save zostáva blokovaný.
  Neotvárať obchádzku pri chýbajúcom providerovi alebo neoverených referenciách.
  Zmena v2/v3→v1/null musí okamžite prepočítať chybu bez straty draftu.

## 4. Helper texty, lokalizácie a existujúce testy

`helpers/recoveryApplicationFieldHelp.ts`, `recoveryApplicationTierOrderHelpKey`
(16–23) pozná iba VMware v1 a Power v1/v2. Power v3 a VMware v2 dnes padajú do
generic. Explicitné známe verzie fungujú aj bez katalógu; null helper resolver
vyžaduje overený unikátny default rovnakej platformy. Zachovať tieto vlastnosti.

Nové vetvy `recoveryApplications.fieldHelp.tierOrder.ibmPower.v3` a
`.vmware.v2` dostanú rovnakých sedem podkľúčov ako existujúce vetvy:
`trigger`, `title`, `intro`, `effect.title`, `effect.text`, `limitations.title`,
`limitations.text`. EN/SK/CS musia mať rovnaké kľúče aj interpolácie.

Potvrdený význam nových textov:

- Power v3: tiery podľa order; LPAR vetvy v jednom tier môžu bežať paralelne.
  Tier `ready` čaká na prípravu všetkých LPAR (target/NPIV/host/disk mapping
  a prípadné zoning schválenie), až potom povoľuje stop source/boot/verify.
  `vp_remove_leftover`, `vp_collect_wwpns` (ak sa použije), `vp_add_npiv` idú cez
  jednoslotový pool `power_vios_writes` naprieč v3 runs. Nesľubovať serializáciu
  všetkých operácií, úplne súčasný štart ani aplikačnú pripravenosť. Bariéra
  neznamená atómový rollback: po jej prejdení môžu iné LPAR pokračovať aj pri chybe.
- VMware v2: tier/VM groups; VM vetvy v tier sú nezávislé a môžu bežať súbežne
  podľa kapacity Airflow; `done` uzatvára tier pred ďalším. Nie je to Power ready
  bariéra, ani záruka pripravenosti aplikácie.
- Pravidlá názvov zobraziť v konkrétnej validačnej chybe s tierom/menami, nie ako
  nesúvisiaci nový všeobecný technický panel. Mená workloadov FE nepremenuje;
  oprava môže vyžadovať výber iného workloadu alebo zmenu mena v zdrojovom systéme.
- Inventory refresh help spresniť na pokus o storage refresh s možným cache fallback.
  Policy frequency help pri schválení D2 odstráni tvrdenie o kroku 15, ponechá
  konfigurovateľné minimum a manual Power/VMware rozdiely.

Relevantné testy už existujú (neboli spustené):

- `recovery-groups/components/RecoveryGroupInventory.test.tsx`: cached-data error,
  zmena run, Metro Mirror, real-hook fetch + summary, HTTP failure + obyčajný retry.
  Dva testy dnes výslovne očakávajú refresh bez force.
- `application-recovery/components/RecoveryAppPolicyModal.test.tsx`: oba intervaly,
  min/step, zamietnutie ne-15 minút, historická 7 bez dirty zmeny, string 422 detail.
  Rozdeliť frequency/retention očakávania iba po schválení D2.
- `recovery-applications/utils/validateRecoveryApplication.test.ts`,
  `utils/recoveryApplicationWorkloads.test.ts`, `model/recoveryApplicationDraftReadiness.test.ts`,
  `components/RecoveryAppBuilder.test.tsx`: verzia, presné Power v2 duplicity,
  readiness a krokové brány; rozšíriť, nezahodiť staré v1/null regresie.
- `helpers/recoveryApplicationFieldHelp.test.ts` dnes považuje VMware v2 za
  neznámu; toto očakávanie nahradiť, ponechať budúcu v9 ako generic.
- `src/locales/recoveryApplicationFieldHelpTranslations.test.ts` má presný zoznam
  help kľúčov; nové vetvy bez jeho rozšírenia spôsobia regresiu.
- `components/RecoveryApplicationFieldHelp.integration.test.tsx` a
  `pages/RecoveryApplicationFunctionalConsistency.integration.test.tsx` pokrývajú
  prepojenie formulára, dát a helperov; doplniť cielené scenáre podľa TODO.

## 5. Poradie a závislosti

```text
Schválenie plánu a D1–D5
  ├─ T1 Inventory live request + koherencia → T2 voliteľná invalidácia → CP1
  ├─ T3 Policy frequency kontrakt          → CP2
  └─ T4 DAG pravidlá → T6a texty → T6b helper routing → CP3
                          └─ T5 napojenie/readiness → T7 navigácia/integrácia → CP4
```

T1/T3/T4 sú vecne nezávislé; texty EN/SK/CS majú jediného vlastníka T6a.
Číslovanie úloh označuje oblasti; vykonávacie poradie je T1, T2, T3, T4, T6a, T6b, T5,
T7, aby UI nikdy neodkazovalo na ešte neexistujúce preklady.
Implementácia má byť sekvenčná v malých commitoch; tento plán nevyžaduje agentov
ani paralelné editovanie zdieľaných súborov. Presné súbory, AC a príkazy sú v TODO.
Žiadna úloha nemá viac než päť plánovaných súborov; pri raste ju rozdeliť.

## 6. Rozhodnutia na schválenie

| ID | Odporúčanie | Dopad / alternatíva |
| --- | --- | --- |
| D1 | Pending lock povinný; bez cooldown | Voliteľných 5 s znamená dodatočný stav a časové testy. |
| D2 | BE-only minimum; frequency-only kladné celé čísla po prijatí scheduler obmedzenia | Alternatíva ponechať krok 15 do samostatného BE scheduler rozhodnutia. Žiadna z možností nepridáva pevné 600. |
| D3 | Rovnaké template blokovanie Save aj Push | BE draft Save je tolerantnejší; povolenie neplatných draftov by vyžadovalo upravený plán a UX. |
| D4 | Volumes/tree označiť stale iba pre snapshot provider, bez okamžitého refetch | Možno úplne odložiť T2; inventory funguje nezávisle. |
| D5 | Pri zmene run/unmount zahodiť výsledok forced requestu | Jednoduché vlastníctvo operácie; starý run sa obnoví až bežným loadom. Cache sa neplní na pozadí pre opustený run. |

Schválenie dokumentov samo osebe nie je pokyn na implementáciu. Čakať na ďalší
výslovný pokyn používateľa. Pre D2 neexistuje predpokladaný súhlas uplynutím času.

## 7. Riziká a overovanie

| Riziko | Ošetrenie / dôkaz |
| --- | --- |
| HTTP 200 so starou cache | Žiadne live success tvrdenie; kontrakt nerozlišuje stale a fresh. |
| Obyčajný GET prepíše forced odpoveď | Cancel pred requestom aj pred commitom do cache; deferred-response test oboch poradí a refetch počas pending. |
| Run zmena, unmount, delete počas requestu | Abort + token + query identita; test aj bez rešpektovania abort signal. |
| Force zostane aktívny pre retry/focus | Forced fetch mimo trvalého queryFn; test ďalšieho obyčajného GET po refreshi. |
| Summary je iný alebo cache obsahuje UI model | Real QueryClient/generated fetcher, oba pohľady, raw cache assertion. |
| Nesprávny Metro Mirror provider | Použiť snapshot_provider_id, test master ≠ auxiliary a missing ID. |
| Rozdiel Python a JS normalizácie | Explicitné fixtures vrátane Unicode/code points, order a namespace hraníc. |
| Striktnejšia Save validácia | D3, bez migrácie; v1/null regresie a opraviteľná navigácia. |
| Rozdielny/default budúci katalóg | Kontext platformy, verified unique default; žiadne prepísanie null na wire. |
| Historická policy nejde znovu uložiť | Jasný server detail a zachovaný draft; neprezentovať grandfathering. |
| Minimum a cron znamenajú odlišné veci | D2 brána a samostatné BE rozhodnutie; žiadny skrytý FE scheduler fix. |
| Generated drift a cudzie zmeny | Žiadna generácia v tomto scope; stage iba vlastné súbory. |

Pri implementácii spúšťať explicitné Vitest súbory uvedené pri úlohách,
ESLint iba upravených TS/TSX a JSON parse pre locales. Po každej fáze skontrolovať
diff a vytvoriť atomic commit. Kompletná testovacia sada, `npm test` a `npm run build`
nie sú predvolenou kontrolou; build script navyše spúšťa lint, typecheck, všetky
testy aj api:check. Rozšíriť rozsah len pri konkrétnom zistení alebo na pokyn.
Browser kontrola po implementácii má overiť ovládanie klávesnicou, chyby, zachovanie
draftu a viditeľné výsledky; žiadny Push do skutočného Airflow v automatickom QA.

Overenie samotných dokumentov: existencia všetkých referencovaných FE súborov
(nové sú výslovne označené), kompletnosť úloh a checkpointov, `git diff --check`.
Testy/build aplikácie teraz neboli spustené. Historické výsledky nepredstavujú
overenie tohto návrhu.
