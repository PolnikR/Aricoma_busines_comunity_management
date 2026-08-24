# Checklist: Variant A — odsadená aktívna linka provider tabu

## Scope guard

- [ ] Upraviť iba indikátor aktívneho horného provider tabu.
- [ ] Zachovať jeden spoločný tablist pre VMware, FlashSystem a IBM Power.
- [ ] Zachovať viac tabov pri viacerých provideroch.
- [ ] Zachovať overflow šípky, scroll, auto-reveal a klávesovú navigáciu.
- [ ] Nemeniť URL state, provider-scoped query, filtre, tabuľky ani backend kontrakty.

## Fáza 1: Shared inset variant

- [ ] Úloha 1 — pridať failing test opt-in inset indikátora.
  - [ ] Inset selected stav používa vnútornú linku.
  - [ ] Defaultný selected stav ostáva pôvodný.
  - [ ] Existujúci test 10 tabov a scroll controls zostane zelený.
- [ ] Úloha 2 — implementovať opt-in variant v shared `Tabs`.
  - [ ] 2 px accent linka so zaoblenými koncami.
  - [ ] Linka je odsadená od strán aj od hlavného dividera.
  - [ ] Bez opt-in sa ostatné použitia vizuálne nemenia.

## Checkpoint: Shared komponent

- [ ] `npm test -- src/shared/components/tabs/Tabs.test.tsx`.
- [ ] `npm run typecheck`.
- [ ] Click a `ArrowLeft`/`ArrowRight`/`Home`/`End` testy prejdú.

## Fáza 2: Provider tab integration

- [ ] Úloha 3 — zapnúť inset variant iba v `ResourcesPage`.
  - [ ] Variant platí pre VMware, FlashSystem aj IBM Power taby.
  - [ ] V DOM ostáva jediný resource tablist.
  - [ ] Test s 10 VMware providermi stále nájde 10 tabov v jednom tabliste.
  - [ ] Klik na posledný provider stále zapisuje správny source/provider.

## Checkpoint: Multi-provider regresia

- [ ] `npm test -- src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx`.
- [ ] Overflow wrapper a previous/next šípky ostali v existujúcom shared `Tabs`.
- [ ] Nepribudol druhý riadok, druhý tablist ani provider filter.

## Fáza 3: Verifikácia

- [ ] Browser 320 px: línie sú oddelené, taby sa nezalamujú.
- [ ] Browser 768 px: aktívny indikátor je jasný a header nemení výšku.
- [ ] Browser 1440 px: divider a aktívna linka sa vizuálne nezlievajú.
- [ ] Browser s 10+ providermi: šípky, scroll a auto-reveal fungujú.
- [ ] Kliknutie a klávesnica menia aktívny tab bez console errorov.
- [ ] URL naďalej obsahuje správny `resource` a `providerId`.
- [ ] `npm run lint`.
- [ ] `npm run typecheck`.
- [ ] Focused resource test suite.
- [ ] `npm run build`.

## Hotovo, keď

- [ ] Aktívna linka je kratšia a odsadená nad celkový divider.
- [ ] Multi-provider tab funkcionalita ostala nezmenená pre všetky tri resource typy.
- [ ] Existuje iba jeden horný tablist.
- [ ] Všetky uvedené testy a browser kontroly prešli.
