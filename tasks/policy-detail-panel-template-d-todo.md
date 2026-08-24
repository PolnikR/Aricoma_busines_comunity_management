# Checklist: Template D — stacked facts pre Policy Detail Panel

## Scope guard

- [ ] Zachovať props kontrakt `RecoveryGroupPolicySetDetails` bez zmeny.
- [ ] Nezasahovať do `RecoveryGroupPolicySetCatalogue.tsx` ani
      `RecoveryGroupPolicySetList.tsx`.
- [ ] Nezasahovať do dátového modelu `PolicySet` (backend/OpenAPI/orval) —
      rieši sa iba vykresľovacia vrstva.
- [ ] Zachovať existujúci obsah faktov a i18n kľúče.
- [ ] Zachovať loading/incomplete/error stav badge logiky.

## Fáza 1: Príprava

- [ ] Úloha 1 — pridať `RefreshIcon` a `ShieldIcon` do `Icons.tsx` v
      existujúcom štýle (20×20, `stroke="currentColor"`, `aria-hidden`).
- [ ] Úloha 2 — RED: rozšíriť `RecoveryGroupPolicySetStep.test.tsx` o
      assertions na 3 ikony (jedna na sekciu), potvrdiť očakávané zlyhanie.

## Checkpoint: Príprava

- [ ] `npm run typecheck` čistý po Úlohe 1.
- [ ] Nové testy z Úlohy 2 zlyhávajú z očakávaného dôvodu (RED).

## Fáza 2: Dáta-riadené sekcie

- [ ] Úloha 3 — zaviesť `PolicyDetailSection`, `buildSections()` a
      `FactField` (label nad hodnotou) v `RecoveryGroupPolicySetDetails.tsx`.
  - [ ] Presne 3 sekcie sa vykreslia z existujúcich 3 props.
  - [ ] `unavailable` stav funguje na úrovni jednej sekcie.
  - [ ] CSS grid (stĺpce) sa v tomto kroku ešte nemení.
  - [ ] Overené v code review: pridanie 4. sekcie = zmena iba v
        `buildSections()`.

## Checkpoint: Dáta a DOM štruktúra

- [ ] `npm exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetStep.test.tsx` — GREEN.
- [ ] `npm run typecheck` čistý.
- [ ] Vizuálne sa nič nemenilo (bezpečný rollback bod pred layoutom).

## Fáza 3: Layout Template D

- [ ] Úloha 4 — nahradiť `lg:grid-cols-3` vertikálnym stackom sekcií.
  - [ ] Spike: overiť, že Tailwind v4 `@container` funguje v tomto builde
        (alebo pripraviť raw CSS fallback v `index.css`).
  - [ ] Facts blok: 2 stĺpce nad ~560px šírky panelu, 1 stĺpec pod tým.
  - [ ] Reaguje na šírku panelu (`@container`), nie šírku okna.

## Checkpoint: Layout

- [ ] Focused test suite stále GREEN (jsdom neoveruje CSS layout).
- [ ] Manuálna kontrola pri 340px, 600px, 900px — žiadny wrap-collision.

## Fáza 4: Verifikácia

- [ ] Úloha 5 — browser a quality-gate kontrola.
  - [ ] Žiadny wrap-collision pri žiadnej z 3 testovaných šírok.
  - [ ] Ikony konzistentné so zvyškom shared ikon štýlu.
  - [ ] Loading/incomplete/error stav vyzerá funkčne nezmenene.
  - [ ] Žiadne console errory.
  - [ ] `npm run lint` na zmenené súbory.
  - [ ] `npm run typecheck`.
  - [ ] `npm run build` sa nespúšťa (mimo scope, ak nie je explicitne
        vyžiadané).

## Hotovo, keď

- [ ] Sekcie sa vykresľujú z dátovo-riadeného poľa, nie z 3 hardcodovaných
      JSX blokov.
- [ ] Label je vždy nad hodnotou; žiadny wrap-collision pri reálnych šírkach.
- [ ] Počet faktov na riadok reaguje na šírku panelu, nie okna.
- [ ] Props kontrakt a volanie z `RecoveryGroupPolicySetCatalogue.tsx`
      nezmenené.
- [ ] Focused testy, lint, typecheck a browser kontrola prešli.
