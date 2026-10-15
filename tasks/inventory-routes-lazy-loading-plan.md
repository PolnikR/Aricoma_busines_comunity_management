# Plán: Lazy loading Resources, Resources ISE a Providers

## Cieľ a rozsah

Odložiť načítanie modulov `ResourcesPage`, `ResourcesIsePage` a `ProvidersPage` do prvej návštevy príslušnej routy. Použiť existujúci vzor `React.lazy` a `Suspense`. Tento dokument je plán; implementácia ešte nebola vykonaná.

Zachovať URL, query parametre, hash, presmerovania, poradie rout a `contentScroll: 'contained'`. Vnútorná logika stránok, API hooky, cache a taby VMware/FlashSystem/IBM Power zostávajú mimo rozsahu. Nepridávať prefetching, nové skeletony ani všeobecný lazy-loading framework.

## Východiskový stav a rozhodnutia

- `discoveryInventoryRoutes.tsx` staticky importuje obe resource stránky; `providersConnectorsRoutes.tsx` staticky importuje Providers.
- Obe resource stránky staticky importujú spoločné platformové zobrazenia. Previesť obe; ponechanie jednej statickej môže držať spoločný kód v počiatočnom importnom grafe.
- Deklarovať `lazy()` na úrovni modulu mimo route factory. Dynamický import vráti `{ default: page.ResourcesPage }`, analogicky pre ďalšie pomenované exporty.
- Každú z troch stránok obaliť lokálnym `Suspense` s existujúcim `RouteLoadingSkeleton` bez variantu.
- Existujúci `lazyRouteBindings.test.tsx` overuje správne stránky, ale sám nedokazuje odložené vyhodnotenie modulov. Pridať izolovaný behaviorálny test.
- Checklist je v `tasks/inventory-routes-lazy-loading-todo.md`. Existujúce `tasks/plan.md` a `tasks/todo.md` patria inej práci a nemenia sa.

## Poradie úloh

### 0. Produkčný baseline PRED úpravou rout

Pred prvou implementačnou zmenou zachytiť východiskový stav aktuálneho commitu na `spike/ant-design-shell`: `git rev-parse HEAD`, `git status --short`, verziu Node/Vite, build mode a nastavenia merania. Nepoužívať ako baseline iný commit alebo vývojový server. Produkčný Vite build spustiť príkazom `npm.cmd exec -- vite build --manifest` (overená CLI voľba Vite 8), uložiť výpis buildu, `dist/.vite/manifest.json` a prehľad `dist/assets/*.js` mimo následne prepisovaného `dist` (napr. do dočasného porovnávacieho priečinka mimo repozitára).

Z tohto baseline buildu cez `vite preview` v rovnakom prehliadači zaznamenať sieťové merania popísané v úlohe 6: samostatné čisté otvorenie Dashboardu `/`, prvé otvorenie každej z troch rout a návrat po navigácii. Odložiť export Network/HAR alebo rovnocenný zoznam požiadaviek, nie iba screenshot; ak runtime/auth neumožňuje meranie, presne zdokumentovať blocker. Bez baseline nemožno tvrdiť nameranú úsporu.

**Akceptácia:** dohľadateľný SHA a porovnateľné východiskové produkčné build/network údaje alebo explicitne označený neúplný baseline; implementáciu možno pokračovať, ale kvantitatívny efekt potom zostáva neoverený.

### 1. Východiskové overenie a test načítania

Spustiť existujúce tri routing testy a pridať `src/app/routing/lazyRouteLoading.test.tsx`. Pre každú cieľovú stránku izolovať modulový stav, sledovať vyhodnotenie mockovaného page modulu a ovládať dokončenie jeho asynchrónneho načítania. Nepoužívať časové oneskorenia ani súkromné interné polia React lazy objektov. Test nesmie závisieť od poradia iných testov.

**Akceptácia:**
- Vytvorenie routera a render nesúvisiacej routy nevyhodnotia cieľový page modul.
- Návšteva cieľovej URL spustí načítanie a počas čakania zobrazí fallback.
- Po dokončení načítania sa zobrazí správna stránka.

**Overenie:** existujúce routing testy prejdú; nový test pred zmenou preukázateľne zlyhá kvôli statickému načítaniu. Počas úloh 2 a 3 postupne prejdú príslušné prípady.

**Závislosti:** žiadne. **Rozsah:** malý, jeden nový testovací súbor.

### 2. Resource routy

V `src/app/routing/discoveryInventoryRoutes.tsx` nahradiť dva statické importy deklaráciami `lazy()` a pridať `Suspense` okolo oboch elementov. Aktualizovať len príslušné položky route snapshotu: očakávaný element sa zmení na Suspense s `RouteLoadingSkeleton`.

**Akceptácia:**
- Obe stránky sa načítajú pri návšteve svojich URL a počas čakania zobrazia skeleton.
- Legacy presmerovania a scroll handles zostanú zachované.
- Snapshot nemá zmeny iných rout.

**Overenie:** cielené resource prípady testu načítania, existujúci route contract a page bindings; ručne skontrolovať snapshot diff.

**Závislosti:** úloha 1. **Rozsah:** malý, route súbor a snapshot.

### 3. Providers routa

V `src/app/routing/providersConnectorsRoutes.tsx` nahradiť statický import `ProvidersPage` deklaráciou `lazy()` a obaliť jeho route element do `Suspense`. Aktualizovať iba príslušnú položku snapshotu.

**Akceptácia:**
- Providers modul sa načíta až pri návšteve stránky a zobrazí správny fallback.
- Credentials, provider detail a presmerovania zostanú zachované.
- Všetky tri nové prípady odloženého načítania prejdú.

**Overenie:** test načítania, route contract a existujúce page bindings.

**Závislosti:** úloha 2 kvôli spoločnému snapshotu; vykonať sekvenčne. **Rozsah:** malý, route súbor a snapshot.

### 4. Cielené regresné overenie

Spustiť routing testy z nižšie uvedených príkazov. Overiť, že test `lazyRouteLoading` naozaj odlišuje eager a lazy načítanie (red pred zmenou, green po zmene), nezávisí od poradia testov ani časových timeoutov. Ručne skontrolovať snapshot; meniť sa smú len tri konkrétne elementy na `Suspense`, nie URL, redirecty, poradie, handles ani identita stránok.

**Akceptácia:** cielené Vitest testy, ESLint a `git diff --check` prejdú; nezmenili sa API hooky, cache, taby ani ďalšie feature stránky.

**Závislosti:** úlohy 1–3.

### 5. Produkčný build a dôkaz o skutočných chunkoch

Po úlohách 1–4 zopakovať `npm.cmd exec -- vite build --manifest` s rovnakým build mode, Node/Vite, dependency lockfile a nastaveniami ako pri baseline. Uložiť build výstup a manifest oddelene od baseline. Tento produkčný Vite build je **povinný pre uzavretie optimalizácie**; nie je to to isté ako spustenie celého `npm run build`, ktoré navyše spúšťa lint/typecheck/test/API kontroly.

**Skontrolovať:**
- V `dist/.vite/manifest.json` identifikovať dynamické vstupné moduly pre `ResourcesPage`, `ResourcesIsePage` a `ProvidersPage` (napr. `isDynamicEntry`, `file`, `imports`, `dynamicImports`); overiť, že príslušné stránky už nie sú synchronnou súčasťou počiatočného importného grafu Dashboardu.
- V reálnom `dist/assets` skontrolovať vytvorené JS výstupy; nevyžadovať presne tri chunky ani pevné hashované názvy. Vite môže zdieľaný kód vyčleniť, zlúčiť či inak rozdeliť.
- Zostaviť stručnú mapu spoločných JS chunkov a importných väzieb pre Resources, Resources ISE a Providers, vrátane zdieľaných VMware/FlashSystem/IBM Power komponentov; zaznamenať, či spoločný chunk figuruje raz v spoločnej session a aké sú jeho závislosti.
- Zaznamenať veľkosti JS výstupov (raw a podľa možností komprimované) **oddelene** od reálne prenesených bajtov v prehliadači. Súčet všetkých súborov `dist` nie je počiatočný bundle a samotná existencia lazy entry nie je dôkaz nižšieho prenosu.

**Akceptácia:** build exit 0; tri route-level dynamické vstupy a ich väzby preukázané manifestom a build artefaktmi, alebo jasne pomenovaný problém a neuzavretá úloha.

### 6. Browser Network meranie pred/po a záverečný commit

Použiť produkčný `vite preview` pre oba buildy (východiskový a finálny), rovnaký prehliadač/verziu, viewport, režim, autorizáciu, sieťové podmienky a kompresiu. Pri **cold** meraniach použiť novú čistú session/profil alebo vypnutú cache, zapnúť Preserve log a počkať na dokončenie načítania. Merať `JS` zvlášť od CSS, API a ostatných requestov; `Transferred` (sieťové bajty) nesmie byť zamieňané s `Resource size` (dekódované bajty). Zaznamenať počet JS requestov a načítané JS bajty; pri pred/po uviesť aj rozdiel v KB a percentách. Nespájať rôzne navštívené routy do jednej sumy bez uvedenia poradia.

**Scenáre pre oba buildy:**
1. Samostatná cold návšteva `/` (Dashboard) bez navigácie: JS requesty/transfer size/decoded size; po zmene sa nemajú v tejto chvíli sťahovať chunky cieľových stránok iba preto, že sú deklarované v routingu.
2. Z Dashboardu prvýkrát otvoriť `/discovery-inventory/resources`, `/discovery-inventory/resources-ise` a `/providers-connectors/providers`, **každý z novej cold session**. Na Network zachytiť lazy stránkový chunk, jeho potrebné zdieľané importy, requesty a dodatočne prenesené JS bajty oproti Dashboardu. Časy navigácie možno uviesť orientačne, ale neodvodzovať zrýchlenie bez spoľahlivého merania.
3. V samostatnej session prejsť `Resources → Resources ISE → Resources → Providers → Providers`: overiť znovupoužitie spoločných JS závislostí a to, že pri návrate nevzniká zbytočný nový prenos rovnakého chunku. Odlišovať využitie už načítaného modulu od HTTP cache po refreshi.
4. Priame otvorenie každej z troch URL (vrátane relevantného query parametra a hashu), navigácia cez sidebar a existujúce legacy redirecty. So spomalenou sieťou a vypnutou cache skontrolovať prechod `RouteLoadingSkeleton → stránka`, zachovaný `AppShell`, dostupnosť obsahu a neprítomnosť chýb v Console/Network.
5. Pri nedostupnom chunke skontrolovať, či aplikácia neskončí s nekonečným skeletonom alebo prázdnym obsahom; zaznamenať existujúcu error boundary/recovery cestu. Nepridávať nový globálny error-handling framework bez samostatného schválenia.

**Porovnávací report (baseline vs. po zmene):**
- Pre cold Dashboard: počet JS požiadaviek, prenesené KB, dekódované KB, absolútne/percentuálne `Δ`; uviesť či nastalo reálne zmenšenie počiatočného JS.
- Pre každú z troch navigácií: ktoré lazy/shared JS chunky sa vyžiadali, počet dodatočných JS požiadaviek a prenesené KB.
- Pre warm návrat: či sa rovnaké chunky preniesli znova; prípadná výnimka musí mať príčinu.
- Doplniť odkazy/cesty na oba build logy, manifesty a Network dôkazy a identifikáciu baseline commitu aj finálneho zdrojového stavu (finálny commit po jeho vytvorení).
- Ak je niektoré meranie blokované alebo výsledok nemá úsporu, uviesť `neoverené`/nulový či záporný efekt; **neprezentovať úspešný lazy routing test ako dôkaz výkonového prínosu**.

**Akceptácia:** pre všetky tri stránky existuje dôkaz z buildu a prehliadača, porovnateľná pred/po tabuľka a viditeľný záznam rizík/obmedzení; alebo konkrétny neodstránený blocker (vtedy výkonové overenie neoznačiť za hotové). Pred commitom skontrolovať diff a výsledky, potom vytvoriť samostatný implementačný commit obsahujúci iba súbory tejto úlohy, bez push/merge.

**Závislosti:** úlohy 0–5.

## Overovacie príkazy

```powershell
npm.cmd exec vitest run src/app/routing/routeContract.test.tsx src/app/routing/lazyRouteBindings.test.tsx src/app/discoverySettingsLegacyRedirect.test.tsx
npm.cmd exec vitest run src/app/routing/lazyRouteLoading.test.tsx
npm.cmd exec eslint -- src/app/routing --max-warnings 0
git diff --check
# Produkčný Vite build + manifest: raz PRED zmenou rout a raz PO nej
npm.cmd exec -- vite build --manifest
```

Pri zámernej aktualizácii snapshotu spustiť iba `npm.cmd exec vitest run src/app/routing/routeContract.test.tsx --update`, skontrolovať jeho diff a následne zopakovať test bez `--update`.

Kompletný test suite ani celý `npm run build` nespúšťať bez ďalšieho dôvodu; **samotný produkčný Vite build s manifestom je v úlohách 0 a 5 povinný**. Meranie veľkosti a requestov v produkčnom prehliadači je súčasťou tejto úlohy. Lazy loading jednotlivých platformových tabov zostáva samostatnou následnou prácou.

## Riziká

- Prvý vstup na stránku pridá čakanie na chunk; API hooky sa spustia až po načítaní stránky. Použiť existujúci skeleton a overiť prechod v prehliadači.
- Zdieľané závislosti môžu obmedziť úsporu. Neočakávať tri úplne nezávislé chunky a netestovať generované názvy chunkov.
- Mocky a modulová cache môžu zakryť eager import. Nový test izolovať a najskôr preukázať jeho zlyhanie na statickej verzii.
- Hromadná aktualizácia snapshotov môže zakryť regresiu. Povoliť len tri plánované zmeny.
- Dev server optimalizuje a servuje moduly inak než produkčný build. Vite `dev` ani unit test sám o sebe nedokazuje vyčlenenie produkčných chunkov; použiť manifest a `vite preview`.
- Pri porovnaní rozdielnych cache stavov, kompresie, prehliadačov, build mode, auth alebo zdrojových commitov budú namerané KB zavádzajúce; pred/po musia byť porovnateľné, inak výsledok označiť za neoverený.
- Chunk môže byť nepriamo pritiahnutý iným eager importom alebo preloadom aj keď route používa `lazy()`. Overiť importný graf aj skutočnú Network stopu Dashboardu.
- Výpadok načítania chunku môže skončiť chybou mimo `Suspense` (ktorý rieši čakanie, nie odmietnuté importy). Skontrolovať existujúce error správanie a uviesť prípadný gap.

## Kontrolné body

- **Po úlohe 0:** uložený produkčný baseline vrátane commitu/manifestu/Network, alebo explicitne zdokumentovaný blocker.
- **Po úlohe 3–4:** routing testy prejdú a snapshot obsahuje iba tri plánované zmeny.
- **Po úlohe 5:** úspešný produkčný build a identifikovaný lazy/shared chunk graf pre všetky tri routy.
- **Po úlohe 6:** porovnateľné meranie Dashboardu pred/po, dôkaz načítania chunkov pri prvej navigácii, warm cache kontroly, regresné browser scenáre, diff review a samostatný implementačný commit. Chýbajúce merania nesmú byť vykázané ako PASS. Tento plán neoprávňuje automatický push ani merge do `test`.
