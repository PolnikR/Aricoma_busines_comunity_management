# ABCO Frontend

React and TypeScript frontend for the ABCO business continuity management platform.

## Local development

Requirements:

- Node.js 22
- npm

```powershell
npm install
npm run dev
```

The default development URL is `http://localhost:5173`.

## Quality gate

```powershell
npm run check
```

The command runs:

1. type-aware ESLint,
2. the Vitest suite,
3. TypeScript project references,
4. the production Vite build.

Individual commands:

```powershell
npm run lint
npm run test
npm run typecheck
npm run build
```

## Source structure

```text
src/
  app/                         routing and providers
  layouts/                     application shell
  features/                    domain-oriented features
    discovery-inventory/
      api/                     shared discovery HTTP and validation boundary
      model/                   canonical discovery types
      virtual-machines/        paginated inventory view
      infrastructure/          topology domain, layout, and React Flow UI
  shared/                      reusable UI primitives, icons, and utilities
```

Feature-specific code stays inside its feature. A component or utility moves to
`shared` only after a second real consumer exists.

## Infrastructure Topology

The `/discovery-inventory/infrastructure` route renders a read-only topology
using React Flow and ELK.

Current relationships are derived from discovery data:

- Cluster -> Host
- Host -> Virtual Machine
- Virtual Machine -> Datastore

Data flow:

```text
fixture now / real API later
  -> Discovery Inventory API (HTTP + Zod)
  -> canonical discovery model
  -> infrastructure topology mapper
  -> domain nodes and edges
  -> ELK layered layout
  -> React Flow view model
  -> topology workspace
```

The UI never imports the JSON fixture. Replacing the fixture with a real
endpoint should be localized to the shared Discovery Inventory API boundary and
its schema/mapper.

The Virtual Machines table keeps its page and page-size contract. Topology uses
the complete selected inventory because a single table page cannot form a
consistent graph.

### Current fixture

The current fixture contains:

- 1 cluster
- 3 hosts
- 151 virtual machines
- 6 datastores
- 161 nodes and 318 relationships with the datastore layer enabled

Datastore relationships are hidden by default to keep the initial graph
readable. Search, host and power-state filters preserve the cluster/host context
of matching virtual machines. Auto layout recalculates positions; Fit view and
the MiniMap only control navigation.

### Deliberate limitations

The first topology slice does not infer data that the discovery response does
not provide:

- no VM-to-VM application dependencies,
- no recovery tiers or execution order,
- no RTO/RPO,
- no persisted manual node positions,
- no editing of discovered objects or relationships.

Those capabilities require an authoritative backend contract.

## Dependency compatibility

`@xyflow/react` 12.11.2 is published with declarations built against
TypeScript 5.4. The project uses TypeScript 6 with
`exactOptionalPropertyTypes`. `tsconfig.app.json` therefore enables
`skipLibCheck` for third-party declaration internals while all project source
files remain under the existing strict compiler and ESLint rules.

ELK is loaded dynamically and cached by the layout adapter. The Infrastructure
route is lazy-loaded, so React Flow and the ELK engine do not increase the
initial Virtual Machines route bundle.

The main diagram dependencies use these licenses:

- React Flow: MIT
- ELK/elkjs: EPL-2.0

Keep their required license texts in the product's third-party notices when
preparing a distributable release.
