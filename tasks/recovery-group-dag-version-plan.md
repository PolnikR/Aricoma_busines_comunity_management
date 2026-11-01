# Plán: DAG Template Versioning pre Recovery Groups

Dátum: 2026-11-01. Stav: návrh na review; bez implementácie.
Checklist: [recovery-group-dag-version-todo.md](recovery-group-dag-version-todo.md).

## Rozsah a dôveryhodnosť analýzy

Overený lokálny FE HEAD `32fa1e19`, BE `../abco-be` HEAD `f409984`.
Oba pracovné stromy boli na začiatku čisté. Nový endpoint a nové polia už sú
v lokálnom OpenAPI aj generated klientovi; nejde o požiadavku na regenerovanie.
Nasadený server sa nekontaktoval a runtime API sa netestovalo.

Používateľ požadoval Rel.AI. V relácii nie je dostupný jeho nástroj. Pripojený
CodeGraph bol oslovený ako prvý pre FE, ale vrátil `Transport closed`; dôkazy
nižšie preto pochádzajú z priameho čítania aktuálnych súborov oboch checkoutov.
Nejde o analýzu vykonanú cez Rel.AI. Nedostupnosť nástroja nebráni lokálnej analýze.

Táto úloha vytvára iba tento plán a sprievodný TODO. Bez zdrojových zmien, BE zmien,
Orval generovania alebo spúšťania aplikačných testov/build. Existujúce plány,
vrátane `tasks/plan.md` a `tasks/todo.md`, sa neprepisujú. Používateľ výslovne určil
samostatné markdown výstupy, preto sa pre tento plán nezakladajú tracker issues.
Pred implementáciou znova overiť pracovné stromy a aktuálny kontrakt.

V ďalšom texte `RG` znamená `src/features/recovery-plans/recovery-groups`, `RA`
znamená `src/features/recovery-plans/recovery-applications`. V TODO sú rovnaké skratky.

## 1. Overený BE a generated kontrakt

| Zdroj / funkcia | Zistenie a dôsledok |
| --- | --- |
| BE `apache_airflow/template_versions.py`, `GROUP_TEMPLATES`, `DEFAULT_GROUP_TEMPLATE_VERSION` (103–160) | Registry obsahuje iba FlashCopy v1 a Hitachi v1. Obe majú dnes default v1; FE nesmie túto hodnotu zakódovať ako pravidlo. Budúce v2 testovať ako katalógový fixture. |
| Rovnaký súbor, `group_platform`, `resolve_group_template`, `list_group_templates` | BE používa platformy `flashcopy`/`hitachi`. `group_platform` vracia hitachi iba pre HITACHI, inak flashcopy. Resolver zachádza aj s prázdnym stringom ako s defaultom. Tento BE fallback sa nemá kopírovať na FE pri neznámom providerovi. |
| BE `api/routers/recovery_groups.py`, `get_group_dag_template_versions` (54+) | Voliteľný parameter platform; bez neho vracia všetky platformy. Oprávnenie VIEW_RECOVERY_GROUPS. Neznáma platforma znamená HTTP 400. |
| BE `recovery/groups.py`, `RecoveryGroup`, `group_template_platform`, `validate_recovery_group` (63, 145–170) | Konfigurované `dag_template_version` je nullable. Platformu určuje `provider_id_volume`, nie compute provider, Airflow provider alebo Metro Mirror auxiliary. Lock sa kontroluje pred verziou, verzie sa kontrolujú pri Save aj Push. |
| BE `api/routers/recovery_groups.py`, `submit_recovery_group` (68–209) | Pred persistenciou vyhodnotí možnosti push. Save bez push a skipped push majú `pushed=false`, bez nasadenej verzie. Reálny push zapisuje vyriešenú verziu do `orchestration.template_version`. |
| Rovnaký endpoint | Hitachi push je dnes `skipped` s dôvodom `group is not FLASHCOPY-backed`, hoci Hitachi šablóna je v katalógu. Registry položka neznamená dostupnú deployment capability. |
| Rovnaký endpoint, vetva HTTP 502 (198+) | Bežné zlyhanie prenosu odomkne skupinu. Výnimka: ak už tento request provisionoval Managed Metro Mirror, zlyhanie prenosu necháva persistovaný lock aj template_version. Neslobodno každé HTTP 502 mapovať na odomknutie. |
| BE `_unlocked_orchestration`, `rollback_group_from_orchestrator` (38+, 283+) | Rollback ok/partial nastaví pushed=false a odstráni template_version, zachová run_id aj konfigurované dag_template_version. Managed ok navyše vyčistí odvodené mená; partial ich môže nechať a FE provisioned lock preto môže zostať. Failed vracia 502, skipped nič neprepisuje. |
| BE `api/routers/_test_recovery_groups.py` | Existujú testy default/explicit verzie, Save bez push, skipped, obyčajný/managed failure, rollback a kompatibility starého FE body (726–976). Sú prečítané, neboli spustené. |
| FE `openapi/abco-api.json` | Endpoint `/get_group_dag_template_versions` (2944+), nullable polia RecoveryGroup/record a orchestration sú dostupné. |
| FE `src/generated/query/recovery-groups/recovery-groups.gen.ts` (164–264) | `getGroupDagTemplateVersions`, `useGetGroupDagTemplateVersions`, generated key/options už existujú. Key obsahuje params; platformy preto majú oddelené query záznamy. |
| FE `src/generated/query/zod/recoveryGroup.gen.ts`, `src/generated/query/zod/recoveryGroupRecord.gen.ts`, `src/generated/query/zod/getGroupDagTemplateVersionsParams.gen.ts`, `src/generated/query/zod/dagTemplateVersion.gen.ts` | Request/read polia sú optional nullable; DagTemplateVersion má platform, version, default, description. Platform je string, nie FE enum verzií. |
| FE `src/generated/query/responseSchemas.gen.ts` | GET katalógu je už registrovaný v runtime response validácii. Netreba nový fetcher ani nový parser. |

### Význam troch stavov

- **Požiadavka používateľa:** `dagTemplateVersion` vo formulári a `dag_template_version`
  na wire. Null znamená nasledovať default BE pri budúcom push.
- **Uložená verzia push:** `deployedTemplateVersion` z `orchestration.template_version`.
  Nie je to default aktuálneho katalógu ani číslo odvodené z requestu.
- **Autorita locku:** uložené `orchestration.pushed` a existujúce Managed provisioned
  indikátory. Prepínač „Push“ vo formulári predstavuje úmysel, nie dôkaz úspechu.

Pri starom pushed zázname bez template_version bude nasadená verzia „Neznáma“.
Nedopočítavať v1 ani aktuálny default. Pri pushed=false bude „Nenasadené“, aj keby
starý/chybný record niesol zvyškové template_version. Raw JSON môže zachovať prijaté
polia; prezentačný model nesmie zvyšok prezentovať ako aktívne nasadenie.

BE Managed failure má významný kontraktový limit: pushed=true tu môže znamenať
ochranný lock po vytvorení objektov aj pri zlyhanom prenose DAG. FE zachová lock
a serverovú evidenciu verzie, zobrazí chybu push, ale nebude tvrdiť, že overil
prítomnosť/import DAG v Airflow. BE ani tento existujúci lifecycle sa nemení.

## 2. Overený FE stav a medzery

| Súbor / funkcia | Aktuálny stav a plánovaný zásah |
| --- | --- |
| `RG/model/recoveryGroupTypes.ts` | RecoveryGroup/Draft nemajú konfigurovanú ani nasadenú verziu. ReadRecord už cez generated typ vie nové polia niesť. Doplniť explicitné FE polia. |
| `RG/helpers/mapRecoveryGroups.ts`, `toRecoveryGroupReadRecord` | Spread už zachová nové BE polia; netreba vlastný parser. |
| Ten istý súbor, `mapRecoveryGroupApiRecord` | `common` mapuje run_id/pushed/provider_id, ale nie verzie. Doplniť spoločné mapovanie pre VM aj volume vetvu. |
| Ten istý súbor, `toRecoveryGroupSubmitPayload` | Explicitne skladá payload, takže dag_template_version sa dnes stratí. Doplniť ho bez zásahu do volumes/metro_mirror vetiev. |
| Ten istý súbor, `toRecoveryGroupJson`, `toRecoveryGroup` | Fallback JSON aj fallback submit projekcia verziu nepoznajú. Uložiť konfiguráciu, nasadenú verziu nikdy nevyrábať z draftu. |
| `RG/api/recoveryGroupsValidation.ts`, `ValidatedRecoveryGroupDraft`, `validateRecoveryGroupDraft` | Vracia whitelist polí; samotné doplnenie Draft typu nestačí. Preniesť nullable verziu a doplniť katalógové overenie pri submit hranici. |
| `RG/model/recoveryGroupDraftLifecycle.ts`, `initializeDraft`, `DraftEvent`, `transitionDraft` | Inicializácia verziu nekopíruje, neexistuje event na zmenu. Použiť existujúci reducer; event až za getDraftLocks guardom. |
| `RG/model/resolveRecoveryGroupDraft.ts` | Výsledok sa skladá cez spread raw draftu, takže nové pole prirodzene prejde. Nemeníme discovery identity, topology reconciliation ani prefill. Pridať regresné assertions. |
| `RG/model/recoveryGroupDraftReadiness.ts`, `getDraftReadiness` | canCreate overuje typ/provider/resources/policy/Airflow, nie katalóg. Pridať finálnu version gate, bez zablokovania navigácie do kroku s opravou verzie. |
| `RG/components/RecoveryGroupBuilder.tsx` (74–145, 340+) | Pozná všetkých providerov, výpočtový aj volume provider, finálny draft a krokové indexy. Tu zapojiť generated katalógový hook; orchestration child zostane prezentačný. |
| `RG/components/RecoveryGroupOrchestrationStep.tsx` | Má Push a Airflow selector; nemá volume platformu ani version selector. Nový selector bude v tomto kroku aj pri Push off. |
| `RG/model/resolveRecoveryGroupDraft.ts`, `getDraftLocks` | Pushed lock aj managedProvisionedLock už existujú. Builder fieldset a reducer ich rešpektujú; nezavádzať paralelný lock mechanizmus. |
| `RG/hooks/useRecoveryGroups.ts`, `submit` | Pri odpovedi mapuje returnedRecord, pri jeho absencii použije toRecoveryGroup(validated), ktoré dnes kopíruje request push flag. To nesmie slúžiť ako dôkaz deploymentu. |
| Generated submit/rollback mutation options | OnSuccess invaliduje list. Pri HTTP 502 táto cesta neprebehne a uložený BE stav môže zostať odlišný od FE cache. Potrebné cielené overenie neistého submitu. |
| `RG/pages/RecoveryGroupBuilderPage.tsx`, `RG/pages/RecoveryGroupEditorPage.tsx` | Volajú hook, držia dirty/error/result dialog. Editor už berie aktuálny group ako authority pre lock, ale inicializuje draft podľa id iba raz. Zachovať draft pri overovaní výsledku, nemaskovať pôvodnú chybu a nespúšťať automatický ďalší POST. |
| `RG/components/RecoveryGroupsTable.tsx` | Detail Overview a Orchestration neukazujú verzie. Dáta môžu ísť priamo z mapovaného selected group. Netreba query na každý riadok tabuľky. |

### Hitachi hranica existujúceho FE

`RG/config/recoveryGroupResourceOptions.ts` ponúka iba VMWARE, IBM_POWER a FLASHCOPY.
`RecoveryGroupWorkloadType` nemá Hitachi volume variant. `getRecoveryGroupTopologyError`
v `RG/utils/recoveryGroupTopology.ts` vyžaduje FLASHCOPY aj pre Local. Volume vetva
mapperu dnes označuje storage ako ibm_flashsystem a uznáva provider iba FLASHCOPY.
Preto samotná integrácia nového endpointu **neumožní kompletný Hitachi builder flow**.

Odporúčanie D1: tento plán implementuje rozlíšenie flashcopy/hitachi pri katalógu,
mapovanie/verzie existujúcich záznamov a pravdivý read-only detail. Neotvára nové
Hitachi resource/topology/discovery flow a neobchádza dnešný unresolved-provider guard.
Hitachi selector možno otestovať izolovane a katalógovo, ale nemožno jeho výsledok
označiť za overený Hitachi create/push end-to-end flow. Ak cieľ vyžaduje aj plne
editovateľné Hitachi skupiny, treba najprv samostatný prerequisite plán pre ich
existujúce FE obmedzenia; nejde o niekoľko versioning riadkov. Rozhodnúť pred implementáciou.

## 3. Opätovné použitie z Recovery Applications

Potvrdené referencie:

- `RA/components/DagTemplateVersionSelect.tsx`: už rieši default podľa katalógu,
  explicitné unknown verzie, loading, retry a chyby/nejednoznačný default.
  Je však natvrdo viazaný na app DOM id, `recovery.application.lifecycle.*` texty
  a `recoveryApplicationHelpKey` (compute platformy).
- `RA/components/RecoveryAppBuilder.tsx` (95–101): generated query podľa platformy,
  `enabled`, žiadne placeholder dáta z predchádzajúcej platformy, filtrovanie odpovede.
- `RA/utils/validateRecoveryApplication.ts`, `validateRecoveryApplicationTemplate`:
  pri neoverenom katalógu povoľuje iba Save bez push s null, ostatné blokuje;
  overený katalóg vyžaduje presne jeden default a členstvo explicitnej verzie.
- `RA/components/RecoveryApplicationsTable.tsx` (499+): odlišuje default config,
  explicit config, unknown deployed a not deployed. Rovnaký význam aj pre Groups.

### Odporúčaná minimálna spoločná časť

1. Presunúť prezentáciu selectoru do
   `src/shared/components/dag-template-version-select/DagTemplateVersionSelect.tsx`.
   Parametre pre existujúce value/templates/loading/error/disabled/callbacks zachovať;
   doplniť explicitné DOM `id`, prefix prekladov a voliteľný ReactNode pre help.
   Komponent nefetchuje, nepozná providers, topology ani lifecycle entity.
2. Pôvodný app komponent ponechať ako tenký adapter dodávajúci pôvodné app id,
   textový prefix a app help. Je to hranica dvoch používateľov, nie nový framework.
   App importy a správanie zostanú zachované; Groups nebudú importovať z app feature.
3. Malú čistú politiku platnosti katalógu/voľby vyňať do
   `src/shared/utils/dagTemplateVersion.ts`; bez prekladov, queries a Group/App modelov.
   Vstup: nullable version, push úmysel, overený platformovo filtrovaný katalóg.
   Výstup: valid / unverified / unknown. Pôvodný app validátor iba preloží výsledok
   na existujúci ValidationError. Groups použijú tú istú politiku s vlastnými textami.
4. Group-specific resolver volume platformy a adaptáciu chyby ponechať v
   `RG/model/recoveryGroupDagTemplate.ts`, nie v shared queries alebo compute helperoch.

Nekopírovať celý app selector, nepridávať generický wizard, query wrapper framework,
nový endpoint, všeobecný version registry ani novú knižnicu. Existujúce technické
help texty Power/VMware sa nesmú používať pre FlashCopy/Hitachi.

## 4. Dátový tok a invarianty

```text
GET groups → generated validácia → mapRecoveryGroupApiRecord
  ├─ dagTemplateVersion (konfigurácia) → initializeDraft → draft event
  └─ deployedTemplateVersion (iba pushed=true) → detail

effective draft → volume provider ID → providers[type] → flashcopy | hitachi
  → useGetGroupDagTemplateVersions({platform}) → filtrovaný katalóg
  → shared selector + shared validation → readiness.canCreate
  → submit boundary check → validated draft → toRecoveryGroupSubmitPayload
  → POST → returned record / overenie GET → aktuálna authority/cache → lock a detail
```

### Model a roundtrip

- RecoveryGroup: optional nullable `dagTemplateVersion` a `deployedTemplateVersion`
  pre kompatibilitu existujúcich callers/fixtures; API mapper normalizuje na null.
- RecoveryGroupDraft: optional nullable `dagTemplateVersion`, inicializovaný vždy
  na initialData.dagTemplateVersion ?? null. ValidatedRecoveryGroupDraft už má
  explicitne `dagTemplateVersion: string | null` a payload vždy pošle kľúč aj pri null.
- Nikdy neposielať `orchestration.template_version` z formulára. Patrí read modelu.
- Zachovať presný explicitný string a jeho case; neodstraňovať whitespace na
  podporovanú verziu. UI generuje iba hodnoty katalógu. Empty string zo starého
  recordu možno normalizovať na null v mapperi, pretože to zodpovedá BE resolveru;
  nevalidné neprázdne hodnoty uchovať a zobraziť ako unsupported.
- `toRecoveryGroupJson`: rawRecord vracia pôvodný wire record; fallback JSON musí
  mať oba verziovacie údaje podľa modelu. Fallback draft projekcia pozná iba
  konfigurovanú verziu, nemôže vytvoriť deployed verziu.

### Platforma, queries a zmena providera

- Pre volume skupinu zodpovedá provider_id_volume `draft.providerId`; pre VM
  skupinu `draft.relatedVolumeProviderId`. Rovnakú identitu používa mapper payloadu.
- Lookup v aktuálnom zozname providerov: FLASHCOPY → flashcopy, HITACHI → hitachi.
  Nikdy nepoužiť source compute typ, Airflow typ alebo Metro Mirror target provider.
- Chýbajúci/neznámy provider → platforma neoverená, hook disabled. Neodosielať GET
  bez parametra ako náhradný „all“ katalóg a nenahradiť neznámu platformu flashcopy.
- Použiť generated query key s platform, filtrovať každý record podľa platformy,
  vyžadovať unique default. Bez hardcoded v1 a bez sortovania verzií ako čísel.
- Loading/HTTP error/malformed response/empty katalog/0 alebo 2 defaults musia
  byť odlíšené od overenej nepodporovanej explicitnej verzie. Retry je obyčajný GET.
- Pri zmene storage providera zachovať zvolený explicitný string a znovu ho overiť
  voči novej platforme; bez tichého resetu na null. Neskorá odpoveď starej platformy
  nesmie validovať novú. Pri rovnakom type providera sa zachová rovnaký katalógový key.
- Pasívne načítanie katalógu ani zmena defaultu nesmú meniť draft alebo dirty stav.

### UI a validácia

- Selector v Orchestration kroku pri Push on aj off, nezávislý od stavu Airflow
  provider query. Chyba Airflow katalógu nesmie schovať možnosť opraviť DAG verziu.
- Version gate ovplyvní finálny Save/Push. Neovplyvní skoršie provider/resources
  kroky tak, aby znemožnila vstup do Orchestration a opravu vlastnej chyby.
- Pushed aj Managed-provisioned lock zakážu zmenu verzie v UI aj reducer evente
  a submit API hook odmietne aktualizáciu už známej read-only skupiny.
- Opätovne overiť verziu na submit hranici s aktuálnym katalógom správnej platformy;
  samotný disabled button nestačí. Použiť už overené query dáta, nevytvoriť druhý
  trvalý cache kľúč. Ak chýbajú, nevyrobiť lokálny default.
- Odporúčanie D3: zachovať app pravidlo — Save bez push a null je povolený aj pri
  výpadku/neoverenom katalógu; explicitná voľba alebo Push vyžadujú verified katalóg.
  Tak ostáva možný legacy Local draft bez storage providera. BE zostáva autoritou.
  Nezamieňať unknown catalog s unknown version v overenom katalógu.

### Default vs explicitný default (D2)

Existujúci app selector zobrazuje default verziu ako jednu položku a jej výber
mapuje na null. Explicitný uložený v1 sa pri otvorení nemení na null, ale tú istú
verziu nemožno v UI nanovo „pripnúť“, keď je práve defaultom.

Odporúčanie: prevziať toto správanie bez zmeny app UX; konkrétne nondefault verzie
sa vyberajú explicitne. Detail stále presne odlíši uložené explicitné v1 od null.
Pred UI implementáciou potvrdiť, či požiadavka „konkrétna verzia“ znamená aj
nové pripnutie aktuálneho defaultu. Ak áno, doplniť samostatnú default položku pre
Groups a explicitné položky všetkých verzií; nepremeniť pritom app správanie bez
schválenia. Rozhodnutie zaznamenať, neimplementovať potichu alternatívne UX.

## 5. Submit, failed push a rollback

| Udalosť | Očakávaný FE výsledok |
| --- | --- |
| Save bez push, legacy/missing version | Payload null, deployed=null, bez locku; ostatné existing validácie ostávajú. |
| Push success | Konfigurácia podľa draftu, deployed podľa returned record, lock podľa returned pushed=true. |
| Push skipped | Konfigurácia ostáva, deployed=null, pushed=false; existujúci skipped result dialog ostáva pravdivý. |
| Bežný push failure po persistencii | Pôvodný error ostane; read-only GET potvrdí uloženú verziu a pushed=false, FE nevyrába úspech. |
| Managed provision success + DAG transfer failure | Po GET zachovať pushed/provisioned lock podľa BE, mená, CG a verziu; neodomknúť len kvôli HTTP 502. |
| Rollback ok | Konfigurácia ostane; deployed=null. Managed odvodené polia sa vyčistia podľa BE, editovateľnosť určí existujúci resolver. |
| Rollback partial | Konfigurácia ostane; deployed=null, pushed=false; Managed odvodené objekty môžu naďalej blokovať editáciu. |
| Rollback failed/skipped | Nepredstierať vymazanie deployed verzie; vychádzať z aktuálneho uloženého stavu. |

Hook `submit` má pri pushed requeste bez returnedRecord najprv overiť konkrétny
record cez GET. Nepoužiť requestový push flag z fallback `toRecoveryGroup` ako
autoritu. Pri legacy non-push fallback zachovať konfiguráciu, ale nevytvoriť
nasadenú verziu. Test dnes výslovne očakávajúci fallback treba spresniť podľa vetvy.

Pre HTTP 502, network timeout a iný neistý výsledok po odoslaní Push vykonať iba
read-only overenie serverového recordu. Počas overovania zakázať opakovaný submit,
zachovať editovaný draft a pôvodný error. Hook môže vystaviť malé lokálne
`isVerifyingSubmission`, `verificationError`, `retryVerification`; nie nový
všeobecný save-completion framework. GET úspech aktualizuje authoritative raw
groups cache; chrániť zápis pred starším in-flight GET pre rovnaký generated key.
GET failure neoznačí skupinu za odomknutú a ponúkne retry overenia bez ďalšieho POST.

Editor nesmie pri tomto retry nahradiť existujúci builder full-page errorom a tým
zahodiť draft. Neprepisovať raw draft iba preto, že prišli nové query dáta;
aktualizovať authority pre lock existujúcou cestou `initialData`/`getDraftLocks`.
Pri Create po neistom uloženom push zabezpečiť rovnakú ochranu: už potvrdený
pushed record nesmie ďalej fungovať ako neuzamknutý nový formulár. Nesnažiť sa
domyslieť lock z chybovej anglickej vety alebo statusu result dialógu.

## 6. Detail a lokalizácie

Do existujúceho DetailOverview v `RecoveryGroupsTable.tsx` pridať dva DetailField:

- Konfigurovaná DAG verzia: explicitný string alebo „Predvolená verzia backendu“.
- Nasadená DAG verzia: pri pushed=true serverové číslo alebo „Neznáma verzia“;
  pri ostatných stavoch „Nenasadené“. Nepodmieňovať zobrazenie úspešným načítaním
  Airflow run detailu a nepridávať GET katalógu na každý row/detail.

Použiť `recoveryGroups.dagTemplate.*` pre selector, validation a detail a
`recoveryGroups.fieldHelp.template.*` pre help. EN/SK/CS majú zhodné kľúče a params.
Help vysvetľuje volume platformu, null ako default pri budúcom push a rozdiel
medzi konfiguráciou a uloženou verziou nasadenia. Netvrdí, že katalógový Hitachi
template dokazuje podporu push ani že version string dokazuje úspešný Airflow import.
Nemenia sa Local/Metro/Managed/Existing helpery ani ich workflow.

## 7. Fázy, súbory a overenie

Presné editovacie manifesty a príkazy sú pri T1–T11 v TODO; každý má najviac päť
implementačných/test súborov. Regresné súbory uvedené iba v overení netreba meniť,
ak nestratia platnosť. Každá úloha má cielené testy a samostatný commit.

```text
F1: T1 wire roundtrip → T2 draft lifecycle → CP1
F2: T3 shared selector → T4 shared validation → T5 group context/readiness → CP2
F3: T6 locales → T7 builder orchestration → CP3
F4: T8 authoritative submit → T9 pages/reconciliation → CP4
F5: T10 detail → T11 real-client lifecycle integration/browser → CP5
```

T3/T4 sú technicky nezávislé od T1/T2, ale odporúčame sekvenčné spracovanie kvôli
zdieľaným typom a testom. T6 má jediného vlastníka locale súborov. Nie je potrebné
paralelné editovanie ani subagenti. T8/T9 dokončiť v jednej fáze pred odovzdaním UI.

Cielené Vitest/RTL scenáre musia pokryť default/explicit/legacy, platformovo
oddelenú cache a oneskorené odpovede, zmenu providera, všetky výsledky Push a
rollback, callback bypass locku a Local/Metro varianty. Budúce explicitné verzie
testovať fixture katalógom, keďže aktuálny BE publikuje iba v1.

Pri shared extrakcii vždy spustiť existujúce app selector a app validator testy.
Po fázach cielený ESLint, locale JSON parse a `git diff --check`. Typecheck po
prepojení rozhraní a na konci: `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --incremental false`.
Celý `npm run build` ani `npm test` nie sú predvolené: build spúšťa kompletný lint,
typecheck, testy a API kontroly. Browser QA používa izolované prostredie a mock API;
žiadny skutočný storage provisioning/recovery alebo Push do Airflow.

## 8. Riziká a rozhodnutia pred implementáciou

| ID / riziko | Odporúčanie / opatrenie |
| --- | --- |
| D1: Hitachi nedostupné existujúce FE flow | Potvrdiť úzky versioning scope; plný Hitachi builder je samostatný prerequisite. Bez rozšírenia topology pravidiel v tejto úlohe. |
| D2: explicitné pripnutie aktuálneho defaultu | Odporúčané prevziať dnešné app UX. Ak treba aj explicitný default, rozhodnúť odlišnú group voľbu pred extrakciou selectoru. |
| D3: výpadok/neoverený katalóg | Odporúčané povoliť iba non-push Save s null ako v Apps. Explicit/Push blokovať. |
| Nové field sa stratí v whitelist/reducer/map | T1/T2 roundtrip cez skutočné validačné a mapper funkcie, nie iba type assertion. |
| Platforma compute vs volume vs auxiliary | Jediný feature resolver podľa identity použitej v provider_id_volume. Metro test s odlišným master/aux providerom. |
| Katalóg chybný alebo z iného providera | Filter platformy, unique default, generated key, žiadne placeholder dáta z inej platformy. |
| Stará deployed verzia po rollbacku | Aktívna verzia iba pri pushed=true; žiadne odvodzovanie z run_id ani configured version. |
| Pushed vs provisioned lock | Zachovať getDraftLocks a obidva guards. Partial rollback sa nemusí stať editovateľným. |
| 502 a stale authoritative cache | Read-only verify, pôvodný error/draft ostávajú, zákaz opakovaného POST do overenia. |
| Shared refactor zmení Apps | Zachovať app adapter a API; explicitné regresie default/unknown/outage/help/id. |
| Generated drift / cudzie zmeny | Aktuálny klient stačí; žiadne manuálne generated úpravy. Rozpracované zmeny od ďalších sessions zachovať. |

Plán treba pred implementáciou schváliť, vrátane D1–D3. Tento dokument ani jeho
commit neoprávňuje začať implementáciu; vyžaduje sa ďalší pokyn používateľa.
