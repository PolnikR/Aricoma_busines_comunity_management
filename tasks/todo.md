# Úlohy: dizajn Recovery Group a opravy funkčného auditu

Dátum: 2026-10-20. Plán: [plan.md](plan.md). Stav: pripravené na realizáciu; nižšie nie je implementácia označená ako hotová.
Rozsah T1–T10: iba Group builder. V tomto pôvodnom bloku sa Recovery Apps/tiers a Resources drag-and-drop nemenia. Rozšírenie 2026-10-21: A1–A11 pokrývajú výhradne funkčné opravy sekcie 8 plánu; pôvodné otvorené úlohy zostávajú zachované.
Záväzná podmienka T1–T10: zachovať aplikačné štýly a komponenty aj existujúce doménové správanie. HTML je referencia rozloženia a ovládania; jeho samostatné CSS sa nekopíruje. Nepridávať nové validačné ani lifecycle pravidlá.
Relatívne feature cesty v T1–T10 majú prefix `src/features/recovery-plans/recovery-groups/`. Blok A používa explicitné cesty od koreňa repozitára.

## T1: VM pôvod objavených volumes

**Popis:** Rozšíriť existujúci discovery hook o odvodené väzby volume → VM bez nových requestov alebo zmeny query keys.
**Súbory:** `hooks/useRecoveryGroupRelatedVolumes.ts`, `hooks/useRecoveryGroupRelatedVolumes.test.tsx`.
**Akceptácia:**
- [ ] Zdieľaný volume má jeden názov a všetky príslušné VM; podporené VMware aj IBM Power odpovede.
- [ ] Loading/error/disabled stavy nemenia doterajší query kontrakt a čiastočné discovery sa nepovažuje za úplné potvrdenie pôvodu.
- [ ] Po zmene VM/provider kontextu nie sú prezentované staré väzby; počet requestov ostáva ako predtým.
**Overenie:** `npm.cmd exec vitest run src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupRelatedVolumes.test.tsx`.
**Závislosti:** žiadne. **Rozsah:** S, 2 súbory.

## T2: Lokalizácie nových ovládacích prvkov

**Popis:** Pripraviť texty Related storage, pickeru a súhrnu v existujúcich namespaces; znovu použiť spoločné Add/Cancel/Remove/Retry.
**Súbory:** `src/locales/en.json`, `src/locales/sk.json`, `src/locales/cs.json`.
**Akceptácia:**
- [ ] Rovnaké kľúče v troch jazykoch pre included volumes, From VM/Manual/Saved selection, Add volumes/Add selected, included/pending counts, empty/no matches a storage-provider kontext.
- [ ] Súhrn používa preklady existujúcich typov/topológie a texty pre chýbajúcu hodnotu; žiadny text neoznačuje push ako úspešný recovery run.
- [ ] Interpolácie počtov a názvov majú zhodné parametre; text Remove vysvetlí odstránenie zo skupiny, nie storage objektu.
**Overenie:** `node -e "for (const l of ['en','sk','cs']) JSON.parse(require('fs').readFileSync('src/locales/'+l+'.json','utf8')); console.log('JSON OK')"`; content assertion zhodnosti pridaných kľúčov a placeholderov; `git diff --check`.
**Závislosti:** žiadne. **Rozsah:** M, 3 súbory.

## T3: Výber ďalších volumes

**Popis:** Pridať feature picker cez existujúci Modal a inventory hook pre FlashSystem providera. Pending výber je lokálny a potvrdenie je batch.
**Súbory (nové):** `components/RecoveryGroupVolumePickerModal.tsx`, `components/RecoveryGroupVolumePickerModal.test.tsx`.
**Akceptácia:**
- [ ] Search a checkboxy umožnia vybrať viac volumes vrátane takých, ktoré discovery pre VM nenašlo; included položky sú disabled a pending prežije filtrovanie.
- [ ] Add selected vráti deduplikovaný batch; Cancel/Escape/zatvorenie nič nemení. Zmena providera/readOnly kontextu zahodí pending; prázdny výber nemožno potvrdiť.
- [ ] Loading/error/Retry/empty/no matches sú rozlíšené pri zachovaní existujúcej politiky dostupných dát; žiadne nové doménové blokovanie. Focus, popisy a návrat na opener používajú spoločný Modal a existujúce aplikačné controls.
**Overenie:** `npm.cmd exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupVolumePickerModal.test.tsx`.
**Závislosti:** T2. **Rozsah:** S, 2 súbory.

## Checkpoint 1: dátové a výberové základy

- [ ] Testy T1 a T3 prešli, JSON je validný; žiadne zmeny query keys/API.
- [ ] Picker test dokazuje batch, Cancel a provider/readOnly zmenu, nie iba samotné zobrazenie.

## T4: Tabuľka Related storage

**Popis:** Pridať prezentačný krok s Included volumes a pickerom; na tomto kroku nebude drop zóna. DOM komponent nebude vlastniť potvrdený draft.
**Súbory (nové):** `components/RecoveryGroupRelatedStorageStep.tsx`, `components/RecoveryGroupRelatedStorageStep.test.tsx`.
**Akceptácia:**
- [ ] Riadky zobrazia názov, pôvod/VM väzby a Remove; provider a počty sú mimo opakovaných riadkov. Saved selection sa nevydáva za Manual.
- [ ] Add volumes, Remove a Clear selection používajú callbacky, readOnly blokuje akcie; loading/error nie je prázdny úspešný výsledok.
- [ ] Existing má auxiliary editor pre každý volume a jeho chybu; Managed zobrazuje generované hodnoty read-only. Zachované miesto pre consistency group informácie a warningy.
**Overenie:** `npm.cmd exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupRelatedStorageStep.test.tsx`.
**Závislosti:** T1, T2, T3. **Rozsah:** S, 2 súbory.

## T5: Zapojenie do Create/Edit a Metro Mirror

**Popis:** Vymeniť iba compact Related storage vetvu Buildera. Použiť existujúci selectionDraft, exclusions, prefill a validáciu. Pôvod uložených položiek sledovať len na prezentačné účely.
**Súbory:** `components/RecoveryGroupBuilder.tsx`, `components/RecoveryGroupBuilder.test.tsx`, podľa potreby `components/RecoveryGroupBuilder.prefetch.test.tsx`.
**Akceptácia:**
- [ ] Automatic + manual výber sa deduplikuje; viac additions prejde jednou funkčnou aktualizáciou. Remove/Clear nezmaže storage objekt a refetch v rovnakom kontexte nevráti vylúčenú položku; explicitné pridanie ju obnoví.
- [ ] Existing prefill/override/consistency validation aj Managed/pushed locks ostávajú; pending/error discovery nemaže uložené výbery/overrides. Provider/VM zmeny rešpektujú doterajší reset a prefetch.
- [ ] Payload, submit, 7/8 krokov a Resources workflow sú nezmenené; volume-only skupina nemá Related storage. Zrušený picker nemení dirty stav.
**Overenie:** `npm.cmd exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.prefetch.test.tsx src/features/recovery-plans/recovery-groups/utils/reconcileMetroMirrorPrefill.test.ts`.
**Závislosti:** T4. **Rozsah:** M, najviac 3 súbory.

## Checkpoint A: správanie Related storage

- [ ] Vytvoriť a editovať VM skupinu; automatic + manual volumes sa dostanú do existujúceho payloadu bez straty.
- [ ] Resources je stále pôvodný drag-and-drop a volume-only vetva funguje.
- [ ] Local/Existing/Managed, neúplný rollback a discovery/inventory chyby majú regresné pokrytie.

## T6: Kompaktné kroky ako opt-in variant

**Popis:** Rozšíriť existujúci WizardSteps o malý explicitný kompaktný variant, bez globálneho preštýlovania ostatných wizardov.
**Súbory:** `src/shared/components/wizard-steps/WizardSteps.tsx`, `src/shared/components/wizard-steps/WizardSteps.test.tsx`.
**Akceptácia:**
- [ ] Nový variant má kompaktné technické číslovanie a aktívny pruh podľa návrhu; default variant ostáva nezmenený.
- [ ] Disabled/aria-current/onStepChange a klávesnica fungujú identicky v oboch variantoch.
- [ ] Horizontálny mobilný zoznam zostáva dostupný; kroky ani completion indikácia netvrdia runtime recovery stav.
**Overenie:** `npm.cmd exec vitest run src/shared/components/wizard-steps/WizardSteps.test.tsx` a vizuálne porovnanie oboch variantov.
**Závislosti:** checkpoint A. **Rozsah:** S, 2 súbory.

## T7: Layout a priebežný súhrn Group buildera

**Popis:** Zapnúť kompaktné kroky iba pre Group a pridať pravý kontextový súhrn odvodený z draftu. Zachovať page shell, lifecycle alerty a päty.
**Súbory:** `components/RecoveryGroupBuilder.tsx`, `components/RecoveryGroupBuilder.test.tsx`, nové `components/RecoveryGroupConfigurationSummary.tsx`, `components/RecoveryGroupConfigurationSummary.test.tsx`.
**Akceptácia:**
- [ ] Súhrn reaguje na názov, identitu, typ, počty, topológiu, policy a push bez nových requestov alebo kópie form state.
- [ ] Pri úzkom obsahu ide súhrn pod formulár, mobilné polia sú jednosĺpcové; Resources a storage mappingy zostávajú použiteľné aj pri globálnom sidebare.
- [ ] Create/Edit, Cancel guard, validation, lifecycle lock, Back/Next a finálne submit akcie ostávajú; nevloží sa prototype Review ani scenario prepínač.
**Overenie:** `npm.cmd exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupConfigurationSummary.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx`; browser layout pri 320/768/1024/1440 px a nízkej výške.
**Závislosti:** T6. **Rozsah:** M, 4 súbory.

## T8: Kompaktné Details a Provider

**Popis:** Preniesť hustotu, dvojstĺpcové rozloženie a typografiu tam, kde sú údaje skutočne súvisiace. Výber resource type zachováva existujúce voľby a správanie v novom shelli.
**Súbory:** `components/RecoveryGroupDetailsStep.tsx`, `components/RecoveryGroupProviderStep.tsx` a ich existujúce `.test.tsx`.
**Akceptácia:**
- [ ] ID/názov sú pri dostatku miesta vedľa seba, popis cez celú šírku; technické ID monospace, správne labely a required chyby.
- [ ] Edit ID lock, provider eligibility, scope a loading/error/retry sú zachované; žiadne globálne form control zmeny.
- [ ] Mobile, light/dark a dlhé hodnoty sú čitateľné; type/provider voľby nie sú zúžené na VMware z prototypu.
**Overenie:** `npm.cmd exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupDetailsStep.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupProviderStep.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupTypeStep.test.tsx`.
**Závislosti:** T7. **Rozsah:** M, najviac 4 súbory.

## T9: Kompaktná topológia, Policy set a Orchestration

**Popis:** Zjednotiť technický vzhľad zvyšných konfiguračných krokov pri zachovaní ich doménových pravidiel.
**Súbory:** `components/RecoveryGroupTopologyStep.tsx`, `components/RecoveryGroupPolicySetStep.tsx`, `components/RecoveryGroupOrchestrationStep.tsx`; najviac dva relevantné existujúce test súbory podľa zmeneného správania.
**Akceptácia:**
- [ ] Local/Metro Mirror, partner provider a Existing/Managed voľby aj ich edit locks sú zachované; každý nový layout ukazuje tie isté údaje.
- [ ] Policy set a Airflow eligibility/sole provider/push ostávajú nezmenené; uloženie konfigurácie sa neprezentuje ako úspešná obnova.
- [ ] Styling používa existujúce tokeny, pokrýva light/dark a neodstraňuje loading/error/empty/disabled vysvetlenia.
**Overenie:** `npm.cmd exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupTopologyStep.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetStep.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupOrchestrationStep.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupMetroMirrorFields.test.tsx`.
**Závislosti:** T8. **Rozsah:** M, najviac 5 súborov; prípadné ďalšie zmeny testov rozdeliť na následný malý krok.

## Checkpoint B: dizajn celého Create/Edit

- [ ] Všetky kroky zodpovedajú schválenému technickému smeru; Resources si zachoval pôvodný workflow.
- [ ] Štýly vychádzajú z existujúcej aplikácie; rovnaké funkčné scenáre dávajú zhodný výber, validáciu a submit payload pred/po úprave UI.
- [ ] Recovery Apps a default WizardSteps sa vizuálne ani funkčne nezmenili.
- [ ] Žiadne fixture hodnoty, prototype controls, nové endpointy ani generated zmeny.

## T10: Záverečné focused a browser overenie

**Popis:** Overiť celú dotknutú cestu, zaznamenať konkrétne výsledky a limity. Neoznačiť chýbajúci browser test za úspešný.
**Súbory:** `tasks/todo.md` na evidenciu; neočakávajú sa ďalšie implementačné zmeny.
**Akceptácia:**
- [ ] Nové komponentové testy, regresný príkaz zo sekcie 6 plánu, focused ESLint zmenených TS/TSX, JSON kontrola a diff check prešli.
- [ ] Browser matica z plánu prešla vrátane modal focusu/Escape, Resources drag-and-drop, responsive/light/dark, retry a dlhých názvov; screenshoty alebo presný blokér sú zaznamenané.
- [ ] Diff obsahuje iba schválený rozsah; overené zmeny sú atomicky commitnuté. Bez automatického pushu/deploy; úplná suite/build len pri zdokumentovanom dôvode alebo explicitnom pokyne.
**Overenie:** focused regresia z plan.md; `npm.cmd exec eslint -- <skutocne-zmenene-TS-TSX-subory> --max-warnings 0`; `git diff --check`; browser matica. Placeholder v lint príkaze nahradiť presnými cestami z diffu.
**Závislosti:** checkpoint B. **Rozsah:** S, evidencia a overenie.

## Odovzdanie

- [ ] Každá vyššie uvedená úloha má zaznamenaný výsledok; nesplnené kontroly zostali explicitne otvorené.
- [ ] Report obsahuje reálne spustené príkazy, commity a stav vizuálneho overenia; nepredstiera beh plnej suite/build.

## Overenie tohto plánovacieho výstupu

Dokumenty sú plán, nie dôkaz úspechu budúcej implementácie. Teraz sa vykoná iba obsahová kontrola plánovacích súborov a Git diff check. Produkčný kód ani HTML prototyp sa v tejto úlohe nemenia.

## Opravy funkčného auditu: A1–A11

Návrh a hranice: [plan.md, sekcia 8](plan.md#8-opravy-funkčného-auditu). Úlohy predstavujú opravy; testy overujú ich výsledok. Nové súbory sú označené ako plánované. Pri každej úlohe najprv reprodukcia, potom implementácia a focused zelené overenie, lint zmenených súborov a atomic commit. Nie je to zadanie na vykonanie opráv v aktuálnej plánovacej relácii.

## A1: F-04 — invalidácia po zmene providera

**Popis:** Zaviesť cielenú success politiku sekcie 8.2 a zapojiť submit/delete infra aj platform providerov; zachovať generated vlastné invalidácie aj lokálne callbacky.
**Súbory:** nové/plánované `src/shared/query/providerMutationInvalidation.ts`, `src/shared/query/providerMutationInvalidation.test.tsx`; `src/app/providers.tsx`. **Rozsah:** M, 3 súbory. **Závislosti:** žiadne.
**Akceptácia:**
- [ ] Generated submit mutácia obnoví čerstvú cache dotknutého providera vo všetkých používaných inventár/search variantoch vrátane agregovaných; iný explicitný provider zostáva nedotknutý.
- [ ] Delete neponechá staré dáta po dobehnutí pending requestu; platform provider sa nezamieňa s infra ID a obnoví svoje skutočné závislé orchestration queries.
- [ ] Error nespustí success invalidáciu; callbacky a relevantné skipInvalidation správanie ostávajú. Bez ručných generated úprav a refetch all.
**Overenie:** `npm.cmd exec vitest run src/shared/query/providerMutationInvalidation.test.tsx src/features/providers-connectors/providers/model/providersWire.test.tsx`.

## A2: F-04 — závislosti credentials

**Popis:** Rozšíriť A1 o submit/delete credential; odvodiť dotknuté ID z cached provider zoznamov a ošetriť neúplnú znalosť závislostí.
**Súbory:** `src/shared/query/providerMutationInvalidation.ts`, `src/shared/query/providerMutationInvalidation.test.tsx`. **Rozsah:** S, 2 súbory. **Závislosti:** A1.
**Akceptácia:**
- [ ] Credential success obnoví infra/platform statusy vo všetkých role/type variantoch a inventár známych súvisiacich infra providerov; pri úplnej znalosti nezneplatní nesúvisiacu explicitnú cache.
- [ ] Neúplná provider cache použije zdokumentovaný fallback iba na potrebné rodiny queries; nie globálny clear/refetch.
- [ ] Test dokazuje edit/delete, active/inactive cache v staleTime a error bez invalidácie cez výsledné dáta/requesty, nie iba spy.
**Overenie:** `npm.cmd exec vitest run src/shared/query/providerMutationInvalidation.test.tsx`.

## Checkpoint C: cache

- [ ] A1–A2 majú zelené focused testy a mapu závislostí; FE/BE cache politika sa nezamieňa.
- [ ] Zaznamenané výsledky, scope a atomic commity; infra/platform identity sú oddelené.

## A3: F-01 — Retry konkrétneho latest runu

**Popis:** Oddeliť kolekčné a entity-scoped Retry cez hook, page a tabuľku; zachovať horný Refresh.
**Súbory:** `src/features/recovery-plans/recovery-runs/hooks/useOrchestratedEntityRuns.ts`, jeho `.test.tsx`; `src/features/recovery-plans/recovery-runs/pages/RecoveryRunsPage.tsx`, jeho `.test.tsx`; `src/features/recovery-plans/recovery-runs/components/RecoveryRunsTable.tsx`. **Rozsah:** M, 5 súborov; potrebné ďalšie úpravy table testov oddeliť do malého nadväzujúceho commitu. **Závislosti:** žiadne.
**Akceptácia:**
- [ ] Po 503 row Retry vyvolá get_orchestrator_runs pre správny provider/DAG a úspech odstráni chybu; nerefetchuje iba kolekcie ani iný úspešný riadok.
- [ ] Horný Refresh obnoví kolekcie aj viditeľné latest runs; app/group so zhodným ID sa rozlišujú.
- [ ] Zachované loading/empty/cached-error stavy a selection; page integračný test použije skutočný query hook so stub fetch.
**Overenie:** `npm.cmd exec vitest run src/features/recovery-plans/recovery-runs/hooks/useOrchestratedEntityRuns.test.tsx src/features/recovery-plans/recovery-runs/pages/RecoveryRunsPage.test.tsx src/features/recovery-plans/recovery-runs/components/RecoveryRunsTable.test.tsx`.

## A4: F-02 — vyhľadávanie podľa názvu

**Popis:** Feature-local search adaptér pre ID a zobrazovaný názov, bez zmeny shared search kontraktu.
**Súbory:** `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.tsx`, jeho `.test.tsx`. **Rozsah:** S, 2 súbory. **Závislosti:** žiadne.
**Akceptácia:**
- [ ] Rozdielne ID a názov sa dajú vyhľadať oba, case-insensitive a s trimovaním search.
- [ ] Search funguje s environment/platform filtrami, resetom stránky a no-match stavom.
- [ ] Delete/edit/detail dostanú pôvodný záznam; description sa bez požiadavky neprehľadáva.
**Overenie:** `npm.cmd exec vitest run src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx`.

## Checkpoint D: Runs a search

- [ ] A3–A4 majú opravený používateľský výsledok a zelené regresné testy.
- [ ] Horný Refresh a filtre fungujú; focused lint a diff check prešli.

## A5: Texty neaktuálneho inventára a chýbajúceho reportu

**Popis:** Doplniť iba texty potrebné pre A6/A10 do existujúcich namespaces; využiť spoločné Retry/Close.
**Súbory:** `src/locales/en.json`, `src/locales/sk.json`, `src/locales/cs.json`. **Rozsah:** M, 3 súbory. **Závislosti:** žiadne; nekonať súbežne s T2.
**Akceptácia:**
- [ ] Zhodné nové kľúče a placeholdery v troch jazykoch.
- [ ] Refresh-failed text označí posledné známe dáta; missing-report text odlíši úspešný delete request od nepotvrdeného výsledku rollbacku.
- [ ] Text nenavádza na opakovaný delete ani netvrdí nepreukázaný rollback failure.
**Overenie:** `node -e "for (const l of ['en','sk','cs']) JSON.parse(require('fs').readFileSync('src/locales/'+l+'.json','utf8')); console.log('JSON OK')"`; content assertion nových kľúčov/placeholderov; `git diff --check`.

## A6: F-03 — inventár pri background chybe

**Popis:** Odlíšiť initial error od data + error v oboch inventároch a pripojiť neblokujúci alert/Retry.
**Súbory:** `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationInventory.tsx`, jeho `.test.tsx`; `src/features/recovery-plans/recovery-groups/components/RecoveryGroupInventory.tsx`, jeho `.test.tsx`. **Rozsah:** M, 4 súbory. **Závislosti:** A5.
**Akceptácia:**
- [ ] Po úspešnom fetch a zlyhanom refetch zostanú dáta s varovaním; úspešný Retry ich obnoví a varovanie odstráni.
- [ ] Bez dát ostáva error placeholder; noRun, unsupported Power a target-error vetvy sú zachované.
- [ ] Zmena run/target kontextu neukáže cudzie cached dáta; test zahŕňa QueryClient background refetch.
**Overenie:** `npm.cmd exec vitest run src/features/recovery-plans/recovery-applications/components/RecoveryApplicationInventory.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupInventory.test.tsx`.

## A7: Odstránenie nefunkčného infra Port poľa

**Popis:** Odstrániť infra port input/state/dirty kontrolu/validáciu; zachovať infra payload aj funkčný Platform Provider port.
**Súbory:** `src/features/providers-connectors/providers/components/ProviderCreateForm.tsx`, `src/features/providers-connectors/providers/components/ProvidersCreateModal.tsx`, jeho `.test.tsx`. **Rozsah:** M, 3 súbory. **Závislosti:** žiadne.
**Akceptácia:**
- [ ] Create/Edit infra providera neponúka neukladaný port a jeho odstránená validácia neblokuje submit.
- [ ] Payload ostáva bez portu; ostatné validácie a dirty guard fungujú.
- [ ] PlatformProvidersModal/port a potrebné shared preklady sa nemenia.
**Overenie:** `npm.cmd exec vitest run src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersModal.test.tsx`.

## Checkpoint E: inventár a formulár

- [ ] A5–A7 prešli focused kontrolami; en/sk/cs JSON je validný.
- [ ] Varovanie neskrýva inventár a odstránenie infra portu nezasiahlo platform port.

## A8: Zachovanie uložených VM tagov

**Popis:** Zachovať úplné vmTags pri inicializácii a uložení bez zmeny selectoru; nahradiť test tichej legacy normalizácie.
**Súbory:** `src/features/providers-connectors/providers/components/ProvidersCreateModal.tsx`, jeho `.test.tsx`. **Rozsah:** S, 2 súbory. **Závislosti:** A7 kvôli zdieľaným súborom.
**Akceptácia:**
- [ ] Edit providera s dvoma tagmi a zmena iba názvu odošle oba tagy v pôvodnom poradí.
- [ ] Explicitný výber/clear selectoru použije existujúcu jedno-tagovú semantiku; bez novej multi-tag funkcionality.
- [ ] Cancel/loading/error lookupu nemenia tagy; dirty guard rozlišuje nezmenený zoznam od vedomej úpravy.
**Overenie:** `npm.cmd exec vitest run src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx`.

## A9: R-01 — reset stránkovania histórie

**Popis:** Reset pri zmene entity/provider/DAG aj close cez URL/back; prvý request novej entity má offset=0.
**Súbory:** `src/features/recovery-plans/recovery-runs/components/RecoveryRunHistoryDetailView.tsx`, jeho `.test.tsx`; `src/features/recovery-plans/recovery-runs/pages/RecoveryRunsPage.tsx`, jeho `.test.tsx`. **Rozsah:** M, najviac 4 súbory. **Závislosti:** A3 kvôli zdieľaným súborom.
**Akceptácia:**
- [ ] Page=3 entity A a URL/entity zmena na B začne B s offset=0 aj pri jedinej strane histórie.
- [ ] Close/open, URL/back odstránenie/obnovenie entity a provider/DAG zmena začínajú na strane 1.
- [ ] História, Airflow link a active-run polling fungujú; bez dát iného kontextu.
**Overenie:** `npm.cmd exec vitest run src/features/recovery-plans/recovery-runs/components/RecoveryRunHistoryDetailView.test.tsx src/features/recovery-plans/recovery-runs/pages/RecoveryRunsPage.test.tsx src/features/recovery-plans/recovery-runs/hooks/useAppRunHistory.test.tsx`.

## A10: R-02 — oznámenie chýbajúceho rollback reportu

**Popis:** Reprodukovať optional odpoveď a po orchestrated delete bez reportu ukázať neutrálne varovanie, bez zmeny backendového kontraktu.
**Súbory:** `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.tsx`, jeho `.test.tsx`; `src/features/recovery-plans/recovery-applications/hooks/recoveryApplicationsWire.test.tsx`; podľa potreby `src/features/recovery-plans/recovery-applications/hooks/useDeleteRecoveryApplication.ts`. **Rozsah:** M, najviac 4 súbory. **Závislosti:** A5, A4 kvôli zdieľaným súborom.
**Akceptácia:**
- [ ] Wire stub HTTP success bez/null reportu prejde kontraktom; orchestrated app zobrazí oznámenie o nedostupnom výsledku rollbacku.
- [ ] Local delete bez reportu ostáva úspešný bez varovania; ok/partial/failed/skipped reporty sa naďalej zobrazujú.
- [ ] Nevznikne druhý delete ani zavádzajúci výsledok rollbacku; zoznam sa obnoví a HTTP error ostane samostatnou chybou.
**Overenie:** `npm.cmd exec vitest run src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx src/features/recovery-plans/recovery-applications/hooks/recoveryApplicationsWire.test.tsx`.

## Checkpoint F: konfigurácia a podmienečné scenáre

- [ ] A8–A10 majú reprodukciu a nápravu; optional rollback kontrakt ostal zachovaný.
- [ ] Edit iného provider poľa zachová tagy; navigácia histórie nepoužíva starý offset.

## A11: Odovzdanie opráv a dôkazy

**Popis:** Skontrolovať výsledky A úloh a browser scenáre sekcie 8.4; checklist aktualizovať podľa vykonaných kontrol.
**Súbory:** `tasks/todo.md` na evidenciu. **Rozsah:** S. **Závislosti:** A1–A10 a checkpointy C–F.
**Akceptácia:**
- [ ] Každá oprava má presný test príkaz, nenulový počet očakávaných testov, exit code a commit; passWithNoTests nesmie skryť chýbajúce súbory.
- [ ] Browser scenáre sekcie 8.4 majú výsledky/stub/live rozlíšenie alebo presný blokér; nevykonané kontroly ostávajú otvorené.
- [ ] Focused lint, JSON a diff check prešli; T úlohy sa neoznačili nesprávne ako hotové. Full suite/build iba pri konkrétnom dôvode alebo pokyne.
**Overenie:** presné dotknuté testové príkazy A1–A10 podľa finálneho diffu; `npm.cmd exec eslint -- <skutocne-zmenene-TS-TSX-subory> --max-warnings 0`; JSON príkaz A5; `git diff --check`. Lint placeholder pred spustením nahradiť presnými cestami.

## Stav rozšírenia 2026-10-21

Používateľ schválil doplnenie existujúcich dokumentov. Riešenia sú pripravené na vecnú revíziu pred implementáciou. V tejto relácii sa mení iba plán/checklist; A1–A11 ani pôvodné T úlohy nie sú označené za hotové.
