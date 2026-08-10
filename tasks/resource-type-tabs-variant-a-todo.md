# Checklist: Variant A v hornom resource tab bare

## Scope guard

- [ ] Vykresľovať všetky source taby iba v hornom riadku označenom na screenshote.
- [ ] Nepridávať druhý tab bar do inventory panelu.
- [ ] Pri viacerých provideroch vytvoriť viac top-level tabov pre VMware, FlashSystem aj IBM Power.
- [ ] Provider z tabu považovať za navigation context, nie filter.

## Fáza 1: Shared variant A

- [ ] Úloha 1 — failing unit testy v `Tabs.test.tsx`.
  - [ ] 10 tabov + overflow zobrazí previous/next.
  - [ ] Overiť scroll, disabled hranice a active-tab reveal.
  - [ ] Bez overflow/opt-in sa šípky nezobrazia.
- [ ] Úloha 2 — implementovať opt-in overflow v shared `Tabs`.
  - [ ] Zachovať click, touch, trackpad a keyboard navigáciu.
  - [ ] Zachovať defaultné správanie ostatných použití.

## Checkpoint: Shared komponent

- [ ] `npm test -- src/shared/components/tabs/Tabs.test.tsx`
- [ ] `npm run typecheck`

## Fáza 2: Source model a horný tab bar

- [ ] Úloha 3 — helper + test pre source-tab descriptory.
  - [ ] 0, 1 a 10 providerov.
  - [ ] Stabilné poradie a identita `type + providerId`.
  - [ ] Rozlíšené labely pri viacerých provideroch.
- [ ] Úloha 4 — URL kontrakt `resource + providerId` + testy.
  - [ ] Atomická zmena source tabu.
  - [ ] Back/forward/refresh.
  - [ ] Invalid provider fallback a reset page.
- [ ] Úloha 5 — accessible previous/next preklady EN/SK/CS.
  - [ ] Validný JSON a zhodné locale kľúče.
- [ ] Úloha 6 — jediný top-level tab bar v `ResourcesPage`.
  - [ ] Viac providerov = viac tabov v rovnakom hornom riadku.
  - [ ] Žiadny provider tablist vo vnútri tabuľky.
  - [ ] Použiť pripravené previous/next preklady.

## Checkpoint: Horná navigácia

- [ ] Helper, URL hook a `ResourcesPage` focused testy prejdú.
- [ ] Test s 10 VMware providermi nájde ich taby iba v hornom tabliste.
- [ ] URL jednoznačne identifikuje resource typ aj provider.

## Fáza 3: Provider-scoped inventory

- [ ] Úloha 7 — VMware používa provider z horného tabu.
  - [ ] Odstrániť provider dropdown z VMware filter okna.
  - [ ] Provider nepočítať do active-filter badge.
  - [ ] Clear filters zachová source tab; zmena source zavrie drawer.
- [ ] Úloha 8 — FlashSystem používa provider z horného tabu.
  - [ ] Odstrániť provider dropdown z FlashSystem filtrov.
  - [ ] Query a metriky sú scoped na selected provider.
  - [ ] Reset source-dependent filtrov pri zmene tabu.
- [ ] Úloha 9 — IBM Power používa provider z horného tabu.
  - [ ] Odstrániť provider dropdown z IBM Power filtrov.
  - [ ] Query a metriky sú scoped na selected provider.
  - [ ] Reset source-dependent filtrov pri zmene tabu.

## Checkpoint: Dáta

- [ ] Každý source tab posiela správny `providerId` do existujúceho API query.
- [ ] Nie je dostupný druhý/konfliktný provider selector.
- [ ] Focused VMware, FlashSystem a IBM Power testy prejdú.

## Fáza 4: Verifikácia

- [ ] Browser 320 px: taby sa nezalomia; ovládanie šípkami a dotykom funguje.
- [ ] Browser 768 px: jeden horný tab bar, stabilný card layout.
- [ ] Browser 1440 px: šípky iba pri reálnom overflow.
- [ ] Browser/mocked data: 10 source tabov v jednom riadku.
- [ ] Kliknutie na každý typ/provider zobrazí jeho API inventory.
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Finálny diff neobsahuje druhý tab bar ani zmenu backend API kontraktov.

## Schválenie

- [ ] Potvrdiť label pri viacerých zdrojoch: `Resource type · Provider name`.
- [ ] Používateľ schválil plán pred implementáciou.
