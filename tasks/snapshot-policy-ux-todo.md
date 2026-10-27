# Snapshot Policy UX – TODO

Plán a kompletné EN/SK texty: [snapshot-policy-ux-plan.md](snapshot-policy-ux-plan.md).
Stav: implementované inline na pokyn používateľa; automatické kontroly prešli. Otvorené zostávajú vizuálne a ručné browser kontroly, pretože Computer Use ukončil ovládanie prehliadača pri nespoľahlivom určení URL na Windows.
Súbory feature sú relatívne k `src/features/recovery-plans/recovery-policies/snapshot/components/`, ostatné cesty k rootu repozitára.

## Vstupný checkpoint

- [x] Používateľ schválil plán, vyprázdnenie Frequency pri zmene jednotky, historické hodnoty a úzky slot DetailField.
- [x] Texty zo zadania boli porovnané s dostupným originálom backendovej dokumentácie SnapshotPolicy; rozpory sú vyriešené.
- [x] Overený aktuálny worktree a súbežné zmeny; žiadna cudzia práca nebude prepísaná.

## Úloha 1: Platná Frequency v Create aj Edit

**Popis:** Zaviesť minimum/krok podľa jednotky, úvodných 15 minutes, vyprázdnenie čísla pri manuálnej zmene jednotky (bez prepočtu a zaokrúhlenia) a bezpečné načítanie starých intervalov podľa plánu.

**Akceptačné kritériá:**
- [x] Minutes prijíma 15/30/45/60/75/90; odmieta prázdnu hodnotu, 0, záporné, necelé, 5/7/20 a nečíselné hodnoty; hours/days používajú minimum/krok 1. Neplatný submit vrátane Enter nevytvorí request.
- [x] Pri manuálnom prepnutí minutes ↔ hours ↔ days sa jednotka zmení a číselná Frequency sa vyprázdni (`''`) v jednej aktualizácii; neexistuje prevod, zaokrúhlenie ani status hláška. Výber už zvolenej jednotky hodnotu nemení. Save/Enter s prázdnou hodnotou neodošle request. Retention ostáva nezmenená.
- [x] Edit 5/7/20 minút pri otvorení nemení dáta ani dirty stav; uloženie vyžaduje opravu. Platný create/edit payload a dirty guard ostávajú funkčné.

**Overenie:**
- [x] `npm exec vitest run src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPolicyModal.test.tsx`
- [x] JSON parser pre `src/locales/en.json` a `src/locales/sk.json`; focused ESLint na zmenených TSX.
- [ ] Ručne prepnutie jednotiek a vyprázdnenie hodnoty, neplatný submit a otvorenie starej politiky bez zmeny údajov.

**Závislosti:** vstupný checkpoint.
**Súbory:** `SnapshotPolicyForm.tsx`, `SnapshotPolicyModal.tsx`, `SnapshotPolicyModal.test.tsx`, `src/locales/en.json`, `src/locales/sk.json`.
**Rozsah:** M, 5 súborov.

## Úloha 2: Usporiadanie existujúcich polí

**Popis:** Premiestniť polia bez nových sekcií a bez zmeny ovládacích prvkov.

**Akceptačné kritériá:**
- [x] Riadky sú Level/Status, Frequency/Maximum snapshots/Retention, FlashCopy; ID/Name/Description zostanú na mieste.
- [ ] DOM a tab poradie sú zhodné s vizuálnym; dvojice hodnota/jednotka zostávajú spolu.
- [ ] Bez horizontálneho scrollu pri 320/375/768 px aj desktop; FlashCopy slider, presety a vysvetlenie zachované.

**Overenie:**
- [x] `npm exec vitest run src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPolicyModal.test.tsx src/features/recovery-plans/recovery-policies/snapshot/components/FlashCopyCopyRateField.test.tsx`
- [ ] Focused ESLint na zmenenom TSX; vizuálna kontrola EN/SK pri uvedených šírkach.

**Závislosti:** 1.
**Súbory:** `SnapshotPolicyForm.tsx`, `SnapshotPolicyModal.test.tsx`.
**Rozsah:** S, 2 súbory.

## Checkpoint po úlohách 1–2

- [x] Cielené testy pre oba kroky prešli, Frequency aj layout fungujú spolu.
- [ ] Prebehla vizuálna kontrola a každý krok má overený atomic commit; bez API alebo iných policy zmien.

## Úloha 3: Šesť nápovied v Create/Edit s EN/SK textami

**Popis:** Zapísať kompletné texty z plánu a vložiť existujúci KeyedHelpPopover k šiestim parametrom formulára.

**Akceptačné kritériá:**
- [x] Presne šesť parametrových triggerov v Create aj Edit, žiadny pri ID/Name/Description; obe locale majú všetkých 18 nových fieldHelp kľúčov a žiadny text o predvolených hodnotách.
- [ ] Trigger je súrodenec labelu, nikdy jeho potomok; input accessible names a unit labels ostávajú správne. FlashCopy má otáznik pri svojom labeli a zachová existujúcu nápovedu aj vizualizáciu.
- [x] Reprezentatívny test overí otvorenie/zatvorenie, Tab a Escape bez zavretia rodiča; klik/Enter na otázniku nemení hodnoty, dirty guard ani submit payload a nespúšťa request.

**Overenie:**
- [x] `npm exec vitest run src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPolicyModal.test.tsx src/features/recovery-plans/recovery-policies/snapshot/components/FlashCopyCopyRateField.test.tsx`
- [x] Parser locale a kontrola úplnej zhody nových EN/SK kľúčov; vo focused integračnom teste použiť skutočné mapy oboch jazykov.
- [ ] Focused ESLint; ručná kontrola focusu a mobile/touch otvorenia.

**Závislosti:** 2.
**Súbory:** `SnapshotPolicyForm.tsx`, `FlashCopyCopyRateField.tsx`, `SnapshotPolicyModal.test.tsx`, `src/locales/en.json`, `src/locales/sk.json`.
**Rozsah:** M, 5 súborov.

## Úloha 4: Minimálny slot pre nápovedu DetailField

**Popis:** Overiť a znovu použiť voliteľný `labelHelp` v existujúcom DetailField bez nového shared komponentu. Pri tvorbe plánu sa tento slot objavil v súbežných necommitnutých zmenách; neprepisovať ich. Ak je pri implementácii už integrovaný a kritériá sú splnené, túto úlohu uzavrieť overením bez duplicitnej úpravy.

**Akceptačné kritériá:**
- [x] Slot je pri textovom názve v `dt` v grid/overview/technical vetvách; `label` zostáva string a copy názov používa iba pôvodný text.
- [x] Bez slotu je pôvodný DOM aj vzhľad zachovaný; žiadni ďalší konzumenti sa neupravujú.
- [x] Shared test pokrýva slot aj pôvodný prípad a utility čítajúce label sa nezávisle overia.

**Overenie:**
- [x] `npm exec vitest run src/shared/components/detail-view/DetailContent.test.tsx`
- [x] Focused ESLint na dvoch zmenených súboroch.

**Závislosti:** 3 (spoločný kontrolný bod; technicky slot nezávisí od prekladov).
**Súbory:** `src/shared/components/detail-view/DetailField.tsx`, `src/shared/components/detail-view/DetailContent.test.tsx`.
**Rozsah:** S, 2 súbory.

## Checkpoint po úlohách 3–4

- [x] EN/SK texty aj integračné testy zodpovedajú schválenému návrhu a neobsahujú default informácie.
- [x] Shared regresné testy prešli, Create/Edit majú správne labely a focus; zmeny sú overené a commitnuté.

## Úloha 5: Nápoveda jednotlivých parametrov v Display

**Popis:** Zapojiť rovnaké kľúče cez labelHelp pri šiestich existujúcich DetailField.

**Akceptačné kritériá:**
- [x] Display obsahuje šesť parametrových otáznikov a pôvodný hlavičkový helper; Name/ID/Description nemajú nové otázniky.
- [x] EN/SK obsah je identický s Create/Edit; pôvodné `snapshotPolicies.help.*` hodnoty a headerActions ostávajú nezmenené.
- [x] Otváranie, Escape a focus fungujú v DetailView bez zmeny údajov alebo navigácie; ID copy a existujúce testy čítania detailu fungujú.

**Overenie:**
- [x] `npm exec vitest run src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPoliciesTable.test.tsx src/shared/components/detail-view/DetailContent.test.tsx`
- [x] Obsahové porovnanie starých `snapshotPolicies.help.*` kľúčov s východiskovým commitom; focused ESLint.
- [ ] Vizuálna kontrola všetkých troch pohľadov v EN/SK, 320/375/768 px aj desktop, otvorený popover pri okraji viewportu.

**Závislosti:** 3, 4.
**Súbory:** `SnapshotPoliciesTable.tsx`, `SnapshotPoliciesTable.test.tsx`; len ak sa preukáže potreba `src/test-utils/detailView.ts` a jeho priamy test (pred úpravou určiť existujúce pokrytie).
**Rozsah:** S–M, 2–4 súbory.

## Záverečný checkpoint

- [ ] Všetky kritériá plánu a TODO sú splnené; cielené overenia vykonané po príslušných zmenách.
- [x] `git diff --check` prešiel; všetky zmeny sú v samostatných overených commitoch.
- [x] Produkčné API/generované typy/Recovery App Policy a Retention pravidlá sa nezmenili; žiadne cudzie zmeny nie sú zahrnuté.
- [ ] V odovzdaní uviesť skutočne spustené focused príkazy a vizuálne overenia. Kompletná sada a build sa automaticky nespúšťajú.

## Záznam overenia – 26. 10. 2026

- Automaticky: 90 testov v 5 dotknutých testovacích súboroch, focused ESLint, focused TypeScript a locale JSON/content kontrola. Po typovej oprave nového testu opakovane overený SnapshotPolicyHelp.
- Nový testovací súbor: `src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPolicyHelp.test.tsx` pokrýva skutočné EN/SK mapy v Create/Edit/Display.
- Shared slot už existoval; znovu použitý bez úprav shared produkčného kódu alebo test utilities.
- Otvorené checkboxy označujú ručné/vizuálne overenie, nie chýbajúcu implementáciu. Browser nástroj skončil pred zobrazením Snapshot Policy; nevznikla žiadna uložená testovacia politika.
