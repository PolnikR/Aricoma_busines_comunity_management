# Technický redizajn stránok ABCO

Otvoriť `index.html` priamo v prehliadači. Lokálne HTML/CSS/JS bez servera,
inštalácie, CDN alebo backendu. Navigácia prepína Resources a Recovery runs.
Všetky záznamy sú syntetické a tento stav je označený v rozhraní.

## Odporúčaný smer

Jedna súvislá pracovná plocha **bez kariet vnorených do kariet**, vložená do
existujúceho vizuálneho rámca aplikácie: svetlá navigácia s logom Aricoma,
22 px zaoblenie navigácie, 28 px vonkajší obsahový rám a 56 px hlavička.
Metriky sú jeden pás, tabuľka leží priamo v pracovnej ploche. Vnútorné sekcie
sú oddelené čiarami bez ďalších kariet. Logo používa `../../public/aricoma-logo.png`.

- Riadky 32 px, voliteľne 44 px; technické názvy a čísla monospace.
- Fixovaná hlavička a prvý stĺpec; ostatné stĺpce sa posúvajú v tabuľke.
- Spoločný toolbar: textové vyhľadávanie, platforma, stav a reset filtrov.
- Radenie cez hlavičky, numerické stĺpce vpravo; neukončený run má trvanie „—“.
- Tabuľka má vždy celú šírku. Kliknutie na názov otvára modálny detail podľa
  existujúceho `DetailView`: hlavička, názov, stav a navigácia sekcií v dialógu.
  Zatvorenie cez Escape, krížik alebo backdrop obnoví focus na pôvodnom názve.
  Žiadny bočný panel ani ovládač Hide/Show detail.
- Svetlá/tmavá téma vychádza z palety `src/index.css`. Textové akcenty a muted
  odtiene sú upravené pre kontrast. Font preferuje Outfit, ak je lokálne dostupný,
  inak systémový Segoe UI. Zaoblenie ovládacích prvkov je 8 px ako v aplikácii.
- Stavy majú text aj symbol. Pri nulových výsledkoch je explicitný prázdny stav.

Dialóg je izolovaná HTML ukážka existujúceho správania, nie návrh náhrady
produkčného detailu. Demonštruje jednu sekciu Overview so syntetickými dátami;
pri prenose do aplikácie zostanú súčasné `DetailView` aj jeho obsah a sekcie.
Natívny `<dialog>` zabezpečuje modalitu a focus trap v prototype. Na desktope je
centrovaný nad obsahovou plochou, na menších displejoch nad celým viewportom.

## Webový prieskum · 26. 10. 2026

| Zdroj | Použitý princíp |
| --- | --- |
| [IBM Carbon — Data table](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines) | Kompaktné 32 px riadky, konzistentná hustota a toolbar pre vyhľadávanie/filtre. Carbon uvádza aj 24 px variant; tu zostáva 32 px kvôli čitateľnosti a ovládaniu. |
| [Ant Design — Table](https://ant.design/components/table/) | Radenie, filtre, fixovaná hlavička a stĺpce, horizontálny scroll. Referencia vzorov, nie nová závislosť. |

Plochý vzhľad a rozloženie sú návrhové rozhodnutia pre tento projekt, nie
požiadavky uvedených knižníc. Ukážka používa ručne vytvorenú HTML tabuľku.

## Rozsah a prenesenie do aplikácie

Prieskum existujúceho kódu: `AppShell`, `AppSidebar`, `AppHeader`, `DetailView`,
`ResourcesPage`, `ResourceInventoryShell` a dashboard modely.
Produkčné resources rozlišujú aj konkrétnych providerov; tento prototyp
zjednodušuje filter na platformy. Pri implementácii treba zachovať provider ID,
URL filtre, autorizáciu, načítavanie, retry/error stavy, serverové stránkovanie
a existujúce discovery správanie. Súhrny prototypu opisujú celý fixture, počítadlo
v toolbare opisuje filtrované výsledky. Priradenie do recovery group nie je
tvrdením o pripravenosti obnovy. Súčet provisioned kapacít fixture nepredstavuje
fyzickú kapacitu storage ani deduplikovaný súčet reálnej infraštruktúry.

Nie sú tu sieťové operácie, preto sa nesimuluje loading ani chyba backendu.
Produkčné komponenty, dátové kontrakty a závislosti sa nemenia. Texty UI sú
v angličtine ako technická ukážka; produkčné nasadenie použije existujúce i18n.

## Overenie

Z koreňa repozitára:

```sh
node --check prototypes/technical-pages/workspace.js
node --check prototypes/technical-pages/verify.mjs
node prototypes/technical-pages/verify.mjs
git diff --check -- prototypes/technical-pages
```

Browser skript používa lokálny Chrome s izolovaným dočasným profilom cez DevTools
protocol. Alternatívnu cestu možno nastaviť cez `CHROME_PATH`.
Overuje obe stránky, filtre, nulové výsledky, reset, numerické radenie, detail,
Escape/focus, otvorenie cez Enter, modalitu, focus trap, krížik a backdrop,
plnú šírku tabuľky, skip link, skratku `/`, hustotu, obidve témy,
šírky 320/768/1024/1440 px, kontrast vybraných textových tokenov a prístupné názvy
ovládacích prvkov v accessibility tree. Screenshoty ukladá do vypísaného temp
adresára. Nie je to plný WCAG audit ani overenie screen readerom.

Kompletná aplikačná test suite ani produkčný build nie sú súčasťou overenia
tohto izolovaného HTML artefaktu.
