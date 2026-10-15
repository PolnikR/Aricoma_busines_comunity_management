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

### 4. Záverečné overenie a commit

Spustiť cielené kontroly nižšie. V prehliadači overiť navigáciu z dashboardu a priame otvorenie všetkých troch URL vrátane query parametrov a hashu. Pri vypnutej cache a spomalenej sieti skontrolovať fallback, zachovaný shell a úspešné načítanie stránky. Nedostupné browserové overenie zaznamenať ako nevykonané.

**Akceptácia:**
- Cielené testy, ESLint a kontrola diffu prejdú; snapshot obsahuje iba tri očakávané zmeny elementov.
- Browserové overenie má zaznamenaný výsledok alebo konkrétny blocker.
- Review a samostatný implementačný commit obsahujú len zmeny tejto úlohy.

**Závislosti:** úlohy 1–3. **Rozsah:** kontrola dotknutých súborov a aktualizácia checklistu.

## Overovacie príkazy

```powershell
npm.cmd exec vitest run src/app/routing/routeContract.test.tsx src/app/routing/lazyRouteBindings.test.tsx src/app/discoverySettingsLegacyRedirect.test.tsx
npm.cmd exec vitest run src/app/routing/lazyRouteLoading.test.tsx
npm.cmd exec eslint -- src/app/routing --max-warnings 0
git diff --check
```

Pri zámernej aktualizácii snapshotu spustiť iba `npm.cmd exec vitest run src/app/routing/routeContract.test.tsx --update`, skontrolovať jeho diff a následne zopakovať test bez `--update`.

Kompletný test suite ani produkčný build nespúšťať automaticky. Cieľom je overené odložené načítanie; konkrétne zmenšenie bundle alebo zrýchlenie bez merania nesľubovať. Analýza produkčných chunkov a prípadný lazy loading jednotlivých platformových tabov sú samostatná následná práca.

## Riziká

- Prvý vstup na stránku pridá čakanie na chunk; API hooky sa spustia až po načítaní stránky. Použiť existujúci skeleton a overiť prechod v prehliadači.
- Zdieľané závislosti môžu obmedziť úsporu. Neočakávať tri úplne nezávislé chunky a netestovať generované názvy chunkov.
- Mocky a modulová cache môžu zakryť eager import. Nový test izolovať a najskôr preukázať jeho zlyhanie na statickej verzii.
- Hromadná aktualizácia snapshotov môže zakryť regresiu. Povoliť len tri plánované zmeny.

## Kontrolné body

Po úlohe 3: všetky routing testy prejdú a snapshot má iba plánované zmeny. Po úlohe 4: zaznamenané výsledky overenia, review a implementačný commit. Tento plán neoprávňuje automatický push ani merge do `test`.
