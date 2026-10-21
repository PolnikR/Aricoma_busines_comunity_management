# Implementačný plán: IBM Power Manual WWPN Entry

Dátum: 2026-10-21. Stav: schválené a vykonané inline; dôkazy nižšie a v todo.md.
Úlohy a akceptácia: [todo.md](todo.md).

Používateľ výslovne schválil prepísanie pôvodného plánu a checklistu Recovery Group. Otvorené T1–T10 pôvodného plánu tým nie sú označené za dokončené; nie sú súčasťou tohto nového zadania. Dokončené opravy auditu A1–A11 sa znovu neimplementujú.

## 1. Cieľ a hranice

Doplniť manual_wwpn_entry do Create/Edit Recovery App Policy vrátane celého dátového toku, automatického prepínania s manual_zoning a informácie o ignorovanej frekvencii pre IBM Power. V existujúcom spoločnom Push Result modale vysvetliť režim manual_only a ďalšie kroky v Airflow.

Výhradne FE. Bez zmien backendu, Policy Set architektúry, Edit Policy Set obrazovky, výberových obmedzení pre VMware, nového trigger API, závislostí alebo nepotrebného refaktoringu. Generated súbory ani OpenAPI sa ručne nemenia. VMware naďalej používa nastavenú frekvenciu; policy zostáva použiteľná na oboch platformách. `manual_only` je nová BE funkcia IBM Power Recovery Applications, nie Recovery Groups. Group a Policy Set testy sa použijú iba na zachovanie doterajšieho správania.

Tento výstup mení iba tasks/plan.md a tasks/todo.md. Podľa zadania bez commitu, pushu a začatia implementácie. Po predložení plánu počkať na schválenie. Pri následnej implementácii dodržať projektové focused overovanie a atomické commity, ak používateľ neurčí inak.

## 2. Overený stav repozitára

Vetva: spike/ant-design-shell. Pri analýze boli git status --short, git diff --stat a git diff --cached --stat prázdne. Zadanie opisuje necommitnutý OpenAPI a sedem generated súborov, ale aktuálny worktree tieto zmeny nemá. Kontrakt je už na disku dostupný; plán nepredpokladá potrebu ďalšej regenerácie ani existenciu necommitnutého diffu. Git hlásil upozornenie na neprístupný používateľský ignore súbor; nič sa kvôli tomu nemenilo.

CodeGraph bol použitý pred vyhľadávaním kódu. Overené zdroje:

| Súbor / časť | Aktuálne správanie | Dôsledok |
| --- | --- | --- |
| src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPolicyForm.tsx | Vlastný typ RecoveryAppPolicyFormData obsahuje manual_zoning, ale nie manual_wwpn_entry. Frequency/Retention sú pred Snapshot selection. IBM Power recovery má stále viditeľný manual_zoning. | Rozšíriť existujúci typ a layout; nepridávať nový formulár. |
| Rovnaký adresár / RecoveryAppPolicyModal.tsx | EMPTY_FORM používa generated defaulty; toFormData explicitne mapuje API record; handleChange mení jedno pole. validate predchádza submitu; dirty porovnáva celý draft s initialForm. | Doplniť default, edit mapovanie, atomickú zmenu oboch flagov a validačný guard. |
| src/features/recovery-plans/recovery-policies/application-recovery/model/recoveryAppPolicySubmit.ts | toRecoveryAppPolicySubmitPayload explicitne skladá spoločné polia aj IBM Power údaje pre všetky snapshot režimy. | Flag musí byť vždy v common časti; jeho vynechanie by mohlo resetovať uloženú hodnotu. |
| src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPolicyModal.test.tsx | Reálne fetch stuby, exact payload očakávania; create/edit, tri snapshot režimy, IBM Power hodnoty a validácie. | Rozšíriť tieto testy a aktualizovať exact payloady; neoslabovať ich na partial len kvôli novému poľu. |
| src/shared/components/modal/OrchestratorPushResultDialog.tsx | Typ je OrchestratorPushOutput; úspech odvodzuje iba zo status=pushed. Spoločný pre Application a Group create/edit; zobrazuje response a dynamický DAG odkaz. | Vyhodnotiť schedule v tomto komponente, bez rozdelenia modalu. |
| src/shared/components/modal/ChecklistResultDialog.tsx | Má children slot, responseData a external action. | Informačný blok vložiť cez children; tento základný komponent sa nemusí meniť. |
| src/shared/components/modal/OrchestratorPushResultDialog.test.tsx a .response.test.tsx | Pokryté pushed, skipped, missing result, chýbajúci DAG a Airflow odkaz. | Zachovať tieto regresie, doplniť schedule/notes. |
| src/locales/en.json, sk.json, cs.json | Ploché prekladové kľúče; existujú recoveryAppPolicies.form.* a orchestratorPush.*. | Doplniť rovnaké nové kľúče vo všetkých troch jazykoch. |

Kontrakt na čítanie: openapi/abco-api.json a src/generated/query/zod/. manual_wwpn_entry má boolean default false v recoveryAppPolicy.gen.ts, recoveryAppPolicyRecord.gen.ts a submitRecoveryAppPolicyBody.gen.ts; existuje submitRecoveryAppPolicyBodyManualWwpnEntryDefault. OrchestratorPush má schedule?: string | null a notes?: string[] | null. Generated schémy v recoveryAppPoliciesResponse.gen.ts, recoveryAppSubmitResponse.gen.ts a recoveryGroupsResponse.gen.ts tiež obsahujú príslušné nové polia. Žiadny z týchto siedmich generated súborov nie je plánovaný na úpravu.

## 3. Návrh správania

### Policy draft, uloženie a vzájomná výlučnosť

- Do existujúceho RecoveryAppPolicyFormData pridať povinný boolean manual_wwpn_entry. EMPTY_FORM použije generated default false; toFormData načíta policy.manual_wwpn_entry bez straty true. Staršie odpovede bez poľa pokryť testom generated parse, ktorý doplní false; nevytvárať druhý systém defaultov.
- Checkbox vložiť do existujúcej IBM Power sekcie vedľa manual_zoning, v spoločnom responzívnom riadku. Target LPAR prefix a číselné polia zachovať. Na úzkej šírke sa checkboxy môžu zalomiť. Oba stále viditeľné a dostupné; druhý sa pri aktivovaní prvého neskryje ani nezakáže. Existujúce blokovanie celého formulára počas ukladania zostáva.
- handleChange v Modale vykoná jednu funkčnú aktualizáciu draftu: zapnutie manual_zoning nastaví manual_wwpn_entry=false a naopak. Vypnutie jedného nemení druhý. Stav false/false je platný. Nevytvárať synchronizačné effects alebo nový reducer.
- validate odmietne true/true pred mutate, s lokalizovanou chybou viditeľnou pri manuálnych voľbách. Ak API dodá konfliktný record, zachovať hodnoty pri načítaní a zablokovať uloženie, kým používateľ jednu nevypne; nevyberať potichu víťazný režim. Chybu odstrániť pri vyriešení konfliktu. Ide o preventívnu ochranu hranice submitu, hoci bežné klikanie konflikt nevytvorí.
- Mapper vždy odošle aktuálny boolean v common časti pre latest/time_range/exact_time. Žiadne odvodenie od platformy, vynechanie false ani reset frekvencie. Zachovať validácie, dirty guard, reset pri znovuotvorení a existujúce API mutation správanie.

### Informácia pod Frequency/Retention

Pri manual_zoning || manual_wwpn_entry zobraziť krátky text bez novej sekcie bezprostredne za gridom Frequency/Retention a pred Snapshot selection. Použiť existujúce textové tokeny a nenápadný informačný štýl.

Slovenské znenie: „Pri IBM Power Recovery Applications s manuálnym režimom sa nastavená frekvencia ignoruje. Recovery sa spúšťa manuálne v Airflow. Pre VMware zostáva frekvencia platná.“

Frequency zostáva viditeľné, editovateľné a validované; jeho hodnotu zachovať v payloade. false/false text skryje. Rovnaké správanie pri create aj edit.

### Push Result a bezpečné notes

- Podmienka informačného bloku je presne result?.schedule === 'manual_only'. Neodvodzovať režim od checkboxov, textu notes ani platformy.
- Pre status=pushed zobraziť lokalizované vysvetlenie: DAG bol úspešne odoslaný, zatiaľ sa nespustil; v Airflow vykonať najprv Unpause a potom Trigger. Zachovať success výsledok pushu, netvrdiť úspešný recovery run ani meniť počty vykonaných kontrol.
- Pri neštandardnom skipped + manual_only neoznamovať úspešné odoslanie; zachovať skipped a uviesť len neutrálny význam manuálneho režimu. Nevytvárať fikciu nasadeného DAG.
- Hlavná inštrukcia je vždy preklad FE, nezávislá od prítomnosti notes. Neprázdne notes trimovať, odstrániť prázdne a duplicitné položky a zobraziť ako doplnkové poznámky backendu obyčajným React textom. Bez HTML/Markdown vykonávania, automatických odkazov alebo pokusu prekladať ľubovoľné BE vety cez t(). Dlhý text zalamovať. null/undefined/[] nie sú chybou.
- Poznámky v hlavnom informačnom bloku zobrazovať iba pre manual_only; pri inom schedule zachovať doterajší layout. Celý pôvodný responseData vrátane notes zostáva v existujúcom response vieweri nezmenený.
- View in Airflow, dynamický provider URL a podmienka existujúceho dag_id zostávajú. Bez nového tlačidla Trigger alebo API requestu. Použiť children slot, neupravovať ChecklistResultDialog ani jeho ďalších používateľov.

## 4. Poradie a závislosti

1. W1: preklady a presné znenia.
2. W2: kompletný checkbox create/edit slice vrátane mapovania, automatického prepínania a blokovania konfliktu.
3. Checkpoint A: policy dátový tok a regresie.
4. W3: podmienená informácia o frekvencii.
5. W4: spoločný Push Result manual_only a bezpečné notes.
6. Checkpoint B: oba používateľské toky a zachovanie pôvodných režimov.
7. W5: integrácia Application create/edit, nezmenené regresie Groups a Policy Setu a browser overenie.

W2 závisí od W1; W3 od W2; W4 od W1; W5 od W2–W4. Odporúčané vykonanie je sekvenčné kvôli spoločným testom a prekladom. Každá úloha má najviac päť plánovaných súborov a vlastné overenie. Podrobný checklist je iba v todo.md, aby sa stav neduplikoval.

## 5. Kompletný plánovaný zoznam dotknutých súborov

Produkčný kód (4):
- src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPolicyForm.tsx
- src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPolicyModal.tsx
- src/features/recovery-plans/recovery-policies/application-recovery/model/recoveryAppPolicySubmit.ts
- src/shared/components/modal/OrchestratorPushResultDialog.tsx

Preklady (3): src/locales/en.json, src/locales/sk.json, src/locales/cs.json.

Existujúce testy plánované na doplnenie (5):
- src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPolicyModal.test.tsx
- src/shared/components/modal/OrchestratorPushResultDialog.test.tsx
- src/shared/components/modal/OrchestratorPushResultDialog.response.test.tsx
- src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.test.tsx
- src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx

Existujúce testy iba na regresné spustenie (bez plánovaných zmien a bez nového `manual_only` scenára):
- src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.test.tsx
- src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.test.tsx
- src/features/recovery-plans/policy-sets/components/PolicySetModal.test.tsx

Plánovacie dokumenty (2): tasks/plan.md a tasks/todo.md. Celkom 14 plánovaných zmenených súborov vrátane dokumentov; implementačný rozsah 12 existujúcich súborov. Tri nezmenené regresné test súbory sa do počtu upravovaných súborov nezapočítavajú. Nové súbory ani produkčné zmeny stránok Builder/Editor alebo Policy Set nie sú potrebné podľa aktuálnej analýzy. Ak integračný test odhalí stratu poľa mimo uvedeného rozsahu, najprv zdokumentovať konkrétny dôvod a upraviť plán.

## 6. Testovacia stratégia

Testovať používateľské správanie a skutočný request payload cez existujúci fetch stub, nie iba volanie onChange. Rozšíriť existing tests; zachovať plné payload assertions. Najprv reprodukcia chýbajúceho správania, potom implementácia a zelené focused testy. Nenulový počet testov a skutočné vykonanie požadovaných súborov overiť z výstupu.

Matica: nový false default; create true/false; edit true bez zmeny a po úprave iného poľa; starší record bez nového poľa; všetky tri snapshot modes; zoning→WWPN aj WWPN→zoning; false/false; konfliktný API record neodošle request; dirty/cancel/reopen reset; umiestnenie a podmienka frequency textu; zachovaná frekvencia v payloade. Push: nové `manual_only` a `notes` scenáre iba pre Recovery Applications (pushed/skipped, rôzne hodnoty schedule a notes, bezpečný text, Airflow odkaz). Prenos schedule/notes integračne overiť len na Application Builder/Editor stránkach. Pre Recovery Groups iba spustiť existujúce pushed/skipped/missing/link regresie spoločného modalu; Policy Set testy len regresne, bez nového scenára a bez zmien implementácie.

Konkrétne focused príkazy sú pri úlohách v todo.md. Pre zmenené TS/TSX spustiť node node_modules/eslint/bin/eslint.js <presne-zmenene-subory> --max-warnings 0 (placeholder pred použitím nahradiť cestami). JSON parse a kontrola nových kľúčov vo všetkých troch locales; git diff --check. Kompletnú suite, npm test, npm run build ani full typecheck automaticky nespúšťať. Build skript spúšťa aj celú suite, preto sa nehodí na túto lokálnu zmenu. Rozšírenie overenia iba pri konkrétnom dôvode alebo na pokyn.

Browser po implementácii: Create/Edit Recovery App Policy, oba smery prepínania myšou aj klávesnicou, uloženie a znovuotvorenie true, text medzi Frequency a Snapshot selection, mobilný layout a obe témy; push s `manual_only` stub odpoveďou len pre Recovery Application; pri Recovery Group iba existujúci push bez `manual_only` a pri Policy Set nezmenený výber. Bez spustenia reálneho recovery alebo triggerovania DAG. Stubované výsledky jasne odlíšiť od živého BE overenia; nedostupný browser alebo BE zaznamenať ako limit, nie pass.

## 7. Riziká a ochrany

| Riziko | Dopad | Ochrana |
| --- | --- | --- |
| Nové pole sa vynechá v edit payloade | Vysoký: reset uloženého true | Explicitné common mapovanie a test save bez zmeny. |
| Dve samostatné aktualizácie vytvoria konflikt | Vysoký: BE odmietne policy | Jedna funkčná aktualizácia oboch hodnôt a validate guard pred mutate. |
| API obsahuje true/true | Stredný | Zachovať načítaný stav, blokovať submit a umožniť vedomú opravu. |
| Push sa vydáva za vykonaný recovery | Vysoký | Oddeliť úspešné odoslanie od spustenia, vysvetliť Unpause→Trigger. |
| Notes sú anglické alebo obsahujú markup | Stredný | Lokalizované hlavné vysvetlenie; notes iba ako označený escaped doplnkový text. |
| Regresia Groups alebo starých odpovedí | Stredný | Nové `manual_only` testy len pre Applications; existujúce Group a Policy Set testy spustiť ako nezmenené regresie. |
| Frekvencia sa omylom vypne pre VMware | Vysoký | Bez zmeny frequency polí/payloadu a bez filtrovania Policy Setu. |
| Rozdiel medzi opisom diffu a worktree | Stredný | Pred implementáciou opäť skontrolovať Git; zachovať všetky vtedy prítomné cudzie zmeny. |

## 8. Otvorené rozhodnutia a schválenie

Nie je identifikovaná technická nejasnosť blokujúca návrh. Na schválenie sú navrhnuté znenia a tieto okrajové pravidlá: konfliktný API record sa nenormalizuje potichu; notes zostávajú doplnkovým BE textom iba v manual_only; pri skipped sa nikdy nehlási úspešný push. Ak používateľ požaduje iné správanie, upraviť plán pred implementáciou.

Schválenie prepísania dokumentov nie je schválenie implementácie. Po dokončení tohto plánu zastaviť a čakať na schválenie implementácie.

## 9. Realizácia — 2026-10-21

Používateľ schválil vykonanie inline. W1–W5 sú implementované; akceptácia a presné príkazy/výsledky sú v [todo.md](todo.md#realizácia-a-dôkazy--2026-10-21). Schválenie nahradilo predchádzajúci zákaz začatia implementácie a commitovania plánovacieho výstupu; push sa nevykonal.

Výsledok: WWPN default false, zachované edit true, explicitný payload pre všetky snapshot modes, atomická vzájomná výlučnosť a validačný guard. Frequency informácia je pod príslušným riadkom bez zmeny frekvencie. Shared Push modal vysvetľuje manual_only a bezpečne zobrazuje notes; informačný blok je pri otvorení zameraný, aby ho dlhé notes neodrolovali mimo výhľadu. Žiadne zmeny Policy Setu, Groups produkčného kódu ani generated/OpenAPI.

Overenie: 8 focused súborov / 110 testov; po oprave focusu znovu 6 dotknutých súborov / 67 testov. Focused lint, JSON/kľúče a diff check prešli. Izolovaný browser so stubmi: exit 0, 7 requestov, bez runtime výnimiek/console errors; vizuálne desktop light aj mobile dark. Kompletná suite/build/full typecheck a živé BE E2E sa nespúšťali. Dočasné QA entry boli odstránené, vlastné QA procesy ukončené. Dôkazy a limity v todo.md sú záväzné pre interpretáciu dokončených checkboxov.
