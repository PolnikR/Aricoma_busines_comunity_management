# TODO: centralizácia pravidiel polí providerov

Stav: plán schválený pokynom executing-plans inline 26. 10. 2026. Úlohy 0–7 implementované a overené; výsledky a existujúca chyba plného typechecku sú zapísané v pláne. Implementácia prebieha v aktuálnom checkoute bez subagentov.

Príkazy sú z koreňa repozitára. Na Windows použiť `npm.cmd`, aby nebol potrebný zásah do PowerShell ExecutionPolicy. Po každej úlohe overiť vlastný diff a commitnúť iba jej súbory; nesťahovať OpenAPI, negenerovať súbory, nepushovať, nemergovať. Žiadne `npm test`, kompletný build ani kompletný lint automaticky.

## 0. Schválenie rozsahu

**Popis:** Potvrdiť odporúčaný rozsah pred implementáciou: MultiSelect tagov, nepovinný managedSystem, zachovanie spoločných validácií a preservation skrytých legacy edit údajov.

**Akceptácia:**
- [x] Používateľ schválil plán vrátane create/edit rozdielov a nulových hodnôt partnera mimo FLASHCOPY.
- [x] Zaznamenané prípadné zmeny rozsahu v oboch dokumentoch; žiadna implementácia pred schválením.

**Overenie:** Porovnať odpoveď používateľa s odporúčaním a akceptačnými kritériami plánu.
**Závislosti:** Žiadne. **Súbory:** iba tieto dva dokumenty, ak treba zmenu. **Rozsah:** S.

## 1. Typovo bezpečná relevantnosť polí

**Popis:** Pridať `getProviderFieldConfig(type: string)` a typ úplného boolean recordu piatich kľúčov overených voči `ProviderSubmitData`; použiť existujúce compute/partner predikáty. Zatiaľ bez zmeny UI.

**Akceptácia:**
- [x] Matica: VMWARE prefix/tags/backing; FLASHCOPY partner; HITACHI nič; IBM_POWER backing/managedSystem.
- [x] Prázdny a neznámy typ vypínajú všetko; žiadna druhá compute/storage/partner klasifikácia ani callback framework.
- [x] Návratový typ obsahuje všetkých päť platných API kľúčov bez `any`; nový kľúč vyžaduje doplnenie výsledku.

**Overenie:**
- [x] `npm.cmd exec vitest run src/features/providers-connectors/providers/model/providerFieldConfig.test.ts src/features/providers-connectors/providers/model/providerCategory.test.ts`
- [x] `npm.cmd exec eslint -- src/features/providers-connectors/providers/model/providerFieldConfig.ts src/features/providers-connectors/providers/model/providerFieldConfig.test.ts --max-warnings 0`

**Závislosti:** 0. **Súbory:** `model/providerFieldConfig.ts`, `model/providerFieldConfig.test.ts` (nové, pod providers). **Rozsah:** S.

## 2. Bezpečný payload a prechody typu

**Popis:** Použiť konfiguráciu v existujúcom modale na validáciu partnera, reset create draftu a payload. Zaviesť ochranu nezmenených/skrytých špecifických údajov pri editácii ešte pred ich skrytím v UI. Zatiaľ nepridávať managedSystem input; pôvodný managedSystem už explicitne zachovať.

**Akceptácia:**
- [x] Parameterizované create testy všetkých typov kontrolujú prítomné aj neprítomné JSON kľúče; nerelevantné vložené hodnoty neuniknú, neznámy/prázdny typ neodošle request. Spoločné pravidlá a null partner konvencia zostávajú.
- [x] Explicitné regresie pre opakované prepnutia: VMWARE→IBM_POWER→VMWARE zachová backing IDs, ale neobnoví prefix/tagy; VMWARE→FLASHCOPY→VMWARE vyčistí backing IDs, prefix aj tagy; FLASHCOPY→HITACHI→FLASHCOPY neobnoví partnera; IBM_POWER→VMWARE→IBM_POWER zachová backing IDs, ale neobnoví managedSystem. Prechody neobnovujú staré hodnoty z predchádzajúceho typu; čistia nerelevantné chyby a spoločné vstupy zostávajú.
- [x] Edit testy pre štyri typy zachovajú nezmenené špecifické hodnoty, absent/null/[] a hidden legacy hodnoty, aj managedSystem; neodosielajú credentialStatus. Relevantný clear pošle null/[]; self partner na FLASHCOPY stále blokuje save, skrytý legacy partner nevytvorí novú FE validačnú chybu.
- [x] Konkrétne legacy fixtures: HITACHI s historickými vmTags; VMWARE s viacerými tagmi vrátane tagu nedostupného v aktuálnom lookupe; IBM_POWER s existujúcim managedSystem; provider s viacerými typovo nerelevantnými historickými poľami. Otvorenie a uloženie bez zmeny zachová pôvodné JSON hodnoty aj prítomnosť/neprítomnosť kľúčov. Skryté polia nedovoľujú zadať nové hodnoty.
- [x] Ak mock backend odmietne historické údaje, zostane modal otvorený, zobrazí sa detail chyby a používateľský draft ostane nezmenený; nesmie dôjsť k tichému čisteniu alebo úspešnému zatvoreniu.

**Overenie:**
- [x] `npm.cmd exec vitest run src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx src/features/providers-connectors/providers/model/providerFieldConfig.test.ts`
- [x] `npm.cmd exec eslint -- src/features/providers-connectors/providers/components/ProvidersCreateModal.tsx src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx --max-warnings 0`

Testy payloadu majú overovať fetch body, nie iba viditeľnosť alebo interný stav. Nevkladať blanket spread read modelu. Backend error pri odmietnutí legacy údajov musí zachovať otvorený modal aj draft.

**Závislosti:** 1. **Súbory:** `components/ProvidersCreateModal.tsx`, `components/ProvidersCreateModal.test.tsx`. **Rozsah:** S.

## Checkpoint A: pravidlá a bezpečnosť dát

- [x] Testy úloh 1–2 prešli; existujúce relationship testy v modale zostali bez oslabenia očakávaní.
- [x] Review potvrdzuje, že create filtruje nové hodnoty a edit zachováva pôvodné; obe vetvy používajú rovnakú konfiguráciu relevantnosti.
- [x] Žiadna zmena API, generovaných súborov ani providerCategory zoznamov. Každý overený krok má samostatný commit.

## 3. Viditeľnosť existujúcich špecifických polí

**Popis:** V existujúcom spoločnom formulári použiť konfiguráciu pre prefix, tagy, backing a partner; nepísať ďalšiu typovú maticu do komponentu.

**Akceptácia:**
- [x] UI testy štyroch typov a prázdneho typu dokazujú presnú viditeľnosť; všetky spoločné polia zostávajú.
- [x] Kandidáti partnera/backing a unavailable fallback zostávajú, rovnako ID/type lock a submit cez Enter.
- [x] Modal testy nepredpokladajú tagový vstup pri prázdnom/non-VMware type; testy ostatných workflow zostávajú platné.

**Overenie:**
- [x] `npm.cmd exec vitest run src/features/providers-connectors/providers/components/ProviderCreateForm.test.tsx src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx`
- [x] `npm.cmd exec eslint -- src/features/providers-connectors/providers/components/ProviderCreateForm.tsx src/features/providers-connectors/providers/components/ProviderCreateForm.test.tsx --max-warnings 0`

**Závislosti:** 2. **Súbory:** `components/ProviderCreateForm.tsx`, oba component testy. **Rozsah:** M (3 súbory).

## 4. Viac VMware tagov bez straty uložených hodnôt

**Popis:** Nahradiť tagový Select existujúcim MultiSelect. Nepresúvať hook, nemení sa jeho API ani shared komponent.

**Akceptácia:**
- [x] Dva uložené tagy zostávajú zvolené; pridanie tretieho zachová oba, odobratie jedného zachová ostatné, odobratie všetkých odošle `[]`. Uložené tagy mimo lookupu sú dostupné bez duplicít.
- [x] Loading/error/retry lookupu nemenia selection; nezmenená editácia pri chybe odošle celé pôvodné pole; query beží iba pre edit VMWARE a create výber je disabled.
- [x] Staré testy comboboxu a single replacement sa nahradia konkrétnymi multi-value testami, zostáva submit/error/dirty pokrytie. Escape zatvorí otvorený zoznam, nie modal.

**Overenie:**
- [x] `npm.cmd exec vitest run src/features/providers-connectors/providers/components/ProviderCreateForm.test.tsx src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx`
- [x] `npm.cmd exec eslint -- src/features/providers-connectors/providers/components/ProviderCreateForm.tsx src/features/providers-connectors/providers/components/ProviderCreateForm.test.tsx src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx --max-warnings 0`
- [x] Overenie v reálnom browseri (automatizované CDP): edit VMWARE, viac checkboxov, klávesnica/Escape, lookup chyba/retry a následný save; bez zmeny tagov pri samotnom načítaní.

**Závislosti:** 3. **Súbory:** form a oba component testy, `src/locales/en.json`, `src/locales/sk.json` podľa potrebných textov MultiSelect. **Rozsah:** M (najviac 5).

## Checkpoint B: spoločný formulár

- [x] Matica UI zodpovedá payload matici a nedošlo k vytvoreniu ďalších formulárov.
- [x] Viac tagov funguje aj pri neúplnom lookupe; compute/backing a FLASHCOPY partner testy stále prechádzajú.
- [x] Commit obsahuje iba aktuálnu úlohu, bez zmien discovery hooku/shared MultiSelect.

## 5. Životný cyklus managedSystem a wire kontrakt

**Popis:** Pridať managedSystem do existujúceho form typu a stavu modalu, bez nového UI vstupu. Najprv reprodukčné testy inicializácie/payloadu a API round-trip, potom implementácia. Vstup a jeho používateľské interakcie nasledujú v úlohe 6.

**Akceptácia:**
- [x] Form type, EMPTY_FORM, edit inicializácia a dirty kontrola zahŕňajú managedSystem; nezmenená IBM_POWER aj hidden legacy edit hodnota zostáva zachovaná.
- [x] IBM_POWER create posiela managedSystem ako nepovinnú hodnotu/null; payload stále filtruje ostatné typy. Reset po odchode z IBM_POWER je pripravený v existujúcom type handleri.
- [x] Wire test overí managedSystem a viac tagov cez response selector aj submit JSON; hook stále invaliduje list. Žiadna nová required/format validácia ani HMC query.

**Overenie:**
- [x] `npm.cmd exec vitest run src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx src/features/providers-connectors/providers/components/ProviderCreateForm.test.tsx src/features/providers-connectors/providers/model/providersWire.test.tsx`
- [x] Focused ESLint explicitných súborov tejto úlohy.
- [x] `npm.cmd run typecheck` — odôvodnené zmenou povinného kľúča zdieľaného form typu; doplniť aj form fixture v existujúcom teste.

**Závislosti:** 4. **Súbory:** form, modal, oba component testy a `model/providersWire.test.tsx`. **Rozsah:** M (5). Ide o overený prípravný krok bez nového používateľského vstupu.

## 6. Managed system vstup pre IBM_POWER

**Popis:** Sprístupniť pripravené managedSystem cez nepovinný textový vstup iba IBM_POWER, s EN/SK label/helper textom. Testy interakcií napísať pred úpravou JSX a overiť zlyhanie aj úspech.

**Akceptácia:**
- [x] UI testuje IBM_POWER-only vstup; modal create/edit/save/clear a samotná zmena managedSystem aktivujú unsaved guard; prechod IBM_POWER→VMWARE→IBM_POWER pôvodný systém neobnoví.
- [x] Uloženie novej hodnoty ju odošle, explicitné vyčistenie odošle null. EN/SK helper vysvetľuje SystemName a prípad viacerých systémov; nevynucuje ho pre každé IBM_POWER.
- [x] Opätovné otvorenie modalu obnoví pôvodné hodnoty; nullable/absent managedSystem nevytvorí falošnú dirty zmenu.

**Overenie:**
- [x] `npm.cmd exec vitest run src/features/providers-connectors/providers/components/ProviderCreateForm.test.tsx src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx src/features/providers-connectors/providers/model/providersWire.test.tsx`
- [x] `npm.cmd exec eslint -- src/features/providers-connectors/providers/components/ProviderCreateForm.tsx src/features/providers-connectors/providers/components/ProviderCreateForm.test.tsx src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx --max-warnings 0`
- [x] Parsovať `src/locales/en.json` aj `src/locales/sk.json` a overiť prítomnosť nových kľúčov v oboch jazykoch.
- [x] Overenie v reálnom browseri (automatizované CDP): IBM_POWER create/edit/clear managedSystem, cancel/stay/discard a zmena typu; žiadne nové required pravidlo.

**Závislosti:** 5. **Súbory:** form, oba component testy a `src/locales/{en,sk}.json`. **Rozsah:** M (5).

## 7. Záverečné regresie a review

**Popis:** Skontrolovať acceptance plánu a diff bez ďalšieho refaktoringu. Doplniť chýbajúce priamo súvisiace regresie v existujúcich component testoch.

**Akceptácia:**
- [x] Testy zachovajú description/IP/role required, normalizáciu/kolízie ID, hostname, email/interval validáciu, credentials missing/loading/error/retry, backend chybu aj otvorený draft po neúspechu.
- [x] Dirty guard funguje pri prefixe, tagoch a managedSystem; úspech zatvára bez discard potvrdenia. Relationship kandidáti a retention/clear konvencie zostali.
- [x] Zopakované sú legacy regresie z úlohy 2 (HITACHI s vmTags, VMWARE s chýbajúcimi tagmi, IBM_POWER s managedSystem, zmiešané historické polia), všetky štyri návratové prechody typov a odmietnutie backendom s otvoreným modalom, zachovaným draftom a viditeľnou chybou.
- [x] Jediná definícia relevantnosti, explicitný payload bez read-only polí; žiadne generated/API alebo nesúvisiace zmeny. Výsledok popisuje hranice mock testov a nepredstiera nové backendové správanie.

**Overenie:**
- [x] `npm.cmd exec vitest run src/features/providers-connectors/providers/model/providerFieldConfig.test.ts src/features/providers-connectors/providers/model/providerCategory.test.ts src/features/providers-connectors/providers/model/providerTypes.test.ts src/features/providers-connectors/providers/model/providersWire.test.tsx src/features/providers-connectors/providers/components/ProviderCreateForm.test.tsx src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx`
- [x] Focused ESLint explicitných zmenených `.ts/.tsx` súborov, `git diff --check`, kontrola staged diffu a atomic commit.
- [x] Overenie v reálnom browseri (automatizované CDP): create→type switch→save, IBM_POWER edit a clear managedSystem, VMWARE viac tagov, FLASHCOPY partner, dirty close/stay/discard a error retry. Kompletný build/suite sa nespúšťajú bez nového dôvodu.

**Závislosti:** 5–6. **Súbory:** oba component testy a tieto dva dokumenty pre záznam výsledkov. **Rozsah:** M (najviac 4).

## Checkpoint C: hotová implementácia

- [x] Akceptačné kritériá plánu sú doložené výstupmi focused kontrol; žiadna úloha nezostala iba „malo by fungovať“.
- [x] Zaznamenané príkazy, výsledky, manuálne overenie a nevykonanie kompletnej suite/build.
- [x] Všetky vlastné zmeny commitnuté; žiadny push/merge a zachovaná cudzia práca.

## Overenie samotného plánovania

- [x] Prečítané HTML, aktuálny form/modal, kontrakt, hooky a relevantné existujúce testy.
- [x] Vlastné review rozlišuje zmenu tagov od ich nezmeneného uloženia a create sanitizáciu od edit preservation.
- [x] Závislosti a konkrétne verifikácie sú zapísané; nevytvorili sa všeobecné `tasks/plan.md`/`tasks/todo.md` ani sa neprepísali ostatné plány.
- [x] Používateľ schválil implementáciu pokynom executing-plans inline.

## Výsledky vykonania

109/109 focused testov, focused ESLint, EN/SK parser a focused TypeScript kontrola prešli. Reálny Chrome overil create/edit, tagy, managedSystem, lookup retry, unsaved guard a chyby; 46 interceptovaných požiadaviek, bez živého backendu. Plný typecheck sa spustil, ale neprešiel kvôli existujúcej chybe PolicySetsPage.tsx:23 (TS4111); tento súbor sa nemenil. Úlohy 5–6 boli overené a commitnuté spolu. Podrobné príkazy a inline review sú v pláne. Kompletná suite/build sa nespúšťali; bez pushu/merge.
