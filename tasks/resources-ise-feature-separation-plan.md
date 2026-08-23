# Implementačný plán: Oddelenie Resources a Resources ISE na samostatné feature

## Prehľad

Nahradiť spoločnú parametrizovanú route `/discovery-inventory/resources/:role` dvoma priamymi route-level feature: `Resources` pre source providery a `Resources ISE` pre target providery. Každá route bude mať vlastný page controller s pevnou rolou a vlastným inicializačným lifecycle. Tabuľky, detailné panely, API klienti, dátové modely a role-neutral inventory hooky zostanú zdieľané.

Cieľom nie je prekryť prebliknutie animáciou. Cieľom je odstrániť Resources-špecifický reťazec dodatočných renderov a `setSearchParams` zápisov, ktorý vzniká po zmene role. Prechod zo sidebaru musí vykonať jednu route navigáciu a cieľová feature musí mať platný provider/filter scope už pri prvom použiteľnom renderi.

Tento plán nahrádza architektonické rozhodnutie z `resources-role-route-transition-plan.md`, podľa ktorého mali obe položky používať jeden parametrizovaný route element.

## Zistený rozdiel oproti plynulým feature

- Ostatné sidebar feature majú samostatnú priamu route a vlastný page controller pod stabilným `AppShell`.
- Resources a Resources ISE používajú jeden `ResourceRoleRoutePage`, dynamický `role` prop a spoločný `ResourceRolePage`.
- Po zmene role sa znova vyhodnotí aktívny provider a `ResourceRolePage` môže cez efekt prepísať `resource` a `providerId`.
- VMware, FlashSystem a IBM Power filter hooky následne cez ďalší efekt zapisujú svoj active-provider scope a obnovované filtre do URL.
- Tieto mount-time zápisy vytvárajú viac location/render prechodov po jednom kliknutí. Odstránenie React `key` remountu preto neodstránilo samotné prebliknutie.

## Architektonické rozhodnutia

- Kanonické route budú opäť priame a zodpovedajúce sidebar feature:
  - `/discovery-inventory/resources`
  - `/discovery-inventory/resources-ise`
- Aktuálne adresy `/discovery-inventory/resources/source` a `/discovery-inventory/resources/target` zostanú ako jednorazové kompatibilné redirecty na príslušnú priamu route.
- `ResourcesPage` bude source composition root a nebude prijímať dynamickú rolu.
- `ResourcesIsePage` bude v samostatnom `resources-ise` feature adresári a bude target composition root bez dynamickej roly.
- Malá duplicita v route-level composition kóde je zámerná. Resource tabuľky, API, query keys, mapovanie a detailné komponenty sa nekopírujú.
- `ResourceRoleRoutePage` a spoločný role-switching `ResourceRolePage` sa po migrácii odstránia.
- Chýbajúci alebo neplatný `providerId` sa pri prvom renderi vyrieši v pamäti na prvý platný provider. Samotná inicializácia feature nesmie zapisovať URL.
- Provider/filter snapshot sa načíta synchronne podľa pevnej role a provideru. URL sa mení iba po explicitnej používateľskej akcii (zmena tabu, filtra, stránky) alebo pri kompatibilnom route redirecte.
- Source a target filtre zostanú oddelené existujúcim composite scope `(role, resourceTab, providerId)` a inventory cache zostane oddelená provider query keymi.
- Existujúce explicitné zatváranie stale detailov a ochrana pred zobrazením payloadu iného provideru zostanú zachované.

## Akceptačný prechod

```text
klik Resources ISE -> Resources
    -> jedna pathname navigácia
        -> nový source page controller s pevnou rolou
            -> synchronne odvodený source provider/filter scope
                -> render stabilného inventory shellu
```

Po vykreslení cieľovej route nesmie nasledovať opravný zápis `providerId`, active-provider markeru ani default filtrov iba preto, že sa feature práve mountla.

## Dependency graph

```text
Regresný transition contract
    -> Priame route a feature entrypointy
        -> Source controller s pevnou rolou
        -> Target controller s pevnou rolou
            -> Odstránenie mount-time selection URL sync
                -> Synchrónna obnova VMware filtrov
                    -> Synchrónna obnova FlashSystem/IBM Power filtrov
                        -> Odstránenie generického role route/page
                            -> Fokusované a browser overenie
```

## Zoznam úloh

### Fáza 1: Regresný kontrakt a priame route

- [x] Úloha 1: Zachytiť prebliknutie ako route/location regresný kontrakt.
- [x] Úloha 2: Obnoviť priame kanonické route a kompatibilné redirecty.

### Checkpoint: Route hranice

- [x] Sidebar obsahuje dve samostatné položky s presnými aktívnymi stavmi.
- [x] Každá priama route renderuje iný feature entrypoint pod rovnakým `AppShell`.
- [x] Staré parametrizované URL vykonajú najviac jeden redirect.

### Fáza 2: Samostatné feature controllery

- [x] Úloha 3: Premeniť `ResourcesPage` na source-only page controller.
- [x] Úloha 4: Vytvoriť samostatnú target feature `resources-ise`.

### Checkpoint: Feature izolácia

- [x] Source controller počas svojho lifecycle nikdy nemení rolu na target.
- [x] Target controller počas svojho lifecycle nikdy nemení rolu na source.
- [x] Spoločné tabuľky/API nie sú skopírované.

### Fáza 3: Jednofázová inicializácia scope

- [x] Úloha 5: Odstrániť mount-time synchronizáciu resource/provider selection do URL.
- [x] Úloha 6: Inicializovať VMware filter scope bez následnej navigácie.
- [x] Úloha 7: Inicializovať FlashSystem a IBM Power filter scope bez následnej navigácie.

### Checkpoint: Stabilný prvý render

- [x] Pri route vstupe nevznikne opravná search-param navigácia.
- [x] Obnovené filtre sú role/provider scoped už v prvom použiteľnom renderi.
- [x] Pri dostupnej cache sa nezobrazí full-page loading alebo prázdny medzistav.

### Fáza 4: Cleanup a overenie

- [x] Úloha 8: Odstrániť generický role route/page a aktualizovať regresné testy.
- [ ] Úloha 9: Vykonať fokusované automatizované a reálne browser overenie.

### Checkpoint: Hotovo

- [ ] Opakovaný prechod Resources ISE ↔ Resources nepreblikne na desktop ani narrow viewport.
- [ ] Nevznikajú duplicitné inventory requesty alebo console chyby.
- [ ] Source/target providery, filtre, cache a detailné výbery zostávajú izolované.
- [ ] Zmeny sú overené a uložené v samostatných atomických commitoch.

## Detailné úlohy

### Úloha 1: Route/location regresný kontrakt

**Popis:** Doplniť test pre prechod medzi oboma sidebar položkami cez reálny router. Test nebude merať pixely; zachytí technické podmienky, ktoré prebliknutie spôsobujú: počet location zmien, prítomnosť destination shellu a absenciu prázdneho alebo route-loading medzistavu po kliknutí.

**Akceptačné kritériá:**
- [x] Test začína na Resources ISE a naviguje na Resources cez rovnaký link contract ako sidebar.
- [x] Po kliknutí vznikne iba cieľová pathname/location zmena bez následnej inicializačnej navigácie.
- [x] `AppShell` zostane mountnutý a cieľová feature má renderovateľný shell v prvom stabilnom stave.

**Overenie:**
- [x] `npm exec vitest run src/app/router.test.tsx src/features/discovery-inventory/resources/pages/ResourcesRouteTransition.test.tsx`

**Závislosti:** Žiadne

**Pravdepodobne dotknuté súbory:**
- `src/app/router.test.tsx`
- `src/features/discovery-inventory/resources/pages/ResourcesRouteTransition.test.tsx`

**Odhadovaný rozsah:** Small: 2 súbory

### Úloha 2: Priame route a sidebar kontrakt

**Popis:** Nastaviť priame kanonické URL pre obe feature, priradiť im samostatné route elementy a zachovať kompatibilitu s aktuálnymi `/source` a `/target` bookmarkmi.

**Akceptačné kritériá:**
- [x] `/discovery-inventory/resources` renderuje source feature priamo.
- [x] `/discovery-inventory/resources-ise` renderuje target feature priamo.
- [x] `/resources/source` a `/resources/target` redirectujú s `replace` na zodpovedajúcu priamu route.

**Overenie:**
- [x] `npm exec vitest run src/app/router.test.tsx src/layouts/app-shell/AppSidebar.test.tsx`

**Závislosti:** Úloha 1

**Pravdepodobne dotknuté súbory:**
- `src/app/routes.ts`
- `src/app/AppRoutes.tsx`
- `src/app/router.test.tsx`
- `src/layouts/app-shell/AppSidebar.test.tsx`

**Odhadovaný rozsah:** Medium: 4 súbory

### Úloha 3: Source-only Resources controller

**Popis:** Presunúť source kompozíciu zo spoločného `ResourceRolePage` späť do `ResourcesPage`. Controller bude používať iba source tab builder a source rolu. Pri route vstupe odvodí platný aktívny tab bez efektu, ktorý opravuje URL.

**Akceptačné kritériá:**
- [x] `ResourcesPage` neberie `role` prop a nevie prepnúť na target scope.
- [x] Source provider selection sa odvodí deterministicky aj pri chýbajúcom/neplatnom `providerId`.
- [x] VMware, FlashSystem a IBM Power dispatchujú existujúce zdieľané subpages s pevnou source rolou.

**Overenie:**
- [x] `npm exec vitest run src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx`
- [x] Fokusovaný ESLint pre controller a test.

**Závislosti:** Úloha 2

**Pravdepodobne dotknuté súbory:**
- `src/features/discovery-inventory/resources/pages/ResourcesPage.tsx`
- `src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx`
- `src/features/discovery-inventory/resources/helpers/buildResourceSourceTabs.ts`

**Odhadovaný rozsah:** Medium: 3 súbory

### Úloha 4: Samostatná Resources ISE feature

**Popis:** Vytvoriť target route feature v samostatnom adresári. Target controller bude malý composition root s pevnou rolou a bude importovať zdieľané resource subpages a role-neutral dátové vrstvy namiesto ich kopírovania.

**Akceptačné kritériá:**
- [x] Target page sa nachádza pod `src/features/discovery-inventory/resources-ise/`.
- [x] Controller neberie dynamický `role` prop a pracuje iba s target providermi.
- [x] Resource tabuľky, API klienti, query keys a detailné komponenty nevzniknú v druhej kópii.

**Overenie:**
- [x] `npm exec vitest run src/features/discovery-inventory/resources-ise/pages/ResourcesIsePage.test.tsx`
- [x] Fokusovaný ESLint pre novú feature.

**Závislosti:** Úloha 2

**Pravdepodobne dotknuté súbory:**
- `src/features/discovery-inventory/resources-ise/pages/ResourcesIsePage.tsx`
- `src/features/discovery-inventory/resources-ise/pages/ResourcesIsePage.test.tsx`
- `src/app/AppRoutes.tsx`

**Odhadovaný rozsah:** Medium: 3 súbory

### Úloha 5: Selection bez mount-time URL opravy

**Popis:** Upraviť resource-tab selection contract tak, aby missing/invalid provider alebo tab mal in-memory fallback. Inicializácia controllera nesmie volať `setSearchParams`; URL sa aktualizuje až pri explicitnej zmene tabu/provideru používateľom.

**Akceptačné kritériá:**
- [x] Prvý render bez `providerId` používa prvý platný provider bez location replace.
- [x] Neplatný provider sa nezobrazí, ale nespôsobí druhú navigáciu.
- [x] Kliknutie na iný resource/provider tab naďalej zapíše URL a resetuje stránkovanie/nesúvisiace filtre.

**Overenie:**
- [x] `npm exec vitest run src/features/discovery-inventory/resources/hooks/useResourceTabSearchParam.test.tsx src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx src/features/discovery-inventory/resources-ise/pages/ResourcesIsePage.test.tsx`

**Závislosti:** Úlohy 3 a 4

**Pravdepodobne dotknuté súbory:**
- `src/features/discovery-inventory/resources/hooks/useResourceTabSearchParam.ts`
- `src/features/discovery-inventory/resources/hooks/useResourceTabSearchParam.test.tsx`
- oba page-controller testy

**Odhadovaný rozsah:** Medium: 4 súbory

### Úloha 6: Synchrónny VMware filter scope

**Popis:** Odstrániť dvojfázové `isInitialized` správanie pri mountnutí VMware scope. Explicitné URL filtre majú prioritu; inak sa synchronne použije role/provider snapshot alebo provider default. Samotná hydratácia nesmie volať `setSearchParams`.

**Akceptačné kritériá:**
- [x] VMware query môže začať s cieľovým providerom a správnymi filtrami bez prechodného disabled stavu.
- [x] Source snapshot sa nikdy nepoužije pre target scope a opačne.
- [x] Používateľská zmena filtra sa naďalej zapisuje do URL a session snapshotu.

**Overenie:**
- [x] `npm exec vitest run src/features/discovery-inventory/resources/hooks/useVirtualMachineSearchParams.test.tsx src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx`

**Závislosti:** Úloha 5

**Pravdepodobne dotknuté súbory:**
- `src/features/discovery-inventory/resources/hooks/useVirtualMachineSearchParams.ts`
- `src/features/discovery-inventory/resources/hooks/useVirtualMachineSearchParams.test.tsx`
- `src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.tsx`
- `src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx`

**Odhadovaný rozsah:** Medium: 4 súbory

### Úloha 7: Synchrónny FlashSystem a IBM Power filter scope

**Popis:** Aplikovať rovnaký inicializačný kontrakt na FlashSystem a IBM Power, aby plynulosť nezávisela od aktuálne zvoleného resource typu.

**Akceptačné kritériá:**
- [x] Oba hooky odvodia URL/snapshot/default filtre bez mount-time location replace.
- [x] Role/provider scope zostane súčasťou session identity.
- [x] Explicitné zmeny filtrov a stránkovania zachovajú existujúce URL správanie.

**Overenie:**
- [x] `npm exec vitest run src/features/discovery-inventory/resources/hooks/useFlashSystemSearchParams.test.tsx src/features/discovery-inventory/resources/hooks/usePowerSearchParams.test.tsx`

**Závislosti:** Úloha 6

**Pravdepodobne dotknuté súbory:**
- `src/features/discovery-inventory/resources/hooks/useFlashSystemSearchParams.ts`
- `src/features/discovery-inventory/resources/hooks/useFlashSystemSearchParams.test.tsx`
- `src/features/discovery-inventory/resources/hooks/usePowerSearchParams.ts`
- `src/features/discovery-inventory/resources/hooks/usePowerSearchParams.test.tsx`

**Odhadovaný rozsah:** Medium: 4 súbory

### Úloha 8: Odstránenie generického role lifecycle

**Popis:** Po prepojení oboch priamych feature odstrániť nepoužívaný `ResourceRoleRoutePage`, `ResourceRolePage` a starý Resources ISE wrapper v source feature. Upraviť importy a testy tak, aby sa role-switching controller nemohol náhodne vrátiť.

**Akceptačné kritériá:**
- [x] Produkčný routing nepoužíva `:role` route ani dynamický role page controller.
- [x] Source a target route importujú svoje vlastné feature entrypointy.
- [x] Nezostanú orphan importy alebo duplicitný target wrapper.

**Overenie:**
- [x] `rg "ResourceRole(Route)?Page|resources/:role" src` nevráti produkčné použitie.
- [x] `npm run typecheck`
- [x] Fokusovaný ESLint pre dotknuté route/page súbory.

**Závislosti:** Úlohy 3 až 7

**Pravdepodobne dotknuté súbory:**
- `src/features/discovery-inventory/resources/pages/ResourceRolePage.tsx` (odstrániť)
- `src/features/discovery-inventory/resources/pages/ResourceRoleRoutePage.tsx` (odstrániť)
- `src/features/discovery-inventory/resources/pages/ResourceRoleRoutePage.test.tsx` (nahradiť route testami)
- `src/features/discovery-inventory/resources/pages/ResourcesIsePage.tsx` (odstrániť)
- `src/app/AppRoutes.tsx`

**Odhadovaný rozsah:** Medium: 5 súborov

### Úloha 9: Fokusované a browser overenie prebliknutia

**Popis:** Spustiť celý dotknutý testovací rozsah a potom reálny browser check presne podľa dodaného videa: opakovať ISE → Resources aj opačný smer na desktop a narrow viewport, sledovať DOM, console a network.

> Automatizovaná časť je dokončená. Reálny browser check je v tejto relácii blokovaný, pretože browser runtime neponúka žiadny pripojený browser; lokálna aplikácia na `http://localhost:5173` je dostupná.

**Akceptačné kritériá:**
- [ ] V oboch smeroch nie je viditeľné prebliknutie cieľovej feature.
- [ ] Jeden klik nevytvorí následné inicializačné location replace alebo duplicitné inventory requesty.
- [ ] Source/target obsah, filtre, cache a aktívne sidebar položky zostanú správne oddelené.

**Overenie:**
- [x] Jedna fokusovaná Vitest invokácia pre route, sidebar, oba controllery, tri filter hooky a inventory query hooky.
- [x] Fokusovaný ESLint pre všetky dotknuté TypeScript súbory.
- [x] `npm run typecheck`.
- [x] `git diff --check`.
- [ ] Reálny browser: desktop a narrow viewport, minimálne päť prechodov v každom smere, kontrola console/network.

**Závislosti:** Úloha 8

**Pravdepodobne dotknuté súbory:**
- Žiadne produkčné súbory, pokiaľ overenie neodhalí konkrétny regresný problém.

**Odhadovaný rozsah:** Small

## Riziká a mitigácie

| Riziko | Dopad | Mitigácia |
|---|---|---|
| Samostatný feature adresár iba obalí ten istý role-switching controller | Vysoký | Oba controllery majú pevnú rolu a generický controller sa v Úlohe 8 odstráni |
| Mount-time filter efekty zostanú a prebliknutie pretrvá | Vysoký | Úlohy 5 až 7 zakazujú inicializačné URL zápisy a testujú location count |
| Úplné kopírovanie tabuliek/API spôsobí drift | Vysoký | Duplikuje sa iba malý route-level composition root; nižšie vrstvy zostávajú zdieľané |
| Zmena kanonických URL rozbije aktuálne bookmarky | Stredný | Zachovať jednorazové `replace` redirecty z `/source` a `/target` |
| In-memory fallback zníži zdieľateľnosť URL | Stredný | Explicitné používateľské výbery/filtre sa ďalej zapisujú; iba default inicializácia URL nemení |
| Test bez reálneho browsera nezachytí paint-level blik | Vysoký | Automatizované testy pokryjú príčinu a Úloha 9 vyžaduje reálny vizuálny check podľa videa |

## Mimo rozsahu

- Kopírovanie VMware, FlashSystem alebo IBM Power tabuliek a API klientov do ISE feature.
- Zmena backend provider-role kontraktov.
- Animácia alebo prekrytie prebliknutia bez odstránenia dodatočných navigácií.
- Redizajn resource tabuliek, filtrov, metrík alebo detailných panelov.
- Zmeny v nesúvisiacich sidebar feature.

## Otvorené otázky

Žiadne. Používateľ potvrdil dve samostatné route-level feature pri zachovaní spoločných komponentov a API vrstvy.
