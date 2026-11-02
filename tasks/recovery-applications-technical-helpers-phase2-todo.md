# Recovery Applications – Phase 2 Technical Help Popovers: TODO

Stav vykonávania 2026-10-27: používateľ schválil implementáciu príkazom „načítaj plán, TODO, atomicky commituj inline“. Všetkých 15 implementačných/overovacích taskov je dokončených; focused testy, typecheck, lint a 24 mockovaných browser scenárov prešli. Nezávislé ľudské review finálneho diffu zostáva otvorené. Phase 1 email/source/readiness kontrakt je v aktuálnom FE a overený integračnými regresiami. Cudzie rozpracované Phase 1 review/testy a routing snapshot sa nemenia ani nestagujú. Výslovný nový pokyn povoľuje atómové commity; pôvodný zákaz platil iba pre planning úlohu. Push/merge sa nevykonáva.

Skratka `A/` = `src/features/recovery-plans/recovery-applications/`. V príkazoch sú plné repo-relative cesty, spúšťať z FE rootu. Produkčné súbory mimo explicitného zoznamu sa nemenia. Každý task má focused test, kontrolu `git diff --check` a pri zmenených TS/TSX `npm exec eslint -- <explicitné zmenené súbory> --max-warnings 0`. Dokumentačné tasky validovať obsahovo. **Záverečný `npm run typecheck` je povinný.** Full suite/build sa automaticky nespúšťajú; `npm run build` spúšťa aj celú suite a API kontroly. Žiadne live backend Push/Rollback pre helper QA.

## Task 1: Pripraviť helper mapping

**Description:** Zaviesť iba malé feature-local funkcie pre platformové prefixy a H4 template context podľa PLAN §6. Zdroj platformy ostáva existujúci builder/uložený record, nie nový resolver.

**Files likely touched:** `A/helpers/recoveryApplicationFieldHelp.ts` (nový), `A/helpers/recoveryApplicationFieldHelp.test.ts` (nový).

**Dependencies:** Review schválené; None z implementačných taskov. **Estimated scope:** Small, 2 súbory.

**Acceptance criteria:**
- [x] H1/H2/H3/H5/H7 správne mapujú VMware/Power/unknown, vrátane lowercase uloženého typu; unknown nemá VMware fallback.
- [x] H4 používa explicitnú známu verziu alebo jedinečný verified catalog default pri null; loading/error/unknown verzie vracajú generic.
- [x] Bez fetch/state, zmeny business typov alebo importovania Recovery Groups copy; 9 logických rodín zodpovedá PLAN.

**Verification:**
- [x] `npm exec vitest run src/features/recovery-plans/recovery-applications/helpers/recoveryApplicationFieldHelp.test.ts`
- [x] Focused ESLint oboch súborov a `git diff --check`.

## Task 2: Doplniť EN/SK/CS obsah

**Description:** Preložiť schválené texty PLAN §7 do existujúceho flat namespace; toto je jediný vlastník troch locale súborov.

**Files likely touched:** `src/locales/en.json`, `src/locales/sk.json`, `src/locales/cs.json`, `src/locales/recoveryApplicationFieldHelpTranslations.test.ts` (nový).

**Dependencies:** 1 a content review. **Estimated scope:** Medium, 4 súbory.

**Acceptance criteria:**
- [x] V každom jazyku 22 variantov × 7 parts = 154 field-help kľúčov, shared help.close reused; prípadný H3 heading label je mimo fieldHelp.
- [x] Explicitný očakávaný zoznam testuje aj chýbajúci variant vo všetkých troch jazykoch; neblank, parity a placeholders.
- [x] Preklady zachovávajú null/default, no-email-fallback, save vs push, serial Power a dôsledky rollbacku; bez helperov pre name/ID/description.

**Verification:**
- [x] `npm exec vitest run src/locales/recoveryApplicationFieldHelpTranslations.test.ts`
- [x] JSON parsing všetkých troch catalogov, focused ESLint testu a `git diff --check`; manuálne technické jazykové review.

## Checkpoint A: Mapping a obsah

- [x] Tasky 1–2 majú focused výsledky a content review, bez zmeny aplikačného správania.
- [x] Potvrdiť, kto vlastní AppMetadataForm a RecoveryAppBuilder voči Phase 1; nevykonávať ich konkurenčné úpravy.

## Task 3: Details H1/H2 s dostupnosťou v read-only

**Description:** Pridať source/target label-sibling help a readOnly prop pre metadata ovládania. Existujúce provider locks, input IDs a handler kontrakty zachovať.

**Files likely touched:** `A/components/AppMetadataForm.tsx`, `A/components/AppMetadataForm.test.tsx`.

**Dependencies:** 1,2; koordinácia s Phase 1 metadata zmenami. **Estimated scope:** Small, 2 súbory.

**Acceptance criteria:**
- [x] H1/H2 používajú explicitný aplikačný platformový context z parenta; loading/unknown generic, saved Power s missing providerom zostáva Power.
- [x] Ikony sú mimo labelu a mimo lokálnych disabled input obalov; label association a provider lock správanie ostávajú rovnaké.
- [x] ReadOnly prop explicitne zakáže všetky metadata controls: File Name, Name, Description, Environment, Notification Email a source/target Select; pomoc zostáva enabled a help nespúšťa metadata/dirty callback.

**Verification:**
- [x] `npm exec vitest run src/features/recovery-plans/recovery-applications/components/AppMetadataForm.test.tsx`
- [x] Focused ESLint týchto súborov a `git diff --check`; label→control a source-switch kontrola.

## Task 4: Zúžiť read-only disabled obaly wizardu

**Description:** Vysokorizikový DOM task vykonať skoro. Zapája metadata readOnly/platform props a nahrádza iba široký read-only fieldset úzkymi controls obalmi podľa PLAN §9. Zatiaľ nepridáva ďalšie helpery.

**Files likely touched:** `A/components/RecoveryAppBuilder.tsx`, `A/components/RecoveryAppBuilder.test.tsx`.

**Dependencies:** 3. **Estimated scope:** Small, 2 súbory. Builder vlastník vykoná aj 5/6/9/10 sériovo.

**Acceptance criteria:**
- [x] Tiers sidebar/canvas a Policy Set picker zostávajú disabled v read-only; DAG Select, Push Toggle a Airflow Select sú explicitne disabled. Metadata používa Task 3 `readOnly` prop a všetky helper headingy ostávajú mimo disabled obalov.
- [x] Outer initial-loading/saving fieldset, `isFormDisabled`, Save/drop/drag capture guards, provider locks a navigation pravidlá ostávajú zachované. Pomoc nesmie obísť delayed lifecycle/read-only lock.
- [x] Read-only H1/H2 možno otvoriť klávesnicou; negatívne testy pre všetky štyri wizard kroky pokryjú metadata/email/provider, RG/VM/LPAR výber, tier add/edit/reorder/DnD, policy, DAG Select, Push Toggle, Airflow Select a Save. **Nulová zmena draftu, nula metadata/dirty/save callbackov a nula write/rollback requestov.** Overiť delayed lifecycle lock.

**Verification:**
- [x] `npm exec vitest run src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx src/features/recovery-plans/recovery-applications/components/AppMetadataForm.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx`
- [x] Focused ESLint builder/test a `git diff --check`; read-only negatívne testy pripraviť pred zúžením fieldsetu a potom spustiť znova, spolu s keyboard help a navigation testami. Neoslabovať existujúce assertions.

## Task 5: Tiers H3/H4

**Description:** Pridať H3 k spoločnému kontextu výberu Recovery Groups/workloadov a H4 k Tiers headingu mimo disabled controls. Žiadne ikony pri group name/ID alebo každej VM.

**Files likely touched:** `A/components/RecoveryAppBuilder.tsx`, `A/components/RecoveryAppBuilder.test.tsx`.

**Dependencies:** 1,2,4; F2/F3 Phase 1 integračný review pred finálnym QA. **Estimated scope:** Small, 2 súbory.

**Acceptance criteria:**
- [x] H3 platform copy rozlišuje VM/vCenter a LPAR/HMC/FlashSystem; zodpovedá local aj metro_mirror skupinám a je dostupná pred assignmentom aj pri chybe group query. **Nesľubuje globálny zákaz duplicitných workloadov**: len explicitné Power v2 má F3 blokovanie LPAR.
- [x] H4 zodpovedá current configured template contextu: VMware VM branches, Power v1 serial, Power v2 tier/LPAR groups stále serial, unknown generic.
- [x] Presne dva kontextové triggers v kroku, read-only enabled; selection, tier.order a request payload bez zmien.

**Verification:**
- [x] `npm exec vitest run src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx src/features/recovery-plans/recovery-applications/helpers/recoveryApplicationFieldHelp.test.ts src/features/recovery-plans/recovery-applications/components/TierCanvas.test.tsx`
- [x] Focused ESLint zmenených súborov a `git diff --check`; layout headingov a source switch.

## Checkpoint B: Details/Tiers a read-only hranica

- [x] Tasky 3–5 majú dôkaz enabled help + disabled mutácie na všetkých štyroch krokoch.
- [x] Diff nemení TierCard/TierCanvas business logiku, validation, mapper alebo lifecycle guards.
- [x] Ak zúžené obaly neudržia pôvodné locks, zastaviť túto implementačnú vetvu na review; nevypnúť ochrany kvôli help tlačidlám.

## Task 6: Policy Set H5

**Description:** Použiť platformový helper pri headingu Policy Set, nezávislý od picker loading/error/empty/read-only vetvy.

**Files likely touched:** `A/components/RecoveryAppBuilder.tsx`, `A/components/RecoveryAppBuilder.test.tsx`.

**Dependencies:** 2,4,5 (sériový builder vlastník). **Estimated scope:** Small, 2 súbory.

**Acceptance criteria:**
- [x] VMware copy vysvetľuje recovery policy a optional Clean Room, Power copy prefix a manual-trigger exception.
- [x] Save-only ani zmena policy nie sú opísané ako automatický Airflow update; FE required policy a BE Push requirement rozlíšené.
- [x] Pomoc je enabled v read-only aj query error stave; picker selection/validation bez zmeny.

**Verification:**
- [x] `npm exec vitest run src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx`
- [x] Focused ESLint a `git diff --check`; review copy proti B6/B7.

## Task 7: Notification Email H6 po Phase 1 F1

**Description:** Osadiť help vedľa existujúceho F1 labelu až po implementovaní F1 inputu. Nevytvárať email pole, normalizátor alebo validátor v Phase 2.

**Files likely touched:** `A/components/AppMetadataForm.tsx`, `A/components/AppMetadataForm.test.tsx`.

**Dependencies:** 2,3 a **Phase 1 F1 input integrovaný a otestovaný** (Phase 1 Tasks **1/2/9**, preklady Task 8). Input je už rozpracovaný vo FE, ale H6 sa nepovažuje za hotový bez jeho dokončenia a verifikácie. Phase 2 nevytvára náhradný email input. **Estimated scope:** Small, 2 súbory.

**Acceptance criteria:**
- [x] H6 je spoločný obom platformám, pri email labeli mimo disabled input obalu.
- [x] Copy presne vysvetľuje null/empty → žiadne email tasks, žiadny RG/provider fallback, trigger-rule/delivery obmedzenia.
- [x] Help nemení hodnotu, error väzby, validáciu, normalizáciu ani payload; read-only focus enabled.

**Verification:**
- [x] `npm exec vitest run src/features/recovery-plans/recovery-applications/components/AppMetadataForm.test.tsx src/features/recovery-plans/recovery-applications/utils/recoveryApplicationFormMapper.test.ts`
- [x] Focused ESLint a `git diff --check`; zachované F1 email regresie (ich konkrétny test path prevziať z integrovanej Phase 1).

## Task 8: DAG Template Version H7

**Description:** Pridať platformovú pomoc pri existujúcom selector labeli a zachovať celý option/value/disabled kontrakt.

**Files likely touched:** `A/components/DagTemplateVersionSelect.tsx`, `A/components/DagTemplateVersionSelect.test.tsx`.

**Dependencies:** 1,2; nezávislé od builder editácií, platform prop už existuje. **Estimated scope:** Small, 2 súbory.

**Acceptance criteria:**
- [x] VMware/Power/generic obsah, BE default=null a explicit version vysvetlené bez tvrdenia o univerzálnej výhode v2.
- [x] Default option zobrazená raz, null wire mapping a unknown explicit value zachované; label/help sibling.
- [x] Pomoc enabled aj pri disabled Select/read-only; help nevolá onChange ani onRetry.

**Verification:**
- [x] `npm exec vitest run src/features/recovery-plans/recovery-applications/components/DagTemplateVersionSelect.test.tsx`
- [x] Focused ESLint a `git diff --check`; v1 default a v2 explicit fixtures, tiež future default z catalogu.

## Checkpoint C: Policy/email/template

- [x] Tasky 6–8 prešli focused overením; F1 gate je splnený, ak je H6 wizard označený hotový.
- [x] Texty nemajú neoverené retention/boot_verify/enabled účinky, email garanciu ani automatickú policy synchronizáciu.

## Task 9: Orchestration Push H8

**Description:** Pridať shared pomoc k textovému headingu v existujúcej Push toggle karte, bez zásahu do toggle label/handlerov a lifecycle správ.

**Files likely touched:** `A/components/RecoveryAppBuilder.tsx`, `A/components/RecoveryAppBuilder.test.tsx`.

**Dependencies:** 2,4,6; serializovať s ostatnými builder taskmi. **Estimated scope:** Small, 2 súbory.

**Acceptance criteria:**
- [x] H8 dostupný pri Save-only aj Push a v read-only; klik nezmení toggle, dirty ani Save.
- [x] Copy odlišuje persist/deploy/run. Rollback označuje ako **pokus** o odstránenie nasadeného DAG a recovered resources, nie ako garanciu úplného cleanupu. Edit vyžaduje úspešný rollback potvrdený načítaným stavom.
- [x] Failure text výslovne pripúšťa zvyšné recovery resources a remote artifacts pri partial/failed rollback alebo Push; nepredstiera odomknutie bez potvrdeného fresh stavu. Existujúce result/reload správy sú nedotknuté.

**Verification:**
- [x] `npm exec vitest run src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx`
- [x] Focused ESLint a `git diff --check`; keyboard focus v zamknutej toggle karte.

## Task 10: Airflow Provider H9

**Description:** Jeden shared label/help riadok pred Push provider normal/error/empty vetvami. Nezavádzať Airflow Select pri Save-only.

**Files likely touched:** `A/components/RecoveryAppBuilder.tsx`, `A/components/RecoveryAppBuilder.test.tsx`.

**Dependencies:** 9. **Estimated scope:** Small, 2 súbory.

**Acceptance criteria:**
- [x] H9 presne raz pri Push=true, aj počas query loading/error/empty; pri chýbajúcom Selecte žiadny dangling htmlFor.
- [x] Compute/storage/Airflow roly a uložené orchestration.provider_id vysvetlené; Save-only nemusí mať UI selection.
- [x] Filter providers, required, conditional render, selected provider a params zostávajú zachované; readonly pomoc enabled.

**Verification:**
- [x] `npm exec vitest run src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx src/features/recovery-plans/recovery-applications/hooks/recoveryApplicationsWire.test.tsx`
- [x] Focused ESLint a `git diff --check`; všetky 4 provider request stavy.

## Task 11: DetailView reuse

**Description:** Pridať labelHelp na existujúce technické hodnoty v Overview/Orchestration s rovnakými locale prefixmi. Nepridávať nové detail editory alebo field framework.

**Files likely touched:** `A/components/RecoveryApplicationsTable.tsx`, `A/components/RecoveryApplicationsTable.test.tsx`, `A/components/RecoveryApplicationsTable.orchestration.test.tsx`.

**Dependencies:** 1,2; môže bežať paralelne s builder/selector taskmi po stabilizovaní mappingu. **Estimated scope:** Medium, 3 súbory.

**Acceptance criteria:**
- [x] H1/H2/H3/H5/H6 v Overview a H7/H8/H9 v Orchestration, raz na relevantný kontext; H4 sa nepridá k count tierov.
- [x] Uložený platform typ funguje aj bez provider recordu; selected record switch zmení helper copy, žiadny stale otvorený panel.
- [x] Deployed/configured/unknown version a historický run ID zostanú rozlíšené; reuse labelHelp, žiadne duplikovanie technických odsekov v header pomoci.

**Verification:**
- [x] `npm exec vitest run src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.orchestration.test.tsx`
- [x] Focused ESLint a `git diff --check`; modal Escape/focus scenár.

## Checkpoint D: Všetky help surfaces

- [x] Tasky 9–11 plus predchádzajúce surfaces zobrazujú všetkých 9 logických helperov na schválených miestach.
- [x] Žiadna zmena BE/Orval/shared popover/Recovery Groups/mapper/business validation; žiadne helpery pri obyčajných ID/name/description.
- [x] Content review potvrdilo B1–B14 a EN/SK/CS význam, vrátane failure a rollback limitov.

## Task 12: Doplniť component a accessibility regresie

**Description:** Doplniť iba chýbajúce kombinácie z PLAN matice nad už existujúcimi testami taskov 3–11, bez testov kopírujúcich implementáciu.

**Files likely touched:** `A/components/RecoveryAppBuilder.test.tsx`, `A/components/AppMetadataForm.test.tsx`, `A/components/RecoveryApplicationsTable.test.tsx`.

**Dependencies:** 3–11. **Estimated scope:** Medium, 3 súbory.

**Acceptance criteria:**
- [x] Create switching, unknown/loading, saved missing provider, read-only všetky kroky vrátane delayed lifecycle lock a opened-help remount pokryté; help zostáva ovládateľná myšou i klávesnicou.
- [x] Focus/Tab/Shift+Tab/Escape cez reálny KeyedHelpPopover; label association, help click neaktivuje toggle/form submit.
- [x] Negatívne read-only pokusy explicitne pokrývajú metadata/email/provider, Recovery Group/VM/LPAR výber, tier add/edit/reorder/DnD, Policy Set, DAG Select, Push Toggle, Airflow Select a Save. Nula zmien draftu, nula dirty/save callbackov a nula mutujúcich requestov, bez oslabovania existujúcich assertions.

**Verification:**
- [x] `npm exec vitest run src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx src/features/recovery-plans/recovery-applications/components/AppMetadataForm.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx src/shared/components/help-popover/HelpPopover.test.tsx src/shared/components/help-popover/KeyedHelpPopover.test.tsx`
- [x] Focused ESLint zmenených testov a `git diff --check`; shared suites sú regresná kontrola, shared zdroje sa nemenia.

## Task 13: Integration coverage s reálnym builderom

**Description:** Overiť Create/Edit/readonly/detail používateľské flow s mocked API a porovnať payload pred/po help interakciách. Nemockovať celý builder.

**Files likely touched:** `A/components/RecoveryApplicationFieldHelp.integration.test.tsx` (nový).

**Dependencies:** 12 a príslušné Phase 1 F1–F4 integrované/reviewované. **Estimated scope:** Small, 1 súbor.

**Acceptance criteria:**
- [x] VMware Create/Edit, Power Create/Edit vrátane same-HMC, mocked pushed readonly a DetailView majú správny obsah.
- [x] Otvorenie/zatvorenie všetkých helperov vyvolá nula submit/rollback requestov a nezmení body/params následného mocked Save/Push.
- [x] 409/502/network/partial rollback zachovajú existujúce lifecycle lock a refresh kontrakty; žiadny nový handler v produkcii.

**Verification:**
- [x] `npm exec vitest run src/features/recovery-plans/recovery-applications/components/RecoveryApplicationFieldHelp.integration.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationSaveCompletion.integration.test.tsx`
- [x] Focused ESLint nového testu a `git diff --check`; overiť request count aj identity source/target/template/email/vms hodnôt.

## Checkpoint E: Automated coverage

- [x] Tasky 12–13 prešli, coverage obsahuje user behavior aj read-only negative mutation dôkazy.
- [x] Žiadne flaky sleeps/oslabené tests/suppressions; nespustené browser scenáre nie sú označené hotové.

## Task 14: Browser QA / Playwright scenáre

**Description:** Použiť existujúci standalone Playwright-core prístup z lifecycle QA na všetky scenáre PLAN §13; všetky API mockovať a neznáme requesty odmietnuť.

**Files likely touched:** `scripts/qa/verify-recovery-application-field-help.mjs` (nový), tento TODO (výsledok QA pri tasku).

**Dependencies:** 13, lokálny Vite, dostupný Edge/Playwright runtime; použitie externého runtime overiť pred spustením, neinštalovať dependency automaticky. **Estimated scope:** Small, 2 súbory.

**Acceptance criteria:**
- [x] Mouse hover/click, keyboard/escape/modal focus a scroll/resize pre VMware/Power, EN/SK/CS, Create/Edit/read-only/detail prejdú bez neočakávaných console/page errors.
- [x] Viewports 1440×1000, 768×1024, 360×800 bez clipping/overflow; unknown platform/default a source switch bez nesprávnej copy.
- [x] Žiadne live Push/Rollback, nulové mutujúce requesty z help aj z read-only pokusov; browser QA overí delayed lock, keyboard pomoc a nemožnosť mutácie vo všetkých štyroch krokoch. Screenshoty/results v cache a skutočný pass/fail.

**Verification:**
- [x] V samostatnom termináli `npm run dev -- --host 127.0.0.1 --port 5198`.
- [x] `node scripts/qa/verify-recovery-application-field-help.mjs` (predvolený APP_URL 127.0.0.1:5198; podporiť PLAYWRIGHT_MODULE ako existujúci QA vzor).
- [x] `node --check scripts/qa/verify-recovery-application-field-help.mjs` a `git diff --check`.
- [x] Výsledok: 24/24 mockovaných browser scenárov prešlo, exit 0; žiadne neočakávané console/page/network chyby. Živé Push/Rollback sa nevykonali.

## Task 15: Záverečné focused regresné overenie

**Description:** Zosúladiť dokončené tasky s PLAN Definition of Done a reálnym diffom. Testy opakovať iba po nových zmenách alebo na uzavretie konkrétneho nevyriešeného rizika.

**Files likely touched:** tento TODO (overovacie výsledky); PLAN iba pri schválených zmenách návrhu. Žiadne ďalšie produkčné súbory. **Estimated scope:** Small, do 2 dokumentov.

**Dependencies:** 14 a všetky acceptance criteria 1–13. Final reviewer nesmie zameniť plán za implementáciu.

**Acceptance criteria:**
- [x] Všetkých 9 helperov, 3 shared/6 platformových rodín a 22 locale variantov zodpovedá schválenému obsahu, bez duplicity default v1.
- [x] Focused component/integration/locale/browser výsledky zaznamenané; aktuálny Phase 1 **12-taskový** kontrakt (najmä F1 Task 9 a Power-v2-only F3) a read-only lifecycle guards zachované. Negatívne mutačné testy prešli; žiadne BE/OpenAPI/generated/Recovery Groups/shared framework/business logika zmeny.
- [x] Záverečný report uvádza presné spustené príkazy, limity mocked overenia, či bola celá suite/build spustená, a zostávajúce riziká; atómové commity podľa následného výslovného pokynu používateľa, bez push/merge.

**Verification:**
- [x] `git diff --check` a kontrola `git status --short`/task-owned diffu oproti počiatočnému stavu; cudzie súbory nedotknuté.
- [x] Ak nové locale/mapping zmeny vyžadujú rerun: `npm exec vitest run src/locales/recoveryApplicationFieldHelpTranslations.test.ts src/features/recovery-plans/recovery-applications/helpers/recoveryApplicationFieldHelp.test.ts`.
- [x] Pri novom read-only/lifecycle zásahu focused regresie: `npm exec vitest run src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.lifecycle.test.tsx src/features/recovery-plans/recovery-applications/hooks/recoveryApplicationsWire.test.tsx`.
- [x] **Povinne spustiť `npm run typecheck`** po integrácii H1–H9 a zmien read-only/platform props; zaznamenať výsledok. Full suite/build nespúšťať automaticky; žiadne `npm run build` bez potrebného rozsahu/autorizácie.

## Checkpoint F: Ready for review

- [x] Všetky implementačné checkboxy sú podložené skutočnými výsledkami; neoverené scenáre zostávajú otvorené.
- [ ] Ľudské review akceptovalo obsah, UX a read-only regresné dôkazy pred integráciou Phase 2.

## Vlastníctvo a paralelizácia po schválení

- Mapping: Task 1, potom locale owner Task 2; nikto iný nepridáva do rovnakých catalogov súbežne.
- Metadata: Task 3 → Task 7 (a F1 Phase 1), jeden vlastník, žiadne súbežné editácie toho istého testu.
- Builder: Task 4 → 5 → 6 → 9 → 10, striktne sériovo; Task 12 až po ich dokončení.
- Selector Task 8 a Detail Task 11 možno robiť paralelne medzi sebou aj s builder vetvou po Taskoch 1–2; nemajú spoločné zapisované súbory.
- Tasky 12 → 13 → 14 → 15 sériovo po integrácii komponentov. QA artefakty len cache, nie nové plánovacie dokumenty.

Pôvodné planning obmedzenie bolo následným príkazom používateľa nahradené vykonávaním inline s atómovými commitmi. Nezávislé ľudské review finálneho diffu sa tým nepredstiera.


## Záznam vykonania a focused overenia

- Používa sa existujúca vetva spike/ant-design-shell, inline podľa používateľa; bez nového worktree, delegovania, push alebo merge.
- RED/GREEN: mapping import najprv chýbal; locale suite najprv našla chýbajúcich 154 keys; metadata, selector, builder a detail tests zlyhali na chýbajúcich helperoch; následne prešli. Read-only negative test bol pripravený a overený ešte pred zúžením fieldsetu.
- Task 1: 8 mapping testov; Task 2: 3 language parity testy; Tasky 3/7: 23 metadata testov; Task 8: 10 selector testov; Tasky 4/5/6/9/10/12: builder 113 testov po doplnení refresh regresie. Read-only test navyše explicitne skúša assignment/remove/select, tier add/edit/delete/reorder a DnD callbacky po zmene locku.
- Read-only/editor/wire checkpoint: 184 testov v AppMetadataForm, RecoveryAppBuilder, RecoveryApplicationEditorPage, TierCanvas a recoveryApplicationsWire (pred neskorším pridaním refresh prípadu).
- DetailView: 35 testov RecoveryApplicationsTable; orchestration/lifecycle a shared HelpPopover/KeyedHelpPopover suites prešli samostatným spoločným behom, bez zmien shared implementácie.
- Task 13: 6 nových integračných testov reálnych Create/Edit/pushed flow pre obe platformy. Edit porovnáva úplný payload po všetkých 9 helperoch; Create Save-only a Power same-HMC; samotná pomoc ani read-only nevytvára write request. Existujúci SaveCompletion integration: 8 testov prešlo.
- Posledný kombinovaný metadata/mapper/help-integration/SaveCompletion beh: 73/73 testov, exit 0.
- Opravený vlastný TS2769 nález v parameterizovanom teste použitím tuple as const; následný npm.cmd run typecheck prešiel. Historická Phase 1 review poznámka o tejto chybe už neopisuje aktuálny stav.
- Metadata používajú explicitné disabled props namiesto ďalšieho fieldsetu pre každé pole; je to menší DOM variant zachovávajúci enabled sibling help. Builder výpočty help sú za existujúcimi memoizáciami, aby React Compiler zachoval pôvodné optimalizácie. H4 pri null počas isFetching používa generic, explicitná verzia ostáva konkrétna.
- Vizuálna QA odhalila poškodenú diakritiku pri pôvodnom zápise cez PowerShell pipeline. Nové SK/CS field-help kľúče boli opravené priamym UTF-8 zápisom. Locale test teraz overuje aj konkrétne znaky v titulku a nadpise sekcie a odmieta replacement znaky alebo otáznik uprostred slova; test najprv reprodukoval chybu, potom prešiel. Pôvodné locale kľúče zostali nedotknuté.

### Spustené príkazy (cesty relatívne k FE rootu)

Používa sa npm.cmd, pretože hostiteľská PowerShell execution policy blokuje npm.ps1. Systémová politika sa nemenila.

```text
npm.cmd exec -- vitest run src/features/recovery-plans/recovery-applications/helpers/recoveryApplicationFieldHelp.test.ts src/locales/recoveryApplicationFieldHelpTranslations.test.ts
npm.cmd exec -- vitest run src/features/recovery-plans/recovery-applications/components/AppMetadataForm.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx src/features/recovery-plans/recovery-applications/components/TierCanvas.test.tsx src/features/recovery-plans/recovery-applications/hooks/recoveryApplicationsWire.test.tsx
npm.cmd exec -- vitest run src/features/recovery-plans/recovery-applications/components/DagTemplateVersionSelect.test.tsx
npm.cmd exec -- vitest run src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.orchestration.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.lifecycle.test.tsx src/shared/components/help-popover/HelpPopover.test.tsx src/shared/components/help-popover/KeyedHelpPopover.test.tsx
npm.cmd exec -- vitest run src/features/recovery-plans/recovery-applications/components/RecoveryApplicationFieldHelp.integration.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationSaveCompletion.integration.test.tsx
npm.cmd exec -- vitest run src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx src/features/recovery-plans/recovery-applications/helpers/recoveryApplicationFieldHelp.test.ts src/locales/recoveryApplicationFieldHelpTranslations.test.ts
npm.cmd run typecheck
node --check scripts/qa/verify-recovery-application-field-help.mjs
git diff --check
```

Samostatné dotknuté suites sa po oprave selektorov, TypeScript tuple, Unicode a vlastných fixtures opakovali až do úspešného výsledku. Focused ESLint sa spúšťal na explicitne menených TS/TSX, locale teste a QA skripte. Celá suite a produkčný build neboli spustené.


### Tasky 14–15: finálny výsledok

- Spustené: npm.cmd run dev -- --host 127.0.0.1 --port 5198; node --check scripts/qa/verify-recovery-application-field-help.mjs; node scripts/qa/verify-recovery-application-field-help.mjs.
- Browser: **24/24 pass**, nulové neočakávané chyby. VMware/Power × EN/SK/CS × Edit/read-only/DetailView = 18 scenárov; Create platform switch pre každý jazyk = 3; missing provider, catalog outage a dodatočný 409 lock = 3. Viewports 1440×1000 (EN), 768×1024 (SK), 360×800 (CS). Power používa aj rovnaký HMC pre source/target.
- Každá wizard pomoc bola overená hoverom aj klikom a s Tab/Shift+Tab/Escape cez portál; modal Escape nezatvára DetailView. Kontrolované boli rozmery panelu, scroll, žiadny horizontal page overflow, disabled inputs/selects/toggle a DnD po locku. Opravné časovanie QA čaká na vykreslenie cieľovej stránky po Save/Discard; nespolieha sa iba na URL a nevypína navigation guards.
- Výsledky, network log a screenshoty: node_modules/.cache/application-field-help-qa/report.json, network.json a PNG. Screenshoty desktop EN a mobil CS boli aj vizuálne skontrolované, vrátane opravených diakritických znakov.
- Browser najprv odhalil race v testovacom waitForResponse a predčasnú navigáciu pred cleanupom. Jeden beh narušilo ERR_NETWORK_CHANGED pri načítaní lazy Create modulu; lokálny HTTP probe vrátil 200 a záverečný celý beh po oprave QA čakania prešiel bez tejto chyby. Normálne abortované GET pri unmount sa evidujú ako očakávané, nie ako neúspech aplikácie; ostatné network chyby zostávajú fatálne.
- Záverečný npm.cmd run typecheck: **exit 0**. Focused ESLint: **exit 0** na helpers, AppMetadataForm, RecoveryAppBuilder, DagTemplateVersionSelect, RecoveryApplicationsTable, ich zmenených testoch, locale teste, novom integration teste a QA skripte. Git diff whitespace/scope kontrola vykonaná pred každým commitom.
- Finálny inline code review: žiadne nové queries, mutácie, payload polia, framework zmeny alebo neescapovaný HTML obsah; provider/lifecycle guards a read-only callbacks ostali zachované. Opravené vlastné nálezy: React Compiler memoization placement, TS tuple, stale catalog copy a UTF-8 zápis.
- Celá test suite ani produkčný build **neboli spustené** podľa focused verification pravidiel. Výsledky sú mockované UI/HTTP dôkazy; nepotvrdzujú živú obnovu, SMTP ani dostupnosť Airflow Connections. Nezávislé ľudské review finálneho diffu nie je predstierané ako vykonané.
