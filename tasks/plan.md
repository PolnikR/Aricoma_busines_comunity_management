# Implementačný plán: dizajn Recovery Group a opravy funkčného auditu

Dátum: 2026-10-20. Stav: plán implementácie; v tejto úlohe sa menia iba plánovacie dokumenty.
Checklist: [todo.md](todo.md). Predchádzajúci eligibility checklist mal všetky položky dokončené; jeho plán zostáva v Git histórii.

Rozšírenie 2026-10-21: používateľ schválil doplnenie opráv funkčného auditu do existujúcich dokumentov. Sekcie 1–7 a T1–T10 zostávajú pôvodným plánom dizajnu; ich obmedzenia vrátane vylúčenia Apps platia pre tento pôvodný blok. Sekcia 8 a A1–A11 povoľujú iba pomenované funkčné opravy aj v Apps, Runs a Providers. Pôvodné otvorené úlohy zostávajú zachované. Checklist oboch blokov je v todo.md.

## 1. Schválený výsledok a rozsah

Referenčný návrh: [HTML Groups](../prototypes/recovery-builders-technical/groups.html), [správanie prototypu](../prototypes/recovery-builders-technical/builder.js), [dizajnové poznámky](../prototypes/recovery-builders-technical/README.md).
Priamy náhľad: http://localhost:5173/prototypes/recovery-builders-technical/groups.html?step=related-storage

Zapracovať technický vizuálny štýl do celého Create/Edit Recovery Group: kompaktné kroky a formuláre, monospace identifikátory, tenké deliace čiary, menšie zaoblenia, odvodený súhrn konfigurácie. Existujúci aplikačný shell zostáva. Najvýraznejšia interakčná zmena je Related storage: predvyplnená tabuľka a Add volumes namiesto drag-and-drop zóny.

Záväzné upresnenia používateľa:
- Zachovať dizajnový systém aplikácie: používať existujúce komponenty Button, form controls, tabuľky, Modal a aplikačné tokeny farieb, typografie, zaoblení a stavov. Z HTML preniesť informačné rozloženie a schválené ovládanie, nie jeho samostatné CSS, fonty alebo pevné farebné hodnoty.
- Zachovať existujúcu doménovú funkcionalitu: rovnaké vstupy a používateľské voľby majú viesť k rovnakému potvrdenému výberu, validačnému výsledku a submit payloadu. Nový picker mení spôsob výberu, nie oprávnené volumes, pravidlá topológie alebo podmienky uloženia.
- Resources je funkčne správny: zachovať dostupné resources, drag-and-drop, odstránenie, filter a discovery scope. Checkboxová tabuľka v HTML nie je predpis na jeho náhradu.
- Related storage automaticky zahrnie volumes vybraných VM a dovolí pridať ďalšie z inventára storage providera cez vyhľadávanie a checkboxy.
- Recovery Apps ani tiers nie sú súčasťou tohto plánu.

HTML je vizuálna referencia, nie zdroj produkčných validátorov. Neprenášať fixture dáta, prepínač scenárov, voľnú navigáciu, značku prototype, lokálny Review JSON ani skrátenú VMware-only podporu. Zachovať skutočné Create/Save, Cancel, error/success modály a guard neuložených zmien. Bez zmien API, payloadov, generated súborov, rollback logiky alebo globálneho brandingu.

## 2. Overený súčasný kód

Cesty komponentov nižšie sú pod `src/features/recovery-plans/recovery-groups/`.

| Časť | Súčasný stav a dôsledok |
| --- | --- |
| `components/RecoveryGroupBuilder.tsx` | Vlastní draft, validačné brány, 7/8 krokov, read-only pravidlá a finálny submit. Zostane jediným vlastníkom potvrdeného výberu. |
| `hooks/useRecoveryGroupRelatedVolumes.ts` | Query pre každú VM cez `vdisksByVmQuery(vmName, vmProviderId)`. Deduplikuje názvy, ale nevracia mapu volume → VM; tú treba odvodiť z rovnakých výsledkov bez ďalších requestov. |
| `selectionDraft` v Builderi | Zlučuje `draftState.relatedVolumes` a objavené volumes bez duplicít. `discoveryExclusions` chráni ručné odstránenie v rámci rovnakého kontextu. Tieto pravidlá sa zachovajú. |
| Related storage v Builderi | Dnes používa `RecoveryGroupResourcesStep compact` s FlashSystem workloadom, add/remove/clear handlermi a `renderVolumeContent`. Nahradiť iba toto použitie. |
| `hooks/useRecoveryGroupResourceInventory.ts` | Existujúci zdroj inventára podľa workloadu/providera; pre picker použiť `ibm_flashsystem` a `relatedVolumeProviderId`. Neobmedzovať ponuku na VM discovery. |
| `RecoveryGroupResourcesStep.tsx` | Spoločný sidebar/selection pre Resources aj súčasný Related storage. Resources má zostať na tomto komponente. |
| Metro Mirror v Builderi | `reconcileMetroMirrorPrefill`, consistency override, auxiliary mappings, Existing/Managed a `storageValid`. Zachovať; vizuálna náhrada ich nesmie vynechať. |
| `src/shared/components/modal/Modal.tsx` | Existujúci modal s focus trapom, návratom focusu a Escape. Použiť pre picker; nevytvárať nový modal framework. |
| `src/shared/components/wizard-steps/WizardSteps.tsx` | Má disabled kroky a aria-current. Prípadný kompaktný variant bude opt-in; predvolený vzhľad ostatných wizardov nezmeniť. |

## 3. Návrh implementácie

### Related storage

Pridať feature komponent `RecoveryGroupRelatedStorageStep.tsx` a `RecoveryGroupVolumePickerModal.tsx`.

RelatedStorageStep dostane potvrdené názvy volumes, pôvod/VM väzby, stav discovery, readOnly a callbacky. Tabuľka má názov, pôvod (From VM / Manual / Saved selection), odstránenie a podľa topológie auxiliary mapping. Storage provider je spoločný kontext nad tabuľkou. Zachovať Clear selection, ak je dnes dostupné, vrátane exclusions; ide o odstránenie zaradenia, nie storage objektov.

Picker má vlastný dočasný výber a filter, ale nie druhú kópiu celého draftu:
1. Otvorenie načíta inventár aktuálneho storage providera existujúcim hookom; nový dočasný výber je prázdny.
2. Už zahrnuté položky sú označené a disabled; filtrovanie nemení pending výber. Zobraziť počet nových položiek.
3. Add selected vykoná jediný batch callback `onAddVolumes(names)`; Builder zlúči názvy jednou funkčnou aktualizáciou. Nevolať starý onAdd v slučke nad zastaraným draftState.
4. Cancel, Escape a zatvorenie zahodia pending výber. Focus sa vráti na Add volumes. Bez nového dirty stavu pri samotnom hľadaní alebo Cancel.
5. Pri zmene providera alebo readOnly stavu počas otvorenia picker zavrieť a zahodiť pending výber. Pri potvrdení znovu overiť aktuálny kontext a oprávnenie; deduplikovať voči aktuálnemu výberu.
6. Zachovať existujúcu politiku loading/error a práce s dostupnými dátami inventára; nepridávať nové doménové blokovanie iba pre zmenu UI. Zobraziť Retry; doterajší potvrdený výber nevymazať. Rozlíšiť empty inventory od no search matches. Pending položky z iného providera sa nikdy nepotvrdzujú.

Rozšíriť výsledok existujúceho discovery hooku o odvodenú mapu názov volume → mená vybraných VM. Bez API/DTO zmeny a bez per-volume requestov. Nepredstierať úspešné discovery pri loading/error ani nepoužívať čiastočnú mapu ako dôkaz neprítomnosti väzby.

Pôvod je prezentačná informácia. Po úspešnom discovery uprednostniť From VM, ak väzba existuje. Manual označuje vedomé pridanie v aktuálnej relácii; uložený názov bez známeho historického pôvodu je Saved selection. Ak treba evidovať ručné pridania, postačí feature-local množina názvov; nesmie byť druhým zdrojom potvrdeného výberu ani súčasťou payloadu. Zmena zdrojového kontextu musí rešpektovať existujúce reset pravidlá. Neodvodzovať ručný pôvod iba z neprítomnosti názvu v neúplnom discovery.

### Metro Mirror a editácia

- Local: automatické a ručné volumes bez auxiliary stĺpca; legacy local bez storage providera zachová dnešný povolený stav.
- Existing: zachovať consistency group pole, warning/mismatch/unresolved stavy a auxiliary input pre každý zahrnutý volume. Nový ručný volume musí prejsť rovnakým relationship prefillom a validáciou ako dnes.
- Managed: zachovať generované hodnoty read-only; nepovoliť ich manuálnu úpravu.
- Pushed group a Managed group so zostávajúcimi provisioned identifikátormi zostávajú read-only vrátane picker handlerov.
- Edit zachová ID, resource type a existujúce topologické zámky. Loading/error nesmie čistiť uložené výbery ani overrides. Nemať effect, ktorý prepisuje draft výsledkom discovery.
- Automatické volumes sa pri pending/error môžu líšiť podľa existujúceho odvodeného stavu; nezamieňať to za používateľské odstránenie. Zachovať blokovanie postupu a odložené prerezávanie auxiliary overrides po ustálení discovery.

### Vizuálny layout celého Group buildera

Desktop: navigácia približne 200 px, pružný editor, súhrn približne 280 px. O umiestnení súhrnu rozhoduje dostupná šírka buildera po odpočítaní globálneho sidebaru, nie iba šírka viewportu. Pri nedostatku miesta súhrn presunúť pod formulár; na mobile horizontálne kroky a jeden stĺpec polí. Resources a široké storage tabuľky nesmú byť stlačené nečitateľným pravým panelom.

Súhrn (`RecoveryGroupConfigurationSummary.tsx`) odvodzovať z aktuálneho draftu a už načítaných provider/policy dát: ID, názov, workload/resource type, počet resources/volumes, topológia, policy set, push. Nezavádzať query ani nový stav formulára. Dlhé ID zalamovať; chýbajúce údaje pomenovať; push nevydávať za úspešný recovery run.

Zachovať aplikačné tokeny a obe témy. Vizuálne hodnoty z HTML sú orientačné; menšie zaoblenia a hustotu voliť iba z existujúcich aplikačných variantov, bez zavádzania druhého dizajnového systému. Žiadne globálne prepisy form controls alebo radius. Opt-in kompaktný WizardSteps sa použije iba v Group builderi. Aktívny krok nie je dôkaz vykonanej obnovy. Päta má Back/Continue/Create alebo Save a Cancel; nezakrýva posledné pole ani validačnú chybu.

## 4. Poradie a závislosti

Podrobné úlohy a akceptácia sú v [todo.md](todo.md).

T1 discovery provenance + T2 lokalizácie → T3 picker → T4 tabuľka → T5 integrácia a Metro Mirror regresia → checkpoint A.
T6 opt-in kroky → T7 layout a súhrn → T8 detaily/type/provider → T9 topology/policy/orchestration → checkpoint B.
T10 focused regresia, vizuálna a klávesnicová kontrola → odovzdanie.

Vykonávať postupne; úlohy zdieľajú Builder a preklady. Každý krok má zanechať funkčný stav a samostatný overený commit. Najprv overiť rizikové správanie selection, až potom vizuálne úpravy. Bez automatického pushu alebo nasadenia.

## 5. Riziká a ochrany

| Riziko | Ochrana |
| --- | --- |
| Strata viacerých additions pri stale closure | Jeden batch callback a funkčná aktualizácia; test pridania viacerých volumes. |
| Zámena storage inventory a VM discovery | Picker používa inventory providera; predvyplnenie používa VM discovery. Test extra volume bez VM väzby. |
| Opätovné pridanie odobratého volume | Zachovať exclusions key aj clear; test refetchu v rovnakom kontexte. |
| Uložené položky nesprávne označené Manual | Saved selection + iba potvrdené VM väzby; netvrdiť historický pôvod. |
| Strata Metro Mirror override | Zachovať prefill, invalidácie a prerezávanie až po discoverySettled. |
| Zmena iných wizardov alebo Apps | Opt-in variant s default regresiou, žiadne zmeny Apps. |
| Veľký inventár a úzky editor | Použiť existujúce table/scroll vzory; nepridávať novú virtualizačnú knižnicu. Overiť realistický počet riadkov a dlhé názvy. |

## 6. Overenie

Pre každý krok sú presné focused príkazy v todo. Nové testové cesty sú plánované, nie dnes existujúce. Nové testy musia pokrývať používateľské správanie, nie iba snapshot tried.

Záverečná focused regresia okrem nových komponentov:

```powershell
npm.cmd exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.prefetch.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.integration.test.tsx src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupRelatedVolumes.test.tsx src/features/recovery-plans/recovery-groups/utils/reconcileMetroMirrorPrefill.test.ts src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.test.tsx src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.test.tsx
```

Spustiť ESLint iba na skutočne zmenené TS/TSX, validáciu JSON pre en/sk/cs a `git diff --check`. Kompletná suite, full typecheck ani production build sa nespúšťajú automaticky; iba pri konkrétnom dôvode súvisiacom so zmenou alebo na pokyn používateľa.

Browser matica: Create/Edit, VMware/IBM Power VM a FlashSystem volume-only, Local/Existing/Managed, pushed a partially rolled-back lock; light/dark; 320/768/1024/1440 px a nízky viewport. Overiť natívny focus trap a návrat focusu, Escape/Cancel, klávesnicu, no console errors, dlhé ID, provider/inventory/discovery chyby, retry, prázdny výber a filter. Resources drag-and-drop musí fungovať rovnako ako pred zmenou. DOM test nenahrádza vizuálnu kontrolu.

Regresné kritérium zachovania funkcionality: porovnať rovnaké scenáre pred/po zmene UI vrátane finálneho výberu a submit payloadu. Nepridávať nové required polia, validačné pravidlá, obmedzenia oprávnených resources alebo zmeny lifecycle. Nové informácie o pôvode a súhrn sú iba prezentačné. Odlišný doménový výsledok sa považuje za regresiu; prípadnú opravu preexistujúcej chyby riešiť samostatne.

## 7. Rozhodnutia a stav

Schválený dizajn je vstup; tento dokument ešte neznamená vykonanú implementáciu. Otvorená blokujúca produktová otázka nie je. Pri konkrétnom rozpore medzi prototypom a produkčnými lifecycle pravidlami má prednosť zachovanie existujúcej doménovej funkčnosti a vyššie uvedené výslovné upresnenia používateľa.

V tejto plánovacej úlohe overiť obsah dokumentov, vzájomné odkazy a `git diff --check`; implementačné testy sú budúce kroky a ich úspech sa teraz netvrdí.

## 8. Opravy funkčného auditu

### 8.1 Cieľ a rozsah

Vstup: audit `ABCO_FE_funkcny_audit_2026-10-20.md` pre commit `c597dcec` a následné overenie nálezov. Audit bol dodaný z Downloads; všetky požadované nápravy sú zapísané nižšie, aby realizácia nezávisela od dostupnosti externého súboru. Výsledkom majú byť opravené používateľské toky; testy sú akceptáciou opráv.

| Nález | Výsledok | Úloha |
| --- | --- | --- |
| F-04 | Úspešná zmena providera/credential obnoví závislé cache. | A1, A2 |
| F-01 | Riadkové Retry zopakuje príslušný latest-run request. | A3 |
| F-02 | Application sa nájde podľa názvu aj ID. | A4 |
| F-03 | Background chyba neskryje posledný inventár; označí jeho neaktuálnosť. | A5, A6 |
| Port | Infra formulár neponúka neukladané pole. | A7 |
| VM tagy | Zmena iného poľa neskráti uložený zoznam tagov. | A8 |
| R-01 | Nová entita aj nové otvorenie histórie začínajú na strane 1. | A9 |
| R-02 | Chýbajúci rollback report sa výslovne oznámi bez vymysleného výsledku. | A5, A10 |
| Dôkazy | Presné vykonané testy, výsledky a atomic commity pre každú opravu. | priebežne, A11 |

F-01 plánovať ako P2: horný Refresh poskytuje obchádzku. F-04 riešiť skoro pre správnosť dát, bez tvrdenia, že každý variant je preukázaný produkčný incident P1. R-01/R-02 majú podmienečné spúšťače; reprodukcia musí predchádzať náprave. R-02 nie je dôkaz neúspešného rollbacku.

Mimo tohto bloku: nové endpointy, zmena BE discovery cache, auth/Keycloak, plošný audit oprávnení, Dashboard, Identity & Access, topológia a auditné logy. To sú nepokryté oblasti auditu, nie potvrdené chyby. Plán nepredstavuje úplné produkčné funkčné schválenie.

### 8.2 Rozhodnutia o opravách

**F-04 — cielená success invalidácia.** Zachovať generated invalidácie vlastných zoznamov. Doplniť malú politiku pod `src/shared/query/` a zapojiť ju do QueryClient cez `MutationCache.onSuccess` v `src/app/providers.tsx`, iba pre presné generated mutation keys submit/delete infra providera, platform providera a credential. Nejde o globálny refetch all. Neprepísať lokálne callbacky formulárov a nezdvojiť existujúce vlastné invalidácie. Pri implementácii preveriť existujúce skipInvalidation call sites a zachovať ich výslovné správanie. Žiadne ručné generated úpravy ani zmena query-key kontraktu.

Infra provider: ID z premenných mutácie; invalidovať všetky jeho používané VMware search, Power, volumes, tags a VM→vdisks varianty. GET keys sa líšia od `['POST', '/vms/search', params?, body]`; matcher musí rešpektovať aj variant bez params a viac search bodies. Zahrnúť existujúce agregované varianty bez provider_id, keď môžu obsahovať dotknutého providera; explicitný iný provider sa neobnovuje. Po delete zrušiť/zneplatniť pending výsledky tak, aby nevzkriesili staré dáta, a slepo nerefetchnúť zmazaného providera pred obnovou zoznamu.

Credential: z cached infra/platform zoznamov pred invalidáciou odvodiť súvisiace provider ID a deduplikovať role/type varianty. Obnoviť provider zoznamy/statusy a inventár známych súvisiacich infra providerov. Pri neúplnej znalosti závislostí použiť zdokumentovaný fallback iba na potrebné rodiny cache; prázdny cached zoznam nie je dôkaz neprítomnosti závislosti. Platform mutácia obnoví svoj zoznam a konkrétne používané orchestration queries podľa platform provider ID; nezamieňať ho s infra ID. Závislosti potvrdiť call sites. Chybná mutácia neinvaliduje úspešnú cache. FE invalidácia nemení BE discovery TTL ani existujúcu explicitnú forced-refresh cestu.

**F-01:** oddeliť kolekčné Retry od row Retry. Hook poskytne refetch podľa stabilnej identity entity (typ, ID a provider/DAG kontext), tabuľka ju odovzdá z chybného riadka. Row Retry nerefetchuje iné úspešné riadky. Horný Refresh naďalej obnovuje kolekcie aj viditeľné latest runs. Zachovať loading/empty/cached-refresh-error stavy.

**F-02:** feature-local plochý search text/row adaptér obsahujúci iba ID a application.name; ponechať pôvodný záznam pre delete/edit/detail. Nerozširovať shared useTableState o nested-path jazyk ani bez požiadavky nepridávať description. Zachovať filtre a stránkovanie.

**F-03:** plný error placeholder iba bez dát. Pri data + error ponechať inventár a existujúci neblokujúci alert s Retry a jasným označením posledných známych údajov. Nikdy neukazovať cached dáta iného runu/target providera. Zachovať noRun, Power unsupported a target-error vetvy.

**Port:** odstrániť iba nefunkčný infrastructure provider input, port state, dirty porovnanie a validáciu. Port nepridávať do infra payloadu. Funkčný port Platform Providers a nimi používané spoločné preklady zostávajú.

**VM tagy:** initial form zachová celý uložený zoznam a submit ho odošle bez zmeny, kým používateľ výslovne nezmení tag selector. Pri explicitnom výbere/clear zachovať dnešnú jedno-tagovú semantiku; nevytvárať nový multiselect ani discovery API. Nahradiť test očakávajúci tichú legacy normalizáciu testom zachovania údajov a explicitnej zmeny.

**R-01:** reset na úplnú identitu `entityType + id + providerId + dagId` a na zatvorenie aj cez URL/back. Preferovať malý keyed obal history obsahu; úplný resetovací kľúč možno zostaviť v rodičovi, ktorý pozná entityType, alebo doplniť entityType do RecoveryRunHistoryEntity. Prvý dotaz novej entity musí mať page=1, nie starý offset nasledovaný reset effectom. Doplniť regresiu Application → Group so zhodným id, providerId aj dagId, aby test izoloval zmenu entityType. Ide o identitu lokálneho UI stavu; API query key netreba rozširovať o entityType, ak požiadavku jednoznačne určuje provider/DAG a stránkovanie. Zachovať detail, dynamický Airflow link a polling.

**R-02:** report je v schéme optional. Po úspešnom orchestrated delete bez reportu ukázať neutrálne varovanie: delete request uspel, detailný výsledok rollbacku nie je dostupný. Žiadny syntetický report, automatický rollback failed ani opakované deštruktívne delete. Local delete bez reportu zostáva bežným úspechom. ok/partial/failed/skipped reporty sa zobrazujú ďalej. Pred úpravou potvrdiť wire scenár stubom a zaznamenať limit overenia proti BE.

### 8.3 Poradie a vzťah k existujúcemu dizajnu

A1 → A2 → checkpoint C → A3 → A4 → checkpoint D → A5 → A6 → A7 → checkpoint E → A8 → A9 → A10 → checkpoint F → A11. Podrobná akceptácia a súbory sú v todo.

Blok A nečaká na T1–T10. Odporúčané je opraviť funkčné chyby pred pokračovaním dizajnu; T úlohy potom zachovajú opravené správanie. T2/A5 zdieľajú preklady, A7/A8 provider modal a A3/A9 Runs page: vykonať postupne. Žiadne súbežné úpravy rovnakých súborov v inej relácii. Každý krok má funkčný výsledok, focused overenie a samostatný commit. Bez automatického pushu/deploy.

### 8.4 Overenie a ochrany

Každá oprava začína focused reprodukciou na pôvodnom správaní a končí rovnakým zeleným testom vrátane negatívnych variantov. Cache testy používajú skutočné generated mutations, QueryClient a stub fetch; spy invalidateQueries sám nedokazuje obnovu dát. Zahrnúť čerstvú cache v staleTime, inactive queries a pending request.

A1–A2: aplikácia aj integračné testy vytvárajú QueryClient cez spoločnú factory `src/shared/query/createAppQueryClient.ts` (nový/plánovaný súbor), ktorá zapája rovnakú MutationCache success politiku aj štandardné query nastavenia. Každý test vytvorí novú izolovanú inštanciu a po teste ju vyčistí; nezdieľať aplikačný singleton. Prípadné testové overrides retry/časovania nesmú nahradiť MutationCache ani politiku invalidácie. Overiť invalidáciu a skutočný refetch aktívnej query vrátane nového requestu a aktualizovaných dát; pri neaktívnej query overiť invalidovaný stav a refetch po následnom pripojení observera/otvorení pohľadu. Test si nesmie ručne pripájať kópiu callbacku, ktorá by mohla zakryť chýbajúce zapojenie v aplikácii.

A7: regresia zahŕňa aj existujúci `ProviderCreateForm.test.tsx`; odstrániť port z jeho fixture a doplniť neprítomnosť infra Port inputu. Modal test ďalej dokazuje payload bez portu; PlatformProvidersModal test chráni funkčný platform port.

Evidovať presný príkaz, testové cesty, počet vykonaných súborov/testov, exit code a limity. Projekt má passWithNoTests=true: overiť existenciu a skutočné vykonanie očakávaných súborov. Nové testové cesty v todo sú plánované, nie dôkaz existujúceho pokrytia.

Riziká: príliš širokú invalidáciu obmedziť provider scope a testom nedotknutého providera; staré dáta označiť ako neaktuálne; tichú stratu tagov zachytiť testom payloadu s dvoma tagmi; chýbajúci report nikdy nevydávať za potvrdený úspech/neúspech rollbacku; A a T zmeny oddeliť commitmi.

Browser scenáre: row Retry po 503, search názvu odlišného od ID, data + background error + úspešný Retry, provider/credential edit a návrat do načítaného Resources, odstránenie infra portu a zachovanie tagov, URL zmena entity pri page=3, orchestrated delete bez reportu. Deštruktívne scenáre iba na stuboch alebo vyhradených testovacích dátach. Stub/live BE/Keycloak výsledky uviesť oddelene; bez live overenia netvrdiť produkčné E2E.

Spúšťať dotknuté testové súbory, focused lint a JSON kontroly. Full suite, full typecheck a production build iba pri zdokumentovanej potrebe alebo explicitnom pokyne. Pri tejto čisto plánovacej zmene vykonať iba kontrolu obsahu a `git diff --check`. Implementácia zostáva otvorená; plán sa odovzdáva na vecnú revíziu pred realizáciou.
