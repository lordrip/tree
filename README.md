# @iron-bark/tree

A DSL-agnostic tree library for turning parsed source code into a structure that any renderer can consume — Kaoto's canvas, a VS Code text panel, a CLI, or anything else.

> For actual trees, better go to the forest 🌲

## Motivation

The goal is an **extensible library that turns DSLs into trees** — not just for Kaoto, but for any tool that needs to operate on a DSL as a tree structure through a standard API.

Think: a text-based rendering of a Camel route in a terminal, an IDE extension that shows a route outline without loading Kaoto, a linter that walks the DSL to flag issues, or tooling that navigates DSL source files the same way an editor navigates an AST. Today each of these would re-implement its own traversal against the raw YAML/XML. This library gives them one shape — `Tree<T>` with `walk()`, `getParent()`, `getChildren()`, `findById()` — and lets new DSLs (Camel, Citrus, whatever comes next) plug in without touching consumers.

## Packages

This is a Yarn 4 monorepo. Three publishable packages plus a playground:

| Package | Path | Purpose |
|---|---|---|
| [`@iron-bark/tree`](packages/core) | `packages/core` | Core tree structure, navigation, traversal. Zero runtime deps. |
| [`@iron-bark/tree-camel`](packages/camel) | `packages/camel` | Parses Apache Camel YAML routes into a `Tree<CamelNodeData>`. |
| [`@iron-bark/tree-citrus`](packages/citrus) | `packages/citrus` | Scaffold for a future Citrus Framework implementation. |
| playground | `packages/playground` | Vite + React dev app for visual verification. Not published. |

Dependency graph:

```
playground → camel  → core
             citrus ↗ (future)
```

## Quick start

```ts
import { createCamelTree } from '@iron-bark/tree-camel';

const tree = createCamelTree(yamlSource, 'yaml');

for (const node of tree.walk()) {
  console.log('  '.repeat(depth(node)) + node.getLabel());
}
```

A consumer that only uses the generic API (`tree.walk()`, `node.getLabel()`, `node.getChildren()`) works against **any** DSL implementation. A consumer that needs DSL specifics narrows via the discriminator:

```ts
if (tree.type === 'camel') {
  const camelTree = tree as Tree<CamelNodeData>;
  showCamelProperties(camelTree.findById(id).data.processorName);
}
```

## Examples

### 1. Pretty-print a route in the terminal

A tiny CLI-style renderer that doesn't know anything about Camel — it only uses the generic API.

```ts
import { createCamelTree } from '@iron-bark/tree-camel';
import type { TreeNode } from '@iron-bark/tree';

const tree = createCamelTree(yamlSource, 'yaml');

function print<T>(node: TreeNode<T>, prefix = '', isLast = true): void {
  const branch = prefix === '' ? '' : isLast ? '└── ' : '├── ';
  console.log(`${prefix}${branch}${node.getLabel()}  —  ${node.getDescription()}`);

  const children = node.getChildren();
  const childPrefix = prefix + (prefix === '' ? '' : isLast ? '    ' : '│   ');
  children.forEach((c, i) => print(c, childPrefix, i === children.length - 1));
}

print(tree.root);
```

Output for `from → log → choice → to`:

```
route  —  route
├── from  —  timer:foo?period=1000
├── log  —  log:myLogger
├── choice  —  choice
│   ├── when  —  ${header.type} == 'a'
│   └── otherwise  —  otherwise
└── to  —  to:mock:result
```

### 2. Lint a route: flag `log` steps with no message

Walks the tree generically, then narrows to Camel for the DSL-specific check.

```ts
import { createCamelTree, type CamelNodeData } from '@iron-bark/tree-camel';

const tree = createCamelTree(yamlSource, 'yaml');

if (tree.type !== 'camel') throw new Error('expected a camel tree');

for (const node of tree.walk()) {
  const data = node.data as CamelNodeData;
  if (data.processorName === 'log' && !data.uri?.includes(':')) {
    console.warn(`[${data.path}] log step is missing a message`);
  }
}
```

### 3. Navigate a DSL file with a standard API

An IDE extension that jumps to the next/previous step in a route — no DSL knowledge required.

```ts
function jumpNext<T>(current: TreeNode<T>): TreeNode<T> | undefined {
  return current.getNextNode() ?? current.getParent()?.getNextNode();
}

function findStepById<T>(tree: Tree<T>, id: string) {
  return tree.findById(id);
}

const selected = findStepById(tree, 'route.from.steps.2.choice');
const next = selected && jumpNext(selected);
console.log(next?.getLabel());
```

## Design choices

Every choice below has a trade-off. They're documented so future contributors know what to preserve and what's open to revisit.

### 1. Generics + a `type` discriminator, not inheritance

`Tree<T>` and `TreeNode<T>` are generic over the DSL's data shape. Each implementation tags its tree with a string discriminator (`'camel'`, `'citrus'`, …).

- **Why:** Renderers that don't care about the DSL stay fully generic. Consumers that do care get a single, type-safe narrowing point. No `CamelTree extends Tree` hierarchy to maintain.
- **Trade-off:** Downcasting is by convention, not enforced by TypeScript. Consumers who skip the `type` check and cast blindly can crash.

### 2. Accessors injected per node, not methods on data

Each node carries a `NodeAccessors<T>` record (`getLabel`, `getDescription`, `getName`, `getIconUrl`) wired in at construction time.

- **Why:** The core calls `node.getLabel()` without knowing what `T` looks like. DSL packages decide how a label is derived (e.g. `componentName ?? processorName` for Camel).
- **Trade-off:** A small amount of per-node memory for the function references, in exchange for a uniform consumer API.

### 3. Explicit sibling links, not derived from the parent's children

`getNextNode()` / `getPreviousNode()` are stored references — not computed from `parent.children`.

- **Why:** Different DSLs wire siblings differently. Camel's `multicast` and `loadBalance` intentionally leave children **unlinked** because they represent parallel branches. A derived model can't express that.
- **Trade-off:** DSL packages are responsible for wiring siblings. `addChild` only sets the parent pointer.

### 4. Immutable after construction

`node.data` is `readonly`. There's no reactive state, no MobX, no observers.

- **Why:** Trees are a *view* over source code. If the source changes, rebuild the tree. This keeps the core simple and predictable.
- **Trade-off:** Consumers that want incremental updates must diff trees themselves (or rebuild and re-render).

### 5. Lazy traversal

`walk()` is a generator, not a materialized array.

- **Why:** Consumers can short-circuit (`for…of` + `break`, `find`) without paying for a full walk. Large trees don't force allocation.
- **Trade-off:** Iterating twice walks twice. Materialize with `[...tree.walk()]` if you need that.

### 6. No index by default; `findById` walks

`DefaultTree.findById` does a linear walk. No `Map<string, Node>` is maintained.

- **Why:** Keeps construction cheap and memory flat. Most trees are small enough that O(n) lookup is invisible.
- **Trade-off:** If a consumer calls `findById` in a hot loop on a large tree, they'll notice. The interface leaves room to add an internal index later without a breaking change.

### 7. Camel: two-phase construction with a mapper registry

The Camel package builds the tree in two phases (recursive node creation, then flattening `from`'s children up to the route root) and dispatches per-processor through a registry of mappers (`ChoiceMapper`, `MulticastMapper`, …).

- **Why:** Mirrors how Kaoto's `AbstractCamelVisualEntity.toVizNode()` works today, and matches the visual shape users already expect. The registry lets new processors be added without touching existing ones.
- **Trade-off:** The tree shape doesn't mirror YAML nesting 1:1. That's intentional, but it surprises people reading the code for the first time.

## Development

```bash
yarn install
yarn workspaces foreach -A --topological run build
yarn test
```

Run a single package:

```bash
yarn workspace @iron-bark/tree test
yarn workspace @iron-bark/tree-camel build
```

Playground:

```bash
yarn workspace @iron-bark/tree-playground dev
```

## Status

V1 scope for the Camel package covers routes, `choice`/`when`/`otherwise`, `doTry`/`doCatch`/`doFinally`, `multicast`, `loadBalance`, `circuitBreaker`/`onFallback`, and the basic processors (`log`, `setHeader`, `setBody`, `to`, `marshal`/`unmarshal`). REST DSL, Kamelets, Pipes, and `routeConfiguration` are deliberately out of scope for V1. XML input is a future addition. The Citrus package is an empty scaffold.

## License

See [LICENSE](LICENSE).
