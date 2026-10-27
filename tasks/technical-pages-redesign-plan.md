# Implementačný plán: technické dátové stránky a používateľ v sidebare

Dátum: 2026-10-26. Stav: plán pripravený na review, implementácia nezačala.
Úlohy: [technical-pages-redesign-todo.md](technical-pages-redesign-todo.md).
Vizuálna referencia: [HTML prototyp](../prototypes/technical-pages/index.html), commit `ae389042`.

## Cieľ a rozsah

Preniesť schválený technický vzhľad do Resources (VMware, IBM Power, FlashSystem)
a Recovery runs: vysoká hustota čitateľných dát, plná šírka tabuľky, jemné deliace
čiary a žiadne karty vnorené do kariet. Zachovať existujúci aplikačný rám, logo,
paletu, typografiu, navigáciu a detailové dialógy. Používateľské menu presunúť
z hlavičky **vľavo dole do sidebaru**. Táto požiadavka má prednosť pred avatarom
v hlavičke HTML prototypu; v aplikácii nemajú byť dva používateľské ovládače.

Používateľ povolil samostatné plánovacie súbory, pretože `tasks/plan.md` a
`tasks/todo.md` obsahujú nedokončené browser kontroly inej práce. Tieto súbory ani
súbežné `recovery-application-draft-*` plány sa nemenia. Tento plán nepredstavuje
požiadavku implementovať redizajn v tejto plánovacej relácii.

## Overený východiskový stav

- `AppShell` má existujúci zaoblený obsahový rám a publikuje jeho rozmery pre
  centrovanie `DetailView`. `AppSidebar` podporuje rozbalený, zbalený aj mobilný režim.
- `AppHeader` dnes renderuje `UserMenu`. Ten číta `AuthContext`, zobrazuje jazyk,
  `ThemeSelector` a logout podľa `isAuthEnabled()`. Dropdown je ukotvený doprava nadol,
  čo sa pre spodnú časť sidebaru nehodí. Položka Settings dnes nemá handler;
  tento redizajn z nej nerobí novú funkciu.
- `InventoryShell` obaľuje obsah cez `Card`; `InventoryPanel` následne používa
  zaoblený `DataTableSurface`. To vytvára vrstvenie, ktoré chce používateľ odstrániť.
  `ResourceInventoryPanel` je reexport `InventoryPanel`, nie samostatná implementácia.
- `DataTableSurface` aj `DataTableToolbar` majú desiatky používateľov. Zmena ich
  globálnych defaultov by rozšírila rozsah mimo schválených stránok.
- Resources už má hustotu, platformovo/providerovo špecifické filtre, URL stav,
  metriky a detailové komponenty. `CollapsibleMetrics` uchováva preferenciu zbalenia.
- Recovery runs zobrazuje entity (aplikácie/skupiny) a ich posledný run, nie plochý
  zoznam všetkých vykonaní ako fixture prototypu. Zachovať All/Applications/Groups,
  výber entity cez URL a `RecoveryRunHistoryDetailView`. Posledné runy sa načítavajú
  pre aktuálnu stránku; nemožno z nich tvrdiť globálny počet úspechov alebo chýb.

## Rozhodnutia

### Používateľské menu

1. Znovu použiť `UserMenu`, AuthContext, ThemeSelector a logout; nevytvárať druhý
   účet, nové nastavenia ani paralelný stav prihlásenia. Nie je nutný presun súboru
   z `src/app/header`, aby sa zbytočne nemenili importy.
2. Pridať len konkrétne možnosti potrebné pre sidebar: umiestnenie a kompaktný
   trigger. Footer sidebaru bude mimo scrollujúcej navigácie, `shrink-0` a oddelený
   čiarou. Dlhý zoznam položiek nesmie vytlačiť účet mimo viewportu.
3. Rozbalený sidebar: avatar, meno a sekundárny identifikátor, menu smerom nahor.
   Zbalený sidebar: avatar s prístupným názvom, menu vpravo od railu so spodným
   zarovnaním. Mobile: účet dole v otvorenom navigačnom paneli, menu v jeho šírke
   smerom nahor. Pri nízkom viewporte menu dostane vlastný scroll a max-height.
4. Ukotvenie nesmie byť orezané navigáciou; rešpektovať vrstvenie dialógov.
   Pri zavretí mobilnej navigácie alebo zmene režimu zavrieť aj otvorené menu.
   Enter/Space otvára, Escape zatvára a vracia focus, klik mimo zatvára.
   Jazyk, téma a logout ostávajú dostupné pri zapnutom aj vypnutom auth podľa
   existujúcich pravidiel. Názov používateľa nesmie určovať šírku sidebaru.
5. Odobrať používateľa z AppHeader; zachovať mobilný toggle a branding.
   Automatické odstránenie celej hlavičky nie je súčasťou rozsahu.

### Dátová pracovná plocha

1. Zachovať vonkajší AppShell, vnútri použiť plochý variant obalu a tabuľky.
   Navrhovaný úzky kontrakt: `appearance="flat"` v `InventoryShell`,
   `InventoryPanel` a `DataTableSurface`; existujúci default zostane nezmenený.
   Použiť explicitné props, nie globálne CSS selektory podľa vnorenia či nový context.
2. Zapínať variant iba v Resources a Recovery runs. Žiadne plošné prepisovanie Card,
   globálnych radius tokenov alebo ostatných stránok. Metriky prezentovať ako pás
   oddelený čiarami, bez zmeny výpočtov a preferencie zbalenia.
3. Existujúce toolbar komponenty dostať voliteľné kompaktné rozostupy. Rozšírené
   filtre a ich Apply/Cancel/Reset správanie ponechať; nekopírovať zjednodušený
   platform/status filter z fixture cez produkčné filtre.
4. V kompaktnom režime cieľ 32 px pre bežný jednoriadkový záznam, text 12–13 px,
   numerické stĺpce vpravo, technické identifikátory monospace. Dlhé chyby alebo
   viacriadkový obsah môžu riadok zväčšiť; neorezávať ovládanie kvôli pevnej výške.
   Zachovať comfortable režim, sticky hlavičky a existujúcu virtualizáciu.
   Fixovaný prvý stĺpec doplniť len cez opt-in, s overením šírok a prekrytia.
5. Tabuľka využíva celú šírku. Žiadny inline/bočný detail ani prepínač Show detail.
   Existujúce `DetailView`, detailové komponenty, ich sekcie, dátové fetchovanie,
   nested dialógy a focus správanie sú funkčným kontraktom, nie cieľom redizajnu.
6. Zachovať URL stav, provider ID, výbery, triedenie, stránkovanie, retry, cached
   dáta, loading/empty/error stavy a discovery lifecycle. Žiadne zmeny API,
   generated schém, query keys, závislostí ani syntetické dáta v produkcii.
7. Všetky nové používateľské texty idú do EN/SK/CS; najprv opätovne použiť existujúce
   kľúče. Vzhľad musí fungovať v oboch témach a pri 320/768/1024/1440 px.

## Poradie a checkpointy

| Krok | Výsledok | Závislosť |
| --- | --- | --- |
| T1 | UserMenu podporuje spodné ukotvenie a kompaktný trigger | — |
| T2 | Účet je iba vo footeri sidebaru, header bez účtu | T1 |
| A | Kontrola účtu, mobilu, tém, auth a vrstvenia | T1–T2 |
| T3 | Opt-in plochý obal tabuľky a inventory | — |
| T4 | Plochý variant zapojený v Resources a Recovery runs | T3 |
| B | Celá šírka, žiadne vnorené karty, pôvodné dialógy | T3–T4 |
| T5 | Kompaktný pás metrík Resources | T4 |
| T6 | Opt-in kompaktný toolbar | T3 |
| C | Metriky a toolbar bez straty pôvodného správania | T5–T6 |
| T7 | Kompaktné Resources tabuľky a scroll | T4, T6 |
| T8 | Recovery runs s kompaktnou tabuľkou a hustotou | T4, T6, T7 |
| D | Regresie providerov a recovery histórie | T7–T8 |
| T9 | Skeletony a prípadné nové preklady | T2, T5–T8 |
| T10 | Finálne browser overenie a evidencia | T1–T9 |

Podrobné kritériá, súbory a príkazy sú v todo dokumente. Úlohy majú najviac päť
pravdepodobne menených súborov (evidencia v todo navyše); ak sa rozsah rozšíri,
rozdeliť úlohu pred implementáciou. T1–T2 sú najrizikovejší používateľský rez.
T3 je malá príprava, T4 ju hneď zapojí do používateľského toku.
Pracovať sekvenčne: úlohy zdieľajú obaly aj toolbary. Paralelné agenty nie sú potrebné.

## Overovanie a dokončenie

- Každá úloha: relevantné test súbory uvedené v todo, focused ESLint nad zmenenými
  TS/TSX a `git diff --check`. Zmenu kontraktov shared props overiť typecheckom na
  checkpointoch B/D. Testovať správanie, nie snapshot každého CSS utility názvu.
- Browser checkpointy na reálnej aplikácii s bezpečnými fixtures/už existujúcou
  test infraštruktúrou, nie iba na HTML prototype. Kontrolovať scrollbar, text,
  focus, dropdown a dialog bounding boxes, konzolu a oba farebné režimy.
- `npm run build` spúšťa aj kompletné testy a API kontroly; nespúšťať ho automaticky.
  Plný build/suite iba pri zdôvodnenom širšom dopade alebo explicitnej požiadavke.
- Po každom overenom reze atómový commit iba jeho súborov; žiadny push alebo merge.
  Nesúvisiace zmeny zachovať. Nedostupné browser overenie označiť ako nesplnené,
  nenahrádzať ho tvrdením, že DOM testy overili vzhľad.

## Riziká a ošetrenie

| Riziko | Dopad | Ošetrenie |
| --- | --- | --- |
| Menu pod spodnou hranou/orezané navigáciou | Vysoký | Footer mimo scroll oblasti, menu nahor, max-height, test rail/mobile/nízky viewport. |
| Menu nad detailovým dialógom | Vysoký | Zachovať stacking AppSidebar/DetailView, browser interakčný test. |
| Shared štýly zmenia iné stránky | Vysoký | Opt-in varianty a kontrolná stránka bez opt-in. |
| Plochý obal rozbije min-height/scroll | Vysoký | Zachovať min-h-0 a viewport kontajnery, overiť loading aj veľa riadkov. |
| Fixture návrhu zmení význam dát | Vysoký | Recovery runs ostávajú entity + latest run; bez globálnych falošných KPI. |
| Fixovaný stĺpec prekryje obsah | Stredný | Nepriehľadné pozadie, lokálny z-index, scroll/focus pri 320 px a 200 % zoom. |
| Zbalenie metrík alebo providerové filtre sa resetujú | Stredný | Pôvodné storage/URL kľúče a existujúce regresné testy. |
| Duplicitný účet v prototype | Stredný | Autoritatívne zadanie: jediný účet vo footeri sidebaru, nie header avatar. |

## Otvorené body a hranice

Nie sú blokujúce produktové otázky. Prvá implementácia sa týka dvoch overených
rodín stránok; rozšírenie na ostatné tabuľky, dashboardy a formuláre je ďalší rozsah.
Plán je pripravený na schválenie; schválenie vzhľadu neznamená, že jeho úlohy už
boli vykonané. Počas tejto relácie sa kontrolujú len plánovacie dokumenty,
aplikačné testy ani build sa nespúšťajú a runtime sa nemení.
