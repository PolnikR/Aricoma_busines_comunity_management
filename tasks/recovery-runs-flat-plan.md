# Recovery runs — Flat workspace

Dátum: 2026-10-22. Stav: implementované inline; cielené testy a browser kontrola s fixture dátami prešli.
Úlohy: [recovery-runs-flat-todo.md](recovery-runs-flat-todo.md).
Používateľ schválil tieto samostatné názvy dokumentov. Existujúce plány iných prác sa nemenia.

## Cieľ

Použiť smer Flat workspace iba na existujúcej stránke Recovery runs. Získať viac priestoru pre dáta odstránením vnorených kariet a odsadení, pri zachovaní vizuálneho jazyka aplikácie a existujúcich funkcií.

## Výsledná podoba

```text
Recovery runs                                      Refresh
Execution history and status of recovery runs.

All    Applications    Recovery Groups
----------------------------------------------------------
Search name or ID…
----------------------------------------------------------
APPLICATION       TYPE             LATEST RUN  STARTED  DURATION
a                 Application      No runs yet    —         —
teste             Recovery Group   Success      18:45       8s
----------------------------------------------------------
Showing 1–2 of 2       Rows [10]                   ‹ 1 ›
```

- Jedna súvislá plocha: hlavička stránky, záložky, vyhľadávanie, tabuľka a stránkovanie.
- Spoločný ľavý okraj; jemné deliace linky namiesto ďalších zaoblených kariet a tieňov.
- Odstrániť opakovaný nadpis Orchestrated entities. Jeho užitočné vysvetlenie o poslednom behu a entitách bez orchestration zachovať ako stručný pomocný text bez samostatnej sekcie.
- Zachovať vonkajší aplikačný rám, navigáciu, farby, typografiu a existujúce tlačidlá.
- Cieľová kompaktná výška riadka približne 40 px; čitateľnosť a obsah majú prednosť pred pevnou výškou.
- Na desktope posúvať dátovú oblasť, držať hlavičku tabuľky a stránkovanie dostupné. Na úzkych displejoch zalomiť ovládanie a umožniť vodorovné posúvanie tabuľky bez pretečenia celej stránky.
- Výber entity otvára existujúci detail histórie behov; nový inspector z HTML prototypu nie je súčasťou tejto zmeny.

## Rozsah a rozhodnutia

Referenčný prototyp: `prototypes/data-workspaces/recovery-runs-flat.html`. Preniesť rozloženie, nie syntetické dáta ani nové funkcie prototypu.

Aktuálna kompozícia používa RecoveryRunsPage → InventoryShell → RecoveryRunsTable → DataTableSurface. Odstrániť InventoryShell z tejto stránky a použiť jednoduchú lokálnu kompozíciu. Pred implementáciou overiť aktuálne možnosti DataTableSurface cez CodeGraph. Ak potrebuje explicitný variant bez rámu, pridať minimálnu opt-in možnosť so zachovaním predvoleného vzhľadu všetkých ostatných stránok. Nepoužívať krehké globálne CSS prepisy ani kopírovať dátovú logiku.

Zachovať existujúce stĺpce, podmienené zobrazenie typu entity, URL stav, filtre, stránkovanie, refresh, retry a detail. Bez úprav API, query keys, načítavania alebo Resources.

Nepridávať globálne počítadlá úspešných či zlyhaných behov: posledné behy sa dnes načítavajú pre zobrazené entity, takže takéto počty by nemali úplné dátové pokrytie. Nepridávať prepínač hustoty ani nové filtre iba preto, že ich obsahuje prototyp.

## Poradie

1. T1: Sploštiť kompozíciu Recovery runs a izolovať prípadný variant shared surface.
2. T2: Dokončiť hustotu, rozmery a posúvanie; checkpoint funkčného a vizuálneho rozsahu.
3. T3: Overiť existujúce správanie a browser zobrazenie, opraviť regresie a commitnúť.

Podrobné kritériá a príkazy sú v task liste. Pracovať sekvenčne, keďže kroky menia rovnakú kompozíciu.

## Riziká

| Riziko | Opatrenie |
| --- | --- |
| Zmena vzhľadu ostatných tabuliek | Lokálna kompozícia, prípadný shared variant iba opt-in; test predvoleného variantu. |
| Vnorené scrollbary alebo skryté stránkovanie | Overiť flex min-height a scroll ownership na desktope aj pri nízkom okne. |
| Strata loading/error/retry alebo detailu | Zachovať existujúce komponenty a vykonať cielené regresné testy. |
| Súbežná práca na orchestration detaile | Pred implementáciou skontrolovať Git diff; nemení sa detail ani cudzie plánovacie dokumenty. |

## Hranica dokončenia

Recovery runs používa jednu dátovú plochu, existujúce správanie funguje, ostatné stránky majú pôvodný vzhľad a cielené testy aj browser kontrola sú zdokumentované. Kompletný test suite ani production build nie sú predvoleným overením tejto zmeny.
