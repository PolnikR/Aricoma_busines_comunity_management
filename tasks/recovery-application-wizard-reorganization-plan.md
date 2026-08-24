# Recovery Application wizard reorganization

## Cieľ

Preorganizovať create/edit builder Recovery Application podľa existujúceho wizard vzoru z Recovery Groups. Namiesto jednej obrazovky s formulárom, orchestration nastavením a tier canvasom bude builder používať ľavý krokový sidebar a štyri samostatné kroky:

1. **Application details**
2. **Recovery groups & tiers**
3. **Policy set**
4. **Orchestration**

Zmena je výhradne reorganizácia UI a riadenia krokov. API kontrakt, query parametre, mapovanie výsledného JSON-u a existujúca doménová logika tierov sa nemenia.

## Potvrdené rozhodnutia

- Recovery groups a skladanie tierov budú samostatný krok.
- Policy sa bude naďalej ukladať do `RecoveryApplicationFormState.policySetId` a odosielať ako `policy_set_id`.
- Možnosti pre policy krok sa budú naďalej načítavať cez `useRecoveryAppPolicies()`.
- Provider infraštruktúry zostáva v `formState.platform` a vo výslednom JSON-e v `application.platform`.
- Airflow provider zostáva oddelený v `formState.orchestrationProviderId` a pri submitnutí sa použije ako query parameter `provider_id`.
- `pushToOrchestrator` zostáva voliteľný. Airflow provider je povinný iba vtedy, keď je push zapnutý.
- Nebudú vytvorené nové shared UI komponenty. Použijú sa existujúce `WizardSteps`, `Button`, `Spinner`, `ResourceSidebar`, `Field`, `Input`, `Select`, `Toggle`, `SelectableCard`, `EmptyState` a existujúce error/loading vzory.
- Create aj edit stránka budú používať rovnaký reorganizovaný `RecoveryAppBuilder`.

## Aktuálny stav

- `RecoveryAppBuilder` zobrazuje Application Details, policy dropdown, orchestration toggle/provider, Save a tier builder naraz.
- `AppMetadataForm` spravuje file name, application name, description, policy, environment a infra provider.
- Recovery Groups už poskytuje referenčný layout:
  - ľavý `WizardSteps` sidebar,
  - scrollovateľný obsah aktívneho kroku,
  - spoločný footer s Cancel, Back, Next a finálnym submit tlačidlom,
  - zamykanie krokov podľa validity predchádzajúcich krokov.
- Tier konfigurácia už používa existujúci `ResourceSidebar` a `TierCanvas`; ich správanie sa nemá meniť.

## Mimo rozsahu

- Zmena backend endpointov alebo request/response modelov.
- Premenovanie `policy_set_id`, `platform` alebo ostatných polí API kontraktu.
- Zmena logiky priraďovania Recovery Groups, výberu VM alebo poradia tierov.
- Nové shared komponenty alebo nový všeobecný wizard framework.
- Zmena create/edit routingu, query cache alebo success modalu po orchestrator push.

## Závislosti

- `useRecoveryGroups()` pre dostupné Recovery Groups.
- `useProviders()` pre infra provider možnosti.
- `useRecoveryAppPolicies()` pre policy možnosti.
- `usePlatformProviders()` a `getEligiblePlatformProviders()` pre Airflow provider možnosti.
- Existujúci mapper a validácia Recovery Application musia zostať kompatibilné.
- Existujúce necommitnuté zmeny v recovery application súbežne upravujú `AppMetadataForm.tsx`, test a locale súbory; implementácia musí zachovať ich význam a nesmie ich prepísať.

## Implementačné fázy

### Fáza 1: Zaviesť wizard shell a navigáciu

**Súbory:**

- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx`
- `src/locales/en.json`
- `src/locales/sk.json`
- `src/locales/cs.json`

**Úpravy:**

- Pridať lokálny stav aktívneho kroku s rozsahom 1–4.
- Nahradiť súčasný dvojkartový layout rovnakým responzívnym shellom, aký používa `RecoveryGroupBuilder`:
  - na desktopoch sidebar šírky 240 px,
  - na menších obrazovkách kroky nad obsahom,
  - scroll iba v obsahovej časti aktívneho kroku,
  - fixný footer buildera.
- Použiť existujúci `WizardSteps` so štyrmi lokalizovanými položkami.
- Pridať footer s existujúcimi `Button` a `Spinner` komponentmi:
  - Cancel ostáva dostupný stále,
  - Back je disabled na prvom kroku,
  - Next je dostupný iba po splnení validity aktuálneho kroku,
  - Save Application sa zobrazuje iba na štvrtom kroku.
- Povoliť kliknutie na dokončený/povolený krok v sidebare a blokovať preskočenie do kroku, ktorého závislosti ešte nie sú splnené.

**Akceptačné kritériá:**

- Create aj edit builder zobrazujú rovnaký štvor-krokový sidebar.
- Navigácia nemení ani neresetuje `formState` alebo priradené tiery.
- Na menšom viewport-e zostane wizard použiteľný bez horizontálneho pretečenia celého layoutu.

### Fáza 2: Oddeliť Application details od policy a orchestration

**Súbory:**

- `src/features/recovery-plans/recovery-applications/components/AppMetadataForm.tsx`
- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx`
- `src/features/recovery-plans/recovery-applications/components/AppMetadataForm.test.tsx`

**Úpravy:**

- Nechať v `AppMetadataForm` iba:
  - File name,
  - Application name,
  - Description,
  - Environment,
  - infra Provider ID.
- Odstrániť z `AppMetadataForm` policy props, interný policy state a policy dropdown, pretože policy bude mať vlastný krok.
- Zachovať existujúce validácie názvu súboru, provider credential filtra, loading/error/retry správania providera a edit-mode `disableFileName`.
- V prvom kroku zobraziť existujúci `AppMetadataForm` v čitateľnom vertikálnom/responzívnom layoute, nie v pôvodnom stlačenom header riadku.
- Definovať `detailsValid` z file name, name, description a platného infra providera. Environment zostáva povinná hodnota z existujúceho enumu.

**Akceptačné kritériá:**

- Prvý krok neobsahuje policy ani orchestration ovládanie.
- Next zostáva disabled, pokiaľ údaje aplikácie nie sú platné.
- Edit mód zachová zamknutý File name a predvyplnené hodnoty.

### Fáza 3: Presunúť Recovery Groups a tier canvas do druhého kroku

**Súbory:**

- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx`
- existujúce `ResourceSidebar.tsx` a `TierCanvas.tsx` iba spotrebovať, bez zmeny ich verejného API, pokiaľ to nebude nevyhnutné

**Úpravy:**

- V druhom kroku vykresliť existujúci split layout:
  - dostupné Recovery Groups v `ResourceSidebar`,
  - existujúci `TierCanvas` v hlavnej časti.
- Zachovať loading, refetch, error a empty správanie `useRecoveryGroups()`.
- Zachovať všetky existujúce operácie:
  - priradenie/odobratie Recovery Group,
  - výber VM v rámci priradenej skupiny,
  - pridanie, editáciu, odstránenie a reorder tierov,
  - oddelenú snapshot kópiu Recovery Group v application state.
- Druhý krok považovať za platný až vtedy, keď každý existujúci tier obsahuje `recovery_group`, v súlade so súčasnou validáciou.
- Pre tento krok nastaviť obsahový wrapper tak, aby sidebar a canvas mali vlastný scroll a builder footer zostal viditeľný.

**Akceptačné kritériá:**

- Tier funkcie sa správajú rovnako ako pred reorganizáciou.
- Next na policy krok nie je dostupný, kým každý tier nemá Recovery Group.
- Návrat Back/Next zachová všetky priradenia, VM výbery a poradie tierov.

### Fáza 4: Vytvoriť samostatný Policy set krok z existujúcich prvkov

**Súbory:**

- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx`
- `src/locales/en.json`
- `src/locales/sk.json`
- `src/locales/cs.json`

**Úpravy:**

- Presunúť načítanie a výber recovery application policy do tretieho kroku.
- Použiť existujúci `SelectableCard` vzor pre jednotlivé policy záznamy a `EmptyState` pri prázdnom zozname.
- Pri loading stave použiť existujúci status/loading vzor; pri chybe zachovať retry cez `recoveryAppPoliciesQuery.refetch()` a existujúci shared error pattern.
- Zvolenú hodnotu zapisovať výhradne do existujúceho `formState.policySetId`.
- Pri editácii označiť policy z `initialData.policySetId` ako vybranú; ak už nie je medzi dostupnými dátami, zobraziť bezpečný unavailable stav bez tichého prepísania hodnoty.
- Policy krok považovať za platný až po výbere jednej policy.

**Akceptačné kritériá:**

- Používateľ môže zvoliť práve jednu policy.
- Next na Orchestration zostane disabled bez zvolenej policy.
- Loading, chyba, retry a prázdny zoznam sú zrozumiteľne odlíšené.
- Submit stále obsahuje rovnaké `policy_set_id` ako pred reorganizáciou.

### Fáza 5: Presunúť push a Airflow provider do posledného kroku

**Súbory:**

- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx`
- `src/locales/en.json`
- `src/locales/sk.json`
- `src/locales/cs.json`

**Úpravy:**

- V štvrtom kroku poskladať UI z existujúcich `Toggle`, `Field`, `Select`, `EmptyState`/error prvkov a `Button`.
- Zobraziť jasnú voľbu Push to orchestrator.
- Ak je voľba vypnutá:
  - provider nie je povinný,
  - Save Application je povolené pri platných predchádzajúcich krokoch.
- Ak je voľba zapnutá:
  - zobraziť výber eligible Airflow platform providera,
  - vyžadovať `formState.orchestrationProviderId`, ktorý existuje v `getEligiblePlatformProviders()` výsledku,
  - zobraziť loading, error/retry a empty stav zo `usePlatformProviders()`.
- Zachovať existujúce dirty-state hlásenie pri zmene togglu aj providera.
- Submit musí naďalej volať pôvodný `onSave(formState)`; API stránka rozhodne o `push_to_orchestrator` a `provider_id` bez ďalšej zmeny.

**Akceptačné kritériá:**

- Pri vypnutom push je možné aplikáciu uložiť bez Airflow providera.
- Pri zapnutom push nie je možné uložiť aplikáciu bez platného Airflow providera.
- Finálne tlačidlo rešpektuje `isSaving`, zobrazí spinner a zabráni duplicitnému submitu.
- Create aj edit flow odosielajú nezmenený request kontrakt.

### Fáza 6: Upravovať testy podľa krokového flow

**Súbory:**

- `src/features/recovery-plans/recovery-applications/components/AppMetadataForm.test.tsx`
- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx`
- podľa dopadu `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.test.tsx`
- podľa dopadu `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx`

**Testovacie scenáre:**

- Zobrazia sa štyri správne pomenované kroky a prvý je aktívny.
- Neplatné Application details blokujú Next.
- Platné details sprístupnia krok Recovery groups & tiers.
- Loading/error/retry dostupných Recovery Groups zostanú funkčné v druhom kroku.
- Neúplné tiery blokujú prechod na policy; kompletné tiery ho povolia.
- Priradenia a VM výbery sa pri navigácii medzi krokmi nestratia.
- Policy loading/error/empty/select fungujú a vybrať možno jednu policy.
- Orchestration provider sa zobrazí iba pri zapnutom push.
- Zapnutý push bez providera blokuje Save; vypnutý push ho nevyžaduje.
- Save na poslednom kroku odovzdá celý pôvodný `RecoveryApplicationFormState`.
- Edit flow predvyplní všetky štyri kroky a zachová disabled File name.
- `isSaving` blokuje opakované uloženie.

## Overenie

Po každej logickej fáze spustiť zamerané testy; po dokončení celý relevantný quality gate:

```powershell
npx vitest run src/features/recovery-plans/recovery-applications/components/AppMetadataForm.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx
npm run typecheck
npm run lint
npm run build
```

Manuálne v prehliadači overiť create aj edit flow, desktop aj úzky viewport, Back/Next navigáciu, zachovanie tier state a oba orchestration varianty.

## Kontrolné body

1. Po wizard shelli: skontrolovať názvy a poradie štyroch krokov a responzívny layout.
2. Po details/tier rozdelení: potvrdiť, že presúvanie medzi krokmi nestráca údaje.
3. Po policy/orchestration krokoch: skontrolovať disabled pravidlá a request payload/query parametre.
4. Pred commitom: prejsť testy, typecheck, lint, build a skontrolovať diff iba v súvisiacich súboroch.

## Riziká a opatrenia

- **Veľký `RecoveryAppBuilder`:** reorganizovať po malých krokoch a nepresúvať doménovú logiku tierov mimo existujúcich handlerov.
- **Dvojitý lokálny state v `AppMetadataForm`:** zachovať jednoznačný tok zmien cez `onMetadataChange`; pri editácii otestovať initial values.
- **Pomenovanie policy:** UI používa pojem Policy set, ale možnosti prichádzajú z Recovery App Policies. V tejto úprave sa nemení kontrakt ani produktové pomenovanie; prípadné premenovanie riešiť samostatne.
- **Dynamické query stavy:** kroky nesmú vyzerať ako prázdne pri chybe fetchu; každý query stav musí mať vlastný loading/error/empty variant.
- **Súbežné zmeny v worktree:** pred editáciou a commitom vždy skontrolovať `git status` a diff, aby sa neprepísali zmeny inej session.

## Odhad rozsahu

Stredná UI úprava: približne 1 pracovný deň vrátane testov a manuálnej kontroly. Neobsahuje backend alebo API kontraktové zmeny.

## Definition of Done

- Recovery Application create/edit používa štyri potvrdené kroky.
- Použité sú iba existujúce shared UI komponenty.
- Funkcionalita tierov, policy mapping a orchestration submit zostáva zachovaná.
- Všetky nové aj upravené testy prechádzajú.
- Typecheck, lint a produkčný build prechádzajú.
- Manuálne sú overené create/edit, orchestration on/off a responzívny layout.
