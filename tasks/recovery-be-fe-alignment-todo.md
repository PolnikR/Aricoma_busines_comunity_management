# TODO: Recovery BE/FE alignment

Stav: implementácia prebieha inline podľa pokynu používateľa z 2026-10-30. D1/D2 zachované; D3–D5 vykonávame podľa odporúčaní plánu.
Zdroj: [plán a zdrojové dôkazy](recovery-be-fe-alignment-plan.md).

## Brána pred implementáciou

- [x] D1: samostatný forced request, lokálne blokovanie dvojkliku, bez cooldownu a koordinácie hypotetických ovládačov.
- [x] D2: zachovať FE krok 15 minút, bez pevného limitu 600; BE autorita a viditeľný HTTP 422 detail.
- [x] Používateľ rozhodol D3–D5.
- [x] Používateľ dal ďalší výslovný pokyn začať implementáciu.
- [x] Znovu overené FE/BE HEAD, lokálne AGENTS.md a pracovné stromy.
- [x] Vstupné OpenAPI/Zod zmeny zachované; vlastníctvo kontraktu overené bez generácie.

Poradie: **T1 → T2 → CP1 → T3 → CP2 → T4 → T6a → T6b → CP3 → T5 → T7 → CP4**.
T2 je voliteľná vetva podľa D4. Pri jej odložení označiť rozhodnutie, nie hotovú
implementáciu. D1 a D2 sú pevné rozhodnutia: bez cooldownu, bez zdieľaného
registry pre hypotetické ovládače a bez uvoľnenia FE kroku 15 minút. T3 sa
sústredí na HTTP 422 a regresie, nie na zmenu frequency pravidiel.
Všetky príkazy nižšie sú na budúce vykonanie, nie výsledky tejto plánovacej práce.

V cestách používame presné prefixy:

- `RG` = `src/features/recovery-plans/recovery-groups`
- `RA` = `src/features/recovery-plans/recovery-applications`
- `RP` = `src/features/recovery-plans/recovery-policies/application-recovery`

Prefixy sú iba skratky dokumentácie. Do CLI vkladať rozvinuté cesty.

## T1: Explicitný Inventory Refresh cez živý pokus

**Opis:** Pridať feature hook pre jednorazový forced fetch a zapojiť existujúci
Refresh. Zachovať bežný generated query, jeho key aj summary observer. Naplniť
race/cancellation invarianty z plánu; nezmeniť retry na implicitný live refresh.
Použiť len lokálny pending lock jediného existujúceho ovládača; nepridávať
cross-component registry/singleton ani 5-sekundový cooldown.

**Súbory (4, M):**

- `RG/hooks/useRefreshRecoveryGroupInventory.ts` — nový
- `RG/hooks/useRefreshRecoveryGroupInventory.test.tsx` — nový
- `RG/components/RecoveryGroupInventory.tsx`
- `RG/components/RecoveryGroupInventory.test.tsx`

`RecoveryGroupInventorySummary.tsx`, generated klient aj mutator zostanú bez zmeny;
test ich používa ako skutočných pozorovateľov, nie iba mock summary textu.

**Akceptačné kritériá:**

- [x] Refresh odosiela `run_id` a `force_refresh=true` presne raz; bežný load,
  retry, focus/reconnect a nasledujúci refetch force neobsahujú. Žiadny forced cache key.
- [x] Inventory aj Summary zobrazia výsledok z jediného raw canonical cache záznamu;
  HTTP chyba zachová dáta a otvorené volume riadky, error je viazaný na správny run.
- [x] Synchronný lokálny pending lock zabráni dvojkliku; abort alebo ignorovanie
  neskorého výsledku, token a query identity zabránia stale zápisom po zmene
  run/unmount/delete a prepísaniu forced výsledku starým GET. Bez globálnej
  koordinácie hypotetických ovládačov a bez cooldownu.

**Scenáre:**

1. Initial GET A bez force → pending Refresh A s force → nové snapshots aj summary;
   cache neobsahuje key s force; uložená hodnota je celý response.
2. Dvojklik v tom istom ticku na existujúcom jednom Refresh tlačidle A → iba jeden
   request. Tlačidlo disabled počas query fetch aj forced pending, po dokončení
   sa odomkne. Nepridávať test koordinácie dvoch hypotetických ovládačov.
3. Forced HTTP 404/500, network a contract error → staré dáta zostanú; Retry je obyčajný
   GET. Pri initial chybe bez cache funguje pôvodný FetchErrorAlert.
4. Deferred A → zmena na B → oneskorený úspech/chyba A nemení UI/error/cache B;
   A→B→A neprijme starú operáciu. Zopakovať so signal-ignorujúcim fetch mockom.
5. Unmount: vlastný request abortovať alebo bezpečne ignorovať jeho oneskorený
   výsledok a chybu. Odstránenie canonical query počas requestu nesmie resurrectnúť
   cache. Existujúci delete/rollback flow netreba refaktorovať.
6. Obyčajný GET rozbehnutý pred live a focus GET počas live → dokončenie v oboch
   poradiach; stale odpoveď neprepíše finálny live výsledok. Summary mount nesmie
   zmeniť request na force. Nasledujúci refetch je znovu obyčajný.
7. HTTP 200 s identickým starým payloadom → žiadne hlásenie garantujúce čerstvosť.
   `metro_mirror.error` zostáva viditeľné bez straty volumes.
8. Bez cooldownu: tlačidlo sa po dokončení požiadavky odomkne bez časovača.

**Overenie:**

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-groups/hooks/useRefreshRecoveryGroupInventory.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupInventory.test.tsx
```

- [x] Cielený Vitest prešiel; real-hook test kontroluje URL, viditeľné dáta a cache.
- [x] ESLint zmenených TS/TSX, diff check a atomic commit.

**Závislosti:** brána, D1/D5. Nový refresh help text dodá T6; existujúci opatrný
cache text je dočasne stále pravdivý. Žiadny success toast ani nové tvrdenie o fresh.

## T2: Cielené stale označenie volumes a tree

**Opis:** Po akceptovanej HTTP 200 inventory odpovedi označiť stale len storage
queries snapshot providera. Nevyvolávať ďalší live fetch ani plošný refetch.

**Súbory (2, S; iba ak sa schváli D4):**

- `RG/hooks/useRefreshRecoveryGroupInventory.ts`
- `RG/hooks/useRefreshRecoveryGroupInventory.test.tsx`

**Akceptačné kritériá:**

- [x] Stale sú všetky `/get_volumes` a `/get_volume_tree` varianty pre rovnaké
  `snapshot_provider_id`, vrátane rôznych views a dodatočných parametrov.
- [x] Iný provider, inventory, VM discovery a agregované queries sa nemenia;
  chýbajúci snapshot provider nevytvorí širokú invalidáciu.
- [x] Invalidácia používa `refetchType:'none'`, nenastáva po HTTP chybe/zrušení
  a neprezentuje HTTP 200 ako dôkaz storage úspechu.

**Scenáre:** Metro Mirror master P1 / snapshot P2 → iba P2; dve views P2;
P3 nezmenené; snapshot ID null; HTTP chyba; HTTP 200 s cache fallback payloadom.

**Overenie:**

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-groups/hooks/useRefreshRecoveryGroupInventory.test.tsx
```

- [x] Testy overujú stale flags aj absenciu nových fetchov; focused ESLint a commit.

**Závislosti:** T1, D4.

## CP1: Inventory

- [x] T1 a schválená vetva T2 majú overenie a samostatné commity.
- [x] Refresh + Summary fungujú cez canonical cache a bežné retry je bez force.
- [x] Deferred race tests dokazujú run isolation, bez obnovy odstránenej cache.
- [x] Review diffs: bez generated/BE zmien a bez pridaných live success záruk.

## T3: Frequency kontrakt a serverové zamietnutie

**Opis:** Podľa schváleného D2 ponechať existujúcu FE validáciu frequency
(min=15, step=15, deliteľnosť 15 v minutes) a bez hardcodovania minima BE 600.
BE zostáva autoritou pre konfigurovateľný limit; prípadné HTTP 422 musí byť
viditeľné so zachovaním draftu a modalu. Ak už toto funguje, stačia cielené
regresné testy a prípadné upresnenie textu. Retention a Snapshot Policies nemeníme.
Uvoľnenie minút odložiť až po vyriešení cron generovania.

**Súbory (3, M):**

- `RP/components/RecoveryAppPolicyModal.tsx`
- `RP/components/RecoveryAppPolicyForm.tsx`
- `RP/components/RecoveryAppPolicyModal.test.tsx`

**Akceptačné kritériá:**

- [ ] Zachovaný FE krok frequency 15 minút, bez pevného 600-minútového
  limitu vo FE. BE rozhoduje o minimálnej frekvencii pri submit. Retention
  a Snapshot Policies ostávajú nedotknuté.
- [ ] String aj Pydantic-array HTTP 422 detail zostávajú viditeľné bez zatvorenia
  modalu, zmeny vstupov alebo hlásenia úspechu; BE limit sa neodvodzuje z chybovej vety.
- [ ] Historické hodnoty a jednotky sa pri otvorení neprepočítajú, cancel nie je
  dirty; BE odmietnutie starého intervalu umožňuje opravu, neobchádza server kontrolu.

**Scenáre:**

- Obe submit cesty (Save aj Enter): prázdne, 0, záporné, desatinné, neplatné jednotky;
  platné kladné hodnoty vo všetkých troch jednotkách bez lokálneho 600 minima.
- Frequency 7 a 601 minutes **neprejdú** FE krokom 15; 15/30/600 minutes
  lokálnym intervalovým pravidlom prejdú. Retention 7/20 minutes ostáva
  neplatné. Neuvoľňovať frekvenciu na ľubovoľné kladné minúty.
- Mock servera s limitom 600: 585 minutes/9 hours → 422; 600 minutes/10 hours/
  1 day → úspech. Iný limit 720: 10 hours → 422. Limit 0: FE-validná krátka
  frequency (napr. 15 minutes) → úspech. Testuje sa reakcia FE na server,
  nie reimplementácia BE validátora.
- Skutočný OrvalApiError zo stub fetch 422 string/array detail; upraviť vstup a
  opakovať úspešný submit. Bez globálnej parser úpravy, ak existujúci parser vyhovuje.
- Legacy 7 minutes otvorenie/cancel; edit názvu legacy 9 hours pri server min 600
  → draft zostane a detail sa zobrazí. Manual zoning/WWPN nemení BE minimum.
- Zmena frequency jednotky vyprázdni iba frequency hodnotu; retention a Power
  parametre sa nemenia. Zachovať doterajšie testy pre retention a snapshot selection.

**Overenie:**

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPolicyModal.test.tsx src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPolicyHelp.test.tsx
```

- [ ] Cielené testy, focused ESLint a atomic commit.

**Závislosti:** D2 je schválené: ponechať FE krok 15 minút aj serverové minimum.
Nie je povolený BE fix, normalizácia jednotiek ani capabilities endpoint.
T6 môže upresniť BE minimum/HTTP 422, nesmie však odstrániť krok 15 z helperov.

## CP2: Policy

- [ ] Schválené D2 implementované bez zmeny FE kroku 15; BE minimum a UI krok nezamenené.
- [ ] Regresie dokazujú 422, zachovanie historických vstupov a nezmenenú retention.
- [ ] Cron riziko ostáva evidované; ľubovoľné minúty sa nezavádzajú, úspech DTO testov nie je Airflow QA.

## T4: Čisté pravidlá DAG identít

**Opis:** Pripraviť izolovaný helper vracajúci typ problému a jeho kontext, bez
UI, query zmien a mutácií draftu. Použiť existujúci exact duplicate helper.

**Súbory (2, S):**

- `RA/utils/recoveryApplicationDagValidation.ts` — nový
- `RA/utils/recoveryApplicationDagValidation.test.ts` — nový

**Akceptačné kritériá:**

- [ ] Power v2/v3 a VMware v2 implementujú presne normalizáciu, namespace a empty
  tier pravidlá uvedené v pláne; v1 a neznámy layout nedostanú nové blokovanie.
- [ ] Null sa vyhodnotí cez verified unique default správnej platformy, wire
  draft ostane nezmenený; unknown/unverified default nemá vymyslené pravidlá.
- [ ] Problém rozlišuje exact duplicates, workload ID collision a tier ID collision
  a poskytuje mená/tier/order/ID potrebné pre zrozumiteľnú chybu a navigáciu.

**Unit matica:**

- Každý potvrdený platform/version pár × presná duplicita v tier/medzi tiers.
- `A.B`/`A_B` rovnaký tier → kolízia, rôzne tiers → bez ID kolízie; presne `A.B`
  medzi tiers → duplicita. `A-B`/`A_B`, `VM`/`vm` → odlišné.
- Medzery, bodky, slash, diakritika, emoji, dva po sebe idúce zakázané znaky;
  žiadny trim/case folding/underscore collapse, jeden Unicode code point → jedno `_`.
- Tier `db.prod`/`db_prod`, rovnaké order → kolízia; iné order → povolené;
  order 1 → `01`, 10 → `10`, 100 → `100`, historické záporné order podľa Python
  sign-aware `:02d`. Prázdny tier nevytvorí group a nekoliduje.
- Explicitné v1, null s default v1; null s Power default v3 / VMware default v2;
  chýbajúci, neoverený, nejednoznačný alebo inej platformy default; budúca v9.
- Input snapshot pred/po je rovnaký; výsledok obsahuje obe konfliktné mená.

**Overenie:**

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-applications/utils/recoveryApplicationDagValidation.test.ts src/features/recovery-plans/recovery-applications/utils/recoveryApplicationWorkloads.test.ts
```

- [ ] Fixtures porovnané s konkrétnymi BE funkciami, focused ESLint a atomic commit.

**Závislosti:** D3. BE šablóny sú read-only referencia; nevykonávať ich import
na produkčnom Airflow a nepridávať BE zmeny.

## T6a: Preklady technických helperov a validácií

**Opis:** Pripraviť EN/SK/CS nové validačné texty, Power v3/VMware v2 tier help,
presný Inventory refresh help a schválenú frequency guidance. Helper routing
sa zapojí v samostatnej úlohe T6b.

**Súbory (4, M):**

- `src/locales/en.json`
- `src/locales/sk.json`
- `src/locales/cs.json`
- `src/locales/recoveryApplicationFieldHelpTranslations.test.ts`

**Akceptačné kritériá:**

- [ ] Nové help vetvy majú všetkých sedem podkľúčov pripravených pre routing T6b.
- [ ] EN/SK/CS validation texty obsahujú rovnaké interpolácie a identifikujú
  tier/mená/konfliktné ID; nové message keys sedia s T4 štruktúrovanými problémami.
- [ ] Texty potvrdzujú iba zdrojové správanie: Power ready/VIOS pool, VMware parallel
  branches/done, cache fallback, ponechaný FE krok 15 minút a BE minimum
  bez univerzálnej hodnoty 600.

**Scenáre a kontrola textov:**

- Power v3 help explicitne odlišuje pripravenosť na cutover od readiness aplikácie;
  nehovorí, že všetky operácie VIOS alebo všetky tasky sú serializované.
- VMware v2 nedostane Power bariéru. Legacy v1/v2 texty sa významovo nemenia.
- Inventory HTTP 200 sa neoznačí za preukázaný live success. Policy text
  zachová vysvetlenie kroku FE 15 minút a konfigurovateľného BE minima;
  retention preklady ostávajú nezmenené.
- Pri nových validačných kľúčoch rozšíriť parametrizovanú kontrolu ich prítomnosti
  a `{name}`/`{tier}`/`{tiers}`/`{id}` parametrov v existujúcom locale teste;
  nepoužiť iba regex pre `{{...}}`, pretože runtime preklady používajú aj `{...}`.

**Overenie:**

```powershell
node node_modules/vitest/vitest.mjs run src/locales/recoveryApplicationFieldHelpTranslations.test.ts
node -e "for (const l of ['en','sk','cs']) JSON.parse(require('fs').readFileSync('src/locales/'+l+'.json','utf8'))"
```

- [ ] Locale test aj JSON parse prešli; focused ESLint testu, diff check a commit.

**Závislosti:** T1, T3 rozhodnutie, T4 (tvary problémov). Je zámerne pred T5,
aby integrácia nepoužila chýbajúce message keys.

## T6b: Výber technického helpera podľa verzie

**Opis:** Rozšíriť helper routing o potvrdené Power v3 a VMware v2. Upraviť staré
unit očakávanie, že VMware v2 patrí do generic.

**Súbory (2, S):**

- `RA/helpers/recoveryApplicationFieldHelp.ts`
- `RA/helpers/recoveryApplicationFieldHelp.test.ts`

**Akceptačné kritériá:**

- [ ] Explicitné Power v3 a VMware v2 zvolia novú existujúcu help vetvu aj bez katalógu.
- [ ] Null vyberie vetvu iba podľa verified unique defaultu správnej platformy;
  pri chybe, viacerých defaultoch alebo inej platforme je generic.
- [ ] V1/Power v2 zachovajú routing, future v9 a neznáme platformy zostanú generic.

**Overenie:**

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-applications/helpers/recoveryApplicationFieldHelp.test.ts src/locales/recoveryApplicationFieldHelpTranslations.test.ts
```

- [ ] Parametrizované unit scenáre pre explicit/null/default/outage prešli;
  focused ESLint oboch súborov, diff check a atomic commit.

**Závislosti:** T6a.

## CP3: Pravidlá a texty

- [ ] T4 unit matica pokrýva tri nové layout kombinácie aj legacy v1/null.
- [ ] T6a locale doplnenie aj T6b routing s unit testom sú overené.
- [ ] Review potvrdil Python normalizáciu vrátane Unicode a order/namespace hraníc.

## T5: Napojenie DAG pravidiel na validáciu a readiness

**Opis:** Použiť T4 v celkovej aj tier validácii, odovzdať konzistentný katalóg
a zachovať existujúce provider/group/name kontroly. Rozlíšiť template problém
od referenčnej chyby bez závislosti navigácie na prefixe prekladového kľúča.

**Súbory (4, M):**

- `RA/utils/validateRecoveryApplication.ts`
- `RA/utils/validateRecoveryApplication.test.ts`
- `RA/model/recoveryApplicationDraftReadiness.ts`
- `RA/model/recoveryApplicationDraftReadiness.test.ts`

**Akceptačné kritériá:**

- [ ] Save aj Push rešpektujú D3 pre tri potvrdené layout kombinácie; details,
  tiers a výsledný canSave sa nerozchádzajú v template kontexte.
- [ ] V1/null default v1 nemajú nové kolízne blokovanie; unknown explicitná verzia,
  katalóg chyba a neoverené referencie zachovávajú doterajšie ochrany.
- [ ] Problém nesie explicitnú klasifikáciu pre neskoršiu navigáciu; preklady T6
  dostanú správne parametre a zmena verzie odstráni iba template chybu.

**Scenáre:** T4 matica cez verejný validátor s push false/true; valid provider/group
fixtures; priorita chýbajúcej referencie pred kolíziou; locked platform vs source
provider ID; null s default v3; null draft Save pri nedostupnom katalógu; explicitná
v9 uvedená serverom bez známeho lokálneho layoutu. Zachovať Power LPAR syntax.

**Overenie:**

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-applications/utils/validateRecoveryApplication.test.ts src/features/recovery-plans/recovery-applications/model/recoveryApplicationDraftReadiness.test.ts
```

- [ ] Cielené testy prešli, focused ESLint a atomic commit.

**Závislosti:** T4, T6a, T6b, D3. T7 nasleduje hneď po T5; feature sa neodovzdáva
používateľovi medzi nimi, kým nie je dokončená opraviteľná navigácia.

## T7: Opraviteľná navigácia a integračné regresie

**Opis:** Rozšíriť prístup do kroku Orchestration pre všetky template chyby,
overiť zmenu verzie aj opravu tiers a skutočné helper popovery.

**Súbory (4, M):**

- `RA/components/RecoveryAppBuilder.tsx`
- `RA/components/RecoveryAppBuilder.test.tsx`
- `RA/components/RecoveryApplicationFieldHelp.integration.test.tsx`
- `RA/pages/RecoveryApplicationFunctionalConsistency.integration.test.tsx`

**Akceptačné kritériá:**

- [ ] Exact duplicita, workload ID aj tier ID kolízia umožnia prejsť do kroku 4
  a zmeniť verziu; Save zostane disabled do opravy. Nevalidný provider/reference
  tým nezíska výnimku. Tiers sa dajú opraviť aj bez zmeny verzie.
- [ ] V2/v3→v1/null a späť okamžite prepočíta readiness bez straty tiers/policy;
  dynamický select verzií a null payload ostávajú zachované.
- [ ] Power v3/VMware v2 zobrazia správny technický help a lokalizované chyby;
  unknown/default outage má bezpečný generic fallback a existujúci read-only režim platí.

**Component/integration scenáre:**

- Importovaný draft s exact duplicitu aj normalized kolíziou pre Power v3/VMware v2:
  kroky 2→4, voľba v1/null, prechod späť, zachovanie polí, Save/Push gate.
- Tier ID kolízia s rovnakým order; oprava mena/order odstráni problém. Chýbajúca
  group/provider a template konflikt spolu nesmú otvoriť všeobecný bypass.
- Real query katalog s Power v3 a VMware v2, prepnutie platformy bez stale defaultu;
  null sa po výbere defaultu odošle ako null, nie explicitné v1/v3.
- `get_dag_template_versions` chyba/loading/viac defaults; explicitné známe helpery
  a null generic; v9 zostáva generic. Upraviť staré tvrdenie „VMware v2 je neznáma“.
- Keyboard otvorenie help, správny titul/effect/limitations po zmene verzie;
  neodoslať formulár otvorením popoveru. Read-only/pending režim nepovolí mutácie.

**Overenie:**

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx src/features/recovery-plans/recovery-applications/helpers/recoveryApplicationFieldHelp.test.ts src/features/recovery-plans/recovery-applications/components/RecoveryApplicationFieldHelp.integration.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationFunctionalConsistency.integration.test.tsx src/features/recovery-plans/recovery-applications/components/DagTemplateVersionSelect.test.tsx src/features/recovery-plans/recovery-applications/utils/recoveryApplicationFormMapper.test.ts
```

- [ ] Cielené testy, focused ESLint a atomic commit; routing helper test spustený už v T6b.
- [ ] Manuálne v test prostredí: Refresh/pending/error, policy 422, navigácia pri
  kolízii a nové helpery v EN/SK/CS. Mockovať Push; nespúšťať recovery na storage.

**Závislosti:** T5, T6a, T6b.

## CP4: Odovzdanie implementácie

- [ ] Všetky schválené AC majú dôkaz; odložené voliteľné vetvy sú označené rozhodnutím.
- [ ] Žiadny aplikačný commit neobsahuje cudzie OpenAPI/Zod zmeny alebo BE zmeny.
- [ ] `node node_modules/eslint/bin/eslint.js <explicitné zmenené TS/TSX> --max-warnings 0`
  prešlo; placeholder nahradiť skutočným zoznamom súborov, nespúšťať nad celým repo.
- [ ] `git diff --check`, kontrola staged diffu a atomic commity dokončené.
- [ ] Finálne zhrnutie obsahuje reálne spustené príkazy a výsledky, browser QA stav,
  nebežanú kompletnú sadu/build a zostávajúce BE obmedzenia (stale 200, minimum API, cron).
- [ ] Používateľ dostal implementáciu na review; žiadny automatický push/deploy.

## Priebežné výsledky

- T1: 13 component testov a 13 hook testov prešlo. RED: dva URL assertions zlyhali bez force; GREEN po zapojení live hooku. Hook pokrýva aj invalidáciu pri rollback/delete, run/unmount, odstránenie/nahradenie query, mismatch odpovede a súbežný obyčajný GET. A→B→A test používa dve samostatné render fázy (React batch bez B commitu nepredstavuje opustenie runu).
- T2/CP1: 16 hook testov prešlo; predicate invaliduje iba snapshot-provider volumes/tree bez refetchu. Focused ESLint T1/T2 prešiel.
