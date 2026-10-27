# Recovery Applications – Phase 1 Functional Consistency: PLAN

## 1. Executive Summary

Stav: používateľ autorizoval vykonanie inline; implementácia a overenie sú zaznamenané v [TODO](recovery-applications-functional-phase1-todo.md). Nezávislé code/architecture review implementácie zostáva otvorené. Nasleduje auditovaný návrh: FE `1b0417fc`, BE `7bcce3f`, aktuálne súbory overené 2026-10-27. BE je použitý iba na čítanie. Checklist obsahuje 12 implementačných/overovacích taskov; ostatné plány zostávajú nedotknuté.

Potvrdené medzery: chýba editácia a FE validácia aplikačného emailu, eligibility skupiny neporovnáva konkrétny source provider, pri IBM Power v2 chýba FE validácia duplicitných vybraných LPAR, ktoré jeho BE DAG pri generovaní odmieta a readiness nepoužíva všetky pravidlá finálnej validácie. Navrhujeme rozšíriť existujúce čisté validátory a draft transitions, odvodiť z nich readiness aj konkrétne chyby a validovať ich nad už dostupnými dátami React Query bez ďalších GET requestov pri Save. Bez zmien BE, OpenAPI, generovaných súborov a Recovery Groups modulu.

Zachovať Create/Edit, Save-only/Push, read-only po Push, Rollback a verifikáciu lifecycle, provider locks, povinný Policy Set vo FE, environment Select a DAG version selector s jedinou default položkou. Phase 2 Help Popovers nie sú súčasťou práce. Po vytvorení dokumentov sa práca zastavuje; bez commit/push podľa explicitného zadania.

## 2. FE vs. BE contract audit

V tabuľke sú relatívne cesty v príslušnom repozitári; BE root je `C:/Users/polnikr/source/ABCO/abco-be`. Riadky odkazujú na auditovaný snapshot.

| Oblasť | Overený zdroj | Záver |
|---|---|---|
| Aplikačný email | BE `recovery/recovery.py:42–56`; FE `model/recoveryApplicationTypes.ts:128–142`, `utils/recoveryApplicationFormMapper.ts:45–65,104–123` v Recovery Applications | BE optional string s default `None`; FE drží `string | null`, Edit hodnotu zachová, submit ju dnes iba prekopíruje. |
| BE email validácia | BE `api/routers/recovery_apps.py:105–129`, `providers/provider.py:9,75–79` | `validate_notification_email(application)` sa volá pred persistenciou pre oba režimy. Regex `^[^@\s]+@[^@\s]+\.[^@\s]+$`; `None` a prázdny string prejdú, whitespace string nie. Nie je to Pydantic `EmailStr`. |
| Email fallback | Všetky tri BE `apache_airflow/dags/recovery_app*_template.py`, premenná `notification_email = app.get("notificationEmail")` | Aplikačné DAGy používajú aplikačný email. Fallback Recovery Group → volume provider patrí skupinám, nie aplikáciám; nezavádzať ho. |
| Source mapping | FE `utils/recoveryApplicationFormMapper.ts:77–101`; RG `helpers/mapRecoveryGroups.ts:72–151`; BE `recovery/groups.py:50–61` | Draft `platform` je **ID source providera**, wire `application.platform` je jeho typ. Pre workload skupinu `providerId` = trimnuté `provider_id_vm`; pre storage skupinu môže znamenať volume provider. Rovnosť sa musí používať až spolu s workload/platform kontrolou. |
| Provider kontrakt | BE `recovery/recovery.py:146–163`; FE `utils/eligibleProviders.ts`, `storedProvidersProblem` | VMware vyžaduje source/target roly, IBM Power iba typ a existenciu oboch providerov; rovnaký HMC je povolený. Create navyše filtruje credentialStatus; uložený Edit zámerne nekontroluje credentials rovnakým spôsobom. Zachovať rozdiel. |
| Skupiny v BE | BE `validate_recovery_app` v `recovery/recovery.py:102–143` | Kontroluje existenciu RG; IBM_POWER `provider_id_vm` a platné LPAR mená. **Nekontroluje rovnosť group source ID s application source ID** ani globálne duplicity pri samotnom API submit-e. Power v2 však duplicity odmieta v DAG šablóne pri jej parsovaní. F2 je silnejšia FE invarianta, podporená jediným aplikačným source connection. |
| Publication | FE `utils/recoveryGroupPlatform.ts:21–29`; BE `attach_recovery_group_run_uuids` | FE vyžaduje `pushed === true` a neprázdny run ID aj pre Save-only. BE pripája aktuálny run ID skupiny. Nová kontrola nesmie existujúce FE pravidlo oslabiť. |
| Workloads | FE `model/recoveryApplicationDraft.ts:84–125`; všetky tri BE DAGy, `tier_vms` | Autoritatívny výber je `tier.recovery_group.vms`. `tier.vms` nie je DAG vstup a nesmie sa do kontroly pripočítať. Assignment vyberie všetky `group.resources`, používateľ následne výber mení. |
| Duplicity | BE Power v2 `refuse_ambiguous_groups` približne `:78–112`; VMware `make_tier_group` a hlavný loop `:845,955`; Power v1 tier/LPAR loops | **Iba Power v2** explicitne odmieta rovnaké presné meno LPAR medzi tiermi a kolízie Task Group ID v jednom tieri (vrátane opakovaného presného mena). VMware v1 a Power v1 nemajú ekvivalentný zákaz; FE pre tieto šablóny nesmie zaviesť nové blokujúce pravidlo. |
| Generované schémy | FE `src/generated/query/zod/recoveryApplication.gen.ts:10–36`, `recoveryApplicationRecord.gen.ts:10–37` | Submit vyžaduje provider ID; read toleruje absent/null legacy ID. Email je optional nullable string bez email refinement. FE runtime business validácia je potrebná, schémy nemeníme. |
| Policy a templates | BE submit router, `apache_airflow/template_versions.py`; FE `DagTemplateVersionSelect.tsx:17–47`, `validateRecoveryApplicationTemplate` | BE vyžaduje policy pri Push; FE zámerne aj pri Save-only. `null` znamená BE default: VMware v1, Power v1, Power v2 voliteľná. Zachovať current catalog verification aj explicitné verzie. |

## 3. Existujúce správanie a potvrdené nedostatky

Všetky nasledujúce FE cesty bez prefixu sú v `src/features/recovery-plans/recovery-applications/`.

- `AppMetadataForm.tsx` nemá email input ani email v patch kontrakte. `ApplicationMetadataPatch` v `model/recoveryApplicationDraft.ts:7–9` email nepovoľuje. Default draft už obsahuje `notificationEmail: null`; mapper už zabezpečuje Edit round-trip, ale nenormalizuje odoslaný prázdny string.
- `isRecoveryGroupCompatible` kontroluje workload kategóriu a typ. `isRecoveryGroupEligible` pridáva publication, ale ani jeden neporovnáva provider ID. Rovnaká medzera existuje v sidebar filtroch, assignment a finálnom validátore. `selectRecoveryVm` môže pri stale/missing skupine pridať meno aj bez platného referenčného záznamu.
- `validateRecoveryApplication.ts:69–199` kontroluje metadáta, policy, providers, template, orchestration, missing/platform/unpublished groups a Power mená. Nekontroluje email, Power v2 duplicitné LPAR, aktuálnu membership vybraného workloadu ani nulový počet tierov. Skupiny sú optional argument; ich vynechanie preskočí referenčné kontroly.
- `getRecoveryApplicationDraftReadiness` nemá groups ani group error context. `tiersValid` znamená iba aspoň jeden tier a attached group. Preto môže Save povoliť stav, ktorý `handleSave` odmietne cez `alert`. `canSaveApplication` je starý názov v mapper komentári; aktuálny builder používa readiness `canSave`, samostatná funkcia s týmto názvom nie je potrebná.
- Builder načítava Providers a Recovery Groups cez existujúce React Query hooks. Finálna FE validácia dnes nevyužíva všetky dostupné referenčné údaje; v Phase 1 ich využije, **bez nového GET pri Save**. Query cache môže byť zastaraná; BE zatiaľ nevynucuje F2 pri API submit-e; Power v2 duplicity odmieta až jeho DAG šablóna. Časové okno stale cache zostáva vedomým limitom FE riešenia.
- `TierCard` skladá options z dostupných a už vybraných mien a deduplikuje iba ich zobrazenie cez `Set`. Legacy duplicita v jednom tieri môže zostať v payloade skrytá; je to blokujúci problém **iba pre explicitne zvolené Power v2** v rámci F3. Pri VMware v1 a Power v1 zachovať existujúce správanie.

Odporúčania vyplývajúce z F4, nie nové backend požiadavky: explicitný error pri stale workload membership, konzistentná kontrola aspoň jedného tieru a fail-closed referenčný context. Nesprísňovať počet VM v tieri: prázdny výber s priradenou eligible skupinou zostáva povolený. Nerobiť automatické opravy ani odstraňovanie workloadov.

Existujúce ochrany sú už implementované: `RecoveryApplicationEditorPage` používa fresh-on-mount, `readOnlyRef`, konfliktový lock a reload pri 409/502/neurčitom výsledku. Create page má vlastný unverified-state lock. `useSubmitRecoveryApplication` ponecháva retry=false a po úspechu aj chybe volá cache reconciliation. Tieto mechanizmy nenahrádzať.

## 4. Architektúra F1–F4

### F1 – Notification Email

Pridať malý aplikačný utility `utils/recoveryApplicationEmail.ts` s `normalizeRecoveryApplicationEmail(value: string | null | undefined): string | null` a `isValidRecoveryApplicationEmail(value): boolean`. Normalizácia: trim okrajového whitespace; prázdny výsledok → `null`; inak zachovať case a obsah. Validácia normalizovanej hodnoty: `null` je valid, inak BE-equivalent regex vyššie. Zámerne nejde o RFC parser, DNS kontrolu ani zoznam adries. Whitespace-only FE akceptuje ako vymazanie; tým sa od BE raw vstupu líši vedome, odosiela však konzistentné `null`.

V Details pridať controlled input `type="email"`, `autoComplete="email"`, label `forms.notificationEmail`, error `forms.notificationEmailInvalid`, `aria-invalid` a väzbu `aria-describedby`. Hodnota pochádza z parent draftu (`notificationEmail ?? ''`); nevytvárať druhý email state. Pri zmene odoslať patch s raw stringom, aby trim nerušil písanie; normalizovať pri validácii a payload mappingu. Rozšíriť `ApplicationMetadataPatch`, props a odstrániť zastaraný komentár „Not editable“. Email patch nevyvoláva source confirmation a nie je blokovaný provider locks. Read-only/initial loading/isSaving fieldset a callback guard zostávajú účinné.

### F2 – Rovnaký source compute provider

V existujúcom `recoveryGroupPlatform.ts` doplniť `isRecoveryGroupSourceCompatible(group, platform, sourceProviderId)` a `isRecoveryGroupSourceEligible(...)` s **povinným** source ID argumentom. Delegujú existujúcu platform/publication kontrolu a pridajú source equality; pôvodné typové predicates zostávajú použiteľné počas jednotlivých migračných taskov. Group input Pick obsahuje `providerId`. V konečnom stave musia všetky aplikačné výberové a validačné cesty používať source-scoped predicates. Podmienky: source ID existuje, group je workload správneho typu a `group.providerId === sourceProviderId`. ID porovnávať presne, bez case folding; neodvodzovať ID z display name, IP, storage providera ani target ID. RG mapper už trimuje provider ID; neprepisovať jeho logiku.

Efektívny source ID je pri Create `draft.platform`, pri Edit výlučne `lockedProviders.sourceProviderId`; platform typ obdobne zo source providera alebo uloženého locku. `null` v locku nesmie fallbacknúť na mutable draft. Ak podľa dostupných query dát provider neexistuje, má nesprávny typ/rolu alebo zlyhalo načítanie kontextu, Save je zablokovaný. Pri Save sa nevyvoláva povinný fresh GET. Nevytvárať nový provider resolver modul; rovnaký jednoduchý výpočet zapojiť do existujúcich vstupov.

Použiť rovnaký predicate v sidebar/options, `assignRecoveryGroup`, validácii a pri pridávaní workloadu. Pri `selected=true` požadovať aktuálnu eligible skupinu aj `group.resources.includes(vmName)`; odmietnutie neoznačuje draft ako dirty. Pri `selected=false` umožniť odstránenie aj z neplatnej alebo chýbajúcej skupiny, aby sa konfigurácia dala opraviť. Výber môže vytvoriť duplicitu medzi tiermi; blokujúca odvodená validácia ju ukáže **iba pri explicitne zvolenej IBM Power v2**. Pri VMware v1 a Power v1 duplicita nesmie blokovať Create/Edit/Save/Push.

Zmena source s assigned groups ponechá existujúci confirmation workflow: Cancel nemení dáta, Confirm odpojí skupiny vo všetkých tieroch, pri zmene typu resetuje target/template podľa existujúcej logiky. Saved providers zostávajú locked. Missing alebo ineligible uloženú skupinu zobrazovať, nikdy ju automaticky nezmazať.

### F3 – Kontrola duplicitných LPAR iba pre IBM Power DAG v2

**Pravidlo je podmienené platformou a DAG verziou; nejde o univerzálny zákaz VM/LPAR.** Pri VMware v1, IBM Power v1 a `dag_template_version=null` (aktuálny BE default v1 pre obe platformy) musia rovnaké VM/LPAR v dvoch tieroch zostať povolené a nesmú blokovať Save-only ani Push. FE aktivuje blokujúcu kontrolu presných duplicitných LPAR iba pri `platform === IBM_POWER && dagTemplateVersion === 'v2'` (typ platformy odvodiť existujúcim spôsobom zo source providera/locks, nie zo samotného draft ID). Backendový registry aktuálne potvrdzuje Power default v1; ak sa v budúcnosti zmení, treba toto pravidlo opätovne zosúladiť s novým kontraktom.

V `utils/recoveryApplicationWorkloads.ts` ponechať malú čistú O(n + t) detekciu `findDuplicateRecoveryApplicationWorkloads(tiers)`, ktorá skenuje iba vybrané `tier.recovery_group.vms`, vracia `{ name, tierIds }` a nič nemení v payloade. **Rozhodnutie, či je nález blokujúci, patrí výlučne do `validateRecoveryApplication`/spoločnej Tiers sekcie** podľa aktuálnej platformy/verzie; samotná utility nesmie plošne blokovať VMware/Power v1. Použiť Map/Set, presné case-sensitive názvy bez trim/case folding/Unicode normalizácie; LPAR názvy ďalej podliehajú existujúcemu `LPAR_NAME_RE`.

Pri Power v2 blokovať rovnaké presné meno LPAR **medzi tiermi**, ako kontroluje BE `refuse_ambiguous_groups`. Rovnako zachytiť presnú duplicitu mena **v jednom tieri**: BE Power v2 odmietne kolíziu jeho `lpar_{sanitize_key(name)}` Task Group ID. Pri opakovaní medzi tiermi uviesť všetky dotknuté tier ID; pri vnútro-tierovej duplicite jeden tier ID. Po zmene DAG verzie `v2 → v1/null` alebo platformy sa blokujúca chyba musí bez mutácie workloadov odstrániť; pri `v1/null → v2` sa vráti. Po reorder/odstránení VM/tieru sa znova odvodí výsledok.

**Mimo F3:** Dve odlišné Power v2 mená, napr. `a.b`/`a_b`, môžu po sanitizácii kolidovať; BE kontroluje aj tieto Task Group ID kolízie. Táto fáza nezavádza dodatočnú FE kontrolu všetkých sanitizovaných kolízií ani obmedzenia pre VMware/Power v1. Známe riziko zdokumentovať, nevytvárať BE úpravy.

### F4 – Jeden validačný tok

Rozšíriť **existujúci** `utils/validateRecoveryApplication.ts`, nie vytvárať nový validačný framework. Exportovať section helpers `validateRecoveryApplicationDetails` a `validateRecoveryApplicationTiers`, používané finálnym `validateRecoveryApplication` aj readiness. Existing template/provider helpers ponechať. `ValidationError` rozšíriť o field `notificationEmail` a `workloads`; zachovať `messageKey` a string params. Section helpers aj finálny wrapper vracajú prvú konkrétnu chybu, duplicate utility naďalej vracia všetky kolízie na testovanie/ďalšie zobrazenie.

Deterministické poradie finálnej kontroly: Details (meno/file/description/email/providers) → aspoň jeden tier → attached group → existencia/platform/source/publication podľa dostupných query dát → membership vybraných workloads → Power name validity → Power-v2-only duplicate LPAR check → policy required → template pravidlá → orchestration pri Push. V skupinových chybách uviesť tier ID, názov/ID skupiny a pri source mismatch expected/actual provider ID. Platnosť Power LPAR mien sa kontroluje bez ohľadu na template; duplicity blokujú iba pri Power v2 a iba podľa vybraných workloadov, nezávisle od embedded snapshotu pri Edit.

Context pre skupinové kontroly je povinný; vynechané groups nesmú znamenať úspech. Finálny čistý validátor vyžaduje groups array v options, bez optional bypassu. Readiness/builder použijú existujúce `areGroupsLoading`, `groupsError` a provider query stav, čím rozlíšia `loading/unverified` od potvrdeného prázdneho zoznamu a chýbajúcej skupiny. Nepridáva sa nový query ani async preflight stav. Pri chybe načítania sa nevyhlasuje „group deleted“; vráti sa `referencesUnverified` ešte pred obsahovou validáciou referencií.

Readiness doplní `groups`, `groupsError` a section errors; `detailsValid`/`tiersValid` odvodiť z tých istých helperov. `canContinue` sa vzťahuje na aktuálny krok, takže chýbajúci policy/template nesmie blokovať opravu Details/Tiers. `canSave` je úspech finálneho validátora plus dostupnosť contextu, nie paralelná sada pravidiel. `validationError` v readiness je rovnaký finálny výsledok pre práve dostupný query context. Test invarianty: pri načítanom contexte `canSave === (validateRecoveryApplication(...) === null)`.

Builder zobrazí email error v Details, tier error pri Tiers a finálnu chybu nad footerom (mimo disabled fieldset, `role="alert"`). Zobrazí sa aj dôvod disabled Save, vrátane existujúcej query chyby; používateľ sa cez Back vie dostať k oprave. Browser `alert` nahradiť týmto existujúcim inline Alert vzorom. Na chybe nevolať `onSave`. Nevytvárať React state pre Power-v2 duplicity, odvodené errors ani preflight pending; existujúce isSaving/read-only lifecycle guards zostávajú zachované.

## 5. API a data flow – bez zmeny Save workflow

React Query už počas práce vo wizardi načítava Providers, Recovery Groups, Policy Sets a DAG template katalóg. **Save-only ani Push nespúšťajú nové povinné GET requesty.** Nevzniká nový snapshot utility, nový query hook ani asynchrónny pending/revision/cancellation mechanizmus.

```text
existujúce GET providers + GET groups (React Query) → existujúci mapping
→ draft / provider locks → spoločná synchrónna F1–F4 validácia
→ readiness a konkrétne UI chyby
→ Save intent → rovnaká finálna validácia nad práve dostupnými dátami
→ onSave(draft) → existujúci mapper → useSubmitRecoveryApplication
→ generated submitRecoveryDag → existujúca cache reconciliation/lifecycle
```

Existujúce stránky `RecoveryApplicationBuilderPage` a `RecoveryApplicationEditorPage` zostávajú vlastníkmi submit mutation. Zachovať `completion.beginSave`, `isSaving`, `readOnlyRef`, Create unverified lock, Editor fresh-on-mount/409/502 recovery a cache reconciliation. Nemeniť parent `onSave` API kvôli preflightu. Mapper posiela normalizovaný `notificationEmail`, `dag_template_version ?? null`, vybrané `tiers.*.recovery_group.vms`, správne provider ID a dnešné query parametre.

Pri chýbajúcom alebo neúspešne načítanom provider/group kontexte validovať **fail-closed** (`referencesUnverified`), bez vydávania načítacej chyby za zmazanú skupinu. Nevynucovať nový sieťový request pri Save; bežný React Query refetch a existujúce Editor GET ostávajú nedotknuté.

**Vedomý limit:** Údaje v React Query môžu medzi posledným načítaním a POST zastarať. BE API pri samotnom submit-e nevynucuje zhodu source providera ani plošnú kontrolu duplicít; Power v2 však presné LPAR duplicity kontroluje pri parsovaní DAG. FE preto garantuje vlastnú kontrolu podľa dostupných dát iba v tomto UI, nie transakčnú konzistenciu ani ochranu ostatných klientov. Prípadné tvrdé vynútenie patrí do samostatného BE hardeningu, nie do ad hoc GET pred Save. Zachovať BE chyby a žiadny automatický POST retry.

## 6. Súbory na úpravu a hranice

Prefix `RA` = `src/features/recovery-plans/recovery-applications/`.

| Súbory | Dôvod |
|---|---|
| RA `utils/recoveryApplicationEmail.ts` + `.test.ts` (nové), `utils/recoveryApplicationFormMapper.ts` + `.test.ts` | Jednotná normalizácia/validácia a nullable wire round-trip. |
| RA `model/recoveryApplicationTypes.ts`, `model/recoveryApplicationDraft.ts` + `.test.ts` | Email patch a zachovanie locks/dirty/source confirmation; source-scoped assignment a workload add/remove guard. |
| RA `utils/recoveryGroupPlatform.ts` + `.test.ts` | Povinný source ID v compatibility/eligibility. |
| RA `utils/recoveryApplicationWorkloads.ts` + `.test.ts` (nové) | Čistá O(n) detekcia mien; blokovanie až v existujúcom validátore výlučne pre Power v2. |
| RA `utils/validateRecoveryApplication.ts` + `.test.ts` | Spoločné section validators, konkrétne chyby a finálna ochrana. |
| RA `model/recoveryApplicationDraftReadiness.ts` + `.test.ts` | Rovnaké pravidlá pre kroky, Save a final submit. |
| RA `components/AppMetadataForm.tsx` + `.test.tsx`, `components/RecoveryAppBuilder.tsx` + `.test.tsx` | Email UI, source filtering, inline chyby a existujúci synchrónny submit guard. |
| `src/locales/en.json`, `sk.json`, `cs.json`; `src/locales/recoveryApplicationFunctionalTranslations.test.ts` (nový) | Iba funkčné texty a interpolácie. |
| RA `pages/RecoveryApplicationFunctionalConsistency.integration.test.tsx` (nový), existujúce `pages/RecoveryApplicationEditorPage.cache.test.tsx`, `hooks/recoveryApplicationsWire.test.tsx` | Reálne builder→page→mutation hranice, aktuálny query context a payload bez preflightu. |
| RA `pages/RecoveryApplicationEditorPage.test.tsx`, `components/RecoveryApplicationsTable.lifecycle.test.tsx`, `hooks/useRollbackRecoveryApplication.test.tsx`; `scripts/qa/verify-recovery-applications-dag-lifecycle.mjs` | Cielené lifecycle regresie a rozšírenie existujúceho browser QA. |

Audit-only, bez plánovanej implementačnej úpravy: RG `helpers/mapRecoveryGroups.ts`, `hooks/useRecoveryGroups.ts`, types; `utils/eligibleProviders.ts`; `components/TierCanvas.tsx`, `TierCard.tsx`, `DagTemplateVersionSelect.tsx`; submit/cache/lifecycle hooks a page produkčné súbory. Chyby sa zobrazia v builderi, preto TierCard/Canvas nepotrebujú nové props. BE, OpenAPI a všetky generated súbory striktne bez úprav.

## 7. Validácie, chyby a lokalizácie

Re-use `forms.notificationEmail`, `forms.notificationEmailInvalid` a existujúce `recovery.application.validation.recoveryGroupMissing`, `recoveryGroupPlatformMismatch`, `recoveryGroupNotPublished`, provider/lpar chyby. Nové aplikačné kľúče pod `recovery.application.validation.`:

| Kľúč | Params | EN význam; SK/CS ekvivalent |
|---|---|---|
| `recoveryGroupSourceMismatch` | `tier`, `group`, `expected`, `actual` | Group in tier belongs to source X, application uses Y; replace group. |
| `recoveryGroupSourceMissing` | `tier`, `group` | Group has no source compute provider; replace it. |
| `workloadMissing` | `tier`, `group`, `name` | Selected workload no longer belongs to current group; remove or reselect. |
| `duplicateWorkloadAcrossTiers` | `name`, `tiers` | Power v2 only: LPAR appears in multiple tiers; select it once. |
| `duplicateWorkloadWithinTier` | `name`, `tier` | Power v2 only: repeated exact LPAR name within one tier; remove duplicate selection. |
| `tiersRequired` | žiadne | At least one tier is required. |
| `referencesUnverified` | žiadne | Providers/groups could not be verified; retry loading before saving. |

`actual` pri null source rieši samostatný missing kľúč, nikdy nezobraziť `undefined`. Params escapuje React, neskladať HTML. Error testy kontrolujú mená a tier IDs, nie iba generic key. Používať existujúcu `{{param}}` interpoláciu. Obe duplicitné chyby sú **len pre Power v2**. Ak sa rovnaké meno opakuje v jednom aj vo viacerých tieroch, cross-tier text má prioritu; pri VMware v1/Power v1 sa tieto error keys vôbec nevyvolajú. Read-only aplikácia môže zobraziť zistené chyby; nemôže byť nútená opustiť zobrazenie.

## 8. VMware vs. IBM Power a backward compatibility

| Pravidlo | VMware | IBM Power |
|---|---|---|
| Source equality | RG vCenter ID = application source vCenter ID | RG HMC ID = application source HMC ID |
| Source/target roly | Zachovať existujúci BE source/target kontrakt a FE credential gates | Rovnaký HMC môže byť oboma stranami; bez VMware role filtra |
| Templates | v1 default/null | v1 default/null, v2 explicitne |
| Mená | Presné meno VM, vrátane platných medzier | Navyše existujúci `LPAR_NAME_RE`, bez úprav |
| Duplicity | VMware v1: FE nepridá nový zákaz duplicitnej VM medzi tiermi | Power v1/null: FE nepridá nový zákaz LPAR; **Power v2: FE blokuje presné duplicity LPAR v jednom aj viacerých tieroch** podľa BE parse-time guardu |

Legacy missing email → `null`; uložený platný email zostane zachovaný; neplatný legacy email je viditeľný a pred novým Save vyžaduje opravu. Legacy aplikácie s nesprávnym RG source možno otvoriť, ale nový Save/Push sa zablokuje s návodom; samotné duplicity sa blokujú **iba pri Power v2**, nie pri VMware v1 ani Power v1/null. Žiadna migrácia, automatický fallback provider ID alebo tiché zahodenie dát. Pushed aplikáciu možno prezerať cez Edit a prechádzať všetky kroky aj pri neplatných referenciách. Po úspešnom Rollback a potvrdenom GET `pushed=false` sa použije rovnaká validácia ako pre iný Edit; samotný rollback report neodomyká neoverený stav.

## 9. Riziká a regresné scenáre

| Riziko | Dopad | Mitigácia / review bod |
|---|---|---|
| BE nevynucuje F2 pri POST; Power v2 kontroluje duplicity až pri parsovaní DAG | Staršia cache či iný API klient môže obísť source equality; Power v2 má vlastnú neskoršiu kontrolu | Zdokumentovať FE limit a rozdiel BE API/DAG; prípadný BE hardening riešiť samostatne, nie novým GET preflightom. |
| FE VMware `role !== 'target'` verzus BE presné `role=source` | Potenciálny konflikt pri nekánonickej role | Pred implementáciou overiť providers read normalization/role enum. Nemeniť existujúci role kontrakt v F2; pridať canonical source/target regresie. „BMW“ v zadaní interpretované ako preklep VMware. |
| Staré test fixtures používajú iný/missing group.providerId | Nové kontroly správne rozbijú doteraz nekonzistentné pozitívne prípady | Opraviť iba pozitívne fixtures na skutočný source; negatívne prípady ponechať explicitne. |
| Existujúca integration suite mockuje celý builder | Zelený test nedokazuje F1–F4 | Nová integration suite používa skutočný builder, pages, mapper a submit facade; mock iba HTTP/externé služby. |
| Provider/Recovery Group query zlyhá | Chýba overený context na source/workload kompatibilitu | Existujúce loading/error stavy blokujú Save s `referencesUnverified`, bez prázdneho fallbacku. |
| Stará query cache neodráža aktuálny BE stav | FE môže schváliť skupinu už zmenenú na BE | Vedomý limit Phase 1; existujúci refetch aj BE validácia zostávajú. Tvrdá kontrola patrí na BE. |
| Power v2 same-tier presná duplicita je v UI skrytá cez Set | Bez vysvetlenia zostane DAG v2 neplatný | Len pri Power v2 zobraziť konkrétnu chybu a cestu na opravu; pre v1/VMware neblokovať. |
| Power v2 sanitizované kolízie rôznych mien | Platná F3 konfigurácia môže mať inú DAG chybu | Známy limit mimo name-identity F3; review rozhodne o samostatnom budúcom tasku, nerozširovať túto fázu. |
| Nové chyby blokujú postup k oprave | Wizard dead end | Back dostupný, section gating iba podľa relevantnej sekcie; read-only obchádza navigation gating. |

## 10. Testovacia stratégia a konkrétna matica

Použiť existujúci Vitest + Testing Library + QueryClient. Testy sú návrh, počas tohto planning auditu neboli spúšťané. Existujúce suites pokrývajú platform eligibility, template lifecycle, provider locks, draft transitions a save completion; rozšíriť ich chirurgicky. Full build nie je vhodný focused check: `npm run build` spúšťa lint, typecheck, **celú** suite a api:check.

| Vrstva | Vstup/scenár | Očakávanie | Task |
|---|---|---|---|
| Unit email/mapper | valid, invalid, `''`, whitespace-only, null, absent legacy, okrajové medzery, vnútorné medzery, viac adries | Null alebo valid normalized string; invalid blokuje; Edit round-trip zachovaný | 1,5 |
| Unit provider | VMware source A/group A vs group B; group z target C; Power HMC A/A vs A/B; source=target HMC | Len source match, single-HMC valid | 3,5,6 |
| Unit provider roly | VMware source/target zamenené; canonical role; missing provider; credentials Create vs locked Edit | Zachovať existujúce role/credentials správanie, žiadny Power role zákaz | 3,5,7 |
| Unit group references | Missing/null group source, unresolved provider, storage group, missing RG, rolled-back RG s retained run ID, blank run ID | Konkrétna contextual chyba; žiadny fallback | 3,5,6 |
| Unit duplicates | Rovnaká VM/LPAR naprieč 2/3 tiermi aj v jednom tieri: VMware v1, Power v1/null, Power v2 | VMware v1 a Power v1/null **valid**, Power v2 **invalid** pre Save-only aj Push; error obsahuje presný názov/tier IDs | 4,5 |
| Unit identity/version | `db` vs `DB`, `db` vs ` db`, Unicode varianty; legacy `tier.vms`; Power v2 `v1/null ↔ v2`, VMware v1 | Presná identita (bez sanitizácie), version gate sa mení bez zásahu do workloadov; `a.b`/`a_b` je zdokumentované mimo F3 | 4,5,7 |
| Unit transitions | Select/deselect, add rejected for ineligible RG, remove still allowed, replace/remove RG, add/delete/rename/reorder tier | Validácia sa odvodí nanovo, draft sa nemutuje, dirty eventy sa neduplikujú | 6,7,9 |
| Unit readiness | F1/F2 a Power-v2-only F3 × Save-only/Push × Create/locked Edit, nulové tiery, zmena verzie | canSave/final-validator parita; pri v1/null duplicity nezablokujú Save | 5,7 |
| Component | Email edit, návrat na Details, invalid email, missing/current source, confirm/cancel, read-only | Parent zachová input, inline errors, zakázané callbacks | 9 |
| Current query context | Missing/mismatched/unpublished RG, zvolený workload už nie je v dostupnej skupine; loading/GET error | Bez POST pri neplatnosti viditeľnej v dostupných dátach; bez nového GET pri Save | 5,7,9 |
| Integration | Create → Save-only → Edit (existujúci fresh-on-mount), oba typy | Email a vms round-trip, správne source/target/wire platform, null template | 10 |
| Integration | Create → Save-only/Push, VMware v1 a Power v1/null/v2; invalid email/source/duplicitné LPAR | VMware v1 a Power v1/null s rovnakými VM/LPAR môžu odoslať POST; Power v2 duplicita blokuje POST; ostatné invalid prípady tiež blokujú | 10 |
| Integration lifecycle | Rollback → overený GET → Edit → Save; rollback failure/unverified GET; pushed Edit | Odomkne iba potvrdený stav, zachová providers, read-only bez write | 11 |
| Lifecycle | Repeated Save, pushed readOnly, 409/502/network uncertainty | Existujúce Save/readOnly locks a cache reconciliation, žiadny duplicitný POST | 11 |
| Locales | EN/SK/CS keys a parametre | Neprázdne texty, rovnaké placeholders, bez Phase 2 help textov | 8 |

Focused príkazy sú presne uvedené pri taskoch v TODO. Pre zmenené TS/TSX súbory navyše `npm exec eslint -- <explicitné zmenené súbory> --max-warnings 0`. Na záver povinne spustiť `npm run typecheck`; build/celá suite len po explicitnom rozhodnutí, nie automaticky. Po každom tasku `git diff --check`.

### Browser QA / Playwright scenáre (návrh, bez live operácií)

Repo má existujúci mockovaný Edge/Playwright runner `scripts/qa/verify-recovery-applications-dag-lifecycle.mjs`. Rozšíriť ho o F1–F4 bez nového frameworku/dependencies. Vyžaduje lokálne Vite, Edge a dostupný `playwright-core` (prípadne `PLAYWRIGHT_MODULE`); ak runtime chýba, uviesť blokér.

V každom scenári mockovať provider/group/policy/template/application GET, submit POST aj rollback POST. Overiť request count a body; neočakávaný provisioning/externý request abortnúť. Fixtures zahŕňajú aspoň dva VMware sources a dva HMC, valid target vCenter, Airflow, published groups s run ID a prekryvom mien.

1. VMware: vyplniť Details vrátane emailu, priradiť source-A skupinu, policy, Save-only; overiť payload `notificationEmail`, source/target, `dag_template_version:null`; mockovaný GET potom Edit s rovnakým emailom. Vymazať email → payload null.
2. Power: zopakovať s rovnakým HMC source=target, postupne default v1/null a explicitné v2. VMware group nie je dostupná; Power group iného HMC tiež nie. VMware roly zostávajú oddelené.
3. Obe platformy: invalid email blokuje postup/Save; vložená legacy skupina iného source sa zobrazuje s tier/source chybou; Save-only aj Push nevytvoria POST.
4. Zadať rovnakú VM/LPAR do dvoch tierov: VMware v1 a Power v1/null nesmú zobraziť blokujúci duplicate error a Save zostáva možný. Prepnúť IBM Power na explicitné v2 → Save-only aj Push sa zablokujú s LPAR menom a tier IDs; vrátiť na v1/null → blokovanie zmizne bez zmeny workloadov. Pri v2 overiť aj presnú duplicitu v jednom tieri a opravu odobratím workloadu, zmenou skupiny či tieru.
5. Dostupný query context obsahuje missing/ineligible/source-mismatched Recovery Group alebo chýbajúci vybraný workload → nulový POST. Existujúca query chyba vyvolá `referencesUnverified`, bežný Retry/refetch môže kontext opraviť; Save nesmie spúšťať nový GET.
6. Create source change: Cancel zachová group/target/template; Confirm odpojí skupiny; cross-platform change zachová existujúce reset pravidlá.
7. Mockovaný Push success → pushed Edit sa otvorí read-only so všetkými krokmi; žiadny input/drop/Save nezmení dáta. Mockovaný Rollback success ešte neodomkne pri zlyhanom GET; po GET pushed=false možno upraviť email/workloads a uložiť.
8. Dvojklik Save, existujúci mutation pending a lifecycle lock: validný draft odošle jediný POST, neplatný žiadny. Zopakovať 409/502/neurčitý submit výsledok so zachovanými refresh/lock správami.

## 11. Poradie, dependencies a checkpointy

`1 → 2`; `3 + 4 + 1 → 5`; `2 + 3 → 6`; `5 → 7`; `2 + 6 + 7 + 8 → 9`; `9 → 10`; `10 → 11 → 12`. Odporúčané vykonanie: **1,2,3 → checkpoint A → 4,5,6 → checkpoint B → 7,8,9 → checkpoint C → 10,11 → checkpoint D → 12 → final review**.

Bezpečné paralelné vlastníctvo po schválení: email utility/mapper (1), group predicates (3), duplicate utility (4), locale keys (8). Shared validator (5) až po ich rozhraniach. Draft transitions (6) serializovať s metadata patch (2). Readiness (7) po validátore. Builder úpravy (7,9) sériovo u jedného vlastníka; integrácie (10,11) až po ustálení flow. Nepriraďovať dva tasky súbežne tomu istému shared súboru/testu. Tento audit nespúšťal agentov ani implementáciu.

## 12. Acceptance criteria a Definition of Done

- F1: optional email je editable v Create/Edit, má jednotnú validáciu, prázdny sa odosiela null, uložený sa zachová a invalid nikdy nevyvolá submit; read-only ostáva zachovaný.
- F2: sidebar, assignment, workload add a finálna validácia používajú ten istý source compute ID z dostupných query dát; nesprávne načítané referencie nemožno obísť. Zmeny vzniknuté na BE po poslednom GET nie sú pokryté. Power single-HMC aj VMware role pravidlá zostávajú funkčné.
- F3: O(n) helper zistí presné duplicitné LPAR; **blokovanie sa vykoná iba pri IBM Power s explicitnou DAG verziou v2** (Save-only aj Push). VMware v1, Power v1 a Power default/null v1 nesmú byť novým pravidlom blokované. Zmena verzie/platformy/tierov aktualizuje odvodenú validáciu bez úpravy payloadu.
- F4: readiness a finálny guard sú konzistentné pre Create/Edit, Save-only/Push a verified Edit po Rollback. Každý disabled Save má zrozumiteľný dôvod; žiadny neplatný draft nevyvolá submit mutation.
- Pôvodné lifecycle, query/cache, policy, environment, providers a DAG template invariants majú focused regresné dôkazy. Žiadne zmeny BE, OpenAPI, generated, Recovery Groups ani Phase 2.
- Každý task má acceptance/verification v TODO, prešiel relevantnými focused testami, `npm run typecheck`, focused ESLint a diff kontrolou; žiadne oslabené testy alebo suppressions. Browser výsledky odlišujú mockované od živých operácií. Full suite/build sa označí ako nespustená, ak neboli osobitne vyžiadané.
- Pred implementáciou musí byť nezávisle schválený tento plán, presná name identity, Power-v2-only F3 gate vrátane same-tier opakovania a akceptovaný limit cache-only FE validácie. Schválenie zatiaľ **čaká**. Otvorené review body sú riziká vyššie; nie sú oprávnením začať meniť kód.
