# Recovery Groups – VMware + IBM Power: implementačný plán

Dátum analýzy: 2026-10-27. Stav: implementácia T1–T7 a mockované browser overenie T8 dokončené inline, vlastné zmeny commitované atomicky. Výsledky a live obmedzenia: [verification report](recovery-groups-vmware-power-verification.md).

Revízia podľa review: storage vo FE zostáva iba FLASHCOPY pre VMware aj IBM Power. HITACHI je zámerne skryté do budúceho rozšírenia, bez zmeny spoločných typov či BE kontraktu, bez implementácie discovery/validácie/provisioningu a bez účasti v implementačnej alebo E2E matici. Jeho podpora nie je podmienkou dokončenia tohto plánu.

## Rozsah a zdroje

FE: `C:\Users\polnikr\source\ABCO\Aricoma_busines_comunity_management`.
BE: `C:\Users\polnikr\source\ABCO\abco-be`.
Analyzovaný bol aktuálny lokálny kód, nie bežiaci BE ani infraštruktúra. FE bol skúmaný najprv cez CodeGraph; BE MCP index nevedel otvoriť, preto bol čítaný priamo. Nebol spustený discovery, provisioning, push ani browser test.

Plán a [TODO](recovery-groups-vmware-power-todo.md) sú podkladom schválenej implementácie. Existujúce `tasks/plan.md`, `tasks/todo.md` a iné rozpracované plány sa nemenia. Používateľ následne výslovne autorizoval atomické commity vlastných overených zmien; git push ani live provisioning nie sú autorizované. Recovery Applications, susedné refaktoringy a ručné zásahy do generated Orval súborov sú mimo rozsahu.

## 1. Východiskový stav pred implementáciou

### FE flow, ktorý zachováme

- `components/RecoveryGroupBuilder.tsx`: spoločný wizard Details → Topology → Type → Provider → Resources → Related Storage pre compute skupiny → Policy Set → Orchestration. Topology predchádza výberu compute platformy; preto musí mať nápoveda všeobecný fallback.
- `model/recoveryGroupDraftLifecycle.ts`: inicializácia Edit/Create, explicitné udalosti, dirty stav a reset downstream výberov. `resolveRecoveryGroupDraft.ts` viaže discovery na identitu storage provider + compute provider + zoradené zdroje; výsledky starej identity sa nezlučujú do aktuálneho výberu. Exclusions zachovávajú ručné odobratie objavených volumes.
- `model/recoveryGroupDraftReadiness.ts`, `api/recoveryGroupsValidation.ts`: navigácia, finálny submit a normalizácia. FE dnes vyžaduje aj description, Policy Set a orchestration provider; BE má tieto polia vo vstupnom modeli voliteľné. Túto existujúcu produktovú požiadavku teraz neuvoľňovať.
- `RecoveryGroupProviderStep.tsx`, `config/recoveryGroupResourceOptions.ts`: VMware aj IBM Power už majú zodpovedajúce typy providerov a filtrovanie credentials. Create filtruje compute providerov podľa source role; Edit vie pracovať s existujúcim výberom.
- `useRecoveryGroupResourceInventory.ts`: VMware používa existujúci serverový search, scope/prefix/tag a VM metadata; Power `/get_power_vm`, LPAR `partitionName`, scope prefix a OS metadata. FlashSystem používa spoločné inventory queries. Nepísať druhý wizard ani nový discovery systém.
- `useRecoveryGroupRelatedVolumes.ts`: `/vdisks_by_vm` podľa compute provider ID a názvu VM/LPAR, deduplikácia názvov, loading/error/retry. Endpoint nemá storage-provider parameter; výber source storage vo FE sám nezmení BE resolution cez backing storage väzby.
- `useRecoveryGroupMetroMirrorRelationships.ts`, `utils/reconcileMetroMirrorPrefill.ts`, `RecoveryGroupMetroMirrorFields.tsx`: Existing lookup, auxiliary names a CG prefill, zachovanie override, mismatch a čiastočné výsledky. Toto zachovať.
- `getDraftLocks` v `resolveRecoveryGroupDraft.ts`: pushed skupina je read-only; managed skupina s vytvoreným CG alebo auxiliary názvami zostáva zamknutá aj pri pushed=false. Edit nedovoľuje meniť uložený MM mode; managed Edit navyše uzamyká source/topology.
- `helpers/mapRecoveryGroups.ts`, `hooks/useRecoveryGroups.ts`: oddelené GET/UI/POST mapovanie; POST neodosiela používateľské CG/aux názvy pre Managed. Orchestration provider a push sú query parametre, nie používateľom zapisovaný orchestration body.
- `RecoveryGroupsTable.tsx`: Display cez DetailView, overview/orchestration/inventory/JSON. Existuje globálna `recoveryGroups.help`; Existing lookup má `KeyedHelpPopover`. Ostatné požadované poľové helpery zatiaľ nie sú kompletne pokryté.

### BE pravidlá overené v kóde

| Oblasť | Zdroj v BE | Zistenie |
|---|---|---|
| Platformy/storage | `recovery/groups.py::validate_recovery_group` | `vms` povoľuje VMWARE/IBM_POWER; neprázdne `volumes` pri Local povoľujú FLASHCOPY/HITACHI, pri MM iba FLASHCOPY. Typy sa kontrolujú pre neprázdnu úroveň. |
| Partner | `recovery/groups.py::_validate_metro_mirror` | Partner musí existovať, byť FLASHCOPY a odkazovať spätne na source. FE dnes nekontroluje symetriu. |
| Existing | rovnaký validátor | Povinné CG ID a každý auxiliary_name. `target_pool` BE v Existing explicitne neodmieta, ale nepoužíva ho; FE ho musí vynechať. |
| Managed | rovnaký validátor | Používateľské CG/aux hodnoty sú zakázané; samotný save neprovisionuje. |
| Push/oprávnenie | `api/routers/recovery_groups.py::submit_recovery_group` | Nový managed provisioning nastáva pri push=true a chýbajúcich auxiliary names, s MANAGE_METRO_MIRROR kontrolou pred persistenciou. Pushed záznam BE odmieta pri ďalšom submit. |
| Orchestration | rovnaký router | BE zapisuje run_id, pushed, provider_id. Query `provider_id` má default airflow-01, push=false. FE už posiela explicitný výber. HITACHI push vracia skipped, nie podporovaný FlashCopy deployment. |
| Upsert | `recovery/groups.py::upsert_recovery_group` | Skutočný entry point deleguje na `upsert_provider(group, file, _KEY)`, kde `_KEY = recovery_groups`; táto delegovaná implementácia nahrádza celý záznam, nejde o PATCH. Stratená voliteľná hodnota vo FE sa pri submit neobnoví zo starého záznamu. |
| Pools | `api/routers/storage.py`, `ibm_flashsystem/discovery.py::_curate_pools` | `/get_volumes?provider_id=target` vracia pool mapu kľúčovanú ID, hodnoty majú name/capacity/used_capacity/free_capacity. VIEW_INVENTORY; force_refresh obchádza BE cache. |
| Pool provisioning | `ibm_flashsystem/metro_mirror.py::resolve_target_pool`, `provision_managed_metro_mirror` | Vyhľadáva názov, nie ID; pool nevytvára. Bez override rieši default zvlášť pre každý source volume podľa mdisk_grp_name, prípadne mdisk_name. Jeden explicitný override platí pre všetky volumes. |
| Resource discovery | `api/routers/discovery.py`, `ibm_flashsystem/discovery.py` | Power používa HMC/LPAR VFC WWPN, VMware VMFS NAA; obe vetvy mapujú na IBM vdisks cez FLASHCOPY backing providers. Local HITACHI prijatý validátorom ešte neznamená podporované discovery. |

## 2. Východisková FE/BE gap analýza a audit payloadu

Legenda: „áno“ znamená existujúcu cestu, nie vykonaný integračný test; „čiastočne“ vyžaduje nižšie uvedené doplnenie. TS označuje generated kontrakt / doménový model a draft. H = poľová kontextová nápoveda (globálna nápoveda sa do toho nepočíta).

| API pole | Formulár | TS | Validácia | POST | Edit GET | Display | H |
|---|---|---|---|---|---|---|---|
| id | áno | áno/áno | FE normalizácia/unikátnosť | áno | áno, nemenné | hlavička/JSON | bez helpera |
| name | áno | áno/áno | trim/povinné | áno | áno | hlavička/JSON | bez helpera |
| description | áno | áno/áno | FE povinné, BE nullable | áno | áno | overview | bez helpera |
| provider_id_vm | áno, compute | áno/áno | typ/scope/credentials | áno | áno, unresolved ochrana | provider ID + workload | platformová chýba |
| provider_id_volume | áno, source | áno/áno | FE zámerne iba FLASHCOPY aj Local | áno | áno pre podporovaný FLASHCOPY flow | JSON; doplniť explicitný source | spoločná pomoc k source/target |
| topology | áno | áno/áno | Local/MM | áno | áno, legacy Local | JSON/inventory; doplniť konfiguračné pole | doplniť |
| metro_mirror.mode | áno | áno/áno | Existing/Managed | áno | áno, edit lock | JSON/status pri dostupnom inventory | čiastočne lookup |
| metro_mirror.consistency_group_id | Existing input/prefill | áno/áno | Existing povinné | iba Existing | áno; Managed odvodené | JSON/live MM status | lookup; doplniť pole |
| metro_mirror.target_pool | nie | áno/nie | BE string/null, existencia až provisioning | vypadáva | iba rawRecord, nie draft | iba raw JSON | chýba |
| policy_set_id | áno | áno/áno | FE vyžaduje výber; BE overí existenciu | áno | áno | overview | doplniť |
| vms | VM/LPAR selection | áno/áno | neprázdne/unikátne názvy, typ | áno | áno + metadata | počet/inventory/JSON | platformová chýba |
| volumes | selection/related storage | áno/áno | unikátnosť, provider, MM neprázdne | áno | áno | inventory/JSON | platformová chýba |
| volumes[].auxiliary_name | Existing input/prefill | áno/áno | každý Existing volume | iba Existing | áno; Managed read-only | JSON/status | čiastočne lookup |
| notificationEmail | nie | áno/nie | BE regex; FE chýba | vypadáva | iba rawRecord, nie draft | iba raw JSON | chýba |
| orchestration | provider/push input nepriamo | read record áno | lifecycle lock; oprávnenie overuje BE, FE zobrazí 403 | body neposielať | áno | orchestration sekcia | doplniť |
| query provider_id/push_to_orchestrator | áno | áno | provider z AIRFLOW s credentials | áno v query | obnovenie z orchestration | stav pushu | doplniť save/push rozdiel |

Generated `recoveryGroup.gen.ts`, `recoveryGroupRecord.gen.ts`, `metroMirrorConfig.gen.ts` aj `openapi/abco-api.json` už obsahujú notificationEmail aj target_pool. Regenerácia nie je predpokladom týchto dvoch polí. `toRecoveryGroupReadRecord` ich vďaka spread zachová, ale `mapRecoveryGroupApiRecord`, draft inicializácia, validated draft a POST mapper ich neprepájajú. rawRecord/JSON zachovanie nestačí na bezstratový upsert. Doplniť aj fallback `toRecoveryGroup`, `toRecoveryGroupJson`, aby nezáviseli od prítomnosti rawRecord.

## 3. Vstupy, normalizácia a lifecycle

### Notification Email

- Nové nepovinné pole v Details pre oba compute typy aj existujúci storage flow. Doménový názov `notificationEmail`, prázdny form string; GET null/undefined sa inicializuje na prázdny string.
- BE regex je `^[^@\s]+@[^@\s]+\.[^@\s]+$`, používa Python re.match bez trimu. Null, vynechanie aj prázdny string prejdú truthy kontrolou; whitespace nie. Pydantic pri vynechaní doplní null, preto vynechanie pri upserte môže vymazať starý override. Nepopisovať ho ako „zachovaj predošlú hodnotu“.
- FE trim pri validácii/mapovaní; neprázdnu hodnotu overiť rovnakým jednoduchým pravidlom s úplným koncom stringu. Nepoužiť prísnejší Zod email bez rozhodnutia o odlišnosti od BE. Input type=email môže mať prísnejšiu native validáciu: overiť súlad s vlastným wizard submit a nevytvoriť dve protichodné chyby.
- Prázdny vstup odoslať ako explicitné `notificationEmail: null` (zrušenie override). Nezmenený Edit musí odoslať uloženú hodnotu. Detail zobrazí override alebo „Použiť nastavenie snapshot providera“; fallback neprezentovať ako uložený group override.
- Rozpor medzi komentárom BE modelu a runtime: router používa `payload.get('notificationEmail') or snapshot_provider.get('notificationEmail')`. Pri Local je snapshot provider source; pri MM partner/target. FE aj helper rešpektujú tento runtime bez náhradnej FE fallback logiky. Prípadná zmena na vždy-source fallback je samostatné budúce produktové/BE rozhodnutie, nie podmienka tejto implementácie.

### Target Pool

- Nový select v Topology iba MM/Managed. Automatic je default a znamená neprítomný `target_pool` v POST metro_mirror; konkrétna voľba posiela presný pool.name, nikdy map key/ID.
- V draft/doméne `targetPool` ako string alebo null, samostatná lifecycle udalosť. Explicitná uložená hodnota ostáva aj počas loading/error/prázdneho discovery, s označením nedostupná/neoverená. Nesmie sa bez udalosti používateľa prepnúť na Automatic ani trimom zmeniť skutočný názov.
- Pri vedomej zmene source providera resetovať výber na Automatic a oznámiť reset; nepreberať rovnaký názov z iného target systému. Pri refetchi providerov s rovnakým source ID, ale novým partnerom ponechať uloženú hodnotu ako neoverenú a upozorniť na zmenu target kontextu, nie tichý prenos či vymazanie. Táto informácia nie je nový inventory push gate. Edit hydration nie je zmena source.
- Prechod na Local/Existing vynechá target_pool z efektívneho payloadu a vedomá zmena mode/topology resetuje nepotrebný výber. Discovery nemá oprávnenie meniť hodnoty formulára. Existujúce Managed/pushed locky sú nadradené novému poľu.
- Potvrdený chýbajúci explicitný pool výrazne označiť ako riziko zlyhania provisioningu a ponúknuť refresh alebo zmenu výberu. Stale/error inventory označiť ako neoverené, 403/VIEW_INVENTORY ako nedostupné pre aktuálneho používateľa; tieto stavy neznamenajú neexistenciu poolu. Automatic zostáva platnou voľbou bez povinného inventory lookup. Save ani push automaticky neblokovať na základe inventory či jeho absencie: konečnú kontrolu existencie vykoná BE. Tvrdý FE gate nie je súčasťou plánu; prípadný budúci návrh musí doložiť konkrétny neplatný scenár a neblokovať legitímny push. Ostatné existujúce validácie/locky zostávajú.

### Ostatné opravy hraníc

Zjednotiť FE kontrolu symetrického partnera s BE v existujúcom `getRecoveryGroupTopologyError`: z už načítaných allProviders overiť aj `target.partnerProviderId === source.id`. Použiť rovnakú kontrolu pre ponúkaný/aktuálny MM pár, nevytvárať provider management ani druhý validátor.

`src/features/platform-administration/identity-access/hooks/usePermissions.ts` číta `mockPermissions` z `mockIdentityService`, nie oprávnenia prihláseného používateľa. Nepoužiť ho na authorization gate ani zisťovanie VIEW_INVENTORY/MANAGE_METRO_MIRROR. BE zostáva autoritou; FE zachová a zrozumiteľne zobrazí vrátenú 403/permission chybu. Save-only neblokovať pre provisioning permission. Skutočná FE permission integrácia by vyžadovala samostatné rozhodnutie a spoľahlivý zdroj, je mimo rozsahu.

## 4. Target Pool discovery a cache reuse

### Existujúca cache

`resources/model/inventoryQueries.ts::flashSystemInventoryQuery(id)` používa presne `getGetVolumesQueryKey({provider_id: id})` a generated getVolumes so signal. Cache obsahuje validovanú wire odpoveď; UI mapovanie beží až cez select. Pooly preto čítať z wire `VolumesResponseOutput.pools`, nie zo zoznamu volumes alebo z poolov iného mapped inventory. Rovnaký factory už používajú Resources, Recovery Groups a prefetch.

Globálna politika `shared/query/cachePolicy.ts`: staleTime 15 min, gcTime 60 min, retry 1, refetchOnMount/focus/reconnect=true. `providerMutationInvalidation.ts` pozná `/get_volumes`: provider/credential mutácie rušia a invalidujú príslušné query, delete eviktuje. `providerInventoryRevision.ts` má revízie/tombstones pre obsolete výsledky. Pozor: dnešný FlashSystem queryFn iba odovzdá AbortSignal; explicitnú revision kontrolu má VMware factory, nie FlashSystem. Nový pool flow nemá tvrdiť, že ju už má.

### Navrhnutý algoritmus

1. Z all providers odvodiť source z `relatedVolumeProviderId` a target z jeho `partnerProviderId`; overiť dva FLASHCOPY, credentials, rozdielne ID, symetrické partnerstvo. Bez konkrétneho target ID query disabled; nikdy factory bez ID, pretože BE má default provider.
2. Malý feature hook `useRecoveryGroupTargetPools.ts` používa `useQuery` s existujúcim `flashSystemInventoryQuery(targetId)` a select pool name/kapacity. Bez vlastného endpointu, ad hoc fetchu, kópie cache či effect fetch pri každom renderi. Query zapnúť iba pre aktívny Managed flow s platným target kontextom, nie pre Local/Existing. Neodvodzovať enabled z mockPermissions; prípadnú VIEW_INVENTORY 403 zobrazí výsledok requestu bez blokovania save/push.
3. Platné, úspešné, neinvalidované, fresh dáta rovnakého key opätovne použiť bez requestu; súbežný load deduplikuje QueryClient. Prázdna platná pool mapa je úspešný výsledok, nie dôvod na fetch loop. Nespoliehať sa iba na truthy getQueryData alebo na ensureQueryData, ktoré môže vrátiť invalidované dáta.
4. Chýbajúce/stale/invalidované dáta sa načítajú cez rovnaký key a endpoint. Zachovať štandardný staleTime; nepoužiť Infinity na zakrytie invalidácie. Pri starých dátach jasne odlíšiť aktualizáciu od potvrdeného zoznamu a pred pushom nepovažovať stale údaje za dôkaz existencie.
5. Nepoužiť keepPreviousData/placeholder pre starý target. Query key a observer viazať na konkrétne target ID, zachovať AbortSignal a existujúcu cancel/invalidation cestu; oneskorený A nesmie meniť options/draft aktuálneho B. T3.1 najprv reprodukčným testom preverí aj same-ID update/delete/recreate. Samotná absencia VMware-style guardu nie je dôvodom meniť spoločný FlashSystem factory. Iba ak test preukáže konkrétny obsolete zápis napriek existujúcim ochranám, navrhnúť najmenšiu cielenú opravu a overiť dotknutých spotrebiteľov; bez plošného refaktoringu alebo nového inventory mechanizmu.
6. Retry bežne opakuje rovnakú query (nemusí obísť BE discovery cache). Ak UI ponúkne explicitný live refresh, použiť generated getVolumes({provider_id: targetId, force_refresh: true}, {signal}), zrušiť konkurenčný normal fetch a výsledok uložiť pod normálny key iba pri stále platnej revízii a kontexte. Nevytvárať druhý dlhodobo používaný forced key. Nepridávať live refresh pri mount ani pri každej zmene selectu.
7. Provider/credential invalidáciu reuse cez existujúce globálne pravidlá; pri zmene source iba prepnúť observer na nový target key, nevymazávať zdravú zdieľanú cache iných providerov.
8. Pool options majú value=name, label=name + dostupná kapacita. Malformed/bezmenné položky ignorovať s diagnostikovateľným neovereným stavom; prázdna mapa má samostatný empty state. Loading/error/retry nesmie vymazať explicitnú hodnotu pri Edit. Inventory 403 je vysvetlený stav, nie prázdny zoznam poolov.

Automatic: keď už sú source inventory a target pools dostupné, porovnať pool pre každý vybraný source volume cez mdisk_grp_name alebo mapu mdisk_grp_id → pools[id].name. Pre A v Pool1 a B v Pool2 musia na target existovať oba názvy; nikdy nepoužiť pool prvého volume pre celú skupinu. Neznámy source pool označiť neoverený, známy chýbajúci varovať bez automatického blokovania pushu. Nerobiť extra discovery len kvôli informatívnemu varovaniu; BE robí konečnú kontrolu živým lsvdisk/lsmdiskgrp a aj po FE overení môže pool zmiznúť. Kapacita je informatívna, nie garancia úspechu provisioningu.

## 5. Architektúra dynamických nápovied

Reuse `KeyedHelpPopover` pre Create/Edit a rovnaký obsah cez `DetailField.labelHelp` v Display. Zachovať `recoveryGroups.help` a existujúcu lookup nápovedu. Žiadny nový help renderer/store/modal systém. ID, Name a Description nesmú dostať helper v Create, Edit ani Display; nápoveda je iba pri technických parametroch/vzťahoch. Súvisiace vstupy pokryť jednou spoločnou nápovedou tam, kde sa vysvetlenie zhoduje.

Overený dizajnový vzor: `providers/components/ProviderCreateForm.tsx` používa technický label a ikonu v jednom riadku (`mb-1.5 flex items-center gap-1.5 [&>span]:h-4 [&>span]:items-center`), napr. partnerProviderId/backingStorageProviderIds/notificationEmail, kým ID/Name/Description sú obyčajné Field. `ProvidersCatalogueTable.tsx` odovzdáva KeyedHelpPopover priamo do `labelHelp`; `shared/components/detail-view/DetailField.tsx` už rieši inline-flex/gap-1.5 zarovnanie. Rovnaký labelHelp vzor používa aj `platform-providers/components/PlatformProvidersTable.tsx`. Recovery Groups prevezme umiestnenie, štýl a správanie, bez úprav týchto zdieľaných komponentov.

Locale prefix odvodiť priamo pri renderi zo skutočne zvoleného compute provider type VMWARE/IBM_POWER; topology/mode rozhodnú o relevantných technických sekciách. Bez compute providera (vrátane unresolved Edit alebo standalone FlashSystem) generická vetva; nevydávať nesúladný workload za potvrdený provider. Nevytvárať všeobecný field registry/resolver. Iba ak rovnaký krátky výber prefixu potrebuje Create/Edit aj Display, použiť malý feature helper `helpers/recoveryGroupFieldHelp.ts` bez nového state alebo rendereru. Zdieľané texty sa neduplikujú podľa platformy.

Použiť konvenciu komponentu: `trigger`, `title`, `intro`, pre section `title`/`text`. Navrhnutý namespace `pages.recoveryGroupBuilder.fieldHelp`, vetvy `common`, `generic`, `vmware`, `ibmPower`; v EN/SK/CS identická štruktúra. Každý implementačný slice doplní potrebné tri locale texty, T6 doplní celkovú parity a Display.

| Sekcia/polia | Obsah a prepínanie |
|---|---|
| Details: Notification Email | jediný technický helper v Details: email override/fallback na Local source alebo MM target a zrušenie; ID/Name/Description bez helpera |
| Topology: Local, MM, Storage, Source/Target | snapshot miesto, partner/symetria, Local storage limity, rozdiel compute/storage; storage text podľa skutočného typu |
| Existing/Managed, CG, Auxiliary, Target Pool | Existing lookup a override; Managed generovanie iba pri push, oprávnenie; názov poolu, Automatic zvlášť na volume, pool sa nevytvára |
| Provider: compute a väzby | VMware vCenter/VM/VMFS NAA vs IBM Power HMC/LPAR/VFC WWPN; backingStorageProviderIds a FLASHCOPY discovery |
| Resources: VM/LPAR, Volumes | platformový výber a väzba volumes, source storage nie je compute provider; zachované exclusions/prefill |
| Policy Set | aplikácia na group volumes; pri push BE rieši enforceable policy; nie automatická obnova pri save |
| Orchestration: toggle/provider | save lokálne vs provisioning/deploy DAG; AIRFLOW provider; skipped a čiastočné chyby bez tvrdenia, že úspešný save znamená úspešný push |

Trigger nesmie submitovať form alebo aktivovať provider kartu; event handling preveriť testom. Otvorenie/zatvorenie nemení draft/dirty. Overiť klávesnicu, Escape, návrat fokusu, portál/scroll a malý viewport cez existujúci HelpPopover.

## 6. Súbory a implementačné poradie

Všetky relatívne cesty nižšie sú FE; prefix `RG/` v TODO znamená `src/features/recovery-plans/recovery-groups/`.

1. T1: contract/blocker rozhodnutia, `model/recoveryGroupTypes.ts`, `model/recoveryGroupDraftLifecycle.ts`, `model/resolveRecoveryGroupDraft.ts`, `model/recoveryGroupDraftReadiness.ts`, `api/recoveryGroupsValidation.ts`, `helpers/mapRecoveryGroups.ts`, `utils/recoveryGroupTopology.ts`; rozdelené do malých úloh.
2. T2: `components/RecoveryGroupDetailsStep.tsx`, `components/RecoveryGroupBuilder.tsx` a ich testy, locales.
3. T3: nový `hooks/useRecoveryGroupTargetPools.ts`, prípadný malý pool helper, `components/RecoveryGroupTopologyStep.tsx`, builder a focused testy. `resources/model/inventoryQueries.ts` iba pri konkrétnom reprodukovanom probléme T3.1; žiadna zmena query key formátu.
4. T4/T5: priamy výber locale prefixu (malý feature helper iba pri opakovanom použití), `RecoveryGroupProviderStep.tsx`, `RecoveryGroupResourcesStep.tsx`, `RecoveryGroupMetroMirrorFields.tsx` iba ak nestačí existujúca lookup pomoc, `RecoveryGroupPolicySetStep.tsx`, `RecoveryGroupOrchestrationStep.tsx`, builder a locales; neprepisovať fungujúce discovery vetvy.
5. T6: `components/RecoveryGroupsTable.tsx`, jeho testy a `src/locales/{en,sk,cs}.json`; prípadne konfiguračné helpery v existujúcich status komponentoch iba tam, kde sa skutočne renderuje dané pole.
6. T7/T8: regresné testy a nový `scripts/qa/verify-recovery-groups.mjs`, samostatný výsledkový dokument `tasks/recovery-groups-vmware-power-verification.md`. Existujúce QA skripty už načítavajú playwright-core z runtime cesty cez PLAYWRIGHT_MODULE; package.json nemá samostatný Playwright E2E script. Najprv overiť dostupný runtime, nevydávať transitive Vitest browser peer za nainštalovaný E2E runner.

Závislosti: T1 kontrakt → model/mapping → T2 email a T3 pools → T4/T5 helper integrácia → T6 Display/parita → T7 regresia → T8 browser/integrácia. T4/T5 môžu po stabilizácii kontraktu postupovať nezávisle len pri koordinácii spoločných komponentov a locales; plán nevyžaduje paralelných agentov. Kontrolný bod po každých 2–3 malých úlohách v TODO.

## 7. Riziká a rozhodnutia pred implementáciou

| Riziko | Dopad | Opatrenie |
|---|---|---|
| Runtime email fallback na MM target sa líši od komentára/source očakávania | stredný | rešpektovať router; prípadnú budúcu zmenu fallbacku oddeliť od tohto rozsahu |
| Full replacement upsert stratí voliteľné hodnoty | vysoký | test GET → Edit nezmenené → POST → GET pre obe polia, aj clear |
| Stará async odpoveď alebo zmena partnera | vysoký | target query key/cancel/invalidation, žiadny previous-target placeholder; same-ID riziko reprodukovať pred cielenou opravou |
| Pool zmazaný po discovery | vysoký | zachovať výber, varovanie/refresh, BE chyba neznamená úspešný provisioning |
| Save/push vedľajšie účinky | vysoký | mock vs live jasne oddelené; BE persistuje pred push a následná chyba môže znamenať uloženú skupinu |
| Chýbajúce VIEW_INVENTORY/RUN_DISCOVERY/MANAGE_METRO_MIRROR | stredný | zobraziť skutočnú BE chybu; mockPermissions nepoužiť na gate; nedostupné pool inventory neblokuje save/push |
| Nápovedy sú nadbytočné alebo nesedia na platformu | stredný | technické parametre podľa Providers vzoru, spoločnú pomoc neduplikovať, ID/Name/Description bez helperov |

Rozhodnutia počas vykonania: používateľ poskytol BE `http://10.99.99.53:8000` iba na čítanie a zakázal jeho úpravy. OpenAPI GET potvrdil polia; GET Recovery Groups vrátil 401, preto live údaje a live zápisy/provisioning zostávajú neoverené. T3.1 reprodukcia nepotvrdila potrebu meniť spoločný factory: existujúca cancel/invalidation cesta odmietla oneskorený výsledok. Použil sa generated useGetVolumes s flashSystemInventoryQuery options podľa ADR 0002. Zmena BE email fallbacku a skutočná FE permission integrácia sú samostatné budúce rozhodnutia. Pool inventory zostáva poradné a bez tvrdého push gate.

## 8. Testovacia stratégia a akceptácia

Focused testy pri jednotlivých slices; nevykonávať defaultne plnú suite/build. Existujúce testy: mapRecoveryGroups, recoveryGroupsValidation, lifecycle/resolve/readiness, topology, prefill, inventory/relatedVolumes, useRecoveryGroups, Builder + prefetch + discovery-lifecycle, Details/Topology/Resources, Table/orchestration. Pridať testy pool hooku a field-help parity.

- Model/API: email absent/null/empty/whitespace/valid/invalid; explicitné clear a nezmenený Edit; target Automatic omitted, explicit name presný, Local/Existing omitted, Managed žiadny user CG/aux; doménový aj rawRecord-free JSON fallback; query push parametre a read-only orchestration.
- Cache/integrácia: fresh target cache = 0 dodatočných requestov, concurrent = 1, stale/invalid/missing fetch; úspešná prázdna mapa; iný target key; A→B s oneskoreným A; update/delete/credentials invalidácia; refresh nezapíše odpoveď starej revízie; dostupnosť explicitného Edit poolu nemení hodnotu. Dva source volumes s rôznymi poolmi.
- Platformy: VMware + FLASHCOPY VM search/scope/prefix/tag a Power + FLASHCOPY LPAR prefix/discovery; Existing lookup/prefill/manual override, Managed generated read-only hodnoty a pushed/partial provisioning lock; FlashSystem standalone regresia.
- Help/Display: vybrané technické parametre a EN/SK/CS parity, generic/VMWARE/IBM_POWER; ID/Name/Description bez helperov v Create/Edit/Display, súvisiace vstupy bez duplicitnej pomoci; prepnutie providera mení text, nie draft; display číta uložené konfiguračné hodnoty aj bez live inventory.
- Error/authorization: BE 403 MANAGE_METRO_MIRROR sa zobrazí bez mock permission gate, save-only ostáva dostupný. Pool warning rozlišuje potvrdené chýbanie, stale/error inventory, VIEW_INVENTORY 403 a Automatic; absencia úspešného lookup sama neblokuje push. Testovaný mock 403 nie je dôkaz reálnych oprávnení používateľa.
- Lint len zmenené TS/TSX cez lokálny ESLint; JSON parser pre locales. `npm.cmd run typecheck` iba pri zmene kontraktov/types zasahujúcej viac spotrebiteľov, nie ako povinný check každej malej úlohy. `npm.cmd run api:check` iba ak sa mení OpenAPI/generovanie. Generated súbory výlučne cez pipeline; prípadný veľký generated diff je samostatný mechanický krok.

T8 musí skutočne použiť Playwright a prehliadač po schválení a implementácii. Matica: VMware + FLASHCOPY Create/Edit Local, MM Existing/Managed a výber VM/volumes; Power + FLASHCOPY Create/Edit Local a MM Existing/Managed, LPAR/volumes. Notification Email nastavenie/clear/fallback a GET round-trip; Target Pool Automatic/explicit, správny target/cache hit s počtom requestov, source switch/loading/error/retry/odstránený pool/Edit a inventory 403 bez nového push gate. Help pri technických parametroch generic/VMware/Power × EN/SK/CS × Create/Edit/Display, absencia helperov ID/Name/Description, keyboard/scroll/viewport a nezmenený form state. Zachytiť reálny odoslaný POST body/query a následný GET záznam, nielen screenshot.

Mock browser testy a reálny BE reportovať oddelene. Mocked network browser test nie je dôkaz live podpory HMC/FlashSystem ani oprávnení prihláseného používateľa. Managed provisioning/push iba v výslovne autorizovanom testovacom prostredí; inak payload a zobrazenie BE permission chyby overiť cez mock, live side effects označiť nevykonané. Report obsahuje dátum, verzie/revízie FE/BE, prostredie, príkazy, scenáre pass/fail/blocked/not-run, request counts, payload/GET dôkaz bez secrets a zostávajúce obmedzenia. Nevykonaný live scenár sa nesmie označiť za hotový.

Akceptácia celku: obe nové polia prežijú Create/GET/Edit/POST/GET/Display; žiadna strata voliteľných hodnôt, pool podľa správneho target a bez duplicitného requestu pri platnej cache; oba compute typy používajú spoločný wizard, všetky existujúce locks/prefill/discovery scenáre ostanú funkčné; helpery sú kontextové v troch jazykoch; T7 focused testy aj skutočné T8 browser overenie sú zdokumentované. Schválenie tohto plánu je podmienkou začatia implementácie.
