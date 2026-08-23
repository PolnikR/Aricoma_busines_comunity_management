# Checklist: Oddelenie Resources a Resources ISE feature

## Fáza 1: Regresný kontrakt a routing

- [ ] Doplniť route/location regresný test pre Resources ISE → Resources.
- [ ] Overiť jednu pathname zmenu bez následnej inicializačnej navigácie.
- [ ] Obnoviť kanonickú source route `/discovery-inventory/resources`.
- [ ] Obnoviť kanonickú target route `/discovery-inventory/resources-ise`.
- [ ] Redirectovať `/resources/source` na source route s `replace`.
- [ ] Redirectovať `/resources/target` na target route s `replace`.
- [ ] Aktualizovať presné sidebar odkazy a active-state testy.

## Checkpoint: Route hranice

- [ ] Obe sidebar položky zostávajú samostatné.
- [ ] Každá route renderuje vlastný feature entrypoint.
- [ ] `AppShell` sa pri prechode nemení.

## Fáza 2: Samostatné page controllery

- [ ] Premeniť `ResourcesPage` na controller s pevnou source rolou.
- [ ] Odvodiť default source tab/provider bez mount-time URL zápisu.
- [ ] Vytvoriť `resources-ise/pages/ResourcesIsePage.tsx` s pevnou target rolou.
- [ ] Odvodiť default target tab/provider bez mount-time URL zápisu.
- [ ] Zachovať spoločné VMware, FlashSystem a IBM Power subpages.
- [ ] Zachovať spoločné API klienty, modely, query keys a detailné komponenty.

## Checkpoint: Feature izolácia

- [ ] Source feature nevie počas mountu prepnúť na target rolu.
- [ ] Target feature nevie počas mountu prepnúť na source rolu.
- [ ] Target feature neobsahuje kópie resource tabuliek alebo API klientov.

## Fáza 3: Jednofázová inicializácia scope

- [ ] Missing/invalid resource tab a provider riešiť in-memory fallbackom.
- [ ] Nezapisovať selection URL iba kvôli mountu feature.
- [ ] Zachovať URL zápis pri explicitnej zmene tabu/provideru.
- [ ] Hydratovať VMware filtre synchronne z URL, snapshotu alebo provider defaultov.
- [ ] Hydratovať FlashSystem filtre synchronne z URL alebo snapshotu.
- [ ] Hydratovať IBM Power filtre synchronne z URL alebo snapshotu.
- [ ] Nevykonávať mount-time active-provider `setSearchParams`.
- [ ] Zachovať role/provider session izoláciu.
- [ ] Zachovať používateľské URL zápisy filtrov a stránkovania.

## Checkpoint: Stabilný prvý render

- [ ] Destination inventory query nezačne s providerom predchádzajúcej role.
- [ ] Destination query sa zbytočne nevypne kvôli dvojfázovému `isInitialized`.
- [ ] Pri dostupnej cache nevznikne prázdny alebo full-page loading medzistav.

## Fáza 4: Cleanup

- [ ] Odstrániť produkčné použitie `/resources/:role`.
- [ ] Odstrániť `ResourceRoleRoutePage`.
- [ ] Odstrániť spoločný role-switching `ResourceRolePage`.
- [ ] Odstrániť starý target wrapper zo source feature.
- [ ] Aktualizovať route/page testy na dve samostatné feature.
- [ ] Overiť, že nezostali orphan importy.

## Finálne automatizované overenie

- [ ] Spustiť fokusované route a sidebar testy.
- [ ] Spustiť oba page-controller testy.
- [ ] Spustiť VMware, FlashSystem a IBM Power search-param hook testy.
- [ ] Spustiť inventory cache/query testy.
- [ ] Spustiť fokusovaný ESLint pre dotknuté súbory.
- [ ] Spustiť `npm run typecheck`.
- [ ] Spustiť `git diff --check`.

## Reálny browser check

- [ ] Na desktop šírke vykonať minimálne päť Resources ISE → Resources prechodov.
- [ ] Na desktop šírke vykonať minimálne päť Resources → Resources ISE prechodov.
- [ ] Zopakovať oba smery na narrow viewport.
- [ ] Potvrdiť, že obraz nepreblikne.
- [ ] Potvrdiť iba jednu route/location zmenu na kliknutie.
- [ ] Potvrdiť žiadne duplicitné inventory requesty.
- [ ] Potvrdiť žiadne console chyby.
- [ ] Potvrdiť správnu source/target izoláciu dát a filtrov.

## Odovzdanie

- [ ] Commitovať iba súbory patriace k tomuto plánu.
- [ ] Nezahrnúť existujúce identity-access alebo prototype zmeny.
