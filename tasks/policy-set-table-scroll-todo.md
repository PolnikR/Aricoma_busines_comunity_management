# Task Checklist: Policy Set Table Scroll Layout

## Layout regression

- [ ] Doplniť focused layout invarianty do Policy Sets page/component testov.
- [ ] Reprodukovať odrezanú pagination pri obmedzenej desktopovej výške.

## Flex chain

- [ ] Zmeniť wrapper nad `InventoryShell` na ohraničený flex kontajner.
- [ ] Doplniť `min-h-0` a `min-w-0` na relevantné Policy Sets wrappery.
- [ ] Zachovať opravu lokálnu bez zmeny globálneho `DataTable` alebo `InventoryShell`.

## Scroll ownership

- [ ] Ponechať toolbar a pagination mimo vertikálnej scroll oblasti.
- [ ] Aktivovať vertikálny scroll tabuľkových riadkov na desktopoch.
- [ ] Zachovať horizontálny scroll širokej tabuľky.

## Verification

- [ ] Spustiť focused Policy Sets page a component testy.
- [ ] Spustiť focused ESLint a `git diff --check`.
- [ ] Overiť compact a comfortable density v browseri.
- [ ] Overiť prázdny, krátky a pretekajúci zoznam.
- [ ] Overiť plne viditeľnú pagination na viacerých desktopových viewportoch.
- [ ] Zachytiť screenshot po oprave.
- [ ] Commitnúť iba súbory tejto opravy.
