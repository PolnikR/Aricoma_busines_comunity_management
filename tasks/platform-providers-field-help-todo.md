# Checklist: Platform Providers – kontextové nápovedy

Plán a obsahový kontrakt: [platform-providers-field-help-plan.md](platform-providers-field-help-plan.md).
Stav: implementované a automaticky overené; manuálne browser kontroly zostávajú neoverené. Bez commitu a pushu podľa zadania.
Používateľ následne požiadal o commit vlastných zmien; pôvodný zákaz commitu už neplatí. Push nebol požadovaný.

Cesty `components/`, `model/` a `helpers/` nižšie sú relatívne k `src/features/platform-administration/platform-providers/`. Príkazy sa spúšťajú z koreňa repozitára.

## T1: Potvrdenie integračného stavu

**Popis:** Skontrolovať aktuálny diff a dostupnosť spoločných polí oproti samostatnému common-fields plánu. Zaznamenať stabilný východiskový stav pred zápisom do spoločných súborov.

**Akceptačné kritériá:**
- [x] Zaznamenaná dostupnosť notificationEmail/cacheRefreshSeconds pre každý typ v Create/Edit/Display; chýbajúce kombinácie majú explicitnú závislosť, bez pridávania polí.
- [x] Vlastníctvo súbežných zmien a integračný bod sú jasné; pôvodná práca je zachovaná.
- [x] Zmeraná východisková množina locale kľúčov EN/SK/CS a existujúce platformProviders.help hodnoty na porovnanie po implementácii.

**Overenie:**
- [x] `git status --short` a cielený `git diff` dotknutých súborov; kontrola aktuálneho renderovania cez CodeGraph.
- [x] Baseline: `node node_modules/vitest/vitest.mjs run src/features/platform-administration/platform-providers/components/PlatformProviderForm.test.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersModal.test.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx src/features/platform-administration/platform-providers/helpers/platformProviderSubmitMapper.test.ts src/features/platform-administration/platform-providers/model/platformProviderTypes.test.ts`; prípadné chyby oddeliť od novej práce, neopravovať nesúvisiace príčiny.

**Závislosti:** Žiadne pre analýzu; spoločné polia sú externá závislosť úplnej cieľovej matice.
**Súbory pravdepodobne menené (S, 1–2):** tento plán a checklist, iba zistenia a výsledky.

## T2: Lokalizované texty nápovied

**Popis:** Pripraviť všetkých 14 parametrov podľa obsahového kontraktu plánu, prirodzene v EN/SK/CS. `swaggerEnabled` neprekladať ani mu nepridávať nápovedu.

**Akceptačné kritériá:**
- [x] Každý parameter má neprázdne trigger/title/intro pod platformProviders.fieldHelp; cieľ 42 kľúčov na jazyk a rovnaká nová množina v EN/SK/CS.
- [x] Zachované významy zdroja vrátane portu 22, cache fallbacku, evidovaných SMTP/logging nastavení; Swagger prepínač z UI vyradiť a JWT výnimky; spoločné parametre používajú jeden prefix.
- [x] Existujúci platformProviders.help aj ostatné preklady sú nezmenené vlastnou úpravou; celková parita overená, východiskové rozdiely zdokumentované.

**Overenie:**
- [x] Pridať a spustiť `node node_modules/vitest/vitest.mjs run src/locales/platformProviderFieldHelpTranslations.test.ts`: JSON parse, presná nová množina kľúčov, neprázdnosť a porovnanie EN/SK/CS; explicitné assertions dôležitých obsahových významov podľa jazyka.
- [x] `node node_modules/eslint/bin/eslint.js src/locales/platformProviderFieldHelpTranslations.test.ts --max-warnings 0`

**Závislosti:** T1.
**Súbory (M, 4):** src/locales/en.json, sk.json, cs.json, nový src/locales/platformProviderFieldHelpTranslations.test.ts.

## Checkpoint A: Obsah a integračný bod

- [x] T1–T2 overené; chýbajúce spoločné polia nie sú skryté ani doplnené mimo rozsahu.
- [x] Texty vychádzajú z Effect/Default; locale testy neobchádzajú rozdiely medzi jazykmi.

## T3: AIRFLOW a existujúce spoločné polia

**Popis:** Pridať nápovedy url/notificationEmail/cacheRefreshSeconds tam, kde polia už existujú, a AIRFLOW ipAddress/port/dagDir/credentialId vo formulári aj detaile. Credential field a spoločné prefixy pripraviť na znovupoužitie.

**Akceptačné kritériá:**
- [x] AIRFLOW má presnú dostupnú množinu z plánu v Create/Edit/Display, bez nápovied id/name/description/type/credentialStatus; chýbajúce polia sú evidované.
- [x] Každý otáznik otvorí správny obsah; rovnaké helpKey v troch pohľadoch. Žiadne vnorenie do labelu ani nový helper komponent.
- [x] Zachované hodnoty, label associations, chyby, disabled stavy a credential loading/error/missing správanie; klik na help nemení formulár ani nespúšťa submit.

**Overenie:**
- [x] Doplniť behavior testy a spustiť `node node_modules/vitest/vitest.mjs run src/features/platform-administration/platform-providers/components/PlatformProviderForm.test.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersModal.test.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx`.
- [ ] Manuálne AIRFLOW Create/Edit/Display: otáznik vedľa labelu, bez zmeny layoutu a focusu inputu kliknutím na help.

**Závislosti:** T2; dostupnosť spoločných polí podľa T1. Nadviazať iba na stabilné úseky súbežnej práce.
**Súbory (M, 5):** components/PlatformProviderForm.tsx, PlatformProvidersTable.tsx a ich testy; components/PlatformProvidersModal.test.tsx.

## T4: SMTP

**Popis:** Doplniť SMTP ipAddress/port/fromEmail/disableSsl/disableTls; spoločné nápovedy z T3 znovu použiť.

**Akceptačné kritériá:**
- [x] SMTP má presnú dostupnú množinu nápovied v Create/Edit/Display; nemá credentials, dagDir ani BACKEND/KEYCLOAK nápovedy.
- [x] Otázniky disableSsl/disableTls sú mimo HTML labelu. Klik/Enter/Space na help nemení checkbox, formulár ani neodosiela modal; funguje aj pôvodne true/false/nenastavené nastavenie.
- [x] Texty rozlišujú SSL a STARTTLS a vysvetľujú samostatnú Airflow konfiguráciu; detail a formulár majú rovnaký obsah, existujúce payload assertions ostávajú presné.

**Overenie:**
- [x] Rozšíriť a spustiť tie isté tri explicitné Vitest súbory ako v T3.
- [ ] Manuálna kontrola SMTP checkboxov, oddeleného help triggeru a zachovania layoutu.

**Závislosti:** T3.
**Súbory (M, 5):** rovnaké dva komponenty a tri testové súbory ako T3; žiadne zmeny modal logiky.

## Checkpoint B: AIRFLOW/SMTP

- [x] T3–T4 testy prešli, typové vetvenie a presné payloady zostali zachované.
- [x] Help interakcie nemenia hodnoty ani checkboxy; globálna nápoveda ostáva dostupná.

## T5: BACKEND a KEYCLOAK

**Popis:** Pridať BACKEND nápovedy pre loggingEnabled/jwtEnabled a KEYCLOAK realm/clientId; existujúci credential field z T3 poskytne rovnakú credentialId nápovedu pre KEYCLOAK. Zároveň odstrániť aktuálne nepotrebný `swaggerEnabled` z BACKEND Create/Edit, Display a submit payloadu, bez zmeny BE/generated API.

**Akceptačné kritériá:**
- [x] Oba typy majú presnú dostupnú množinu z plánu v troch pohľadoch, bez polí iných typov; KEYCLOAK používa rovnaký credentialId prefix ako AIRFLOW.
- [x] BACKEND otázniky sú mimo checkbox labelov; testy preukážu nezmenený stav po help interakcii a správne odlíšenie null/false/true pre zostávajúce prepínače.
- [x] `swaggerEnabled` sa nezobrazuje pri BACKEND v Create/Edit/Display a neodosiela sa v submit payloade; existujúce testy mappera/typového kontraktu a detailu sú aktualizované.
- [x] Texty nezavádzajú o logging; JWT vysvetľuje Keycloak aj servisnú výnimku a realm/clientId svoje využitie. Žiadny `swaggerEnabled` helper sa nepridáva.

**Overenie:**
- [x] Rozšíriť a spustiť tie isté tri explicitné Vitest súbory ako v T3 pre oba typy.
- [ ] Manuálne BACKEND/KEYCLOAK Create/Edit/Display, obsah nápovied a checkbox interakcie.

**Závislosti:** T4 (zdieľané súbory); T3 credential field.
**Súbory:** spoločné komponenty a ich testy z T3; kvôli odstráneniu `swaggerEnabled` aj `helpers/platformProviderSubmitMapper.ts`, `model/platformProviderTypes.ts` a súvisiace testy (rozdeliť na menšie sekvenčné kroky).

## T6: Lokalizačné načítanie a záverečné regresie

**Popis:** Overiť reálne načítanie jazykov a uzavrieť maticu všetkých typov/pohľadov bez zásahov do generated API alebo BE; jediná výnimka v submit mapovaní je vypustenie `swaggerEnabled`. Doplniť iba chýbajúce assertions, neprepisovať existujúcu testovaciu architektúru.

**Akceptačné kritériá:**
- [x] Test s reálnym jazykovým kontextom otvorí platformový help v EN/SK/CS a overí preložený trigger/title/intro bez raw kľúčov alebo fallback maskovania. Existujúce mock-hook testy sa za tento dôkaz nepovažujú.
- [x] Pre každý typ Create/Edit/Display overené prítomné aj zakázané otázniky, zachovanie globálneho helpera, správanie pri zmene typu a presný payload po otvorení/zavretí help; žiadne nové polia/sekcie; jediná úmyselná zmena existujúceho API payloadu je vypustenie `swaggerEnabled`.
- [x] Report obsahuje vlastné súbory, skutočnú maticu a prírastok kľúčov, výsledky príkazov, limity browser QA a závislosti; nedokončená externá závislosť nie je označená ako hotová.

**Overenie:**
- [x] `node node_modules/vitest/vitest.mjs run src/locales/platformProviderFieldHelpTranslations.test.ts src/features/platform-administration/platform-providers/components/PlatformProviderForm.test.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersModal.test.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx src/features/platform-administration/platform-providers/helpers/platformProviderSubmitMapper.test.ts src/features/platform-administration/platform-providers/model/platformProviderTypes.test.ts`
- [x] `node node_modules/eslint/bin/eslint.js src/features/platform-administration/platform-providers/components/PlatformProviderForm.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersTable.tsx src/features/platform-administration/platform-providers/components/PlatformProviderForm.test.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersModal.test.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx src/locales/platformProviderFieldHelpTranslations.test.ts --max-warnings 0`
- [x] `git diff --check -- src/features/platform-administration/platform-providers src/locales`; kontrola vlastných hunkov oproti zaznamenanému baseline, bez prepisu súbežnej práce.
- [ ] Manuálna kontrola štyroch typov, Create/Edit/Display, EN/SK/CS, úzkeho viewportu, Tab/Enter/Escape a focusu; ak nedostupná, explicitne uviesť ako neoverené.

**Závislosti:** T5 a dokončenie spoločných polí pre úplnú maticu.
**Súbory (M, najviac 5):** tri component testy, src/locales/platformProviderFieldHelpTranslations.test.ts a tento checklist s výsledkami. Mapper/model testy iba spustiť.

## Checkpoint C: Pripravené na odovzdanie

- [x] T1–T6 kritériá splnené alebo konkrétne externé blokery a neoverené kontroly jasne vykázané; úplné dokončenie tvrdiť len pri splnenej cieľovej matici.
- [x] Relevantné Vitest testy, focused ESLint a whitespace kontrola úspešné; kompletná suite a production build sa nespúšťajú, ak nevznikne odôvodnená širšia potreba.
- [x] Zmeny zostali v autorizovanom rozsahu; bez commitu a pushu.

## Pred implementáciou

- [x] Používateľ schválil vykonanie aktuálnej verzie plánu inline a kompaktné rozostupy podľa Providers.

Výsledky, presné príkazy a limity sú v sekcii Záznam vykonania v pláne.
