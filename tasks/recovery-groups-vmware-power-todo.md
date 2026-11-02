# Recovery Groups – VMware + IBM Power: TODO

Stav: [plán](recovery-groups-vmware-power-plan.md) vykonaný inline. T1–T7 dokončené, T8 úspešne overené v reálnom Playwright prehliadači s mockovaným API. Live BE bol použitý iba na čítanie; OpenAPI dostupné, Recovery Groups GET vracia 401. Live zápisy/provisioning používateľ zakázal. Podrobné príkazy, výsledky a nevykonané scenáre sú vo [verification reporte](recovery-groups-vmware-power-verification.md).

Rozsah po review: VMware aj IBM Power iba s FLASHCOPY storage. HITACHI zostáva zámerne skryté v UI, spoločné typy a BE kontrakt sa nemenia; jeho discovery/validácia/provisioning ani testovacia matica nie sú súčasťou úloh či podmienkou dokončenia. Helpery iba pre technické parametre podľa Providers; ID/Name/Description bez helperov v Create/Edit/Display. Pool inventory je poradné, authorization zabezpečuje BE; bez mock permission gate.

`RG/` = `src/features/recovery-plans/recovery-groups/`, `RI/` = `src/features/discovery-inventory/resources/`. Cesty označené „nový“ ešte neexistujú. Každý krok má zostať v rozsahu S (1–2 súbory) alebo M (3–5). Ak potvrdenie kontraktu vynúti viac súborov, pred implementáciou krok ďalej rozdeliť. Testy regresie pridávať priebežne; T7 ich uzatvára, neodkladá všetko testovanie až na koniec.

Spoločná Definition of Done pre každý krok: splnené vlastné akceptačné kritériá, vykonaná uvedená focused validácia, diff bez nesúvisiacich zmien a ručných generated úprav, zaznamenané výsledky a obmedzenia. Pri TS/TSX zmenách navyše `npm.cmd exec eslint -- <zmenené-súbory> --max-warnings 0`, pri každom kroku `git diff --check`. Celá suite ani build sa nespúšťajú automaticky. Používateľ autorizoval implementáciu inline a atomické commity vlastných overených zmien. Git push a live provisioning sa nevykonávajú.

## T1 – Spoločné modely, state, validácia, API mapping

### T1.1 – Potvrdiť revidovaný rozsah a hranice BE

- [x] Zachovať existujúci FLASHCOPY filter pre obe platformy bez rozširovania storage podpory.
- [x] Rešpektovať email runtime fallback Local source/MM target; pool inventory nemá nový push gate, permission chybu vracia BE. Overiť `recovery/groups.py::upsert_recovery_group` a delegované nahradenie celého záznamu, nie PATCH.
- [x] Zaznamenať schválenie plánu; bez neho nezačať produkčné zmeny.

**Súbory:** oba tieto plánovacie dokumenty. BE iba čítať: `recovery/groups.py`, `api/routers/{recovery_groups,discovery,storage}.py`, `ibm_flashsystem/discovery.py`.
**Závislosti:** žiadne. **Rozsah:** S.
**Overenie:** každý záver má konkrétny zdroj; skontrolovať Providers helper vzor, mock zdroj usePermissions a skutočný upsert entry point. Bez živých side effects.
**DoD:** revidovaný plán schválený; odložené rozšírenia nie sú implementačnou závislosťou.

### T1.2 – Doplniť doménový stav a lifecycle nových hodnôt

- [x] Group aj Draft nesú notificationEmail/targetPool, initializeDraft obnoví uložené hodnoty a nové skupiny majú prázdny email/Automatic.
- [x] Udalosti zmenia iba príslušné hodnoty; source/mode/topology reset je vedomý a deterministický, refetch ani hydration nevymažú uložený pool.
- [x] Pushed/provisioned lock platí aj pre nové udalosti; provider zmena neprepíše email.

**Súbory:** `RG/model/recoveryGroupTypes.ts`, `recoveryGroupDraftLifecycle.ts`, `recoveryGroupDraftLifecycle.test.ts`, `resolveRecoveryGroupDraft.ts`, `resolveRecoveryGroupDraft.test.ts` (všetky v model/).
**Závislosti:** T1.1 – schválenie spoločných pravidiel. **Rozsah:** M.
**Overenie:** `npm.cmd exec vitest run src/features/recovery-plans/recovery-groups/model/recoveryGroupDraftLifecycle.test.ts src/features/recovery-plans/recovery-groups/model/resolveRecoveryGroupDraft.test.ts`.
**DoD:** round-trip inicializácie, source switch, mode switch, same-source refetch a lock udalostí majú focused testy.

### Checkpoint T1-A

- [x] Kontraktové riziká sú zapísané a nové polia žijú v existujúcom lifecycle, bez druhého state systému.
- [x] T1.2 focused testy a diff validácia prešli; implementačný rozsah ostáva FLASHCOPY.

### T1.3 – Normalizovať a mapovať voliteľné polia bez straty

- [x] Email trim/regex, blank → explicitné null; target name zachovaný, Automatic/Local/Existing → bez target_pool; Managed nikdy neposiela user CG/aux.
- [x] GET mapper, submit mapper, fallback group aj fallback JSON zahrnú nové hodnoty; unchanged Edit ich nestratí ani bez rawRecord.
- [x] Orchestration read-only body sa nepridáva do POST; query parametre ostanú nezmenené.

**Súbory:** `RG/api/recoveryGroupsValidation.ts`, `RG/api/recoveryGroupsValidation.test.ts`, `RG/helpers/mapRecoveryGroups.ts`, `RG/helpers/mapRecoveryGroups.test.ts`.
**Závislosti:** T1.2. **Rozsah:** M.
**Overenie:** `npm.cmd exec vitest run src/features/recovery-plans/recovery-groups/api/recoveryGroupsValidation.test.ts src/features/recovery-plans/recovery-groups/helpers/mapRecoveryGroups.test.ts`.
**DoD:** testy null/omitted/empty/whitespace/invalid/valid email, pool name vs ID a GET→Edit→POST; žiadna generated zmena.

### T1.4 – Zosúladiť topologické hranice a readiness

- [x] MM vyžaduje symetrický FLASHCOPY partner pár; legacy Local bez related storage ostáva funkčný.
- [x] Invalid email blokuje Details aj submit, nové polia rešpektujú locky; neoverený pool sa nikdy potichu nenormalizuje na Automatic.
- [x] Existujúci FLASHCOPY-only filter platí pre Local aj MM; inventory lookup nie je nová podmienka readiness pre push.

**Súbory:** `RG/utils/recoveryGroupTopology.ts`, `RG/utils/recoveryGroupTopology.test.ts`, `RG/model/recoveryGroupDraftReadiness.ts`, `RG/model/recoveryGroupDraftReadiness.test.ts`.
**Závislosti:** T1.3. **Rozsah:** M.
**Overenie:** `npm.cmd exec vitest run src/features/recovery-plans/recovery-groups/utils/recoveryGroupTopology.test.ts src/features/recovery-plans/recovery-groups/model/recoveryGroupDraftReadiness.test.ts`.
**DoD:** asymetria, nesprávny typ/credentials, legacy Local a email majú pozitívne aj negatívne prípady. Symetriu overiť v existujúcom topologickom validátore z allProviders bez ďalšieho provider managementu.

### Checkpoint T1-B

- [x] Model, normalizácia, readiness a mapper sú konzistentné pre obe platformy; focused testy prešli.
- [x] Keďže sa menia zdieľané TS kontrakty, vykonať `npm.cmd run typecheck`; chyby neumlčať assertions/suppression. Build/full suite nie sú potrebné pre tento checkpoint.

## T2 – Notification Email

### T2.1 – Pripojiť email do Details

- [x] Voliteľný vstup, field error a prístupné prepojenie na chybu; blank jasne vysvetľuje fallback.
- [x] Builder vedie hodnotu cez existujúci detailsChanged event; Edit hodnotu obnoví a clear odosiela null.
- [x] Create VMware, Power aj storage-only používajú rovnaké pole a read-only ochrany.

**Súbory:** `RG/components/RecoveryGroupDetailsStep.tsx`, `RecoveryGroupDetailsStep.test.tsx`, `RecoveryGroupBuilder.tsx`, `RecoveryGroupBuilder.test.tsx` (components/).
**Závislosti:** T1.3–T1.4, T2.2 pred odovzdaním funkcie. **Rozsah:** M.
**Overenie:** `npm.cmd exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupDetailsStep.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx`.
**DoD:** neprázdny platný, neplatný, clear a nezmenený Edit prejdú cez UI až po draft; native email validácia nekoliduje s wizard pravidlom.

### T2.2 – Doplniť email texty v troch jazykoch

- [x] EN/SK/CS majú label, placeholder, invalid hlášku a fallback/override vysvetlenie podľa runtime BE.
- [x] Nápoveda nesľubuje automatické odoslanie emailu pri samotnom save.

**Súbory:** `src/locales/en.json`, `sk.json`, `cs.json`, nový `src/locales/recoveryGroupFieldHelpTranslations.test.ts`.
**Závislosti:** T1.1, T1.3; koordinovať s T2.1. **Rozsah:** M.
**Overenie:** `npm.cmd exec vitest run src/locales/recoveryGroupFieldHelpTranslations.test.ts`; parser všetkých troch JSON.
**DoD:** texty bez chýbajúcich kľúčov/interpolácií; email helper integruje T4.1 a Display T6.1.

### Checkpoint T2

- [x] Email je jedna overená cesta UI→state→validated draft→POST, vrátane clear, pre obe platformy.
- [x] Focused testy a locale parity prešli; až následná implementačná browser fáza overí skutočný POST/GET.

## T3 – Metro Mirror Target Pool a cache reuse

### T3.1 – Overiť existujúcu ochranu pred obsolete výsledkami

- [x] Reprodukčným testom s QueryClient overiť target A→B a same-ID update/delete/recreate cez existujúci flashSystemInventoryQuery, AbortSignal a provider/credential invalidáciu.
- [x] Iba pri konkrétne zlyhávajúcom obsolete zápise zdôvodniť a vykonať najmenšiu opravu; bez automatického prenášania VMware guardu alebo plošného refaktoringu. Healthy cache ostatných providerov ostane dostupná.

**Súbory:** nový `RI/model/flashSystemInventoryQuery.test.ts`; `RI/model/inventoryQueries.ts` iba pri preukázanej chybe; prípadne `src/shared/query/providerMutationInvalidation.test.tsx` iba pre potrebnú regresiu.
**Závislosti:** T1.2. **Rozsah:** M.
**Overenie:** `npm.cmd exec vitest run src/features/discovery-inventory/resources/model/flashSystemInventoryQuery.test.ts src/shared/query/providerMutationInvalidation.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.prefetch.test.tsx`.
**DoD:** bez zmeny key/wire shape, zdokumentovaný výsledok late-response a delete/recreate testov; ak existujúce ochrany stačia, žiadna produkčná query zmena. Každá nevyhnutná oprava má konkrétnu reprodukciu a regresiu dotknutých spotrebiteľov.

### T3.2 – Vytvoriť pool observer nad existujúcou cache

- [x] Hook odvodí presný partner target a načíta pools cez spoločný factory, bez default-provider query a bez previous-target placeholder.
- [x] Fresh cache = nula dodatočných requests, concurrent load = jeden; missing/stale/invalid cache, empty/error/retry/VIEW_INVENTORY 403 majú odlišné stavy bez mock permission kontroly.
- [x] Explicitný live refresh, ak je súčasťou UI, obíde BE cache cez force_refresh a bezpečne publikuje pod normálny key; obyčajný retry sa nezamieňa s live refresh.

**Súbory:** nový `RG/hooks/useRecoveryGroupTargetPools.ts`, nový `useRecoveryGroupTargetPools.test.tsx` v hooks/; nový `RG/helpers/recoveryGroupTargetPools.ts` a jeho test iba ak je potrebná samostatná normalizácia/default kontrola.
**Závislosti:** T3.1, T1.4. **Rozsah:** M, najviac 4 súbory.
**Overenie:** `npm.cmd exec vitest run src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupTargetPools.test.tsx` a konkrétny nový helper test, ak vznikne. Použiť reálny QueryClient, počítať fetch calls, odložené promises A→B aj mutáciu revízie.
**DoD:** wire pools sa nemenia na cache s UI shape, nijaké duplikované API volanie pri platnom key; oneskorený A neovplyvní B.

### Checkpoint T3-A

- [x] Cache hit/miss, invalidácia, obsolete response, prázdna mapa a retry sú dokázané focused testmi.
- [x] Pool hook nemení formulár ako vedľajší efekt discovery a nepoužíva dáta iného providera.

### T3.3 – Pripojiť Target Pool do Topology

- [x] MM/Managed select má Automatic a pool.name options; Local/Existing pole nemajú a neposielajú target_pool.
- [x] Existujúci explicitný pool zostáva viditeľný aj pri error alebo odstránení; vedomý source switch resetuje s oznámením, partner update ponechá hodnotu neoverenú s upozornením na nový target kontext.
- [x] Potvrdený chýbajúci pool, stale/error inventory, VIEW_INVENTORY 403 a Automatic majú primeraný warning/retry; absencia aktuálneho lookup neblokuje save/push. Existujúce validácie/locky ostanú.

**Súbory:** `RG/components/RecoveryGroupTopologyStep.tsx`, `RecoveryGroupTopologyStep.test.tsx`, `RecoveryGroupBuilder.tsx`, `RecoveryGroupBuilder.discovery-lifecycle.test.tsx` (components/).
**Závislosti:** T3.2, T1.2–T1.4; T3.4 pred odovzdaním. **Rozsah:** M.
**Overenie:** `npm.cmd exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupTopologyStep.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.discovery-lifecycle.test.tsx`.
**DoD:** testy hydration vs user reset, source A→B, missing stored pool a Managed/pushed lock, payload hodnoty stále pokrýva T1.3.

### T3.4 – Lokalizovať pool stavy a overiť Automatic pre viac volumes

- [x] EN/SK/CS vysvetlia name vs ID, Automatic per-volume, absenciu automatického vytvorenia poolu a neoverené/chýbajúce/obnovované hodnoty.
- [x] Test dvoch volumes v rôznych source pooloch overí každý target názov; neznámy source pool nie je chyba „pool neexistuje“.

**Súbory:** `src/locales/{en,sk,cs}.json`, `src/locales/recoveryGroupFieldHelpTranslations.test.ts`, `RG/helpers/recoveryGroupTargetPools.test.ts` (vytvoriť, ak nevznikol v T3.2).
**Závislosti:** T3.2–T3.3. **Rozsah:** M.
**Overenie:** explicitné Vitest cesty na uvedené dva testy; JSON parser. Nepoužiť kapacitné údaje ako garanciu úspechu provisioningu.
**DoD:** výber explicitného poolu platí pre všetky volumes; Automatic kontroluje každý source pool; bez extra requestu iba pre informatívny hint.

### Checkpoint T3-B

- [x] Target Pool tvorí úplný slice UI/state/cache/POST/Edit; focused testy prešli.
- [x] Konfigurácia poolu a dostupnosť inventory ostávajú oddelené; save ani loading nevymaže hodnotu.

## T4 – VMware platform-specific správanie a helpery

### T4.1 – Zaviesť iba mapovanie kontextu do existujúcich helperov

- [x] Locale prefix odvodiť priamo podľa provider type s generic fallbackom; malý feature helper iba pri opakovaní medzi formom a Display, bez všeobecného field registry/resolveru.
- [x] Details použije KeyedHelpPopover iba pri Notification Email; Topology má pomoc pri technických vzťahoch podľa Providers label/ikona/gap-1.5 vzoru. ID/Name/Description bez helperov aj v Edit/Display; common a existing lookup help neduplikovať.
- [x] Help trigger neodosiela form, nemení field/dirty a nevyberá rodičovskú kartu.

**Súbory:** `RG/components/RecoveryGroupDetailsStep.tsx`, `RecoveryGroupTopologyStep.tsx`, `RecoveryGroupBuilder.tsx`; `RG/helpers/recoveryGroupFieldHelp.ts` a jeho test iba ak je potrebný opakovane používaný výber prefixu.
**Závislosti:** T2, T3; využíva texty T2.2/T3.4. **Rozsah:** M.
**Overenie:** focused Details/Topology testy, helper test iba ak vznikne; integračné locale kľúče validované v T4.3. Negatívne assertions pre helpery ID/Name/Description doplní T7.2.
**DoD:** nepribudne nový help systém ani platform state; neznámy provider a zmena platformy majú deterministické texty a rovnaké umiestnenie/správanie ikony ako Providers.

### T4.2 – Pripojiť VMware nápovedu na compute/resources a spoločné kroky

- [x] Provider, VM selection a related volumes vysvetlia vCenter, existujúci VM scope a VMFS NAA/backing storage väzby.
- [x] Policy Set, orchestration provider/toggle a CG/auxiliary dostanú technickú pomoc s rovnakým kontextom; súvisiace vstupy zdieľajú jeden helper, existujúci lookup helper sa neduplikuje.
- [x] VMware server search, prefix/tag, exclusions a Existing prefill ostanú bez funkčných zmien.

**Súbory:** `RG/components/RecoveryGroupProviderStep.tsx`, `RecoveryGroupResourcesStep.tsx`, `RecoveryGroupPolicySetStep.tsx`, `RecoveryGroupOrchestrationStep.tsx`, `RecoveryGroupBuilder.tsx`.
**Závislosti:** T4.1, T4.3 pre texty. **Rozsah:** M.
**Overenie:** `npm.cmd exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupProviderStep.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetStep.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupOrchestrationStep.test.tsx`.
**DoD:** pomoc sa integruje bez zmeny discovery mechanizmu; CG/auxiliary pokryť existujúcim lookup blokom a doplniť iba chýbajúce vysvetlenie, nie ikonu na každý volume riadok. Bez prepisovania field komponentov.

### T4.3 – Dodať VMware a spoločné help texty

- [x] Vybrané T4 technické parametre majú EN/SK/CS kľúče v existujúcej trigger/title/intro/section konvencii; žiadne help kľúče pre ID/Name/Description.
- [x] Text odlišuje save, Managed provisioning a push DAG; spoločné vysvetlenie sa neduplikuje pri súvisiacich vstupoch.

**Súbory:** `src/locales/{en,sk,cs}.json`, `src/locales/recoveryGroupFieldHelpTranslations.test.ts`.
**Závislosti:** T4.1; koordinovať s T4.2. **Rozsah:** M.
**Overenie:** `npm.cmd exec vitest run src/locales/recoveryGroupFieldHelpTranslations.test.ts`; JSON parser.
**DoD:** kompletná common/generic/VMware vetva, žiadne doslovné locale kľúče v UI.

### Checkpoint T4

- [x] VMware helpery aj generický fallback sú zapojené, pôvodný discovery/search je zachovaný a príslušné focused testy prešli.
- [x] Doplnenia testov spoločných komponentov nad rozsah kroku zaradiť do T7.2, krok nesmie predstierať zatiaľ nevykonanú browser kontrolu.

## T5 – IBM Power platform-specific správanie a helpery

### T5.1 – Doplniť Power kontext a lokálne testy prepínania

- [x] IBM_POWER provider prepne help na HMC/LPAR/VFC WWPN a storage väzby; bez providera ostane generic, zmena providera okamžite prepne text.
- [x] LPAR partitionName/prefix/metadata a discovery používajú existujúcu cestu; žiadne VMFS/vCenter tvrdenia v Power vetve.
- [x] Help open/close nevyvolá providerSelected/resource selection ani dirty update.

**Súbory:** nový `RG/components/RecoveryGroupFieldHelp.test.tsx`; `RG/helpers/recoveryGroupFieldHelp.ts` a jeho test iba ak vznikli v T4.1; `RecoveryGroupBuilder.tsx` iba ak treba dopojiť kontext, `RecoveryGroupProviderStep.tsx` iba ak sa nedá využiť existujúci prop.
**Závislosti:** T4.1–T4.3. **Rozsah:** M, najviac 5 súborov.
**Overenie:** explicitná Vitest cesta na nový component test a prípadný feature helper test; existujúci `RG/hooks/useRecoveryGroupResourceInventory.test.tsx` pre LPAR regresiu.
**DoD:** platformovo rozdielny obsah funguje v tom istom wizardi; žiadna duplikácia komponentov či discovery hooks.

### T5.2 – Dodať Power texty a hranice podporovaných scenárov

- [x] EN/SK/CS Power vetvy pokrývajú compute, LPAR a volumes; common texty sa neduplikujú.
- [x] Matica Local/MM Existing/MM Managed je rovnaká pre VMware/Power s FLASHCOPY a nevyžaduje rozšírenie storage podpory.

**Súbory:** `src/locales/{en,sk,cs}.json`, `src/locales/recoveryGroupFieldHelpTranslations.test.ts`.
**Závislosti:** T5.1, T1.1. **Rozsah:** M.
**Overenie:** locale parity test a JSON parser; obsah porovnať s BE discovery vetvou, nie so všeobecným predpokladom o Power.
**DoD:** žiadny Power helper nesľubuje neoverenú storage alebo provisioning podporu.

### Checkpoint T5

- [x] Generic/VMware/Power vetvy a spoločné texty existujú v troch jazykoch; provider switch a nezmenený form state majú focused dôkaz.

## T6 – DetailView a EN/SK/CS lokalizácie

### T6.1 – Zobraziť uloženú konfiguráciu s labelHelp

- [x] Email override/fallback, topology/mode/source/target a Managed target pool sú čitateľné aj bez úspešného live inventory; chýbajúci uložený pool ostáva zobrazený.
- [x] DetailField.labelHelp používa KeyedHelpPopover podľa ProvidersCatalogueTable a uložený compute provider kontext iba pri technických parametroch; unresolved má generic fallback, ID/Name/Description sú bez helperov a súvisiace vysvetlenia sa neduplikujú.
- [x] Globálna nápoveda, pôvodné overview/orchestration/inventory/JSON a Managed odvodené CG/aux hodnoty ostanú zachované.

**Súbory:** `RG/components/RecoveryGroupsTable.tsx`, `RecoveryGroupsTable.test.tsx`, `RecoveryGroupsTable.orchestration.test.tsx`; najviac jeden príslušný existujúci status komponent a jeho test, ak tam pole patrí.
**Závislosti:** T2–T5. **Rozsah:** M.
**Overenie:** explicitné Vitest cesty na Table a orchestration testy; test Display bez live inventory a rawRecord-free group.
**DoD:** Display netvrdí, že konfigurovaný pool je aktuálne dostupný; labelHelp nemá vedľajší účinok a pre email nepomýli uložený override s fallback adresou.

### T6.2 – Uzavrieť locale paritu a zobrazenie BE permission chýb

- [x] Všetky help/field/error/display kľúče majú EN/SK/CS paritu, správny platformový fallback a žiadne neoverené BE tvrdenia.
- [x] Zobraziť skutočnú BE 403/permission chybu pre Managed push cez existujúcu submit error cestu; usePermissions/mockPermissions nie sú authorization gate a save-only sa provisioning permission neblokuje.

**Súbory:** `src/locales/{en,sk,cs}.json`, `RG/pages/RecoveryGroupBuilderPage.test.tsx`, `RG/pages/RecoveryGroupEditorPage.test.tsx`. Najprv overiť existujúce submit error zobrazenie; ak potrebuje cielenú produkčnú opravu, rozdeliť ju do samostatného kroku s focused testom, nie pridávať permission gate do buildera.
**Závislosti:** T6.1, T1.1; existujúci locale parity test spustiť bez nutnej úpravy. **Rozsah:** M.
**Overenie:** `npm.cmd exec vitest run src/locales/recoveryGroupFieldHelpTranslations.test.ts src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.test.tsx src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.test.tsx`; JSON parser. Simulácia BE 403 overí zobrazenie chyby, nie oprávnenia používateľa.
**DoD:** BE permission chyba je čitateľná, save-only ostáva dostupný; neexistuje gate založený na mock permissions. Skutočná FE permission integrácia je mimo rozsahu.

### Checkpoint T6

- [x] Create/Edit/Display pokrývajú rovnakú uloženú konfiguráciu; všetky texty prešli paritou a focused testmi.

## T7 – Unit/integration regresné testy

### T7.1 – Uzavrieť API a lifecycle regresnú maticu

- [x] Oba compute typy majú GET→Edit unchanged/clear→POST test pre email/pool; query provider_id/push sú zachované.
- [x] Local/Existing/Managed payload hranice, legacy Local, source/provider switch a pushed/provisioned locky sú pokryté.
- [x] Cache reuse je overený cez shared QueryClient a počet requests, nie mockovaný výsledok hooku.

**Súbory:** `RG/helpers/mapRecoveryGroups.test.ts`, `RG/api/recoveryGroupsValidation.test.ts`, `RG/hooks/useRecoveryGroups.test.tsx`, `RG/model/recoveryGroupDraftLifecycle.test.ts`, `RG/hooks/useRecoveryGroupTargetPools.test.tsx`.
**Závislosti:** T1–T6. **Rozsah:** M, iba chýbajúce prípady; neopakovať testy už dokončené v slices.
**Overenie:** `npm.cmd exec vitest run` s explicitnými piatimi uvedenými cestami.
**DoD:** zistené chyby sa opravia v samostatnom malom kroku, bez znižovania assertions alebo vynechávania testov.

### T7.2 – Uzavrieť UI/help a discovery regresiu

- [x] Testy chránia Existing prefill/manual override/exclusions aj standalone FlashSystem flow.
- [x] VMware search/scope a Power LPAR výber ostávajú funkčné; technická pomoc nemení form state, locale prepnutie mení text; ID/Name/Description nemajú helper v Create/Edit/Display a súvisiace vstupy nemajú duplicitnú pomoc.
- [x] Nedostupný/odstránený pool a chyby inventory nepremapujú Edit na Automatic; stale/error/VIEW_INVENTORY 403 ani Automatic nepridávajú push gate.

**Súbory:** `RG/components/RecoveryGroupFieldHelp.test.tsx`, `RecoveryGroupBuilder.discovery-lifecycle.test.tsx`, `RecoveryGroupResourcesStep.integration.test.tsx` (components/), `RG/hooks/useRecoveryGroupResourceInventory.test.tsx`, `RG/utils/reconcileMetroMirrorPrefill.test.ts`.
**Závislosti:** T7.1. **Rozsah:** M.
**Overenie:** explicitné Vitest cesty na uvedených päť testov; `npm.cmd run typecheck` pre integrované zmeny TS kontraktov; lint iba zmenených TS/TSX.
**DoD:** žiadne regresie v dotknutých flows; všetky neoverené live scenáre ostanú otvorené, odložená storage podpora nie je testovacia závislosť.

### Checkpoint T7

- [x] Relevantné focused testy a integrovaný typecheck prešli; plná suite/build sa spustia len pri odôvodnenom cross-cutting dopade alebo výslovnej požiadavke.
- [x] Skutočné browser overenie stále čaká na T8; Vitest sa zaň nevydáva.

## T8 – Playwright browser E2E a finálna integrácia

Overené proti lokálnemu FE a mockovanému API; checkboxy v tejto fáze nepotvrdzujú live provisioning ani live POST. Šesť platform/topology kombinácií, pool edge cases, BE 403, EN/SK/CS a viewport/focus/form-state kontroly prešli. Prístup na BE `10.99.99.53:8000` bol podľa používateľa výlučne read-only.

### T8.1 – Pripraviť reprodukovateľný Playwright probe

- [x] Overiť dostupný Playwright runtime a browser; reuse konvencie existujúcich scripts/qa s PLAYWRIGHT_MODULE, alebo zdokumentovať potrebné doplnenie runnera.
- [x] Script zachytáva requests/payload/query/GET výsledok, počty inventory calls, screenshots a konzolové chyby bez secrets; mock a live režim majú odlišné výsledky.
- [x] Žiadny predvolený live Managed push/provisioning; live side effects iba v schválenom testovacom prostredí.

**Súbory:** nový `scripts/qa/verify-recovery-groups.mjs`, nový `tasks/recovery-groups-vmware-power-verification.md`; prípadné runner/config súbory až po samostatnom zdokumentovanom rozhodnutí, najviac 5 súborov na krok.
**Závislosti:** T7; autorizované prostredie pre live vetvu. **Rozsah:** S, prípadný runner setup samostatný M krok.
**Overenie:** `node --check scripts/qa/verify-recovery-groups.mjs`; spustiť probe cez `node scripts/qa/verify-recovery-groups.mjs` s nakonfigurovaným FE/BE a runtime podľa finálneho script rozhrania, reálne otvoriť browser.
**DoD:** report rozlišuje executable probe, vykonaný browser beh a live výsledok; samotné vytvorenie scriptu nie je E2E pass.

### T8.2 – Vykonať VMware a Power browser maticu

- [x] VMware + FLASHCOPY Create/Edit Local, MM Existing/Managed, VM/volumes; overiť príslušné skutočné POST/query a GET po uložení.
- [x] Power + FLASHCOPY Create/Edit Local, MM Existing/Managed, LPAR/volumes; overiť príslušné skutočné POST/query a GET po uložení.
- [x] Notification Email nastavenie/clear/fallback Local source/MM target; error/skipped push vrátane BE 403, read-only locks a zachovanie voliteľných polí. Mocked side effects odlíšiť od skutočného BE uloženia.

**Súbory:** QA script a výsledkový dokument z T8.1. **Závislosti:** T8.1. **Rozsah:** S.
**Overenie:** skutočný Playwright browser run; do reportu uložiť presný príkaz, prostredie, revízie, scenáre a dôkazy payload/GET bez secrets.
**DoD:** každý scenár v schválenej FLASHCOPY matici má pass/fail/blocked/not-run; nevykonaný live push nesmie byť pass a mockovaný 403 nie je dôkaz reálnej authorization.

### Checkpoint T8-A

- [x] Browser sa reálne spustil, obe compute platformy majú evidenciu a mock/live scenáre sú jasne oddelené.
- [x] Zistené chyby sa pred ďalším overením odstránia focused opravou; opakovať len dotknuté scenáre.

### T8.3 – Vykonať cache/help browser maticu a odovzdať výsledky

- [x] Pools: Automatic/explicit, správny target, warm cache bez dodatočného requestu, source switch a oneskorená odpoveď, loading/error/retry, odstránený pool, zachovanie Edit a Automatic pri viacerých source pooloch; poradné warningy rozlišujú neexistenciu, neaktuálne/nedostupné inventory a VIEW_INVENTORY 403 bez tvrdého push gate.
- [x] Help pri technických parametroch: generic/VMware/Power × EN/SK/CS × Create/Edit/Display; ID/Name/Description bez helperov, súvisiace vstupy bez duplicitnej pomoci; provider switch mení text, open/close nemení draft, klávesnica/Escape/focus, scroll a malý viewport podľa Providers vzoru.
- [x] Zdokumentovať vykonané príkazy, dôkazy a nevykonané live scenáre; prejsť finálne akceptačné kritériá plánu a zostávajúce BE závislosti.

**Súbory:** QA script a výsledkový dokument z T8.1; tento TODO dokument pre pravdivé uzatvorenie splnených položiek.
**Závislosti:** T8.2. **Rozsah:** M.
**Overenie:** reálny Playwright run, request counts a uložené výsledky; `git diff --check`. Plná suite/build iba ak vznikne konkrétny dôvod, v reporte uviesť či boli spustené.
**DoD:** všetky potvrdené výsledky sú reprodukovateľné; bezpečne nevykonané live zásahy sú výslovne uvedené a príslušné checkboxy ostanú otvorené. Odložené storage rozšírenie dokončenie neblokuje.

## Finálny checkpoint

- [x] Nové polia prežijú Create/GET/Edit/POST/GET/Display a explicitné vymazanie má správny význam.
- [x] Cache reuse a ochrany pred starými výsledkami sú dokázané focused testmi aj browser request počtami.
- [x] Spoločný wizard, pôvodné discovery/prefill/locks a globálna nápoveda ostali funkčné, EN/SK/CS helpery sú kompletné.
- [x] T8 report uvádza skutočne vykonané aj blokované scenáre; otvorené závislosti nie sú skryté pod tvrdením „hotovo“.
