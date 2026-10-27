# Policy Sets – plán kontextových nápovied

Stav: implementované inline na pokyn používateľa, 2026-10-27. Dátum analýzy: 2026-10-27.
Checklist: [policy-sets-field-help-todo.md](policy-sets-field-help-todo.md).

## Záznam implementácie

- Otázniky sú v Create/Edit vedľa `h3` v kompaktnom flex riadku podľa Providers (`gap-1.5`, wrapper nápovedy `h-4 items-center`). Display používa existujúce `DetailField.labelHelp` s rovnakým kompaktným zarovnaním.
- Pridané všetky tri nápovedy a 27 prekladových položiek EN/SK/CS. Modal, validácia, výber, payload, katalóg a generated súbory sa nemenili.
- Cielené Vitest overenie: 40 testov locale/modal/table a 54 regresných testov katalógu a popoverov. Table test bol po doplnení prechodu do Edit a oprave optional fixture overený samostatne. Príkazy sú uvedené nižšie v stratégii.
- Vizuálne overené v lokálnom Edge: Create, Edit a Display v EN pri okne približne 960 × 589, scroll formulára, Snapshot a dlhý Clean Room popover. EN/SK/CS obsah všetkých troch nápovied je overený runtime locale testami. Kompletná vizuálna matica jazykov a breakpointov nebola vykonaná.
- Bez ukladania záznamov na živý BE, bez full suite/build a bez commitu/pushu podľa pôvodného zadania. Existujúce zmeny OpenAPI a recovery policy generated schém ostali nedotknuté.

Nasledujúce sekcie zachovávajú pôvodný schválený návrh a analýzu; aktuálny stav vykonania je v tomto zázname a TODO.

## Cieľ a hranice

Doplniť otáznik vedľa názvu troch referencií `snapshot_policy_id`, `recovery_app_policy_id`, `clean_room_policy_id` v Create, Edit a Display. Použiť existujúci `KeyedHelpPopover` a `DetailField.labelHelp`, bez nových helperov, modalov či refaktoringu. Globálna nápoveda `policySets.help` zostáva bez zmeny.

Tento krok vytvára iba PLAN a TODO. Nemení runtime súbory, validáciu, načítavanie, výber, API kontrakt ani payload. Podľa výslovného zadania bez commitu a pushu. Existujúce rozpracované zmeny Providers a lokalizácií patria inej práci; nesmú sa prepísať. Používame zadané názvy dokumentov, nie existujúce `tasks/plan.md` a `tasks/todo.md`.

## Zdroje a hranice overenia

- Primárny podklad dodaný používateľom: `C:\Users\polnikr\Downloads\Policy parameters.html`, sekcie PolicySet, CleanRoomPolicy, SnapshotPolicy, RecoveryAppPolicy a príklady `sample-policy-set-vmware`, `sample-policy-set-power`, `sample-clean-room-policy`.
- Pôvodná [BE dokumentácia](https://pages.esas.autocont.sk/abco-be-507ccc/parameters/policies.html) bola pri analýze nedostupná cez webový nástroj. Závery o BE sú z lokálnej kópie dokumentácie a generated kontraktu; aktuálny nasadený BE ani jeho Python/DAG zdroje neboli overené.
- Aktuálny FE bol preskúmaný cez CodeGraph a doplňujúce čítanie častí, ktoré nevrátil. Referenčné vzory: SnapshotPolicyForm, RecoveryAppPolicyForm, KeyedHelpPopover, HelpPopover, DetailField a existujúce testy Policy Sets.

Dokumentácia používa default `none`, ale Power príklad ukazuje vynechanú referenciu v requeste a `clean_room_policy_id: null` v uloženom zázname. `none` preto nie je reťazec, ktorý má FE odosielať. Dokumentácia má mierne odlišné pomenovania kolidujúcich zdrojov (VM, volume mapping, datastore); používateľský text používa všeobecné „prostriedky“.

## Analýza aktuálneho stavu

Všetky nasledujúce cesty sú relatívne ku koreňu repozitára.

| Oblasť | Zistenie |
|---|---|
| Create/Edit | `src/features/recovery-plans/policy-sets/components/PolicySetForm.tsx`: spoločný formulár pre oba režimy. Pole `sections` mapuje tri typy politík na tri stringové ID. Nad každým zoznamom je `h3`; zatiaľ bez poľovej nápovedy. |
| Výber | Každý typ má vlastnú skupinu `RadioField`; vybrať možno najviac jednu politiku daného typu. Položky ukazujú názov a ID. Nie je voľba na zrušenie výberu; nepridávať ju v tejto práci. |
| Načítanie | `src/features/recovery-plans/recovery-policies/catalog/hooks/usePolicyCatalog.ts` volá `useGetPolicies`, `useGetRecoveryAppPolicies`, `useGetCleanRoomPolicies`, používa selectory a `normalizeSource`. Refetch je samostatný podľa typu, s `cancelRefetch: false`. |
| Stavy katalógu | `catalog/model/policyCatalog.ts`: loading, ready, empty, error, cachedError a paused/refreshing. Rozlišuje `resolved`, `missing`, `unknown`, `notConfigured`; prázdne ID/null/undefined je `notConfigured`. Pri nenastavenej referencii je súhrn `incomplete`, aj keď ju BE povoľuje. |
| Modal/model | `components/PolicySetModal.tsx`: `EMPTY_FORM` aj `toFormData` sú lokálne v modale. Všetky tri ID sú vo formulári stringy; null/undefined zo záznamu sa konvertuje na `''`. Edit predvyplní referencie a zamkne ID. Nie je samostatný modelový súbor formulára. |
| Validácia | `PolicySetModal.tsx` vyžaduje ID, názov, neprázdny `description` aj všetky tri referencie cez `.trim()`. Pri Create kontroluje duplicitu ID. **FE je prísnejší než generated BE kontrakt:** referencie aj `description` sú v API voliteľné a nullable. |
| Referenčná integrita | Rádio ponúka položky z katalógu a rozlíšenie referencií ukazuje varovania. `validate()` však kontroluje iba neprázdnosť ID, nie úspešné rozlíšenie; neznáme/chýbajúce neprázdne ID nie je týmto validátorom zablokované. Existenciu vyžaduje BE dokumentácia; živý BE nebol testovaný. Neprezentovať varovanie ako FE garanciu integrity. |
| Submit mapper | Je inline v `PolicySetModal.handleSubmit`, nie v samostatnom helperi. Create aj Edit volajú `useSubmitPolicySet().mutate({ data: ... })`. Payload obsahuje všetky tri kľúče; snapshot ID ide bez trimu, recovery a clean room ID s trimom. Zachovať aj túto asymetriu. |
| API | `src/generated/query/policy-sets/policy-sets.gen.ts`: `POST /submit_policy_set`, telo `JSON.stringify(policySet)`, po úspechu invalidácia query `/get_policy_sets`. Žiadny osobitný edit endpoint. |
| Generated kontrakt | `src/generated/query/zod/policySet.gen.ts`, `policySetRecord.gen.ts`, `submitPolicySetBody.gen.ts`: všetky tri referencie sú voliteľné `string | null` s `.exactOptional()`. Generated súbory sa nemenia ani neregenerujú. |
| Nenastavená hodnota | API schéma povoľuje vynechanie/null. FE číta oba stavy do `''`, detail ukáže „Not set“. Bežný FE submit s prázdnym ID zastaví validácia; nemožno tvrdiť, že dnes odosiela null alebo vynechané ID. |
| Display | `components/PolicySetsTable.tsx`: DetailView má tri `DetailField`, hodnoty rieši lokálny `referenceField`. Resolved zobrazuje názov; missing/unknown ponechá ID a varovanie; notConfigured vráti null. Globálny popover je v `headerActions`. |

**Odpoveď na podporu kontraktu:** dátový model, výber, detail a payload podporujú všetky tri referencie. Podpora voliteľnosti nie je úplná: FE nedovolí uložiť Policy Set bez niektorej z nich. Najmä dokumentovaný Power príklad bez Clean Room sa nedá bez doplnenia politiky uložiť cez súčasný formulár. FE tiež vyžaduje neprázdny `description`, ktorý API povoľuje vynechať alebo nastaviť na `null`. Tieto rozdiely sú samostatný následný backlog (nižšie), **nie súčasť implementácie nápovied**.

### Existujúce testy

- `src/features/recovery-plans/policy-sets/components/PolicySetModal.test.tsx`: Create payload so všetkými tromi ID, predvyplnenie Edit a zamknuté ID, povinné referencie, loading, cached data, retry, discard guard a BE chyby. Chýbajú cielené testy poľových nápovied a nezmeneného Create/Edit payloadu po ich použití.
- `src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx`: rozlíšenie missing/unknown, názvy v detaile, čiastočný počet referencií, JSON a globálna nápoveda. Po doplnení `labelHelp` skontrolovať pomocné assertions na texty `dt`, keďže prístupný text tlačidla môže ovplyvniť extrakciu labelov; neuvoľňovať test bez zachovania pôvodného overenia.
- `src/features/recovery-plans/recovery-policies/catalog/model/policyCatalog.test.ts` a `catalog/hooks/usePolicyCatalog.test.tsx`: regresná ochrana katalógu.
- `src/shared/components/help-popover/KeyedHelpPopover.test.tsx` a `HelpPopover.test.tsx`: existujúce správanie spoločnej nápovedy; komponenty sa nemenia.
- Vzor pre locale test: `src/locales/platformProviderFieldHelpTranslations.test.ts` (aktuálne rozpracovaný súbor inej práce; použiť iba ako vzor).

## Technický návrh

### Create a Edit

V `PolicySetForm.tsx` pridať import `KeyedHelpPopover`. V existujúcom `sections.map` obaliť `h3` a popover malým flex riadkom podľa vzoru Snapshot/RecoveryApp formulárov (`items-center gap-1.5` a existujúce kompaktné zarovnanie). Zachovať `h3` aj `section aria-label`; otáznik umiestniť mimo rádio labelov. Help key odvodiť priamo z `section.field`: `policySets.fieldHelp.${section.field}`. Použiť `sections={[]}` – jeden úvodný text, bez dodatočných sekcií a kľúčov.

Žiadny nový stav, callback či helper. Nepresúvať `handleKeyDown` na nový wrapper; dnes je pripojený iba k ID/name inputom. Tlačidlo v HelpPopover už má `type="button"`. Klik, Enter ani Space na otázniku nesmú spustiť výber alebo submit. Nápovedu zobrazovať aj pri prázdnom či nedostupnom katalógu, aby nezávisela od dát.

### Display

V `PolicySetsTable.tsx` pridať na tri existujúce `DetailField` prop `labelHelp={<KeyedHelpPopover helpKey="policySets.fieldHelp.<parameter>" sections={[]} />}`. Import už existuje kvôli globálnej nápovede. Zachovať `referenceField`, hodnoty, secondary, emphasis, poradie a globálne `headerActions`. Rovnaké help keys platia aj pre nenastavené alebo nerozlíšené referencie.

### Súbory budúcej implementácie

Runtime: dva komponenty vyššie a `src/locales/en.json`, `sk.json`, `cs.json` (5 súborov). Testy: rozšíriť `PolicySetModal.test.tsx`, `PolicySetsTable.test.tsx`; pridať `src/locales/policySetFieldHelpTranslations.test.ts`. `PolicySetModal.tsx`, katalóg, API/generated súbory ani spoločné komponenty nepotrebujú produkčnú zmenu.

## Navrhované texty EN/SK/CS

Existujúce locale sú ploché JSON slovníky. Každý riadok nižšie predstavuje presný kľúč za prefixom `policySets.fieldHelp.`. Spolu 9 kľúčov × 3 jazyky = **27 nových prekladových položiek**. Texty popisujú význam politiky; nesľubujú zmenu súčasnej povinnosti výberu vo FE.

| Suffix kľúča | EN | SK | CS |
|---|---|---|---|
| `snapshot_policy_id.trigger` | Help for snapshot policy | Nápoveda k politike snapshotov | Nápověda k politice snapshotů |
| `snapshot_policy_id.title` | Snapshot policy | Politika snapshotov | Politika snapshotů |
| `snapshot_policy_id.intro` | Sets how often snapshots are created and how long they are kept. A policy set can reference at most one existing snapshot policy. Linking it does not enable it; its settings and the process that uses it determine its effect. | Určuje, ako často sa snapshoty vytvárajú a ako dlho sa uchovávajú. Policy Set môže odkazovať najviac na jednu existujúcu politiku snapshotov. Priradenie politiku nezapína; jej účinok závisí od jej nastavení a procesu, ktorý ju používa. | Určuje, jak často se snapshoty vytvářejí a jak dlouho se uchovávají. Policy Set může odkazovat nejvýše na jednu existující politiku snapshotů. Přiřazení politiku nezapíná; její účinek závisí na jejím nastavení a procesu, který ji používá. |
| `recovery_app_policy_id.trigger` | Help for recovery app policy | Nápoveda k politike obnovy aplikácie | Nápověda k politice obnovy aplikace |
| `recovery_app_policy_id.title` | Recovery app policy | Politika obnovy aplikácie | Politika obnovy aplikace |
| `recovery_app_policy_id.intro` | Defines application recovery settings, such as the recovery schedule and snapshot selection. A policy set can reference at most one existing recovery app policy. Linking it does not enable it; the recovery process determines which settings it uses. | Určuje nastavenia obnovy aplikácie, napríklad plán obnovy a spôsob výberu snapshotu. Policy Set môže odkazovať najviac na jednu existujúcu politiku obnovy aplikácie. Priradenie politiku nezapína; proces obnovy určuje, ktoré nastavenia použije. | Určuje nastavení obnovy aplikace, například plán obnovy a způsob výběru snapshotu. Policy Set může odkazovat nejvýše na jednu existující politiku obnovy aplikace. Přiřazení politiku nezapíná; proces obnovy určuje, která nastavení použije. |
| `clean_room_policy_id.trigger` | Help for clean room policy | Nápoveda k politike Clean Room | Nápověda k politice Clean Room |
| `clean_room_policy_id.title` | Clean room policy | Politika Clean Room | Politika Clean Room |
| `clean_room_policy_id.intro` | Controls conflicts with target resources left by an earlier recovery test. When the recovery process supports Clean Room, enabled allows conflicting resources to be removed before recovery; disabled stops recovery if a conflict is found. Linking the policy does not enable it. The IBM Power recovery DAG has no Clean Room task. A policy set can reference at most one existing clean room policy. | Určuje postup pri konflikte s prostriedkami v cieľovom prostredí po predchádzajúcom teste obnovy. Ak proces obnovy podporuje Clean Room, zapnutá politika umožní odstrániť kolidujúce prostriedky pred obnovou; pri vypnutej politike sa obnova pri konflikte zastaví. Priradenie politiku nezapína. IBM Power recovery DAG nemá úlohu Clean Room. Policy Set môže odkazovať najviac na jednu existujúcu politiku Clean Room. | Určuje postup při konfliktu s prostředky v cílovém prostředí po předchozím testu obnovy. Pokud proces obnovy podporuje Clean Room, zapnutá politika umožní odstranit kolidující prostředky před obnovou; při vypnuté politice se obnova při konfliktu zastaví. Přiřazení politiku nezapíná. IBM Power recovery DAG nemá úlohu Clean Room. Policy Set může odkazovat nejvýše na jednu existující politiku Clean Room. |

V Clean Room texte „zapnutá/vypnutá“ znamená interné `enabled`, nie existenciu ID v Policy Set. Chýbajúcu referenciu nemožno automaticky stotožniť s `enabled: false`; správanie bez referencie nie je z tohto FE doložené. Nepridávať tvrdenie, že IBM Power tieto prostriedky automaticky odstraňuje, ani že nastavenie politiky zaručuje naplánované spúšťanie vo všetkých procesoch.

## Poradie a závislosti

1. Preklady a locale test (vrátane platformových obmedzení).
2. Create/Edit integrácia s regresnými testmi; závisí od 1.
3. Display integrácia s testmi globálnej nápovedy; závisí od 1.
4. Cielená regresia interakcií nápovedy, Create/Edit payloadu a existujúceho Display; závisí od 2 a 3. Bez nového POST → GET round-trip testu.

Po 1–2 checkpoint lokalizácie/formulára. Po 3–4 finálny checkpoint. Úlohy 2 a 3 možno vykonať nezávisle po 1, ale zmeny zdieľaných test fixtures a locale súborov treba koordinovať. Každá úloha má najviac 4 súbory; detaily sú v TODO. Implementácia čaká na kontrolu plánu používateľom.

## Testovacia stratégia a akceptácia

| ID | Kritérium a dôkaz |
|---|---|
| AC1 | Create aj Edit majú presne tri poľové otázniky, každý pri správnom názve; všetky otvoria správny titulok a intro. Parametrizovať režim × tri polia v modal teste. |
| AC2 | Display má tie isté tri nápovedy s rovnakými help keys, aj pre null/undefined, missing a unknown; zachová názvy/ID, varovania a „Not set“. |
| AC3 | Každý jazyk má presne 9 neprázdnych kľúčov namespace, identické suffixy; locale test cez LanguageProvider vykreslí všetky tri popovery v EN/SK/CS bez fallback kľúčov. Clean Room obsahuje platformové obmedzenie vo všetkých jazykoch. |
| AC4 | Klik, focus, Enter/Space na otáznik nemenia ID, checked rádia ani ostatný draft a neposielajú request; Escape zatvorí nápovedu a neuzavrie rodičovský modal/detail. Overiť aj zatvorenie tlačidlom a návrat fokusu. |
| AC5 | Existujúce povinné hodnoty, duplicita ID, varovania missing/unknown, cache/retry a ochrana rozpracovaného formulára fungujú rovnako; z nápovied nevznikajú nové validačné pravidlá ani garancia kontroly existencie vo FE. |
| AC6 | Create aj Edit po otvorení/zatvorení všetkých nápovied odošlú presne pôvodný JSON: id, name, description a tri snake_case referencie, bez help atribútov. Zachovať normalizáciu, endpoint a jednu explicitnú submit akciu. |
| AC7 | Existujúce testy Display nad kontrolovanými `PolicySetRecordOutput` fixtures naďalej zobrazujú správne ID/názvy, stav referencií a možnosť prechodu do Edit; otvorenie nápovied na tieto hodnoty nemá vplyv. Netvrdiť, že fixture/rerender dokazuje úspešné uloženie alebo GET z BE; nový POST → GET round-trip nie je v rozsahu. |
| AC8 | Globálne `policySets.help` tlačidlo aj obsah ostávajú funkčné; žiadna zmena spoločných helperov, mappera, validátora alebo generated kontraktu. |

Focused príkazy pre budúcu implementáciu (PowerShell používa `npm.cmd`, aby sa nespúšťal blokovaný `.ps1` shim):

```powershell
npm.cmd exec vitest run src/locales/policySetFieldHelpTranslations.test.ts
npm.cmd exec vitest run src/features/recovery-plans/policy-sets/components/PolicySetModal.test.tsx
npm.cmd exec vitest run src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx
npm.cmd exec vitest run src/features/recovery-plans/recovery-policies/catalog/model/policyCatalog.test.ts src/features/recovery-plans/recovery-policies/catalog/hooks/usePolicyCatalog.test.tsx src/shared/components/help-popover/KeyedHelpPopover.test.tsx src/shared/components/help-popover/HelpPopover.test.tsx
npm.cmd exec eslint -- src/features/recovery-plans/policy-sets/components/PolicySetForm.tsx src/features/recovery-plans/policy-sets/components/PolicySetsTable.tsx src/features/recovery-plans/policy-sets/components/PolicySetModal.test.tsx src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx src/locales/policySetFieldHelpTranslations.test.ts --max-warnings 0
git diff --check -- src/features/recovery-plans/policy-sets src/locales
```

Na plánovanie stačí validácia dvoch nových Markdown dokumentov a kontrola diffu. Vyššie testy sa spustia až pri implementácii. Kompletná suite, `npm run build`, typecheck a API regenerácia nie sú predvolenou súčasťou tejto lokálnej zmeny. Vizuálne overenie v prehliadači: všetky tri režimy/jazyky, úzky viewport, scroll modal/detail, dlhší Clean Room text bez orezania, myš a klávesnica. Neexistuje požiadavka vytvárať nový E2E framework.

## Samostatná následná úloha (backlog, mimo tohto PLAN/TODO implementačného rozsahu)

**Policy Sets – zosúladenie voliteľných referencií a `description` s BE kontraktom**

- **Dôvod:** Generated `PolicySet`/`SubmitPolicySetBody` povoľujú pre `snapshot_policy_id`, `recovery_app_policy_id`, `clean_room_policy_id` a `description` vynechanie alebo `null`; FE momentálne vyžaduje všetky štyri hodnoty. Najmä IBM Power Policy Set nemusí mať Clean Room politiku.
- **Samostatný návrh:** Posúdiť voľbu „Bez politiky“ pre každý typ, možnosť zrušiť predchádzajúci výber, validáciu referenčnej integrity, mapovanie prázdnej hodnoty na `null` alebo vynechanie kľúča (po overení BE správania pri upserte) a kompatibilitu Edit s už uloženými čiastočnými Policy Sets. Pri `description` rozhodnúť, či má byť voliteľný aj v UI.
- **Akceptácia následnej úlohy:** Create/Edit funguje s nenastavenými referenciami a voliteľným opisom podľa potvrdeného BE kontraktu; testy pokrývajú uloženie, opätovné načítanie, vymazanie referencie pri Edit, neexistujúce ID, nulové hodnoty aj VMware/IBM Power scenár.
- **Oddelenie rozsahu:** T1–T4 tejto úlohy ani jej implementácia nemenia `PolicySetModal.tsx` validáciu, `RadioField` výber, katalóg, API mapper alebo BE. Následná úloha má samostatné schválenie a testovanie.

## Riziká a otvorené otázky

| Riziko | Dopad | Ošetrenie |
|---|---|---|
| FE vyžaduje nepovinné BE referencie a `description` | Vysoký: Power set bez Clean Room nemožno uložiť; `description` je povinný len vo FE | Samostatný backlog na zosúladenie formulára a API; táto implementácia nemení validáciu, výber ani payload. |
| Dostupnosť BE dokumentácie | Stredný: lokálna kópia nemusí odrážať nasadenie | Pred implementáciou potvrdiť aktuálnosť pri dostupnosti BE; platformové tvrdenia sú podložené dodaným HTML, nie živým DAG auditom. |
| Dlhší Clean Room text | Stredný: čitateľnosť v malom okne | Použiť existujúci popover so scroll/viewport správaním; vizuálne overiť, nemeniť globálny komponent. |
| Rozpracované locales inej práce | Stredný: nechcené prepísanie | Pridať iba deväť vlastných kľúčov na jazyk; pred editáciou znova skontrolovať aktuálny stav. |
| Testy labelov a portaled dialogov | Stredný: zmena accessible textu/nesprávny scope | Selektory cez konkrétny trigger a názov popover dialogu; zachovať assertions pôvodných hodnôt a labelov. |

Nesúlad voliteľnosti je výslovne zaradený ako samostatný následný backlog, bez blokovania nápovied a bez rozšírenia ich implementačného rozsahu. Na kontrolu plánu ostáva obsah textov EN/SK/CS. Živá BE kontrola defaultov a podpory DAG zostáva neoverená; pre dokumentovaný návrh je dostupná lokálna kópia aj generated nullable/optional kontrakt.
