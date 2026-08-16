# Implementation Plan: Policy Set Details in Recovery Group Wizard (Variant A)

## Overview

V kroku `Policy set` pri vytváraní alebo úprave Recovery Group zostanú existujúce výberové karty. Každá karta navyše zobrazí názvy troch politík, ktoré Policy Set skutočne združuje: Snapshot policy, Recovery application policy a Clean Room policy. Po výbere sa pod kartami zobrazí responzívny detail troch politík s ich rozhodujúcimi parametrami. Zmena je iba frontendová a používa existujúce TanStack Query hooky a backend endpointy.

## Architecture Decisions

- `RecoveryGroupBuilder` naďalej vlastní iba zoznam Policy Setov a vybrané `policySetId`; jeho draft ani submit payload sa nemenia.
- Dátové hooky `useSnapshotPolicies`, `useRecoveryAppPolicies` a `useCleanRoomPolicies` sa zavolajú v internom katalógu kroku, ktorý sa renderuje iba vtedy, keď existuje aspoň jeden Policy Set. Prázdny stav preto nespustí tri nepotrebné policy requesty.
- Existujúci shared `SelectableCard` dostane voliteľný generický obsahový slot. Doterajšie použitia zostanú bez zmeny a policy špecifický layout nevznikne v shared vrstve.
- Existujúce preklady intervalov, selection mode a yes/no sa znovu použijú, aby boli údaje zhodné s Recovery Policy tabuľkami.
- Načítavanie alebo chyba detailov nesmie blokovať výber Policy Setu ani pokračovanie vo wizardovi. Pri chýbajúcej alebo nenačítanej referencii sa zobrazí pôvodné policy ID a upozornenie.
- Detail sa aktualizuje pri zmene výberu, pri editácii sa zobrazí pre predvybraný Policy Set a bude oznámený cez `aria-live="polite"`.
- Nepridáva sa nový shared policy komponent, kým nebude rovnaký detail reálne potrebný na druhom mieste.

## Dependency Graph

```text
SelectableCard optional content slot
    -> policy datasets and ID-to-record resolution
        -> card summaries and selected Policy Set detail
            -> builder regression coverage
                -> focused verification and commit
```

## Task 1: Rozšíriť shared SelectableCard o voliteľný obsah

**Description:** Pridať do existujúceho shared komponentu voliteľný `content` slot renderovaný medzi opisom a spodným meta riadkom. Slot bude všeobecný `ReactNode`, bez znalosti Policy Setov, a nesmie zmeniť správanie existujúcich kariet.

**Acceptance criteria:**

- [ ] Nový slot sa zobrazí v rámci klikateľnej karty a zdedí jej selected, disabled a focus správanie.
- [ ] Karta bez slotu má rovnaký význam, štýl a rozloženie ako pred zmenou.
- [ ] Keyboard activation, `aria-pressed` a disabled stav zostanú funkčné.

**Verification:**

- [ ] `npm run test -- src/shared/components/selectable-card/SelectableCard.test.tsx`
- [ ] `npm exec eslint -- src/shared/components/selectable-card/SelectableCard.tsx src/shared/components/selectable-card/SelectableCard.test.tsx`

**Dependencies:** None

**Files likely touched:**

- `src/shared/components/selectable-card/SelectableCard.tsx`
- `src/shared/components/selectable-card/SelectableCard.test.tsx`

**Estimated scope:** Small (2 files)

## Task 2: Zobraziť resolved politiky a detail vybraného Policy Setu

**Description:** Doplniť variant A do `RecoveryGroupPolicySetStep`. Interný katalóg načíta tri policy datasety, vytvorí lookup mapy podľa ID, zobrazí tri názvy na každej karte a pre vybraný Policy Set vykreslí detailný trojstĺpcový panel. Na mobile sa panel aj karty zložia pod seba.

**Acceptance criteria:**

- [ ] Každá karta zobrazuje Snapshot, Recovery application a Clean Room policy s názvom vyriešeným z referenčného ID.
- [ ] Vybraná karta zobrazí pod zoznamom detail všetkých troch politík a detail sa po kliknutí prepne na nový set.
- [ ] Snapshot detail obsahuje frekvenciu, retenciu a stav.
- [ ] Recovery detail obsahuje frekvenciu, selection mode, retenciu a boot verification.
- [ ] Clean Room detail obsahuje opis a stav.
- [ ] Policy Set loading a empty state zostanú nezmenené a bez Policy Setov sa detailné policy hooky nespustia.
- [ ] Pri loading stave sa nezobrazia zavádzajúce údaje; pri chybe alebo chýbajúcej referencii zostane viditeľné pôvodné ID, ale karta sa dá vybrať.
- [ ] Text `1 policy` sa odstráni a opis kroku správne vysvetlí tri druhy politík.
- [ ] EN, SK a CS obsahujú všetky nové texty a nepoužívaný `policiesCount` kľúč sa odstráni.
- [ ] Layout používa existujúce Tailwind tokeny a responzívne prejde z troch stĺpcov na jeden.

**Verification:**

- [ ] `npm run test -- src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetStep.test.tsx`
- [ ] Test pokrýva resolved názvy, detail predvybraného setu, prepnutie výberu, loading, empty state a fallback na chýbajúce ID.
- [ ] Spustiť ESLint iba nad zmeneným komponentom a testom.
- [ ] Manuálne skontrolovať variant A v create aj edit Recovery Group flow.

**Dependencies:** Task 1

**Files likely touched:**

- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetStep.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetStep.test.tsx`
- `src/locales/en.json`
- `src/locales/sk.json`
- `src/locales/cs.json`

**Estimated scope:** Medium (5 files)

## Checkpoint: Variant A funguje izolovane

- [ ] Existujúci výber Policy Setu stále mení `policySetId`.
- [ ] Karty aj detail používajú reálne dáta z existujúcich policy hookov.
- [ ] Chyba doplnkových dát nezablokuje wizard.
- [ ] Focused testy Tasks 1–2 prechádzajú.

## Task 3: Aktualizovať integračné testy RecoveryGroupBuildera

**Description:** Doplniť do existujúceho builder test harnessu mocky troch nových policy hookov a overiť, že pri prechode na Policy Set krok používateľ vidí resolved policy informácie bez zmeny draftu alebo submit payloadu.

**Acceptance criteria:**

- [ ] Builder testy neposielajú reálne requesty a používajú deterministické Snapshot, Recovery application a Clean Room fixtures.
- [ ] Integračný scenár potvrdí zobrazenie resolved informácií a zachovanie výberu `tier2-apps`.
- [ ] Existujúce create/edit a orchestration scenáre zostanú bez zmeny produkčného kontraktu.

**Verification:**

- [ ] `npm run test -- src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx`
- [ ] `npm exec eslint -- src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx`

**Dependencies:** Task 2

**Files likely touched:**

- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx`

**Estimated scope:** Extra small (1 file)

## Task 4: Finálne cielené overenie a commit

**Description:** Overiť iba zasiahnutú shared kartu a Recovery Group policy výber. Keďže sa mení shared TypeScript rozhranie, spustiť aj typecheck; kompletný test suite ani produkčný build sa bez novej potreby nespúšťa.

**Acceptance criteria:**

- [ ] Všetky dotknuté testy, focused lint a typecheck prejdú.
- [ ] Manuálne je overený create aj edit flow, desktop aj úzky viewport a loading/error fallback.
- [ ] Finálny diff obsahuje iba variant A, jeho testy, lokalizácie a plánované shared rozšírenie.
- [ ] Implementácia je uložená v jednom atomickom feature commite.

**Verification:**

- [ ] `npm run test -- src/shared/components/selectable-card/SelectableCard.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetStep.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx`
- [ ] `npm exec eslint -- src/shared/components/selectable-card/SelectableCard.tsx src/shared/components/selectable-card/SelectableCard.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetStep.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetStep.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx`
- [ ] `npm run typecheck`
- [ ] `git diff --check`
- [ ] `git status --short` a kontrola presného staging scope.
- [ ] Commit: `feat: show policy details in recovery group selection`

**Dependencies:** Tasks 1–3

**Files likely touched:** Only files listed in Tasks 1–3, unless verification identifies a directly related defect.

**Estimated scope:** Small (verification and one commit)

## Final Checkpoint

- [ ] Používateľ pred potvrdením výberu pozná všetky tri účinné politiky Policy Setu.
- [ ] UI zodpovedá variantu A: súhrn na kartách a detail vybraného setu pod nimi.
- [ ] Backend API, Recovery Group payload a uložené `policySetId` zostávajú nezmenené.
- [ ] Affected tests, focused lint a typecheck sú úspešné.
- [ ] Kompletný test suite ani full build sa nespúšťa, pretože zmena má presne určený focused rozsah.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Policy Set odkazuje na zmazanú politiku | Vysoký | Zobraziť pôvodné ID a upozornenie. |
| Jedna z troch policy queries zlyhá | Stredný | Ostatné oblasti zobraziť a výber neblokovať. |
| Nový obsah zmení ostatné SelectableCard použitia | Stredný | Slot ponechať voliteľný, pokryť shared testom a typecheckom. |
| Dlhé názvy zväčšia krok mimo viewportu | Stredný | Kompaktné riadky, bezpečné zalamovanie a responzívny detail. |
| Tri requesty sa vykonajú zbytočne | Nízky | Hooky mountnúť iba pri neprázdnom zozname a využiť TanStack cache. |
| Intervaly budú odlišné od policy tabuliek | Stredný | Použiť rovnaké existujúce prekladové kľúče. |

## Out of Scope

- Zmena backend endpointov alebo Policy Set schémy.
- Zmena Recovery Group submit payloadu alebo validácie uloženého `policySetId`.
- Editovanie politík priamo z wizardu.
- Rovnaký redizajn Policy Set kroku v Recovery Application builderi.
- Refaktor existujúcich formatterov v Recovery Policy tabuľkách.
- Kompletný test suite alebo full build bez zistenia cross-cutting problému.
