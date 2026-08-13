# Frontendový technologický radar pre ABCO

## Účel radaru

Radar je širší znalostný prehľad schopností používaných v moderných frontendových aplikáciách. Nie je to zoznam balíkov, ktoré treba všetky nainštalovať. Každá položka odpovedá na štyri otázky:

1. Aký nový problém rieši?
2. Čo automatizuje alebo odvodzuje?
3. Ako súvisí s ABCO?
4. Kedy ju zaradiť a kedy nie?

## Stupne radaru

- **Adoptovať:** vhodné pre aktuálnu architektúru a prináša okamžitú hodnotu.
- **Pilotovať:** overiť na malej, reprezentatívnej časti aplikácie.
- **Sledovať:** užitočné až po splnení konkrétnej podmienky.
- **Nezavádzať teraz:** legitímna technológia, ale momentálne nesprávny trade-off.

## Rýchla mapa

| Oblasť | Schopnosť | Stav pre ABCO |
|---|---|---|
| API | OpenAPI code generation cez Orval | Adoptovať po doplnení response schém |
| API | OpenAPI drift a breaking-change kontrola | Adoptovať |
| API | Runtime validácia API odpovedí | Pilotovať |
| API | Generované MSW mocky a fixtures | Pilotovať |
| API | Consumer-driven contract tests | Sledovať |
| Formuláre | Zod ako zdroj validácie a typov | Adoptovať postupne |
| Formuláre | Celé formuláre generované zo schémy | Nezavádzať teraz |
| UI | Storybook component workshop | Pilotovať |
| UI | Vizuálne regresné testy | Pilotovať |
| UI | Design tokens | Sledovať |
| Testovanie | Playwright E2E | Pilotovať |
| Testovanie | Automatická accessibility kontrola | Pilotovať |
| Testovanie | Property-based testy | Sledovať |
| Testovanie | Mutation testy | Sledovať |
| Lokalizácia | Typovo bezpečné translation keys | Adoptovať |
| Architektúra | Dead-code analýza | Pilotovať |
| Architektúra | Automatické hranice feature modulov | Pilotovať |
| Diagnostika | Error monitoring a source maps | Pilotovať |
| Diagnostika | Session replay | Sledovať s vysokou opatrnosťou |
| Release | Feature flags | Sledovať |
| Workflow | Stavové automaty pre wizardy | Sledovať |
| Platforma | Microfrontendy | Nezavádzať teraz |
| Platforma | SSR/full-stack React framework | Nezavádzať teraz |
| Platforma | PWA/offline režim | Nezavádzať teraz |

## 1. API a kontrakty

### 1.1 OpenAPI code generation

**Myšlienka:** backendový OpenAPI dokument nie je iba Swagger dokumentácia pre človeka. Je strojovo čitateľný zdroj, z ktorého možno vytvoriť modely, klienta, query hooky, validačné schémy, testovacie handlery a fixtures.

**Čo je na tom podobné Orvalu:** presne toto je jeho hlavná úloha. Frontend prestáva ručne prepisovať backendový kontrakt.

**ABCO:** najvyššia priorita, ale vyžaduje úplné request a response schémy. Prázdna response schéma negarantuje nič.

**Radar:** Adoptovať po oprave OpenAPI.

### 1.2 Runtime validácia odpovedí

TypeScript typ po buildnutí neexistuje. Ak server vráti inú hodnotu, `as SomeType` ju neopraví ani neskontroluje. Runtime schéma vie odpoveď skutočne parsovať.

Možný model:

- Orval vygeneruje Zod schémy,
- vybrané rizikové endpointy odpoveď parsujú,
- validačná chyba sa zmení na normalizovanú API chybu s názvom endpointu,
- citlivé response body sa neloguje.

Nevýhodou je runtime cena a duplicita kontroly, ak backend už validuje odpoveď. Preto sa nemá bez merania parsovať každá veľká topology odpoveď.

**Radar:** Pilotovať na providers, credentials alebo recovery applications; veľké inventory dáta vyhodnotiť osobitne.

### 1.3 OpenAPI drift a breaking-change detection

Codegen ukáže TypeScript chyby až po vygenerovaní. Diff kontraktu navyše pomenuje, že bolo odstránené pole, zmenený typ alebo sprísnený required parameter.

Výsledkom môže byť report ešte pred tým, než frontend developer začne opravovať následky. Kontrola má porovnávať uloženú schému s novou publikovanou schémou a musí rozlišovať breaking a non-breaking zmeny.

**Radar:** Adoptovať spolu s Orval workflow.

### 1.4 Generované mocky a fixtures

Mock dáta sa nemusia ručne kopírovať do desiatok testov. Z API kontraktu možno vytvoriť:

- MSW handlery,
- platnú default response,
- factories pre zmenené polia,
- chybové, empty a loading scenáre.

Orval má samostatný MSW generator a podporuje response factories: [Orval output configuration](https://orval.dev/docs/reference/configuration/output/).

**ABCO:** vhodné, pretože MSW dependency má zostať pre budúce testovanie. Nevhodné ako skrytá náhrada reálneho API pri normálnom vývoji.

**Radar:** Pilotovať v Storybooku a testoch.

### 1.5 Consumer-driven contract tests

OpenAPI hovorí, aké dáta sú všeobecne povolené. Consumer-driven kontrakt navyše zaznamená konkrétnu minimálnu odpoveď, ktorú frontend skutočne potrebuje.

Pact opisuje frontend ako consumera a API ako providera; consumer test vytvorí kontrakt a provider test overí reálny backend: [Pact introduction](https://docs.pact.io/) a [Pact JS](https://docs.pact.io/implementation_guides/javascript/readme).

**ABCO:** hodnotné, až keď frontend a backend majú spoločný CI workflow alebo Pact Broker. Pri jednom frontende a jednom FastAPI serveri môže byť kvalitná OpenAPI schéma + integračné testy jednoduchšie.

**Radar:** Sledovať; nezavádzať skôr, než backend tím dokáže kontrakt automaticky verifikovať.

## 2. Formuláre a dátové modely

### 2.1 Schema-first formulárová validácia

Zod schéma môže súčasne poskytovať:

- runtime validáciu,
- odvodený TypeScript typ,
- transformácie a normalizáciu,
- jednotné testovanie hraničných hodnôt.

Vzhľad formulára však zostáva v shared komponentoch. Schéma opisuje pravidlá dát, nie layout.

**ABCO:** vhodné pre providers, credentials, recovery groups a policy modaly, ktoré majú create/edit varianty a dirty-state ochranu.

**Radar:** Adoptovať postupne, nie veľkým prepisom.

### 2.2 Form builder generovaný z JSON Schema

Dokáže automaticky vykresliť formulár podľa schémy. Je výborný pre generické konfiguračné formuláre, ale obmedzuje presný layout, wizard flow, preklady a špecifické interakcie.

**ABCO:** iba pre prípadnú budúcu generickú administráciu. Recovery builder, group wizard ani provider modal nie sú vhodnými kandidátmi.

**Radar:** Nezavádzať teraz.

### 2.3 Property-based testovanie normalizácie a mapperov

Namiesto niekoľkých ručne zadaných príkladov testovací nástroj generuje stovky vstupov a kontroluje vlastnosť, napríklad:

- výsledné ID nemá whitespace,
- normalizácia vykonaná dvakrát dá rovnaký výsledok,
- form mapper a inverse mapper zachovajú dáta,
- zoradenie tierov vždy rešpektuje `order`.

**ABCO:** dobrý pilot pre shared normalizáciu ID a recovery application mappery.

**Radar:** Sledovať; pridať až po stabilizácii Orval a E2E základov.

## 3. Komponenty a vizuálny systém

### 3.1 Storybook ako component workshop

Storybook nie je iba galéria komponentov. Story môže byť spustiteľný scenár s props, dátami, používateľskou interakciou a assertions. Oficiálne interaction tests používajú Testing Library a môžu bežať cez Vitest: [Storybook interaction testing](https://storybook.js.org/docs/writing-tests/interaction-testing).

**ABCO prínos:** modaly, detail panely, tabuľky, skeletony, cards a wizard stepper sa dajú vyvíjať izolovane vo svetlej aj tmavej téme.

**Radar:** Pilotovať na shared komponentoch, nezačínať všetkými feature komponentmi.

### 3.2 Vizuálna regresia

Test porovná screenshot so schváleným baseline. Zachytí rozdiely, ktoré DOM assertions nevidia: padding, výšku, overflow, scrollbar, farbu, zalomenie textu alebo polohu tlačidla.

Storybook dokáže každú story zmeniť na visual test: [Storybook visual tests](https://storybook.js.org/docs/writing-tests/visual-testing). Pre interné firemné dáta možno namiesto cloudovej služby použiť lokálne alebo firemne prevádzkované Playwright screenshoty.

**Radar:** Pilotovať na komponentoch, ktoré už v minulosti trpeli layout regresiami.

### 3.3 Design tokens

Token je pomenovaná dizajnová hodnota, napríklad `color.surface.danger`, z ktorej sa generuje CSS premenná, Tailwind hodnota alebo dokumentácia.

Prínos vzniká, keď:

- Figma a kód používajú rovnaký slovník,
- existuje viac tém,
- shared komponenty používa viac aplikácií,
- zmeny dizajnu sa musia propagovať konzistentne.

**ABCO:** najprv konsolidovať existujúce CSS/Tailwind hodnoty do sémantických premenných. Samostatný token generator zaviesť až pri druhom konzumentovi alebo formálnom dizajnovom systéme.

**Radar:** Sledovať.

## 4. Testovanie reálneho používateľského správania

### 4.1 Playwright E2E

Playwright otvorí skutočný browser, prejde routami, vyplní formulár a sleduje výsledok. Jeho locators majú auto-wait a retry mechanizmy: [Playwright locators](https://playwright.dev/docs/locators).

**ABCO:** vhodné pre niekoľko kritických workflow, nie pre každú validáciu každého poľa. Detailnú validáciu nechajú rýchle unit/component testy.

**Radar:** Pilotovať.

### 4.2 Automatizovaná accessibility kontrola

axe vie automaticky odhaliť časť WCAG porušení. Storybook addon funguje na úrovni komponentu a Playwright integrácia na úrovni celej stránky: [Storybook a11y](https://storybook.js.org/docs/writing-tests/accessibility-testing), [Playwright a11y](https://playwright.dev/docs/accessibility-testing).

Automatická kontrola nedokáže potvrdiť, že workflow dáva zmysel používateľovi screen readera. Stále treba manuálny keyboard smoke test.

**Radar:** Pilotovať a postupne nastaviť nové porušenia ako chyby.

### 4.3 Mutation testovanie

Mutation runner zámerne obráti podmienku, zmení číslo alebo odstráni vetvu. Ak testy stále prejdú, pravdepodobne nekontrolujú dané správanie.

**ABCO:** vhodné iba pre kritické čisté funkcie; plošné spustenie nad React UI by bolo pomalé a hlučné.

**Radar:** Sledovať.

## 5. Lokalizácia ako kompilovateľný kontrakt

### 5.1 Typované translation keys

Prekladový kľúč môže byť union odvodený z `en.json`. TypeScript potom odmietne `t('reocvery.aplication')`. Samostatný test porovná množinu kľúčov medzi `en`, `sk` a `cs`.

ABCO môže túto schopnosť pridať do vlastného hooku bez migrácie. Ak by neskôr prešlo na i18next, jeho TypeScript rozšírenia podporujú typed resources a strict key checks: [i18next TypeScript](https://www.i18next.com/overview/typescript).

**Radar:** Adoptovať.

### 5.2 Extrakcia a správa prekladov

Pri väčšom tíme možno automaticky:

- extrahovať používané kľúče,
- odhaliť nepoužité kľúče,
- generovať prekladateľské súbory,
- validovať interpolácie a plurály.

**ABCO:** potreba nastane, keď ručná správa troch JSON súborov začne byť zdrojom častých chýb. Najprv postačí typed key + equality test.

**Radar:** Sledovať.

## 6. Architektonická automatizácia

### 6.1 Dead-code a dependency analýza

TypeScript ani ESLint automaticky nenájdu všetky nepoužité súbory, exporty a npm dependencies. Špecializovaný analyzátor vytvorí report a možno ho neskôr zapojiť ako kontrolu.

**ABCO:** relevantné po viacerých presunoch features, shared komponentov a API vrstiev. Najprv report-only režim, pretože lazy imports a config entry points môžu vyžadovať explicitné výnimky.

**Radar:** Pilotovať.

### 6.2 Vynútené hranice modulov

Architektúrny nástroj vie overiť pravidlá ako:

- `shared` nesmie importovať z `features`,
- feature nesmie siahať do interného priečinka inej feature,
- `pages` môžu skladať komponenty, ale transportná vrstva neimportuje UI,
- cyklické importy sú zakázané.

**ABCO:** veľmi vhodné, pretože aplikácia už má feature-based štruktúru a opakovane riešila konzistentné umiestnenie `api`, `hooks`, `types` a shared komponentov.

**Radar:** Pilotovať po zdokumentovaní povolených smerov importov.

### 6.3 Generátor feature skeletonu

Malý interný generator môže vytvoriť schválenú štruktúru novej feature: `api`, `components`, `hooks`, `model`, `pages`, `types`, testy a public exports.

Nie je vhodné ho zaviesť skôr, než sa štruktúra stabilizuje. Inak iba rýchlejšie vygeneruje nesprávny boilerplate.

**Radar:** Sledovať; zvážiť pri opakovanom zakladaní ďalších modulov.

## 7. Diagnostika správania v browseri

### 7.1 Error monitoring a source maps

Error monitoring zachytí neobslúžené aj explicitne nahlásené chyby, priradí ich release verzii a pomocou source maps zobrazí pôvodný TypeScript stack. Sentry je jeden príklad tejto kategórie a dokumentuje stack traces, breadcrumbs, releases a source maps: [Sentry Error Monitoring](https://sentrydocs.dev/features/error-monitoring).

**ABCO:** vhodné po dohode, či firma používa vlastný alebo SaaS monitoring. Pred odoslaním udalostí treba odstrániť credential hodnoty, request body a infraštruktúrne tajomstvá.

**Radar:** Pilotovať s error capture; replay riešiť osobitne.

### 7.2 Session replay

Replay rekonštruuje DOM a interakcie pred chybou. Sentry štandardne maskuje text, obrázky a inputy, ale stále vyžaduje privacy a security review: [Sentry Session Replay](https://docs.sentry.dev/platforms/javascript/session-replay/).

**ABCO:** credentials, IP adresy, názvy VM a infraštruktúrne údaje zvyšujú riziko. Replay nezapínať, kým nie je potvrdené, čo presne opúšťa internú sieť a ako sa dáta redigujú.

**Radar:** Sledovať s vysokou opatrnosťou.

### 7.3 Frontend performance telemetry

Reálne prehliadače môžu merať načítanie routy, veľkosť a čas API volaní, dlhé tasky alebo renderovanie veľkých tabuliek/topológie. Vývojový profiler ukáže lokálny problém; real-user monitoring ukáže problém na konkrétnych zariadeniach a sieťach.

**ABCO:** zmysluplné až po stanovení konkrétnych metrík, napríklad čas prvého zobrazenia resources alebo interakcie s topology. Bez cieľa vznikne iba množstvo metrík bez rozhodnutia.

**Radar:** Sledovať.

## 8. Riadenie funkcionality

### 8.1 Feature flags

Flag umožní nasadiť kód vypnutý, zapnúť ho vybranej skupine a v prípade problému ho vypnúť bez redeployu. Externé systémy poskytujú targeting, audit a správu životného cyklu. LaunchDarkly opisuje toggle ako circuit breaker pre funkcionalitu: [LaunchDarkly flags](https://launchdarkly.com/docs/home/flags/toggle).

**ABCO:** relevantné, keď budú integrácie nasadzované postupne alebo keď má jedna verzia podporovať rôzne capability backendov. Keycloak roly nenahrádzajú feature flags a frontend flag nenahrádza backend authorization.

**Radar:** Sledovať.

### 8.2 Stavové automaty

Stavový automat explicitne modeluje povolené stavy a prechody. Hodí sa na wizard, v ktorom ďalší krok závisí od validácie, typu resource, načítania dát, submitu a dirty-state potvrdenia.

**ABCO:** recovery group wizard je kandidát iba vtedy, ak bude ďalej rásť o governance, viac typov resource alebo asynchrónne kroky. Pre jednoduchý modal je automat zbytočný.

**Radar:** Sledovať.

## 9. Technológie, ktoré sú teraz nesprávnym smerom

### 9.1 Microfrontendy

Riešia nezávislé tímy, deploymenty a vlastníctvo častí veľkého produktu. ABCO má jeden frontend a zrozumiteľnú feature štruktúru. Microfrontend by pridal zložité zdieľanie autentizácie, dizajnu a dependencies.

**Radar:** Nezavádzať teraz.

### 9.2 SSR alebo full-stack React framework

Server rendering je užitočný pre SEO, verejný obsah alebo špecifické performance požiadavky. Interná Keycloak aplikácia tieto dôvody momentálne nemá.

**Radar:** Nezavádzať teraz.

### 9.3 PWA/offline režim

Recovery a infraštruktúrne operácie potrebujú aktuálny serverový stav. Cacheovaný offline obsah môže používateľovi ukázať neaktuálne resources alebo status. Offline režim by vyžadoval samostatný návrh synchronizácie, konfliktov a bezpečnosti.

**Radar:** Nezavádzať teraz.

### 9.4 GraphQL migrácia

GraphQL má vlastný silný codegen ekosystém, ale REST API už publikuje OpenAPI. Meniť transport iba kvôli generovaniu typov by neprinieslo primeranú hodnotu.

**Radar:** Nezavádzať teraz.

## Odporúčaný radar review

Radar má byť živý rozhodovací dokument, nie zoznam trendov. Revidovať ho je vhodné:

- po dokončení Orval pilotu,
- po zavedení Keycloaku,
- pri prvom GitLab CI pipeline,
- pri vzniku druhého frontendového tímu alebo aplikácie,
- keď sa opakuje rovnaký typ regresie aspoň dvakrát.

Pri každej revízii treba presunúť iba položku, pre ktorú existuje konkrétny problém, vlastník a merateľné kritérium úspechu.
