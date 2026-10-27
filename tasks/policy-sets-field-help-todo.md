# Policy Sets – TODO kontextových nápovied

Plán: [policy-sets-field-help-plan.md](policy-sets-field-help-plan.md). Stav: úlohy 1–4 implementované inline, automatické kontroly prešli. Rozšírená manuálna vizuálna matica zostáva označená nižšie.

- [x] Používateľ skontroloval plán a schválil začiatok implementácie.

Obmedzenia pre všetky úlohy: nemeníme výber, validáciu, inline mapper v modale, API, generated súbory ani globálnu nápovedu. Neopravujeme prísnejšiu FE povinnosť referencií ani neprázdneho `description`; oba nesúlady patria do samostatného backlogu uvedeného v pláne. Neprepisujeme rozpracované zmeny iných úloh. Používateľ následne schválil implementáciu inline; pôvodný pokyn bez commitu/pushu zostáva zachovaný.

Overenie implementácie: 40 focused locale/modal/table testov + 54 regresných testov katalógu/popoverov; table test navyše zopakovaný po doplnení prechodu do Edit a oprave optional fixture. Focused ESLint piatich TS/TSX súborov, cielené TypeScript diagnostiky týchto súborov, JSON obsah a diff kontrola. V Edge vizuálne overené Create/Edit/Display v EN, kompaktné zarovnanie, scroll a Snapshot/Clean Room popover pri okne približne 960 × 589. Nič sa neukladalo na živý BE. Úplná vizuálna matica EN/SK/CS a breakpointov nebola vykonaná; locale runtime testy overujú všetky tri nápovedy v každom jazyku.

## Úloha 1: Preklady troch nápovied

**Opis:** Doplniť presné texty z plánu do plochých locale slovníkov a overiť ich vykreslenie existujúcim komponentom.

**Akceptačné kritériá:**
- [x] Každý EN/SK/CS slovník obsahuje presne 9 nových `policySets.fieldHelp.*` kľúčov (trigger/title/intro × tri parametre), bez zmien `policySets.help`.
- [x] Texty zachovávajú význam jednej existujúcej politiky, odlišujú priradenie od zapnutia a uvádzajú, že IBM Power DAG nemá Clean Room úlohu.
- [x] Locale test overuje neprázdnosť, presný set kľúčov a všetky tri popovery cez LanguageProvider v každom jazyku bez fallbacku.

**Súbory:** `src/locales/en.json`, `src/locales/sk.json`, `src/locales/cs.json`, nový `src/locales/policySetFieldHelpTranslations.test.ts`.

**Overenie:**
- [x] `npm.cmd exec vitest run src/locales/policySetFieldHelpTranslations.test.ts`.
- [x] Parsovanie všetkých troch JSON; focused ESLint nového testu a diff kontrola iba vlastných zmien.

**Závislosti:** kontrola plánu. **Rozsah:** M, 4 súbory. Pokrýva AC3.

## Úloha 2: Nápovedy v Create a Edit

**Opis:** Vedľa existujúcich troch `h3` sekcií spoločného formulára pridať KeyedHelpPopover, `sections={[]}`, s helpKey odvodeným z `section.field`. Rozšíriť existujúce modal testy.

**Akceptačné kritériá:**
- [x] Create aj Edit sprístupňujú tri správne nápovedy pri názve poľa aj pri loading/empty/error katalógu; rádio labely a grouping zostávajú zachované.
- [x] Klik, focus, Enter/Space, zatvorenie a Escape nemenia checked hodnoty/draft, nespúšťajú submit a nezatvoria rodičovský modal.
- [x] Existujúce predvyplnenie Edit, zamknuté ID, povinnosť troch referencií, retry a discard guard zostávajú funkčné.

**Súbory:** `src/features/recovery-plans/policy-sets/components/PolicySetForm.tsx`, `src/features/recovery-plans/policy-sets/components/PolicySetModal.test.tsx`. Produkčný `PolicySetModal.tsx` sa nemení.

**Overenie:**
- [x] `npm.cmd exec vitest run src/features/recovery-plans/policy-sets/components/PolicySetModal.test.tsx`.
- [ ] Focused ESLint dvoch súborov; manuálne Create/Edit, všetky tri nápovedy, myš/klávesnica.

**Závislosti:** 1. **Rozsah:** S, 2 súbory. Pokrýva AC1, AC4, AC5.

## Checkpoint po úlohách 1–2

- [x] Locale a modal testy prešli; 27 prekladových položiek je kompletných.
- [x] Diff neobsahuje zmeny validácie, mappera, katalógu ani cudzej práce.
- [x] Nápoveda Create/Edit má rovnaký obsah v každom režime a neovplyvňuje výber.

## Úloha 3: Nápovedy v Display

**Opis:** Doplniť tri `DetailField.labelHelp` v existujúcom detaile PolicySetsTable. Použiť rovnaké kľúče ako formulár, bez úpravy `referenceField`.

**Akceptačné kritériá:**
- [x] Všetky tri poľové nápovedy otvárajú správne texty; resolved, missing, unknown aj nenastavené null/undefined referencie zachovajú hodnoty a varovania.
- [x] Globálna nápoveda ostáva funkčná, poradie a názvy polí, Edit/Delete aj počet politík ostávajú zachované.
- [x] Escape a focus fungujú v detaile bez jeho nechceného zatvorenia; dlhý text sa dá prečítať aj pri scrollovaní/úzkom okne.

**Súbory:** `src/features/recovery-plans/policy-sets/components/PolicySetsTable.tsx`, `src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx`.

**Overenie:**
- [x] `npm.cmd exec vitest run src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx`.
- [ ] Focused ESLint oboch súborov; vizuálna kontrola DetailView a globálneho popoveru.

**Závislosti:** 1; možno vykonať nezávisle od 2 po dohode o textoch. **Rozsah:** S, 2 súbory. Pokrýva AC2, AC4, AC8.

## Úloha 4: Cielená regresia helperov a nezmeneného payloadu

**Opis:** Rozšíriť existujúce testy formulára a detailu iba o regresiu interakcií nápovedy a pôvodného submit payloadu. V modal teste použiť existujúce mocky alebo kontrolovaný POST iba na overenie Create/Edit JSON. V table teste použiť existujúce kontrolované fixtures na overenie Display a prechodu do Edit. **Nevytvárať nový POST → GET round-trip, neprepisovať page test ani infraštruktúru mockov.**

**Akceptačné kritériá:**
- [x] Create aj Edit odošlú presný pôvodný JSON so všetkými tromi ID; otvorenie/zatvorenie nápovied neposiela request a nepridáva help kľúče do payloadu.
- [x] Display nad existujúcim fixture po otvorení/zatvorení všetkých troch nápovied zachová tri ID/názvy, resolved/missing/unknown/notConfigured stavy a pôvodný prechod do Edit so zamknutým ID; fixtures nedokazujú skutočné GET/uloženie na BE.
- [x] Existujúce požiadavky na neprázdne ID a missing/unknown varovania zostávajú zachované; test netvrdí, že FE validátor overuje existenciu ID. Power prípad bez Clean Room zostáva zdokumentovaným existujúcim obmedzením.

**Súbory:** iba `src/features/recovery-plans/policy-sets/components/PolicySetModal.test.tsx` a `src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx`. `PolicySetsPage.test.tsx` ostáva nedotknutý, keďže mockuje oba komponenty a neposkytuje reálny POST → GET dôkaz.

**Overenie:**
- [x] `npm.cmd exec vitest run src/features/recovery-plans/policy-sets/components/PolicySetModal.test.tsx src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx`.
- [x] Regresia katalógu a spoločných popoverov: focused príkaz z plánu; ESLint všetkých zmenených testov.

**Závislosti:** 2 a 3. **Rozsah:** S, 2 testové súbory. Pokrýva AC5, AC6, AC7.

## Následná úloha mimo rozsahu (neblokuje T1–T4)

- [ ] **Samostatný backlog:** zosúladiť voliteľnosť `snapshot_policy_id`, `recovery_app_policy_id`, `clean_room_policy_id` a `description` s BE schémou; navrhnúť možnosť „Bez politiky“, zrušenie výberu a bezpečné `null`/vynechanie pri upserte.
- [ ] V následnej úlohe (nie teraz) overiť Create/Edit s čiastočnými Policy Sets, round-trip POST/GET, vymazanie referencie pri Edit, referenčnú integritu a IBM Power scenár bez Clean Room.
- [ ] Pred následnou implementáciou samostatne potvrdiť požadované správanie a BE kontrakt. Tieto checkboxy **nie sú podmienkou** dokončenia kontextových nápovied.

## Finálny integračný checkpoint

- [x] AC1–AC8 z plánu majú doložený výsledok; všetky štyri úlohy sú dokončené.
- [x] Prešli uvedené focused locale, modal, table, katalóg a popover testy. Page test a nový POST → GET round-trip nie sú súčasťou rozsahu.
- [ ] Overená matica Create/Edit/Display × EN/SK/CS × tri nápovedy; locale runtime testy dopĺňa vizuálny smoke správneho umiestnenia.
- [ ] Manuálne overené nápovedy vo formulári a detaile, pôvodný výber, globálna nápoveda, klávesnica, scroll a úzky viewport; nie je požadovaný nový BE round-trip. Bez reálneho testovacieho BE netvrdiť úspešnú perzistenciu.
- [x] Focused ESLint, parsovanie locale JSON a `git diff --check` pre dotknuté súbory prešli. Kompletná suite/build sa nespúšťajú bez dôvodu či výslovnej požiadavky.
- [x] Diff obsahuje iba nápovedy, 27 prekladových položiek a ich testy; žiadna zmena payloadu, validácie, generated API, spoločných helperov alebo cudzej rozpracovanej práce.
- [x] Nesúlad FE/BE voliteľnosti troch referencií a `description` je výslovne uvedený ako **samostatný následný backlog**, nie hotová oprava; živý BE a perzistencia nie sú touto úlohou overené.
