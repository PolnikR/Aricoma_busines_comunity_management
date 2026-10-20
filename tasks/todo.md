# Úlohy: technický dizajn Create/Edit Recovery Group

Dátum: 2026-10-20. Plán: [plan.md](plan.md). Stav: pripravené na realizáciu; nižšie nie je implementácia označená ako hotová.
Rozsah: iba Group builder. Recovery Apps/tiers a Resources drag-and-drop sa nemenia.
Záväzná podmienka všetkých úloh: zachovať aplikačné štýly a komponenty aj existujúce doménové správanie. HTML je referencia rozloženia a ovládania; jeho samostatné CSS sa nekopíruje. Nepridávať nové validačné ani lifecycle pravidlá.
Všetky relatívne feature cesty nižšie majú prefix `src/features/recovery-plans/recovery-groups/`.

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
