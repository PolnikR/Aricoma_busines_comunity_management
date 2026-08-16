# Task Checklist: Recovery Group Policy Set Details (Variant A)

## Shared SelectableCard

- [ ] Pridať voliteľný generický obsahový slot do `SelectableCard`.
- [ ] Zachovať existujúci vzhľad a správanie bez použitia slotu.
- [ ] Doplniť test obsahu, keyboard activation, selected a disabled stavu.
- [ ] Spustiť focused test a lint shared karty.

## Policy Set karty a detail

- [ ] Mountnúť policy katalóg iba pri neprázdnom zozname Policy Setov.
- [ ] Načítať Snapshot, Recovery application a Clean Room policies existujúcimi hookmi.
- [ ] Vytvoriť lookup podľa policy ID bez nového API alebo submit kontraktu.
- [ ] Na každej karte zobraziť tri resolved policy názvy.
- [ ] Pod kartami zobraziť detail aktuálne vybraného Policy Setu.
- [ ] Zobraziť Snapshot frequency, retention a status.
- [ ] Zobraziť Recovery frequency, selection mode, retention a boot verification.
- [ ] Zobraziť Clean Room description a status.
- [ ] Zachovať pôvodné ID a warning pri chýbajúcej referencii alebo query chybe.
- [ ] Zachovať možnosť výberu a pokračovania pri chybe detailov.
- [ ] Doplniť loading stav policy detailov.
- [ ] Doplniť prístupný live región pre zmenu detailu.
- [ ] Doplniť responzívny layout cez existujúce Tailwind tokeny.

## Lokalizácie

- [ ] Opraviť opis Policy Set kroku tak, aby uvádzal všetky tri druhy politík.
- [ ] Pridať potrebné EN, SK a CS texty.
- [ ] Odstrániť nepoužívaný a zavádzajúci `policiesCount` kľúč.

## Testy Recovery Group flow

- [ ] Rozšíriť `RecoveryGroupPolicySetStep.test.tsx` o tri policy fixtures.
- [ ] Overiť resolved názvy na kartách a detail predvybraného setu.
- [ ] Overiť prepnutie detailu a callback výberu.
- [ ] Overiť loading, empty a missing-ID fallback.
- [ ] Doplniť tri policy hook mocky do `RecoveryGroupBuilder.test.tsx`.
- [ ] Overiť policy informácie v builder flow bez zmeny submit payloadu.

## Finálne overenie a commit

- [ ] Spustiť tri dotknuté test súbory jedným focused Vitest príkazom.
- [ ] Spustiť ESLint iba nad zmenenými TS/TSX súbormi.
- [ ] Spustiť `npm run typecheck`, pretože sa mení shared TypeScript rozhranie.
- [ ] Manuálne overiť create/edit flow, desktop a úzky viewport.
- [ ] Manuálne overiť loading, chybu a chýbajúcu referenciu.
- [ ] Spustiť `git diff --check`.
- [ ] Skontrolovať, že staging neobsahuje cudzie zmeny.
- [ ] Commitnúť ako `feat: show policy details in recovery group selection`.
