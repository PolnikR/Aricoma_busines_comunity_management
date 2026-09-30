# Úlohy: Recovery Group topology UI + backend

## Aktívne rozšírenie: Metro Mirror predvyplnenie (2026-09-30)

Plán: `tasks/plan.md`, fáza MM1–MM7. Zatiaľ iba naplánované; pôvodná implementačná história nižšie zostáva zachovaná.

- [ ] MM1: Generated relationship lookup hook a focused testy.
- [ ] MM2: Reconciliácia automatických, ručných a uložených hodnôt.
- [ ] Kontrolný bod MM-A: Reset pravidlá a ochrana ručných úprav.
- [ ] MM3: Oddeliť Topology gate od úplnej storage/submit validácie.
- [ ] MM4: Presun CG do controlled storage panelu zo shared komponentov.
- [ ] Kontrolný bod MM-B: Topology bez CG a jediný zdroj draft stavu.
- [ ] MM5: Integrácia do Related storage aj volume-only Resources.
- [ ] MM6: en/sk/cs a contract test uloženia ručných opráv.
- [ ] Kontrolný bod MM-C: Payload a edit round-trip bez provenance.
- [ ] MM7: Responzívny browser smoke a autorizovaný read-only backend lookup.
- [ ] Focused testy/lint/typecheck podľa plánu, výsledky a limity zaznamenané.
- [ ] Overené implementačné zmeny atomicky commitnuté na prototype; bez merge/push.

## Pôvodná fáza — historický stav

Autoritatívny plán: tasks/plan.md. Pracovisko: .worktrees/topology-preview, vetva prototype/recovery-group-topology. Implementácia prebieha v tejto konverzácii.

- [x] T1: Read model a Local/Metro round-trip fixture mapovanie.
- [x] T2: Submit validácia a generated payload pre VM aj volume-only.
- [x] Kontrolný bod A: Zachovaný kontrakt, metadata a legacy Local.
- [x] T3: Generated submit hooks, response record, refresh a chyby.
- [x] T4: Shared resource row slot a dostupný úplný názov.
- [x] T5: Controlled Topology komponent a partner validácia.
- [x] T6: Wizard indexy, edit initialization, Source/discovery prechody.
- [x] Kontrolný bod B: Local regresia a Metro inventory kontext.
- [x] T7: Auxiliary input v každom vybranom drag-and-drop volume riadku.
- [ ] T8: en/sk/cs a responzívny app layout s viditeľným footerom (browserové rozlíšenia a zoom neoverené: browser service unavailable).
- [x] T9: Create/edit round-trip kontrakt a focused testy.
- [ ] Kontrolný bod C: Browser výsledky chýbajú; živý backend smoke test nebol vykonaný.

Pri každej úlohe:
- [x] Akceptačné kritériá implementačných úloh a focused testy podľa tasks/plan.md.
- [x] Cielený lint, relevantný typecheck a git diff --check.
- [ ] Atomic commit výhradne na prototype/recovery-group-topology.

Focused testy: 14 súborov, 115 testov prešlo; tsc, ESLint a git diff --check prešli. Browserový vizuálny test nebolo možné spustiť, pretože browser service nebola dostupná. Neprepínať hlavný checkout, nepushovať ani nemergovať do test bez samostatného zadania.
