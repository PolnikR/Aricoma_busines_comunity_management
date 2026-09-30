# Plán: Related storage – kompaktný variant A

Dátum: 2026-09-30. Stav: T1–T4b implementované inline a commitnuté; automatické overenie prešlo. Vizuálna časť T5 čaká na dostupný prehliadač. Podrobnosti sú v checkliste.

## Cieľ a rozsah

Zapracovať variant A z `prototypes/related-storage/` do existujúceho Recovery Group wizardu: kompaktnejšie upozornenia, tenšie vybrané riadky a väčšia využiteľná drag & drop plocha. Zachovať existujúce bočné kroky, farby, typografiu, ikony, zaoblenia, tiene, focus stavy a light/dark režim aplikácie. Prototyp je referenciou rozloženia, nie zdrojom produkčného CSS ani validačnej logiky.

Samostatný checklist: [todo.md](./todo.md). Existujúce `tasks/plan.md` a `tasks/todo.md` patria nedokončenej práci na topológii a nesmú sa prepísať ani automaticky označiť za dokončené. Pokyny k vetve v starom pláne patria jeho práci; pred implementáciou overiť aktuálnu vetvu a pracovisko, neprepínať checkout ani nemergovať bez príslušného zadania.

## Overený východiskový stav

- `RecoveryGroupBuilderPage` a `RecoveryGroupEditorPage` zobrazujú chybu uloženia cez `Alert` nad builderom. Hlásenie o `orchestratorConnId` môže byť serverová chyba; nesmie sa z neho odvodiť nová frontendová validácia ani parsovať jeho text na riadenie flow.
- `RecoveryGroupBuilder` zobrazuje samostatný informačný `Alert` pre nevyplnené auxiliary názvy. Má existujúce pravidlá `storageValid`, `discoveryValid` a navigácie medzi krokmi.
- `RecoveryGroupResourcesStep` skladá `ResourceSidebar` a `ResourceSelectionCard`. Výber má vonkajší prerušovaný rám s odsadením a ďalší vnútorný rám s odsadením.
- `ResourceSelectionCard` je zdieľaný komponent s vlastným drop/remove správaním a samostatným checkbox režimom. Globálna zmena hustoty by zasiahla ďalšie obrazovky.
- Auxiliary riadok už používa `TruncatedText` a existujúci `Input size="sm"` cez `renderItemContent`.
- Existujú testy nezávislých scrollovacích oblastí, auxiliary riadkov, drop/remove aj checkbox režimu.

## Rozhodnutia

1. Použiť existujúce aplikačné tokeny a shared komponenty; nekopírovať paletu, font ani globálne CSS z prototypu. Nemeniť `src/index.css` kvôli lokálnej hustote.
2. Kompaktný variant shared komponentov bude voliteľný s nezmenenou predvolenou hodnotou. Zapnúť ho len v určenom flow; nerozširovať restyling na iné pickery ani volume-only Resources krok bez samostatného dôvodu.
3. Červená chyba zostane plne čitateľná a zalomiteľná. Zmenší sa odsadenie a ikona, nie význam alebo obsah. Rozbaľovanie detailov nie je potrebné na prvú implementáciu.
4. Modrý validačný banner v Related storage nahradí krátky pomocný text pri hlavičke vybraných volumes. Zachovať existujúci preklad, podmienku zobrazenia a prístupné prepojenie pomocou `aria-describedby` iba na existujúci element.
5. Bežný desktopový vybraný riadok cieli na približne 40 px. Zachovať `Input size="sm"`; zmenšovať najmä obal a medzery. Na malých displejoch a pri zoome uprednostniť čitateľnosť pred pevnou výškou.
6. Výšku odvodiť z existujúceho aplikačného layoutu. Použiť konzistentné flex/grid obmedzenia, samostatný scroll zoznamov a dostupný footer. Pri nedostatku výšky dovoliť scroll obsahu namiesto orezania.
7. Zachovať discovery, retry, search, clear, deduplikáciu, auxiliary mapovanie, draft, API payload a pravidlá Next/Save. Nepridávať simulované stavy ani validačné pravidlá z prototypu.

## Poradie a kontrolné body

T1 → T2 → kontrolný bod A → T3 → T4 → kontrolný bod B → T5.

- T1: voliteľný kompaktný Alert.
- T2: použitie kompaktného Alert na create/edit stránkach.
- T3: pomocný text namiesto validačného bannera v Related storage.
- T4: kompaktné riadky a využitie dostupnej plochy, rozdelené na T4a a T4b v checkliste.
- T5: regresná a vizuálna kontrola výsledného flow.

Úlohy sa vykonávajú postupne, pretože sa dotýkajú rovnakých komponentov. Každá implementačná úloha končí cieleným overením a atomickým commitom. Checklist obsahuje súbory, závislosti a akceptačné kritériá.

## Overenie výsledku

- Scenáre: 0/1/2 upozornenia, dlhá serverová chyba, prázdny výber, 1/20/100 volumes, dlhé názvy, loading, discovery error a retry.
- Správanie: drag & drop, opakovaný drop bez duplicít, remove, clear, editácia auxiliary, zachovanie hodnôt pri návrate medzi krokmi, existujúca validácia Next/Save.
- Zobrazenie: šírky 320/768/1024/1440 px, notebook 1366 × 768, light/dark, ovládanie klávesnicou a 200 % zoom.
- Pri 1366 × 768 a dvoch bežných upozorneniach cieliť na aspoň 240 px viditeľnej plochy vybraného zoznamu. Zmerať v reálnom prehliadači; pri dlhej správe alebo zoome musí zostať dostupný scroll a footer, nie násilne pevná výška.
- Použiť len explicitné dotknuté Vitest súbory, cielený ESLint a `git diff --check`. Celý build alebo suite nespúšťať štandardne. Typecheck rozšíriť, ak si to vyžiada zmena shared TypeScript kontraktu.
- DOM testy nenahrádzajú meranie layoutu. Ak browser nie je dostupný, vizuálnu kontrolu neoznačiť za hotovú a zaznamenať konkrétny blocker.

## Riziká a hranice

| Riziko | Opatrenie |
| --- | --- |
| Zmena shared komponentu zasiahne ďalšie obrazovky | Voliteľná kompaktná veľkosť; regresné testy default a checkbox režimu. |
| Dlhá chyba znovu zmenší dostupnú výšku | Zalamovanie a dostupný scroll; žiadne orezanie obsahu. |
| Malé riadky skryjú focus alebo ovládanie | Zachovať veľkosť inputu, viditeľný remove a focus ring; klávesnicová a zoom kontrola. |
| Restyling nechtiac zmení business pravidlá | Zachovať existujúcu validáciu a handlery; overiť create/edit a návrat medzi krokmi. |
| Kolízia so starým plánom topológie | Oddelené dokumenty; žiadne prepisovanie jeho stavu ani pracoviska. |

Nie je potrebná zmena backendu, generated API, dátových modelov ani globálnej témy. Ak by ju implementácia vyžadovala, najprv prehodnotiť rozsah a príčinu.
