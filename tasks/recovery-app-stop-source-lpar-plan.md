# Implementačný plán: stop_source_lpar

Stav: implementované inline 2026-11-04; výsledky kontrol a otvorené manuálne overenie sú v TODO. Pôvodná analýza ABCO FE: 2026-11-04, HEAD `f5f02628`; následná revízia cez Rel.AI: HEAD `82b24fcb`.
Kontrolný zoznam: [recovery-app-stop-source-lpar-todo.md](recovery-app-stop-source-lpar-todo.md).

## Rozsah a východiská

Pridať boolean `stop_source_lpar` do existujúceho toku Recovery Application Policies. Predvolená hodnota je `true`; explicitné `false` musí prežiť načítanie, editáciu aj odoslanie. Pri `false` zachovať `source_shutdown_timeout_seconds`. Žiadne nové abstrakcie, zmeny ostatných parametrov, manuálne úpravy Orval výstupov, push ani merge.

Pôvodný návrh vznikol pomocou CodeGraph MCP a cieleného čítania FE súborov. Následná kontrola cez Rel.AI overila aktuálne FE komponenty, API normalizáciu, testy a BE commit `12136ce` vrátane implementácie v IBM Power DAG v1/v2/v3. Dostupnosť tejto BE zmeny na cieľovom prostredí nebola overená.

Na začiatku analýzy boli `git status --short`, unstaged aj staged diff prázdne. Päť očakávaných OpenAPI/Orval aktualizácií už obsahuje HEAD `f5f02628` (`scheme orval`). Ich obsah zachovať; pred budúcou implementáciou znovu preveriť pracovný strom. Tento plán nevytvára ani neprepisuje generované súbory.

## Overený tok dát a miesta zásahu

V nasledujúcom texte `A` označuje `src/features/recovery-plans/recovery-policies/application-recovery/`.

| Vrstva / konkrétny súbor | Aktuálny stav a plánovaný zásah |
| --- | --- |
| `openapi/abco-api.json` | `RecoveryAppPolicy` aj `RecoveryAppPolicyRecord` obsahujú boolean s defaultom `true`; nie je potrebná ďalšia zmena kontraktu. |
| `src/generated/query/zod/recoveryAppPolicy.gen.ts`, `recoveryAppPolicyRecord.gen.ts`, `recoveryAppPoliciesResponse.gen.ts`, `submitRecoveryAppPolicyBody.gen.ts` v rovnakom adresári | Všetky štyri už obsahujú `zod.boolean().default(...)`. Vstupný typ dovoľuje vynechanie, Output typ vyžaduje boolean. Použiť existujúci export `submitRecoveryAppPolicyBodyStopSourceLparDefault`. Neupravovať ručne. |
| `src/generated/query/recovery-app-policies/recovery-app-policies.gen.ts` | GET `/get_recovery_app_policies`, POST `/submit_recovery_app_policy`; POST serializuje odovzdaný objekt cez `JSON.stringify`, preto musí explicitnú hodnotu vytvoriť FE mapper. Bez úpravy klienta. |
| `src/generated/query/responseSchemas.gen.ts`, `src/shared/api/validatingMutator.ts` | GET aj POST používajú `RecoveryAppPoliciesResponse`. Mutator parsuje odpoveď a zachováva neznáme polia cez `keepUnlistedFields`; Zod doplní chýbajúci boolean. Bez úpravy spoločnej infraštruktúry. |
| `A/model/selectRecoveryAppPolicies.ts` | Vracia zoznam ako `RecoveryAppPolicyRecordOutput[]` po runtime validácii; explicitne predpokladá aplikované defaulty. Bez ďalšej normalizácie. |
| `A/pages/RecoveryAppPoliciesPage.tsx` | `useGetRecoveryAppPolicies({ query: { select: selectRecoveryAppPolicies } })` posiela politiky do tabuľky a create modalu. Bez zmeny produkčného kódu. |
| `A/components/RecoveryAppPoliciesTable.tsx` | Vybraná politika ide do detailu a edit modalu. Overview používa `DetailField`, `KeyedHelpPopover` a lokalizované `yes/no`. Pridať jeden detail pred timeout; nepridávať stĺpec ani filter. |
| `A/components/RecoveryAppPolicyModal.tsx` | `EMPTY_FORM` → `initialForm` / `toFormData` → state → generický `handleChange` → `validate` → `toRecoveryAppPolicySubmitPayload` → `useSubmitRecoveryAppPolicy`. Pridať create default a priame mapovanie uloženého booleanu. Reset a dirty porovnanie používajú celý formulár a prirodzene zahrnú nové pole. |
| `A/components/RecoveryAppPolicyForm.tsx` | Vlastné `RecoveryAppPolicyFormData` zatiaľ pole nemá. IBM Power sekcia používa natívne riadené checkboxy a `KeyedHelpPopover`. Rozšíriť typ aj UI rovnakým vzorom. |
| `A/model/recoveryAppPolicySubmit.ts` | `common` explicitne prenáša IBM Power parametre pre všetky tri snapshot režimy. Pridať `stop_source_lpar: form.stop_source_lpar` sem, bez truthy filtrov. |
| `src/locales/en.json`, `sk.json`, `cs.json` | Ploché kľúče pre labely a `.fieldHelp.<field>.trigger/title/intro`. Pridať rovnakú množinu kľúčov do všetkých troch katalógov. |

Tok: GET → runtime Zod defaulty → select → tabuľka / uložená politika → edit modal → riadený formulár → explicitný mapper → POST → existujúce spracovanie odpovede a invalidácia query. Create začína v `EMPTY_FORM`. Overview číta rovnaký normalizovaný záznam ako editácia.

## Rozhodnutia pre implementáciu

- Formulárové pole je povinný `boolean`. Create použije generovanú default konštantu; edit použije `policy.stop_source_lpar`. Nepoužiť `|| true`, ktoré by prepísalo `false`. Nepridávať `?? true` do každého komponentu: staršie dáta rieši existujúca hranica API.
- Checkbox umiestniť v IBM Power sekcii pred časový limit vypnutia. ID `recovery-app-policy-stop-source-lpar`, label cez `recoveryAppPolicies.form.stopSourceLpar`, `checked`, `event.target.checked`, `disabled={isSubmitting}`. Prevziať štýl a prístupnosť existujúcich checkboxov bez nového wrapper komponentu.
- Overview použije ten istý label, `KeyedHelpPopover` a `recoveryAppPolicies.yes/no`. Žiadne duplicitné `details.stopSourceLpar` preklady nie sú potrebné.
- Nový help prefix: `recoveryAppPolicies.fieldHelp.stop_source_lpar`; `sections={[]}` s vysvetlením v `intro`. Platí pre IBM Power DAG v1/v2/v3: zapnuté zastaví zdroj pri rovnakom managed systéme; vypnuté nechá zdroj bežať. **`false` použiť len v prípade, keď klon dostane novú MAC adresu a odlišnú IP adresu cez DHCP.** Ak má klon statickú IP adresu alebo hostname uložený v systéme, súbežný beh so zdrojovým LPAR môže spôsobiť konflikt identity v sieti. VMware nastavenie ignoruje podľa existujúceho IBM Power UI kontraktu.
- Timeout zostáva viditeľný, editovateľný a validovaný ako kladné celé číslo. Prepnutie nesmie resetovať jeho string vo formulári ani číslo v payload-e. Nevypínať jeho validáciu a nevynechávať ho z requestu. Help timeoutu doplniť o to, že pri vypnutom zastavení sa nepoužije, ale hodnota sa zachová.
- Upraviť súvisiacu nápovedu `manual_zoning`, aby nesľubovala vždy vypnutie zdroja; zachovať existujúce informácie o potvrdení operátorom a exkluzivite manuálnych režimov. Žiadna zmena správania zoningu, WWPN, snapshotov, retencie či boot verify.
- Bez novej sieťovej validácie alebo potvrdzovacieho dialógu: politika neobsahuje podklady na spoľahlivé overenie identity klonu. Pomoc musí výslovne spomenúť novú MAC, DHCP, riziko statickej IP/hostname a možný konflikt pri súbehu zdroja a klonu.

Navrhované labely: EN „Stop source LPAR“, SK „Zastaviť zdrojovú LPAR“, CS „Zastavit zdrojovou LPAR“. Nápoveda nebude vypisovať technické názvy JSON polí. Existujúci help test zakazuje text `default|predvolen`; predvolený stav overí test checkboxu, nie nový odsek o defaulte v helpe.

## Úlohy a závislosti

### 1. Zabezpečiť kontrakt a typované testovacie dáta

Rozsah S, 3 existujúce súbory: `A/components/RecoveryAppPolicyModal.test.tsx`, `RecoveryAppPoliciesTable.test.tsx`, `RecoveryAppPolicyHelp.test.tsx`. Závislosti: žiadne.

Existujúce ručne typované Output fixtures doplniť o boolean bez oslabenia typov. Netvoriť samostatný kontraktový test: starší GET payload bez poľa a explicitné `false` overí existujúci integračný test v úlohe 5 cez skutočný mutator/Zod. V žiadnom teste nevydávať neúplný Output objekt cez type assertion za normalizovaný záznam.

Akceptácia:
- Tri existujúce Output fixtures sú typovo kompletné bez oslabenia typov.
- Generované schémy majú default `true` a správne zachovávajú `false` (overí existujúci GET tok v úlohe 5); žiadna manuálna úprava schém.

Overenie: cielený Vitest troch existujúcich component testov po ich úprave a typecheck. Súčasné fixtures nové povinné Output pole nemajú, takže prípadné východiskové typecheck chyby treba odlíšiť od regresie implementácie.

### 2. Pripraviť tri jazykové katalógy

Rozsah M, 3 súbory: `src/locales/en.json`, `sk.json`, `cs.json`. Závislosti: 1.

Akceptácia:
- Nový label a tri help kľúče existujú vo všetkých jazykoch a zodpovedajú významu vyššie.
- Nápoveda výslovne uvádza novú MAC adresu, pridelenie odlišnej IP cez DHCP a riziko statickej IP/hostname pri súbežnom behu; timeout a manuálny zoning neobsahujú protichodné tvrdenia.
- JSON je validný a existujúce nesúvisiace kľúče ostanú nezmenené.

Overenie: JSON parse všetkých troch katalógov, kontrola neprázdnych štyroch nových kľúčov; existujúci `RecoveryAppPolicyHelp.test.tsx`. Kontrolný bod po 1–2: kontrakt a texty sú pripravené pre UI.

### 3. Dodať create/edit/submit priechod

Rozsah M, 4 súbory: `A/components/RecoveryAppPolicyForm.tsx`, `RecoveryAppPolicyModal.tsx`, `RecoveryAppPolicyModal.test.tsx`, `A/model/recoveryAppPolicySubmit.ts`. Závislosti: 1, 2.

Akceptácia:
- Create checkbox je zapnutý, edit načíta skutočný boolean; checkbox je počas submitu disabled a používa existujúci HelpPopover.
- Každý platný submit explicitne odošle aktuálny boolean vrátane nezmeneného `false` vo všetkých troch snapshot režimoch; ich kombinácie overiť priamo v existujúcom modal teste cez skutočný odosielaný JSON.
- Prepínanie v oboch smeroch nezmení timeout ani ostatné hodnoty; reset/reopen a dirty guard zostanú správne.

Overenie: rozšíriť modal testy pomocou existujúcich `fillRequiredCreateFields`, `stubSubmitResponse`, `submittedBody`; kontrolovať reálny JSON request cez fetch stub. Aktualizovať presné očakávané payloady (`toEqual`), nielen pridať `toMatchObject`. Spustiť tento test a cielený ESLint.

### 4. Doplniť Overview a overiť nápovedu

Rozsah M, 3 súbory: `A/components/RecoveryAppPoliciesTable.tsx`, `RecoveryAppPoliciesTable.test.tsx`, `RecoveryAppPolicyHelp.test.tsx`. Závislosti: 3.

Akceptácia:
- Overview obsahuje hodnotu Áno/Nie podľa záznamu vrátane `false`; existujúce poradie ostatných položiek ostáva zachované.
- Create, Edit aj Display používajú rovnaký help vo všetkých troch jazykoch; Escape zatvorí help, vráti focus a nezatvorí rodiča.
- Prezeranie helpu nezmení checkbox ani dirty stav; test explicitne počíta s defaultom nového checkboxu `true`.

Overenie: rozšíriť `commonParameters` v help teste, upraviť očakávané labely Overview a použiť `detailSectionsFields` na kontrolu konkrétnej hodnoty. Spustiť table a help testy. Kontrolný bod po 3–4: celý používateľský tok a lokalizácia sú funkčné.

### 5. Uzavrieť kompatibilitu a regresie

Rozsah S, 1 existujúci súbor: `A/pages/RecoveryAppPoliciesRefetch.test.tsx`. Závislosti: 3, 4.

Akceptácia:
- Existujúci modal test pokrýva `true/false × latest/time_range/exact_time`, explicitný boolean kľúč v reálnom POST payloade a zachovanie napr. timeoutu `600`; samostatný unit test mappera nevytvárať, pokiaľ sa neukáže nepokrytá vetva.
- Integračný test cez skutočný GET hook/mutator, fetch stub a stránku overí staršiu odpoveď bez poľa → Overview Áno → edit checkbox zapnutý; odpoveď s `false` → Nie a nezapnutý checkbox. Nemockovať hook tak, aby sa obišla normalizácia. Pre API absenciu a explicitné `false` je tento test zdrojom dôkazu Zod defaultovania.
- Všetky nižšie uvedené cielené kontroly prejdú; diff neobsahuje zmeny generovaných ani nesúvisiacich súborov.

Overenie: rozšírený refetch test, existujúci modal test a záverečné príkazy. Existujúci `RecoveryAppPoliciesPage.test.tsx` mockuje hook aj modal, preto sám nepreukazuje kompatibilitu legacy API dát.

## Testovacia matica

| Scenár | Dôkaz |
| --- | --- |
| Create default | Checked checkbox a explicitné `true` v JSON requeste |
| Create false | Odškrtnúť, uložiť, vlastný boolean kľúč s hodnotou `false` |
| Edit uloženého false | Zmeniť iba description; checkbox aj request zostanú `false`, timeout `600` |
| True ↔ false | Parameterizované oba smery; timeout pred a po prepnutí rovnaký; návrat k pôvodnému stavu nezanechá falošnú dirty zmenu |
| Overview | Konkrétne pole s lokalizovaným Áno/Nie pre obe hodnoty |
| Legacy odpoveď | Reálny GET cez mutator/Zod doplní `true` pred UI; explicitné `false` sa zachová |
| Help | EN/SK/CS, create/edit/display, varovanie s novou MAC, DHCP a rizikom statickej IP/hostname, focus, Escape, bez zmeny formulára |
| Regresie | Všetky snapshot vetvy, timeout, manuálne režimy, existujúce presné payload assertions |

## Príkazy pre budúcu implementáciu

PowerShell, z koreňa repozitára. Tieto príkazy sú naplánované; pri tvorbe dokumentov sa implementačné testy nespúšťali.

```powershell
$feature = 'src/features/recovery-plans/recovery-policies/application-recovery'
npm exec -- vitest run "$feature/components/RecoveryAppPolicyModal.test.tsx" "$feature/components/RecoveryAppPoliciesTable.test.tsx" "$feature/components/RecoveryAppPolicyHelp.test.tsx" "$feature/pages/RecoveryAppPoliciesRefetch.test.tsx"
npm run typecheck
npm exec -- eslint "$feature/components/RecoveryAppPolicyForm.tsx" "$feature/components/RecoveryAppPolicyModal.tsx" "$feature/components/RecoveryAppPoliciesTable.tsx" "$feature/model/recoveryAppPolicySubmit.ts" "$feature/components/RecoveryAppPolicyModal.test.tsx" "$feature/components/RecoveryAppPoliciesTable.test.tsx" "$feature/components/RecoveryAppPolicyHelp.test.tsx" "$feature/pages/RecoveryAppPoliciesRefetch.test.tsx" --max-warnings 0
node -e 'const fs=require("node:fs"); for (const lang of ["en","sk","cs"]) JSON.parse(fs.readFileSync("src/locales/"+lang+".json","utf8"))'
git diff --check
```

Spúšťať najprv iba súbory relevantné pre danú úlohu; celý uvedený výber raz na záver. Nevolať `npm test`, `npm run build` ani `npm run check`: build v tomto repozitári spúšťa celú testovaciu sadu a ďalšie kontroly. Plný typecheck je výslovne požadovaný. Pri ručnej kontrole overiť vytvorenie, editáciu, Overview a čitateľnosť varovania aj na úzkom zobrazení; nie je potrebné spúšťať obnovu LPAR.

## Riziká a otvorené otázky

| Riziko | Opatrenie |
| --- | --- |
| Vynechané false resetuje hodnotu pri edite | Povinné formulárové pole, explicitný common payload, kontrola skutočného requestu |
| Starší záznam bez poľa | Zod default na API hranici; integračný test neobchádza mutator |
| Regenerácia spravila Output fixtures nekompletnými | Doplniť tri existujúce typované fixtures; nemeniť generované typy |
| Timeout sa stratí pri vypnutí | Žiadne resetovanie, podmienený spread ani odstránenie validácie; kontrola `600` pri false |
| Klon beží súčasne so zdrojom a má pôvodnú IP/hostname | V helpe uviesť požiadavku na novú MAC a odlišnú IP cez DHCP, riziko statickej IP/hostname; politika to sama nevie overiť |
| Staré help texty stále sľubujú vypnutie | Cielene aktualizovať timeout a manual zoning vo všetkých jazykoch |
| Rozdiel medzi zadaním a Git stavom | Zaznamenaný HEAD; pred implementáciou znovu status/diff, žiadny reset alebo stash používateľovej práce |

Žiadna otvorená funkčná otázka neblokuje tento návrh. BE implementácia v commite `12136ce` bola skontrolovaná cez Rel.AI; pred produkčným nasadením treba osobitne potvrdiť jej dostupnosť na cieľovom prostredí. Revízia plánu bola vykonaná cez Rel.AI v ABCO FE, bez spustenia implementácie alebo DAG obnovy.

Používateľ schválil vykonanie plánu inline 2026-11-04. Implementácia a automatické overenie sú dokončené; výsledky a zostávajúce manuálne kroky sú zaznamenané v TODO. Zmeny sa odovzdávajú atomickým commitom podľa AGENTS.md, bez push/merge.
