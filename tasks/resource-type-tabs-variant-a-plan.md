# Implementačný plán: Variant A — odsadená aktívna linka provider tabu

## Prehľad

Cieľom je upraviť iba vizuálny indikátor aktívneho provider tabu v hornom riadku
`Inventory records`. Aktívna accent linka bude kratšia a odsadená nad celkovú
deliacu čiaru hlavičky karty, aby sa obe línie vizuálne nezlievali.

Existujúca funkcionalita provider tabov sa nemení. Viac providerov naďalej vytvorí
viac tabov pre VMware, FlashSystem aj IBM Power a pri nedostatku priestoru zostane
aktívne horizontálne posúvanie, šípky a automatické odkrytie vybraného tabu.

## Schválený vizuál variantu A

- Celkový `border-bottom` hlavičky/tab baru zostane na spodnom okraji bez zmeny.
- Aktívny tab nebude používať border priamo na spodnom okraji.
- Aktívny indikátor bude samostatná 2 px accent linka:
  - približne 6 px nad hlavným dividerom,
  - odsadená približne 16 px zľava aj sprava,
  - so zaoblenými koncami.
- Aktívny text zostane vo farbe `text-accent`.
- Neaktívne, hover, focus, disabled a overflow stavy ostanú vizuálne aj
  behaviorálne kompatibilné so súčasným shared komponentom.
- Implementácia použije existujúce Tailwind tokeny; nepridá nové raw farby ani
  samostatný CSS súbor.

## Scope guard

Nasledujúce správanie sa musí zachovať bez zmeny:

- jeden horný tablist pre všetky resource/provider zdroje;
- ľubovoľný počet VMware, FlashSystem a IBM Power provider tabov;
- nezalamovanie tabov do druhého riadka;
- horizontálny scroll cez myš, trackpad a touch;
- previous/next šípky iba pri skutočnom overflow;
- disabled stav šípok na začiatku a konci;
- automatické odkrytie aktívneho tabu;
- klávesy `ArrowLeft`, `ArrowRight`, `Home` a `End`;
- `resource`, `providerId`, `page`, `pageSize`, `search` a filtre v URL;
- provider-scoped API query pre aktívny tab;
- existujúce poradie a labely provider tabov.

Mimo rozsahu sú zmeny backendu, API kontraktov, filtrov, stránkovania, metrík,
tabuliek, detail drawerov, názvov tabov a rozloženia karty.

## Architektonické rozhodnutia

### Opt-in variant shared komponentu

Shared `Tabs` dostane úzko pomenovanú voliteľnú konfiguráciu indikátora, napríklad
`indicator="inset"`. Predvolený variant zostane dnešný edge underline, aby sa bez
explicitného opt-in nezmenili ostatné použitia komponentu.

`ResourcesPage` zapne inset indikátor iba pre horné provider taby. Overflow logika
ostane v rovnakej inštancii `Tabs`; nevznikne wrapper, druhý tablist ani paralelný
provider selector.

### Vykreslenie indikátora

Selected button bude pri inset variante `relative` a indikátor vytvorí pomocou
Tailwind `after:` pseudo-elementu. Hlavný divider bude naďalej patriť existujúcemu
obalu tab baru. Tým budú obe čiary geometricky oddelené bez maskovania borderu a
bez zásahu do výšky hlavičky.

### Spätná kompatibilita

Nová konfigurácia bude voliteľná a nebude meniť existujúce props ani správanie:

```text
Shared Tabs: default edge indicator (bez zmeny)
                    |
                    +-- ResourcesPage: indicator="inset"
                    |       +-- VMware provider taby
                    |       +-- FlashSystem provider taby
                    |       +-- IBM Power provider taby
                    |
                    +-- ostatní konzumenti: pôvodný vzhľad
```

## Úlohy

### Úloha 1: Testom definovať opt-in inset indikátor

**Popis:** Rozšíriť focused test shared `Tabs` o nový opt-in variant ešte pred
implementáciou. Test musí odlíšiť nový odsadený indikátor od pôvodného defaultu a
súčasne ponechať existujúce overflow testy pre desať tabov.

**Akceptačné kritériá:**

- [ ] Selected tab pri inset variante používa samostatný vnútorný indikátor.
- [ ] Defaultné použitie bez novej konfigurácie si zachová dnešný edge underline.
- [ ] Existujúci test s 10 tabmi naďalej overuje scroll šípky a hranice posunu.

**Overenie:**

- [ ] RED: focused test nového variantu zlyhá pred implementáciou z očakávaného dôvodu.
- [ ] `npm test -- src/shared/components/tabs/Tabs.test.tsx`.

**Závislosti:** Žiadne.

**Pravdepodobne dotknuté súbory:**

- `src/shared/components/tabs/Tabs.test.tsx`

**Odhad rozsahu:** XS (1 súbor).

### Úloha 2: Implementovať odsadený indikátor v shared `Tabs`

**Popis:** Pridať voliteľný inset variant a vykresliť selected indikátor pomocou
Tailwind pseudo-elementu. Existujúci default, ARIA semantika, focus management a
overflow logika zostanú nezmenené.

**Akceptačné kritériá:**

- [ ] Inset indikátor je 2 px vysoký, odsadený od strán a viditeľne oddelený od dividera.
- [ ] Komponent nemení svoju výšku ani šírku a tab label sa naďalej skracuje ellipsis.
- [ ] Bez opt-in konfigurácie sa výsledné triedy a správanie existujúcich tabov nemenia.

**Overenie:**

- [ ] GREEN: `npm test -- src/shared/components/tabs/Tabs.test.tsx`.
- [ ] `npm run typecheck`.

**Závislosti:** Úloha 1.

**Pravdepodobne dotknuté súbory:**

- `src/shared/components/tabs/Tabs.tsx`

**Odhad rozsahu:** XS (1 súbor).

## Kontrolný bod po úlohách 1–2

- [ ] Defaultný `Tabs` je spätne kompatibilný.
- [ ] Inset indikátor je dostupný iba cez explicitný opt-in.
- [ ] Test s 10 tabmi, scroll šípky a klávesová navigácia prejdú.

### Úloha 3: Zapnúť variant A pre horné provider taby

**Popis:** V `ResourcesPage` zapnúť inset indikátor na existujúcej jedinej
inštancii `Tabs`. Nezasahovať do tvorby source descriptorov, URL navigácie ani
odovzdávania `providerId` do resource stránok.

**Akceptačné kritériá:**

- [ ] Variant A sa používa pre VMware, FlashSystem aj IBM Power provider taby.
- [ ] DOM stále obsahuje presne jeden resource tablist.
- [ ] Desať VMware providerov stále vytvorí desať rozlíšiteľných tabov v tom istom riadku.

**Overenie:**

- [ ] `npm test -- src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx`.
- [ ] Regresný test potvrdí jediný tablist a funkčný výber posledného z 10 providerov.

**Závislosti:** Úloha 2.

**Pravdepodobne dotknuté súbory:**

- `src/features/discovery-inventory/resources/pages/ResourcesPage.tsx`
- `src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx`

**Odhad rozsahu:** S (2 súbory).

### Úloha 4: Browser a quality-gate verifikácia

**Popis:** Overiť vizuálne oddelenie oboch čiar a regresie provider tabov v
reálnom prehliadači. Kontrola musí zahŕňať stav bez overflow aj stav s viacerými
providermi a šípkami.

**Akceptačné kritériá:**

- [ ] Aktívna linka sa na 320, 768 a 1440 px nedotýka hlavného dividera.
- [ ] Pri viacerých provideroch ostáva jeden riadok, fungujú šípky a selected tab sa odkryje.
- [ ] Tab sa dá zmeniť kliknutím aj klávesnicou a URL naďalej nesie správny `providerId`.

**Overenie:**

- [ ] `npm run lint`.
- [ ] `npm run typecheck`.
- [ ] Focused resource test suite.
- [ ] `npm run build`.
- [ ] Browser kontrola bez console errorov pri 320, 768 a 1440 px.

**Závislosti:** Úloha 3.

**Pravdepodobne dotknuté súbory:** Žiadne; iba prípadné opravy v uvedenom scope.

**Odhad rozsahu:** S.

## Záverečný kontrolný bod

- [ ] Aktívny indikátor je viditeľne oddelený od celkovej línie tab baru.
- [ ] Zobrazenie viacerých provider tabov zostalo funkčné pre všetky tri typy.
- [ ] Overflow šípky, touch/trackpad scroll a automatické odkrytie fungujú bez regresie.
- [ ] Existuje iba jeden horný resource/provider tablist.
- [ ] URL a provider-scoped načítanie dát sa nezmenili.
- [ ] Focused testy, lint, typecheck, build a browser kontrola prešli.

## Riziká a mitigácie

| Riziko | Dopad | Mitigácia |
|---|---|---|
| Zmena vzhľadu všetkých shared tabov | Stredný | Nový indikátor je opt-in; default ostane nezmenený. |
| Pseudo-element prekryje alebo skráti label | Nízky | Indikátor je absolútne pozicionovaný a nemení content box. |
| Active linka sa naďalej dotýka dividera | Stredný | Použiť spacing token pre jasný vertikálny odstup a overiť pixelovo v browseri. |
| Úprava naruší overflow s 10+ tabmi | Vysoký | Nemení sa scroll wrapper ani meranie; zachovať a spustiť existujúce overflow testy. |
| Vznikne druhý tablist alebo provider selector | Vysoký | Variant sa zapne na existujúcej inštancii `Tabs` v `ResourcesPage`. |

## Otvorené otázky

Žiadne. Variant A aj zachovanie súčasnej multi-provider funkcionality boli
potvrdené používateľom.
