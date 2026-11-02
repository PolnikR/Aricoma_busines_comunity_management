# Recovery App Policy – plán UX úprav

Stav: implementované inline; automatické kontroly prešli, desktop čiastočne vizuálne overený. Mobilné QA a nasadené backendové minimum zostávajú neoverené. Dátum: 26. 10. 2026.
Úlohy: [recovery-app-policy-ux-todo.md](recovery-app-policy-ux-todo.md).

## Cieľ a hranice

Doplniť parametrové otázniky v Display/Create/Edit, úplné EN/SK texty a 15-minútové kroky Frequency aj Retention. Zachovať jeden existujúci formulár, DetailView, KeyedHelpPopover, workflow a existujúce sekcie. Žiadny nový helper komponent, endpoint, generated typ, úprava iných politík, Recovery Groups alebo Recovery Applications. `dagrun_timeout` je mimo rozsahu; nevznikne pole, validácia ani výpočet.

Pôvodná fáza bola iba plánovanie. Následný pokyn používateľa cez executing-plans autorizoval implementáciu tohto plánu. Pracovať inline na existujúcej vetve, po overení vytvárať atomic commity podľa AGENTS.md; bez pushu a merge. `tasks/plan.md` a `tasks/todo.md` patria inej práci a nemenia sa.

Spresnenie používateľa: otázniky zapracovať ako v Providers, teda samostatný label a susedný KeyedHelpPopover v kompaktnom riadku (`mb-1.5`, `gap-1.5`, výška wrappera otázniku 16 px). Formulár používa 12 px zvislé a 16 px vodorovné rozostupy. Predchádzajúci pokyn nepridávať informácie o predvolených hodnotách do modalov zostáva v platnosti; z návrhov textov nižšie sa pred zápisom odstránia vety o defaultoch prefixu, timeoutov a minima. Významy a konfigurovateľnosť backendového minima zostávajú vysvetlené.

## Zdroje a miera overenia

- Autoritatívny publikovaný zdroj: [Policy parameters – RecoveryAppPolicy](https://pages.esas.autocont.sk/abco-be-507ccc/parameters/policies.html), najmä Effect a Default. Webový nástroj stránku nedokázal načítať; ani PowerShell HTTP pokus sa nepripojil. Publikované HTML preto nebolo nezávisle overené.
- Dostupný lokálny zdroj dokumentácie: `../abco-be/docs/site/meta/policies.yaml`, sekcia `RecoveryAppPolicy.*`, a model `../abco-be/policy/recovery_app_policies.py`. Effect texty a modelové defaulty boli prečítané priamo. Lokálny HEAD BE: `6928b5e31a3adc8026ca5612f689e428da6a5098`; ide o lokálny checkout, nie potvrdenie verzie publikovanej stránky alebo nasadeného servera.
- `../abco-be/apache_airflow/dag_handler.py` potvrdzuje, že iba IBM Power s niektorým manuálnym režimom dostane schedule `None`; VMware používa Frequency ďalej. Obe recovery app DAG šablóny majú `is_paused_upon_creation=True`.
- Požiadavka `MIN_RECOVERY_APP_INTERVAL_MINUTES`, default 600 a HTTP 422 pochádza zo zadania. V skontrolovaných lokálnych BE súboroch modelu, routerov, rendereru a metadát dokumentácie sa tento limit nenašiel. Pred implementáciou potvrdiť aktuálny nasadený kontrakt, miesto vynútenia (uloženie politiky alebo generovanie/push DAG) a formát chyby. Lokálny model dnes vyžaduje iba kladnú Frequency; tieto dve vrstvy nemožno zameniť.
- Vzorové Snapshot Policy UX dokumenty boli prečítané. Ich pravidlá pre Retention, defaulty, minimum frekvencie alebo rozloženie sa sem automaticky neprenášajú.

Texty nižšie sú konkrétny návrh založený na dostupných lokálnych Effect textoch, modeli a zadaní. Pred zápisom do locale súborov ich porovnať s publikovanou dokumentáciou. Nedostupné HTML nebráni odovzdaniu plánu; overenie rozdielov je vstupný checkpoint implementácie.

## Analýza aktuálneho FE

Vetva: `spike/ant-design-shell`. Pri vstupe boli rozpracované `SnapshotPoliciesTable.tsx`, `tasks/snapshot-policy-ux-plan.md`, `tasks/snapshot-policy-ux-todo.md` a nový `SnapshotPolicyHelp.test.tsx`. Ide o cudziu súbežnú prácu; nemení sa ani sa nezahrnie do tejto úlohy. CodeGraph použitý pred čítaním FE kódu; BE nástroj označil ako nedostupný index, preto sa BE čítalo priamo.

Feature cesty v nasledujúcom texte sú pod `src/features/recovery-plans/recovery-policies/application-recovery/`.

| Súbor | Aktuálny stav a dôsledok |
|---|---|
| `components/RecoveryAppPolicyForm.tsx` | Frequency/Retention vedľa seba, obe čísla `min=1`, `step=1`. Podmienený max age pre `time_range`, target time pre `exact_time`; Boot verify/Enabled vedľa seba. Existujúca IBM Power sekcia obsahuje prefix, dvojicu manuálnych režimov a timeouty s krokom 1. Zmena jednotky dnes len nastaví jednotku. Bez parametrových otáznikov. |
| `components/RecoveryAppPolicyModal.tsx` | Create Frequency `1 minutes`, Retention `1 days`. IBM defaulty z generated schémy: prefix `dr_`, oba režimy false, shutdown 300, zoning wait 240. Edit kopíruje uložené hodnoty bez normalizácie. Dirty porovnáva form state s `initialForm(policy)`. Save aj Enter idú cez `validate`, následne payload mapper. Frequency/Retention kontrolujú kladné celé číslo, zatiaľ bez násobkov 15. |
| `components/RecoveryAppPoliciesTable.tsx` | DetailView má jednu sekciu Overview. Selection je zložený súhrn cez `formatSelection`, bez samostatného max age/target time. Chýba `manual_wwpn_entry`. Hlavička obsahuje `recoveryAppPolicies.help` so sekciami `schedule`, `selection`, `bootVerify`. Tabuľkový selection súhrn môže zostať nezmenený. |
| `model/recoveryAppPolicySubmit.ts` | Mapper posiela oba režimy, prefix a oba timeouty vždy, aj pri Edit. Podmienené snapshot polia posiela iba pre príslušný režim. Nevaliduje samostatne; spolieha sa na modal. Bez potreby zmeny mappera. |
| `components/RecoveryAppPolicyModal.test.tsx` | Pokrýva defaulty, payload, tri snapshot režimy, prepínanie manuálnych režimov oboma smermi, obe false, konfliktný legacy záznam, edit, dirty guard, timeouty a backend error detail. Používa reálny generated request s mock fetch. Testy meniace číslo pred jednotkou bude treba upraviť na jednotka → číslo. |
| `components/RecoveryAppPoliciesTable.test.tsx` | Pokrýva presné poradie detailových polí, hlavičkový helper, JSON view, filtre a chyby. Rozšíriť iba očakávania relevantných detailových polí; JSON payload sa nemení. |
| `src/shared/components/help-popover/KeyedHelpPopover.tsx` | Podporuje konvenciu `.trigger`, `.title`, `.intro`; pre krátke field texty použiť `sections={[]}`. |
| `src/shared/components/detail-view/DetailField.tsx` | Slot `labelHelp` už existuje. Znovu použiť, nerozširovať shared API. String `label` ponechať pre copy accessible name. |
| `src/shared/components/form/FormControls.tsx` | `Field` obaľuje deti HTML labelom; `CheckboxField` tiež renderuje label. Popover tlačidlo nesmie byť v ich label prop ani pod týmto labelom. |
| `src/locales/en.json`, `src/locales/sk.json` | Ploché mapy s bodkovanými kľúčmi. Nový namespace `recoveryAppPolicies.fieldHelp.*`; existujúce `recoveryAppPolicies.help.*` nemeniť. Test mock prekladov štandardne používa iba EN, preto SK overiť explicitne skutočnou SK mapou. |

## Minimálna integrácia a mapa otáznikov

Každý riadok používa rovnaký `helpKey` a obsah vo všetkých troch pohľadoch. Prefix kľúčov: `recoveryAppPolicies.fieldHelp.`; suffixy zodpovedajú názvom parametrov, spojené páry majú jeden spoločný kľúč.

| Parameter | Suffix helpKey | Create/Edit | Display |
|---|---|---|---|
| `level` | `level` | pri labele | pri názve hodnoty |
| `frequency_value` + `frequency_unit` | `frequency` | jeden pri Frequency | jeden pri Frequency |
| `retention_value` + `retention_unit` | `retention` | jeden pri Retention | jeden pri Retention |
| `boot_verify` | `boot_verify` | pri texte checkboxu | pri názve hodnoty |
| `snapshot_selection_mode` | `snapshot_selection_mode` | pri labele | pri názve režimu |
| `snapshot_max_age_value` + `snapshot_max_age_unit` | `snapshot_max_age` | jeden pri max age, iba `time_range` | jeden pri samostatnom max age, iba `time_range` |
| `snapshot_target_time` | `snapshot_target_time` | iba `exact_time` | iba `exact_time` |
| `enabled` | `enabled` | pri texte checkboxu | pri Status |
| `target_lpar_prefix` | `target_lpar_prefix` | pri labele | pri názve hodnoty |
| `manual_zoning` | `manual_zoning` | pri texte checkboxu | pri názve hodnoty |
| `manual_wwpn_entry` | `manual_wwpn_entry` | pri texte checkboxu | nové pole vedľa Manual zoning |
| `source_shutdown_timeout_seconds` | `source_shutdown_timeout_seconds` | pri labele | pri názve hodnoty |
| `zoning_wait_minutes` | `zoning_wait_minutes` | pri labele | pri názve hodnoty |
| ID, Name, Description | žiadny | bez otáznikov | bez otáznikov |

Počty parametrových triggerov: `latest` 11, `time_range` 12, `exact_time` 12. Display má navyše jeden pôvodný hlavičkový trigger. Nezapočítavať tlačidlo zatvorenia otvoreného popovera.

Create/Edit: pri dotknutých číselných/textových/select poliach nahradiť miestny `Field` obal divom s riadkom samostatný `label htmlFor` + susedný `KeyedHelpPopover`. Ponechať Input/Select, ID, chyby, focus a disabled stav. Jednotkové vstupy môžu zostať vo Field; žiadny druhý otáznik pri jednotke.

Pri štyroch checkboxoch použiť miestny riadok s natívnym checkboxom, samostatným labelom a susedným popoverom za textom labelu; preniesť existujúce bordered triedy, ID, checked, disabled, `onChange` aj `aria-invalid`/`aria-describedby` manuálnych režimov. Nevytvoriť nový komponent ani meniť shared CheckboxField. Tým otáznik zostane priamo pri názve a mimo labelu. Overiť pôvodné accessible names.

Display: použiť `DetailField.labelHelp`. Iba v detaile nahradiť hodnotu Snapshot selection zo súhrnu samostatným názvom režimu (`recoveryAppPolicies.selection.<mode>`); bezprostredne za ním pridať max age s hodnotou/jednotkou pre `time_range` alebo target time pre `exact_time`. Neduplicitne: detailový režim už neobsahuje vek/čas v súhrne. Pre labels použiť existujúce `recoveryAppPolicies.form.maxAge`, `.targetTime`, `.manualWwpnEntry`. Chýbajúca legacy hodnota použije existujúci prázdny stav DetailField, nie vymyslenú nulu. Doplniť Manual WWPN entry hneď za Manual zoning. Bez novej sekcie alebo stĺpca tabuľky.

Celkový header helper aj všetky `recoveryAppPolicies.help.*` ponechať presne pôvodné, vrátane existujúcich textov o Boot verify. Prípadný rozpor s novou presnejšou parametrovou nápovedou nie je autorizáciou na opravu header textu.

Zachovať Frequency/Retention vedľa seba, dvojice číslo/jednotka spolu, snapshot polia v existujúcom bloku a manuálne režimy vedľa seba. IBM Power polia zostávajú viditeľné bez zavádzania platformového filtra; politika sama nemá platformový kontext. Zachovať existujúci hint, že VMware IBM parametre ignoruje.

## Frequency a Retention: validácia a jednotky

| Parameter | Jednotka | Minimum/krok UI | Aplikačná validácia |
|---|---|---|---|
| Frequency aj Retention | minutes | 15 / 15 | neprázdne, konečné celé číslo ≥15, násobok 15 |
| Frequency aj Retention | hours | 1 / 1 | neprázdne, konečné celé číslo ≥1 |
| Frequency aj Retention | days | 1 / 1 | neprázdne, konečné celé číslo ≥1 |

Bez maxima 60; 15/30/45/60/75/90 aj 600 sú platné UI minúty. Validovať pred `Number` konverziou aj prázdny/whitespace string a povolenú jednotku. Pri chybe zachovať vstup a zablokovať Save aj Enter bez API requestu. Snapshot max age a zoning wait na násobky 15 nemeníme.

Pri skutočnej používateľskej zmene `frequency_unit` nastaviť jednotku a `frequency_value: ''` v jednej funkčnej aktualizácii state; analogicky Retention. Druhý pár sa nemení. Výber rovnakej jednotky je no-op. Vyčistiť príslušnú starú validačnú chybu; nasledujúci submit vyžaduje nové číslo. Bez konverzie, zaokrúhlenia, hlášky alebo efektu reagujúceho na hydratáciu Edit.

Create default Frequency nastaviť na `1 day` (zodpovedá dokumentovanému backendovému defaultu), Retention ponechať `1 day`. Nevytvárať pevné minimum 600 ako FE konštantu. Edit načítať bez automatických zmien aj pri pôvodných neplatných minútových hodnotách (napr. 7). Pri uložení platí jedna rovnaká validácia pre Create aj Edit: ak je minútová hodnota neplatná, používateľ ju opraví. Žiadne historické výnimky, sledovanie zmenených polí ani tiché prepisovanie údajov; ide o testovacie prostredie, v ktorom sa staré hodnoty nahradia.

Odlišovať tri pravidlá:

1. **UI krok:** 15 minút pre oba intervaly vo všetkých režimoch. Ani manuálny režim neprepustí prázdnu Frequency do povinného API poľa.
2. **Automatický recovery:** backend podľa zadania vynucuje konfigurovateľné `MIN_RECOVERY_APP_INTERVAL_MINUTES`, default 600. FE nemá potvrdený zdroj aktuálnej konfigurácie, preto nevynucuje pevné minimum 600 a nezavádza endpoint. Backendové 422 zobraziť existujúcim submit alertom s detailom, ak vznikne pri uložení. Ak vzniká až pri pushi, overiť a zaznamenať to; nepovažovať úspešné uloženie za dôkaz povoleného DAG intervalu a nerozširovať teraz iné workflow.
3. **Manuálne IBM Power režimy:** Frequency sa nevyužije na plánovanie, ale ostáva uložená a validovaná ako povinné číslo. Pre VMware flagy tento účinok nemajú. Retention nemá dokumentované minimum 600 a neodvodzuje sa od Frequency.

Testy simulujú serverové odmietnutie konfigurovaného minima, nie lokálne hardcoded odmietnutie `599`. Pri kontraktovej kontrole preveriť platný UI interval pod aktuálnym serverovým minimom, interval na minime a oba manuálne IBM režimy. Žiadny reálny push alebo spustenie recovery počas tejto plánovacej úlohy.

Nový spoločný validačný kľúč `recoveryAppPolicies.validation.intervalMinutes`: EN „Enter a whole number of minutes, at least 15 and a multiple of 15.“; SK „Zadajte celý počet minút, aspoň 15 a násobok 15.“ Ostatné prípady používajú existujúce `positiveInteger` a `unitRequired`. Bez prepočtových správ.

## Kontrola manuálnych režimov a timeoutov

| Kontrola | Zistenie | Plán |
|---|---|---|
| Vzájomné vylúčenie | `handleChange` pri zapnutí jedného vypne druhý. Validácia blokuje oba true zo starého API záznamu. Obe false sú povolené. | Zachovať; existujúce testy znovu spustiť. |
| Manual zoning | Lokálne Effect: ľudské potvrdenie pred stop_source a následným boot; Power DAG bez schedule. | Presne vysvetliť v nápovede, bez zmeny logiky. |
| Manual WWPN | Pred create_lpar jedna výzva pre každý VIOS; operátor zadáva už nazónované WWPN, BE ich overuje, neukladajú sa. Bez confirm_zoning kroku. | Nápoveda a chýbajúce Display pole. Žiadny WWPN vstup v policy formulári. |
| Defaulty | Create preberá generated 300 sekúnd a 240 minút; model BE potvrdzuje tieto hodnoty. | Žiadne nové hardcoded defaulty timeoutov. |
| Edit | `toFormData` preberá uložený prefix, flagy a oba timeouty presne. | Zachovať hodnoty aj pri úprave iného poľa. |
| Validácia timeoutov | Kladné celé číslo; Form má `min=1`, `step=1`. | Bez 15-minútového pravidla pre zoning wait. Overiť aj hodnotu 7. |
| Payload | Mapper vždy posiela oba timeouty a oba flagy, nezávisle od selection mode. | Bez refactoringu mappera. |
| Prepnutie režimu | Setter mení flagy, nie timeouty. | Doplniť regresné assertion zachovania neštandardných timeoutov oboma smermi aj pri oboch false. |

Ide o kontrolu zdrojov a existujúcich testov, nie tvrdenie o ich čerstvom úspešnom behu. Správne správanie sa nemení iba kvôli pridaniu nápovedy.

## Kompletné návrhy EN/SK textov

Ploché dodatky do locale máp. Presne 13 helpKey × 3 kľúče × 2 jazyky. Nižšie sú implementované texty po odstránení informácií o predvolených hodnotách podľa skoršieho pokynu používateľa. Frequency odlišuje UI krok od konfigurovateľného backendového minima bez pevnej hodnoty.

### EN

```json
{
  "recoveryAppPolicies.fieldHelp.level.trigger": "Help for level",
  "recoveryAppPolicies.fieldHelp.level.title": "Level",
  "recoveryAppPolicies.fieldHelp.level.intro": "A freely defined criticality level for the policy, such as critical, high, medium or low.",
  "recoveryAppPolicies.fieldHelp.frequency.trigger": "Help for frequency",
  "recoveryAppPolicies.fieldHelp.frequency.title": "Frequency",
  "recoveryAppPolicies.fieldHelp.frequency.intro": "The value and unit define the recovery DAG schedule. The DAG is created paused; unpause it to allow scheduled runs. For IBM Power, either manual zoning or manual WWPN entry makes the DAG manual-trigger only, so frequency is not used for scheduling. VMware still uses frequency. Automatic recovery is subject to the backend's configured minimum interval. The 15-minute input step does not override that minimum.",
  "recoveryAppPolicies.fieldHelp.retention.trigger": "Help for retention",
  "recoveryAppPolicies.fieldHelp.retention.title": "Retention",
  "recoveryAppPolicies.fieldHelp.retention.intro": "The intended time to keep the recovered application in the target environment before removing it, expressed as a value and unit. This setting is stored, but the recovery app DAG does not currently read it; it does not guarantee automatic removal after this period.",
  "recoveryAppPolicies.fieldHelp.boot_verify.trigger": "Help for boot verification",
  "recoveryAppPolicies.fieldHelp.boot_verify.title": "Boot verification",
  "recoveryAppPolicies.fieldHelp.boot_verify.intro": "Requests a check that the recovered application starts. The setting is stored, but no DAG template currently uses it.",
  "recoveryAppPolicies.fieldHelp.snapshot_selection_mode.trigger": "Help for snapshot selection",
  "recoveryAppPolicies.fieldHelp.snapshot_selection_mode.title": "Snapshot selection",
  "recoveryAppPolicies.fieldHelp.snapshot_selection_mode.intro": "Chooses the snapshot to recover: latest uses the newest snapshot; time_range uses the newest snapshot within the maximum allowed age; exact_time selects a snapshot according to the specified time of day.",
  "recoveryAppPolicies.fieldHelp.snapshot_max_age.trigger": "Help for maximum snapshot age",
  "recoveryAppPolicies.fieldHelp.snapshot_max_age.title": "Maximum snapshot age",
  "recoveryAppPolicies.fieldHelp.snapshot_max_age.intro": "The maximum allowed age of a snapshot for time_range selection. Both a positive whole-number value and a unit are required. This parameter applies only to time_range.",
  "recoveryAppPolicies.fieldHelp.snapshot_target_time.trigger": "Help for snapshot target time",
  "recoveryAppPolicies.fieldHelp.snapshot_target_time.title": "Snapshot target time",
  "recoveryAppPolicies.fieldHelp.snapshot_target_time.intro": "The time of day used to select a snapshot in exact_time mode, in HH:MM format. Required only for exact_time.",
  "recoveryAppPolicies.fieldHelp.enabled.trigger": "Help for policy status",
  "recoveryAppPolicies.fieldHelp.enabled.title": "Policy status",
  "recoveryAppPolicies.fieldHelp.enabled.intro": "Enables or disables the policy.",
  "recoveryAppPolicies.fieldHelp.target_lpar_prefix.trigger": "Help for target LPAR prefix",
  "recoveryAppPolicies.fieldHelp.target_lpar_prefix.title": "Target LPAR prefix",
  "recoveryAppPolicies.fieldHelp.target_lpar_prefix.intro": "For IBM Power, prefixes the source LPAR name to form the cloned target LPAR name. The prefix is copied to the application record when its DAG is pushed so rollback can derive the same names. An empty prefix is rejected during recovery initialization when source and target use the same system. VMware ignores this setting.",
  "recoveryAppPolicies.fieldHelp.manual_zoning.trigger": "Help for manual zoning",
  "recoveryAppPolicies.fieldHelp.manual_zoning.title": "Manual zoning",
  "recoveryAppPolicies.fieldHelp.manual_zoning.intro": "For IBM Power, requires an operator to confirm zoning before the source LPAR is stopped and recovery can continue. The DAG has no automatic schedule and must be triggered manually. Cannot be combined with manual WWPN entry. VMware ignores this setting.",
  "recoveryAppPolicies.fieldHelp.manual_wwpn_entry.trigger": "Help for manual WWPN entry",
  "recoveryAppPolicies.fieldHelp.manual_wwpn_entry.title": "Manual WWPN entry",
  "recoveryAppPolicies.fieldHelp.manual_wwpn_entry.intro": "For IBM Power, prompts the operator for already zoned WWPNs for each VIOS before creating the target LPAR. The backend validates the entries; WWPNs are not stored. This mode does not include manual zoning confirmation and cannot be combined with manual zoning. The DAG has no automatic schedule and must be triggered manually. VMware ignores this setting.",
  "recoveryAppPolicies.fieldHelp.source_shutdown_timeout_seconds.trigger": "Help for source shutdown timeout",
  "recoveryAppPolicies.fieldHelp.source_shutdown_timeout_seconds.title": "Source shutdown timeout",
  "recoveryAppPolicies.fieldHelp.source_shutdown_timeout_seconds.intro": "For IBM Power, how many seconds to wait for the source LPAR to shut down. Must be a positive whole number. VMware ignores this setting.",
  "recoveryAppPolicies.fieldHelp.zoning_wait_minutes.trigger": "Help for zoning wait",
  "recoveryAppPolicies.fieldHelp.zoning_wait_minutes.title": "Zoning wait",
  "recoveryAppPolicies.fieldHelp.zoning_wait_minutes.intro": "For IBM Power, the time limit in minutes for manual zoning confirmation or for each VIOS WWPN entry prompt. Applies when either manual mode is enabled. Must be a positive whole number, in one-minute steps. VMware ignores this setting."
}
```

### SK

```json
{
  "recoveryAppPolicies.fieldHelp.level.trigger": "Nápoveda k úrovni",
  "recoveryAppPolicies.fieldHelp.level.title": "Úroveň",
  "recoveryAppPolicies.fieldHelp.level.intro": "Voľne definovaná úroveň kritickosti politiky, napríklad critical, high, medium alebo low.",
  "recoveryAppPolicies.fieldHelp.frequency.trigger": "Nápoveda k frekvencii",
  "recoveryAppPolicies.fieldHelp.frequency.title": "Frekvencia",
  "recoveryAppPolicies.fieldHelp.frequency.intro": "Hodnota a jednotka určujú plán spúšťania recovery DAG. DAG sa vytvorí v pozastavenom stave; plánované spúšťanie umožníte zrušením pozastavenia. Pri IBM Power manuálny zoning aj manuálne zadanie WWPN znamenajú výhradne ručné spúšťanie bez použitia frekvencie na plánovanie. Pri VMware frekvencia naďalej platí. Automatická obnova podlieha nakonfigurovanému minimu intervalu na backende. Krok vstupu 15 minút toto minimum nemení.",
  "recoveryAppPolicies.fieldHelp.retention.trigger": "Nápoveda k retencii",
  "recoveryAppPolicies.fieldHelp.retention.title": "Retencia",
  "recoveryAppPolicies.fieldHelp.retention.intro": "Zamýšľaná doba ponechania obnovenej aplikácie v cieľovom prostredí pred jej odstránením, vyjadrená hodnotou a jednotkou. Nastavenie sa ukladá, ale recovery DAG aplikácie ho momentálne nečíta; negarantuje automatické odstránenie po uplynutí tejto doby.",
  "recoveryAppPolicies.fieldHelp.boot_verify.trigger": "Nápoveda k overeniu spustenia",
  "recoveryAppPolicies.fieldHelp.boot_verify.title": "Overenie spustenia",
  "recoveryAppPolicies.fieldHelp.boot_verify.intro": "Požaduje kontrolu, či sa obnovená aplikácia spustí. Nastavenie sa ukladá, ale žiadna DAG šablóna ho momentálne nepoužíva.",
  "recoveryAppPolicies.fieldHelp.snapshot_selection_mode.trigger": "Nápoveda k výberu snapshotu",
  "recoveryAppPolicies.fieldHelp.snapshot_selection_mode.title": "Výber snapshotu",
  "recoveryAppPolicies.fieldHelp.snapshot_selection_mode.intro": "Určuje snapshot použitý na obnovu: latest vyberie najnovší snapshot; time_range vyberie najnovší snapshot v rámci maximálneho povoleného veku; exact_time vyberie snapshot podľa zadaného času dňa.",
  "recoveryAppPolicies.fieldHelp.snapshot_max_age.trigger": "Nápoveda k maximálnemu veku snapshotu",
  "recoveryAppPolicies.fieldHelp.snapshot_max_age.title": "Maximálny vek snapshotu",
  "recoveryAppPolicies.fieldHelp.snapshot_max_age.intro": "Maximálny povolený vek snapshotu pri výbere time_range. Vyžaduje kladnú celočíselnú hodnotu aj jednotku. Parameter platí iba pre time_range.",
  "recoveryAppPolicies.fieldHelp.snapshot_target_time.trigger": "Nápoveda k cieľovému času snapshotu",
  "recoveryAppPolicies.fieldHelp.snapshot_target_time.title": "Cieľový čas snapshotu",
  "recoveryAppPolicies.fieldHelp.snapshot_target_time.intro": "Čas dňa použitý na výber snapshotu v režime exact_time vo formáte HH:MM. Povinný iba pre exact_time.",
  "recoveryAppPolicies.fieldHelp.enabled.trigger": "Nápoveda k stavu politiky",
  "recoveryAppPolicies.fieldHelp.enabled.title": "Stav politiky",
  "recoveryAppPolicies.fieldHelp.enabled.intro": "Zapína alebo vypína politiku.",
  "recoveryAppPolicies.fieldHelp.target_lpar_prefix.trigger": "Nápoveda k prefixu cieľových LPAR",
  "recoveryAppPolicies.fieldHelp.target_lpar_prefix.title": "Prefix cieľových LPAR",
  "recoveryAppPolicies.fieldHelp.target_lpar_prefix.intro": "Pri IBM Power sa pridá pred názov zdrojovej LPAR a vytvorí názov klonovanej cieľovej LPAR. Pri pushnutí DAG sa prefix skopíruje do záznamu aplikácie, aby rollback odvodil rovnaké názvy. Prázdny prefix sa pri inicializácii obnovy odmietne, ak sú zdroj a cieľ na rovnakom systéme. VMware toto nastavenie ignoruje.",
  "recoveryAppPolicies.fieldHelp.manual_zoning.trigger": "Nápoveda k manuálnemu zoningu",
  "recoveryAppPolicies.fieldHelp.manual_zoning.title": "Manuálny zoning",
  "recoveryAppPolicies.fieldHelp.manual_zoning.intro": "Pri IBM Power vyžaduje potvrdenie zoningu operátorom pred vypnutím zdrojovej LPAR a pokračovaním obnovy. DAG nemá automatický plán a spúšťa sa ručne. Nemožno kombinovať s manuálnym zadaním WWPN. VMware toto nastavenie ignoruje.",
  "recoveryAppPolicies.fieldHelp.manual_wwpn_entry.trigger": "Nápoveda k manuálnemu zadaniu WWPN",
  "recoveryAppPolicies.fieldHelp.manual_wwpn_entry.title": "Manuálne zadanie WWPN",
  "recoveryAppPolicies.fieldHelp.manual_wwpn_entry.intro": "Pri IBM Power vyžiada od operátora už nazónované WWPN pre jednotlivé VIOS pred vytvorením cieľovej LPAR. Backend zadané hodnoty overuje; WWPN sa neukladajú. Tento režim neobsahuje manuálne potvrdenie zoningu a nemožno ho kombinovať s manuálnym zoningom. DAG nemá automatický plán a spúšťa sa ručne. VMware toto nastavenie ignoruje.",
  "recoveryAppPolicies.fieldHelp.source_shutdown_timeout_seconds.trigger": "Nápoveda k časovému limitu vypnutia zdroja",
  "recoveryAppPolicies.fieldHelp.source_shutdown_timeout_seconds.title": "Časový limit vypnutia zdroja",
  "recoveryAppPolicies.fieldHelp.source_shutdown_timeout_seconds.intro": "Pri IBM Power určuje počet sekúnd čakania na vypnutie zdrojovej LPAR. Musí byť kladné celé číslo. VMware toto nastavenie ignoruje.",
  "recoveryAppPolicies.fieldHelp.zoning_wait_minutes.trigger": "Nápoveda k čakaniu na zoning",
  "recoveryAppPolicies.fieldHelp.zoning_wait_minutes.title": "Čakanie na zoning",
  "recoveryAppPolicies.fieldHelp.zoning_wait_minutes.intro": "Pri IBM Power určuje časový limit v minútach pre manuálne potvrdenie zoningu alebo pre každú výzvu na zadanie WWPN pre VIOS. Platí pri zapnutí niektorého manuálneho režimu. Musí byť kladné celé číslo s krokom jedna minúta. VMware toto nastavenie ignoruje."
}
```

## Závislosti, riziká a regresná stratégia

Poradie: vstupný kontraktový checkpoint → T1 intervaly → T2 EN/SK texty → checkpoint A → T3 Create/Edit otázniky → T4 Display → checkpoint B → T5 integračné regresie a browser QA. T1 ide prvá, pretože mení vstupy a dirty správanie. Detaily úloh sú len v TODO. Pracovať sekvenčne: formulár, testy a locale sú spoločné; paralelné zápisy neprinášajú výhodu.

| Riziko | Dopad | Opatrenie |
|---|---|---|
| Rozdiel publikovaného a lokálneho BE kontraktu | vysoký | Pred implementáciou potvrdiť HTML a miesto/formát 422; nezamieňať plán s nasadeným správaním. |
| 15 minút pôsobí ako povolený automatický recovery interval | vysoký | Nápoveda odlíši UI krok od konfigurovaného minima; backend zostáva autoritou. |
| Staré testovacie intervaly nesplnia nové pravidlá | nízky | Jednotná validácia Create/Edit; používateľ ich pri ďalšom uložení opraví, bez špeciálnych výnimiek. |
| Popover aktivuje checkbox alebo submit | stredný | Tlačidlo mimo labelu; integračný test click/Enter/Escape, focus a nezmenený payload/dirty stav. |
| Display duplikuje selection údaje | stredný | V detaile samotný režim plus jediný podmienený údaj; súhrn ponechať len v tabuľke. |
| SK texty spôsobia overflow | stredný | Reálny browser EN/SK, 320/375/768 px a desktop, `min-w-0`, pružný grid. |
| Súbežné Snapshot zmeny vrátane shared slotu | stredný | Pred začiatkom skontrolovať worktree, existujúci labelHelp znovu použiť; shared komponenty nemeniť. |

Focused testy: modal, table a nový `RecoveryAppPolicyHelp.test.tsx` s reálnymi EN/SK mapami. Help test pokrýva každý viditeľný trigger, title/intro, podmienenú absenciu a zachovanie header helpera; neopakuje interné shared HelpPopover testy. Modal testy pokryjú 15-minútové hodnoty, vyprázdnenie jednotky, Save/Enter, staré hodnoty, backend error detail, timeouty a manuálne režimy. Browser QA preverí layout, klávesnicu, focus a prvý Escape zatvárajúci iba popover; jsdom nie je dôkaz responzivity.

ESLint iba na zmenených TS/TSX, JSON parser a zhoda nových EN/SK kľúčov. Celú suite, plný typecheck ani produkčný build nespúšťať automaticky. Každý neprejdený alebo nedostupný krok uviesť v reporte, nie označiť ako hotový.

## Výsledok implementácie a zostávajúce overenia

- Používateľ následným pokynom cez executing-plans autorizoval implementáciu a požadoval otázniky v rozložení Providers. Práca prebehla inline na existujúcej vetve bez ďalších agentov.
- Create Frequency a Retention používajú `1 day`; obe majú minutes min/step 15, ostatné jednotky 1. Pri zmene jednotky sa vymaže iba číslo jej páru a jeho stará chyba. Neplatné historické hodnoty sa pri otvorení nemenia a pri ukladaní sa validujú.
- Existujúce komponenty a shared labelHelp boli znovu použité. Nápoveda nemá default informácie. Display má samostatný selection režim a podmienený vek/čas, Manual WWPN entry a pôvodný header helper.
- Kontrola lokálnych BE metadát potvrdila významy uvedené v pláne; uložená HTML dokumentácia otvorená v Poznámkovom bloku bola prečítaná v tejto konverzácii. Nasadená konfigurácia minima a miesto vynútenia 422 (submit alebo push) nie sú overené. FE preto nevynucuje 600; test simuluje 422 pri submit a overuje zobrazenie detailu, nie skutočné správanie nasadeného servera.
- Desktop EN: v reálnom Edge na `localhost:5173/recovery-plans/recovery-policies/application-recovery` skontrolované Create/Edit rozloženie a kompaktné otázniky, Create `1 day`, otvorenie Frequency popovera s preloženým obsahom a Escape, ktorý zavrie iba popover. Žiadne údaje neboli uložené. Pri prvom zobrazení po HMR boli v už načítanom kontexte raw locale kľúče; po obnovení stránky sa načítali nové texty. Produkčná zmena locale loadera nie je súčasťou tejto úlohy.
- EN/SK pri 320/375/768 px, Display screenshot, mobile/touch, DevTools console/network a kompletné klávesnicové QA neboli vizuálne overené. EN/SK obsah, viditeľnosť vo všetkých režimoch a troch pohľadoch, Enter/Tab/Escape, dirty stav a checkbox izolácia sú pokryté automaticky.

## Vykonané kontroly

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPolicyModal.test.tsx src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPoliciesTable.test.tsx src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPolicyHelp.test.tsx
node node_modules/eslint/bin/eslint.js src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPolicyForm.tsx src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPolicyModal.tsx src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPolicyModal.test.tsx src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPoliciesTable.tsx src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPoliciesTable.test.tsx src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPolicyHelp.test.tsx --max-warnings 0
node node_modules/typescript/bin/tsc -p .superpowers/recovery-app-policy-ux-tsconfig.json --noEmit
git diff --check
```

Výsledok: 62 testov v 3 súboroch, ESLint bez chýb a úspešný focused TypeScript. Dočasný TypeScript config rozširoval `tsconfig.app.json` a zahŕňal application-recovery `components/*.tsx`, `src/test-utils/setup.ts` a `src/**/*.d.ts`, bez incremental výstupu; po kontrole odstránený. Node obsahová kontrola EN/SK potvrdila 39 nových fieldHelp kľúčov na jazyk bez default textov a presnú zhodu všetkých predtým existujúcich locale hodnôt s commitom `4e1cfe1c`. Celá testovacia sada ani build neboli spustené.

Implementačné commity: `dfa2a8db` (intervaly), `a3b97110` (Create/Edit nápoveda a regresie), `168003c3` (Display a EN/SK integrácia). Bez pushu a merge.
