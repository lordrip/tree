# @iron-bark/tree — Design Spec

## Overview

A DSL-agnostic tree library that sits between source code parsing and visualization rendering. In the Kaoto pipeline (`source code -> BaseEntity -> IVisualizationNode -> CanvasNode`), this library replaces the `BaseEntity -> IVisualizationNode` step with a generic, reusable tree structure.

### Goals

1. Provide a standard tree of nodes renderable in Kaoto, VS Code text panels, or any other consumer
2. Keep the core free of DSL-specific knowledge (Camel, Citrus, or any future DSL)
3. Use generics and a discriminator pattern so implementations per DSL can grow independently

## Package Structure

Monorepo with Yarn 4.13 workspaces (`nodeLinker: node-modules`).

```
@iron-bark/tree (monorepo root)
├── packages/
│   ├── core/           → @iron-bark/tree
│   ├── camel/          → @iron-bark/tree-camel
│   ├── citrus/         → @iron-bark/tree-citrus (scaffold only)
│   └── playground/     → Vite + React dev app (not published)
├── package.json        → workspace root
├── tsconfig.base.json  → shared TypeScript config
└── vitest.workspace.ts
```

### Dependency Graph

```
playground → camel → core
                     ↑
           citrus ───┘ (future)
```

### Tooling

- **Package manager:** Yarn 4.13, `nodeLinker: node-modules`
- **Build:** `tsc` for core, camel, citrus. Vite for playground dev server.
- **Test:** Vitest across all packages
- **Publish:** `@iron-bark/tree`, `@iron-bark/tree-camel`, `@iron-bark/tree-citrus` to npm. Playground is not published.

## Core Package (`@iron-bark/tree`)

Zero runtime dependencies. Owns tree structure, navigation, traversal, and the generic accessor pattern.

### Node Kind

```typescript
type NodeKind = 'group' | 'leaf' | 'placeholder';
```

Baked into the core so any renderer can make structural decisions (containment, insertion points) without DSL knowledge.

### Node Accessors

```typescript
interface NodeAccessors<T> {
  getLabel: (data: T) => string;
  getDescription: (data: T) => string;
  getName: (data: T) => string;
  getIconUrl: (data: T) => string | undefined;
}
```

Functions assigned during node construction by the DSL package. Consumers call the standard methods (`node.getLabel()`) without knowing the underlying data shape.

### TreeNode Interface

```typescript
interface TreeNode<T> {
  readonly id: string;
  readonly nodeKind: NodeKind;
  readonly data: T;

  // Standard accessors — delegate to NodeAccessors internally
  getLabel(): string;
  getDescription(): string;
  getName(): string;
  getIconUrl(): string | undefined;

  // Navigation — explicit links
  getParent(): TreeNode<T> | undefined;
  setParent(node: TreeNode<T> | undefined): void;
  getChildren(): TreeNode<T>[];
  addChild(child: TreeNode<T>): void;
  removeChild(child: TreeNode<T>): void;
  getNextNode(): TreeNode<T> | undefined;
  setNextNode(node: TreeNode<T> | undefined): void;
  getPreviousNode(): TreeNode<T> | undefined;
  setPreviousNode(node: TreeNode<T> | undefined): void;
}
```

### Tree Interface

```typescript
interface Tree<T> {
  readonly type: string;      // discriminator: 'camel', 'citrus', etc.
  readonly root: TreeNode<T>;

  walk(order?: 'depth-first' | 'breadth-first'): Iterable<TreeNode<T>>;
  findById(id: string): TreeNode<T> | undefined;
}
```

The `type` discriminator enables safe downcasting:

```typescript
// Generic consumer — always works
for (const node of tree.walk()) {
  console.log(node.getLabel());
}

// DSL-specific consumer — narrows via discriminator
if (tree.type === 'camel') {
  const camelTree = tree as Tree<CamelNodeData>;
  const node = camelTree.findById(nodeId);
  showCamelProperties(node.data.processorName);
}
```

### DefaultTreeNode Implementation

```typescript
interface TreeNodeConfig<T> {
  id: string;
  nodeKind: NodeKind;
  data: T;
  accessors: NodeAccessors<T>;
}

class DefaultTreeNode<T> implements TreeNode<T> {
  readonly id: string;
  readonly nodeKind: NodeKind;
  readonly data: T;

  private accessors: NodeAccessors<T>;
  private parent: TreeNode<T> | undefined;
  private children: TreeNode<T>[] = [];
  private nextNode: TreeNode<T> | undefined;
  private previousNode: TreeNode<T> | undefined;

  constructor(config: TreeNodeConfig<T>) { ... }

  getLabel(): string { return this.accessors.getLabel(this.data); }
  getDescription(): string { return this.accessors.getDescription(this.data); }
  getName(): string { return this.accessors.getName(this.data); }
  getIconUrl(): string | undefined { return this.accessors.getIconUrl(this.data); }

  // Navigation methods: get/set for parent, children, next, previous
}
```

### DefaultTree Implementation

```typescript
class DefaultTree<T> implements Tree<T> {
  constructor(
    readonly type: string,
    readonly root: TreeNode<T>,
  ) {}

  *walk(order: 'depth-first' | 'breadth-first' = 'depth-first'): Iterable<TreeNode<T>> {
    // depth-first: stack-based, visits node then children
    // breadth-first: queue-based, visits level by level
  }

  findById(id: string): TreeNode<T> | undefined {
    // walks the tree, returns first match
  }
}
```

### Design Decisions (Core)

- **Explicit sibling links, not derived:** `getNextNode()`/`getPreviousNode()` are stored references, not computed from the parent's children array. Different DSLs wire siblings differently.
- **`addChild` does NOT auto-wire previous/next:** DSL packages handle sibling linking since wiring patterns differ per DSL. `addChild` sets the child's parent reference. `removeChild` clears the removed child's parent reference.
- **Immutable after construction:** `data` is readonly. If the source changes, rebuild the tree. No MobX-style reactive state.
- **Lazy traversal:** `walk()` returns a generator/iterable, not a materialized array.
- **No index by default:** `findById` walks the tree. If performance becomes an issue, `DefaultTree` can maintain an internal `Map<string, TreeNode<T>>` without changing the interface.

## Camel Package (`@iron-bark/tree-camel`)

Depends on `@iron-bark/tree` and a YAML parser (`yaml` npm package). Parses Camel YAML routes into `Tree<CamelNodeData>`.

### CamelNodeData

```typescript
interface CamelNodeData {
  processorName: string;       // 'from', 'log', 'choice', 'when', etc.
  componentName?: string;      // 'timer', 'kafka', 'direct', etc.
  uri?: string;                // 'timer:foo?period=1000'
  path: string;                // model path: 'route.from.steps.0.choice'
}
```

### Entry Point

```typescript
function createCamelTree(source: string, format: 'yaml'): Tree<CamelNodeData>
```

Returns a `Tree` with `type === 'camel'`.

### Tree Construction (Two-Phase)

Based on how Kaoto's `AbstractCamelVisualEntity.toVizNode()` works, tree construction follows two phases:

**Phase 1: Recursive node creation via mappers**
Each mapper recursively creates nodes for its processor and its children. Child relationships come in three types:
- **branch**: Sequential steps array (e.g., `from.steps`, `when.steps`). Nodes are created and linked with prev/next.
- **single-clause**: Optional single child (e.g., `choice.otherwise`, `doTry.doFinally`).
- **array-clause**: Array of clause children (e.g., `choice.when[]`, `doTry.doCatch[]`).

**Phase 2: Flattening and linking**
The `from` node's children are promoted to be direct children of the route root. The `from` node becomes a leaf, and sequential prev/next links are established across the promoted children. This means the tree structure does not mirror YAML nesting — it's optimized for visualization.

**Result for `from → log → choice(when, otherwise) → to`:**
```
route (group)
 ├── from (leaf)           ←→ next/prev ←→
 ├── log (leaf)            ←→ next/prev ←→
 ├── choice (group)        ←→ next/prev ←→
 │    ├── when[0] (group)
 │    │    └── (steps inside when, linked sequentially)
 │    ├── when[1] (group)
 │    │    └── (steps inside when, linked sequentially)
 │    └── otherwise (group)
 │         └── (steps inside otherwise, linked sequentially)
 └── to (leaf)

Sequential chain: from ←→ log ←→ choice ←→ to
Children of choice: when[0], when[1], otherwise (no prev/next between them)
```

### Mapper Pattern

Local to the camel package (not in core). Uses a registry with a default mapper and specialized overrides:

```typescript
interface CamelNodeMapper {
  map(path: string, componentLookup: CamelComponentLookup, definition: unknown): TreeNode<CamelNodeData>;
}

interface CamelComponentLookup {
  processorName: string;
  componentName?: string;
}

class CamelMapperRegistry {
  private mappers: Map<string, CamelNodeMapper>;
  private defaultMapper: CamelNodeMapper;

  register(processorName: string, mapper: CamelNodeMapper): void;
  getMapper(processorName: string): CamelNodeMapper;
}
```

**Specialized mappers (V1):**

| Mapper | Processor | Behavior |
|--------|-----------|----------|
| DefaultMapper | Most processors | Creates node, recursively processes children based on child type (branch/single-clause/array-clause) |
| ChoiceMapper | `choice` | Creates group with `when[]` (array-clause) and `otherwise` (single-clause) as children |
| WhenMapper | `when` | Creates group, processes `steps` as branch |
| OtherwiseMapper | `otherwise` | Creates group, processes `steps` as branch |
| CircuitBreakerMapper | `circuitBreaker` | Creates group with `steps` (branch) and `onFallback` (single-clause) |
| MulticastMapper | `multicast` | Creates group, explicitly removes prev/next links between children (parallel branches) |
| LoadBalanceMapper | `loadBalance` | Same as multicast — parallel branches with no sequential links |

**Key pattern from Kaoto:** Parallel processors (multicast, loadBalance) explicitly clear prev/next links between children. This is why sibling links must be explicit, not derived — some groups intentionally have unlinked children.

### Accessor Wiring

Mappers assign accessor functions during node creation:

```typescript
new DefaultTreeNode<CamelNodeData>({
  id: path,  // path is the node ID (e.g., 'route.from.steps.0.log')
  nodeKind: hasChildren ? 'group' : 'leaf',
  data: { processorName: 'log', uri: 'log:myLogger', path },
  accessors: {
    getLabel: (d) => d.componentName ?? d.processorName,
    getDescription: (d) => d.uri ?? d.processorName,
    getName: (d) => d.processorName,
    getIconUrl: (d) => `/icons/${d.processorName}.svg`,
  },
});
```

### V1 Scope

- YAML format only (XML is a future addition)
- Route entities: `route` with `from` and `steps`
- Branching: `choice`/`when`/`otherwise`
- Error handling: `doTry`/`doCatch`/`doFinally`
- Parallel: `multicast`, `loadBalance`
- Resilience: `circuitBreaker`/`onFallback`
- Basic processors: `log`, `setHeader`, `setBody`, `to`, `marshal`/`unmarshal`
- NOT in V1: REST DSL, Kamelets, Pipes, routeConfiguration (these have different entity structures and can be added later)

## Citrus Package (`@iron-bark/tree-citrus`)

Empty scaffold for future implementation. Contains only the package.json, tsconfig, and a placeholder `index.ts`.

## Playground Package

Vite + React dev app for visual verification. Not published to npm.

### Features

- Left pane: textarea for pasting Camel YAML routes
- "Parse" button: calls `createCamelTree()` and renders the result
- Right pane: text-based tree rendering using indentation (like the `tree` command)
- Node selection: click a node to see details — `getLabel()`, `getDescription()`, `getName()`, `getIconUrl()`, `nodeKind`, raw `data`
- Format selector: YAML (active), XML (disabled/future)

### Purpose

Validates that the core `Tree<T>` API is sufficient for rendering without DSL knowledge. The tree renderer in the playground is a consumer of the generic API — it only uses `tree.walk()`, `node.getLabel()`, `node.getChildren()`, etc.

### Tech

React + Vite. Basic HTML/CSS, no component library. This is a dev tool.
