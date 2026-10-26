# Redesign of pages — úlohy

Plán: [redesign-of-pages-plan.md](redesign-of-pages-plan.md).
Stav: pripravené na review; všetky implementačné úlohy otvorené.
Rozsah: Policy sets pilot v štýle ABCO; širší rollout čaká na potvrdenie rozsahu.

## T1: Baseline a presný vizuálny kontrakt

**Popis:** Zachytiť aktuálne správanie a konkretizovať ABCO mapovanie prototypu pred implementáciou; vybrať najmenší lokálny styling seam.

**Akceptačné kritériá:**
- [ ] Zdokumentované sú aktuálne obaly, scroll owner, styling props a rozsah dotknutých konzumentov.
- [ ] Baseline obsahuje light/dark, krátku tabuľku aj viac záznamov pri 1280×600 a uvádza pôvodné chyby oddelene.
- [ ] Rozhodnutie o lokálnom layoute je zapísané; ak treba shared hook, jeho rozsah je rozdelený na samostatný krok do 5 súborov pred úpravou.

**Overenie:**
- [ ] `npm.cmd exec vitest run src/features/recovery-plans/policy-sets/pages/PolicySetsPage.test.tsx src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx src/features/recovery-plans/policy-sets/pages/PolicySetsRefetch.test.tsx`
- [ ] Reálny browser baseline; zaznamenať host, fixture/real data a screenshoty.

**Závislosti:** Žiadne.
**Súbory:** Tento plán a task list (S, 2 dokumenty; zdrojové súbory iba čítať).

## T2: Lokálny layout Policy sets v ABCO

**Popis:** Preniesť hierarchiu Linear/Tremor do existujúcej stránky, odstrániť nadbytočné vnorené rámovanie a upraviť lokálne štýly pri zachovaní scroll kontraktu.

**Akceptačné kritériá:**
- [ ] Jedna dátová plocha, ABCO font/tokeny a jemné oddeľovače; pôvodné lokálne zebra/header override pravidlá nahradené, nie zdvojené.
- [ ] Krátka tabuľka nemá prázdny vnútorný blok pred pagination; pri dlhom obsahu/nízkom desktope zostávajú toolbar a pagination dostupné.
- [ ] Light/dark a obe hustoty zachované; ostatné stránky a globálne shared defaulty sa nemenia.

**Overenie:**
- [ ] Focused `PolicySetsPage.test.tsx` + `PolicySetsTable.test.tsx` cez `npm.cmd exec vitest run` s ich úplnými cestami z T1.
- [ ] `npm.cmd exec eslint -- src/features/recovery-plans/policy-sets/pages/PolicySetsPage.tsx src/features/recovery-plans/policy-sets/components/PolicySetsTable.tsx --max-warnings 0`; pridať zmenené testy.
- [ ] CSS parse, `git diff --check`, browser krátky/dlhý obsah; DOM class assertions nenahrádzajú rozmerové overenie.

**Závislosti:** T1.
**Súbory (M, najviac 5):**
- `src/features/recovery-plans/policy-sets/pages/PolicySetsPage.tsx`
- `src/features/recovery-plans/policy-sets/pages/PolicySetsPage.module.css`
- `src/features/recovery-plans/policy-sets/components/PolicySetsTable.tsx`
- `src/features/recovery-plans/policy-sets/pages/PolicySetsPage.test.tsx`
- `src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx`

## Checkpoint A: Layout

- [ ] T1–T2 majú dôkazy; scroll a dostupná pagination sú overené v reálnom browseri.
- [ ] Pilot neovplyvňuje ostatných konzumentov a používateľ môže posúdiť screenshot výsledku.
- [ ] Overené vlastné zmeny sú atomicky commitnuté.

## T3: Lokalizované označenia politík

**Popis:** Pripraviť iba chýbajúce texty odznakov a nulového stavu; existujúce vhodné preklady znovu použiť.

**Akceptačné kritériá:**
- [ ] Snapshot, Recovery, Clean room a nulový stav majú ekvivalent v EN/SK/CS.
- [ ] Texty neoznačujú platnosť, úspešnosť ani ochranu iba na základe prítomnosti ID.
- [ ] Ostatné prekladové kľúče zostávajú bez zmeny.

**Overenie:**
- [ ] JSON parse všetkých troch jazykov a kontrola existencie/neprázdnosti konkrétnych nových kľúčov.
- [ ] `npm.cmd exec vitest run src/locales/policyCatalogTranslations.test.ts`; `git diff --check`.

**Závislosti:** T2.
**Súbory (M, 3):** `src/locales/en.json`, `src/locales/sk.json`, `src/locales/cs.json`.

## T4: Čitateľné bunky a zachované akcie

**Popis:** Prispôsobiť názov/ID, popis a politické referencie; napojiť prezentáciu na skutočné záznamy bez novej dátovej vrstvy.

**Akceptačné kritériá:**
- [ ] Odznaky aj počet vychádzajú zo skutočných neprázdnych ID; test pokrýva 0/1/3 referencie aj neznámu/missing referenciu. Žiadne statické demo počty alebo nové requesty.
- [ ] Click aj klávesnica zachovávajú detail; JSON neotvorí zároveň detail, focus/Escape fungujú podľa existujúcich komponentov.
- [ ] Search, density, pagination, refresh, edit/delete a všetky request stavy zachovávajú pôvodné správanie; žiadny nový filter z HTML.

**Overenie:**
- [ ] `npm.cmd exec vitest run src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx src/features/recovery-plans/policy-sets/pages/PolicySetsPage.test.tsx src/features/recovery-plans/policy-sets/pages/PolicySetsRefetch.test.tsx src/features/recovery-plans/policy-sets/components/PolicySetModal.test.tsx`
- [ ] Focused ESLint zmenených TSX/testov, `git diff --check`; nový behavior test len pre skutočné zmeny a zistené regresie.

**Závislosti:** T3.
**Súbory (M, najviac 4):** `PolicySetsTable.tsx`, `PolicySetsTable.test.tsx` v `src/features/recovery-plans/policy-sets/components/`; `PolicySetsPage.module.css` a podľa potreby `PolicySetsPage.test.tsx` v `src/features/recovery-plans/policy-sets/pages/`.

## Checkpoint B: Funkčná kompatibilita

- [ ] T3–T4 prešli cielenými kontrolami; žiadna zmena API payloadov, query keys ani doménových pravidiel.
- [ ] Preklady a zobrazenie neznámych referencií ostávajú zrozumiteľné.
- [ ] Overené vlastné zmeny sú atomicky commitnuté.

## T5: Browser a accessibility QA

**Popis:** Overiť skutočný render a interakcie stránky, nie len HTML/DOM. Výsledky zapísať s presným prostredím a limitmi.

**Akceptačné kritériá:**
- [ ] Overené viewporty 320/768/1024/1440 px a 1280×600, light/dark, compact/comfortable, dlhé hodnoty a 0/4/viac než page size záznamov; horizontálny scroll nepresahuje stránku.
- [ ] Loading, no-match, error/cached-error/retry, post-delete refresh, klávesnicový detail/JSON a návrat focusu fungujú; žiadne nové console/network chyby.
- [ ] Kontrast a prístupné názvy sú overené; screenshoty pred/po a zoznam scenárov sú priložené. Nedostupný browser ponechá úlohu otvorenú.

**Overenie:**
- [ ] Reálny browser a computed styles/accessibility tree. Zaznamenať presnú URL a identitu načítanej stránky.
- [ ] Mutácie overovať na izolovaných fixture dátach alebo výslovne určených testovacích záznamoch; žiadne nevyžiadané mazanie reálnych záznamov.
- [ ] Prípadné opravy do samostatných malých rezov, potom zopakovať iba dotknuté kontroly. Plný build/suite iba pri odôvodnenom širšom zásahu.

**Závislosti:** T4.
**Súbory (S, 1–2):** Tento task list a prípadný `tasks/redesign-of-pages-browser-qa.md`; screenshoty ako evidence. QA dokument vytvoriť až pri skutočnom overení.

## T6: Vyhodnotenie pilotu a rozsah rolloutu

**Popis:** Pred rozšírením zhodnotiť pilot a zmapovať ostatné tabuľkové stránky bez ich implementácie.

**Akceptačné kritériá:**
- [ ] Používateľ posúdil ABCO pilot a potvrdil zoznam ďalších stránok, alebo uzavrel rozsah na Policy sets.
- [ ] Pre potvrdený rollout existuje mapa route/komponent/test/výnimka vrátane Resources virtualizácie a URL filtrov; žiadna globálna zmena len podľa podobnosti screenshotu.
- [ ] Konflikty so staršími redesign plánmi, vetva a vlastníctvo shared zmien sú vyriešené; ďalšie úlohy rozdelené do max. približne 5 súborov.

**Overenie:**
- [ ] CodeGraph audit aktuálnych konzumentov, kontrola existencie ciest a `git diff --check` dokumentov.
- [ ] Rozšírenie implementácie sa začne až po review konkrétnej rollout matice.

**Závislosti:** T5.
**Súbory (S, 2):** Tento plán a task list.

## Checkpoint C: Odovzdanie pilotu

- [ ] Automatické aj reálne browser kontroly doložené; otvorené limity explicitné.
- [ ] Vlastné overené zmeny commitnuté, bez push/merge a bez cudzích súborov.
- [ ] Používateľ schválil výsledný vzhľad; následný rollout má samostatne potvrdený rozsah.
