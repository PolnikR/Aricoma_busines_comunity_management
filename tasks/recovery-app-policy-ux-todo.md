# Recovery App Policy UX – TODO

Plán, analýza, mapa parametrov a kompletné EN/SK texty: [recovery-app-policy-ux-plan.md](recovery-app-policy-ux-plan.md).
Stav: implementované a automaticky overené (62 testov, ESLint, focused TypeScript); desktop EN čiastočne vizuálne overený. Otvorené checkboxy označujú neoverený nasadený backend a zvyšok ručného/browser QA. Otázniky a rozostupy sú podľa Providers, bez default informácií v nápovede.

Cesty `components/...` sú relatívne k `src/features/recovery-plans/recovery-policies/application-recovery/`. Ostatné cesty sú od rootu. `RecoveryAppPolicyHelp.test.tsx` je navrhovaný nový test v rovnakom components adresári.

## Vstupný checkpoint: kontrakt a schválenie

- [x] Používateľ autorizoval implementáciu plánu cez executing-plans; Create Frequency začína na `1 day` a rovnaká validácia platí pre Create aj Edit bez historických výnimiek.
- [ ] Publikovaná sekcia RecoveryAppPolicy bola porovnaná s návrhom textov a lokálnymi Effect/Default zdrojmi. Rozpory sú vyriešené.
- [ ] Potvrdené `MIN_RECOVERY_APP_INTERVAL_MINUTES`, konfigurovateľný default 600, miesto kontroly automatického intervalu a formát HTTP 422; rozlíšené uloženie politiky a push DAG.
- [x] Znovu overené git status a cudzie zmeny; dostupný `DetailField.labelHelp` sa iba použije. Plánovacia fáza skončila následným implementačným pokynom; atomic commity podľa AGENTS.md, bez pushu a merge.

## T1: Intervaly bez automatického prepočtu

**Popis:** Zaviesť intervalové pravidlá z plánu do existujúceho Create/Edit; najprv behavior test, potom minimálna zmena formulára a modalu.

**Akceptačné kritériá:**
- [x] Frequency aj Retention majú pre minutes min/step 15 a prijímajú 15/30/45/60/75/90/600; odmietajú prázdno, whitespace, 0, záporné, necelé a 1/7/20. Hours/days majú min/step 1 a povoľujú 1. Save aj Enter blokujú neplatný request; jednotky sú validované. Snapshot max age a timeouty nemenia pravidlá.
- [x] Skutočná zmena jednotky vymaže iba číslo príslušného páru, v jednej aktualizácii; opakovaný výber tej istej jednotky nič nemení. Bez konverzie, zaokrúhlenia a hlášok. Create Frequency má `1 day`, Retention `1 day`. Edit načíta pôvodné hodnoty bez tichej zmeny; pri Save sa vždy použije rovnaká validácia a neplatnú minútovú hodnotu treba opraviť, bez historických výnimiek.
- [ ] FE neobsahuje pevné backendové minimum 600 ani výnimku prepúšťajúcu prázdnu Frequency v manuálnom režime. Serverový detail 422 sa zobrazí v existujúcom alerte, ak patrí k submit endpointu; miesto kontroly zistené v checkpointoch je zaznamenané. Retention nepreberá minimum Frequency.

**Overenie:**
- [x] `node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPolicyModal.test.tsx`
- [x] JSON parser EN/SK; focused ESLint na troch zmenených TSX súboroch.
- [ ] Ručne zmena oboch jednotiek, Save/Enter s prázdnym vstupom, Create default `1 day` a Edit pôvodnej neplatnej minútovej hodnoty bez automatického prepisu. Aktualizovať existujúce testy na jednotka → číslo, neoslabiť payload assertions.

**Závislosti:** vstupný checkpoint.
**Súbory:** `components/RecoveryAppPolicyForm.tsx`, `components/RecoveryAppPolicyModal.tsx`, `components/RecoveryAppPolicyModal.test.tsx`, `src/locales/en.json`, `src/locales/sk.json`.
**Rozsah:** M, 5 súborov.

## T2: Úplný EN/SK obsah parametrových nápovied

**Popis:** Zapísať schválené ploché kľúče podľa sekcie „Kompletné návrhy EN/SK textov“ v pláne. Pripraviť locale assertions v budúcom integračnom teste.

**Akceptačné kritériá:**
- [x] Každý z 13 helpKey má neprázdne trigger/title/intro v EN aj SK; zhodných 39 kľúčov na jazyk, žiadne raw kľúče alebo fallback na EN v SK kontrolách.
- [x] Texty rozlišujú zamýšľanú Retention a nepoužívaný Boot verify od aktuálnych DAG účinkov, oba manuálne režimy, timeouty a UI krok od backendového minima. Overenie podľa dostupného autoritatívneho zdroja je zaznamenané.
- [x] Všetky pôvodné `recoveryAppPolicies.help.*` hodnoty zostanú presne nezmenené; nevznikne nový celkový helper ani pole pre interný DAG timeout.

**Overenie:**
- [x] `node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPolicyHelp.test.tsx` (v tejto fáze locale assertions).
- [x] Parsovanie EN/SK JSON, porovnanie nových kľúčov a pôvodných header help hodnôt proti východiskovému stavu; focused ESLint na novom teste.

**Závislosti:** vstupný checkpoint; sekvenčne po T1 kvôli spoločným locale súborom.
**Súbory:** `src/locales/en.json`, `src/locales/sk.json`, `components/RecoveryAppPolicyHelp.test.tsx` (nový).
**Rozsah:** M, 3 súbory.

## Checkpoint A: intervaly a obsah

- [x] Focused testy T1–T2 prešli, nový obsah bol skontrolovaný proti BE, JSON je platný.
- [x] Potvrdené, že 15-minútový krok nepredstavuje FE garanciu povoleného automatického intervalu; historické hodnoty sa pri otvorení nemenia.
- [x] Žiadna produkčná zmena mimo rozsahu ani zásah do cudzej Snapshot práce.

## T3: Kontextové otázniky v spoločnom Create/Edit

**Popis:** Pripojiť existujúci KeyedHelpPopover k viditeľným parametrom podľa mapy v pláne bez nového helper komponentu alebo zmeny shared API.

**Akceptačné kritériá:**
- [x] Create aj Edit majú pri latest 11 parametrových triggerov, pri time_range/exact_time 12. Každý sedí pri správnom názve; Frequency, Retention a max age majú po jednom pre celý pár. ID/Name/Description nemajú otázniky.
- [x] Tlačidlá nie sú v HTML labeloch; checkboxy zachovávajú accessible name, checked/disabled/aria stav a focus. Jednotný helpKey/obsah funguje z reálnych EN/SK máp; podmienené otázniky sa skrývajú spolu s poľom.
- [x] Otáznik nemení vstupy/dirty stav, neaktivuje checkbox ani submit; zachované existujúce rozloženie, manuálne režimy vedľa seba, oba timeouty v IBM Power časti a žiadny nový platformový filter.

**Overenie:**
- [x] `node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPolicyHelp.test.tsx src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPolicyModal.test.tsx`
- [x] Focused ESLint na zmenených TSX; integračne otvoriť help pre checkbox aj input a overiť nezmenené hodnoty/dirty stav.

**Závislosti:** T1, T2, checkpoint A.
**Súbory:** `components/RecoveryAppPolicyForm.tsx`, `components/RecoveryAppPolicyHelp.test.tsx`, `components/RecoveryAppPolicyModal.test.tsx`.
**Rozsah:** M, 3 súbory.

## T4: Úplný Display s parametrovou nápovedou

**Popis:** Použiť existujúci DetailField.labelHelp a doplniť chýbajúce hodnoty v jedinom Overview podľa sekcie „Minimálna integrácia a mapa otáznikov“ v pláne.

**Akceptačné kritériá:**
- [x] Zobrazený samostatný selection režim plus iba relevantný max age alebo target time bez duplicitného súhrnu v detaile; latest nemá ani jedno podmienené pole. Manual WWPN entry zobrazuje Yes/No vedľa Manual zoning; legacy chýbajúce hodnoty sa nevymýšľajú.
- [x] Parametrové triggery majú rovnaké kľúče a EN/SK obsah ako formulár: 11/12/12 podľa režimu; navyše ostáva presne pôvodný hlavičkový helper so sekciami schedule/selection/bootVerify. Žiadny trigger pre identitu.
- [x] Zachovaná jedna sekcia Overview, string labels, copy ID, footer, Edit/Delete, tabuľkový selection súhrn aj JSON view. Žiadne shared zmeny.

**Overenie:**
- [x] `node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPoliciesTable.test.tsx src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPolicyHelp.test.tsx`
- [x] Focused ESLint na zmenených TSX. Aktualizovať presné poradie fields testu a preveriť, že label text utility nepriberá accessible name otázniku.

**Závislosti:** T2, T3.
**Súbory:** `components/RecoveryAppPoliciesTable.tsx`, `components/RecoveryAppPoliciesTable.test.tsx`, `components/RecoveryAppPolicyHelp.test.tsx`.
**Rozsah:** M, 3 súbory.

## Checkpoint B: všetky tri pohľady

- [x] Modal, table a help testy prešli, conditional visibility a jednotný obsah zodpovedajú mape.
- [x] Hlavičkový helper a jeho locale hodnoty sú nezmenené; nové snapshot údaje nie sú duplicitné.
- [x] Žiadny nový helper komponent, sekcia, API/generated zmena alebo zásah do iných feature.

## T5: Integračné regresie a browser QA

**Popis:** Doplniť iba chýbajúce regresie manuálnych režimov/timeoutov a overiť klávesnicu a responzivitu; správny mapper a manual mode logiku nerefactorovať.

**Akceptačné kritériá:**
- [x] Oba režimy sa vylučujú, obe false sú povolené a oba true z legacy API blokujú submit. Create zachová 300/240; Edit aj prepnutie režimov zachovajú neštandardné timeouty, napr. 123 sekúnd/7 minút, vrátane presného payloadu vo všetkých snapshot režimoch. Zoning wait má stále krok 1.
- [x] Reálny popover v modale: Tab/Enter otvára, prvý Escape zatvorí iba help, focus sa vráti na trigger; nadradený formulár a dirty guard ostanú funkčné. Obsah sa číta z reálnych EN/SK máp; neopakovať celý shared HelpPopover interný test set.
- [ ] Reálny browser EN/SK v Display/Create/Edit pri 320, 375, 768 px a desktop: bez horizontálneho scrollu, orezaných labelov alebo roztrhnutých dvojíc. Dostupnosť browser QA a prípadné blokery sú zaznamenané pravdivo.

**Overenie:**
- [x] `node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPolicyModal.test.tsx src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPoliciesTable.test.tsx src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPolicyHelp.test.tsx`
- [x] Focused ESLint zmenených testov; JSON parser/zhoda nových EN/SK kľúčov a `git diff --check`.
- [ ] Browser manuálny postup vyššie; zapísať výsledky do tohto TODO. Kompletnú suite/build nepúšťať automaticky.

**Závislosti:** T1–T4, checkpoint B.
**Súbory:** `components/RecoveryAppPolicyModal.test.tsx`, `components/RecoveryAppPolicyHelp.test.tsx`, `tasks/recovery-app-policy-ux-todo.md` (výsledky QA).
**Rozsah:** M, 3 súbory.

## Finálny checkpoint

- [ ] Všetky akceptačné kritériá prešli; backendové nejasnosti sú vyriešené a publikované texty porovnané.
- [x] Overené zachovanie header helpera, ostatných politík a cudzej práce; zdokumentované presné príkazy a výsledky.
- [x] Implementácia je pripravená na kontrolu vrátane browser výsledkov a jasne označených nevykonaných kontrol. Implementačné commity podľa AGENTS.md po následnom vykonávacom pokyne; bez pushu a merge.

## Výsledky overenia – 26. 10. 2026

- T1–T4 implementované; T5 automatické regresie dokončené. Skutočné EN/SK mapy sú testované v Create/Edit/Display a vo všetkých troch selection režimoch; 11/12/12 parametrových otáznikov a jeden nezmenený header trigger v Display.
- 62 testov v 3 súboroch prešlo, focused ESLint bez chýb, focused TypeScript prešiel. Presné príkazy a nastavenie dočasného typecheck configu sú v pláne. Kompletná sada ani build neboli spustené.
- Locale kontrola: 39 nových help kľúčov v každom jazyku, žiadne default informácie, všetky existujúce hodnoty zachované oproti `4e1cfe1c`.
- Desktop EN screenshot potvrdil kompaktné rozloženie Create/Edit a správne umiestnené otázniky. V Create otvorený Frequency popover a overený Escape ponechávajúci rodiča. Pri testovaní sa neuložila politika.
- Zostáva: browser EN/SK v 320/375/768 px, mobile/touch, plné klávesnicové overenie, Display screenshot a DevTools console/network. Automatické pokrytie sa nevydáva za vizuálny dôkaz týchto kontrol.
- Nasadené `MIN_RECOVERY_APP_INTERVAL_MINUTES` a miesto/formát skutočného 422 nie sú potvrdené; FE neobsahuje pevných 600 minút. Mock 422 test dokazuje iba zobrazenie serverového detailu pri submit.
