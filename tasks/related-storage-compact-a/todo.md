# Úlohy: Related storage – kompaktný variant A

Autoritatívny plán: [plan.md](./plan.md). Implementácia T1–T4b je zapracovaná inline. T5 je čiastočne overená; vizuálna kontrola čaká na dostupný prehliadač. Táto práca nemení staré `tasks/plan.md` a `tasks/todo.md`.

## T1: Voliteľný kompaktný Alert

Pridať kompaktnú veľkosť do existujúceho komponentu, s menším odsadením a ikonou pri zachovaní aplikovaných štýlov.

- [x] Predvolená veľkosť a všetky farebné varianty zostávajú zachované v kóde.
- [x] Kompaktný variant zachová celý text a role; použije existujúce dark tokeny a zalamovanie. Vizuálne overenie patrí do T5.
- [x] Overiť `npm.cmd exec vitest run src/shared/components/alert/Alert.test.tsx` a cielený ESLint.

Súbory: `src/shared/components/alert/Alert.tsx`, `Alert.test.tsx` v rovnakom priečinku. Závislosti: žiadne. Rozsah: S, 2 súbory.

## T2: Kompaktné chyby create/edit

Zapnúť kompaktnú veľkosť pre chybu uloženia na oboch Recovery Group stránkach.

- [x] Create aj edit zobrazujú úplnú chybu; nemení sa jej zdroj ani správanie uloženia.
- [ ] Dlhá chyba nepretečie horizontálne a nestratí sa draft.
- [x] Overiť `npm.cmd exec vitest run src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.test.tsx src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.test.tsx` a cielený ESLint.

Súbory: `RecoveryGroupBuilderPage.tsx`, `RecoveryGroupEditorPage.tsx` a ich testy v `src/features/recovery-plans/recovery-groups/pages/`. Závislosti: T1. Rozsah: M, 4 súbory.

## Kontrolný bod A

- [x] T1–T2 automaticky overené; default veľkosť zachovaná a žiadna nová validácia providera.
- [x] Atómové commity zahŕňajú iba overené zmeny tejto práce.

## T3: Pomocný text pri auxiliary poliach

Presunúť existujúcu validačnú informáciu z veľkého bannera k hlavičke výberu. Použiť malý voliteľný slot/prop v Resources kroku len v potrebnom rozsahu.

- [x] Pomocný text využíva existujúci preklad a tokeny; pôvodný banner sa neduplikuje.
- [x] Auxiliary inputy majú platné prepojenie s pomocným textom; Local a volume-only flow zostanú funkčné.
- [x] Overiť `npm.cmd exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.test.tsx` a cielený ESLint.

Súbory: `RecoveryGroupBuilder.tsx`, `RecoveryGroupResourcesStep.tsx` a ich testy v `src/features/recovery-plans/recovery-groups/components/`. Závislosti: T2. Rozsah: M, 4 súbory.

## T4a: Kompaktný variant vybraných riadkov

Rozšíriť `ResourceSelectionCard` o voliteľnú kompaktnú hustotu bez zmeny existujúcich handlerov.

- [ ] Menšie odsadenie a medzery umožnia približne 40 px desktopový riadok s existujúcim malým inputom.
- [x] Default a checkbox režim, drop/remove a empty state zostali zachované; compact remove má viditeľné ovládanie a focus ring. Vizuálny focus overiť v T5.
- [x] Overiť `npm.cmd exec vitest run src/shared/components/resource-selection/ResourceSelectionCard.test.tsx` a cielený ESLint; výšku potvrdiť v T5.

Súbory: `src/shared/components/resource-selection/ResourceSelectionCard.tsx` a `ResourceSelectionCard.test.tsx`. Závislosti: T3. Rozsah: S, 2 súbory.

## T4b: Zapojenie variantu A a väčšia plocha

Zapnúť kompaktný výber v Related storage. Redukovať vnorené rámiky a odsadenia; upraviť výškové obmedzenia a zachovať bočné kroky.

- [ ] Dostupné a vybrané volumes scrollujú nezávisle; výber využíva zvyšnú výšku a footer je dostupný.
- [ ] Názov, auxiliary input a remove sú na desktope v jednom riadku; úzky viewport a zoom obsah neorežú.
- [x] Overiť `npm.cmd exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx` a cielený ESLint.

Súbory: `RecoveryGroupResourcesStep.tsx`, `RecoveryGroupBuilder.tsx` a ich testy v `src/features/recovery-plans/recovery-groups/components/`. Závislosti: T4a. Rozsah: M, 4 súbory. `ResourceSidebar` meniť iba ak sa preukáže konkrétna potreba; prípadné rozšírenie vyčleniť na samostatnú úlohu s jeho testami.

## Kontrolný bod B

- [x] T3–T4b automaticky overené; kompaktný variant je zapnutý len v dohodnutom flow.
- [x] Existujúca validácia, auxiliary mapovanie a default shared zobrazenie zostali zachované.
- [x] Cielený lint a `git diff --check` prešli; overené zmeny sú commitnuté.

## T5: Regresná a vizuálna kontrola

Overiť výsledný variant A v reálnej aplikácii a zdokumentovať výsledky. Neopakovať úspešné testy bez novej zmeny alebo konkrétnej neistoty.

- [ ] Overiť 0/1/2 upozornenia, dlhú chybu, prázdny výber, 1/20/100 položiek, dlhé názvy, loading/error/retry; drop, remove, clear a auxiliary hodnoty zostanú funkčné.
- [ ] Skontrolovať light/dark, klávesnicu, 200 % zoom a rozmery uvedené v pláne; pri 1366 × 768 a dvoch bežných upozorneniach zmerať cieľ aspoň 240 px plochy zoznamu.
- [ ] Potvrdiť existujúce správanie Next/Save a návratu medzi krokmi; zaznamenať screenshoty/merania, výsledky focused testov a prípadné blokery.

Súbory: tento checklist a podľa skutočne objavenej regresie príslušný dotknutý test. Závislosti: T4b. Rozsah: S pre záznam overenia; opravy deliť podľa nálezu. Celý build ani kompletná suite nie sú štandardnou súčasťou tejto úlohy.

## Dokončenie

- [ ] Všetky akceptačné kritériá splnené; neoverené browserové výsledky nie sú označené ako úspešné.
- [x] `git diff --check` prešiel a každý implementačný commit zahŕňa iba aktuálnu prácu.
- [ ] Odovzdané zhrnutie zmien, konkrétne overovacie príkazy a prípadné obmedzenia.

## Záznam overenia 2026-09-30

- Implementačné commity: `97c859d` (T1–T2) a `21207e9` (T3–T4b). Úlohy boli zoskupené do dvoch funkčne súvisiacich commitov; zdieľané zmeny buildera a Resources kroku zostali spolu.

- T1–T2: 3 testové súbory, 20 testov prešlo (Alert, create page, editor page).
- T3–T4b: posledný beh 3 testových súborov, 47 testov prešlo (ResourceSelectionCard, RecoveryGroupResourcesStep, RecoveryGroupBuilder). Zahŕňa default/compact drop a remove, 100 editable riadkov v oboch hustotách a prístupný pomocný text s návratom medzi krokmi.
- Príkazy Vitest sú uvedené pri úlohách; pre spoločný posledný beh: `npm.cmd exec -- vitest run src/shared/components/resource-selection/ResourceSelectionCard.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx`.
- `npm.cmd exec -- eslint` nad 10 dotknutými TS/TSX súbormi s `--max-warnings 0`: prešlo.
- `npm.cmd run typecheck`: prešlo; spustené pre zmenené shared TypeScript kontrakty.
- `git diff --check`: prešlo. Kompletná testová suite ani produkčný build neboli spustené.
- Browser blocker: `cua.getState()` vrátil prázdne zoznamy apps aj browsers. Pixelové rozmery, 240 px cieľ, light/dark vzhľad, 200 % zoom a browserové ovládanie zostávajú neoverené.
- V priebehu práce pribudli cudzie commity k Metro Mirror prefillu v rovnakom checkoute. Ich logika bola zachovaná; posledné testy a typecheck prešli na súbežnom stave. Staré topologické plány a nesúvisiace súbory nie sú súčasťou tejto zmeny.
