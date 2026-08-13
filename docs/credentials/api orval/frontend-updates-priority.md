# Prioritizované frontendové zlepšenia pre ABCO

## Účel dokumentu

Tento dokument nie je checklist nasadenia do produkcie ani zoznam alternatív k Orvalu. Zachytáva moderné frontendové postupy, ktoré prinášajú podobný typ prínosu ako Orval: odstraňujú ručné prepisovanie informácií, vytvárajú nový zdroj automatickej kontroly alebo výrazne zlepšujú diagnostiku aplikácie.

Odporúčania sú zoradené podľa prínosu pre aktuálny ABCO frontend, ktorý používa React, Vite, TypeScript, TanStack Query, Zod, Vitest, Testing Library, vlastné preklady a znovupoužiteľné shared komponenty.

## Ako čítať priority

- **P0 – bezprostredný základ:** vysoký prínos a priamo nadväzuje na existujúcu architektúru.
- **P1 – odporúčaný pilot:** vhodné zaviesť na jednej feature a až následne rozšíriť.
- **P2 – neskôr alebo podmienene:** užitočné až pri konkrétnom probléme alebo väčšom tíme.
- **Nezavádzať teraz:** technológia je legitímna, ale pre aktuálnu aplikáciu by pridala viac zložitosti než hodnoty.

## Odporúčané poradie

### P0. OpenAPI ako skutočný zdroj API kontraktu

Orval má zmysel až vtedy, keď OpenAPI dokument obsahuje presné request aj response schémy. Aktuálne známe prázdne `200` response schémy by vygenerovali iba nepresné alebo nepoužiteľné typy.

Po doplnení backendových schém má frontend automaticky generovať:

- dátové modely,
- API funkcie,
- TanStack Query query a mutation hooky,
- query keys,
- prípadne Zod schémy a MSW handlery.

Generovaný kód sa nebude ručne upravovať. Vlastná logika zostane v tenkej vrstve nad generovaným klientom. Detailný postup už opisujú dokumenty `implementation-phases-sk.md` a `implementation-phases.md`.

**Nová schopnosť:** zmena backendového kontraktu sa premietne do TypeScript chýb namiesto neskorej runtime chyby.

### P0. Kontrola driftu a breaking changes OpenAPI kontraktu

Samotné generovanie nestačí. Treba automaticky rozpoznať dve situácie:

1. backendová OpenAPI schéma sa zmenila, ale generovaný klient nie je aktuálny,
2. nová schéma obsahuje breaking change, napríklad odstránené pole alebo zmenu required/optional.

Praktický výsledok má byť:

- príkaz na stiahnutie a vygenerovanie klienta,
- kontrola, že po generovaní nevznikne necommitnutý rozdiel,
- porovnanie predchádzajúcej a novej OpenAPI schémy,
- čitateľný report o breaking changes.

Toto je samostatná schopnosť nad Orvalom, nie jeho náhrada. Orval vytvorí klienta; contract-diff nástroj vysvetlí, čo sa v rozhraní zmenilo.

### P0. Typovo bezpečné preklady bez zmeny existujúceho UI

ABCO používa vlastný `useTranslation` a JSON súbory `en`, `sk` a `cs`. Aktuálny stringový kľúč môže byť preklep a chýbajúci preklad sa prejaví až v aplikácii.

Odporúčaná schopnosť:

- odvodiť TypeScript typ všetkých povolených kľúčov z referenčného locale,
- povoliť `t()` iba s existujúcim kľúčom,
- automaticky overiť, že všetky jazyky obsahujú rovnakú množinu kľúčov,
- hlásiť chýbajúce a nadbytočné kľúče.

Na tento krok nie je nutné migrovať na i18next. Rovnaký princíp sa dá zaviesť nad existujúcim prekladovým riešením. i18next je relevantný až vtedy, ak bude potrebná pluralizácia, namespaces, lazy-loading prekladov alebo pokročilé formátovanie. Oficiálna dokumentácia potvrdzuje podporu typovo bezpečných kľúčov a návratových typov: [i18next TypeScript](https://www.i18next.com/overview/typescript).

**Nová schopnosť:** neplatný prekladový kľúč zastaví typecheck.

### P0. Centrálne validačné schémy pre formuláre

Zod už v projekte je, ale jeho najväčší prínos vznikne až vtedy, keď je validačná schéma jediným zdrojom pravdy pre:

- form input,
- chybové hlášky,
- normalizáciu hodnôt,
- odvodený TypeScript typ,
- kontrolu payloadu pred odoslaním.

Netreba generovať celé UI formulára zo schémy. To by obmedzilo existujúci dizajn shared komponentov. Vhodnejší model je:

1. Zod schéma opisuje dáta a pravidlá,
2. shared inputy riešia vzhľad a prístupnosť,
3. formulárová vrstva prepája polia so schémou,
4. API mapper rieši iba rozdiel medzi form modelom a transportným modelom.

OpenAPI schéma zároveň nemusí obsahovať všetky UX pravidlá. Backendový kontrakt a formulárová validácia sa preto môžu skladať, nie slepo zdieľať.

**Nová schopnosť:** typ formulára a validačné pravidlá sa neudržujú na viacerých miestach.

### P1. Generované MSW handlery a testovacie dáta

MSW má v projekte zostať, hoci aktuálne mock dáta boli odstránené. Orval vie z OpenAPI generovať MSW handlery a response factories; v kombinácii s Fakerom vie oddeliť generovanie dát od handlerov. Pozri [Orval MSW generator](https://orval.dev/docs/reference/configuration/output/).

V ABCO by sa táto schopnosť mala používať iba na:

- izolované komponentové testy,
- reprodukciu chybových, empty a loading stavov,
- vývoj obrazovky, keď testovacie backendové dáta nie sú dostupné.

Nemá sa zapínať ako implicitný mock server pri normálnom spustení aplikácie. Režim musí byť explicitný, aby sa mock odpoveď nedala zameniť s reálnym API.

**Nová schopnosť:** testovacie API scenáre sa regenerujú z rovnakého kontraktu ako klient.

### P1. Component-driven vývoj cez Storybook

Storybook by mal slúžiť ako pracovné prostredie a živá dokumentácia pre `src/shared/components`, nie ako druhá aplikácia.

Najväčší prínos pre ABCO:

- každý shared komponent má samostatné stavy: default, loading, empty, error, disabled a dark theme,
- modaly, detail panely, tabuľky, skeletony a selectable cards sa dajú kontrolovať bez otvorenia celej feature,
- `play` scenáre môžu vykonať kliknutie, písanie a submit priamo v reálnom browseri,
- tie isté stories môžu byť základom accessibility a visual testov.

Storybook oficiálne podporuje interakčné testy postavené nad Testing Library a ich spúšťanie cez Vitest aj CI: [Storybook interaction tests](https://storybook.js.org/docs/writing-tests/interaction-testing).

**Nová schopnosť:** shared komponent sa vyvíja a overuje vo všetkých stavoch nezávisle od stránky.

### P1. Vizuálne regresné testy

Unit test zvyčajne nezistí, že sa posunulo tlačidlo, zmenila výška karty alebo scrollbar prekryl obsah. Vizuálny test uloží referenčný screenshot a upozorní na pixelový rozdiel.

Odporúčaný pilot:

- shared `Modal`, detail panel, tabuľka a wizard,
- svetlá a tmavá téma,
- desktop rozlíšenie používané v internej sieti,
- vedomé schválenie nového baseline pri úmyselnej zmene dizajnu.

Storybook opisuje prevod každej story na screenshotový test a porovnanie s predchádzajúcou verziou: [Storybook visual tests](https://storybook.js.org/docs/writing-tests/visual-testing).

Cloudový Chromatic nemusí byť vhodný pre interné firemné UI. Rovnaký princíp možno prevádzkovať vlastným Playwright screenshot workflow bez odosielania obrazoviek mimo firmy.

**Nová schopnosť:** nechcená vizuálna zmena je automaticky viditeľná ešte pred manuálnym testom.

### P1. End-to-end testy kritických workflow cez Playwright

Vitest a Testing Library overujú jednotlivé komponenty a logiku. Neoveria však celý reálny tok cez router, browser, formulár a HTTP komunikáciu.

Prvé E2E scenáre majú pokryť iba najkritickejšie cesty:

- prihlásenie cez Keycloak po jeho zavedení,
- vytvorenie a edit recovery application,
- vytvorenie recovery group a priradenie do tieru,
- vytvorenie credential a provideru,
- ochranu neuložených zmien,
- error a retry stav pri zlyhaní API.

Playwright používa locators s automatickým čakaním a retry správaním, čo znižuje potrebu ručných timeoutov: [Playwright locators](https://playwright.dev/docs/locators).

**Nová schopnosť:** automatický test ovláda aplikáciu rovnako ako používateľ v skutočnom browseri.

### P1. Automatická kontrola prístupnosti

Accessibility test dokáže nájsť chýbajúce labels, neplatné ARIA väzby, nedostatočný kontrast alebo problematickú štruktúru. Nenahrádza manuálnu kontrolu klávesnicou a screen readerom.

Možné sú dva komplementárne režimy:

- Storybook + axe pre každý shared komponent,
- Playwright + axe pre celé stránky a workflow.

Storybook uvádza, že jeho a11y addon je postavený nad axe-core a môže zlyhania preniesť do testov: [Storybook accessibility tests](https://storybook.js.org/docs/writing-tests/accessibility-testing). Playwright dokumentuje integráciu cez `@axe-core/playwright`: [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing).

**Nová schopnosť:** časť WCAG problémov sa kontroluje pri každej zmene UI.

### P1. Automatické hľadanie nepoužitého kódu a porušenia hraníc modulov

Pri rastúcej feature architektúre nestačí ESLint `no-unresolved`. Užitočné sú dve samostatné kontroly:

- **dead-code analýza:** nepoužité súbory, exporty a dependencies,
- **architecture rules:** napríklad feature nesmie importovať interný komponent inej feature; zdieľané veci musia ísť cez `shared` alebo verejný feature entry point.

Tieto pravidlá treba zavádzať postupne. Najprv report, potom oprava existujúcich nálezov a až následne blokovanie nových porušení.

**Nová schopnosť:** architektúra priečinkov nie je iba dohoda, ale automaticky kontrolované pravidlo.

### P1. Produkčné chyby s pôvodným TypeScript stack trace

Browser používateľa dnes môže zobraziť chybu, ktorú lokálne nemožno reprodukovať. Error-monitoring nástroj vie spojiť:

- výnimku,
- release aplikácie,
- URL a navigáciu,
- breadcrumbs pred chybou,
- source mapu pre preklad minifikovaného stacku na pôvodný `.tsx` súbor.

Sentry je príklad schopnosti, nie povinný vendor. Oficiálna dokumentácia opisuje error context, breadcrumbs, release metadata a mapovanie minifikovaného kódu cez source maps: [Sentry Error Monitoring](https://sentrydocs.dev/features/error-monitoring).

Pri credentials a infraštruktúrnych údajoch musí byť ešte pred zapnutím telemetry jasne definovaná redakcia citlivých dát. Session replay nie je vhodné zapnúť plošne iba preto, že existuje.

**Nová schopnosť:** produkčná chyba ukáže konkrétny zdrojový riadok a udalosti, ktoré jej predchádzali.

### P2. Design tokens ako zdroj pravdy pre vizuálny systém

Farby, spacing, radius, shadows a typografia môžu byť uložené ako design tokens a generované do CSS premenných, Tailwind theme alebo dokumentácie.

Má to význam, ak:

- dizajn udržiava viac ľudí,
- Figma a implementácia sa často rozchádzajú,
- vznikne viac tém alebo white-label variantov,
- rovnaké tokeny používa viac aplikácií.

Pre jeden frontend s existujúcim Tailwind nastavením nie je nutné ihneď pridávať Style Dictionary. Najprv treba upratať existujúce CSS premenné a pomenovať sémantické tokeny, napríklad `surface`, `border`, `text-muted`, nie konkrétne `blue-200`.

**Nová schopnosť:** dizajnérsky token sa zmení na jednom mieste a vygeneruje konzistentné výstupy.

### P2. Feature flags

Feature flag oddelí nasadenie kódu od sprístupnenia funkcionality. Umožní:

- skryť nedokončenú integráciu,
- zapnúť feature iba vybranej roli alebo prostrediu,
- rýchlo vypnúť problematickú funkcionalitu bez nového buildu.

Externý systém nie je potrebný, kým neexistuje reálna potreba riadeného rollout-u. Jednoduché compile-time environment podmienky nie sú plnohodnotné feature flags. LaunchDarkly napríklad opisuje flag ako circuit breaker bez redeployu: [LaunchDarkly flag toggle](https://launchdarkly.com/docs/home/flags/toggle).

Pri Keycloaku treba odlíšiť:

- **authorization:** používateľ smie vykonať operáciu,
- **feature flag:** funkcionalita je používateľovi alebo prostrediu sprístupnená.

Frontend flag nesmie byť bezpečnostná kontrola; oprávnenie musí vynucovať backend.

### P2. Explicitné stavové automaty pre zložité wizardy

Recovery Group wizard a buildery majú podmienky pre povolené kroky, dirty state, návrat, editáciu a submit. Pri ďalšom raste možno tieto prechody opísať stavovým automatom namiesto množstva nezávislých booleanov.

Pilot má zmysel až vtedy, keď existujúci wizard začne mať neprehľadné alebo protichodné prechody. Nie je vhodné migrovať jednoduché modaly a tabuľky.

**Nová schopnosť:** neplatný prechod medzi krokmi nie je reprezentovateľný a workflow sa dá testovať ako graf stavov.

### P2. Property-based a mutation testovanie

- **Property-based testovanie** generuje veľa vstupov a overuje všeobecnú vlastnosť, napríklad že normalizácia ID je idempotentná a nikdy nevytvorí medzeru.
- **Mutation testovanie** úmyselne mení podmienky v kóde a kontroluje, či testy zmenu zachytia.

Sú vhodné pre kritické čisté funkcie, mappery a validačnú logiku. Nie sú vhodné ako plošná náhrada existujúcich testov, pretože zvyšujú čas a údržbu.

## Čo teraz nepridávať

### Generické formuláre generované celé z JSON Schema

Ušetria čas pri jednoduchom CRUD, ale zhoršili by presné UI workflow, drag-and-drop, shared komponenty a preklady. Použiť iba v prípade budúcej administratívnej obrazovky s veľkým počtom jednoduchých polí.

### GraphQL iba kvôli codegenu

REST/OpenAPI už poskytuje potrebný kontrakt. Migrácia na GraphQL by riešila problém, ktorý aplikácia momentálne nemá.

### Microfrontendy

Aktuálna feature architektúra je dostatočne modulárna. Microfrontend prináša samostatné buildy, runtime integráciu a zložitejšiu koordináciu. Má význam až pri viacerých nezávislých tímoch a release cykloch.

### SSR alebo migrácia z Vite na full-stack React framework

Interná autentizovaná administračná aplikácia nepotrebuje SEO ani server-rendered obsah. Route-level lazy loading už rieši základné delenie bundle.

### PWA a offline režim

Pri orchestrácii recovery operácií môžu staré cacheované údaje vytvárať nebezpečný dojem aktuálneho stavu. Offline režim zaviesť iba s explicitným business návrhom synchronizácie a konfliktov.

## Navrhovaná postupnosť pilotov

1. Dokončiť response schémy v OpenAPI a Orval generovanie.
2. Pridať kontrolu driftu API a typovo bezpečné preklady.
3. Pilotovať Zod form schema na jednom create/edit modale.
4. Zaviesť Storybook pre 4–6 najpoužívanejších shared komponentov.
5. Nad stories pridať accessibility a vizuálne testy.
6. Pridať 3–5 kritických Playwright workflow.
7. Pilotovať dead-code a architecture report.
8. Vybrať internému prostrediu vyhovujúci error-monitoring nástroj.
9. Ostatné schopnosti zavádzať iba pri konkrétnom probléme.

## Kritérium úspechu

Zlepšenie má byť prijaté iba vtedy, keď spĺňa aspoň jedno z nasledujúcich kritérií:

- odstráni ručné duplikovanie zdroja pravdy,
- zachytí triedu chýb skôr než súčasné kontroly,
- reprodukovateľne skráti diagnostiku,
- zjednotí opakovaný workflow bez skrytia doménovej logiky.

Ak technológia iba pridá nový konfiguračný súbor a paralelný spôsob práce bez merateľného prínosu, do projektu nepatrí.
