# TODO: kontextová nápoveda polí providera

Stav: implementované inline v aktuálnom checkoute, 26. 10. 2026. Automatické overenie a nezávislé review prešli; ručné vizuálne overenie je otvorené pre blokovanie Computer Use. Bez pushu.

## Rozsah a podklady

- Autoritatívny obsah, presné mapy otáznikov podľa VMWARE/FLASHCOPY/HITACHI/IBM_POWER, kompletné EN/SK texty, defaulty, integračná architektúra a testovacia stratégia sú v [pláne](provider-form-field-help-plan.md). Tu ich neduplikovať.
- Zachovať jeden `ProviderCreateForm`, existujúci `KeyedHelpPopover` a súčasný Create/Edit workflow. Nedotknúť sa `ProvidersCatalogueTable.tsx`, `providers.help.*`, API ani shared help komponentov.
- Pred akýmkoľvek zápisom skontrolovať `git status`, diff a rozpracované zmeny centralizácie. Súbor `ProviderCreateForm.tsx` je súbežne upravovaný: bez resetu/prepisu cudzej práce, bez jej zahrnutia do commitu. Pracovať až na stabilnom integračnom bode `providerFieldConfig`.
- Všetky kroky testovať primerane podľa [testovacej stratégie plánu](provider-form-field-help-plan.md#primeraná-testovacia-stratégia), nie opakovaním interných testov shared popoveru.

## Úloha 1: Potvrdiť integračný bod

**Popis:** Overiť centralizáciu, znovu prečítať aktuálny `git status`/diff a formulár, potvrdiť stabilný integračný bod a finalizovať texty. Existujúci rozpracovaný `ProviderCreateForm.tsx` neprepisovať, neresetovať ani nepripájať do commitu tejto úlohy.

**Akceptácia:**
- [x] Žiadna druhá mapa relevantnosti; identifikované labely; Display/providers.help vylúčené.

**Overenie:**
- [x] Porovnanie štyroch HTML sekcií, aktuálneho resolvera a diffu.

**Závislosti:** Schválenie plánu a stabilný integračný bod centralizácie.

**Pravdepodobné súbory:** ProviderCreateForm.tsx a model/providerFieldConfig.ts iba čítať; oba plánovacie dokumenty. Neúplné názvy sú v src/features/providers-connectors/providers/components/, model v tom istom providers module.

**Rozsah:** M (3–5 súborov).

## Úloha 2: Doplniť preklady

**Popis:** Doplniť 30 plochých kľúčov na jazyk podľa tabuliek.

**Akceptácia:**
- [x] EN/SK parita nových kľúčov, správne texty/defaulty, providers.help.* nezmenené.

**Overenie:**
- [x] JSON parser, assertions parity a nezmenených providers.help.* voči baseline.

**Závislosti:** 1

**Pravdepodobné súbory:** src/locales/en.json, src/locales/sk.json. Neúplné názvy sú v src/features/providers-connectors/providers/components/, model v tom istom providers module.

**Rozsah:** S (1–2 súbory).

## Úloha 3: Pripojiť otázniky k labelom

**Popis:** V jednom formulári pridať lokálne riadky label + existujúci popover.

**Akceptácia:**
- [x] Presné množiny 8/6/5/7 a správne prístupné mená; žiadna zmena stavu alebo submitu.

**Overenie:**
- [x] Focused form testy typových množín a prekladov podľa plánu a focused ESLint.

**Závislosti:** 1, 2

**Pravdepodobné súbory:** ProviderCreateForm.tsx, ProviderCreateForm.test.tsx. Neúplné názvy sú v src/features/providers-connectors/providers/components/, model v tom istom providers module.

**Rozsah:** S (1–2 súbory).

### Checkpoint po úlohe 3

- [x] Dovtedajšie cielené testy/kontroly prešli a výsledky sú zaznamenané.
- [x] Diff rešpektuje rozsah, texty aj nedotknutý providers.help a API.

## Úloha 4: Overiť VMware a FlashCopy

**Popis:** Overiť správne otázniky a EN/SK texty pre VMware a FlashCopy v Create/Edit podľa typových tabuliek plánu. Interakčné kontroly reálneho popoveru vykonať iba na reprezentatívnom poli.

**Akceptácia:**
- [x] Explicitné mapy a obsah; reprezentatívny test Escape potvrdí, že modal a hodnoty ostávajú bez zmeny.

**Overenie:**
- [x] Focused Vitest oboch súborov s reálnym popoverom a modalom.

**Závislosti:** 3

**Pravdepodobné súbory:** ProviderCreateForm.test.tsx, ProvidersCreateModal.test.tsx. Neúplné názvy sú v src/features/providers-connectors/providers/components/, model v tom istom providers module.

**Rozsah:** S (1–2 súbory).

## Úloha 5: Overiť Hitachi a IBM Power

**Popis:** Overiť správne otázniky a EN/SK texty pre Hitachi a IBM Power v Create/Edit, vrátane managedSystem/backing storage. Neopakovať interné testy shared popoveru.

**Akceptácia:**
- [x] Hitachi presne 5 a IBM Power presne 7 správnych otáznikov; obsah a hodnoty overené bez opakovania testov shared Escape mechanizmu.

**Overenie:**
- [x] Focused Vitest oboch súborov, celý protokol každého typu/jazyka.

**Závislosti:** 4; spoločné testové súbory upravovať sekvenčne.

**Pravdepodobné súbory:** ProviderCreateForm.test.tsx, ProvidersCreateModal.test.tsx. Neúplné názvy sú v src/features/providers-connectors/providers/components/, model v tom istom providers module.

**Rozsah:** S (1–2 súbory).

### Checkpoint po úlohe 5

- [x] Dovtedajšie cielené testy/kontroly prešli a výsledky sú zaznamenané.
- [x] Diff rešpektuje rozsah, texty aj nedotknutý providers.help a API.

## Úloha 6: Uzavrieť regresie a vizuálne overenie

**Popis:** Overiť prechody, prázdny typ, Display a finálny diff.

**Akceptácia:**
- [x] Matica všetkých štyroch typov, Create/Edit a EN/SK obsah sú pokryté; integračné správanie nápovedy overené reprezentatívne. API/workflow/providers.help nezmenené.
- [ ] EN/SK layout a focus overené v reálnom prehliadači (Computer Use blokované).

**Overenie:**
- [x] Cielené príkazy nižšie a kontrola scope diffu.
- [ ] Ručný browser check dokončený (Computer Use blokované).

**Závislosti:** 5

**Pravdepodobné súbory:** Dva existujúce testové súbory a prípadne stav oboch plánovacích dokumentov. Neúplné názvy sú v src/features/providers-connectors/providers/components/, model v tom istom providers module.

**Rozsah:** M (3–5 súborov).

## Testovacie kritériá

Autoritatívna mapa, EN/SK texty a primeraná testovacia stratégia sú v [pláne](provider-form-field-help-plan.md#primeraná-testovacia-stratégia). TODO ich neopakuje.

- [x] Overiť presné typové množiny 8/6/5/7 v Create/Edit a neprítomnosť otáznikov pri piatich jednoduchých poliach.
- [x] Overiť paritu a obsah 10 unikátnych EN/SK textov z reálnych lokalizačných súborov.
- [x] Overiť jeden až dva reprezentačné príklady integrácie (Escape, nadradený modal, hodnoty/dirty/submit) s reálnym shared popoverom.
- [x] Overiť prechody typov a prázdny typ; ostatné interakcie pokrývajú existujúce shared testy.
- [ ] Manuálne skontrolovať EN/SK rozloženie a umiestnenie popoveru; zachovať ProvidersCatalogueTable a providers.help.

Plánované cielené overenie po implementácii:

~~~powershell
npm.cmd exec vitest run src/features/providers-connectors/providers/components/ProviderCreateForm.test.tsx src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx
npm.cmd exec eslint -- src/features/providers-connectors/providers/components/ProviderCreateForm.tsx src/features/providers-connectors/providers/components/ProviderCreateForm.test.tsx src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx --max-warnings 0
node -e "const fs=require('fs'); for(const l of ['en','sk']) JSON.parse(fs.readFileSync('src/locales/'+l+'.json','utf8')); console.log('Locale JSON OK')"
git diff --check -- src/features/providers-connectors/providers/components/ProviderCreateForm.tsx src/features/providers-connectors/providers/components/ProviderCreateForm.test.tsx src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx src/locales/en.json src/locales/sk.json
~~~

Ručne v prehliadači: všetky typy Create/Edit, EN/SK, úzky viewport, scroll, neorezaný panel, focus a Display s pôvodným providers.help. Kompletnú suite ani produkčný build nespúšťať predvolene. Shared testy HelpPopover/KeyedHelpPopover pridať len pri odôvodnenom zásahu do ich správania, ktorý najprv vyhodnotiť ako rozšírenie rozsahu.

## Záverečný checkpoint

- [x] Overených 26 typových priradení a 30 nových kľúčov na jazyk.
- [x] Všetky štyri typy majú explicitne overenú mapu pre Create/Edit a EN/SK obsah; spoločné interakcie popoveru sú pokryté len reprezentatívnymi regresiami.
- [x] Zaznamenané výsledky focused testov, lintovania a JSON; nedokončená ručná kontrola výslovne uvedená.
- [x] Diff zachováva ProvidersCatalogueTable.tsx, providers.help.* aj API/workflow.
- [x] Realizácia vykonaná na následný pokyn používateľa; bez pushu. Výsledky a odchýlky sú uvedené v pláne.

## Výsledky overenia

- Samostatné HTML sekcie: VMWARE 13 polí/8 otáznikov, FLASHCOPY 11/6, HITACHI 10/5, IBM_POWER 12/7. Explicitné testy polí Create/Edit zodpovedajú presným zoznamom HTML.
- Focused Vitest oboch komponentových súborov: 128 testov prešlo; focused ESLint troch zmenených TSX súborov prešiel.
- Cielený TypeScript check troch zmenených TSX súborov a ich importov prešiel; plný projektový typecheck sa nespúšťal.
- Node assertions: platné JSON, 30 nových kľúčov na jazyk, EN/SK parita a všetky pôvodné preklady zachované. `git diff --check` bez chýb. Nezávislé review bez nálezov.
- Ručná vizuálna kontrola nedokončená: Computer Use nedokázal spoľahlivo overiť aktuálnu URL vo Windows a zastavil ďalšie ovládanie. Tento bod zostáva otvorený; neoznačovať ho za úspešný.
- Kompletná suite ani produkčný build neboli spustené. Podrobnosti príkazov a existujúce rozdiely povinnosti/defaultov oproti HTML sú v záverečnej sekcii plánu.
