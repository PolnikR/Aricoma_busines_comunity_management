# Checklist: Oddelenie Resources a Resources ISE feature

## Fáza 1: Regresný kontrakt a routing

- [x] Doplniť route/location regresný test pre Resources ISE → Resources.
- [x] Overiť jednu pathname zmenu bez následnej inicializačnej navigácie.
- [x] Obnoviť kanonickú source route `/discovery-inventory/resources`.
- [x] Obnoviť kanonickú target route `/discovery-inventory/resources-ise`.
- [x] Redirectovať `/resources/source` na source route s `replace`.
- [x] Redirectovať `/resources/target` na target route s `replace`.
- [x] Aktualizovať presné sidebar odkazy a active-state testy.

## Checkpoint: Route hranice

- [x] Obe sidebar položky zostávajú samostatné.
- [x] Každá route renderuje vlastný feature entrypoint.
- [x] `AppShell` sa pri prechode nemení.

## Fáza 2: Samostatné page controllery

- [x] Premeniť `ResourcesPage` na controller s pevnou source rolou.
- [x] Odvodiť default source tab/provider bez mount-time URL zápisu.
- [x] Vytvoriť `resources-ise/pages/ResourcesIsePage.tsx` s pevnou target rolou.
- [x] Odvodiť default target tab/provider bez mount-time URL zápisu.
- [x] Zachovať spoločné VMware, FlashSystem a IBM Power subpages.
- [x] Zachovať spoločné API klienty, modely, query keys a detailné komponenty.

## Checkpoint: Feature izolácia

- [x] Source feature nevie počas mountu prepnúť na target rolu.
- [x] Target feature nevie počas mountu prepnúť na source rolu.
- [x] Target feature neobsahuje kópie resource tabuliek alebo API klientov.

## Fáza 3: Jednofázová inicializácia scope

- [x] Missing/invalid resource tab a provider riešiť in-memory fallbackom.
- [x] Nezapisovať selection URL iba kvôli mountu feature.
- [x] Zachovať URL zápis pri explicitnej zmene tabu/provideru.
- [x] Hydratovať VMware filtre synchronne z URL, snapshotu alebo provider defaultov.
- [x] Hydratovať FlashSystem filtre synchronne z URL alebo snapshotu.
- [x] Hydratovať IBM Power filtre synchronne z URL alebo snapshotu.
- [x] Nevykonávať mount-time active-provider `setSearchParams`.
- [x] Zachovať role/provider session izoláciu.
- [x] Zachovať používateľské URL zápisy filtrov a stránkovania.

## Checkpoint: Stabilný prvý render

- [x] Destination inventory query nezačne s providerom predchádzajúcej role.
- [x] Destination query sa zbytočne nevypne kvôli dvojfázovému `isInitialized`.
- [x] Pri dostupnej cache nevznikne prázdny alebo full-page loading medzistav.

## Fáza 4: Cleanup

- [x] Odstrániť produkčné použitie `/resources/:role`.
- [x] Odstrániť `ResourceRoleRoutePage`.
- [x] Odstrániť spoločný role-switching `ResourceRolePage`.
- [x] Odstrániť starý target wrapper zo source feature.
- [x] Aktualizovať route/page testy na dve samostatné feature.
- [x] Overiť, že nezostali orphan importy.

## Finálne automatizované overenie

- [x] Spustiť fokusované route a sidebar testy.
- [x] Spustiť oba page-controller testy.
- [x] Spustiť VMware, FlashSystem a IBM Power search-param hook testy.
- [x] Spustiť inventory cache/query testy.
- [x] Spustiť fokusovaný ESLint pre dotknuté súbory.
- [x] Spustiť `npm run typecheck`.
- [x] Spustiť `git diff --check`.

## Reálny browser check

> Blokované v tejto relácii: browser runtime neponúka žiadny pripojený browser. Lokálna aplikácia na `http://localhost:5173` je dostupná.

- [ ] Na desktop šírke vykonať minimálne päť Resources ISE → Resources prechodov.
- [ ] Na desktop šírke vykonať minimálne päť Resources → Resources ISE prechodov.
- [ ] Zopakovať oba smery na narrow viewport.
- [ ] Potvrdiť, že obraz nepreblikne.
- [ ] Potvrdiť iba jednu route/location zmenu na kliknutie.
- [ ] Potvrdiť žiadne duplicitné inventory requesty.
- [ ] Potvrdiť žiadne console chyby.
- [ ] Potvrdiť správnu source/target izoláciu dát a filtrov.

## Odovzdanie

- [x] Commitovať iba súbory patriace k tomuto plánu.
- [x] Nezahrnúť existujúce identity-access alebo prototype zmeny.
