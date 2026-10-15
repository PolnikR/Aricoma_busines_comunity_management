# Dashboard chart study · 5 design references

Standalone visual prototype. Does **not** alter the production React Overview or its BE contract.

Open \`prototypes/dashboard-chart-study/index.html\` in the project preview server. Use \`?style=ibm|linear|sentry|vercel|supabase\` for direct comparison.

## Reviewed sources

Original \`DESIGN.md\` texts from [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md/tree/main/design-md):

- [IBM](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/ibm/DESIGN.md): Carbon; square edges, flat panels, tight rule-based comparisons. Issues visualization: horizontal ranking bars.
- [Linear](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/linear.app/DESIGN.md): dark, restrained lavender technical UI. Issues visualization: 100% stacked share and four compact summaries.
- [Sentry](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/sentry/DESIGN.md): dense developer monitoring, violet/lime semantics. Issues visualization: ranked lollipop chart.
- [Vercel](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/vercel/DESIGN.md): precise minimal hierarchy, restrained boundaries. Issues visualization: donut and readable label/value/percent legend.
- [Supabase](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/supabase/DESIGN.md): quiet neutral surfaces, compact emerald accents. Issues visualization: proportional area tiles.

All variants deliberately keep the same ABCO information architecture: four existing top KPIs, the 2×2 lower grid (Issues Distribution, Recovery Groups Topology plus snapshot context, technology-grouped Infrastructure Overview, and Recovery Applications). The actual app shell remains untouched; a narrow demo shell shows available proportions.

## Mock dataset / interpretation

Top KPI sample: failed snapshot job groups=3; affected replication groups=7; failed provider connections=4; missing provider-volumes=5. The left chart displays each **share of the sum of these four counts** (19). **This is not a total of 19 unique incidents**, because the KPIs have different units and can overlap in consequences. Pie/bar labels should not claim otherwise.

Topology sample: 24 groups (16 local / 8 remote). Snapshot extras are separately defined:
- 42 IBM FlashCopy mappings from current storage inventory: **not** guaranteed restore points.
- 18 Recovery Groups with a configured \`policy_set_id\`: **not** proof that snapshot creation succeeded.
- The FlashCopy mapping source has naive vendor-local start time without timezone; don't present snapshot freshness without a validated temporal contract.
- TrueCopy/Hitachi remains outside the current concrete IBM-only mapping count until the CCI integration is available.

Infrastructure sample shows an arbitrary number of providers **grouped by technology**, not one visual tile per registered provider; the displayed Hitachi volumes are **illustrative only**, not currently retrievable from the audited abco-be data sources.

Recovery Apps sample: 34 applications (26 explicitly \`orchestration.pushed=true\`, 8 not deployed), 23 VMware and 11 IBM Power. "Deployed" is config state, not healthy protection.

## Decision boundaries

- Never duplicate per-category interactive click-to-filter mechanisms in lower panels.
- KPI cards will eventually navigate to their matching app section; the prototype has no fake action routes.
- The new \`GET /dashboard/overview\` and collectors are **not implemented**. Do not remove demo markers or fabricate live percentages.
- Keep the current 4 top cards and existing Recovery Groups donut concept, add snapshot context beneath or beside it.
- Fit 2×2 compact grid on a desktop-sized ABCO content viewport; mobile natural scrolling is acceptable.
- After choosing a variant, implement selectively using existing app tokens, not a wholesale new brand theme, imported brand fonts or copied public-site chrome.
