# Recovery Application wizard reorganization – TODO

## Príprava

- [x] Skontrolovať aktuálny `git status` a zachovať cudzie/necommitnuté zmeny.
- [x] Potvrdiť referenčný layout `RecoveryGroupBuilder` a existujúce shared komponenty.

## Wizard shell

- [x] Pridať štyri kroky a lokálny active-step state do `RecoveryAppBuilder`.
- [x] Použiť `WizardSteps` v ľavom/responzívnom sidebare.
- [x] Pridať spoločný Cancel/Back/Next/Save footer.
- [x] Zaviesť disabled pravidlá krokov podľa platnosti predchádzajúcich údajov.

## Application details

- [x] Odstrániť policy pole a jeho props/state z `AppMetadataForm`.
- [x] Zachovať File name, name, description, environment a infra Provider ID.
- [x] Pripojiť details validáciu k Next a dostupnosti nasledujúceho kroku.
- [x] Overiť create aj edit initial values a disabled File name.

## Recovery groups & tiers

- [x] Presunúť existujúci `ResourceSidebar` a `TierCanvas` do druhého kroku.
- [x] Zachovať loading/error/retry/empty stavy Recovery Groups.
- [x] Zachovať add/remove/select VM/add/edit/delete/reorder tier logiku.
- [x] Povoliť ďalší krok iba pri Recovery Group v každom tieri.
- [x] Overiť zachovanie state pri Back/Next navigácii.

## Policy set

- [x] Zobraziť `useRecoveryAppPolicies()` dáta v treťom kroku.
- [x] Použiť existujúce `SelectableCard` a shared loading/error/empty prvky.
- [x] Ukladať práve jednu voľbu do `formState.policySetId`.
- [x] Ošetriť edit hodnotu, ktorá už nie je dostupná v query výsledku zachovaním aktuálnej hodnoty.
- [x] Povoliť Orchestration krok iba po výbere policy.

## Orchestration

- [x] Presunúť Push to orchestrator toggle do posledného kroku.
- [x] Pri zapnutí zobraziť eligible Airflow provider select.
- [x] Zachovať loading/error/retry/empty stavy platform providerov.
- [x] Vyžadovať provider iba pri zapnutom push.
- [x] Zachovať dirty state a pôvodné submit mapovanie.
- [x] Blokovať duplicitný submit cez `isSaving` a zobraziť spinner.

## Lokalizácia a testy

- [x] Doplniť/upraviť EN, SK a CS texty krokov, popisov a stavov.
- [x] Aktualizovať `AppMetadataForm.test.tsx`.
- [x] Aktualizovať `RecoveryAppBuilder.test.tsx` na krokovú navigáciu.
- [x] Podľa dopadu overiť builder/editor page testy.
- [x] Otestovať validáciu každého kroku a zachovanie state.
- [x] Otestovať orchestration on/off a edit flow.

## Quality gate

- [x] Spustiť zamerané Vitest testy (23/23).
- [x] Spustiť `npm run typecheck`.
- [x] Spustiť `npm run lint`.
- [x] Spustiť produkčný Vite build.
- [ ] Manuálne overiť create/edit na desktop a úzkom viewport-e.
- [x] Skontrolovať finálny diff a zahrnúť iba súvisiace zmeny v rámci tejto úpravy.
