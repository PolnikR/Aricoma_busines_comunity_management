# Implementačný plán: Template D — stacked facts pre Policy Detail Panel

## Prehľad

Cieľom je nahradiť súčasný label-vedľa-hodnoty (`DetailRow`) layout v
`RecoveryGroupPolicySetDetails.tsx` variantom **D — Stacked facts** zo schválených
dizajnových templatov (`Policy Detail Panel`, artifact `b761c085-…`). Dôvod: pri
reálnej šírke master-detail panelu (~600 px) sa label a hodnota tlačia na jeden
riadok a zalamujú sa cez seba (napr. „Výber snapshotu" + „Najnovší dostupný
snapshot"), čo pôsobí chaoticky.

Template D rieši toto tak, že label je vždy **nad** hodnotou (nikdy vedľa nej) a
počet faktov na riadok sa prispôsobuje cez CSS `@container` dopyt naviazaný na
skutočnú šírku panelu, nie šírku okna prehliadača.

Druhá požiadavka: sada politík môže v budúcnosti obsahovať viac než 3 typy
politík (dnes: snapshot, recovery, clean room). Komponent preto musí byť
vnútorne postavený na poli sekcií, nie na 3 samostatných hardcodovaných JSX
blokoch — pridanie 4. typu politiky nesmie vyžadovať zásah do layoutu.

## Scope guard

Zachovať bez zmeny:

- Verejný props kontrakt `RecoveryGroupPolicySetDetails` (`policySet`,
  `snapshotPolicy`, `recoveryPolicy`, `cleanRoomPolicy`, `isLoading`,
  `hasQueryError`) — žiadna zmena `RecoveryGroupPolicySetCatalogue.tsx`.
- Existujúci obsah faktov (frekvencia, uchovávanie, výber snapshotu, overenie
  spustenia, popis, stav) a i18n kľúče, ktoré ich vykresľujú.
- Badge/status logiku (loading / resolved / incomplete / load failed).

Mimo rozsahu tohto plánu:

- Zmena dátového modelu `PolicySet` (backend, OpenAPI, orval) tak, aby
  skutočne obsahoval viac než 3 typy politík. Tento plán robí **vykresľovaciu
  vrstvu** pripravenú na N sekcií; samotné rozšírenie schémy o 4. a ďalší typ
  politiky je samostatná, väčšia iniciatíva a nie je jej súčasťou.
- Zmeny v `RecoveryGroupPolicySetList.tsx` alebo v master-detail kompozícii
  (`RecoveryGroupPolicySetCatalogue.tsx`) — tie už boli dokončené v predošlej
  iterácii (Variant A) a nie sú predmetom tejto úlohy.
- Status filter, pagination, ani iné mimo-scope položky z predošlého plánu.

## Architektonické rozhodnutia

### Dáta-riadené sekcie namiesto 3 hardcodovaných blokov

Vnútri `RecoveryGroupPolicySetDetails.tsx` pribudne lokálny typ:

```ts
interface PolicyDetailFact {
  label: string
  value: string
  mono?: boolean
}

interface PolicyDetailSection {
  key: string
  icon: ReactNode
  categoryLabel: string
  name: string
  id: string
  facts: PolicyDetailFact[]
  isUnavailable: boolean
}
```

Funkcia `buildSections(...)` postaví toto pole z existujúcich troch props
(`snapshotPolicy`, `recoveryPolicy`, `cleanRoomPolicy`) — presne ako dnes, ale
výstupom je pole, nie 3 samostatné premenné. Render potom robí `sections.map(...)`.

Dôsledok: pridanie 4. typu politiky (keď bude existovať v `PolicySet`) znamená
pridať jeden záznam do `buildSections`, nie upravovať grid, CSS ani JSX layout.

### `FactField` nahrádza `DetailRow`

Nová komponenta `FactField` vykresľuje label nad hodnotou (`<span>` label,
`<span>` hodnota pod ním), namiesto súčasného grid `1fr auto` riadku. Numerické
fakty (frekvencia, uchovávanie) dostanú `font-variant-numeric: tabular-nums` a
mono font, rovnako ako v schválenom mockupe.

### Layout: vertikálny stack namiesto `lg:grid-cols-3`

`a-grid`/`lg:grid-cols-3` sa nahrádza jednosĺpcovým stackom sekcií
(`grid-template-columns: 1fr`), kde každá sekcia má vlastný `facts` blok s 2
faktami na riadok, ktorý cez `@container` dopyt spadne na 1 fakt na riadok pri
malej šírke **panelu** (nie okna). Tento vzor sa v projekte doteraz nepoužíval —
Task 4 obsahuje krátky overovací krok, že Tailwind v4 `@container` syntax
funguje v tomto builde skôr, než sa zmena aplikuje na celý komponent.

### Ikony kategórií

`Icons.tsx` už obsahuje `LayersIcon` (reuse pre Snapshot policy). Pribudnú 2 nové
ikony v rovnakom štýle (20×20 viewBox, `stroke="currentColor"`,
`aria-hidden="true"`): `RefreshIcon` (Recovery application policy) a
`ShieldIcon` (Clean room policy).

## Úlohy

### Úloha 1: Pridať `RefreshIcon` a `ShieldIcon`

**Popis:** Doplniť do `src/shared/icons/Icons.tsx` dve nové ikony v existujúcom
štýle, bez zásahu do ostatných ikon.

**Akceptačné kritériá:**
- [ ] `RefreshIcon` a `ShieldIcon` majú rovnaký tvar props (`IconProps`),
      `viewBox="0 0 20 20"`, `stroke="currentColor"`, `aria-hidden="true"`.
- [ ] Ostatné exportované ikony sú nezmenené.

**Overenie:**
- [ ] `npm run typecheck`

**Závislosti:** Žiadne.

**Pravdepodobne dotknuté súbory:**
- `src/shared/icons/Icons.tsx`

**Odhad rozsahu:** XS (1 súbor).

### Úloha 2: Failing test pre sekciovú DOM štruktúru (RED)

**Popis:** Rozšíriť `RecoveryGroupPolicySetStep.test.tsx` o assertions, ktoré
uzamknú novú štruktúru: každá policy sekcia má priradenú ikonu (`svg` s
`aria-hidden`) pred kategóriovým labelom, a existujúce `toHaveTextContent`
assertions na poradí label→hodnota zostávajú ako regresná poistka (DOM poradie
label-pred-hodnotou sa nemení, mení sa iba CSS layout).

**Akceptačné kritériá:**
- [ ] Nový test overí, že detail panel obsahuje presne 3 ikony (jednu na
      sekciu) v aktuálnom stave dát.
- [ ] Existujúce testy pre resolved/unavailable/loading stav zostávajú
      v teste prítomné a v tomto kroku zlyhávajú tam, kde sa mení DOM (icon
      assertions), z očakávaného dôvodu.

**Overenie:**
- [ ] RED: `npm exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetStep.test.tsx` — nové assertions zlyhajú, ostatné prejdú.

**Závislosti:** Úloha 1.

**Pravdepodobne dotknuté súbory:**
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetStep.test.tsx`

**Odhad rozsahu:** S (1 súbor).

### Úloha 3: Dáta-riadené sekcie + `FactField` (bez zmeny CSS gridu)

**Popis:** V `RecoveryGroupPolicySetDetails.tsx` zaviesť `PolicyDetailSection`,
`buildSections()` a `FactField` (label nad hodnotou). Render prejde na
`sections.map(...)`. CSS layout (grid stĺpce) sa v tomto kroku **nemení** —
cieľom je najprv zelenou cestou overiť dáta/DOM štruktúru, layout prichádza v
Úlohe 4.

**Akceptačné kritériá:**
- [ ] Presne 3 sekcie sa vykreslia z existujúcich 3 props, každá so svojou
      ikonou, kategóriovým labelom, názvom, ID a poľom faktov.
- [ ] `unavailable` stav (chýbajúca politika / chyba / loading) funguje na
      úrovni jednej sekcie rovnako ako doteraz.
- [ ] Pridanie 4. položky do `buildSections()` (over v code review, nie
      testom) nevyžaduje zásah mimo tejto funkcie.

**Overenie:**
- [ ] GREEN: `npm exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetStep.test.tsx`
- [ ] `npm run typecheck`

**Závislosti:** Úloha 2.

**Pravdepodobne dotknuté súbory:**
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetDetails.tsx`

**Odhad rozsahu:** M (1 súbor, väčší refaktor vnútri).

## Kontrolný bod po úlohách 1–3

- [ ] Focused testy zelené, typecheck čistý.
- [ ] Vizuálne sa nič nemení (stále pôvodný 3-stĺpcový grid) — bezpečný bod
      pred layoutovou zmenou.

### Úloha 4: Layout Template D — vertikálny stack + `@container` reflow

**Popis:** Nahradiť `lg:grid-cols-3` jednosĺpcovým stackom sekcií. Facts blok
v každej sekcii dostane `@container` dopyt, ktorý zníži počet faktov na riadok
z 2 na 1 pod ~560 px šírky **panelu**. Pred aplikáciou na celý komponent overiť
krátkym spike-om, že Tailwind v4 `@container` syntax (alebo raw CSS v
`index.css`) funguje v tomto builde tak, ako v mockupe.

**Akceptačné kritériá:**
- [ ] Sekcie sú vykreslené pod sebou (nie ako 3-stĺpcový grid).
- [ ] Pri šírke panelu ~600 px (reálny prípad zo screenshotu) sa žiadny label
      a hodnota netlačia na jeden riadok a nezalamujú sa cez seba.
- [ ] Pri šírke panelu ~340–380 px (master-detail bočný panel) je facts blok
      1 stĺpec; pri ~900 px (plná šírka wizard kroku) 2 stĺpce.
- [ ] Zmena reaguje na šírku obalu, nie na šírku okna prehliadača.

**Overenie:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetStep.test.tsx` (musí zostať GREEN, jsdom layout neoveruje, iba DOM štruktúru)
- [ ] Manuálna browser kontrola pri 340px, 600px a 900px šírke panelu (viď Úloha 5).

**Závislosti:** Úloha 3.

**Pravdepodobne dotknuté súbory:**
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetDetails.tsx`
- prípadne `src/index.css` (ak `@container` vyžaduje custom utility mimo Tailwind triedy)

**Odhad rozsahu:** M (1–2 súbory).

### Úloha 5: Browser a quality-gate verifikácia

**Popis:** Overiť redesign v reálnej appke v troch kontextoch: master-detail
bočný panel (úzky), samostatný plný wizard krok (široký), a stred (~600px,
presne šírka zo screenshotu, ktorý spustil túto úlohu).

**Akceptačné kritériá:**
- [ ] Žiadny wrap-collision label/hodnota pri žiadnej z 3 šírok.
- [ ] Ikony kategórií sa zobrazujú konzistentne so zvyškom shared ikon štýlu.
- [ ] Existujúci loading/incomplete/error stav vyzerá nezmenene funkčne.
- [ ] Žiadne console errory.

**Overenie:**
- [ ] `npm run lint` na zmenené súbory.
- [ ] Focused test suite (príkaz z Úlohy 3/4).
- [ ] `npm run typecheck`.
- [ ] Manuálna browser kontrola pri 3 šírkach panelu.
- [ ] `npm run build` sa nespúšťa — mimo scope podľa CLAUDE.md, pokiaľ nie je
      explicitne vyžiadané.

**Závislosti:** Úloha 4.

**Odhad rozsahu:** S.

## Záverečný kontrolný bod

- [ ] Detail panel vykresľuje sekcie z dátovo-riadeného poľa, nie z 3
      hardcodovaných JSX blokov.
- [ ] Label je vždy nad hodnotou; žiadny wrap-collision pri reálnych šírkach.
- [ ] Počet faktov na riadok reaguje na šírku panelu cez `@container`, nie na
      šírku okna.
- [ ] Props kontrakt `RecoveryGroupPolicySetDetails` a jeho volanie z
      `RecoveryGroupPolicySetCatalogue.tsx` sú nezmenené.
- [ ] Focused testy, lint, typecheck a browser kontrola prešli.

## Riziká a mitigácie

| Riziko | Dopad | Mitigácia |
|---|---|---|
| Tailwind v4 `@container` syntax sa v projekte doteraz nepoužila, môže sa správať inak, než v samostatnom artifact mockupe | Stredný | Úloha 4 obsahuje krátky spike pred plošnou aplikáciou; fallback je raw CSS cez `@utility` v `index.css`. |
| „Pripravené na viac než 3" sa chápe ako zmena dátového modelu | Stredný | Explicitne vymedzené v Scope guard — rieši sa iba vykresľovacia vrstva (`buildSections`), nie `PolicySet` schéma. |
| jsdom testy nevedia overiť skutočné CSS reflow správanie | Nízky | Layoutové akceptačné kritériá (Úloha 4) sa overujú manuálne v browseri, nie vitestom — explicitne uvedené v pláne. |
| Refaktor `DetailRow` → `FactField` ticho zmení existujúci vizuál mimo scope (napr. iné komponenty importujúce `DetailRow`) | Nízky | `DetailRow` je lokálna funkcia v `RecoveryGroupPolicySetDetails.tsx`, nie je exportovaná — overiť pred zmazaním, že sa nepoužíva inde. |

## Otvorené otázky

Žiadne pre rozsah tohto plánu. Skutočné rozšírenie `PolicySet` o viac než 3
typy politík (backend, OpenAPI, orval, generated typy) je mimo rozsahu a je
potrebné brainstormovať/plánovať samostatne, ak sa stane reálnou požiadavkou.
