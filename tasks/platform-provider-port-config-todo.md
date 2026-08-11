# Task checklist: Konfigurovateľný port platform providera

## Config

- [x] Vytvoriť `platformProvidersConfig.ts` s `defaultPort: 22`, `minPort: 1` a `maxPort: 65_535`.
- [x] Pridať kontraktový test feature configu.

## Formulár a dátový tok

- [x] Použiť config pre počiatočný port nového providera.
- [x] Zachovať uložený port pri editácii providera.
- [x] Použiť config pre `min`, `max`, `step` a klientskú validáciu portu.
- [x] Použiť rovnaké hranice v Zod API schéme.
- [x] Overiť, že submit/API payload obsahuje port ako `number`.

## UI

- [x] Zachovať IP address a Port v spoločnom responzívnom grid riadku.
- [x] Zachovať vertikálne radenie ostatných polí.
- [x] Na úzkom viewporte skladať IP a Port pod seba bez overflow.
- [x] Pridať komponentový test layoutu, labelov a input atribútov.

## Verifikácia

- [x] Cielené config, form, modal a API testy prejdú.
- [x] `npm run build` prejde.
- [ ] Browser: create modal zobrazuje default `22`.
- [ ] Browser: edit modal zachová port odlišný od `22`.
- [ ] Browser: request payload obsahuje číselný port.
- [x] Skontrolovať staged diff a commitnúť iba súvisiace súbory.

> Browser checklist zostáva otvorený: v tomto prostredí nie je dostupný Chrome DevTools/Playwright konektor. DOM regresné testy, API testy a celý produkčný build prešli.
