# TODO: Recovery Group DAG Template Versioning

Stav: plán, bez implementácie. Súvisiace zdroje, rozhodnutia a riziká:
[recovery-group-dag-version-plan.md](recovery-group-dag-version-plan.md).

`RG` = `src/features/recovery-plans/recovery-groups`.
`RA` = `src/features/recovery-plans/recovery-applications`.
Skratky sú iba v dokumentácii; príkazy používajú celé cesty.
Všetky implementačné checklisty a príkazy nižšie sú na budúce vykonanie.

## Brána pred implementáciou

- [ ] Používateľ schválil plán a D1: Hitachi katalóg/model/detail bez rozširovania
  FlashCopy-only editor flow, alebo určil samostatný Hitachi prerequisite.
- [ ] Rozhodnuté D2: dnešné app default UX alebo aj explicitné pripnutie aktuálneho defaultu.
- [ ] Rozhodnuté D3: non-push Save s null pri neoverenom katalógu podľa app vzoru.
- [ ] Používateľ dal ďalší výslovný pokyn implementovať.
- [ ] Znovu skontrolované FE/BE HEAD, AGENTS.md, remotes/worktree a necommitnuté zmeny.
- [ ] Potvrdené, že generated endpoint/polia/response schema sú stále dostupné;
  nevykonáva sa manuálna oprava generated súborov ani zmena BE.

## Fáza 1: Uložená konfigurácia prežije roundtrip

### T1: Model a wire mapovanie

**Opis:** Preniesť požadovanú verziu cez read model, validated draft a payload.
Oddeliť deployed verziu od konfigurácie v mapperi aj fallback JSON.

**Súbory (5, M):**

- `RG/model/recoveryGroupTypes.ts`
- `RG/helpers/mapRecoveryGroups.ts`
- `RG/helpers/mapRecoveryGroups.test.ts`
- `RG/api/recoveryGroupsValidation.ts`
- `RG/api/recoveryGroupsValidation.test.ts`

**Akceptačné kritériá:**

- [ ] API → normalized read → FE → validated draft → API zachová explicitnú verziu
  aj null; payload vždy obsahuje dag_template_version a neposiela deployed verziu.
- [ ] Legacy missing/null/empty config sa bezpečne normalizuje; neprázdny neznámy
  string sa neprepisuje na default. Deployed verzia je aktívna iba pri pushed=true.
- [ ] Local/Metro payload vetvy, VM metadata, poradie a mená volumes/auxiliary,
  managed target_pool, email a raw JSON zostávajú funkčne nezmenené.

**Scenáre:** Explicitné v1/v2 fixture; null; chýbajúce polia; empty string;
unknown explicit verzia; pushed=true bez deployed verzie; pushed=false so stale
template_version; VM/volume, Local/Metro Existing/Managed. Explicitné v1 sa po
otvorení nesmie samovoľne zmeniť na null. Fallback toRecoveryGroup neodvodí
deployed verziu z requestu; fallback JSON a rawRecord vetva majú odlišné účely.

**Overenie:**

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-groups/helpers/mapRecoveryGroups.test.ts src/features/recovery-plans/recovery-groups/api/recoveryGroupsValidation.test.ts
```

- [ ] Testy prešli; focused ESLint týchto TS súborov, diff check a atomic commit.

**Závislosti:** schválenie brány. Nie je potrebná Orval generácia.

### T2: Draft lifecycle nesmie stratiť verziu

**Opis:** Inicializovať nullable version a pridať user event do existujúceho reduceru.
Nové pole sa prenáša existujúcim resolveEffectiveDraft spreadom.

**Súbory (2, S):**

- `RG/model/recoveryGroupDraftLifecycle.ts`
- `RG/model/recoveryGroupDraftLifecycle.test.ts`

**Akceptačné kritériá:**

- [ ] Create začína s null; Edit preberie config zo skupiny. Zmena verzie oznamuje
  dirty stav, pasívne query dáta draft nemenia.
- [ ] Event je odmietnutý pre pushed aj managedProvisioned lock. Metadata/discovery
  udalosti, ktoré dnes fungujú pri locku, tým nemenia používateľskú konfiguráciu.
- [ ] Provider/topology/mode/resource prechody zachovajú version string; membership
  v novom katalógu sa overí neskôr, bez tichého resetu alebo zásahu do prefillu.

**Overenie:**

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-groups/model/recoveryGroupDraftLifecycle.test.ts src/features/recovery-plans/recovery-groups/model/resolveRecoveryGroupDraft.test.ts
```

- [ ] Roundtrip a callback lock testy prešli; focused ESLint, diff check a commit.

**Závislosti:** T1.

### CP1: Konfigurácia

- [ ] T1/T2 testy dokazujú legacy aj explicit roundtrip bez nového UI.
- [ ] Zmeny v payloadu sú obmedzené na nové verziovacie pole.
- [ ] Žiadne zásahy do Local/Metro/Managed/Existing algoritmov ani generated zdrojov.

## Fáza 2: Znovupoužiteľný selector a pravidlá katalógu

### T3: Vyňať prezentáciu existujúceho selectoru

**Opis:** Zdieľať app selector cez malý prezentačný komponent a zachovať app adapter.
Platforma, queries a vlastné help texty zostanú v jednotlivých features.

**Súbory (3, M):**

- `src/shared/components/dag-template-version-select/DagTemplateVersionSelect.tsx` — nový
- `src/shared/components/dag-template-version-select/DagTemplateVersionSelect.test.tsx` — nový
- `RA/components/DagTemplateVersionSelect.tsx`

**Akceptačné kritériá:**

- [ ] Shared UI podporuje explicitné id, translation prefix a help slot; neimportuje
  Group/App modely ani query klienta. Bez novej knižnice a bez duplikovaného selectoru.
- [ ] App adapter zachová existujúce props, DOM id, help a správanie; Groups nebudú
  importovať z RA feature. D2 UX voľba je zaznamenaná a nemení nechcene Apps.
- [ ] Loading/error/empty/ambiguous default/unknown value/disabled/retry a default→null
  fungujú, nevymažú uloženú explicitnú voľbu pri nedostupnom katalógu.

**Overenie:**

```powershell
node node_modules/vitest/vitest.mjs run src/shared/components/dag-template-version-select/DagTemplateVersionSelect.test.tsx src/features/recovery-plans/recovery-applications/components/DagTemplateVersionSelect.test.tsx
```

- [ ] Accessible label/id, keyboard a disabled callback assertions prešli;
  focused ESLint a commit. Nie je potrebný app import migration po celom projekte.

**Závislosti:** D2, pred group UI T7. Existujúci RA test ostáva regresnou kontrolou.

### T4: Vyňať malú katalógovú validačnú politiku

**Opis:** Zdieľať rozhodnutie valid/unverified/unknown bez doménových error kľúčov.
Pôvodný app validátor ostane adapterom svojich message keys.

**Súbory (4, M):**

- `src/shared/utils/dagTemplateVersion.ts` — nový
- `src/shared/utils/dagTemplateVersion.test.ts` — nový
- `RA/utils/validateRecoveryApplication.ts`
- `RA/utils/validateRecoveryApplication.test.ts`

**Akceptačné kritériá:**

- [ ] Jediná čistá politika vyžaduje verified unique default a explicit membership;
  žiadny hardcoded v1 alebo regex pre zoznam podporovaných BE verzií.
- [ ] Non-push null outage výnimka zodpovedá D3; explicit/Push sú pri neoverení
  blokované. Unknown v overenom katalógu sa odlišuje od nedostupného katalógu.
- [ ] App validačné priority, message keys a behavior zostanú nezmenené.

**Scenáre:** default nie je prvá položka; default v2; 0/2 defaults; empty;
verified=false; explicit v9 prítomná v katalógu; explicit nepodporovaná verzia;
case-sensitive hodnoty; null a push true/false. Caller zodpovedá za platform filter.

**Overenie:**

```powershell
node node_modules/vitest/vitest.mjs run src/shared/utils/dagTemplateVersion.test.ts src/features/recovery-plans/recovery-applications/utils/validateRecoveryApplication.test.ts src/features/recovery-plans/recovery-applications/model/recoveryApplicationDraftReadiness.test.ts
```

- [ ] Unit regresie prešli; focused ESLint a atomic commit. Žiadna zmena app DAG
  collision validácie alebo Power/VMware pravidiel.

**Závislosti:** D3; nezávislé od T3 implementácie.

### T5: Group volume platforma a finálna readiness

**Opis:** Zaviesť feature resolver platformy, adaptovať spoločnú validáciu a
rozšíriť existujúci readiness context pre template výsledok.

**Súbory (4, M):**

- `RG/model/recoveryGroupDagTemplate.ts` — nový
- `RG/model/recoveryGroupDagTemplate.test.ts` — nový
- `RG/model/recoveryGroupDraftReadiness.ts`
- `RG/model/recoveryGroupDraftReadiness.test.ts`

**Akceptačné kritériá:**

- [ ] VM používa relatedVolumeProviderId, volume providerId; FLASHCOPY/HITACHI sa
  mapujú na flashcopy/hitachi. Compute, Airflow a auxiliary provider sa nepoužijú.
- [ ] Neznámy provider má neoverenú platformu. Tvorba katalógových dát pre test
  Hitachi neodblokuje existujúce FlashCopy-only topology/type guards.
- [ ] Template chyba blokuje finálny canCreate podľa D3, ale neblokuje vstup do
  orchestration kroku. Ostatné readiness podmienky a oba read-only locky platia.

**Overenie:**

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-groups/model/recoveryGroupDagTemplate.test.ts src/features/recovery-plans/recovery-groups/model/recoveryGroupDraftReadiness.test.ts src/features/recovery-plans/recovery-groups/utils/recoveryGroupTopology.test.ts
```

- [ ] Matica volume/VM + Local/Metro master/aux + missing provider + katalóg prešla;
  focused ESLint a commit.

**Závislosti:** T1/T4, D1. Návrat pri chýbajúcom kontexte musí ponechať legacy
callers kompatibilné; submit bezpečnostná hranica sa dokončí v T8, nie iba v UI.

### CP2: Zdieľané časti

- [ ] Shared komponent a policy majú presne dvoch doménových používateľov, žiadne
  feature-to-feature importy ani všeobecný wizard/query framework.
- [ ] Existujúce app testy ostávajú zelené a group resolver dokazuje správnu platformu.
- [ ] Rozšírenie Hitachi scope sa neuskutočnilo potichu.

## Fáza 3: Orchestration UI

### T6: EN/SK/CS texty pre konfiguráciu a deployment

**Súbory (4, M):**

- `src/locales/en.json`
- `src/locales/sk.json`
- `src/locales/cs.json`
- `src/locales/recoveryGroupDagVersionTranslations.test.ts` — nový

**Opis:** Pripraviť `recoveryGroups.dagTemplate.*` a template help vetvu pred
napojením UI, vrátane chyby overenia submitu a retry overenia bez nového POST.

**Akceptačné kritériá:**

- [ ] Tri jazyky majú rovnaké selector/default/configured/deployed/unknown/notDeployed,
  loading/error/empty/ambiguous/unsupported/verification texty a interpolácie.
- [ ] Helper vysvetlí volume platformu a null/default vs deployed; nepreberá
  compute Power/VMware správanie a nesľubuje Hitachi push ani overený Airflow import.
- [ ] Existujúce Local/Metro/Managed/Existing texty sa nemenia. JSON aj KeyedHelpPopover
  konvencia sú platné a budúce UI neodkazuje na chýbajúce kľúče.

**Overenie:**

```powershell
node node_modules/vitest/vitest.mjs run src/locales/recoveryGroupDagVersionTranslations.test.ts src/locales/recoveryGroupFieldHelpTranslations.test.ts
node -e "for (const l of ['en','sk','cs']) JSON.parse(require('fs').readFileSync('src/locales/'+l+'.json','utf8'))"
```

- [ ] Kľúče, neprázdne hodnoty a parametre overené; focused ESLint testu a commit.

**Závislosti:** D1–D3, T3/T4 definujú potrebné UI stavy.

### T7: Selector a generated query v existujúcom orchestration kroku

**Súbory (4, M):**

- `RG/components/RecoveryGroupBuilder.tsx`
- `RG/components/RecoveryGroupBuilder.test.tsx`
- `RG/components/RecoveryGroupOrchestrationStep.tsx`
- `RG/components/RecoveryGroupOrchestrationStep.test.tsx`

**Opis:** Builder zostaví platformový query context; child zobrazí shared selector
a pošle version change cez existujúci draft event. Bez nového fetchera.

**Akceptačné kritériá:**

- [ ] Query používa presnú lowercase platformu, generated key, enabled len pri
  overenej platforme a response filter. Late odpoveď starej platformy nemá vplyv
  na novú; automatické query stavy nemenia dirty/version.
- [ ] Selector je dostupný pri Push on/off a pri chybe Airflow provider query.
  Default odošle null, explicitné hodnoty a unsupported uložená hodnota ostávajú
  viditeľné; validácia umožní opravu vo vlastnom kroku.
- [ ] Pushed aj provisioned lock znemožnia zmenu verzie aj cez priamy callback;
  ostatné kroky, indexy, navigácia a Local/Metro správanie ostávajú.

**Scenáre:** BE vracia oba platformové typy; odlišný default v2; loading/503/empty/
0 alebo 2 defaults/malformed response; Retry; platform A→B s oneskoreným A;
same-type provider switch; provider chýba; explicit unavailable verzia; legacy
null bez katalógu podľa D3; D2 výber defaultu; lock transition z aktuálneho initialData.

**Overenie:**

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupOrchestrationStep.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.discovery-lifecycle.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupTopologyStep.test.tsx
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --incremental false
```

- [ ] Cielené testy/typecheck, focused ESLint a commit. Pre read-only záznam bez
  dostupného providera sa verzia nevymaže; editor nezíska neoprávnenú editáciu.

**Závislosti:** T1–T6. Integrácia môže byť overovaná na mocked endpointoch; nie live Push.

### CP3: UI

- [ ] Výber a jeho roundtrip fungujú cez skutočný reducer/mapper, nie iba mock onChange.
- [ ] Version API nepoužíva compute/Airflow/auxiliary platformu a nevytvára fallback GET bez parametra.
- [ ] Nie je zavedený nový Hitachi creation flow, ani zmena Metro algoritmov.

## Fáza 4: Autoritatívny výsledok submitu a lifecycle

### T8: Overiť skutočný uložený stav v useRecoveryGroups

**Súbory (2, S):**

- `RG/hooks/useRecoveryGroups.ts`
- `RG/hooks/useRecoveryGroups.test.tsx`

**Opis:** Skontrolovať template membership pred mutáciou; po nej mapovať serverový
record. Pri neistom pushed submit výsledku overiť stav GET bez ďalšieho POST.

**Akceptačné kritériá:**

- [ ] Pri submit hranici sa overí aktuálny platformový katalóg a známy read-only
  record; bypass komponentu neposiela nepodporovanú explicitnú verziu ani edit pushed group.
- [ ] Success/skipped používajú returned orchestration.pushed/template_version.
  Pri pushed requeste bez target recordu sa úspech nevyrobí fallbackom z úmyslu;
  GET overí stav. Legacy non-push fallback nevyrába deployed verziu.
- [ ] HTTP 502/network uncertainty spustí read-only verification, nie auto POST retry.
  Hook sprístupní pending/error/retry overenia; neodomkne pri chybe GET a nezamaskuje
  pôvodný submit error. Starší GET neprepíše novú authoritative cache.

**Scenáre:** Create/update; success s odlišnou requested/resolved verziou; skipped
s draft push=true a persisted=false; legacy response bez nových polí; missing
target record; 400 unsupported pred persistenciou; 502 obyčajný unlocked; 502
Managed persisted pushed=true; GET unavailable a následný retry; žiadny duplicate POST.

**Overenie:**

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroups.test.tsx
```

- [ ] Reálny generated klient + fetch mock overí wire/cache aj výsledný FE model;
  focused ESLint a commit. Existujúce rollback/inventory invalidácie sa nemenia.

**Závislosti:** T1/T4/T5. Katalóg z cache musí byť platformovo overený; nepridať
FE zoznam verzií ani vynútenie defaultu v hooku.

### T9: Zachovať draft a rešpektovať overenú authority v stránkach

**Súbory (4, M):**

- `RG/pages/RecoveryGroupBuilderPage.tsx`
- `RG/pages/RecoveryGroupBuilderPage.test.tsx`
- `RG/pages/RecoveryGroupEditorPage.tsx`
- `RG/pages/RecoveryGroupEditorPage.test.tsx`

**Opis:** Konzumovať stav T8 v create/edit wrapperoch. Po neistom submit výsledku
zachovať aktuálny formulár, blokovať ďalší submit a umožniť retry overenia.

**Akceptačné kritériá:**

- [ ] Pending/failed verification umožňuje iba overiť stav a bezpečne navigovať
  cez existujúci dirty guard; ďalší POST je blokovaný. Retry GET nezahodí draft.
- [ ] Potvrdený pushed alebo provisioned record sa stane existujúcou lock authority
  bez reinitializácie editovaného draftu. Create po neistom push nesmie ostať
  neuzamknutý len preto, že pôvodne nemal initialData.
- [ ] Skipped result dialog zostáva skipped, pôvodný submit error ostáva pri failure;
  partial rollback sa automaticky nepovažuje za editovateľný Managed stav.

**Overenie:**

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.test.tsx src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.test.tsx
```

- [ ] Zachovanie version/policy/resources/CG draftu a dirty guardu overené; retry
  overenia nemá POST; focused ESLint a commit.

**Závislosti:** T8/T7. Použiť existujúce builder props/fieldset/authority, bez nového
všeobecného save-completion systému. T8 a T9 odovzdať až po spoločnom CP4.

### CP4: Lifecycle

- [ ] Pushed/read-only vychádza z uloženého recordu, nie z checkboxu alebo result.status.
- [ ] Bežný a Managed failed push majú odlišné testované lock výsledky.
- [ ] GET failure nespôsobí odomknutie, zničenie draftu ani automatický opakovaný POST.

## Fáza 5: Detail a funkčné regresie

### T10: Konfigurovaná a nasadená verzia v detaile

**Súbory (3, M):**

- `RG/components/RecoveryGroupsTable.tsx`
- `RG/components/RecoveryGroupsTable.test.tsx`
- `RG/components/RecoveryGroupsTable.orchestration.test.tsx`

**Opis:** Do existujúceho DetailOverview doplniť dva DetailField. Nepridávať nové
tabuľkové stĺpce, queries na riadkoch alebo nový version panel.

**Akceptačné kritériá:**

- [ ] Config null zobrazuje backend default, explicit config konkrétnu verziu.
  Deployed pochádza iba z pushed recordu, nie z current catalog alebo run_id.
- [ ] Pushed legacy bez template_version zobrazuje unknown; unpushed aj so stale
  template_version zobrazuje not deployed. Rollback zmení iba aktívnu evidenciu.
- [ ] Polia sú viditeľné aj pri chýbajúcom Airflow providerovi/run error;
  read-only záznamy s unresolved storage majú pravdivý detail bez nových requestov.

**Scenáre:** configured null + deployed v1 + nový catalog default v2; explicit v2
a deployed v1; legacy; rollback ok/partial; missing provider; Hitachi record s
deployed=null. Edit button/rollback/delete podmienky sa nemajú obchádzať verziou.

**Overenie:**

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.orchestration.test.tsx
```

- [ ] Detail a nezávislosť od Airflow query overené; focused ESLint, diff check a commit.

**Závislosti:** T1/T6; lifecycle refresh sa dokazuje v T11.

### T11: Real-client lifecycle a izolovaný browser

**Súbory (2, S):**

- `RG/pages/RecoveryGroupDagVersion.integration.test.tsx` — nový
- `scripts/qa/verify-recovery-group-dag-version.mjs` — nový, lokálne mocked API QA

**Opis:** Cez skutočné generated query/mutation funkcie, mapovanie a builder overiť
wire roundtrip a zmenu authority. API hranicu mockovať, nie vnútorné mappery.

**Akceptačné kritériá:**

- [ ] Edit→Save→GET/reopen zachová null/explicit a prejde Local VM/volume,
  Metro Existing/Managed. Fake budúci default sa riadi katalógom a neprepisuje draft.
- [ ] Push success/skipped/obyčajný failed/Managed failed a rollback ok/partial/
  failed/skipped majú správne config/deployed/lock výsledky bez fake success.
- [ ] Browser potvrdí SK/EN/CS selector/help/error/detail, klávesnicu a zachovanie
  draftu; všetky endpointy mocked, bez skutočného storage provisioningu/Airflow Push.

**Integračná matica:**

1. GET versions flashcopy/hitachi, obidve platformy v odpovedi, unique default nie
   prvý, opaque budúca verzia; absent provider nezavolá endpoint bez params.
2. Default→null a explicit podľa D2; reopen zachová uloženú explicitnú v1 aj keď je
   defaultom. Nepodporovaná verzia sa nezmení na null, oprava zostáva dosiahnuteľná.
3. Platform switch + late response, katalóg error/empty/invalid response, Retry;
   žiadne použitie cache druhej platformy. Null/non-push outage podľa D3.
4. Local, Metro Managed, Metro Existing roundtrip zachová provider_id_volume,
   policy, resources, target_pool, CG/aux mená; default resolver neberie auxiliary.
5. Success konfig null/deployed v1/pushed true → edit callback odmietnutý. Skipped
   draft push=true/record false → bez deployed. HTTP 502 + GET určí reálny lock.
6. Rollback partial vymaže deployed, ponechá configured a Managed lock, ak ostali
   odvodené objekty. Failed/skipped rollback nezahodí verziu len kvôli kliknutiu.
7. Legacy bez polí; malformed čiastočný submit response; GET verification fail,
   úspešný retry a obmedzenie duplicate submit. Zachovaný dirty guard aj values.
8. D1 limit je explicitný: izolovaný Hitachi selector/model/detail je pokrytý,
   plný create/push sa neprezentuje ako podporovaný end-to-end flow.

**Overenie:**

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-groups/pages/RecoveryGroupDagVersion.integration.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.discovery-lifecycle.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.prefetch.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryApplicationFieldHelp.integration.test.tsx
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --incremental false
node scripts/qa/verify-recovery-group-dag-version.mjs
```

Browser skript použije iba loopback APP_URL a izolovaný profil podľa existujúcich
QA skriptov. Pred príkazom spustiť lokálny Vite na zvolenom voľnom porte, po QA
zastaviť iba vlastný server. Uložiť screenshots/report a vizuálne ich skontrolovať.

- [ ] Integračná matica prešla; nepridávať orchestration polling ani všeobecné retry.
- [ ] Screenshoty/renderované chyby zodpovedajú návrhu; console/network findings
  rozlišujú zámerné HTTP chyby od neočakávaných zlyhaní.
- [ ] Focused ESLint nových súborov a všetkých ďalších zmenených TS/TSX, JSON parse,
  `git diff --check`, review staged diffu a atomic commit dokončené.

**Závislosti:** T1–T10; UI scope a default semantika sú rozhodnuté pred začatím.

### CP5: Odovzdanie implementácie

- [ ] Všetky schválené AC majú konkrétne testové dôkazy a commity, bez unchecked
  implementačných položiek označených ako hotové iba na základe odhadu.
- [ ] Kompletný diff neobsahuje BE/generated zmeny, prepisy nesúvisiacich plánov
  alebo cudzie rozpracované zmeny.
- [ ] Všetky lokálne lock/default/error stavy boli preverované z aktuálneho BE
  kontraktu; nevznikla garancia skutočného Airflow importu len z čísla verzie.
- [ ] Finálna správa uvádza vykonané test/typecheck/lint/browser príkazy a výsledky,
  stav D1 Hitachi obmedzenia a výslovne označuje nebežanú kompletnú sadu/build/live QA.
- [ ] Práca pripravená na review bez automatického pushu/deploy; tento plán samotný
  nezačína implementáciu.

## Kontrola plánovacích dokumentov (táto úloha)

- [x] Zdroje FE/BE a generated kontrakt prečítané; Rel.AI nie je dostupné,
  CodeGraph transport zlyhal, použitá priama lokálna analýza.
- [x] Existujúce plány neboli prepísané; vytvorené iba dva určené súbory.
- [x] Overiť existenciu editovacích/regresných ciest; nové cesty vyššie sú označené.
- [x] Overiť počty súborov/úloh, kompletnosť AC/závislostí/checkpointov a diff check.
- [x] Commitnúť iba dva plánovacie dokumenty podľa AGENTS.md.
- [ ] Používateľ schválil plán a dal samostatný implementačný pokyn — zatiaľ čaká.

Testy, typecheck, lint aplikácie a build sa pri tejto plánovacej úlohe nespúšťajú.

Overenie dokumentov 2026-11-01: PowerShell kontrola odkazovaných FE ciest potvrdila
existujúce súbory a deväť výslovne označených nových implementačných/test súborov.
Obsahová kontrola potvrdila T1–T11, CP1–CP5, AC/overenie/závislosti pri každej
úlohe a najviac päť editovacích súborov na úlohu. Pred commitom sa vykonal
`git diff --cached --check` a kontrola, že staged sú iba tieto dva dokumenty.
