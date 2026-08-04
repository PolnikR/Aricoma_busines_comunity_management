# Remove Recovery Group from Tier

## Goal

Umožniť používateľovi odobrať priradenú Recovery Group z tieru bez odstránenia
samotného tieru.

## Interaction

- V pravom hornom rohu vnútorného bloku Recovery Group bude malé tlačidlo s
  ikonou krížika.
- Tlačidlo odstráni iba `tier.recovery_group`.
- ID tieru, poradie a opis tieru zostanú nezmenené.
- Akcia prebehne okamžite bez potvrdzovacieho dialógu, pretože skupinu možno
  opätovne priradiť drag-and-drop.
- Odobratie označí Recovery Application builder ako zmenený.
- Po odobratí sa zobrazí existujúci prázdny drop stav tieru.

## Accessibility

- Ovládací prvok bude natívny `button`.
- Dostane preložený `aria-label` a `title`.
- Kliknutie nebude aktivovať editáciu tieru ani drag-and-drop.
- Focus-visible stav bude zreteľný.

## Data flow

`TierCard` vyvolá callback s ID tieru. `TierCanvas` ho odovzdá do
`RecoveryAppBuilder`, ktorý vytvorí novú mapu tierov a nastaví
`recovery_group` na `undefined`.

## Verification

- Test `TierCard` overí vykreslenie a kliknutie na krížik.
- Test `TierCanvas` overí odovzdanie ID tieru.
- Test buildera overí odobratie skupiny a dirty stav.
- Preklady budú doplnené v SK, CS a EN.
