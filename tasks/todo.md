# Úlohy: Snapshot Policy FlashCopy copy rate

Plán: [plan.md](plan.md). Stav: T1–T5 dokončené v automaticky overiteľnom rozsahu; browser kontroly nedostupné a označené nižšie. Používateľ následne povolil atómové commity vlastných zmien; push zostáva mimo rozsahu.

## T1: Kompatibilita kontraktu a typované fixtures

**Popis:** Opraviť tri potvrdené typové chyby explicitným flashcopy_copy_rate: 0 a overiť staršie odpovede bez zmeny generated vrstvy.

**Akceptačné kritériá:**
- [x] Všetky tri typované fixtures obsahujú pole, bez assertions alebo suppressions obchádzajúcich typ.
- [x] Nový test mimo generated adresára overí default 0, zachovanie 50, hranice 0/150 a odmietnutie -1/151/10.5 v štyroch dodaných schémach (collection schema vo vnorenom zázname).
- [x] validatingMutator test GET /get_policies preukáže doplnenie 0 do legacy response a zachovanie nenulovej hodnoty; pôvodné assertions zachované.

**Overenie:**
- [x] `node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-policies/snapshot/model/snapshotPolicyContract.test.ts src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPolicyModal.test.tsx src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPoliciesTable.test.tsx src/shared/api/validatingMutator.test.ts`
- [x] `npm.cmd run typecheck` už nehlási tri baseline TS2741.

**Závislosti:** Existujúci BE/OpenAPI/Zod kontrakt.
**Súbory (4, medium):**
- src/features/recovery-plans/recovery-policies/snapshot/model/snapshotPolicyContract.test.ts (nový)
- src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPolicyModal.test.tsx
- src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPoliciesTable.test.tsx
- src/shared/api/validatingMutator.test.ts

## T2: Lokalizované texty FlashCopy nastavenia

**Popis:** Pripraviť label, help a jednu validačnú správu vo všetkých podporovaných jazykoch podľa troch kľúčov v pláne.

**Akceptačné kritériá:**
- [x] EN/SK/CS majú rovnaké nové kľúče; label používa termín FlashCopy copy rate.
- [x] Help vysvetľuje 0, background copy, storage kapacitu a Hitachi VSP; validácia požaduje celé číslo 0–150.
- [x] Existujúce preklady a plochá JSON štruktúra sú zachované.

**Overenie:**
- [x] JSON parse všetkých troch súborov a assertion prítomnosti/neprázdnosti troch nových kľúčov v každom jazyku.
- [x] `node node_modules/vitest/vitest.mjs run src/locales/policyCatalogTranslations.test.ts`
- [x] `git diff --check -- src/locales/en.json src/locales/sk.json src/locales/cs.json`

**Závislosti:** T1 (poradie práce, bez novej API závislosti).
**Súbory (3, medium):** src/locales/en.json, src/locales/sk.json, src/locales/cs.json.

## Checkpoint A: Kontrakt pripravený

- [x] T1–T2 overené; output typy a legacy default fungujú bez generated úprav.
- [x] Baseline TS2741 odstránené; prípadné nové cudzie chyby oddelené dôkazmi.
- [x] Diff iba v dohodnutom rozsahu, bez oslabených assertions.

## T3: Create/edit so zachovaním copy rate

**Popis:** Najprv doplniť regresné testy a zaznamenať RED, potom rozšíriť existujúci form/modal od inicializácie po request a overiť green.

**Akceptačné kritériá:**
- [x] Shared číselný input má min 0, max 150, step 1, label/help/chybu a pending disabled; nový default je '0', edit používa String(policy.flashcopy_copy_rate).
- [x] HTTP payload testy preukážu create 0, create 50, rename-only edit zachová 50, edit 50→100 a prijatie 0/150. Presnú existujúcu payload assertion rozšíriť o pole, neoslabiť ju na neurčitú čiastočnú kontrolu.
- [x] -1, 151, 10.5, empty/whitespace a nečíselný vstup sú odmietnuté pred mutation; chyba sa zobrazí a fetch/submit sa nespustí. Rešpektovať DOM sanitizáciu nečíselného textu; overiť opravu chyby po zmene vstupu.

**Overenie:**
- [x] RED/green: `node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPolicyModal.test.tsx`
- [ ] Browser kontrola create/edit, chyby a nápravy, Enter submit, pending disabled, discard guard a úzkeho viewportu. Nedostupný browser uviesť ako limit.

**Závislosti:** T1–T2.
**Súbory (3, medium):**
- src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPolicyForm.tsx
- src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPolicyModal.tsx
- src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPolicyModal.test.tsx

## T4: Copy rate v detaile a Policy Set pickeri

**Popis:** Najprv doplniť behavior testy, potom jeden DetailField a jeden snapshot fact. Hodnotu zobrazovať aj pri 0.

**Akceptačné kritériá:**
- [x] DetailOverview zobrazuje label a hodnotu 50 aj 0; stĺpce tabuľky ostávajú bez rozšírenia.
- [x] Picker zobrazuje hodnotu pri vyriešenej snapshot referencii; existujúce missing/loading/cached-error správanie funguje.
- [x] Bez zmien catalog typov, referenčných ID, keys, invalidácie alebo Recovery Group kontraktu.

**Overenie:**
- [x] RED/green: `node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPoliciesTable.test.tsx src/shared/components/policy-set-picker/PolicySetPicker.test.tsx`
- [ ] Browser kontrola detailu/picker facts pri 0/50, v úzkom viewporte a EN/SK/CS.

**Závislosti:** T3.
**Súbory (4, medium):**
- src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPoliciesTable.tsx
- src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPoliciesTable.test.tsx
- src/shared/components/policy-set-picker/PolicySetPickerDetails.tsx
- src/shared/components/policy-set-picker/PolicySetPicker.test.tsx

## Checkpoint B: Používateľské rezy fungujú

- [x] Create/edit/invalid input aj oba detaily overené, obzvlášť rename-only zachovanie 50.
- [x] Pôvodné testy/assertions funkčné; žiadny nový endpoint ani generated zmena.
- [x] UI zachováva existujúci form/modal/DetailOverview štýl.

## T5: Focused regresie a technické odovzdanie

**Popis:** Spustiť dotknuté regresie, typecheck a lint; reálne výsledky zapísať do dokumentov.

**Akceptačné kritériá:**
- [x] Snapshot Policies, Policy Sets, Policy Catalog, picker a response kompatibilita prejdú; typecheck/focused ESLint zelené alebo cudzí blocker presne oddelený.
- [x] Report obsahuje BE kontrakt, vlastné súbory, zachovanie hodnoty, validáciu, presné príkazy/počty/exit kódy a limity. Recovery Groups používajú existujúci Policy Set; bez automatickej regenerácie DAGu.
- [x] Finálny status/diff potvrdí zachovanie cudzej VMware/OpenAPI/generated práce a zákaz stage/commit/push/reset/stash/worktree/zmeny vetvy.

**Overenie:**
- [x] `node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-policies/snapshot src/features/recovery-plans/policy-sets src/features/recovery-plans/recovery-policies/catalog src/shared/components/policy-set-picker/PolicySetPicker.test.tsx src/shared/api/validatingMutator.test.ts src/locales/policyCatalogTranslations.test.ts`
- [x] `npm.cmd run typecheck`
- [x] `node node_modules/eslint/bin/eslint.js src/features/recovery-plans/recovery-policies/snapshot/model/snapshotPolicyContract.test.ts src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPolicyForm.tsx src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPolicyModal.tsx src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPolicyModal.test.tsx src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPoliciesTable.tsx src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPoliciesTable.test.tsx src/shared/components/policy-set-picker/PolicySetPickerDetails.tsx src/shared/components/policy-set-picker/PolicySetPicker.test.tsx src/shared/api/validatingMutator.test.ts --max-warnings 0`
- [x] JSON parse/key assertions z T2, `git diff --check`, whitespace/final-newline kontrola nového untracked testu (git diff ho bez stage nezahŕňa).
- [x] `git status --short` a review vlastného diffu; kompletnú suite ani production build nespúšťať, širší dopad najprv doložiť.

**Závislosti:** T1–T4.
**Súbory (2, small):** tasks/plan.md, tasks/todo.md. Ostatné súbory sa v T5 iba overujú; nové chyby najprv diagnostikovať.

## Evidencia plánovania

- [x] Zadanie, FE diff, BE commit, komponenty a testy preverené.
- [x] Predchádzajúci plán dokončený bez otvorených checkboxov; rozpracovaný plán neprepísaný.
- [x] Baseline Vitest: 19 passed, 0 failed, 4 súbory, exit 0.
- [x] Baseline npm.cmd run typecheck: exit 1, tri TS2741 na fixtures.
- [x] Každá úloha má kritériá, overenie, závislosti a najviac päť súborov; checkpointy po T2/T4.
- [x] Používateľ schválil vykonanie plánu pokynom executing-plans inline.

Kompletná suite, production build, ESLint, browser QA a živý backend sa počas plánovania nespúšťali. Implementačné výsledky doplniť až pri vykonaní úloh.

## Priebežné výsledky

- T1: focused štyri súbory 50 passed / 0 failed; typecheck exit 0.
- T2: JSON parse/key assertions PASS; translation test 1 passed / 0 failed.
- T3 RED: 14 failed / 3 passed; chýbajúci input a pole v requeste. Po implementácii opravené umiestnenie help mimo labelu shared Field, aby zostal stabilný accessible name. GREEN: 17 passed / 0 failed.
- T4 RED: 5 failed / 19 passed; chýbajúce facts a položka DetailOverview. GREEN: 24 passed / 0 failed.
- Typecheck po implementácii T3–T4: exit 0.
- Browser inventory vrátil apps: [], browsers: []; Chrome DevTools MCP nie je dostupný. Browser/vizuálne kontroly neboli vykonané a zostávajú limitom overenia.
- Pri kontrole diffu odhalená strata diakritiky pri prenose nových SK/CS textov cez PowerShell pipe do Node. Nové texty opravené cez apply_patch; existujúce preklady sa nemenili.

## Finálny technický report — 2026-10-22

### Kontrakt a výsledné správanie

BE commit ca93414 a dodaný OpenAPI/Zod kontrakt potvrdzujú integer 0–150 s defaultom 0 a optional request vstupom. Nová politika má vo formulári 0 a odošle číselnú hodnotu. Edit inicializuje pôvodnú hodnotu z parsovaného záznamu a vždy ju zahrnie do POST /submit_policy. Regresný test s pôvodnou hodnotou 50 a zmenou iba názvu kontroluje celý serializovaný payload, takže nenulové nastavenie sa nestratí.

Validácia odmieta prázdny vstup pred Number konverziou, neceločíselné hodnoty a čísla mimo 0–150. Nečíselný text, whitespace a Infinity browser number input sanitizuje na prázdny vstup, ktorý je tiež odmietnutý. Chyba sa zobrazuje a čistí pri oprave hodnoty. Input má stabilný accessible name, prepojený help/chybu, HTML min/max/step, Enter submit a disabled počas pending requestu.

Hodnota 0 aj 50 sa zobrazuje v existujúcom DetailOverview a Snapshot Policy facts Policy Set pickera. Žiadny nový stĺpec tabuľky. Starší wire response bez poľa dostane default 0 cez existujúcu generated schému aj reálny response registry mutator.

### Vlastné zmenené súbory

| Súbor | Zmena |
| --- | --- |
| src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPolicyForm.tsx | String field a shared číselný input s labelom, help a chybou. |
| src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPolicyModal.tsx | Default, edit mapovanie, validácia a číselný submit payload. |
| src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPolicyModal.test.tsx | Fixture a create/edit/invalid-input/Enter/pending HTTP testy. |
| src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPoliciesTable.tsx | DetailField pre copy rate. |
| src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPoliciesTable.test.tsx | Dve fixtures a detail testy 0/50; rozšírená pôvodná assertion poradia polí. |
| src/features/recovery-plans/recovery-policies/snapshot/model/snapshotPolicyContract.test.ts | Nový test štyroch generated kontraktov vrátane defaultu a hraníc. |
| src/shared/api/validatingMutator.test.ts | Legacy default a nenulová hodnota cez reálny response registry. |
| src/shared/components/policy-set-picker/PolicySetPickerDetails.tsx | Snapshot copy rate fact. |
| src/shared/components/policy-set-picker/PolicySetPicker.test.tsx | Zobrazenie hodnoty 0/50 v referencovanej politike. |
| src/locales/en.json | Tri nové snapshotPolicies kľúče. |
| src/locales/sk.json | Tri nové snapshotPolicies kľúče. |
| src/locales/cs.json | Tri nové snapshotPolicies kľúče. |
| tasks/plan.md | Stav schváleného plánu a limity. |
| tasks/todo.md | Checklist, skutočné výsledky a tento report. |

### Overenie a review

- T5 focused Vitest príkaz uvedený vyššie: **142 passed, 0 failed, 14 súborov**, exit 0. Zahŕňa Snapshot Policies, Policy Sets, Policy Catalog, picker, validatingMutator a translation kontrakt.
- Po sprísnení payload assertion a oprave SK/CS encodingu opakovaný modal + translation príkaz: **18 passed, 0 failed, 2 súbory**, exit 0.
- Po poslednom sprísnení invalid-input udalosti: `node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPolicyModal.test.tsx --reporter=dot` — **17 passed, 0 failed**, exit 0. `node node_modules/eslint/bin/eslint.js src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPolicyModal.test.tsx --max-warnings 0` — exit 0.
- `npm.cmd run typecheck` po implementácii: exit 0. Všetky tri východiskové TS2741 sú odstránené.
- Focused ESLint príkaz z T5 nad deviatimi TS/TSX súbormi: exit 0. Po zmenách testu sa opakuje iba lint dotknutého test súboru.
- JSON parse, prítomnosť/neprázdnosť všetkých troch kľúčov EN/SK/CS a kontrola encodingu bez náhradných znakov: PASS. Samostatná whitespace/final-newline kontrola nového untracked contract testu: PASS.
- `git diff --check`: exit 0. Git vypisuje iba upozornenia LF→CRLF a neprístupný používateľský ignore súbor.
- Inline review podľa correctness/readability/architecture/security/performance: validácia pred mutation, bezpečné defaultovanie v existujúcej vrstve, stabilný label a žiadne nové závislosti či suppressions. Invalid-input test používa await userEvent.click, aby kontrola absencie requestu nasledovala až po spracovaní udalosti.

### Regresie, limity a Git

Policy Sets a Policy Catalog regresie prešli; ich modely ani query keys sa nemenili. Recovery Groups naďalej používajú existujúcu Policy Set referenciu. Úprava politiky automaticky neaktualizuje už vygenerovaný DAG; aplikovanie nového COPY_RATE môže vyžadovať regenerate/push Recovery Group. Backend ani generated vrstva sa touto implementáciou nemenili.

Kompletná suite a production build neboli spustené podľa focused scope. Browser inventory vrátil prázdny zoznam prehliadačov a Chrome DevTools MCP nie je dostupný; vizuálne/viewport/language/discard-guard browser kontroly zostávajú neoverené. Enter/pending a formulárové správanie pokrývajú React Testing Library testy. Živý BE, IBM storage a aktualizácia nasadeného DAGu neboli testované.

Práca zostáva na spike/ant-design-shell. Vstupné OpenAPI/generated/VMware zmeny a cudzie tasks/vmware-removed-revision-p2-* súbory zachované. Nebol vykonaný stage, commit, push, reset, stash, zmena vetvy, worktree ani merge podľa explicitného zadania.

## Následné rozdelenie do commitov

Používateľ po odovzdaní výslovne požiadal vytvoriť atómové commity vlastných zmien podľa implementačných krokov. Vyššie uvedený zákaz a Git report opisujú pôvodné odovzdanie; nové povolenie zahŕňa stage a commit vlastných súborov. Poradie: testy kontraktu → preklady → formulár s regresnými testami → oba detaily s testami → dokumentácia. Fixtures sú zahrnuté s príslušným formulárovým/detailovým testom. Pôvodný OpenAPI/generated kontrakt ostáva samostatnou vstupnou zmenou mimo týchto commitov; commity naň nadväzujú. Súbežné VMware zmeny sa nezahŕňajú. Push sa nevykonáva.

Pred commitmi opätovne spustené: `node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-policies/snapshot/model/snapshotPolicyContract.test.ts src/shared/api/validatingMutator.test.ts src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPolicyModal.test.tsx src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPoliciesTable.test.tsx src/shared/components/policy-set-picker/PolicySetPicker.test.tsx src/locales/policyCatalogTranslations.test.ts --reporter=dot` — **77 passed, 0 failed, 6 súborov**, exit 0. `git diff --check` prešiel; pred každým commitom overený aj staged diff. Kompletná suite ani build sa neopakovali.
