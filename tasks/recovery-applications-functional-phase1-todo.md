# Recovery Applications – Phase 1 Functional Consistency: TODO

Stav: **implementácia a mockované browser QA vykonané inline**. Samostatné nezávislé review zostáva otvorené. Aplikačný kód, BE kontrakt a rozsah sa riadia aktuálnym [PLAN](recovery-applications-functional-phase1-plan.md); F3 blokuje iba explicitnú IBM Power v2.

`RA/` nižšie znamená `src/features/recovery-plans/recovery-applications/`. V príkazoch sú plné relatívne cesty. Pri každom tasku navyše `git diff --check` a focused ESLint iba pre jeho zmenené TS/TSX súbory. `npm run build` ani celá suite sa nespúšťajú automaticky; build zahŕňa celú suite a api:check. Tasky sa uzatvárajú až po skutočnej verifikácii, nie po samotnom napísaní kódu.

Odporúčané poradie: **1,2,3 → A → 4,5,6 → B → 7,8,9 → C → 10,11 → D → 12 → review**. Task 8 (lokalizácie) dokončiť pred Task 9 (UI).

## Task 1: Jednotná normalizácia a wire mapping emailu

**Status:** Implementovane a overene focused testami.

**Description:** Zaviesť dva malé email helpers podľa F1 v PLAN a použiť normalizáciu pri submit mappingu. Edit mapper zachová uložený email; optional legacy input ostáva null. Žiadne sprísnenie generated schém.

**Files likely touched:**
- `RA/utils/recoveryApplicationEmail.ts` (nový)
- `RA/utils/recoveryApplicationEmail.test.ts` (nový)
- `RA/utils/recoveryApplicationFormMapper.ts`
- `RA/utils/recoveryApplicationFormMapper.test.ts`

**Acceptance criteria:**
- [ ] Trim → prázdny/null/undefined je null; platné meno a case sa zachová; BE-equivalent regex odmieta invalid, vnútorný whitespace a viac adries.
- [ ] Submit odosiela email string alebo null; Edit round-trip nemení platný email a neberie fallback zo skupiny/providera.
- [ ] Mapping providers, nested workloads, policy a DAG template null/explicit value zostáva rovnaký.

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-applications/utils/recoveryApplicationEmail.test.ts src/features/recovery-plans/recovery-applications/utils/recoveryApplicationFormMapper.test.ts`
- [ ] Skontrolovať cases z email riadku testovacej matice vrátane whitespace-only a padded valid adresy.

**Dependencies:** None. **Estimated scope:** Medium, 4 súbory. **Owner boundary:** utility/mapper; bez buildera a draft transitions.

## Task 2: Email v metadata patch kontrakte

**Status:** Implementovane a overene focused testami.

**Description:** Rozšíriť `ApplicationMetadataPatch` o notificationEmail; dokumentovať už editable field vo form state. Preukázať, že email ide cez existujúci metadata transition bez ovplyvnenia source workflow.

**Files likely touched:**
- `RA/model/recoveryApplicationTypes.ts`
- `RA/model/recoveryApplicationDraft.ts`
- `RA/model/recoveryApplicationDraft.test.ts`

**Acceptance criteria:**
- [ ] Raw email patch prejde do draftu, null sa zachová; provider locks email neblokujú.
- [ ] Email nevyvoláva source confirmation/reset tiers, target alebo template; dirty notification ostáva jedna na udalosť.
- [ ] Create a Edit draft cloning aj queued scalar metadata intents zostávajú nemutujúce a funkčné.

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-applications/model/recoveryApplicationDraft.test.ts`
- [ ] Testovať email patch aj so saved locks a pri čakajúcom source confirmation návrhu.

**Dependencies:** 1. **Estimated scope:** Medium, 3 súbory. **Owner boundary:** nepracovať súbežne s taskom 6.

## Task 3: Source-scoped group predicates

**Status:** Implementovane a overene focused testami.

**Description:** V existujúcom platform utility doplniť `isRecoveryGroupSourceCompatible` a `isRecoveryGroupSourceEligible`, ktoré zdieľajú dnešnú platform/publication logiku a vyžadujú konkrétny source ID. Pôvodné predicates nemenia význam počas migračných taskov.

**Files likely touched:**
- `RA/utils/recoveryGroupPlatform.ts`
- `RA/utils/recoveryGroupPlatform.test.ts`

**Acceptance criteria:**
- [ ] VMware group A pasuje iba source vCenter A; Power group A iba source HMC A; target provider sa nikdy nepoužíva.
- [ ] Missing/null source/group provider, storage/unresolved group a nesprávna platforma nepasujú; ID majú presnú case-sensitive rovnosť.
- [ ] Eligible stále vyžaduje pushed=true a neprázdny run ID; single-HMC nie je zakázaný a žiadne provider role pravidlá sa nemenia.

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-applications/utils/recoveryGroupPlatform.test.ts src/features/recovery-plans/recovery-applications/utils/eligibleProviders.test.ts`
- [ ] Matica source match/mismatch pre oba typy a explicitný group=target/source!=target prípad.

**Dependencies:** None. **Estimated scope:** Small, 2 súbory. **Owner boundary:** utility a jej test; bez UI/draft/validators.

## Checkpoint A: Email a source rozhrania

- [ ] Tasky 1–3 majú focused test dôkazy, diff check a nezmenený BE/generated kontrakt.
- [ ] Review potvrdil raw-input vs normalized-payload email a source ID semantiku.
- [ ] Žiadny existujúci workflow nie je vypnutý pre zavedenie helperov.

## Task 4: O(n) detekcia duplicitných LPAR pre Power v2

**Status:** Implementovane a overene focused testami.

**Description:** Implementovať čistý `findDuplicateRecoveryApplicationWorkloads(tiers)` s výsledkami `{ name, tierIds }` nad vybranými `tier.recovery_group.vms`. Utility sama o sebe neblokuje Save: blokovanie sa zapája **len pre IBM Power `dagTemplateVersion === 'v2'`** v existujúcom validátore (Task 5). VMware v1 a Power v1/null nesmú získať nový zákaz.

**Files likely touched:**
- `RA/utils/recoveryApplicationWorkloads.ts` (nový)
- `RA/utils/recoveryApplicationWorkloads.test.ts` (nový)

**Acceptance criteria:**
- [ ] Deteguje presné opakovanie mena medzi tiermi aj v jednom tieri pre použitie v Power v2; každé meno vráti raz s unikátnymi tier IDs, bez mutácie vstupu.
- [ ] Presná name identity bez trim/case folding/sanitizácie; legacy tier.vms a nevybrané options sa ignorujú.
- [ ] Jeden scan cez workloads a lineárne zostavenie výsledku; O(n+t), bez párových porovnaní alebo duplicate React state.

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-applications/utils/recoveryApplicationWorkloads.test.ts`
- [ ] Power v2 LPAR mená v 2/3 tieroch aj same-tier, empty/no-group, case/Unicode, reorder a rename; helper sa nesmie interpretovať ako plošné business pravidlo pre VMware v1/Power v1. Bez časovo krehkého benchmarku.

**Dependencies:** None. **Estimated scope:** Small, 2 súbory. **Owner boundary:** samostatný helper, bez validačného wrappera.

## Task 5: Finálna validácia F1–F3 so spoločnými section helpers

**Status:** Implementovane a overene focused testami.

**Description:** Rozšíriť existujúci validator o Details/Tiers exports, email, source groups, stale membership, aspoň jeden tier a **Power-v2-only LPAR duplicate gate**. Overiť platformu zo source providera alebo locked providerov a explicitnú DAG verziu `v2`; null/default v1 duplicity neblokuje. Zachovať prvú konkrétnu chybu s params a existujúce template/provider guardy. Groups array je povinná.

**Files likely touched:**
- `RA/utils/validateRecoveryApplication.ts`
- `RA/utils/validateRecoveryApplication.test.ts`

**Acceptance criteria:**
- [ ] Details/Tiers/final wrapper používajú helpers z taskov 1,3,4; presné poradie a ValidationError fields sú podľa PLAN, errors majú tier/group/name/source context.
- [ ] Missing/mismatched/unpublished group, odstránený vybraný workload a invalid LPAR blokujú podľa existujúcich pravidiel; **rovnaká VM vo VMware v1 a LPAR v Power v1/null medzi tiermi Save-only/Push neblokuje**, zatiaľ čo Power v2 presné duplicity v jednom/viacerých tieroch blokuje. Prázdny selected VM list zostáva povolený.
- [ ] Locked source je autoritatívny aj pri rozpore s draft.platform, chýbajúci locked ID nemá fallback; policy a DAG version pravidlá sa neoslabia.

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-applications/utils/validateRecoveryApplication.test.ts`
- [ ] Table-driven Create/locked Edit × VMware v1/Power v1/null/v2 × Save-only/Push vrátane duplicitných VM/LPAR, `v1/null ↔ v2` prepnutia, null source, legacy group a nulových tierov. Duplicita VMware/Power v1 je pozitívny test, Power v2 negatívny.

**Dependencies:** 1,3,4. **Estimated scope:** Small, 2 súbory. **Owner boundary:** jediný vlastník shared validátora.

## Task 6: Assignment a workload transitions dodržia source invariant

**Status:** Implementovane a overene focused testami.

**Description:** Zapájať source-scoped eligibility do `assignRecoveryGroup` a pridávania workloadu. Odoberanie workloadu alebo skupiny musí zostať možné aj pri neplatnej referencii.

**Files likely touched:**
- `RA/model/recoveryApplicationDraft.ts`
- `RA/model/recoveryApplicationDraft.test.ts`

**Acceptance criteria:**
- [ ] Assignment odmietne group iného source/typu, missing alebo unpublished group bez zmeny draftu a bez dirty; rešpektuje locked source ID.
- [ ] Select=true vyžaduje eligible current group a membership mena; select=false dovolí odstrániť stale výber. Validácia po select/deselect/replace/delete/reorder zodpovedá novému draftu.
- [ ] Confirm/Cancel source change zachová dnešné pravidlá; nemutujúce queued transitions a StrictMode dirty eventy ostávajú korektné.

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-applications/model/recoveryApplicationDraft.test.ts`
- [ ] Opraviť existujúcu pozitívnu fixture `vmwareGroup.providerId='other-provider'` na source; zachovať explicitné negatívne fixtures, nie oslabiť assertions.

**Dependencies:** 2,3. **Estimated scope:** Small, 2 súbory. **Owner boundary:** sériovo po tasku 2.

## Checkpoint B: Doménové pravidlá

- [ ] Tasky 4–6 overené; rovnaká F1–F3 konfigurácia dá rovnaký výsledok pri Save-only aj Push.
- [ ] Architecture review potvrdil **Power-v2-only** duplicity (vrátane same-tier), nezmenené správanie VMware/Power v1 a zákaz tichej opravy starých aplikácií.
- [ ] Pozitívne fixtures sú kontraktovo platné; žiadne test suppressions alebo mazanie coverage.

## Task 7: Readiness preberie finálne pravidlá

**Status:** Implementovane a overene focused testami.

**Description:** Rozšíriť readiness context o groups/query error a výsledok o section/final error. Do builder volania pridať dostupné groups/error dáta; nenahrádzať UI v tomto tasku. Odstrániť paralelné metadátové/tier validačné podmienky nahradené section helpers.

**Files likely touched:**
- `RA/model/recoveryApplicationDraftReadiness.ts`
- `RA/model/recoveryApplicationDraftReadiness.test.ts`
- `RA/components/RecoveryAppBuilder.tsx` (iba readiness context wiring)
- `RA/components/RecoveryAppBuilder.test.tsx` (context fixtures podľa potreby)

**Acceptance criteria:**
- [ ] Pri overenom contexte canSave zodpovedá finálnemu validátoru pre F1/F2 a iba Power v2 F3; rovnaké LPAR v Power v1/null a VM vo VMware v1 ostávajú validné pri Save-only/Push.
- [ ] Existujúci loading/query error dá referencesUnverified, nie group deleted; provider failure nezíska úspech cez empty/default data. Bez nového Save preflightu.
- [ ] Section gating dovolí opravu pred policy/template krokom a read-only navigation stále vie otvoriť každý krok.

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-applications/model/recoveryApplicationDraftReadiness.test.ts src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx`
- [ ] Explicitne testovať parity invariant a pozitívny single-HMC/locked Edit prípad s chýbajúcimi credentials podľa existujúcej politiky.

**Dependencies:** 5. **Estimated scope:** Medium, najviac 4 súbory. **Owner boundary:** builder wiring v Task 7 musí predchádzať UI zmenám v Task 9.

## Task 8: EN/SK/CS funkčné lokalizácie

**Status:** Implementovane a overene focused testami.

**Description:** Pridať presne funkčné error kľúče uvedené v PLAN a znovu použiť existujúce email/form labels. Žiadne Help Popovers. Pripraviť pred UI taskom 9.

**Files likely touched:**
- `src/locales/en.json`
- `src/locales/sk.json`
- `src/locales/cs.json`
- `src/locales/recoveryApplicationFunctionalTranslations.test.ts` (nový)

**Acceptance criteria:**
- [ ] Nové source mismatch/missing, workload missing, **Power-v2-only** duplicate across/within, tiersRequired a referencesUnverified majú neprázdne texty v troch jazykoch; duplicitné texty výslovne spomínajú IBM Power v2.
- [ ] Placeholder sets sú identické a zodpovedajú validator params; hlásenia uvádzajú opravu aj relevantný tier/name/group/source.
- [ ] Existing lifecycle/template/email texty sa nemenia bez potreby a nevznikajú Phase 2 vysvetlenia.

**Verification:**
- [ ] `npm exec vitest run src/locales/recoveryApplicationFunctionalTranslations.test.ts src/locales/recoveryApplicationLifecycleTranslations.test.ts`
- [ ] JSON parse všetkých troch súborov a kontrola parity nových keys/`{{params}}`.

**Dependencies:** None; slovník a params sú zmrazené v PLAN. **Estimated scope:** Medium, 4 súbory. **Owner boundary:** všetky tri locale súbory má jeden vlastník; môže bežať popri taskoch 1–7.

## Task 9: Email input a konkrétne wizard errors

**Status:** Implementovane a overene focused testami.

**Description:** Zapojiť controlled email input, shared validation errors a source-scoped sidebar/options v builderi. Nahradiť submit-only browser alert inline errorom, zobraziť aj dôvod disabled Save.

**Files likely touched:**
- `RA/components/AppMetadataForm.tsx`
- `RA/components/AppMetadataForm.test.tsx`
- `RA/components/RecoveryAppBuilder.tsx`
- `RA/components/RecoveryAppBuilder.test.tsx`

**Acceptance criteria:**
- [ ] Create/Edit email pochádza z parent draftu, zostáva po návrate medzi krokmi; invalid input má label/aria/error a blokuje Save bez zmeny read-only správania.
- [ ] Sidebar, options aj handler používajú source-scoped pravidlá; uložená invalid group zostane viditeľná a odstrániteľná; source confirm/cancel a locks fungujú.
- [ ] Details/Tiers/footer zobrazia konkrétnu chybu bez duplicate React state; duplicate chyba sa zobrazí **iba pre Power v2**. Prepnutie na Power v1/null ju odstráni a VMware v1 s duplicitnou VM zostane schopný Save. Ostatná neplatná konfigurácia nikdy nevolá onSave.

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-applications/components/AppMetadataForm.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx`
- [ ] Renderovať metadata input aj tier flow; testovať drag/drop, select/deselect, group replace, rename/delete/reorder, prepnutie Power v1/null↔v2 a neblokovanú duplicitu VMware v1; readOnly/isSaving guards zachovať.

**Dependencies:** 2,6,7,8. **Estimated scope:** Medium, 4 súbory. **Owner boundary:** jediný builder vlastník, TierCard/Canvas bez nového props contractu.

## Checkpoint C: Funkčný wizard

- [ ] Tasky 7,8,9 overené focused testami; žiadny disabled Save bez vysvetlenia a žiadny navigation dead end.
- [ ] VMware aj Power zdieľajú F1/F2 pravidlá; F3 je **len Power v2**. VMware v1 a Power v1/null sa nesmú blokovať pre duplicitné VM/LPAR.
- [ ] UI review overí opravu stale a same-tier legacy výberu bez automatického zahodenia dát.

## Task 10: Reálny Create/Edit submit flow a payload

**Status:** Implementovane a overene focused testami.

**Description:** Pridať integračnú suite so skutočným builderom, pages, mapperom a submit facade. Existujúci SaveCompletion integration mockuje builder, preto nestačí ako F1–F4 dôkaz. Mockovať HTTP a externé auth/navigation, nepreskočiť validačnú hranicu.

**Files likely touched:**
- `RA/pages/RecoveryApplicationFunctionalConsistency.integration.test.tsx` (nový)
- `RA/hooks/recoveryApplicationsWire.test.tsx`
- `RA/pages/RecoveryApplicationEditorPage.cache.test.tsx`

**Acceptance criteria:**
- [ ] VMware aj Power Create → Save-only → fresh Edit zachová email/null, selected nested workloads, policy a source/target IDs; Power source=target zostáva valid.
- [ ] Create → Save-only/Push vytvorí správny payload pre VMware v1/null a Power v1/null/v2. Duplicity VMware/Power v1/null sa môžu odoslať; **Power v2** duplicitné LPAR (v rámci alebo naprieč tiermi) nespustia submit mutation ani HTTP POST. Invalid email/source tiež blokujú.
- [ ] Ineligible source/group/provider alebo membership mismatch viditeľný v aktuálne načítaných React Query dátach nevytvorí POST. Query loading/error blokuje Save s dôvodom; Save nespúšťa nový GET. Generated response parsing/cache reconciliation zostávajú aktívne.

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationFunctionalConsistency.integration.test.tsx src/features/recovery-plans/recovery-applications/hooks/recoveryApplicationsWire.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.cache.test.tsx`
- [ ] Presný body/query params aj pri parent mapper volaní po builder validácii; negatívne zero mutation/POST, žiadne dodatočné Save GET; QueryClient a HTTP mocks resetovať medzi testami.

**Dependencies:** 9. **Estimated scope:** Medium, najviac 3 súbory. **Owner boundary:** integračné testy po stabilizácii UI, bez produkčnej page refaktorizácie.

## Task 11: Rollback, read-only a uncertain-state regresie

**Status:** Implementovane a overene focused testami.

**Description:** Doplniť chýbajúce F1–F4 lifecycle scenáre do existujúcich focused testov a spustiť existujúcu DAG version selector regresiu. Mockovaný rollback musí prejsť cez stav overený následným GET.

**Files likely touched:**
- `RA/pages/RecoveryApplicationEditorPage.test.tsx`
- `RA/components/RecoveryApplicationsTable.lifecycle.test.tsx`
- `RA/hooks/useRollbackRecoveryApplication.test.tsx`
- `RA/pages/RecoveryApplicationFunctionalConsistency.integration.test.tsx` (ak je potrebný combined flow)

**Acceptance criteria:**
- [ ] Pushed Edit otvorí všetky kroky, ale email/drop/select/Save nevyvolajú zmenu; initial/failed refresh nepovolí write.
- [ ] Rollback success + potvrdený GET pushed=false → Edit → valid Save; rollback failure alebo unverified GET zachová lock. Stored providers sa nezmenia.
- [ ] 409/502/network uncertainty zachovajú existujúce lock/retry/cache mechanizmy; pri pending Save dvojklik nesmie odoslať druhý POST; selector má jediný default a null wire bez regresie.

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.lifecycle.test.tsx src/features/recovery-plans/recovery-applications/hooks/useRollbackRecoveryApplication.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationFunctionalConsistency.integration.test.tsx src/features/recovery-plans/recovery-applications/components/DagTemplateVersionSelect.test.tsx`
- [ ] Overiť, že live provisioning/Push/Rollback endpoints sa nikdy nekontaktujú.

**Dependencies:** 10. **Estimated scope:** Medium, najviac 4 upravené test súbory. **Owner boundary:** bez production lifecycle zmien; nový nález sa najprv samostatne posúdi voči scope.

## Checkpoint D: Submit a lifecycle dôkazy

- [ ] Tasky 9–11 prešli; invalid konfigurácia nevytvorí submit mutation ani POST.
- [ ] Overený payload z dostupného query kontextu a Rollback → Edit flow pre obe platformy, bez dodatočných GET pri Save.
- [ ] Žiadny BE/generated/RG diff, znížený quality bar, live operácia alebo default template regresia.

## Task 12: Mockované browser QA a uzavretie review

**Status:** QA prešlo; nezávislé review čaká. Všetkých 26 scenárov runnera prešlo, bez neočakávaných chýb.

**Description:** Rozšíriť existujúci `scripts/qa/verify-recovery-applications-dag-lifecycle.mjs` a vykonať osem mockovaných Edge/Playwright browser QA scenárov z PLAN pre VMware aj Power. Nepridávať ďalší runner ani závislosti. Ak runtime nie je dostupný, zaznamenať blokér, nie tvrdiť úspech.

**Files likely touched:**
- `scripts/qa/verify-recovery-applications-dag-lifecycle.mjs` (existujúci browser QA runner)
- `tasks/recovery-applications-functional-phase1-todo.md` (skutočné príkazy/prostredie, výsledky a blokery)

**Acceptance criteria:**
- [x] Browser dôkazy pokrývajú email, source filtering a **platform/version-specific F3**: VMware v1 a Power v1/null povoľujú rovnaké mená v dvoch tieroch; Power v2 blokuje presné duplicity a po prepnutí späť na v1/null chyba zmizne.
- [x] Mockované Save/Push/Rollback lifecycle a existujúce query loading/error/refetch scenáre overujú počty requestov a payload, najmä nulové dodatočné GET pri Save; žiadne živé recovery operácie.
- [ ] Nezávislé review potvrdilo F1–F4 a Definition of Done; obmedzenia vrátane BE race a Power v2 kolízie *odlišných* sanitizovaných mien sú výslovne uvedené. V1/VMware nemajú nový zákaz.

**Verification:**
- [x] Použiť existujúci QA script (localhost Vite + Edge + `PLAYWRIGHT_MODULE` podľa runtime), zapísať skutočný príkaz/verziu a výsledky, alebo explicitný blokér.
- [x] `git diff --check`; skontrolovať scope celého diffu voči PLAN a doplniť, či full suite/build neboli spustené.

**Dependencies:** 11 a checkpoint D. **Estimated scope:** Small, existujúci QA script + 1 dokument. **Owner boundary:** QA/review, bez implementácie Phase 2.

## Final checkpoint / approval gates

- [ ] Plán schválený pred implementáciou; prijaté sú source pravidlá, Power-v2-only presné duplicity (vrátane same-tier), default/null v1 bez zákazu a cache-only FE limity.
- [ ] Všetkých 12 taskov má výsledky focused verifikácie, nie iba dokončený diff.
- [ ] `npm run typecheck`, focused Vitest, focused ESLint a `git diff --check` prešli; každé obmedzenie alebo nespustená kontrola má zaznamenaný dôvod.
- [ ] Funkčný scope F1–F4 schválený nezávislým code/architecture review; neuzavreté nálezy majú explicitný follow-up.
- [ ] Výsledok uvádza zachované invariants, reálne vykonané príkazy, mock/live rozdiel a nespustenú celú suite/build.

## Záznam planning verifikácie (nie implementačné výsledky)

Historický stav po prvom plánovaní: vytvorené boli iba PLAN a TODO, bez implementácie. Používateľ následne upravil plán a autorizoval vykonanie inline; aktuálne výsledky sú nižšie. Git commit/push sa podľa pôvodného zadania nevykonáva.

## Implementa?n? z?znam

- Pouzivatel znova autorizoval vykonanie inline; bez subagentov, BE/OpenAPI/generated/Recovery Groups a Phase 2 uprav.
- Tasky 1-11: implementovane. Finalny focused Vitest: 13 suborov / 431 testov; lifecycle a wire regresie: 6 suborov / 74 testov.
- npm.cmd run typecheck: exit 0. Focused ESLint: 22 TS/TSX/MJS suborov, exit 0; bez suppressions.
- git diff --check: exit 0. Cela suite ani production build neboli spustene.
- Power v2 duplicita ma pristup k Orchestration aj pri neplatnych Tiers, aby sa dala opravit volbou v1/null; Save zostava blokovany, kym je konfiguracia neplatna.
- V1 default option sa pri aktivnom vybere mapuje na null. Uz ulozena explicitna v1 sa zachova, kym pouzivatel vyber nezmeni.
- Existujuce backend provider read schema ma enum source/target s default source; zachovane FE VMware role pravidlo je s tymto normalizovanym kontextom konzistentne.
- Skor vzniknute nesuvisiace zmeny routing snapshotu a Phase 2 dokumentov zostali nedotknute. Git commit/push sa podla povodneho zadania nevykonava.

### Skutocne vykonane overenie

- `npm.cmd exec -- vitest run` s explicitnymi 13 test subormi z taskov 1-10 a locale lifecycle testom: 431/431. Prikaz pouzil paths uvedene vyssie, bez celej suite.
- Doplneny test realneho pending Save dvojkliku: `npm.cmd exec -- vitest run src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationFunctionalConsistency.integration.test.tsx --reporter=dot`: 12/12 (11 povodnych + 1 novy).
- Lifecycle/wire/cache/template regresie: `npm.cmd exec -- vitest run src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.lifecycle.test.tsx src/features/recovery-plans/recovery-applications/hooks/useRollbackRecoveryApplication.test.tsx src/features/recovery-plans/recovery-applications/components/DagTemplateVersionSelect.test.tsx src/features/recovery-plans/recovery-applications/hooks/recoveryApplicationsWire.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.cache.test.tsx --reporter=dot`: 74/74.
- ESLint: `node node_modules/eslint/bin/eslint.js <22 explicitnych zmenenych TS/TSX/MJS suborov> --max-warnings 0`; po poslednych zmenach osobitne re-run integracneho testu a QA scriptu.
- Browser: `npm.cmd run dev -- --host 127.0.0.1 --port 5298 --strictPort`, potom `$env:APP_URL='http://127.0.0.1:5298'; node scripts/qa/verify-recovery-applications-dag-lifecycle.mjs` na Node 22.23.1, lokalny Edge a existujuci playwright-core runtime. 26/26 scenarov, errors=[], 16 mockovanych submit POST.
- Artefakty: `node_modules/.cache/application-lifecycle-qa/report.json`, `network.json` a PNG screenshoty. Kontrola mobilneho CS read-only screenshotu bez horizontalneho overflow.
- Cely build/suite ani zive BE provisioning/Push/Rollback neboli spustene. Limity: cache-only referencie a Power v2 kolizie odlisnych sanitizovanych mien zostavaju podla PLAN. Nezavisle review je dalsi krok, nie tvrdeny vysledok inline kontroly.

### Final verification

- Final `npm.cmd run typecheck`: exit 0 po doplneni pending-Save testu.
- Final focused ESLint pre integracny test a browser QA script: exit 0; predtym 22 zmenenych suborov exit 0.
- Final `git diff --check -- src/features/recovery-plans/recovery-applications src/locales scripts/qa/verify-recovery-applications-dag-lifecycle.mjs tasks/recovery-applications-functional-phase1-plan.md tasks/recovery-applications-functional-phase1-todo.md`: exit 0.
- Zmeny zostavaju inline bez commit/push/merge. Nezavisle code/architecture review nebolo vykonane; jeho checkboxy zostavaju otvorene.

### Následné verziovanie

Používateľ následne výslovne požiadal commitnúť vlastné zmeny postupne podľa implementácie. Tento pokyn nahrádza skorší zákaz commitovania. Zmeny sa rozdeľujú na email mapping, source predicates, detekciu duplicít, draft transitions, spoločnú validáciu s UI a QA s dokumentáciou. Push ani merge sa nevykonáva; nesúvisiaci routing snapshot a Phase 2 dokumenty sa nezahŕňajú.

### Nezávislé review a doplnené topologické testy F2 (27. 10. 2026)

- Review aktuálneho FE: F1 email, F2 presný source vCenter/HMC, F3 iba explicitný Power v2 a F4 readiness/final validation sú implementované; existujúci Save/Push lifecycle sa nemenil. Predchádzajúce browser 26/26 je historický výsledok implementačného agenta, nie nový browser run v tomto review.
- **Nová unit test suite:** `src/features/recovery-plans/recovery-applications/utils/recoveryGroupSourceTopology.test.ts`. Šesť parameterizovaných testov: VMware/Power × local/metro_mirror-managed/metro_mirror-existing. Používa skutočný generated RecoveryGroup parser, mapper a source-eligibility predicate. Overuje `provider_id_vm` vs. `provider_id_volume`, auxiliary FlashSystem partner, source mismatch, storage-ID mismatch, published=false a missing run ID.
- **Rozšírená integračná suite:** `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationFunctionalConsistency.integration.test.tsx`. Šesť topologických prípadov, **v každom pozitívny a negatívny source variant**: 12 variantov cez reálne GET mocky, Recovery Group mapper, wizard/sidebar/readiness a Save. Source matching sa môže uložiť s jediným POST a bez dodatočného Save GET; foreign compute source sa neponúkne a Save nie je dostupný.
- **Skutočne spustený focused Vitest:** uvedené dva test súbory `24/24` (vrátane doterajších integračných scenárov), exit 0. Focused ESLint nových/upravených testov: exit 0. Počas kontroly sa paralelne mení Phase 2 kód; celkový typecheck najprv hlásil aj TS4111 v novom integračnom teste (opravené použitím `tiers['first']`) a TS2769 v súbežnom Phase 2 rozšírení `RecoveryAppBuilder.test.tsx`. Po oprave TS4111 bol `npm.cmd run typecheck` zopakovaný: **exit 2**, zostali už iba dve TS2769 chyby na riadkoch 1519–1520 v paralelne rozpracovanom **Phase 2** teste `RecoveryAppBuilder.test.tsx` (`name: string | undefined` pri `screen.getByRole`). Nový Phase 1 integračný test už TypeScript chybu nemá. **Phase 2 vlastník musí svoje TS chyby opraviť a celkový typecheck opakovať**; zatiaľ nie je zelený.
- BE, Recovery Groups produkčná implementácia, generated/Orval a Phase 2 zdroje neboli v rámci tohto review upravené. Nevykonali sa živé Push/Rollback, nový browser run, commit ani push. Hard invariant F2 nad stale cache a VMware storage Airflow connection nie sú týmto testom garantované.
- Následná nezávislá kontrola po opravách v Phase 2: 14 súborov focused Vitest **460/460**, 5 lifecycle súborov **84/84**, `npm run typecheck` **exit 0**, focused ESLint a `git diff --check` **exit 0**. Pôvodné dve TS2769 chyby z Phase 2 už nie sú prítomné. Existujúci mocked-browser report **26/26** bol skontrolovaný, ale browser nebol v tomto review opätovne spustený; celá suite/build ani live recovery neboli vykonané.
