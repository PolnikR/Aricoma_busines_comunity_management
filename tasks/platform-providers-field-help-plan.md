# Plán: Platform Providers – kontextové nápovedy

Dátum: 27. 10. 2026. Stav: implementované inline, automaticky overené; browser QA zostáva nedokončené.
Následný pokyn používateľa: vytvoriť atómový commit vlastných zmien tejto úlohy. Tento pokyn nahrádza pôvodný zákaz commitu; push nebol požadovaný.
Checklist: [platform-providers-field-help-todo.md](platform-providers-field-help-todo.md).
Samostatné umiestnenie schválil používateľ; existujúce `plan.md` a `todo.md` zostávajú zachované.

## Cieľ a hranice

Pridať otázniky pri existujúcich parametroch Platform Providers v Create, Edit a Display podľa lokálneho autoritatívneho dokumentu `C:/Users/polnikr/Downloads/Platform provider parameters.html`, sekcie AIRFLOW, SMTP, BACKEND a KEYCLOAK, stĺpce Effect a Default. Dokument bol prečítaný pri plánovaní; nekopírovať ho do repozitára.

Použiť existujúci `KeyedHelpPopover` s `sections={[]}` a `DetailField.labelHelp`. Žiadny nový helper komponent, systém nápovied, parameter, detailová sekcia alebo refaktoring. Zachovať globálny `platformProviders.help` vrátane prekladov, filtrovanie podľa typu, validáciu, disabled stavy a zmenu typu. Výnimka: BACKEND parameter `swaggerEnabled` nemá byť dostupný vo formulári ani v Display a nemá sa posielať v novom payload-e, keďže ho backend aktuálne nevyužíva. Túto funkčnú zmenu vykonať cielene a pokryť testami. Bez zásahov do Infrastructure Providers, BE alebo generated API. Podľa konkrétneho zadania bez commitu a pushu; tento zákaz má prednosť pred všeobecným pravidlom AGENTS.md o commitovaní.

## Overený stav a závislosť

- CodeGraph bol použitý pred prieskumom kódu. Preskúmané form/modal/table, model formulára, submit mapper, `KeyedHelpPopover`, `DetailField`, `Field`, `CheckboxField`, súvisiace testy a vzory Infrastructure/Snapshot/Recovery App Policies.
- Create a Edit zdieľajú `PlatformProviderForm` cez `PlatformProvidersModal`; detail tvorí `renderPlatformProviderSections` v `PlatformProvidersTable`. Stačia zásahy do existujúcich miest renderovania.
- `Field.label` je string a celý `Field` je HTML label. Nepridávať doň interaktívny otáznik. Použiť lokálny obal a samostatný `<label htmlFor>` vedľa `KeyedHelpPopover`, ako v policy formulároch; input, chyby a ich správanie zachovať. Shared `Field` nemení kontrakt.
- `CheckboxField` tiež renderuje HTML label. Otáznik musí byť jeho súrodenec mimo labelu; zachovať priradenie labelu ku checkboxu, rozloženie a hodnoty vrátane null.
- Slovníky používajú ploché JSON kľúče. `useTranslation` pri chýbajúcom preklade vráti kľúč; testy s mockom hooku preto nestačia na preukázanie načítania EN/SK/CS.
- Súbežne sa mení model, mapper, form/modal a ich testy v úlohe [platform-providers-common-fields-plan.md](platform-providers-common-fields-plan.md). Pri prvom prieskume boli email vo form/detail iba AIRFLOW/BACKEND a interval chýbal; model a mapper už mali obe polia spoločné. Pri opakovanej kontrole pribudli ďalšie zmeny form/modal a testov. Checklist závislosti ešte nie je dokončený. Tento pohyblivý stav nie je dôkazom dokončenia.
- Pred implementáciou znovu skontrolovať status/diff a dostupnosť oboch spoločných polí v Create/Edit/Display. Chýbajúce polia nepridávať v tejto úlohe. Zaznamenať presnú chýbajúcu kombináciu typ/pole/pohľad; nadviazať na stabilný výsledok samostatnej implementácie. Dovtedy možno pripraviť preklady a nápovedy už existujúcich polí, avšak neoznačiť celú cieľovú maticu za splnenú.
- Súbežné úpravy neprepisovať, nevracať späť, nestashovať ani nepreberať do vlastného diffu. Pred každým zápisom znovu prečítať aktuálny dotknutý úsek.

## Cieľová mapa nápovied

Jeden spoločný prefix na parameter: `platformProviders.fieldHelp.<parameter>`. V každom jazyku má presne suffixy `trigger`, `title`, `intro`. Rovnaký prefix v Create/Edit/Display aj medzi typmi.

| Typ | Parametre | Počet |
| --- | --- | --- |
| AIRFLOW | url, notificationEmail, cacheRefreshSeconds, ipAddress, port, credentialId, dagDir | 7 |
| SMTP | url, notificationEmail, cacheRefreshSeconds, ipAddress, port, fromEmail, disableSsl, disableTls | 8 |
| BACKEND | url, notificationEmail, cacheRefreshSeconds, loggingEnabled, jwtEnabled | 5 |
| KEYCLOAK | url, notificationEmail, cacheRefreshSeconds, credentialId, realm, clientId | 6 |

Ide o cieľ po dostupnosti spoločných polí. Pri id, name, description, type a odvodenom credentialStatus žiadna nová poľová nápoveda. Pri nevybranom type zachovať existujúce zobrazené polia a typové vetvenie; nevymýšľať nový režim formulára.

Spolu 14 jedinečných parametrov × 3 suffixy = **42 nových kľúčov na jazyk**, 126 záznamov v EN/SK/CS. Pred zápisom overiť, či časť už nepribudla súbežne; reportovať skutočný prírastok. Parita novej množiny je povinná. Skontrolovať aj celkové množiny kľúčov; prípadné východiskové rozdiely mimo rozsahu doložiť, neopravovať plošne bez dohody a netvrdiť úplnú paritu, pokiaľ neplatí.

## Obsahový kontrakt pre EN/SK/CS

Texty majú byť prirodzené vysvetlenia, nie doslovné preklady. Všetky tri jazyky musia zachovať tieto významy:

| Parameter | Povinný význam a relevantný default |
| --- | --- |
| url | Základná adresa webového/REST rozhrania. Pri SMTP ide o voliteľný odkaz na webové rozhranie servera, nie adresu relay spojenia. Predvolene nenastavená. |
| notificationEmail | Platná emailová adresa pre upozornenia pri zlyhaniach poskytovateľa, predvolene nenastavená. Neprisudzovať všetkým platformovým typom konkrétny automatický notifikačný tok, ktorý zdroj nepreukazuje. |
| cacheRefreshSeconds | Interval discovery cache v sekundách, kladné celé číslo. Prázdna hodnota použije predvolené nastavenie backendu pre daný typ; nevymýšľať číselný default ani aktivitu discovery pre každý typ. |
| ipAddress | Host/IP poskytovateľa: AIRFLOW pre SSH/SFTP prenos DAGov; SMTP adresa relay servera. Predvolene nenastavená. |
| port | AIRFLOW SSH/SFTP port pre odosielanie DAGov; SMTP relay port. Dokumentovaný default 22, nevymýšľať odlišný SMTP default. Jeden spoločný kľúč vysvetlí oba kontexty. |
| credentialId | Odkaz na uložené prihlasovacie údaje potrebné pre AIRFLOW/KEYCLOAK. Vyhodnocujú sa pri požiadavke; stav môže byť ok/chýbajúce/nenastavené. Bez zobrazenia tajomstiev. Predvolene nenastavené. |
| dagDir | Povinný adresár na Airflow serveri, do ktorého ABCO odosiela DAG súbory; nie lokálna cesta vo FE. |
| fromEmail | Adresa odosielateľa SMTP. Uložený konfiguračný záznam; Airflow smtp_default sa konfiguruje samostatne a ABCO ho týmto neaktualizuje. |
| disableSsl | true eviduje vypnutie SSL pre SMTP spojenie. Nastavenie je iba evidované; príslušnú Airflow SMTP konfiguráciu treba nastaviť samostatne. |
| disableTls | true eviduje vypnutie STARTTLS. Nezamieňať so SSL; uloženie nemení Airflow smtp_default. |
| loggingEnabled | Evidovaný prepínač logovania backendu; funkčné zapojenie je plánované. Neprezentovať ako aktuálne aktívny prepínač. |
| jwtEnabled | true vyžaduje overený Keycloak JWT s výnimkou podporovanej servisnej autentifikácie cez X-User. Potrebný KEYCLOAK provider; pri jeho absencii sa požiadavky odmietajú. Pri false sa identita berie z X-User. |
| realm | Povinný Keycloak realm pre identity, roly, synchronizáciu a overovanie JWT. Predvolene nenastavený. |
| clientId | Identifikátor Keycloak klienta reprezentujúceho ABCO backend; roly v tokene sa čítajú z resource_access.<clientId>.roles. Zdroj uvádza vytvorenie chýbajúceho klienta pri štarte; nevymýšľať predvolený názov. |

`swaggerEnabled` nie je súčasťou cieľovej mapy nápovied: podľa BE dokumentácie sa hodnota síce ukladá, ale backend ju nečíta a `/docs` je dostupné nezávisle od nej. Preto ju nezobrazovať vo FE (Create/Edit/Display), neposielať v nových submit payloadoch a nepridávať `platformProviders.fieldHelp.swaggerEnabled.*`.

Nullable boolean parametre majú v HTML default none. Nápoveda nesmie zamieňať nenastavené s false. Texty vysvetľujú BE stav zo zdroja, nemenia FE validáciu ani nastavenia.

## Poradie a checkpointy

T1 potvrdenie integračného stavu → T2 lokalizácia → checkpoint A → T3 AIRFLOW/spoločné existujúce polia → T4 SMTP → checkpoint B → T5 BACKEND/KEYCLOAK → T6 regresie/lokalizačné načítanie → checkpoint C.

Pred T5 odstrániť existujúci `swaggerEnabled` z BACKEND formulára, DetailView a submit mappera; pri úprave editovania zabezpečiť, aby sa hodnota znova neprenášala do payloadu. Generated API schému ani BE nemeniť. Aktualizovať existujúce testy formulára, detailu, mappera a typového kontraktu; ponechať ostatné BACKEND polia. T3–T5 sú vertikálne rezy: pre daný typ funguje formulár aj detail s príslušnými testami. Spoločné kľúče a credential field sa vytvoria raz a následné rezy ich znovu použijú. Každá úloha má najviac päť súborov; presné akceptačné kritériá a príkazy sú v checkliste. Testy správania doplniť pred príslušnou minimálnou úpravou a overiť po nej. Plán nepredpokladá plošný build alebo celú suite.

Pracovať sekvenčne: všetky typy zdieľajú form/table, testy a slovníky; paralelné zápisy by kolidovali. Samostatná kontrola prekladov môže prebiehať nezávisle po ustálení kľúčov, bez súbežného editovania rovnakých súborov.

## Riziká a ošetrenie

| Riziko | Dopad | Ošetrenie |
| --- | --- | --- |
| Nedokončené spoločné polia | Neúplná matica | Samostatná závislosť, žiadne dopĺňanie polí v tejto úlohe. |
| Súbežný zápis do rovnakých súborov | Strata práce | Aktuálny status/diff a koordinácia konkrétnych zápisov; žiadne reset/stash. |
| Otáznik vnorený do labelu | Zmena checkboxu/focusu | Súrodenecký button mimo labelu, interakčný test. |
| Testy používajú mock prekladov | Falošné potvrdenie lokalizácie | Samostatný test reálneho jazykového kontextu a JSON parity. |
| Uložené BE prepínače opisované ako funkčné | Zavádzajúca nápoveda | Logging a SMTP vysvetľovať podľa aktuálneho správania; `swaggerEnabled` úplne vynechať z FE UI a nových payloadov. |
| Nová nápoveda zmení selektory testov | Strata regresného pokrytia | Zachovať názvy inputov a presné assertions; nehľadať Save neurčitým názvom, ktorý trafí help trigger. |

## Overenie a otvorené body

Počas plánovania sa čítali podklady a Git status; implementačné testy ani build neboli spustené. Overiť dokumenty kontrolou štruktúry, interných odkazov a whitespace cez `git diff --no-index --check -- /dev/null <nový-súbor>`.

- Používateľ schválil vykonanie aktuálnej verzie plánu inline a požiadal o kompaktné otázniky podľa Providers.
- Pred implementáciou potvrdiť stav samostatnej úlohy spoločných polí a vlastníctvo zdieľaných úsekov. Nevyžaduje sa nové produktové rozhodnutie, ak už sú polia dostupné.
- Pri implementácii vykonať manuálnu kontrolu v prehliadači, ak je dostupný: štyri typy, Create/Edit/Display, EN/SK/CS, úzky viewport, Tab/Enter/Escape, scroll a návrat focusu. Nedostupnosť uviesť ako neoverený limit.
- Záverečný implementačný report: iba vlastné zmenené súbory, skutočná matica parametrov, počet nových kľúčov podľa jazykov, presné výsledky focused testov/lintu a chýbajúce polia alebo rozdiely oproti BE. Kompletná suite a production build sa štandardne nespúšťajú.

## Záznam vykonania – 27. 10. 2026

- Implementované na vetve `spike/ant-design-shell` v normálnom checkoute podľa pokynu inline. Pred zápisom boli v statuse iba tieto dva plánovacie dokumenty. Samostatná implementácia spoločných polí už bola integrovaná; všetky typy majú email a cache interval vo formulári aj detaile. Žiadne nové polia sa nepridávali.
- Baseline: 76/76 testov v piatich explicitných Platform Providers súboroch. EN/SK/CS mali po 2870 kľúčov. Teraz majú po 2912: **42 nových kľúčov na jazyk**, 126 záznamov spolu. Celkové množiny sú zhodné, pôvodné hodnoty vrátane `platformProviders.help` zostali zachované.
- Nápovedy v Create/Edit/Display: AIRFLOW 7, SMTP 8, BACKEND 5, KEYCLOAK 6 podľa mapy. Rovnaké kľúče aj obsah. Štýly labelov používajú rovnaké `gap-1.5`, `mb-1.5`, help wrapper `h-4` ako Infrastructure Providers; formulár `space-y-3`, riadky `gap-y-3`. Otázniky sú mimo HTML labelov.
- Swagger krok bol rozdelený na model/mapper/contract a ich testy (päť súborov), potom UI a component testy. Legacy GET hodnota sa môže naďalej objaviť v raw JSON, ale nie vo formulári/DetailView ani v novom submit payloade. Generated API a BE zostali nezmenené.
- RED potvrdený pre chýbajúce nápovedy a legacy Swagger payload; následne GREEN. Súhrnný focused beh šiestich súborov: **108/108**. Po ďalšom rozšírení presných payload-after-help assertions pre všetky typy, create interakcií a BACKEND checkboxov znovu overené dva dotknuté súbory: **52/52**. Boolean testy teraz prechádzajú oba typy a v každom true/false/null (namiesto troch samostatných SMTP testov).
- Lokalizačný test má 12 prípadov vrátane reálneho načítania cez `LanguageProvider` a otvorenia nápovede v EN/SK/CS. Testy kontrolujú typové filtrovanie, rovnaké texty, absenciu zakázaných otáznikov, zachovanie globálneho helpera, nezmenené checkboxy po klik/Enter/Space a nezmenený submit okrem odstránenia Swagger parametra.
- Focused ESLint všetkých 11 zmenených TS/TSX súborov: exit 0. Po posledných testových úpravách opäť oba dotknuté testy: exit 0. `git diff --check` pre feature a locales: exit 0; iba upozornenia na LF/CRLF podľa existujúceho nastavenia.
- Nezávislé read-only review: bez konkrétnych nálezov; dodatočne 25 úspešných testov locales/mapper/contract.
- Browser QA nedokončené: Chrome DevTools MCP nie je dostupný. Computer Use našiel Edge s localhost:5173, ale cieľ bol prekrytý Explorerom a aktiváciu/navigáciu zablokovala geometria cieľa a aktívny používateľský vstup. Vzhľad formulára, úzky viewport, scroll a vizuálny focus preto zostávajú manuálne neoverené. Táto limitácia nemení výsledky automatických testov.
- Kompletná suite, full typecheck, produkčný build ani živý submit sa nespúšťali. Bez commitu, pushu a zmeny vetvy. Pri uzavretí aplikovaný skill `finishing-a-development-branch` s výslovnou preferenciou ponechať inline zmeny; focused pravidlá AGENTS a konkrétny zákaz commitu/pushu majú prednosť pred jeho všeobecným full-suite/merge postupom.

### Skutočne spustené verifikačné príkazy

Zmenené súbory (cesty komponentov/modelov/helperov pod `src/features/platform-administration/platform-providers/`):

- `components/PlatformProviderForm.tsx`, `components/PlatformProvidersTable.tsx`.
- `components/PlatformProviderForm.test.tsx`, `components/PlatformProvidersModal.test.tsx`, `components/PlatformProvidersTable.test.tsx`.
- `model/platformProviderForm.ts`, `model/platformProviderTypes.ts`, `model/platformProviderTypes.test.ts`.
- `helpers/platformProviderSubmitMapper.ts`, `helpers/platformProviderSubmitMapper.test.ts`.
- `src/locales/en.json`, `src/locales/sk.json`, `src/locales/cs.json`, nový `src/locales/platformProviderFieldHelpTranslations.test.ts`.
- Tento plán a `tasks/platform-providers-field-help-todo.md`.



~~~powershell
node node_modules/vitest/vitest.mjs run src/locales/platformProviderFieldHelpTranslations.test.ts src/features/platform-administration/platform-providers/components/PlatformProviderForm.test.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersModal.test.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx src/features/platform-administration/platform-providers/helpers/platformProviderSubmitMapper.test.ts src/features/platform-administration/platform-providers/model/platformProviderTypes.test.ts --reporter=dot
node node_modules/vitest/vitest.mjs run src/features/platform-administration/platform-providers/components/PlatformProviderForm.test.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersModal.test.tsx --reporter=dot
node node_modules/eslint/bin/eslint.js src/features/platform-administration/platform-providers/components/PlatformProviderForm.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersTable.tsx src/features/platform-administration/platform-providers/components/PlatformProviderForm.test.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersModal.test.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx src/features/platform-administration/platform-providers/model/platformProviderForm.ts src/features/platform-administration/platform-providers/model/platformProviderTypes.ts src/features/platform-administration/platform-providers/model/platformProviderTypes.test.ts src/features/platform-administration/platform-providers/helpers/platformProviderSubmitMapper.ts src/features/platform-administration/platform-providers/helpers/platformProviderSubmitMapper.test.ts src/locales/platformProviderFieldHelpTranslations.test.ts --max-warnings 0
node node_modules/eslint/bin/eslint.js src/features/platform-administration/platform-providers/components/PlatformProviderForm.test.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersModal.test.tsx --max-warnings 0
git diff --check -- src/features/platform-administration/platform-providers src/locales
~~~
