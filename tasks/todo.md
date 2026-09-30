# Úlohy: Recovery Group topology UI + backend

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
