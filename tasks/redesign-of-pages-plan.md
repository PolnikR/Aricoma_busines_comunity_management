# Redesign of pages — ABCO / Linear + Tremor

Stav: návrh plánu na review; implementácia nezačala.
Úlohy: [redesign-of-pages-todo.md](redesign-of-pages-todo.md).
Referencia: [samostatný HTML template](../prototypes/policy-sets-modern.html), commit `20c682d4`.

## Cieľ a rozsah

Preniesť vizuálnu hierarchiu prototypu do existujúcej aplikácie ABCO: čitateľné názvy, sekundárne identifikátory, jemné oddeľovače, kompaktné ovládanie a obsah bez zbytočných vnorených rámov. Zachovať ABCO paletu, typografiu, aplikačný shell a funkčné kontrakty.

Pracovný predpoklad po používateľovom pomenovaní „redesign of pages“: Policy sets je prvá implementačná etapa; ďalšie tabuľkové stránky sú kandidáti na následný rollout. Používateľ zatiaľ nepotvrdil, že rozsah zahŕňa všetky stránky. Tento dokument preto neoprávňuje plošnú zmenu formulárov, builderov, dashboardov alebo detailov.

Výstup tejto relácie sú iba dva plánovacie dokumenty. `tasks/plan.md` a `tasks/todo.md` patria FlashCopy s otvorenými browser kontrolami a zostávajú nedotknuté. Názov nových dokumentov vychádza z používateľovho „redesign of pages“.

## Východiskový stav a závislosti

- `PolicySetsPage` používa `TableToolbar`, `InventoryShell`, `PolicySetsTable` a existujúci `PolicySetModal`.
- `InventoryShell` vkladá `Card`; `DataTableSurface` pridáva ďalší zaoblený rám a flex/grid výškový kontrakt. Tieto komponenty majú ďalších konzumentov; globálna zmena defaultov nie je bezpečný pilot.
- `PolicySetsTable` vlastní výber, detail, JSON, edit/delete a `useTableState`. Zdroj údajov ostáva `useGetPolicySets` + `selectPolicySets`; post-delete refresh riadi `usePostDeleteRefresh`.
- `useTableState` poskytuje vyhľadávanie, predicate, stránkovanie a hustotu. Zmena search/page size resetuje stránku; samotná zmena predicate ju neresetuje.
- Existujúce lokálne `PolicySetsPage.module.css` pridáva modrú hlavičku, zebra riadky a hrubšie čiary. Nahradiť tieto vlastné pravidlá novým vzhľadom, nevrstviť nad ne ďalšie protichodné override štýly.
- Predošlý plán [scroll layoutu](policy-set-table-scroll-plan.md) dokumentuje odrezanú pagination. Zachovanie ohraničeného desktop scrollu je funkčná požiadavka.
- [Globálny technický redesign](global-table-visual-redesign-plan.md) a [technické stránky](technical-pages-redesign-plan.md) majú iný prototyp a širší rozsah. Tento plán ich automaticky neruší, neoznačuje ako dokončené ani nepreberá ich merge, vetvové či sidebar úlohy. Pri rolloute treba najprv zladiť prekrývajúce sa zmeny.

## ABCO vizuálny kontrakt

| Prvok návrhu | Prenesenie do ABCO |
|---|---|
| Neutrálna pracovná plocha | Existujúce `page`, `surface`, `surface-subtle`, `surface-muted`; žiadna nová globálna paleta |
| Modré akcie | ABCO `accent`, `accent-hover`, `focus`; kontrast textu overiť, nie predpokladať |
| Typografia | Existujúci font aplikácie; monospace iba ID/JSON; nenahrádzať globálne fonty Interom |
| Hierarchia textu | Hlavný názov `text-primary`, ID a popisy dostatočne kontrastné `text-secondary`; malý text nepoužívať automaticky s `text-subtle` |
| Obal tabuľky | Jedna ľahká plocha v existujúcom AppShell; jemná hranica, obmedzený radius, bez reťazca vnorených kariet |
| Hlavička a riadky | Jemné tónovanie, tenké oddeľovače, jasný hover/selection/focus; bez povinnej výraznej zebry |
| Hustota | Zachovať compact/comfortable aj pôvodný default; viacriadkový obsah sa nesmie rezať na pevnú výšku |
| Politiky | Odznaky typov odvodené z reálnych referenčných ID, spolu s počtom; farba neoznačuje validitu referencie |
| Akcie a detail | Existujúci Button, DetailView, JsonViewerModal, ConfirmDialog; žiadne kopírovanie demo dialógu |
| Témy | Light a dark z rovnakých sémantických tokenov; žiadne natvrdo zadané biele pozadie v feature |

Prototyp je referencia vzhľadu, nie nový produktový kontrakt. Neprenášať demo avatar/header, statické počty 4/2, ukážkové názvy referencií, footer s inšpiráciami ani nefunkčné Create upozornenie. Nepridávať knižnice Linear/Tremor, externé fonty či nové API.

## Rozhodnutia pre pilot

1. **Vzhľad lokálne.** Znovu použiť funkčné shared komponenty. Použiť existujúce styling props; chýbajúci hook doplniť iba ako konkrétny opt-in, ak sa bez neho nedá rozumne zachovať layout. Bez globálnych CSS selektorov, zásahu do všetkých `Card` alebo prepisu shared defaultov.
2. **Bez rozšírenia funkcionality.** Zachovať existujúci search, density, pagination a Refresh. Nový filter „With clean room“ a sumarizačný pás z HTML sú voliteľný follow-up, nie súčasť vizuálneho pilotu. Nevytvárať predstieranú záložku bez funkcie.
3. **Odznaky z údajov.** Snapshot/Recovery/Clean room zobraziť len pri neprázdnom príslušnom ID; počet vychádza z rovnakého pravidla ako dnes. Nulová konfigurácia má lokalizovaný neutrálny text. Prítomnosť ID neznamená, že katalóg referenciu vyriešil; existujúce missing/unknown/cached-error vysvetlenia ostávajú v detaile. Žiadne dodatočné per-row requesty.
4. **Výška a scroll.** Pri krátkom obsahu pagination bezprostredne pod riadkami. Pri dlhom obsahu na desktope ohraničené telo, prístupný toolbar/pagination a jediný vertikálny scroll owner; horizontálny scroll patrí tabuľke. Mobile používa prirodzený scroll stránky. Neodstrániť `min-h-0` iba kvôli krátkemu screenshotu.
5. **Interakcie.** Zachovať klávesnicové otvorenie riadku a existujúci výber. JSON neotvára zároveň detail; skontrolovať click aj Enter/Space. Ak sa odhalí preexistujúca chyba bublania udalostí, zaznamenať ju a opraviť len potrebný rozsah s behavior testom.
6. **Lokalizácia.** Nové názvy typov a nulový stav doplniť v EN/SK/CS, preferovať vhodné existujúce kľúče. Žiadne anglické reťazce z template priamo v JSX.

## Poradie a checkpointy

```text
T1 baseline a vizuálny kontrakt
  -> T2 lokálny layout ABCO
  -> checkpoint A (scroll + vzhľad)
  -> T3 preklady odznakov
  -> T4 reálne bunky a akcie
  -> checkpoint B (funkčné regresie)
  -> T5 browser QA
  -> T6 zhodnotenie pilotu a mapa rolloutu
```

Detailné kritériá, súbory a príkazy sú v task liste. Pilot robiť sekvenčne: layout a bunky zdieľajú rovnakú stránku. Paralelné úpravy týchto súborov neprinášajú prínos.

## Overenie

- Focused Vitest: `PolicySetsPage.test.tsx`, `PolicySetsTable.test.tsx`, `PolicySetsRefetch.test.tsx`; `PolicySetModal.test.tsx` pri regresnom overení zachovaného CRUD.
- Pri dotyku shared komponentu pridať jeho konkrétny test, nie celý suite. Shared props/type kontrakt vyžaduje aj `npm.cmd run typecheck`.
- ESLint explicitne na zmenených TS/TSX súboroch, JSON parse a kontrola nových i18n kľúčov, `git diff --check`.
- Reálny browser: 320, 768, 1024, 1440 px; aj nízky desktop 1280×600; light/dark, compact/comfortable, 0/4/viac než jedna stránka záznamov, dlhé ID/popisy.
- Loading, empty, no-match, fatal error, cached error, retry a post-delete refresh nesmú byť nahradené prázdnou tabuľkou. Focus, Escape, návrat focusu, názvy ovládačov, čitateľnosť a horizontálny scroll skontrolovať v browseri.
- Kontrast textu aspoň 4.5:1 (veľký text 3:1), ovládacie hranice a focus 3:1. Úspešný DOM test nedokazuje contrast/layout.
- Browser fixture používa vlastný `cacheDir` a izolovaný profil mimo repozitára. Nikdy nesmie prepísať cache živého Vite servera. Pri localhost kontrole overiť obsah stránky a konzolu, nie iba HTTP 200: SPA fallback môže vrátiť nesprávnu stránku s 200.
- Rozlíšiť fixture browser, reálny aplikačný browser a jsdom. Pri nedostupnom browseri zostáva T5 otvorené; netvrdiť vizuálne dokončenie.
- Plný build ani kompletná test suite nie sú default. Každá overená implementačná úloha má vlastný atomický commit; žiadny push/merge bez zadania.

## Následný rollout (zatiaľ nie implementačné zadanie)

Po prijatí pilotu vytvoriť konkrétnu maticu route → komponenty → výnimky → testy. Kandidáti: ostatné Policies, Providers, Recovery Groups/Applications, Recovery runs, Resources a administratívne zoznamy. Overiť skutočných konzumentov cez CodeGraph. Resources s virtualizáciou a provider filtrami zaradiť samostatne, nie pod generický CSS zásah.

Pred prvým spoločným defaultom rozhodnúť o opt-in variante alebo migrácii konkrétnej skupiny konzumentov. Každá ďalšia úloha má najviac približne päť súborov a vlastné browser scenáre. Audit existujúcich plánov musí určiť vlastníctvo zmeny a cieľovú vetvu; starý pokyn o merge do `test` sa nesmie automaticky vykonať v tejto práci.

## Riziká

| Riziko | Dopad | Ošetrenie |
|---|---|---|
| Shared CSS zmení ostatné stránky | Vysoký | Lokálny pilot, audit konzumentov pred extrakciou |
| Kratšia plocha odreže pagination | Vysoký | Dlhý dataset a nízky viewport už v T2 |
| Odznak naznačuje validnú referenciu | Stredný | Označovať iba typ/prítomnosť, zachovať katalogové stavy |
| Svetlý subtílny dizajn má slabý kontrast | Stredný | ABCO tokeny a namerané hodnoty v oboch témach |
| Súbežný technický redesign prepíše pilot | Vysoký | Explicitné vlastníctvo súborov a kontrola aktuálneho diffu |
| Browser overenie nebude dostupné | Vysoký | Uviesť blokátor, držať vizuálny checkpoint otvorený |

## Otvorené body na review

- Potvrdiť, či názov znamená aj rollout na všetky tabuľkové stránky, alebo iba pomenovanie Policy sets pilotu.
- Pilot teraz nezavádza nové clean-room filtre či metriky. Ak sa majú preniesť aj tieto funkcie z HTML, doplniť samostatný slice so search/pagination reset kontraktom.
- Rozšírenie na formuláre, buildery a vnútorný vzhľad detailov vyžaduje vlastný rozsah.

## Overenie plánovacích dokumentov

Kontrola lokálnych odkazov, existencie pomenovaných súborov, počtu úloh, kritérií a závislostí; `git diff --check`. Implementačné testy ani browser QA sa počas tvorby plánu nevykonávajú.
