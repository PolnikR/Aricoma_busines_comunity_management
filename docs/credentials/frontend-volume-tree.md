# Volume Tree — Frontend Integration Guide

`GET /get_volume_tree` returns ready-made trees. You do not assemble anything: every
node has the same shape, so one recursive component renders all three views.

## Request

```
GET /get_volume_tree?provider_id=ibm-flashsystem-01&view=all
X-User: admin
```

| param | values | default | notes |
|---|---|---|---|
| `provider_id` | a FLASHCOPY provider id | `ibm-flashsystem-01` | 400 if unknown or wrong type |
| `view` | `all` \| `snapshot` \| `consistency_group` \| `flat` | `all` | 422 if anything else |

Permission: `VIEW_INVENTORY`.

**Fetch once with `view=all`.** All three trees come back in a single response, so
switching view tabs is local state, not a request. The backend's cost is the same either
way, so re-fetching per tab only adds latency.

## Response

```json
{
  "provider_id": "ibm-flashsystem-01",
  "provider_type": "FLASHCOPY",
  "counts": { "pools": 2, "volumes": 42, "fcmaps": 38, "consistency_groups": 19 },
  "views": {
    "snapshot":          [ /* pool nodes */ ],
    "consistency_group": [ /* pool nodes */ ],
    "flat":              [ /* pool nodes */ ]
  }
}
```

`counts` describes the source data, not node counts — a tree can show more nodes than
`counts.volumes` (a volume may appear under several mappings) or fewer (SnapshotView hides
targets at the top level). With `view=<single>`, `views` has only that one key.

## The node envelope

Every node at every level:

```json
{
  "kind": "volume",
  "id": "1",
  "name": "V5000_VOLUME01",
  "key": "pool:0/volume:1",
  "detail": { "...": "..." },
  "children": []
}
```

| field | notes |
|---|---|
| `kind` | `pool` \| `volume` \| `fcmap` \| `consistency_group` — switch your row renderer on this |
| `id` | IBM object id, or `null` on a synthetic node |
| `name` | display name |
| `key` | **use this as your list key**, not `id` |
| `detail` | the raw IBM record plus derived fields |
| `children` | always present, `[]` at a leaf |

**Use `key`, not `id`.** The same object legitimately appears more than once in a tree — a
consistency group spanning two pools is rendered under both, and a volume can sit under
several mappings. `key` is the full path (`pool:0/volume:1/fcmap:10`) and is unique within
a tree. Reusing `id` will make React collapse or mis-associate rows.

## Rendering

```jsx
function Node({ node, depth = 0 }) {
  const [open, setOpen] = useState(false);
  const hasChildren = node.children.length > 0;
  return (
    <>
      <div style={{ paddingLeft: depth * 20 }}>
        {hasChildren && (
          <button onClick={() => setOpen(!open)}>{open ? "▾" : "▸"}</button>
        )}
        <Row kind={node.kind} name={node.name} detail={node.detail} />
      </div>
      {open && node.children.map(child => (
        <Node key={child.key} node={child} depth={depth + 1} />
      ))}
    </>
  );
}

// views.snapshot.map(pool => <Node key={pool.key} node={pool} />)
```

That is the whole tree. Only `Row` differs per view, and only because different `kind`s
deserve different columns.

## The three views

All three are rooted at pools, and **every pool appears in every view even when empty**.
That is deliberate: the top level is identical across tabs, so expansion state survives a
view switch. On the reference V5000 that means Pool0 (42 volumes) and Pool1 (empty) show
up in all three.

### `flat` — Pool → Volume

The complete inventory. Every volume appears exactly once, snapshot targets included.
Volume nodes are leaves. Matches the IBM GUI's **Volumes** page.

```
Pool0                                        (volume_count 42)
├── V5000_VOLUME01
├── V5000_VOLUME02
├── RDM_DISK01
├── t6514c730V5000_VOLUME01_00000            (is_snapshot_target: true)
└── ...
Pool1                                        (volume_count 0)
```

### `snapshot` — Pool → Volume → FlashCopyMapping → TargetVolume

Matches the IBM GUI's FlashCopy-by-volume page. Only volumes that are **not** themselves a
FlashCopy target appear at the top level, so Pool0 shows 4 rows instead of 42.

```
Pool0
├── V5000_VOLUME01                           (has_snapshots: true, snapshot_count: 19)
│   ├── m6514c730V5000_VOLUME01_00000        (fcmap, copying, start_time_iso 2026-08-05T17:47:51)
│   │   └── t6514c730V5000_VOLUME01_00000    (volume, role target, is_snapshot_target: true)
│   └── m6514c730V5000_VOLUME01_00001        (fcmap)
│       └── t6514c730V5000_VOLUME01_00001    (volume, role target)
├── V5000_VOLUME02                           (has_snapshots: true, snapshot_count: 19)
├── RDM_DISK01                               (leaf — no mappings)
└── RDM_DISK02                               (leaf — no mappings)
Pool1
```

Target volumes are leaves here. A snapshot that is itself a source (a cascade) shows
`has_snapshots: true` but its own mappings are **not** expanded — render it as a leaf with
an indicator rather than assuming it has no children.

### `consistency_group` — Pool → CG → FlashCopyMapping → SourceVolume → TargetVolume

Matches the IBM GUI's **Consistency Groups** page. Five levels: the mapping holds the
source, the source holds the target.

```
Pool0
├── g6514c730_00000                          (consistency_group, fc_mapping_count 2)
│   ├── m6514c730V5000_VOLUME01_00000        (fcmap)
│   │   └── V5000_VOLUME01                   (volume, role source)
│   │       └── t6514c730V5000_VOLUME01_00000   (volume, role target)
│   └── m6514c730V5000_VOLUME02_00000        (fcmap)
│       └── V5000_VOLUME02                   (volume, role source)
│           └── t6514c730V5000_VOLUME02_00000   (volume, role target)
├── g6514c730_00001                          (fc_mapping_count 2)
└── ... 17 more groups
Pool1
```

A consistency group has no pool of its own — `lsfcconsistgrp` doesn't model one, and a
group can span pools. The backend derives the edge from each mapping's source volume, so:

- A group spanning pools is rendered **under each pool it touches**, with
  `spans_pools: true`. Show a badge; the same group id appearing twice is correct, not a
  bug.
- Under each pool a group shows only that pool's mappings. `fc_mapping_count` is the
  **whole** group, so it can exceed `children.length` — expected on a spanning group, equal
  on every other one.

## Derived fields in `detail`

`detail` is the raw `lsmdiskgrp` / `lsvdisk` / `lsfcmap` / `lsfcconsistgrp` record with
these added. Everything else is whatever the array returned, so fields vary slightly by
firmware — read defensively.

| kind | field | meaning |
|---|---|---|
| `pool` | `volume_count` | direct volume children **in this view**; `0` in `consistency_group`, where children are groups — use `children.length` there |
| `volume` | `is_snapshot_target` | this volume is some mapping's target |
| `volume` | `has_snapshots` | this volume is some mapping's source |
| `volume` | `snapshot_count` | how many |
| `volume` | `role` | `source` \| `target`; present only when nested under a mapping |
| `volume` | `host_maps` | `[{host_id, host_name, cluster_name, scsi_id}]`, names already inlined |
| `volume` | `resolved` | `false` on a placeholder — see below |
| `fcmap` | `start_time_iso` | the GUI's "Flash Time" |
| `consistency_group` | `fc_mapping_count` | mappings in the whole group |
| `consistency_group` | `spans_pools` | rendered under more than one pool |
| `consistency_group` | `pool_ids` | which pools |
| `consistency_group` | `is_synthetic` | the "Not in a Group" bucket |

**`start_time_iso` is naive.** `"2026-08-05T17:47:51"` — no `Z`, no offset, because the
FlashSystem reports its own local time with no zone. Do **not** parse it as UTC; a
`new Date(...)` will silently apply the browser's zone and shift the displayed time. Render
it as-is, or label it with the array's timezone if you know it. `null` means the mapping
has not started or the value was unparseable.

There is no top-level `hosts` or `clusters` map — the tree has no host level, and host and
cluster names are already inlined into each volume's `host_maps`.

## Suggested columns

| view | level | columns |
|---|---|---|
| all | pool | `name`, `detail.status`, `detail.capacity`, `detail.free_capacity`, `detail.volume_count` |
| flat / snapshot | volume | `name`, `detail.status`, `detail.capacity`, `detail.vdisk_UID`, host names from `detail.host_maps` |
| snapshot / cg | fcmap | `name`, `detail.status`, `detail.progress`, `detail.group_name`, `detail.start_time_iso` |
| cg | consistency_group | `name`, `detail.status`, `detail.fc_mapping_count` |

These mirror the IBM GUI's own columns for the corresponding pages.

## Nodes that need deliberate handling

Three node types can show up and should be rendered on purpose, not as surprises. None
appear on the current reference system, so they will not surface during casual testing —
handle them anyway.

- **`Unassigned` pool** (`kind: "pool"`, `id: null`, `key: "pool:unassigned"`) — volumes
  whose pool the array didn't report. Mirrored volumes report `mdisk_grp_id: "many"` and
  land here, as do consistency groups with no mappings. Only present when it has children.
- **`Not in a Group`** (`kind: "consistency_group"`, `id: null`, `is_synthetic: true`) —
  FlashCopy mappings belonging to no consistency group. The IBM GUI shows the same bucket.
  Style it differently from a real group; it has no status of its own, and its `detail` has
  only the derived keys.
- **`resolved: false` volumes** — a mapping referenced a volume the array didn't return in
  `lsvdisk` (deleted between calls, or on a remote system). `name` is the best available
  label and `detail` contains only `{resolved: false}` plus `role`. Render greyed out with
  a tooltip; do not assume any other field exists.

## Errors

| status | meaning |
|---|---|
| 400 | unknown `provider_id`, not a FLASHCOPY provider, or no credential mapped |
| 401 | missing or unknown `X-User` |
| 403 | user lacks `VIEW_INVENTORY` |
| 422 | invalid `view` value |
