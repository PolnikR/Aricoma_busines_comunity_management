# Plán: centralizácia pravidiel polí providerov

Stav: návrh na schválenie, 26. 10. 2026. Implementácia sa nezačala.
Úlohy: [provider-fields-centralization-todo.md](provider-fields-centralization-todo.md).

## Cieľ a hranice

Zachovať jeden `ProviderCreateForm`, `ProvidersCreateModal`, create/edit workflow a `useSubmitProvider()`. Zaviesť jeden malý modelový súbor pre relevantnosť typovo špecifických polí; použiť ho pri renderovaní, validácii, zmene typu a zostavení payloadu. Žiadny formulárový framework, štyri schémy, nové API, generovanie ani prestavba modulu.

Táto dodávka obsahuje iba plán a TODO. Produkčný kód, existujúce testy, OpenAPI a generované súbory sa nemenia. Implementácia čaká na schválenie používateľom. Súčasné rozpracované úlohy sa neprepisujú; commit obsahuje iba tieto dva dokumenty, bez pushu či merge.

## Overené zdroje

- Backendová referencia: `C:/Users/polnikr/Downloads/Provider parameters.html`, titul „Provider parameters“, prečítaná 26. 10. 2026. Je mimo repozitára; do repozitára ju tento plán nekopíruje. Tvrdenia o backendovej implementácii nižšie pochádzajú z tohto dokumentu, nie z kontroly backendového zdrojového kódu.
- `openapi/abco-api.json`: `components.schemas.Provider`, `ProviderRecord`, `ProviderType`, `paths./submit_provider.post`.
- `src/generated/query/zod/{provider,providerRecord,submitProviderBody}.gen.ts` a `src/generated/query/providers/providers.gen.ts`.
- `src/features/providers-connectors/providers/components/{ProviderCreateForm,ProvidersCreateModal}.tsx`, ich testy a `model/{providerTypes,providerCategory,selectProviders}.ts`.
- `model/{providerTypes,providerCategory}.test.ts`, `model/providersWire.test.tsx`; existujúci návrh relationships v `docs/superpowers/specs/2026-10-02-provider-relationships-design.md`.
- `src/features/discovery-inventory/resources/hooks/useVmwareTags.ts`, `src/shared/components/form/MultiSelect.tsx`, `src/locales/{en,sk}.json`, `package.json`.

## Aktuálny stav

### Formulár a modal

`ProviderCreateFormData` je plochý stav so stringovým `type` (vrátane prázdnej hodnoty), stringovými vstupmi a poľami `vmTags` a `backingStorageProviderIds`. `managedSystem` chýba. Formulár je prezentačný; modal vlastní inicializáciu, dirty porovnanie, validáciu a explicitné zostavenie jedného objektu pre upsert.

`ProviderCreateForm` podmieňuje backing storage cez `isComputeProviderType()` a partnera cez `isPartnerProviderType()`. `vmPrefix` a `vmTags` renderuje bez podmienky, aj pred výberom typu. Tagový `Select` zobrazuje iba `vmTags[0]`; zmena odošle `[tag]` alebo `[]`. Bez interakcie modal zachová všetky načítané tagy. Existujúce testy toto rozlíšenie výslovne overujú: nejde o stratu tagov pri každom uložení, ale pri ich zmene cez jednohodnotový vstup.

Modal načítava tagy iba pre otvorenú editáciu VMware (`useTags(provider.id, enabled)`), počas vytvárania je výber vypnutý. Zachováva loading/error/retry a uložený tag aj mimo aktuálnych možností. Credentials majú samostatné načítanie, retry a fallback pre chýbajúce ID. Úspech ukladania obchádza unsaved guard a zatvára modal; chyby zostávajú v modale s backendovým detailom.

Editácia zamyká ID aj typ. `createInitialForm()` kopíruje známe polia vrátane celého poľa tagov a backing IDs, no nečíta `managedSystem`. Dirty kontrola porovnáva tagy s poradím a backing IDs bez ohľadu na poradie. Nové pole bude treba zaradiť aj sem.

### Validácia a payload

`validate()` vyžaduje normalizované unikátne ID, neprázdne name/description/type/role/ipAddress. Partner nesmie byť sám provider; kontrola dnes nie je podmienená typom. Email je nepovinný s kontrolou formátu. Interval je nepovinné kladné bezpečné celé číslo. Nie je zavedená striktná kontrola IP adresy (host je podľa dokumentácie platný), povinnosť VMware filtrov ani managed system.

`handleSubmit()` explicitne mapuje spoločné polia, trimuje text, posiela `credentialId` a partnera ako hodnotu alebo `null`, neprázdne URL; vždy posiela `vmPrefix` ako string/null a celé `vmTags`. Backing IDs posiela iba compute typom. Email a interval posiela ako hodnotu/null. `managedSystem` neposiela vôbec. Upsert dostáva `{ data: record }`, nie zoznam providerov; `credentialStatus` sa neposiela.

### Klasifikácia a kontrakt

`providerTypes.ts` odvodzuje lokálny `ProviderType` zo štyroch infraštruktúrnych typov a `ProviderSubmitData` priamo z generovaného `Provider`. `selectProviders()` zachováva polia API cez spread a odfiltruje platformové typy; `managedSystem` sa teda nestráca pri načítaní zoznamu, až pri mapovaní do formulára/payloadu.

`providerCategory.ts` už definuje compute = VMWARE/IBM_POWER, storage = FLASHCOPY/HITACHI, partner = FLASHCOPY. Tieto zoznamy zostávajú autoritou pre kategórie a kandidátov relationships. Generovaný enum navyše obsahuje AIRFLOW/SMTP/BACKEND/KEYCLOAK; do infraštruktúrneho formulára ich nepridávať.

`POST /submit_provider` prijíma plochý `Provider`, vracia `ProvidersResponse`. Hook posiela JSON a invaliduje provider queries. Schéma nemá discriminated union ani typovo podmienené obmedzenia. Všetkých päť špecifických polí dokumentácie je v aktuálnom API podporovaných; žiadne rozšírenie kontraktu netreba.

## Presné rozdiely: dokumentácia / OpenAPI / FE

| Oblasť | HTML referencia | Aktuálny OpenAPI a generované typy | Aktuálny FE a odporúčanie |
| --- | --- | --- | --- |
| `vmPrefix` | Iba VMWARE, nepovinný string, none | Nepovinný string/null bez väzby na typ | Viditeľný a odosielaný pre všetky typy; obmedziť nové hodnoty na VMWARE. |
| `vmTags` | Iba VMWARE, `list[str]`, predvolene `[]` | Nepovinné `string[]`, bez nullable vetvy a bez explicitného defaultu | Všade zobrazený single Select; použiť existujúci MultiSelect, zachovať celé uložené pole. |
| `backingStorageProviderIds` | VMWARE/IBM_POWER, `[]`; existujúce unikátne IDs FLASHCOPY/HITACHI | Nepovinné `string[]`, bez defaultu a týchto vzťahových validácií | UI/payload už správne rozlišujú compute a kandidátov; správanie zachovať. Backendovú kontrolu existencie/duplicít neprenášať automaticky do FE. |
| `partnerProviderId` | Iba FLASHCOPY, none; iný existujúci FLASHCOPY | Nepovinný string/null, bez vzťahových obmedzení | UI a kandidáti správne; self validáciu viazať na relevantnosť poľa. Null mimo FLASHCOPY je dnešná neutrálna konvencia. |
| `managedSystem` | Iba IBM_POWER, none; SystemName; potrebný, ak HMC spravuje viac systémov | Nepovinný string/null vo vstupe aj read modeli; bez podmienenej povinnosti | Chýba v stave, UI aj payload mappingu. Pridať nepovinný textový vstup; nevymýšľať povinnosť pre každé IBM_POWER ani zisťovacie API. |
| `description` | Nepovinný, none | Nepovinný string/null | FE vyžaduje neprázdny trimovaný text. Zachovať; prípadné uvoľnenie je samostatné rozhodnutie. |
| `ipAddress` | Nepovinný host alebo IP, none | Nepovinný string/null, bez IP formátu | FE vyžaduje neprázdny text. Zachovať vrátane podpory hostname; nezavádzať IPv4-only validáciu. |
| `role` | Nepovinný, default `source`, enum source/target | Nepovinný vstup s defaultom `source`; po parsovaní výstupu vyplnený | FE začína prázdnou rolou a vyžaduje výber. Zachovať; automatický default nie je súčasť centralizácie. |
| `id`, `name`, `type` | Povinné | Jediné required polia modelu Provider; string/string/enum | FE navyše normalizuje a kontroluje kolízie ID a trimuje name. Zachovať existujúci create/edit rozdiel. |
| `credentialId`, `url` | Spoločné nepovinné stringy, none | Nepovinné string/null | Zachovať načítanie credentials, fallback aj dnešné trim/null/omit správanie. Nevytvárať pole `port` (v modeli Provider nie je). |
| `notificationEmail` | Spoločný nepovinný email; podľa dokumentu neplatný vedie na 400 | Nepovinný string/null bez formátovej validácie | FE už kontroluje formát; zachovať. |
| `cacheRefreshSeconds` | Spoločné nepovinné kladné celé číslo; unset používa default typu | Nepovinný integer/null bez minima | FE už kontroluje kladné bezpečné celé číslo; zachovať, prázdne posielať null. |

Dokument uvádza, že providerové `vmPrefix`/`vmTags` sú uložené, ale zatiaľ nepoužívané funkciami vCenter discovery a `/vdisks_by_vm`. Úpravou FE sa im nepridáva nové backendové správanie ani prísľub filtrovania. Rozdiel medzi dokumentovaným defaultom polí a absenciou defaultu v OpenAPI neopraviť generovaním vlastného kontraktu. HTML opisuje doménové pravidlá, ktoré plochá OpenAPI schéma nekóduje; nie je to dôvod meniť API ani automaticky pridávať všetky backendové validácie.

## Navrhovaná minimálna implementácia

### 1. Jeden malý súbor pravidiel

Nový `src/features/providers-connectors/providers/model/providerFieldConfig.ts` bude obsahovať pevný typ kľúčov špecifických polí odvodený/overený voči `keyof ProviderSubmitData` a jednoduchý resolver `getProviderFieldConfig(type: string)`. Výsledkom je úplný `Record<ProviderSpecificField, boolean>` pre päť polí, bez optional booleanov, stringových zoznamov z runtime a bez `any`.

Resolver využije `isComputeProviderType(type)` pre backing storage a `isPartnerProviderType(type)` pre partnera. Iba tu sa určí VMWARE relevantnosť prefixu/tagov a IBM_POWER relevantnosť managed system. Nebude existovať druhá compute/storage/partner tabuľka. Pre `''` a neznámy typ vracia všetky príznaky false; submit samostatne overí členstvo typu v `PROVIDER_TYPES` pred zúžením na `ProviderType`. Typová bezpečnosť tak nezávisí iba od dnešného castu `as ProviderType`.

Polia možno vyjadriť napríklad `Pick<ProviderSubmitData, 'vmPrefix' | 'vmTags' | 'backingStorageProviderIds' | 'partnerProviderId' | 'managedSystem'>` a z jeho kľúčov odvodiť úplný boolean record. Ide o náčrt kontraktu, nie požiadavku na novú všeobecnú knižnicu. Spoločné polia, JSX, preklady, trimovanie a samotné validátory zostávajú na dnešných miestach. Konfigurácia rozhoduje **či** sa pravidlo použije; neobsahuje callbacky ani schémy.

### 2. Formulár a tagy

V tom istom spoločnom JSX podmieňovať všetkých päť špecifických polí výsledkom resolvera. Backing/partner kandidátov naďalej vyberať existujúcou kategorizáciou v modale. Spoločné polia zobrazovať bez novej konfiguračnej vrstvy.

VM tagy zmeniť na existujúci `MultiSelect` s `value={data.vmTags}` a `onTagsChange`. Možnosti sú unikátne zjednotenie načítaných a všetkých uložených/zvolených tagov. Chýbajúca možnosť, loading alebo chyba lookupu nesmie zmeniť stav. Ponechať query iba pre edit VMware, vypnutý vstup pri create a existujúci loading/error/retry. Nemení sa shared MultiSelect ani discovery hook. Existujúce testy single Select treba cielene nahradiť testami pridania/odobratia viacerých hodnôt, nie odstrániť bez náhrady.

`managedSystem` pridať ako nepovinný string do form data a EMPTY_FORM, inicializovať z providera a zahrnúť do dirty porovnania. Zobraziť iba IBM_POWER. Pridať lokálne form label/helper preklady EN/SK: vysvetliť SystemName a prípad viacerých systémov; bez nového HMC requestu. Nepridávať formátovú alebo required validáciu, na ktorú FE nemá podklady.

### 3. Zmena typu počas vytvárania

V existujúcom `handleChange('type', ...)` použiť konfiguráciu cieľového typu, nie ďalšie typové podmienky. Čistiť iba create draft; edit ID/typ zostávajú zamknuté.

| Prechod | Výsledok |
| --- | --- |
| VMWARE ↔ IBM_POWER | Backing IDs zostanú; pri odchode z VMWARE vyčistiť prefix/tagy, pri odchode z IBM_POWER managedSystem. |
| Compute → FLASHCOPY/HITACHI/prázdny typ | Backing IDs vyčistiť; všetky ostatné nerelevantné špecifické hodnoty tiež. |
| FLASHCOPY → iný typ → FLASHCOPY | Partner sa neobnoví; reset pri každej skutočnej zmene typu zostáva zachovaný. |
| IBM_POWER → iný typ → IBM_POWER | Managed system sa neobnoví. |
| VMWARE → iný typ → VMWARE | Prefix/tagy sa neobnovia. |

Spoločné hodnoty nemení prechod typu. Vyčistiť aj chyby polí, ktoré prestali byť relevantné, a submit error. Zachovať dnes existujúce pravidlo pre backing storage medzi compute typmi a žiadne automatické vytváranie obrátených partner vzťahov.

### 4. Typovo relevantná validácia

Spoločné validácie ponechať vrátane povinného description/IP/role. Partner self-check spustiť iba ak konfigurácia povoľuje partnera. Nevyžadovať neviditeľné polia; nevalidovať skryté legacy hodnoty ako nové používateľské vstupy. VMware filtre a managedSystem zostávajú nepovinné. Nepridávať kontrolu členstva uložených tagov/relationships v aktuálne dostupnom zozname, ktorá by zablokovala edit pri neúplných možnostiach.

### 5. Payload: rozlíšiť create a edit

Zostavenie ostáva explicitne v `handleSubmit()` s typom `ProviderSubmitData`. Nie je potrebný nový mapper/service ani presun form data do ďalšieho modelu. Konfigurácia musí riadiť payload nezávisle od viditeľnosti UI: aj umelo vložené nerelevantné draft hodnoty nesmú uniknúť pri create.

- **Create:** posielať iba relevantné špecifické hodnoty. VMWARE: prefix string/null, celé tags, backing IDs; IBM_POWER: backing IDs a managedSystem string/null; FLASHCOPY: partner string/null; HITACHI: žiadna aktívna špecifická hodnota. Zachovať dnešný neutrálny `partnerProviderId: null` mimo FLASHCOPY, vynechané backing IDs mimo compute a dnešné spoločné trim/null/omit konvencie. Nevkladať `vmTags: []` či `vmPrefix: null` ostatným typom len kvôli prázdnemu stavu formulára.
- **Edit, nezmenené špecifické pole:** explicitne prevziať jeho pôvodnú API hodnotu vrátane null, celého poľa a rozlíšenia neprítomného kľúča; nič nepridávať len preto, že inicializácia nahradila undefined prázdnou hodnotou. Stačí porovnanie s `initialForm`, nie nový dirty/touched framework. Toto platí aj pre skryté legacy polia, napr. vmTags na HITACHI. Ich zachovanie nie je povolenie zadávať nové hodnoty pre nesprávny typ.
- **Edit, používateľ zmenil relevantné pole:** použiť nové form hodnoty; explicitné vyčistenie stringového poľa poslať ako null a zoznamu ako `[]`. Managed system pri IBM_POWER načítať, zachovať alebo explicitne vyčistiť týmto spôsobom.
- **Edit, skryté pole:** vziať len pôvodnú hodnotu z `provider`, nikdy potenciálnu novú hodnotu z draftu. Nevykonávať automatické čistenie uložených legacy dát. Nevychádzať zo spreadu celého read objektu, aby neunikol `credentialStatus` alebo iné read-only polia.

Explicitné zachovanie pôvodných skrytých špecifických polí je zdôvodnená ochrana pred stratou dát pri upserte. Aj skryté legacy backing/partner hodnoty sa zachovajú bez zmeny; nemenia sa pravidlá výberu ani topology helpers. Ak ich backend odmietne, použiť existujúcu chybu a nezatvoriť modal; neopravovať ich potichu. OpenAPI nepreukazuje, či vynechaný kľúč pri upserte zostáva alebo sa resetuje, preto zachovanie nesmie závisieť od domnienky o PATCH sémantike.

## Súbory implementácie

Základná cesta `src/features/providers-connectors/providers/`:

| Súbor | Úprava |
| --- | --- |
| `model/providerFieldConfig.ts` (nový) | Jediný resolver relevantnosti piatich polí. |
| `model/providerFieldConfig.test.ts` (nový) | Matica štyroch typov a prázdny/neznámy typ. |
| `components/ProviderCreateForm.tsx` | Konfiguračné podmienky, MultiSelect tagov, managedSystem a jeho form typ. |
| `components/ProvidersCreateModal.tsx` | Inicializácia, dirty kontrola, prechody, gated validácia a explicitný create/edit payload. |
| `components/ProviderCreateForm.test.tsx` | Matica UI a viac tagov, missing options, disabled/error/retry. |
| `components/ProvidersCreateModal.test.tsx` | Reálne JSON payloady, prechody a edit preservation, regresie. |
| `model/providersWire.test.tsx` | Round-trip managedSystem/tagov cez existujúci selector a submit hook. |

Navyše `src/locales/en.json` a `src/locales/sk.json` pre managed system a texty MultiSelect. `providerTypes.ts`, `providerCategory.ts`, `selectProviders.ts`, relationships helpers, generated a OpenAPI sa podľa súčasného zistenia meniť nemusia. Ich existujúce testy sú regresná kontrola, nie dôvod na refaktoring. Ak integrácia odhalí ďalšie fixtures, upraviť iba tie, ktoré vyžaduje nové form pole, a uviesť ich v konkrétnej úlohe.

## Riziká a ošetrenie

| Riziko | Ošetrenie |
| --- | --- |
| Globálny filter payloadu vymaže edit dáta | Oddelený create/edit režim a explicitné zachovanie pôvodných špecifických hodnôt vrátane skrytých legacy polí; testovať JSON, nie iba form state. |
| Stará hodnota unikne po zmene typu | Reset draftu podľa cieľovej konfigurácie aj nezávislé gating payloadu; testovať návrat na pôvodný typ. |
| Tagy sa zredukujú alebo zmiznú pri lookup chybe | MultiSelect + všetky uložené možnosti; žiadna synchronizácia selection zo sieťovej odpovede. |
| Neúmyselná zmena relationships | Zachovať klasifikátor, kandidátov, compute↔compute retention, null/[] konvencie explicitného vyčistenia a existujúce testy. |
| Príliš silná validácia managedSystem | Nepovinný vstup + vysvetlenie; podmienenú required validáciu riešiť až s dostupnými HMC údajmi. |
| Sprísnenie/uvoľnenie spoločnej validácie | Description/IP/role a email/interval testy musia zostať; odchýlky dokumentácie iba evidovať. |
| Očakávanie nového discovery správania | FE iba ukladá konfiguráciu; backendové použitie VMware filtrov mimo rozsahu. |
| Neznáma sémantika upsertu/legacy rejection | Neopierať preservation o vynechanie kľúčov; zachovať chybu a draft, backendové čistenie je samostatné rozhodnutie. |

## Testovacia stratégia a akceptácia

Konkrétne príkazy, závislosti a checkpointy sú v TODO. Testovať štyri typy plus prázdny výber, create payload aj edit round-trip, prechody typov, viac tagov a explicitné clear operácie. Overovať skutočný JSON odoslaný cez mock fetch aj nezmenenú invalidáciu query; mock test nepreukazuje backendové ukladanie.

Akceptačné kritériá:

- [ ] Päť špecifických polí má jednu centrálnu definíciu relevantnosti; UI, validácia, prechod typu a payload ju používajú bez druhej typovej matice.
- [ ] Jeden existujúci formulár/modal a API hook obsluhujú všetky štyri typy; žiadne nové schémy alebo zmeny generated/API.
- [ ] Nový create payload neobsahuje aktívne hodnoty nesprávneho typu ani po prechode; compute backing správanie zostáva rovnaké.
- [ ] Edit zachová všetky pôvodné nezmenené špecifické údaje vrátane viacerých tagov, managedSystem a skrytých legacy hodnôt; explicitný clear funguje cez null/[] podľa typu.
- [ ] Tagy podporujú viac hodnôt a chýbajúce uložené možnosti; lookup chyby/retry, create disabled, credentials a unsaved guard fungujú ďalej.
- [ ] Spoločné validácie, ID/type lock, backend error detail a úspešné zatvorenie zostávajú; žiadne nové podmienené required pravidlo bez podkladov.
- [ ] Zmeny sú overené iba zasiahnutými testami, focused lintom a potrebnou typovou kontrolou, následne atomicky commitnuté bez cudzej práce.

Odporúčanie na schválenie: zahrnúť MultiSelect tagov a nepovinný managedSystem; zachovať spoločné validačné pravidlá; zachovať legacy edit údaje bez automatickej migrácie. Uvoľnenie description/IP/role, runtime HMC validácia a backendové využitie VMware filtrov zostávajú samostatnými rozhodnutiami.

## Vlastné review plánu

- Matica porovnaná s lokálnym HTML aj Provider/ProviderRecord/SubmitProviderBody; všetkých päť polí je podporovaných, bez potreby úprav kontraktu.
- Overené, že selector managedSystem už zachováva a tagy sa dnes bez interakcie nestrácajú; plán neopravuje neexistujúcu stratu pri každom save.
- Oddelené neutrálne hodnoty nového payloadu od preservation starých dát; skrytie poľa neznamená jeho vymazanie v editácii.
- Zachované compute/partner klasifikácie a prechody; pre relevantnosť nie je navrhnutý druhý zoznam kategórií.
- TODO sleduje poradie config → ochrana edit/payload → UI → managed system → regresie; úlohy majú najviac päť súborov a konkrétne overenie.
- Súhlas používateľa s implementáciou zatiaľ nebol udelený. Táto kontrola nepredstavuje implementáciu ani overenie budúceho správania backendu.

### Vykonané overenie pri plánovaní

`npm.cmd exec vitest run src/features/providers-connectors/providers/components/ProviderCreateForm.test.tsx src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx src/features/providers-connectors/providers/model/providersWire.test.tsx src/features/providers-connectors/providers/model/providerCategory.test.ts src/features/providers-connectors/providers/model/providerTypes.test.ts` — 5 súborov, 67 testov prešlo. Ide o baseline existujúceho kódu, nie testy navrhovanej implementácie. PowerShell blokoval `npm.ps1`, preto sa použil štandardný Windows launcher `npm.cmd`, bez zmeny execution policy.

Kompletná test suite, produkčný build ani plný typecheck neboli pre túto dokumentačnú zmenu spustené. Dokumenty sa navyše kontrolujú obsahovými assertions, kontrolou lokálnych odkazov a `git diff --cached --check` pred commitom.
