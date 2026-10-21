# Úlohy: IBM Power Manual WWPN Entry

Dátum: 2026-10-21. Stav: implementované a overené inline, 2026-10-21. Kontext a návrh: [plan.md](plan.md).
Používateľ schválil prepísanie plánu a následne vykonanie inline; W1–W5 sú dokončené. Pôvodné Recovery Group T1–T10 sa tým neoznačujú za dokončené.

## W1: Preklady manuálneho režimu

**Popis a konkrétne zmeny:** Doplniť rovnaké ploché kľúče do troch locales: recoveryAppPolicies.form.manualWwpnEntry, recoveryAppPolicies.form.manualFrequencyInfo, recoveryAppPolicies.validation.manualModesExclusive, orchestratorPush.manualOnlyTitle, orchestratorPush.manualOnlyPushed, orchestratorPush.manualOnlyInstructions, orchestratorPush.backendNotes. Existujúce názvy sekcií a View in Airflow opätovne použiť. manualOnlyTitle/instructions budú neutrálne, aby sa dali použiť aj pri skipped; manualOnlyPushed iba pre pushed.

**Akceptácia:**
- [x] Všetky tri jazyky majú sedem zhodných nových kľúčov, bez duplicitných JSON kľúčov a neúmyselných zmien ostatných textov.
- [x] Frequency text vysvetľuje IBM Power manuálny režim aj zachovanú VMware frekvenciu podľa presného slovenského znenia v pláne.
- [x] Push text odlišuje odoslanie od spustenia a uvádza poradie Unpause a potom Trigger; konflikt má zrozumiteľnú validačnú správu.

**Overenie:**
- [x] JSON parse príkaz nižšie prejde; skontrolovať diff kvôli duplicitám a rovnakým siedmim kľúčom/parametrom v en/sk/cs.
- [x] git diff --check prejde; implementačný commit obsahuje iba overený rozsah W1.

```powershell
node -e "const fs=require('node:fs'); for(const l of ['en','sk','cs']) JSON.parse(fs.readFileSync('src/locales/'+l+'.json','utf8')); console.log('Locales JSON OK')"
```

**Závislosti:** schválenie implementácie. **Rozsah:** M, 3 súbory.
**Súbory:** src/locales/en.json, src/locales/sk.json, src/locales/cs.json.

## W2: Funkčný Manual WWPN Entry v Create/Edit Policy

**Popis a konkrétne zmeny:** Rozšíriť form typ, EMPTY_FORM generated defaultom, toFormData a common submit mapper. Zobraziť nový bordered checkbox vedľa manual_zoning v existujúcej IBM Power sekcii. V handleChange urobiť atomické automatické prepínanie; vo validate blokovať true/true a zobraziť preklad chyby. Nezavádzať nový stav, effect, helper vrstvu ani generovaný validátor. Aktualizovať existujúce exact payload očakávania a fixtures v rovnakom focused test súbore.

**Akceptácia:**
- [x] Create má false; edit načíta true a nezmenené uloženie i úprava iného poľa zachovajú true. Payload vždy obsahuje manual_wwpn_entry ako boolean v latest/time_range/exact_time; starší response bez poľa sa cez existujúcu generated schému zmení na false.
- [x] Oba checkboxy zostávajú viditeľné a použiteľné: zapnutie jedného vypne druhý jednou aktualizáciou, vypnutie umožní false/false. Konfliktný API record nevyvolá request pri uložení, zobrazí chybu a po vedomej oprave sa dá uložiť.
- [x] Zachované existujúce polia a validácie, immutable ID pri edit, pending správanie, dirty/discard guard a reset draftu pri reopen. Žiadna zmena Edit Policy Set ani obmedzení VMware.

**Overenie:**
- [x] Najprv testy reprodukujú chýbajúci flag/prepínanie; potom celý dotknutý test súbor prejde vrátane pôvodných snapshot/IBM Power regresií.
- [x] Testy overujú reálny request body, oba smery prepínania, false/false, konflikt bez requestu a edit round-trip; nestačí mock onChange.
- [x] Focused ESLint štyroch uvedených TS/TSX a git diff --check prejdú; po overení atomický implementačný commit.

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPolicyModal.test.tsx
```

**Závislosti:** W1. **Rozsah:** M, 4 súbory.
**Súbory:**
- src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPolicyForm.tsx
- src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPolicyModal.tsx
- src/features/recovery-plans/recovery-policies/application-recovery/model/recoveryAppPolicySubmit.ts
- src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPolicyModal.test.tsx

## Checkpoint A: Policy dátový tok

- [x] W1–W2 majú nenulové focused výsledky a zachovávajú true pri editácii; žiadny request neobsahuje true/true.
- [x] Layout checkboxov zodpovedá existujúcemu formuláru; oba viditeľné aj bez kontextu konkrétnej platformy.
- [x] Generated/OpenAPI/Policy Set produkčné súbory zostali nedotknuté. Zistený nesúlad vyriešiť pred ďalšou úlohou.

## W3: Informácia o ignorovanej frekvencii

**Popis a konkrétne zmeny:** Vložiť nenápadný lokalizovaný text hneď pod Frequency/Retention grid a pred Snapshot selection. Podmienka je priamo data.manual_zoning || data.manual_wwpn_entry. Nepridávať sekciu, modal ani nový stav. Doplniť testy do existujúceho modal test súboru.

**Akceptácia:**
- [x] Text je na požadovanom mieste pri zoning-only aj WWPN-only, pri false/false chýba; testuje sa create, edit a živé prepínanie.
- [x] Frequency aj unit zostávajú viditeľné a editovateľné, ich hodnota sa po prepínaní a odoslaní zachová; VMware platnosť je výslovne uvedená v texte.
- [x] Nenápadná typografia a existujúce tokeny, bez výrazného warningu alebo novej sekcie; test poradia DOM medzi Frequency/Retention a Snapshot selection.

**Overenie:**
- [x] Focused test príkaz W2 prejde, vrátane payload assertions frekvencie v oboch manuálnych režimoch.
- [x] Focused ESLint týchto dvoch súborov a git diff --check prejdú; po overení atomický implementačný commit.
- [x] Browser kontrola umiestnenia, čitateľnosti a editable frekvencie je zahrnutá vo W5.

**Závislosti:** W2. **Rozsah:** S, 2 súbory.
**Súbory:**
- src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPolicyForm.tsx
- src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPolicyModal.test.tsx

## W4: Manual-only výsledok v spoločnom Push modale

**Popis a konkrétne zmeny:** V OrchestratorPushResultDialog vložiť cez existujúci children slot preložený informačný blok pre schedule=manual_only. Pri pushed vysvetliť úspešné odoslanie bez spustenia a kroky Unpause→Trigger. Notes zobraziť ako označený escaped plain text podľa pravidiel plánu; zachovať originálny response viewer. Nové `manual_only` testy písať len pre `entityType=application`; existujúce Group regresie ponechať bez rozširovania.

**Akceptácia:**
- [x] `manual_only` ukáže vysvetlenie pre Application; pushed zostáva úspešný push, skipped sa nevydáva za úspešný. Bez/null/iný schedule nemení pôvodný layout ani výsledok. Existujúce Group pushed/skipped/link správanie sa nemení.
- [x] null/undefined/prázdne notes nezrušia hlavnú FE inštrukciu; textové poznámky sa trimujú/deduplikujú, markup ostane textom, dlhý text sa zalomí. Celý pôvodný response zostáva viditeľný vo vieweri.
- [x] Zachovaný spoločný komponent, počty kontrol, Close, View in Airflow s provider URL a pravidlom dag_id. Nevznikne request na Trigger ani nový modal/API.

**Overenie:**
- [x] Oba focused súbory prejdú vrátane pôvodných pushed/skipped/missing/DAG/link testov; nové schedule/notes varianty testovať iba pre Application.
- [x] Focused ESLint uvedených troch TSX a git diff --check prejdú; po overení atomický implementačný commit.

```powershell
node node_modules/vitest/vitest.mjs run src/shared/components/modal/OrchestratorPushResultDialog.test.tsx src/shared/components/modal/OrchestratorPushResultDialog.response.test.tsx
```

**Závislosti:** W1. **Rozsah:** M, 3 súbory.
**Súbory:**
- src/shared/components/modal/OrchestratorPushResultDialog.tsx
- src/shared/components/modal/OrchestratorPushResultDialog.test.tsx
- src/shared/components/modal/OrchestratorPushResultDialog.response.test.tsx

## Checkpoint B: Oba funkčné toky

- [x] W2–W4 focused regresie prešli; frekvencia sa nemení a konflikt sa neodosiela.
- [x] Úspešný push s manual_only vysvetľuje ďalšie kroky bez tvrdenia o spustenom recovery; pôvodné odpovede ostávajú kompatibilné.
- [x] Zmeny nevyžadovali ChecklistResultDialog, backend ani generated úpravy. Ak sa ukáže potreba rozšírenia rozsahu, zaznamenať dôvod pred ďalšou úpravou.

## W5: Integračná a browser regresia

**Popis a konkrétne zmeny:** Rozšíriť iba dva Recovery Application Builder/Editor page testy o `manual_only` so schedule a notes odovzdanými do spoločného modalu. Existujúce Group Builder/Editor a PolicySetModal testy iba spustiť ako regresie, bez nových `manual_only` scenárov alebo úprav výberu policy. Produkčné stránky ani Policy Set nemení táto úloha. Browser výsledky zaznamenať pri realizácii, bez nového harnessu, ak postačujú existujúce nástroje.

**Akceptácia:**
- [x] Create/Edit Application zobrazia spoločný modal so správnym `manual_only` vysvetlením a Airflow linkom; Create/Edit Group si zachovajú pôvodný push výsledok, link a navigáciu bez nového `manual_only` scenára.
- [x] Policy Set zostáva bez zmien a bez nových výberových obmedzení; iba spustiť existujúce regresné testy. Zachovať pôvodné policy validácie, snapshot režimy a frequency payload.
- [x] Vykonané browser scenáre majú zaznamenaný výsledok a stub/live rozlíšenie; neoverené body sú výslovne limity. Nie je vykonaný reálny recovery run ani nový trigger request.

**Overenie:**
- [x] Nasledujúcich päť focused test súborov prejde: dva rozšírené Application testy a tri nezmenené regresné súbory (dva Group, jeden Policy Set); výstup potvrdzuje ich vykonanie a nenulový počet testov.
- [x] Záverečná regresia použije aj tri existujúce test súbory z W2 a W4 (celkom osem), focused ESLint iba zmenených TS/TSX, JSON kontrolu W1 a git diff --check.
- [x] Browser: create false; WWPN on/off a zoning prepínanie klávesnicou aj myšou; edit true/save/reopen; informácia pod Frequency a jej skrytie; mobilný layout, obe témy; stub push `manual_only` pre Application, pôvodný push bez `manual_only` pre Group.

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.test.tsx src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.test.tsx src/features/recovery-plans/policy-sets/components/PolicySetModal.test.tsx
```

**Závislosti:** W2, W3, W4; checkpointy A a B. **Rozsah:** M, 2 upravované test súbory + 3 nezmenené na regresné spustenie.
**Upravované súbory:** RecoveryApplicationBuilderPage.test.tsx a RecoveryApplicationEditorPage.test.tsx (presné cesty vyššie). Group Builder/Editor a PolicySetModal testy sa iba spustia; tasks/todo.md slúži na evidenciu výsledkov.

## Checkpoint C: Odovzdanie implementácie

- [x] Všetky akceptačné kritériá W1–W5 splnené; obmedzenia zadania zachované.
- [x] Evidované presné overovacie príkazy, počty testov, exit codes, browser výsledky a implementačné commity.
- [x] Výslovne uvedené nevykonané kontroly: kompletná suite a produkčný build sa automaticky nespúšťajú; živý backend iba ak bol skutočne overený.
- [x] Finálny diff obsahuje iba schválené zmeny; cudzie zmeny zachované, bez automatického push/deploy.

## Stav plánovacieho výstupu

- [x] Používateľ povolil prepísanie existujúcich tasks/plan.md a tasks/todo.md.
- [x] Prečítané zadanie, aktuálny Git stav a relevantná implementácia vrátane shared modalu a generated kontraktu.
- [x] Každá úloha má súbory, konkrétne zmeny, najviac tri akceptačné body, overenie a závislosti; medzi fázami sú checkpointy.
- [x] Overená integrita dokumentov cez Node obsahovú kontrolu: 5 úloh, 3 checkpointy, 16 existujúcich zdrojových odkazov; exit 0. git diff --check prešiel. Zmenené iba dva plánovacie dokumenty; bez implementácie, commitu a pushu. Test suite ani build sa pri plánovaní nespúšťali.
- [x] Používateľ schválil implementáciu pokynom executing-plans inline. Implementácia bola vykonaná s focused overením a atomickými commitmi; bez pushu.

## Realizácia a dôkazy — 2026-10-21

Používateľ schválil realizáciu príkazom executing-plans inline. Pracovalo sa v existujúcom checkout na spike/ant-design-shell podľa tohto pokynu, bez subagentov. Pri štarte boli necommitnuté iba task dokumenty; ich existujúci obsah vrátane obmedzenia nových manual_only scenárov na Applications zostal základom realizácie.

### Výsledky úloh

- W1: sedem nových kľúčov v en/sk/cs, JSON a unikátnosť/nonempty kontrola prešli, exit 0. Commit a44ee7b6.
- W2: red 8 chýbajúcich WWPN scenárov; green 30/30 po doplnení aj dirty/discard/reopen regresie. Obsahuje create false, edit true, všetky snapshot režimy, explicitný payload, prepínanie oboma smermi, false/false, konflikt bez requestu a legacy default cez generated parse. Focused ESLint štyroch súborov prešiel, exit 0. Commit 731ccc53.
- W3: red 3 frequency scenáre; green 33/33 v celom policy súbore. Text má správne DOM poradie a zachováva editovateľnú frekvenciu aj payload. Focused lint dvoch súborov prešiel, exit 0. Commit 27bc3dbf.
- W4: red 6 chýbajúcich manual-only scenárov; green 17/17 v dvoch shared modal test súboroch. Notes absent/null/empty/trim/deduplikácia/markup/dlhý text, skipped neutralita a pôvodné schedule varianty sú pokryté. Focused lint zmenených súborov prešiel. Commit 139b8ebf.
- W5: prenos schedule/notes cez create/edit Application odpoveď, dynamický Airflow link a Close navigácia. Päť plánovaných integračných/regresných súborov je zahrnutých do záverečného behu nižšie. Group a PolicySet test súbory sa nemenili. Commit 0de5c040.
- Vizuálna kontrola zistila, že pri dlhých notes pôvodný autofocus na Copy odroloval úvod. Red focus test potvrdil problém. Informačný section má teraz tabIndex=0 a existujúci focus ring, takže ho zameria existujúci Modal bez úpravy jeho API alebo efektov. Po tejto oprave prešlo 67/67 v šiestich dotknutých shared/Application/Group test súboroch a focused lint, exit 0. Commit a7dc351c.

### Presné focused test príkazy

Pôvodný fork worker zostával bez výsledku aj mimo sandboxu. Jeden kontrolný shared test s thread workerom prešiel (5/5), preto sa používal iba CLI prepínač --pool=threads; konfigurácia projektu sa nemenila. Východiskový thread beh mal 8 súborov, 87/87 testov. Pri neskorších behoch rovnaké testovacie cesty ako v úlohách vyššie, s doplneným --pool=threads. Test runner použil nainštalovaný Vitest 4.1.11.

Záverečná regresia pred vizuálnou opravou focusu: **8 súborov, 110/110 testov, exit 0**:

```powershell
node node_modules/vitest/vitest.mjs run --pool=threads src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPolicyModal.test.tsx src/shared/components/modal/OrchestratorPushResultDialog.test.tsx src/shared/components/modal/OrchestratorPushResultDialog.response.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.test.tsx src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.test.tsx src/features/recovery-plans/policy-sets/components/PolicySetModal.test.tsx
```

Po oprave focusu bola zopakovaná iba dotknutá regresia: **6 súborov, 67/67 testov, exit 0**; policy 33 a Policy Set 10 testov sa nemenili:

```powershell
node node_modules/vitest/vitest.mjs run --pool=threads src/shared/components/modal/OrchestratorPushResultDialog.test.tsx src/shared/components/modal/OrchestratorPushResultDialog.response.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.test.tsx src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.test.tsx
```

Záverečný focused lint ôsmich skutočne zmenených súborov prešiel, exit 0:

```powershell
node node_modules/eslint/bin/eslint.js src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPolicyForm.tsx src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPolicyModal.tsx src/features/recovery-plans/recovery-policies/application-recovery/model/recoveryAppPolicySubmit.ts src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPolicyModal.test.tsx src/shared/components/modal/OrchestratorPushResultDialog.tsx src/shared/components/modal/OrchestratorPushResultDialog.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx --max-warnings 0
```

Po následnej oprave focusu znovu prešiel focused lint iba dvoch zmenených shared súborov:

```powershell
node node_modules/eslint/bin/eslint.js src/shared/components/modal/OrchestratorPushResultDialog.tsx src/shared/components/modal/OrchestratorPushResultDialog.test.tsx --max-warnings 0
git diff --check
```

JSON validácia z W1 bola zopakovaná aj na konci; Node kontrola navyše overila sedem nových kľúčov v každom jazyku ako neprázdne a uvedené práve raz. Bez zmien placeholders. Git hlási iba existujúce upozornenia na LF→CRLF a používateľský ignore súbor, nie chybu diffu.

### Browser QA a hranice výsledku

Samostatný headless Edge CDP 9352, Vite 5190, profil mimo workspace. Všetko lokálne API aj config boli stubované; žiadny živý BE alebo reálny recovery. Bežná aplikácia prešla create false, oba smery prepínania myšou aj Space, zobrazenie/skrytie a poradie frequency informácie, create payload true/false s frekvenciou 7, nezmenené edit uloženie a reopen s true. Desktop light 1440×1000 a mobile dark 390×844 vizuálne skontrolované.

Skutočný shared Push komponent bol renderovaný v dočasnom Vite QA entry s reálnymi Theme/Language providers. Overené Application manual_only, hláška o nespustenom DAG, Unpause→Trigger, escaped/deduplikované/dlhé notes, Airflow tlačidlo, obidve témy/šírky a pôvodný Group push bez schedule. Po oprave focusu browser explicitne potvrdil zameraný informačný blok a jeho hlavičku viditeľnú pod nadpisom modalu. Vizuálne skontrolované screenshoty.

Posledný runner: exit 0, **7 stubovaných requestov, bez runtime výnimiek a console errors, bez trigger requestu**. Application submit-to-modal flow je pokrytý page integračnými testmi; browser Push náhľad používa priamy vstup skutočného komponentu, nie plný Application wizard. Group create/edit a Policy Set sú nezmenené automatické regresie.

Dočasný runner a screenshoty sú v lokálnom TEMP adresári abco-wwpn-qa-8382c79252374f6386f5e613e0a2faee. Príkaz úspešného behu:

```powershell
node "$env:TEMP/abco-wwpn-qa-8382c79252374f6386f5e613e0a2faee/browser.mjs" "$env:TEMP/abco-wwpn-qa-8382c79252374f6386f5e613e0a2faee"
```

Na zopakovanie treba obnoviť izolovaný Vite/Edge a dočasný QA entry; runner nie je trvalý projektový test. Počiatočné pokusy s ručne interceptovaným HTML zlyhali na Vite preamble/importoch a HMR; vyriešené použitím Vite spracovaného entry a vypnutým HMR iba na QA serveri. Prvé studené načítanie po štarte čakalo na optimalizáciu závislostí; finálny beh prešiel na zahriatom serveri. Žiadna úprava produktu kvôli týmto testovacím problémom. Oba dočasné workspace súbory boli odstránené, vlastné Edge/Vite procesy ukončené.

### Kontrola rozsahu a odovzdanie

Inline review pre správnosť, jednoduchosť, architektúru, bezpečnosť a výkon: bez zostávajúceho nálezu v schválenom rozsahu. Žiadne nové runtime závislosti, suppressions, refaktoring, API requesty ani ručné generated úpravy. Produkčné Policy Set a Groups zostali nedotknuté. Oproti pôvodnému zoznamu netrebalo meniť OrchestratorPushResultDialog.response.test.tsx; bol iba spustený.

Kompletná test suite, full typecheck, production build, živý backend/Keycloak a produkčné E2E neboli spustené. Výsledok je na pôvodnej vetve s atomickými commitmi; bez pushu, merge alebo deploy. Tento záverečný task dokument je evidencia dokončenia, nie ďalšia implementačná úloha.
