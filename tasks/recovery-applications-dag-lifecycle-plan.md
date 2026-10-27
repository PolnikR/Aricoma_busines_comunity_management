# Recovery Applications: DAG lifecycle, rollback a template versions — PLAN

Stav: implementované inline po schválení `executing-plans inline`; výsledky verifikácie sú v TODO. Audit 2026-10-27. TODO: [recovery-applications-dag-lifecycle-todo.md](recovery-applications-dag-lifecycle-todo.md). Pôvodné plánovacie obmedzenie „iba dokumenty“ nižšie je historické; zákaz BE/generated/Group zmien, commitu a pushu zostáva platný.

## 1. Rozsah a pracovný stav

Iba tento PLAN a sprievodný TODO; žiadna implementácia, generovanie, BE úprava, commit ani push. Nemení sa wizard Details → Tiers → Policy Set → Orchestration, existujúce Recovery Groups ani pôvodný VMware/IBM Power plán. Notification Email UI, nové field helpery a filtrovanie skupín podľa source providera sú mimo rozsahu. Existujúci notificationEmail round-trip sa zachová.

FE HEAD pri audite: `50b1225a`. Worktree obsahuje rozpracované `openapi/abco-api.json`, generovaný recovery-apps klient, response registry a Zod modely; zmenené task dokumenty Save Completion, Group lifecycle, VMware/Power a selected orchestration; untracked nové schémy, Group QA skript a architektonické/QA dokumenty. Počas auditu pribudli aj zmeny `src/locales/{en,sk,cs}.json` z inej práce. Nič z toho tento plán neupravuje. Pred implementáciou obnoviť status a koordinovať lokalizácie. Nové cieľové dokumenty pred zápisom neexistovali; všeobecné `tasks/plan.md` a `tasks/todo.md` sa nepoužijú, pretože zadanie určuje nové názvy.

BE `C:/Users/polnikr/source/ABCO/abco-be`: čistý status, HEAD `7bcce3f`. Git čítaný s jednorazovým `-c safe.directory=C:/Users/polnikr/source/ABCO/abco-be`, bez zmeny konfigurácie. CodeGraph bol použitý najprv pre FE; BE nástroj označil za neindexovaný, preto BE audit pokračoval priamym čítaním. BE zostáva iba referenciou.

## 2. Aktuálny FE a reuse

Všetky skrátené cesty v ďalších kapitolách sú pod `src/features/recovery-plans/recovery-applications/`, ak nie je uvedené inak.

| Miesto | Overený stav / potrebná zmena |
| --- | --- |
| `components/RecoveryAppBuilder.tsx` | Štyri kroky; platforma odvodená od source providera, pri Edit zo stored lock. Fieldset a callbacky už blokujú edit počas Save/loading. Chýba pushed read-only a template selector. |
| `pages/RecoveryApplicationEditorPage.tsx` | GET list → výber podľa normalizovaného filename → mapper. Kľúč buildera je filename, takže refetch automaticky nepreinicializuje draft. `lockPushToOrchestrator` pri pushed vynucuje push, neblokuje celý Edit. |
| `components/RecoveryApplicationsTable.tsx` | Row menu aj detail footer umožňujú Edit. Display používa existujúci DetailView a shared selected-orchestration hook. Badge Active/Draft vychádza z počtu tiers, nie z pushed; nesmie rozhodovať o zámku. |
| `model/recoveryApplicationTypes.ts` | Vlastné form/wire/list typy nemajú verzie; API record používa starší `OrchestrationStateOutput`, ktorý neobsahuje template_version. |
| `helpers/mapRecoveryApplications.ts` | Rozbalí record.application, zachová rawRecord; pushed/provider/run mapuje samostatne. Nasadenú verziu nezverejňuje a fallback JSON používa starší orchestration typ. |
| `utils/recoveryApplicationFormMapper.ts` | Explicitný GET→form aj form→POST mapping vynecháva dag_template_version. Stored source/target a filename locks sa zachovajú. |
| `model/recoveryApplicationDraft.ts` | Inicializácia a source-change confirmation už existujú; vhodné miesto na reset nekompatibilnej verzie až po potvrdení zmeny. |
| `hooks/useRecoveryApplications.ts` | Generated GET/select a submit facade; submit success invaliduje list cez `void`, chyba neinvaliduje. Push failure môže napriek HTTP chybe uložiť record. |
| `hooks/useRecoveryApplicationSaveCompletion.ts` | Zachovať beginSave/failSave/completeSave, pending lock, unsaved guard, submitted provider context, presne jedno dokončenie a existujúci push dialog. |
| `hooks/useDeleteRecoveryApplication.ts` | Delete je samostatná operácia; pre pushed už robí delete s rollback. Nesmie slúžiť ako standalone rollback ani meniť svoj kontrakt v tomto scope. |
| `components/RecoveryApplicationRollbackResultModal.tsx` | Už pokrýva status, airflow, ibm, compute, vcenter a raw report cez ChecklistResultDialog. Reuse priamo pre nový rollback, bez extrakcie Group modalov. |
| `utils/rollbackReport.ts` | isRollbackClean hodnotí kvalitu reportu. `skipped` môže mať warning vizuál; o odomknutí rozhoduje BE stav, nie tento helper. |

Reuse: RowActionsMenu rollback slot, ConfirmDialog/loading, Select/Field/FetchErrorAlert/Retry, DetailView/DetailField/Badge, ChecklistResultDialog, existujúci Application rollback modal, generated hooks a query-key factories, `mapRecoveryApplications`, filename mapper, lockedProvidersOf, API error helpers a Save Completion. Group `RecoveryGroupsTable.tsx` + `RecoveryGroupRollbackResultModal.tsx` sú UX referencia (menu → confirm → pending → result → refresh), nie cieľ úprav.

## 3. Overený BE kontrakt

Referencie v BE: `api/routers/recovery_apps.py` (GET templates :94, submit :107, stored providers :445+, rollback :474+), `recovery/recovery.py` (model :41+, guard :91), `api/schemas.py` (AppOrchestrationState :394+), `apache_airflow/template_versions.py` (registry, defaults, validation). Čísla sú orientačné pre auditovaný HEAD.

| Operácia | Kontrakt a dôsledok |
| --- | --- |
| Submit Save aj Push | `validate_app_not_pushed` pred validáciou/persistenciou vracia 409 pri stored pushed=true, pre obe platformy. CREATE_RECOVERY_PLAN permission. |
| Templates GET | `platform=vmware` alebo `ibm_power`; parameter je technicky optional, bez neho všetky platformy. FE vždy filtruje platformou. VIEW_RECOVERY_PLANS; neznáma platforma 400. |
| Verzie | Registry dnes VMware v1 default, Power v1 default/v2. FE zoznam ani default nehardcoduje. Hodnoty sa porovnávajú presne, bez trimovania či zmeny case. |
| Request | `application.dag_template_version?: string | null`; null/absent znamená default. BE kontroluje podporu aj pri Save-only. |
| Push success | Stored `orchestration.pushed=true`, run_id a provider_id; `orchestration.template_version` je konkrétne vyrenderovaná verzia. Response obsahuje applications a orchestrator_push. |
| Push failure | Po chybe deploy BE prepíše uložený record na pushed=false bez template_version a vracia 502 so string detail `saved locally, but Airflow push failed: ...`. Nie je to rollback report ani úspešný completion. Zlyhanie pred persistenciou nemá znamenať uloženie. |
| Standalone rollback | POST `/rollback_app_from_orchestrator`, query required recovery_app_id, optional provider_id/compute_provider_id. Permission ROLLBACK_RECOVERY_PLAN. Úspech applications + rollback. Record sa neodstraňuje. |
| Provider resolution | Stored orchestration.provider_id je autoritatívny; explicitný rozdiel 409. Compute default je application.target_provider_id. Chýbajúci stored údaj bez override 400. Žiadny FE fallback airflow-01. |
| ok/skipped | BE uloží pushed=false, odstráni template_version a zachová run_id aj konfiguráciu vrátane požadovanej verzie. Pydantic read response môže odstránené optional pole serializovať ako null; FE musí akceptovať null aj absent. |
| partial/failed | HTTP 502 s `detail: { rollback: report }`; BE nezapisuje odomknutie, pôvodná nasadená verzia zostáva. Refetch, report a možnosť ďalšieho používateľom potvrdeného pokusu. |

Rollback route nemá vlastný pushed guard; pravidlo dostupnosti pre pushed je FE UX pravidlo. Server zostáva autoritou a rieši autorizáciu. **Existujúci FE `usePermissions` momentálne číta `mockPermissions`; nesmie sa použiť ako dôkaz reálneho `ROLLBACK_RECOVERY_PLAN` oprávnenia ani ako bezpečnostná hranica.** Kým nie je dostupný skutočný permission source, UI môže ponúknuť Rollback podľa pushed/pending stavu a BE HTTP 403 musí zrozumiteľne spracovať, bez odomknutia. Frontend nesmie tvrdiť odomknutie iba podľa úspešného HTTP alebo chýbajúcej report sekcie.

## 4. Orval API mapping a kontraktové hranice

Zdroj klienta: `src/generated/query/recovery-apps/recovery-apps.gen.ts`. Auditované schémy sú pod `src/generated/query/zod/`.

| API | Generated použitie | Typy / validácia |
| --- | --- | --- |
| GET /get_recovery_apps | `useGetRecoveryApps`, `getGetRecoveryAppsQueryKey()` | RecoveryAppsResponse(Output), RecoveryAppRecord(Output), RecoveryApplicationRecord |
| POST /submit_recovery_dag | existujúci `useSubmitRecoveryApplication` → submitRecoveryDag | RecoveryAppSubmission, RecoveryApplication, RecoveryAppSubmitResponse(Output), SubmitRecoveryDagBody |
| GET /get_dag_template_versions | `useGetDagTemplateVersions({ platform }, { query: { enabled } })`, `getGetDagTemplateVersionsQueryKey({ platform })` | GetDagTemplateVersionsParams, DagTemplateVersion(Output), DagTemplateVersionsResponse(Output) |
| POST /rollback_app_from_orchestrator | `useRollbackAppFromOrchestrator({ mutation: { ... } })`; `mutateAsync({ params: { recovery_app_id: app.id } })` | RollbackAppFromOrchestratorParams, návrat RecoveryAppsResponse; nejde o body payload |
| App orchestration | spotrebiteľský model prepnúť na AppOrchestrationStateOutput | run_id/pushed/provider_id/template_version optional a nullable |

`responseSchemas.gen.ts` už registruje oba nové endpointy. `validatingMutator` validuje úspešný payload a zachováva aj nepopísané fields; chyby HTTP prídu ako OrvalApiError so status/body (prípadne cez cause wrapper), nie ako úspešná Zod response. Pre 502 vybrať a `RollbackReport.safeParse` overiť `body.detail.rollback`; nespoliehať sa na samotné TypeScript pretypovanie. Chybný report → zrozumiteľná chyba/report unavailable, žiadne odomknutie.

T1 musí odlíšiť OpenAPI problém, generátor problém a spotrebiteľské FE mapovanie. Terajšie nové polia a endpointy sú v generated výstupe prítomné. Žiadna ručná generated oprava, spustenie api:update ani zmena OpenAPI v tomto pláne.

## 5. Read-only lifecycle

| Overený stav | Edit/Save/Push | Rollback | Display |
| --- | --- | --- | --- |
| Draft, pushed=false alebo legacy absent/null | Povolené pri existujúcich readiness/provider pravidlách | Nedostupný | Dostupný |
| pushed=true | Zakázané | Dostupný pri oprávnení a bez pending operácie | Dostupný |
| Rollback pending alebo stav po chybe ešte neoverený | Zakázané | Zakázaný do skončenia/reconciliation | Dostupný |
| Rollback ok/skipped + overený pushed=false | Povolené | Nedostupný | Dostupný |
| Rollback partial/failed + pushed=true | Zakázané | Možný potvrdený retry po settlement/refetch | Dostupný |

Pushed===true uzamyká zmeny vo wizardi a Editor handleSave, nie samotný vstup cez row Edit alebo drawer footer: podľa Recovery Groups ostáva Edit navigácia dostupná na read-only prehliadanie. Pending rollback/delete stále blokuje Edit. Zachovať provider locks nezávisle od lifecycle lock; run_id ani Active/Draft badge nie sú zámok.

Priama Edit URL: vynútiť čerstvý GET pri vstupe; kým sa nepotvrdí aktuálny stav, nepovoliť mutácie ani zo stale cache. Pri pushed zobraziť vysvetlenie a read-only konfiguráciu v existujúcom builderi, s navigáciou medzi krokmi a Back; skryť/zakázať Save a všetky editácie vrátane custom tier/drop/reorder callbackov. **V read-only režime musí byť možné prejsť všetky štyri kroky nezávisle od `detailsValid`, `tiersValid`, `policySetValid` či dostupnosti providerov, Recovery Groups alebo template katalógu.** `WizardSteps` disabled flags aj Next/canContinue musia v tomto režime obísť validačné brány, nie však ochranu mutácií. Nový `readOnly` stav nesmie reuse celej disabled fieldset tak, že znemožní čítať ďalšie kroky. Pri provider/template load chybe alebo stale/zmazanej referencii musí čítanie uloženej konfigurácie zostať dostupné; otestovať direct Edit URL aj kliknutie na každý krok.

Refetch draft→pushed okamžite uzamkne už otvorený editor. HTTP 409 zo Save/Push zablokuje ďalší submit, zobrazí BE vysvetlenie a vyžiada authoritative GET; iba overený draft môže znovu odomknúť. Failed refresh nesmie ponechať editovateľnú stale verziu po konflikte. Refetch nesmie bez rozhodnutia prepísať dirty draft; uložený stav riadi zámok, draft zostáva oddelený. Po rollbacku nový vstup do Edit použije čerstvé dáta, nie znovu použité initialData starého mountu.

## 6. Rollback UX a integrácia

List page vlastní malý Application-specific hook obalujúci generated `useRollbackAppFromOrchestrator` (bez novej HTTP vrstvy); table dostane onRollback, pending ID/stav a error/report výsledok. RowActionsMenu rollback slot nesmie závisieť iba od prítomnosti onDelete. Draft rollback sa nezobrazuje alebo je disabled s vysvetlením podľa existujúceho menu vzoru; nesmie byť vykonateľný.

1. Menu → Rollback pre pushed; zachytiť ID/názov, pri confirm znovu skontrolovať aktuálny record/pending.
2. ConfirmDialog: odstráni nasadený DAG a obnovené resources, konfigurácia aplikácie zostane uložená. Cancel nevykoná request.
3. Request iba `{ params: { recovery_app_id } }`. BE tak používa aktuálne stored Airflow aj target, bez stale override a bez source providera. Legacy missing ID sa vysvetlí cez 400; neponúkať náhodný provider fallback.
4. Pending: loadingLabel, zabrániť dvojitému potvrdeniu a súbežnému Delete/Rollback tej istej aplikácie. Nezapínať automatické mutation retry pre deštruktívnu operáciu.
5. ok/skipped: cache reconciliation, existujúci RecoveryApplicationRollbackResultModal, record zostane vybraný/v zozname. Partial/failed z 502: ten istý modal s validovaným reportom; BE error vysvetlenie; edit stále zakázaný. Skipped môže mať warning report, ale odomkne sa podľa stored pushed=false.
6. Report absent/malformed či network timeout: report unavailable alebo error + refetch; nepredpokladať neúspech ani úspech vzdialenej operácie. Retry iba explicitne, po opätovnom potvrdení.

Zachovať samostatný Delete aj jeho existujúci delete-with-rollback flow. Predvolene žiadna zmena Group komponentov, shared modal frameworku alebo existujúceho rollback quality helpera.

## 7. DAG Template Version UX a mapping

Krok 4, pod Airflow Provider: verzia + description z BE. Selector dostupný aj pri Save-only; push checkbox ho neresetuje. Pri jednej verzii jednoduchý select, pri viacerých rovnaký select s menom a description vybranej verzie. Žiadny nový krok ani field-help systém.

- Query platform mapovať explicitne zo source typu VMWARE→vmware, IBM_POWER→ibm_power; pri Edit použiť stored platform lock, aj keď provider zmizol. Unsupported/neznámy source neodosiela nekorektný query. Bez platformy query disabled.
- Form pole `dagTemplateVersion: string | null`; wire `dag_template_version`. Null reprezentuje úmysel nasledovať BE default. UI ponúkne „Predvolená verzia platformy (aktuálne …)“ odvodenú z flagu default, explicitné položky zachovávajú presný string. Žiadne automatické prepísanie uloženého explicitného výberu defaultom pri refetchi.
- Pri create bez hodnoty zostať na default/null, pri Edit zachovať explicitnú hodnotu alebo null/absent. Tým sa neprevedie legacy default na pevne pripnutú verziu bez používateľovej voľby. Default description sa odvodí z endpointu.
- Pri potvrdenej zmene platformy reset na null a načítať jej query; pri Cancel zachovať pôvodnú verziu. Zmena source providera v rovnakej platforme zachová hodnotu. Neskorá response pre predchádzajúcu platformu nesmie zmeniť nový draft; použiť platform-specific key, bez placeholder listu starej platformy.
- Loading/error/empty sú odlišné; Retry cez query.refetch, chyby nemenia draft. **Ak je katalóg nedostupný alebo neoverený a `dagTemplateVersion === null` (BE default), Save-only je povolený s jasným upozornením, že aktuálnu predvolenú verziu nemožno zobraziť/overiť; Push zostáva blokovaný do úspešného overenia.** Ak je verzia explicitne zvolená, pri neoverenom katalógu blokovať Save aj Push (bez tichého resetu alebo downgrade); uložená explicitná hodnota zostáva v drafte a Retry obnoví jej overenie. Chýbajúci alebo nejednoznačný default z odpovede je kontraktová chyba bez hardcoded v1 fallbacku; null Save-only možno zachovať ako uvedený bezpečný režim.
- Ak **explicitná** uložená verzia nie je v úspešne načítanom katalógu, zobraziť jej hodnotu a problém; Save/Push blokovať do explicitnej voľby podporovanej verzie/defaultu. Nevykonať tichý downgrade. Chýbajúci alebo viacnásobný default je kontraktový problém, nie dôvod hardcodovať v1; pri `null` platí vyššie uvedená výnimka pre Save-only s warning.

Zahrnúť typy wire/list/form, createApplicationDraft, source transition, getRecoveryApplicationDraftReadiness, submit-time validateRecoveryApplication a oba mappere. Readiness aj handleSave musia uplatniť **rovnaké pravidlo podľa režimu Save-only/Push a null/explicitnej verzie**; disabled Save sám nestačí. `dagTemplateVersion` sa prenáša cez toRecoveryApplicationData aj pri Save-only. Mapper GET musí zachovať null/absent semantics. Nasadená verzia patrí samostatne do list modelu ako napr. `deployedTemplateVersion`, nikdy do form selection ako náhrada konfigurácie.

## 8. Display a EN/SK/CS

V existujúcej Orchestration sekcii Application DetailView doplniť Airflow provider (name alebo stored ID), pushed badge, stored DAG run ID a verziu. Pri pushed zobraziť výhradne orchestration.template_version ako nasadenú. Pri legacy pushed bez nej „Neznáma“; nikdy fallback na konfigurovanú verziu. Pri draft zobraziť configured dag_template_version ako požadovanú alebo BE default; nasadenú verziu neukazovať ako aktuálnu.

Stored run_id po rollbacku možno zobraziť ako historický identifikátor bez aktívneho Airflow odkazu. Shared useSelectedOrchestrationDetails zámerne potláča aktívny run pri nepushed; doplniť Application DetailField lokálne, nemeniť shared Group správanie. Zachovať layout, badge a JSON rawRecord; fallback JSON musí zachovať aj nové polia. Tabuľka a jej drawer berú údaje z rovnakého aktuálneho modelu, bez náhrady doterajšieho status badge podľa tiers za lifecycle.

`src/locales/en.json`, `sk.json`, `cs.json`: readonly vysvetlenie, rollback potvrdenie/loading/permissions/errors, selector/default/description/unknown/unavailable/retry, configured/deployed label, historický run. Reuse existujúce rollback result texty. BE description zobraziť ako serverový obsah, nevymýšľať preklady hardcoded verzií. Doplniť test parity kľúčov a interpolácií, rešpektovať súbežné zmeny locales.

## 9. React Query a Save Completion

Generated list key je autorita pre GET, nie mapovaný UI array. `setQueryData` musí dostať raw response shape vrátane applications, nie výstup mapRecoveryApplications. Pred zápisom authoritative mutation response zrušiť starý in-flight GET, aby neskoršia stale response nevrátila pushed=true/false. Následne await invalidation/refetch; pri zlyhaní ponechať úspešnú authoritative mutation response a viditeľnú refresh chybu, neprezentovať rollback failure.

| Udalosť | Synchronizácia |
| --- | --- |
| Save-only success | Raw response → list cache, invalidácia GET; completion zachová existujúcu navigation a dirty reset. |
| Push success | Raw applications → cache ihneď; list/edit locked podľa pushed, nasadená verzia z BE. Existujúci OrchestratorPushResultDialog vrátane manual-only notes zostáva. |
| Push 502 / neisté zlyhanie | Invalidovať/refetch list aj na error; error nesmie volať completeSave ani false success dialog. failSave zachová dirty draft a umožní opravu po overení pushed=false. Ak Create už existuje lokálne, retry zostáva rovnaké ID; nesmie vytvoriť duplikát. |
| Save/Push 409 | Konfliktový lock do fresh GET, vysvetlenie v page, žiadny automatický opakovaný submit. |
| Rollback ok/skipped | Raw response → list cache, invalidate list a dotknuté inventory/run query; odomknutie z authoritative recordu. |
| Rollback 502/network/409 | Žiadny optimistic unlock; refetch list, report/errors podľa typu. Refetch error zachová konzervatívny lock a Retry. |

Pre rollback invalidovať existujúce `getGetRecoveryAppInventoryQueryKey` filtre pre dotknutý stored run a relevantné orchestration runs keys používané useLatestOrchestratorRun, po overení presných factory parametrov v T1. Nevyčistiť celú QueryClient cache ani cudzí provider/group inventár. Run ID sa nemení, preto samotná zmena selected ID nepomôže. Templates key vždy obsahuje platformu; Save/Push/Rollback nemení serverový katalóg, netreba ho plošne invalidovať.

Hook-level cache settlement musí fungovať aj keď konzument unmountne; neponechať kritickú invalidáciu len v per-call page callbacku. Zachovať beginSave synchronous duplicate guard, submitted provider URL context, blokovanie navigácie počas Save a once-only complete/dismiss. Čakanie na refetch nesmie interpretovať úspešne uloženú mutáciu ako zlyhanie persistencie.

## 10. Error handling a autorizácia

| Stav | UX / stav |
| --- | --- |
| 403 | Permission denied, bez odomknutia. BE `ROLLBACK_RECOVERY_PLAN` je autorita; VIEW, CREATE a ROLLBACK sú rozdielne permissions. Existujúce `usePermissions`/`mockPermissions` neposkytujú skutočnú autorizáciu: nepoužiť ich na falošný gate; bezpečné UX musí vysvetliť 403 a ponechať lock. |
| 409 submit | Aktuálny pushed stav sa zmenil: lock + fresh GET + vysvetlenie. |
| 409 rollback | Stored provider mismatch/stale state: vysvetlenie + refresh, žiadny fallback provider. |
| 502 rollback detail.rollback | Validovať report, zobraziť partial/failed, ponechať locked do overenia. |
| 502 submit string detail | Zobraziť „uložené lokálne, push zlyhal“ iba keď to detail/overený GET potvrdzuje; draft recovery/retry bez úspešného dialogu. |
| 400/404/422 | Chýbajúci provider, invalid verzia, absent app/validation: BE detail + refresh kde relevantný, nepredstierať rollback. |
| Network/contract error | Neistý výsledok; refresh/Retry, zachovať draft a zámok podľa poslednej potvrdenej autority. |

Použiť resolveUserFacingErrorMessage/extractBackendErrorDetail a OrvalApiError status/body/cause. Nezobrazovať používateľovi generovaný schema stack namiesto zrozumiteľnej správy. Bez automatických deštruktívnych retries.

## 11. Fázy, závislosti a súbory

Poradie práce po samostatnom schválení: T1 audit → T2 readonly → T3 standalone rollback → checkpoint lifecycle → T5a model/mapping → T4 selector/readiness (s T5b wire round-trip) → checkpoint versions → T6 display/locales → T7 regresie → T8 browser/final review. Číslovanie T1–T8 zo zadania je zachované; T5 základ musí predbehnúť T4. Každá väčšia úloha má v TODO malé podúlohy do približne piatich súborov vrátane testov, každý slice udržuje aplikáciu funkčnú.

Produkčné súbory predpokladané na úpravu: `model/recoveryApplicationTypes.ts`, `helpers/mapRecoveryApplications.ts`, `utils/recoveryApplicationFormMapper.ts`, `model/recoveryApplicationDraft.ts`, `model/recoveryApplicationDraftReadiness.ts`, `utils/validateRecoveryApplication.ts`, `components/RecoveryAppBuilder.tsx`, `pages/RecoveryApplicationEditorPage.tsx`, `pages/RecoveryApplicationsListPage.tsx`, `components/RecoveryApplicationsTable.tsx`, `hooks/useRecoveryApplications.ts`, prípadne `pages/RecoveryApplicationBuilderPage.tsx` pre špecifické push-error UX. Nový `hooks/useRollbackRecoveryApplication.ts` je tenký generated-hook adapter. Nový malý template selector komponent iba ak oddelí vlastné query/UI a umožní focused testy; nie generic framework.

Save Completion hook, Application rollback modal, rollback helper a shared orchestration komponenty sa predvolene iba reuse/testujú; meniť len pri konkrétnej nesplnenej akceptácii. Locales a konkrétne existujúce/nové testy sú uvedené v TODO. Žiadne generované ani Group súbory v implementačnom diff scope.

Paralelizácia je možná až po T1/T5 kontrakte: izolované modal/error testy a locale parity návrh; spoločné types/builder/table/cache zmeny sú sekvenčné. Tento plán nespúšťa agentov ani implementáciu.

## 12. Testovacia matica a akceptácia

| Oblasť | Vitest / wire | Mockovaný browser | Reálna BE integrácia |
| --- | --- | --- | --- |
| Read-only | draft edit, pushed menu/footer povoľujú prístup na read-only wizard, submit guard; stale cache, direct URL, fresh refetch, 409 | reload/Edit URL, čítanie všetkých krokov, mouse/keyboard/drop blok | Overiť GET/409 iba v schválenom test prostredí |
| Rollback request | iba app ID query, bez provider override/body; target sa neberie zo source; dve odlišné Airflow IDs | Confirm/Cancel, pending/double click, Delete oddelený | Stored provider/target resolution pre VMware aj Power |
| Rollback výsledok | ok/skipped, partial/failed 502, report parse, 403/409/400, malformed/network | report sekcie, app zostáva, unlock vs retry locked, failed refresh | Úspešný aj partial cleanup len s výslovným oprávnením |
| Templates | VMware v1, Power v1/v2, server default iný než v1, null/absent/explicit, unknown, loading/error/empty/Retry, neskorá response | krok 4, description, platform confirmation/cancel, Save-only zachová voľbu | GET katalóg a exact validation bez hardcode |
| Round-trip/display | GET→form→POST, deployed != configured, legacy pushed missing version, rollback retained run_id | configured/deployed labels, provider a history, JSON | Save/Push/GET/rollback/GET s kontrolou verzií |
| Lifecycle | create draft→save→push→read-only→rollback→edit→re-push; push 502 lokálne uložený | celý flow nad mocked API, error correction, žiadny duplicate record | Oddelená autorizovaná sada; neoznačiť mock za živý test |
| Regresie | completion lock/guard/dialog, Delete, provider locks, tiers/Power manual-only, EN/SK/CS parity | focus, loading, overflow a lokality, console/network | Existujúce infra smoke iba po oprávnení |

Testy písať s príslušným slice, T7 ich doplní a spustí ako regresnú sadu; neodkladať všetku verifikáciu na koniec. Príkazy a názvy súborov v TODO. Predvolene focused Vitest/ESLint, nie kompletná suite ani production build. `npm.cmd run typecheck` až pri cross-cutting model/wire checkpoint; build iba ak konkrétne zmeny alebo schválenie vyžadujú širší dôkaz.

Repo nemá package-level Playwright runner/dependency ani štandardný e2e adresár. Existujú `scripts/qa/*.mjs` s playwright-core runtime cez PLAYWRIGHT_MODULE, vrátane rozpracovaného Group skriptu. Navrhnúť samostatný Application QA skript podľa tohto vzoru, Group skript nemeniť. Pred spustením overiť runtime a browser; chýbajúci runtime uviesť ako blocker, neinštalovať infra počas plánovania. Browser fixtures zachytia všetky /api requesty a failnú neznámy endpoint, aby žiadna akcia nesmerovala na živý BE.

Definition of Done implementácie: všetky acceptance TODO splnené, focused testy a browser dôkazy zaznamenané, aplikácia zostáva po standalone rollback, locked partial/failed, bez zámeny configured/deployed, konzistentný refetch, EN/SK/CS, žiadne vedľajšie/generated/BE/Group zmeny. Reálne provision/rollback akcie len po explicitnom oprávnení. Tento plán ich nevykonáva ani neschvaľuje.

## 13. Riziká a otvorené rozhodnutia na kontrolu

| Riziko | Dopad | Mitigácia |
| --- | --- | --- |
| Súbežná práca v locales/Group/Orval | Vysoký | Nový status pred implementáciou; chirurgický diff, žiadne regeneration/reformat. |
| Stale GET prepíše mutation response | Vysoký | Cancel starého GET, raw cache update a riadený refresh; regression race test. |
| Push 502 už uložil record | Vysoký | Error reconciliation, zachovať ID/draft, existujúci failSave flow. |
| Partial report sa stratí v error formatteri | Vysoký | Oddeliť validáciu detail.rollback od textovej chyby a ukázať modal. |
| Read-only zablokuje čítanie wizardu | Stredný | `readOnly` obíde `WizardSteps.disabled` a Next/canContinue validačné brány aj pri chýbajúcich referenciách, nie mutation guards; testovať všetky kroky. |
| Default sa zmení alebo verzia zmizne | Stredný | Null default semantics, endpoint truth, explicit unknown state bez downgrade. |

Rozhodnutia po review: (1) Save-only umožňuje `dagTemplateVersion=null` a sleduje BE default; explicitná verzia je pripnutá. (2) Pri nedostupnom/nekonzistentnom katalógu **null Save-only povoliť s upozornením**, ale Push aj Save s neoverenou explicitnou verziou blokovať do Retry; BE zostáva autoritou validácie. (3) Pushed Edit z tabuľky/detailu aj priamou URL otvára čitateľný wizard: všetky kroky sú prístupné bez readiness validácie, všetky mutácie blokované. (4) Standalone rollback odosiela iba app ID; legacy record bez providerov nemá automatický fallback. (5) Skipped report môže zostať warning, odomknutie riadi pushed=false. (6) FE `mockPermissions` nie je autorizačný zdroj; Rollback HTTP 403 od BE sa musí zobraziť bez odomknutia.

Pred implementáciou: potvrdiť tieto UX rozhodnutia, dostupnosť browser runtime a prípadné test environment oprávnenie. Backend kontrakt pre tieto body nie je otvorený; ide o FE UX a test podmienky. Po vytvorení PLAN/TODO sa práca zastaví na review.

## 14. Verifikácia plánovacieho výstupu

Overené oba nové dokumenty: vzájomné odkazy, prítomnosť T1–T8, dependencies/verification/DoD v každej úlohe, encoding, vyvážené code fences a trailing whitespace. `git diff --check -- <oba dokumenty>` a samostatné `git diff --no-index --check -- /dev/null <dokument>` pre každý untracked súbor prešli. Skontrolovaný `git status --short` a `git diff --stat` FE aj status BE. BE zostal čistý. Počas auditu iná práca zmenila aj Group target-pools hook a jeho/topology testy; tento výstup ich neupravoval. Vlastné zápisy sú výhradne tieto dva nové dokumenty.

Vitest, Playwright, kompletná suite, typecheck ani production build neboli v plánovacej úlohe spustené. Žiadny commit ani push. TODO zostáva návrhom na samostatné schválenie.

## 15. Vykonanie po schválení — 2026-10-27

Používateľ vyžiadal executing-plans inline. Práca prebieha na existujúcej `spike/ant-design-shell`, bez worktree/branch/commitu/pushu. Pri obnovenom audite boli mimo týchto dvoch plánov všetky source súbory čisté; implementačný baseline HEAD `bea04841`. Pôvodné cudzie zmeny z plánovania už boli začlenené pred implementáciou. BE kontrakt bol znovu prečítaný bez úprav; testy nepoužívajú živé infra.

Pre-flight review: T2/T4 zdieľajú Builder (readonly oddelené od save/loading, navigácia zostáva aktívna); T3/T5c zdieľajú list cache (raw API shape, cancel starého GET, hook-level settlement); T4/T5 zdieľajú nullable form a template validáciu (mapping pred UI); T2/T5c zdieľajú Editor (fresh mount nesmie prepísať neskorší dirty draft); T3/T6 zdieľajú Table/modal (standalone odlíšený od Delete); T6/T8 zdieľajú texty a browser selektory (lokalizované labely). Každá úloha T1–T8 bola porovnaná so svojimi akceptáciami; žiadny konflikt brániaci začatiu. Schválené review rozhodnutia v §13 sú implementačné pravidlá.

Rulings počas vykonania:
- Minimal shared zmena: RowActionsMenu `delete` callback je optional a nevykresľuje Delete bez callbacku. Potrebné pre samostatný Rollback nezávislý od onDelete; žiadny Group komponent sa nemení.
- Application rollback modal má optional standalone prezentačný variant, aby existujúci Delete result zachoval názov a nový Rollback nebol označený ako deletion.
- Katalóg/verzia je optional nullable v compatibility form type, canonical nový draft a GET mapper používajú null; wire vždy prenesie null alebo explicitnú voľbu.
- Query seeded pri Create bez registrovanej queryFn sa iba invaliduje; mounted/unmounted queries s reálnou queryFn sa aj refetchnú. Zabráni sa Missing queryFn retry bez straty raw cache.
- Editor checking→verified key inicializuje draft z prvého čerstvého GET. Neskoršie refetche zachovajú dirty draft a aktualizujú len zámok.
- Starý test všeobecnej opravy po chybe používa HTTP 400; HTTP 409 má nové vlastné lock/reconciliation regresie a nesmie zostať testom voľného retry stale záznamu.

Focused red/green dôkazy: pôvodné pushed Edit/menu a chýbajúci Rollback testy boli red; nové model/source/version testy a cache settlement race testy boli red pred opravou. Browser zistil chýbajúci lokalizovaný push-502 saved-locally text, následne opravený. Kompletná test suite ani production build sa podľa projektových pravidiel nespúšťajú; konkrétne finálne výsledky sa doplnia do TODO.

Záverečné nezávislé review našlo tri material findings: Create po 409 bez recovery cesty, Create po neistom submit výsledku bez overenia a aktívny link na zachovaný historický DAG ID. Všetky tri opravené a opätovne skontrolované bez zostávajúcich material findings. Create registruje disabled list query a po 409/502/network chybe ponechá synchronous save lock do explicitného GET; iba overený absent/unpushed záznam ho odomkne, neúspech má Retry bez straty draftu. Table zachovaný run ID vykreslí ako text pri nepushed. Unknown stored platform sa nemapuje do template query: povolené sú iba VMWARE/IBM_POWER (case normalizované), regression red→green.

Výsledok finálneho focused runu: 24 súborov, 529 testov green; samostatná nová unsupported-platform regresia green. Mockovaný Edge: 21 scenario records green, žiadne neočakávané API/console/page chyby. Typecheck a focused ESLint green; detailné príkazy a artefakty v TODO. Skutočná BE integrácia nebola vykonaná, keďže nebola autorizovaná. Žiadny commit/push, BE/generated/Group diff je prázdny.
