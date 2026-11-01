# Recovery Group DAG versioning — vykonanie

2026-11-01, inline v existujúcom checkoute na vetve `integration/recovery-alignment-20261031`.
Existujúce necommitnuté úpravy plan/todo sa zachovávajú a nebudú zahrnuté do commitov.

## Rozhodnutia používateľa

- D1 schválené: Hitachi katalóg/model/detail, bez nového Hitachi builder flow.
- D2 schválené: existujúce Apps UX, default voľba odosiela null.
- D3 zmenené: backend je autorita validácie. Žiadne nové FE obmedzenia Save/Push
  podľa dostupnosti katalógu alebo členstva verzie. Zachovať explicitnú neznámu verziu.
- Zachovať Push, HTTP 502, rollback a cache flow. Bez dodatočného GET/retry/pollingu.

Tento pokyn nahrádza pôvodné validačné brány T4/T5/T8 a príslušné AC v pláne/TODO.
Shared katalógový validátor sa preto neextrahuje a readiness sa nemení.
Existujúci app validátor ostáva nedotknutý. Group resolver slúži len query/UI.

## Postup

- [ ] F1 / T1–T2: model, API mapovanie a draft lifecycle (in progress).
- [ ] F2 / T3,T5: spoločný prezentačný selector, group platform resolver.
- [ ] F3 / T6–T7: EN/SK/CS, orchestration UI a query.
- [ ] F4 / T8–T9: regresie existujúceho submit/error flow, bez lifecycle zmien.
- [ ] F5 / T10–T11: detail, integrované regresie a browser QA.

## Overenie

- Baseline: 4 cielené test súbory, 75 testov passed.
- F1: red-green pre mapovanie (6 chýbajúcich assertions) a draft event (1 failure).
  Po implementácii 4 súbory / 82 testov passed; app TypeScript check passed.
- Kompletná test sada, production build a live storage/Airflow QA sa nespúšťajú.
