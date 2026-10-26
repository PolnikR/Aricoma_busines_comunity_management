# Snapshot Policy UX – TODO

Plán a kompletné EN/SK texty: [snapshot-policy-ux-plan.md](snapshot-policy-ux-plan.md).
Stav: iba plánovanie. Produkčné zmeny sa začnú až po následnom schválení.
Súbory feature sú relatívne k `src/features/recovery-plans/recovery-policies/snapshot/components/`, ostatné cesty k rootu repozitára.

## Vstupný checkpoint

- [ ] Používateľ schválil plán, prevod jednotiek, historické hodnoty a úzky slot DetailField.
- [ ] Texty zo zadania boli porovnané s dostupným originálom backendovej dokumentácie SnapshotPolicy; rozpory sú vyriešené.
- [ ] Overený aktuálny worktree a súbežné zmeny; žiadna cudzia práca nebude prepísaná.

## Úloha 1: Platná Frequency v Create aj Edit

**Popis:** Zaviesť minimum/krok podľa jednotky, úvodných 15 minutes, explicitný prevod jednotiek a bezpečnú editáciu starých intervalov podľa plánu.

**Akceptačné kritériá:**
- [ ] Minutes prijíma 15/30/45/60/75/90; odmieta prázdnu hodnotu, 0, záporné, necelé, 5/7/20 a nečíselné hodnoty; hours/days používajú minimum/krok 1. Neplatný submit vrátane Enter nevytvorí request.
- [ ] Prepnutie 1 hour → 60 minutes, 90 minutes → 2 hours, 1 day → 24 hours a 7 minutes → 1 hour je atómové; zaokrúhlenie oznamuje lokalizovaný status. Neplatné zdrojové číslo ponechá pôvodný pár s chybou. Retention ostáva nezmenená.
- [ ] Edit 5/7/20 minút pri otvorení nemení dáta ani dirty stav; uloženie vyžaduje opravu. Platný create/edit payload a dirty guard ostávajú funkčné.

**Overenie:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPolicyModal.test.tsx`
- [ ] JSON parser pre `src/locales/en.json` a `src/locales/sk.json`; focused ESLint na zmenených TSX.
- [ ] Ručne prepnutie jednotiek, oznámenie a oprava starej politiky.

**Závislosti:** vstupný checkpoint.
**Súbory:** `SnapshotPolicyForm.tsx`, `SnapshotPolicyModal.tsx`, `SnapshotPolicyModal.test.tsx`, `src/locales/en.json`, `src/locales/sk.json`.
**Rozsah:** M, 5 súborov.

## Úloha 2: Usporiadanie existujúcich polí

**Popis:** Premiestniť polia bez nových sekcií a bez zmeny ovládacích prvkov.

**Akceptačné kritériá:**
- [ ] Riadky sú Level/Status, Frequency/Maximum snapshots/Retention, FlashCopy; ID/Name/Description zostanú na mieste.
- [ ] DOM a tab poradie sú zhodné s vizuálnym; dvojice hodnota/jednotka zostávajú spolu.
- [ ] Bez horizontálneho scrollu pri 320/375/768 px aj desktop; FlashCopy slider, presety a vysvetlenie zachované.

**Overenie:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPolicyModal.test.tsx src/features/recovery-plans/recovery-policies/snapshot/components/FlashCopyCopyRateField.test.tsx`
- [ ] Focused ESLint na zmenenom TSX; vizuálna kontrola EN/SK pri uvedených šírkach.

**Závislosti:** 1.
**Súbory:** `SnapshotPolicyForm.tsx`, `SnapshotPolicyModal.test.tsx`.
**Rozsah:** S, 2 súbory.

## Checkpoint po úlohách 1–2

- [ ] Cielené testy pre oba kroky prešli, Frequency aj layout fungujú spolu.
- [ ] Prebehla vizuálna kontrola a každý krok má overený atomic commit; bez API alebo iných policy zmien.

## Úloha 3: Šesť nápovied v Create/Edit s EN/SK textami

**Popis:** Zapísať kompletné texty z plánu a vložiť existujúci KeyedHelpPopover k šiestim parametrom formulára.

**Akceptačné kritériá:**
- [ ] Presne šesť parametrových triggerov v Create aj Edit, žiadny pri ID/Name/Description; obe locale majú všetkých 18 nových fieldHelp kľúčov a žiadny text o predvolených hodnotách.
- [ ] Trigger je súrodenec labelu, nikdy jeho potomok; input accessible names a unit labels ostávajú správne. FlashCopy má otáznik pri svojom labeli a zachová existujúcu nápovedu aj vizualizáciu.
- [ ] Reprezentatívny test overí otvorenie/zatvorenie, Tab a Escape bez zavretia rodiča; klik/Enter na otázniku nemení hodnoty, dirty guard ani submit payload a nespúšťa request.

**Overenie:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPolicyModal.test.tsx src/features/recovery-plans/recovery-policies/snapshot/components/FlashCopyCopyRateField.test.tsx`
- [ ] Parser locale a kontrola úplnej zhody nových EN/SK kľúčov; vo focused integračnom teste použiť skutočné mapy oboch jazykov.
- [ ] Focused ESLint; ručná kontrola focusu a mobile/touch otvorenia.

**Závislosti:** 2.
**Súbory:** `SnapshotPolicyForm.tsx`, `FlashCopyCopyRateField.tsx`, `SnapshotPolicyModal.test.tsx`, `src/locales/en.json`, `src/locales/sk.json`.
**Rozsah:** M, 5 súborov.

## Úloha 4: Minimálny slot pre nápovedu DetailField

**Popis:** Overiť a znovu použiť voliteľný `labelHelp` v existujúcom DetailField bez nového shared komponentu. Pri tvorbe plánu sa tento slot objavil v súbežných necommitnutých zmenách; neprepisovať ich. Ak je pri implementácii už integrovaný a kritériá sú splnené, túto úlohu uzavrieť overením bez duplicitnej úpravy.

**Akceptačné kritériá:**
- [ ] Slot je pri textovom názve v `dt` v grid/overview/technical vetvách; `label` zostáva string a copy názov používa iba pôvodný text.
- [ ] Bez slotu je pôvodný DOM aj vzhľad zachovaný; žiadni ďalší konzumenti sa neupravujú.
- [ ] Shared test pokrýva slot aj pôvodný prípad a utility čítajúce label sa nezávisle overia.

**Overenie:**
- [ ] `npm exec vitest run src/shared/components/detail-view/DetailContent.test.tsx`
- [ ] Focused ESLint na dvoch zmenených súboroch.

**Závislosti:** 3 (spoločný kontrolný bod; technicky slot nezávisí od prekladov).
**Súbory:** `src/shared/components/detail-view/DetailField.tsx`, `src/shared/components/detail-view/DetailContent.test.tsx`.
**Rozsah:** S, 2 súbory.

## Checkpoint po úlohách 3–4

- [ ] EN/SK texty aj integračné testy zodpovedajú schválenému návrhu a neobsahujú default informácie.
- [ ] Shared regresné testy prešli, Create/Edit majú správne labely a focus; zmeny sú overené a commitnuté.

## Úloha 5: Nápoveda jednotlivých parametrov v Display

**Popis:** Zapojiť rovnaké kľúče cez labelHelp pri šiestich existujúcich DetailField.

**Akceptačné kritériá:**
- [ ] Display obsahuje šesť parametrových otáznikov a pôvodný hlavičkový helper; Name/ID/Description nemajú nové otázniky.
- [ ] EN/SK obsah je identický s Create/Edit; pôvodné `snapshotPolicies.help.*` hodnoty a headerActions ostávajú nezmenené.
- [ ] Otváranie, Escape a focus fungujú v DetailView bez zmeny údajov alebo navigácie; ID copy a existujúce testy čítania detailu fungujú.

**Overenie:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPoliciesTable.test.tsx src/shared/components/detail-view/DetailContent.test.tsx`
- [ ] Obsahové porovnanie starých `snapshotPolicies.help.*` kľúčov s východiskovým commitom; focused ESLint.
- [ ] Vizuálna kontrola všetkých troch pohľadov v EN/SK, 320/375/768 px aj desktop, otvorený popover pri okraji viewportu.

**Závislosti:** 3, 4.
**Súbory:** `SnapshotPoliciesTable.tsx`, `SnapshotPoliciesTable.test.tsx`; len ak sa preukáže potreba `src/test-utils/detailView.ts` a jeho priamy test (pred úpravou určiť existujúce pokrytie).
**Rozsah:** S–M, 2–4 súbory.

## Záverečný checkpoint

- [ ] Všetky kritériá plánu a TODO sú splnené; cielené overenia vykonané po príslušných zmenách.
- [ ] `git diff --check` prešiel; všetky zmeny sú v samostatných overených commitoch.
- [ ] Produkčné API/generované typy/Recovery App Policy a Retention pravidlá sa nezmenili; žiadne cudzie zmeny nie sú zahrnuté.
- [ ] V odovzdaní uviesť skutočne spustené focused príkazy a vizuálne overenia. Kompletná sada a build sa automaticky nespúšťajú.
