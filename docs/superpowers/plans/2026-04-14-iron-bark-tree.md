# @iron-bark/tree Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a DSL-agnostic tree library with a Camel YAML parser and a playground app for visual verification.

**Architecture:** Monorepo with four packages — `core` (generic tree), `camel` (YAML→tree), `citrus` (scaffold), `playground` (Vite+React). Core defines `TreeNode<T>` and `Tree<T>` with dynamic accessor functions. Camel package uses a mapper registry to parse YAML routes into typed trees.

**Tech Stack:** TypeScript, Yarn 4.13 workspaces, Vitest, Vite (playground only), React (playground only), `yaml` npm package (camel only)

---

## File Structure

```
packages/
  core/
    package.json
    tsconfig.json
    src/
      index.ts                          → public API exports
      types.ts                          → NodeKind, NodeAccessors<T>, TreeNode<T>, Tree<T>, TreeNodeConfig<T>
      default-tree-node.ts              → DefaultTreeNode<T> class
      default-tree.ts                   → DefaultTree<T> class with traversal
      __tests__/
        default-tree-node.test.ts
        default-tree.test.ts
  camel/
    package.json
    tsconfig.json
    src/
      index.ts                          → public API exports
      types.ts                          → CamelNodeData, CamelComponentLookup, CamelProcessorStepsProperty
      processor-children.ts             → maps processor names → child property definitions
      uri-helper.ts                     → extract component name from URI
      camel-accessors.ts                → standard accessor functions for Camel nodes
      mapper-registry.ts                → CamelMapperRegistry class
      mapper-types.ts                   → CamelNodeMapper interface
      mappers/
        default-mapper.ts
        choice-mapper.ts
        when-mapper.ts
        otherwise-mapper.ts
        circuit-breaker-mapper.ts
        multicast-mapper.ts
        load-balance-mapper.ts
      camel-tree-factory.ts             → createCamelTree() entry point
      __tests__/
        uri-helper.test.ts
        processor-children.test.ts
        default-mapper.test.ts
        choice-mapper.test.ts
        camel-tree-factory.test.ts
  citrus/
    package.json
    tsconfig.json
    src/
      index.ts                          → placeholder
  playground/
    package.json
    tsconfig.json
    index.html
    vite.config.ts
    src/
      main.tsx
      App.tsx
      App.css
      components/
        TreeRenderer.tsx
        NodeDetails.tsx
package.json                            → workspace root
tsconfig.base.json
vitest.workspace.ts
.yarnrc.yml
```

---

### Task 1: Monorepo Scaffolding

**Files:**
- Create: `package.json`
- Create: `.yarnrc.yml`
- Create: `tsconfig.base.json`
- Create: `vitest.workspace.ts`

- [ ] **Step 1: Set up Yarn 4.13 via Corepack**

```bash
corepack enable
corepack prepare yarn@4.13.0 --activate
```

Verify with `yarn --version` — expected: `4.13.0`

- [ ] **Step 2: Create root package.json**

Create `package.json`:

```json
{
  "name": "@iron-bark/tree-monorepo",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "yarn workspaces foreach -A --topological run build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "typescript": "~5.8.3",
    "vitest": "~3.1.1"
  }
}
```

- [ ] **Step 3: Create .yarnrc.yml**

Create `.yarnrc.yml`:

```yaml
nodeLinker: node-modules
```

- [ ] **Step 4: Create tsconfig.base.json**

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

- [ ] **Step 5: Create vitest.workspace.ts**

Create `vitest.workspace.ts`:

```typescript
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/core',
  'packages/camel',
]);
```

- [ ] **Step 6: Install dependencies**

```bash
yarn install
```

Expected: `node_modules` directory created, `yarn.lock` generated.

- [ ] **Step 7: Commit**

```bash
git add package.json .yarnrc.yml tsconfig.base.json vitest.workspace.ts yarn.lock .yarn
git commit -m "feat: scaffold monorepo with Yarn 4.13 workspaces"
```

---

### Task 2: Core Package — Types

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/types.ts`
- Create: `packages/core/src/index.ts`

- [ ] **Step 1: Create core package.json**

Create `packages/core/package.json`:

```json
{
  "name": "@iron-bark/tree",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "test": "vitest run"
  }
}
```

- [ ] **Step 2: Create core tsconfig.json**

Create `packages/core/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create types.ts**

Create `packages/core/src/types.ts`:

```typescript
export type NodeKind = 'group' | 'leaf' | 'placeholder';

export interface NodeAccessors<T> {
  getLabel: (data: T) => string;
  getDescription: (data: T) => string;
  getName: (data: T) => string;
  getIconUrl: (data: T) => string | undefined;
}

export interface TreeNodeConfig<T> {
  id: string;
  nodeKind: NodeKind;
  data: T;
  accessors: NodeAccessors<T>;
}

export interface TreeNode<T> {
  readonly id: string;
  readonly nodeKind: NodeKind;
  readonly data: T;

  getLabel(): string;
  getDescription(): string;
  getName(): string;
  getIconUrl(): string | undefined;

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

export interface Tree<T> {
  readonly type: string;
  readonly root: TreeNode<T>;

  walk(order?: 'depth-first' | 'breadth-first'): Iterable<TreeNode<T>>;
  findById(id: string): TreeNode<T> | undefined;
}
```

- [ ] **Step 4: Create index.ts with re-exports**

Create `packages/core/src/index.ts`:

```typescript
export type {
  NodeKind,
  NodeAccessors,
  TreeNodeConfig,
  TreeNode,
  Tree,
} from './types.js';
```

- [ ] **Step 5: Verify the core package compiles**

```bash
cd packages/core && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/core
git commit -m "feat(core): add TreeNode and Tree type definitions"
```

---

### Task 3: Core Package — DefaultTreeNode

**Files:**
- Create: `packages/core/src/__tests__/default-tree-node.test.ts`
- Create: `packages/core/src/default-tree-node.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write failing tests for DefaultTreeNode**

Create `packages/core/src/__tests__/default-tree-node.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { DefaultTreeNode } from '../default-tree-node.js';
import type { TreeNodeConfig } from '../types.js';

interface TestData {
  title: string;
  color: string;
}

function createTestConfig(overrides?: Partial<TreeNodeConfig<TestData>>): TreeNodeConfig<TestData> {
  return {
    id: 'node-1',
    nodeKind: 'leaf',
    data: { title: 'Test Node', color: 'red' },
    accessors: {
      getLabel: (d) => d.title,
      getDescription: (d) => `A ${d.color} node`,
      getName: (d) => d.title.toLowerCase(),
      getIconUrl: (d) => `/icons/${d.color}.svg`,
    },
    ...overrides,
  };
}

describe('DefaultTreeNode', () => {
  describe('construction', () => {
    it('should store id, nodeKind, and data', () => {
      const node = new DefaultTreeNode(createTestConfig());

      expect(node.id).toBe('node-1');
      expect(node.nodeKind).toBe('leaf');
      expect(node.data).toEqual({ title: 'Test Node', color: 'red' });
    });
  });

  describe('accessors', () => {
    it('should delegate getLabel to the accessor function', () => {
      const node = new DefaultTreeNode(createTestConfig());
      expect(node.getLabel()).toBe('Test Node');
    });

    it('should delegate getDescription to the accessor function', () => {
      const node = new DefaultTreeNode(createTestConfig());
      expect(node.getDescription()).toBe('A red node');
    });

    it('should delegate getName to the accessor function', () => {
      const node = new DefaultTreeNode(createTestConfig());
      expect(node.getName()).toBe('test node');
    });

    it('should delegate getIconUrl to the accessor function', () => {
      const node = new DefaultTreeNode(createTestConfig());
      expect(node.getIconUrl()).toBe('/icons/red.svg');
    });
  });

  describe('parent-child navigation', () => {
    it('should start with no parent', () => {
      const node = new DefaultTreeNode(createTestConfig());
      expect(node.getParent()).toBeUndefined();
    });

    it('should start with empty children', () => {
      const node = new DefaultTreeNode(createTestConfig());
      expect(node.getChildren()).toEqual([]);
    });

    it('should add a child and set its parent', () => {
      const parent = new DefaultTreeNode(createTestConfig({ id: 'parent', nodeKind: 'group' }));
      const child = new DefaultTreeNode(createTestConfig({ id: 'child' }));

      parent.addChild(child);

      expect(parent.getChildren()).toEqual([child]);
      expect(child.getParent()).toBe(parent);
    });

    it('should remove a child and clear its parent', () => {
      const parent = new DefaultTreeNode(createTestConfig({ id: 'parent', nodeKind: 'group' }));
      const child = new DefaultTreeNode(createTestConfig({ id: 'child' }));

      parent.addChild(child);
      parent.removeChild(child);

      expect(parent.getChildren()).toEqual([]);
      expect(child.getParent()).toBeUndefined();
    });

    it('should handle removing a child that is not present', () => {
      const parent = new DefaultTreeNode(createTestConfig({ id: 'parent', nodeKind: 'group' }));
      const unrelated = new DefaultTreeNode(createTestConfig({ id: 'unrelated' }));

      parent.removeChild(unrelated);
      expect(parent.getChildren()).toEqual([]);
    });
  });

  describe('sibling navigation', () => {
    it('should start with no next or previous node', () => {
      const node = new DefaultTreeNode(createTestConfig());
      expect(node.getNextNode()).toBeUndefined();
      expect(node.getPreviousNode()).toBeUndefined();
    });

    it('should set and get next node', () => {
      const a = new DefaultTreeNode(createTestConfig({ id: 'a' }));
      const b = new DefaultTreeNode(createTestConfig({ id: 'b' }));

      a.setNextNode(b);
      expect(a.getNextNode()).toBe(b);
    });

    it('should set and get previous node', () => {
      const a = new DefaultTreeNode(createTestConfig({ id: 'a' }));
      const b = new DefaultTreeNode(createTestConfig({ id: 'b' }));

      b.setPreviousNode(a);
      expect(b.getPreviousNode()).toBe(a);
    });

    it('should clear next node when set to undefined', () => {
      const a = new DefaultTreeNode(createTestConfig({ id: 'a' }));
      const b = new DefaultTreeNode(createTestConfig({ id: 'b' }));

      a.setNextNode(b);
      a.setNextNode(undefined);
      expect(a.getNextNode()).toBeUndefined();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /path/to/repo && yarn vitest run packages/core
```

Expected: FAIL — `Cannot find module '../default-tree-node.js'`

- [ ] **Step 3: Implement DefaultTreeNode**

Create `packages/core/src/default-tree-node.ts`:

```typescript
import type { TreeNode, TreeNodeConfig, NodeKind, NodeAccessors } from './types.js';

export class DefaultTreeNode<T> implements TreeNode<T> {
  readonly id: string;
  readonly nodeKind: NodeKind;
  readonly data: T;

  private readonly accessors: NodeAccessors<T>;
  private parent: TreeNode<T> | undefined;
  private readonly children: TreeNode<T>[] = [];
  private next: TreeNode<T> | undefined;
  private previous: TreeNode<T> | undefined;

  constructor(config: TreeNodeConfig<T>) {
    this.id = config.id;
    this.nodeKind = config.nodeKind;
    this.data = config.data;
    this.accessors = config.accessors;
  }

  getLabel(): string {
    return this.accessors.getLabel(this.data);
  }

  getDescription(): string {
    return this.accessors.getDescription(this.data);
  }

  getName(): string {
    return this.accessors.getName(this.data);
  }

  getIconUrl(): string | undefined {
    return this.accessors.getIconUrl(this.data);
  }

  getParent(): TreeNode<T> | undefined {
    return this.parent;
  }

  setParent(node: TreeNode<T> | undefined): void {
    this.parent = node;
  }

  getChildren(): TreeNode<T>[] {
    return this.children;
  }

  addChild(child: TreeNode<T>): void {
    this.children.push(child);
    child.setParent(this);
  }

  removeChild(child: TreeNode<T>): void {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
      child.setParent(undefined);
    }
  }

  getNextNode(): TreeNode<T> | undefined {
    return this.next;
  }

  setNextNode(node: TreeNode<T> | undefined): void {
    this.next = node;
  }

  getPreviousNode(): TreeNode<T> | undefined {
    return this.previous;
  }

  setPreviousNode(node: TreeNode<T> | undefined): void {
    this.previous = node;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
yarn vitest run packages/core
```

Expected: all tests PASS.

- [ ] **Step 5: Export DefaultTreeNode from index.ts**

Update `packages/core/src/index.ts` — add this line:

```typescript
export { DefaultTreeNode } from './default-tree-node.js';
```

- [ ] **Step 6: Commit**

```bash
git add packages/core
git commit -m "feat(core): implement DefaultTreeNode with accessors and navigation"
```

---

### Task 4: Core Package — DefaultTree

**Files:**
- Create: `packages/core/src/__tests__/default-tree.test.ts`
- Create: `packages/core/src/default-tree.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write failing tests for DefaultTree**

Create `packages/core/src/__tests__/default-tree.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { DefaultTree } from '../default-tree.js';
import { DefaultTreeNode } from '../default-tree-node.js';
import type { NodeAccessors } from '../types.js';

interface TestData {
  name: string;
}

const accessors: NodeAccessors<TestData> = {
  getLabel: (d) => d.name,
  getDescription: (d) => d.name,
  getName: (d) => d.name,
  getIconUrl: () => undefined,
};

function node(id: string, nodeKind: 'group' | 'leaf' = 'leaf'): DefaultTreeNode<TestData> {
  return new DefaultTreeNode({ id, nodeKind, data: { name: id }, accessors });
}

/**
 * Builds this tree for testing:
 *
 *   root (group)
 *   ├── a (leaf)  ←→  b (group)  ←→  c (leaf)
 *   │                 ├── b1 (leaf) ←→ b2 (leaf)
 */
function buildTestTree() {
  const root = node('root', 'group');
  const a = node('a');
  const b = node('b', 'group');
  const c = node('c');
  const b1 = node('b1');
  const b2 = node('b2');

  root.addChild(a);
  root.addChild(b);
  root.addChild(c);

  a.setNextNode(b);
  b.setPreviousNode(a);
  b.setNextNode(c);
  c.setPreviousNode(b);

  b.addChild(b1);
  b.addChild(b2);
  b1.setNextNode(b2);
  b2.setPreviousNode(b1);

  return { root, a, b, c, b1, b2 };
}

describe('DefaultTree', () => {
  describe('construction', () => {
    it('should store type and root', () => {
      const root = node('root', 'group');
      const tree = new DefaultTree('test', root);

      expect(tree.type).toBe('test');
      expect(tree.root).toBe(root);
    });
  });

  describe('walk — depth-first', () => {
    it('should visit all nodes depth-first', () => {
      const { root } = buildTestTree();
      const tree = new DefaultTree('test', root);

      const ids = [...tree.walk()].map((n) => n.id);
      expect(ids).toEqual(['root', 'a', 'b', 'b1', 'b2', 'c']);
    });

    it('should default to depth-first', () => {
      const { root } = buildTestTree();
      const tree = new DefaultTree('test', root);

      const ids = [...tree.walk()].map((n) => n.id);
      const idsExplicit = [...tree.walk('depth-first')].map((n) => n.id);
      expect(ids).toEqual(idsExplicit);
    });
  });

  describe('walk — breadth-first', () => {
    it('should visit all nodes breadth-first', () => {
      const { root } = buildTestTree();
      const tree = new DefaultTree('test', root);

      const ids = [...tree.walk('breadth-first')].map((n) => n.id);
      expect(ids).toEqual(['root', 'a', 'b', 'c', 'b1', 'b2']);
    });
  });

  describe('findById', () => {
    it('should find a node by id', () => {
      const { root, b1 } = buildTestTree();
      const tree = new DefaultTree('test', root);

      expect(tree.findById('b1')).toBe(b1);
    });

    it('should return undefined for unknown id', () => {
      const { root } = buildTestTree();
      const tree = new DefaultTree('test', root);

      expect(tree.findById('unknown')).toBeUndefined();
    });

    it('should find the root node itself', () => {
      const { root } = buildTestTree();
      const tree = new DefaultTree('test', root);

      expect(tree.findById('root')).toBe(root);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
yarn vitest run packages/core
```

Expected: FAIL — `Cannot find module '../default-tree.js'`

- [ ] **Step 3: Implement DefaultTree**

Create `packages/core/src/default-tree.ts`:

```typescript
import type { Tree, TreeNode } from './types.js';

export class DefaultTree<T> implements Tree<T> {
  constructor(
    readonly type: string,
    readonly root: TreeNode<T>,
  ) {}

  *walk(order: 'depth-first' | 'breadth-first' = 'depth-first'): Iterable<TreeNode<T>> {
    if (order === 'breadth-first') {
      yield* this.breadthFirst();
    } else {
      yield* this.depthFirst();
    }
  }

  findById(id: string): TreeNode<T> | undefined {
    for (const node of this.walk()) {
      if (node.id === id) {
        return node;
      }
    }
    return undefined;
  }

  private *depthFirst(): Iterable<TreeNode<T>> {
    const stack: TreeNode<T>[] = [this.root];

    while (stack.length > 0) {
      const node = stack.pop()!;
      yield node;

      const children = node.getChildren();
      for (let i = children.length - 1; i >= 0; i--) {
        stack.push(children[i]);
      }
    }
  }

  private *breadthFirst(): Iterable<TreeNode<T>> {
    const queue: TreeNode<T>[] = [this.root];

    while (queue.length > 0) {
      const node = queue.shift()!;
      yield node;

      for (const child of node.getChildren()) {
        queue.push(child);
      }
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
yarn vitest run packages/core
```

Expected: all tests PASS.

- [ ] **Step 5: Export DefaultTree from index.ts**

Update `packages/core/src/index.ts` — add this line:

```typescript
export { DefaultTree } from './default-tree.js';
```

- [ ] **Step 6: Verify the full core package compiles**

```bash
cd packages/core && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/core
git commit -m "feat(core): implement DefaultTree with depth-first and breadth-first traversal"
```

---

### Task 5: Camel Package — Types and Utilities

**Files:**
- Create: `packages/camel/package.json`
- Create: `packages/camel/tsconfig.json`
- Create: `packages/camel/src/types.ts`
- Create: `packages/camel/src/uri-helper.ts`
- Create: `packages/camel/src/processor-children.ts`
- Create: `packages/camel/src/camel-accessors.ts`
- Create: `packages/camel/src/__tests__/uri-helper.test.ts`
- Create: `packages/camel/src/__tests__/processor-children.test.ts`

- [ ] **Step 1: Create camel package.json**

Create `packages/camel/package.json`:

```json
{
  "name": "@iron-bark/tree-camel",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "test": "vitest run"
  },
  "dependencies": {
    "@iron-bark/tree": "workspace:*",
    "yaml": "^2.7.1"
  }
}
```

- [ ] **Step 2: Create camel tsconfig.json**

Create `packages/camel/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "references": [
    { "path": "../core" }
  ]
}
```

- [ ] **Step 3: Install dependencies**

```bash
cd /path/to/repo && yarn install
```

- [ ] **Step 4: Create camel types**

Create `packages/camel/src/types.ts`:

```typescript
export interface CamelNodeData {
  processorName: string;
  componentName?: string;
  uri?: string;
  path: string;
}

export interface CamelComponentLookup {
  processorName: string;
  componentName?: string;
}

export type CamelProcessorChildType = 'branch' | 'single-clause' | 'array-clause';

export interface CamelProcessorStepsProperty {
  name: string;
  type: CamelProcessorChildType;
}
```

- [ ] **Step 5: Write failing tests for uri-helper**

Create `packages/camel/src/__tests__/uri-helper.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { getComponentNameFromUri } from '../uri-helper.js';

describe('getComponentNameFromUri', () => {
  it('should extract component name from simple URI', () => {
    expect(getComponentNameFromUri('timer:foo')).toBe('timer');
  });

  it('should extract component name from URI with query params', () => {
    expect(getComponentNameFromUri('timer:foo?period=1000')).toBe('timer');
  });

  it('should extract component name from URI without path', () => {
    expect(getComponentNameFromUri('log:myLogger')).toBe('log');
  });

  it('should handle direct component', () => {
    expect(getComponentNameFromUri('direct:start')).toBe('direct');
  });

  it('should handle kafka with params', () => {
    expect(getComponentNameFromUri('kafka:topic?brokers=localhost:9092')).toBe('kafka');
  });

  it('should return undefined for empty string', () => {
    expect(getComponentNameFromUri('')).toBeUndefined();
  });

  it('should return undefined for undefined', () => {
    expect(getComponentNameFromUri(undefined)).toBeUndefined();
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**

```bash
yarn vitest run packages/camel
```

Expected: FAIL — `Cannot find module '../uri-helper.js'`

- [ ] **Step 7: Implement uri-helper**

Create `packages/camel/src/uri-helper.ts`:

```typescript
export function getComponentNameFromUri(uri: string | undefined): string | undefined {
  if (!uri) return undefined;

  const colonIndex = uri.indexOf(':');
  if (colonIndex === -1) return uri;

  return uri.substring(0, colonIndex);
}
```

- [ ] **Step 8: Run uri-helper tests to verify they pass**

```bash
yarn vitest run packages/camel/src/__tests__/uri-helper.test.ts
```

Expected: all tests PASS.

- [ ] **Step 9: Write failing tests for processor-children**

Create `packages/camel/src/__tests__/processor-children.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { getProcessorStepsProperties } from '../processor-children.js';

describe('getProcessorStepsProperties', () => {
  it('should return steps branch for from', () => {
    expect(getProcessorStepsProperties('from')).toEqual([
      { name: 'steps', type: 'branch' },
    ]);
  });

  it('should return when + otherwise for choice', () => {
    expect(getProcessorStepsProperties('choice')).toEqual([
      { name: 'when', type: 'array-clause' },
      { name: 'otherwise', type: 'single-clause' },
    ]);
  });

  it('should return steps + onFallback for circuitBreaker', () => {
    expect(getProcessorStepsProperties('circuitBreaker')).toEqual([
      { name: 'steps', type: 'branch' },
      { name: 'onFallback', type: 'single-clause' },
    ]);
  });

  it('should return steps + doCatch + doFinally for doTry', () => {
    expect(getProcessorStepsProperties('doTry')).toEqual([
      { name: 'steps', type: 'branch' },
      { name: 'doCatch', type: 'array-clause' },
      { name: 'doFinally', type: 'single-clause' },
    ]);
  });

  it('should return steps branch for processors with steps', () => {
    for (const name of ['filter', 'split', 'multicast', 'loop', 'pipeline', 'aggregate', 'step']) {
      expect(getProcessorStepsProperties(name)).toEqual([
        { name: 'steps', type: 'branch' },
      ]);
    }
  });

  it('should return steps branch for when and otherwise', () => {
    expect(getProcessorStepsProperties('when')).toEqual([
      { name: 'steps', type: 'branch' },
    ]);
    expect(getProcessorStepsProperties('otherwise')).toEqual([
      { name: 'steps', type: 'branch' },
    ]);
  });

  it('should return steps branch for doCatch and onFallback', () => {
    expect(getProcessorStepsProperties('doCatch')).toEqual([
      { name: 'steps', type: 'branch' },
    ]);
    expect(getProcessorStepsProperties('onFallback')).toEqual([
      { name: 'steps', type: 'branch' },
    ]);
  });

  it('should return empty array for leaf processors', () => {
    expect(getProcessorStepsProperties('log')).toEqual([]);
    expect(getProcessorStepsProperties('to')).toEqual([]);
    expect(getProcessorStepsProperties('setHeader')).toEqual([]);
    expect(getProcessorStepsProperties('setBody')).toEqual([]);
    expect(getProcessorStepsProperties('marshal')).toEqual([]);
  });
});
```

- [ ] **Step 10: Run tests to verify they fail**

```bash
yarn vitest run packages/camel/src/__tests__/processor-children.test.ts
```

Expected: FAIL

- [ ] **Step 11: Implement processor-children**

Create `packages/camel/src/processor-children.ts`:

```typescript
import type { CamelProcessorStepsProperty } from './types.js';

const BRANCH_STEPS: CamelProcessorStepsProperty[] = [{ name: 'steps', type: 'branch' }];

const PROCESSOR_CHILDREN: Record<string, CamelProcessorStepsProperty[]> = {
  from: BRANCH_STEPS,
  when: BRANCH_STEPS,
  otherwise: BRANCH_STEPS,
  doCatch: BRANCH_STEPS,
  doFinally: BRANCH_STEPS,
  onFallback: BRANCH_STEPS,
  filter: BRANCH_STEPS,
  split: BRANCH_STEPS,
  multicast: BRANCH_STEPS,
  loop: BRANCH_STEPS,
  pipeline: BRANCH_STEPS,
  aggregate: BRANCH_STEPS,
  step: BRANCH_STEPS,

  choice: [
    { name: 'when', type: 'array-clause' },
    { name: 'otherwise', type: 'single-clause' },
  ],

  circuitBreaker: [
    { name: 'steps', type: 'branch' },
    { name: 'onFallback', type: 'single-clause' },
  ],

  doTry: [
    { name: 'steps', type: 'branch' },
    { name: 'doCatch', type: 'array-clause' },
    { name: 'doFinally', type: 'single-clause' },
  ],

  loadBalance: BRANCH_STEPS,
};

export function getProcessorStepsProperties(processorName: string): CamelProcessorStepsProperty[] {
  return PROCESSOR_CHILDREN[processorName] ?? [];
}
```

- [ ] **Step 12: Run tests to verify they pass**

```bash
yarn vitest run packages/camel
```

Expected: all tests PASS.

- [ ] **Step 13: Implement camel-accessors**

Create `packages/camel/src/camel-accessors.ts`:

```typescript
import type { NodeAccessors } from '@iron-bark/tree';
import type { CamelNodeData } from './types.js';

export const camelAccessors: NodeAccessors<CamelNodeData> = {
  getLabel: (data) => data.componentName ?? data.processorName,
  getDescription: (data) => data.uri ?? data.processorName,
  getName: (data) => data.processorName,
  getIconUrl: (data) => `/icons/${data.processorName}.svg`,
};
```

- [ ] **Step 14: Commit**

```bash
git add packages/camel
git commit -m "feat(camel): add types, URI helper, processor children map, and accessors"
```

---

### Task 6: Camel Package — Mapper Infrastructure

**Files:**
- Create: `packages/camel/src/mapper-types.ts`
- Create: `packages/camel/src/mapper-registry.ts`

- [ ] **Step 1: Create mapper interface**

Create `packages/camel/src/mapper-types.ts`:

```typescript
import type { TreeNode } from '@iron-bark/tree';
import type { CamelNodeData, CamelComponentLookup } from './types.js';

export interface CamelNodeMapper {
  map(
    path: string,
    componentLookup: CamelComponentLookup,
    entityDefinition: unknown,
  ): TreeNode<CamelNodeData>;
}
```

- [ ] **Step 2: Implement mapper registry**

Create `packages/camel/src/mapper-registry.ts`:

```typescript
import type { CamelNodeMapper } from './mapper-types.js';

export class CamelMapperRegistry {
  private readonly mappers = new Map<string, CamelNodeMapper>();
  private defaultMapper: CamelNodeMapper | undefined;

  registerDefault(mapper: CamelNodeMapper): void {
    this.defaultMapper = mapper;
  }

  register(processorName: string, mapper: CamelNodeMapper): void {
    this.mappers.set(processorName, mapper);
  }

  getMapper(processorName: string): CamelNodeMapper {
    const mapper = this.mappers.get(processorName) ?? this.defaultMapper;
    if (!mapper) {
      throw new Error(`No mapper found for processor "${processorName}" and no default mapper registered`);
    }
    return mapper;
  }
}
```

- [ ] **Step 3: Verify compilation**

```bash
cd packages/camel && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/camel/src/mapper-types.ts packages/camel/src/mapper-registry.ts
git commit -m "feat(camel): add mapper interface and registry"
```

---

### Task 7: Camel Package — Default Mapper

**Files:**
- Create: `packages/camel/src/mappers/default-mapper.ts`
- Create: `packages/camel/src/__tests__/default-mapper.test.ts`

- [ ] **Step 1: Write failing tests for default mapper**

Create `packages/camel/src/__tests__/default-mapper.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { DefaultCamelMapper } from '../mappers/default-mapper.js';
import { CamelMapperRegistry } from '../mapper-registry.js';

function setup() {
  const registry = new CamelMapperRegistry();
  const mapper = new DefaultCamelMapper(registry);
  registry.registerDefault(mapper);
  return { registry, mapper };
}

describe('DefaultCamelMapper', () => {
  it('should create a leaf node for a simple processor', () => {
    const { mapper } = setup();

    const node = mapper.map(
      'route.from.steps.0.log',
      { processorName: 'log' },
      { message: 'hello' },
    );

    expect(node.id).toBe('route.from.steps.0.log');
    expect(node.nodeKind).toBe('leaf');
    expect(node.data.processorName).toBe('log');
    expect(node.data.path).toBe('route.from.steps.0.log');
    expect(node.getChildren()).toEqual([]);
  });

  it('should create a leaf node for a component with URI', () => {
    const { mapper } = setup();

    const node = mapper.map(
      'route.from',
      { processorName: 'from', componentName: 'timer' },
      { uri: 'timer:tick?period=1000', steps: [] },
    );

    expect(node.data.componentName).toBe('timer');
    expect(node.data.uri).toBe('timer:tick?period=1000');
    expect(node.getLabel()).toBe('timer');
  });

  it('should create a group node for a processor with children', () => {
    const { mapper } = setup();

    const node = mapper.map(
      'route.from',
      { processorName: 'from' },
      { uri: 'timer:tick', steps: [{ log: { message: 'hello' } }] },
    );

    expect(node.nodeKind).toBe('group');
    expect(node.getChildren()).toHaveLength(1);
    expect(node.getChildren()[0].data.processorName).toBe('log');
  });

  it('should link branch children with prev/next', () => {
    const { mapper } = setup();

    const node = mapper.map(
      'route.from',
      { processorName: 'from' },
      {
        uri: 'timer:tick',
        steps: [
          { log: { message: 'first' } },
          { log: { message: 'second' } },
          { to: { uri: 'direct:end' } },
        ],
      },
    );

    const children = node.getChildren();
    expect(children).toHaveLength(3);

    expect(children[0].getNextNode()).toBe(children[1]);
    expect(children[1].getPreviousNode()).toBe(children[0]);
    expect(children[1].getNextNode()).toBe(children[2]);
    expect(children[2].getPreviousNode()).toBe(children[1]);

    expect(children[0].getPreviousNode()).toBeUndefined();
    expect(children[2].getNextNode()).toBeUndefined();
  });

  it('should set parent on branch children', () => {
    const { mapper } = setup();

    const node = mapper.map(
      'route.from',
      { processorName: 'from' },
      { uri: 'timer:tick', steps: [{ log: { message: 'hello' } }] },
    );

    expect(node.getChildren()[0].getParent()).toBe(node);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
yarn vitest run packages/camel/src/__tests__/default-mapper.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement default mapper**

Create `packages/camel/src/mappers/default-mapper.ts`:

```typescript
import { DefaultTreeNode } from '@iron-bark/tree';
import type { TreeNode } from '@iron-bark/tree';
import type { CamelNodeMapper } from '../mapper-types.js';
import type { CamelMapperRegistry } from '../mapper-registry.js';
import type { CamelNodeData, CamelComponentLookup } from '../types.js';
import { getProcessorStepsProperties } from '../processor-children.js';
import { getComponentNameFromUri } from '../uri-helper.js';
import { camelAccessors } from '../camel-accessors.js';

export class DefaultCamelMapper implements CamelNodeMapper {
  constructor(private readonly registry: CamelMapperRegistry) {}

  map(
    path: string,
    componentLookup: CamelComponentLookup,
    entityDefinition: unknown,
  ): TreeNode<CamelNodeData> {
    const def = entityDefinition as Record<string, unknown>;
    const childProps = getProcessorStepsProperties(componentLookup.processorName);

    const uri = typeof def?.uri === 'string' ? def.uri : undefined;
    const componentName = componentLookup.componentName ?? getComponentNameFromUri(uri);

    const node = new DefaultTreeNode<CamelNodeData>({
      id: path,
      nodeKind: childProps.length > 0 ? 'group' : 'leaf',
      data: {
        processorName: componentLookup.processorName,
        componentName,
        uri,
        path,
      },
      accessors: camelAccessors,
    });

    for (const childProp of childProps) {
      const subpath = `${path}.${childProp.name}`;
      const childDef = def?.[childProp.name];

      switch (childProp.type) {
        case 'branch':
          this.processBranch(subpath, childDef, node);
          break;
        case 'single-clause':
          this.processSingleClause(subpath, childProp.name, childDef, node);
          break;
        case 'array-clause':
          this.processArrayClause(subpath, childProp.name, childDef, node);
          break;
      }
    }

    return node;
  }

  protected processBranch(
    basePath: string,
    definition: unknown,
    parent: TreeNode<CamelNodeData>,
  ): void {
    if (!Array.isArray(definition)) return;

    let previousNode: TreeNode<CamelNodeData> | undefined;

    for (let i = 0; i < definition.length; i++) {
      const step = definition[i] as Record<string, unknown>;
      const processorName = Object.keys(step)[0];
      const stepDef = step[processorName] as Record<string, unknown>;
      const stepPath = `${basePath}.${i}.${processorName}`;

      const componentName = getComponentNameFromUri(
        typeof stepDef?.uri === 'string' ? stepDef.uri : undefined,
      );

      const mapper = this.registry.getMapper(processorName);
      const childNode = mapper.map(
        stepPath,
        { processorName, componentName },
        stepDef ?? {},
      );

      parent.addChild(childNode);

      if (previousNode) {
        previousNode.setNextNode(childNode);
        childNode.setPreviousNode(previousNode);
      }

      previousNode = childNode;
    }
  }

  protected processSingleClause(
    path: string,
    processorName: string,
    definition: unknown,
    parent: TreeNode<CamelNodeData>,
  ): void {
    if (definition == null) return;

    const mapper = this.registry.getMapper(processorName);
    const childNode = mapper.map(path, { processorName }, definition);
    parent.addChild(childNode);
  }

  protected processArrayClause(
    basePath: string,
    processorName: string,
    definition: unknown,
    parent: TreeNode<CamelNodeData>,
  ): void {
    if (!Array.isArray(definition)) return;

    for (let i = 0; i < definition.length; i++) {
      const itemPath = `${basePath}.${i}`;
      const mapper = this.registry.getMapper(processorName);
      const childNode = mapper.map(itemPath, { processorName }, definition[i]);
      parent.addChild(childNode);
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
yarn vitest run packages/camel/src/__tests__/default-mapper.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/camel/src/mappers/default-mapper.ts packages/camel/src/__tests__/default-mapper.test.ts
git commit -m "feat(camel): implement default mapper with branch/clause processing"
```

---

### Task 8: Camel Package — Specialized Mappers

**Files:**
- Create: `packages/camel/src/mappers/choice-mapper.ts`
- Create: `packages/camel/src/mappers/when-mapper.ts`
- Create: `packages/camel/src/mappers/otherwise-mapper.ts`
- Create: `packages/camel/src/mappers/circuit-breaker-mapper.ts`
- Create: `packages/camel/src/mappers/multicast-mapper.ts`
- Create: `packages/camel/src/mappers/load-balance-mapper.ts`
- Create: `packages/camel/src/__tests__/choice-mapper.test.ts`

- [ ] **Step 1: Write failing tests for choice/when/otherwise**

Create `packages/camel/src/__tests__/choice-mapper.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { CamelMapperRegistry } from '../mapper-registry.js';
import { DefaultCamelMapper } from '../mappers/default-mapper.js';
import { ChoiceCamelMapper } from '../mappers/choice-mapper.js';
import { WhenCamelMapper } from '../mappers/when-mapper.js';
import { OtherwiseCamelMapper } from '../mappers/otherwise-mapper.js';

function setup() {
  const registry = new CamelMapperRegistry();
  const defaultMapper = new DefaultCamelMapper(registry);
  registry.registerDefault(defaultMapper);
  registry.register('choice', new ChoiceCamelMapper(registry));
  registry.register('when', new WhenCamelMapper(registry));
  registry.register('otherwise', new OtherwiseCamelMapper(registry));
  return registry;
}

describe('ChoiceCamelMapper', () => {
  it('should create a group node with when and otherwise children', () => {
    const registry = setup();
    const mapper = registry.getMapper('choice');

    const node = mapper.map(
      'route.from.steps.0.choice',
      { processorName: 'choice' },
      {
        when: [
          { simple: '${header.foo} == 1', steps: [{ log: { message: 'when1' } }] },
          { simple: '${header.foo} == 2', steps: [] },
        ],
        otherwise: {
          steps: [{ to: { uri: 'direct:fallback' } }],
        },
      },
    );

    expect(node.nodeKind).toBe('group');
    expect(node.data.processorName).toBe('choice');

    const children = node.getChildren();
    expect(children).toHaveLength(3);
    expect(children[0].data.processorName).toBe('when');
    expect(children[1].data.processorName).toBe('when');
    expect(children[2].data.processorName).toBe('otherwise');
  });

  it('should not link when/otherwise children with prev/next', () => {
    const registry = setup();
    const mapper = registry.getMapper('choice');

    const node = mapper.map(
      'route.from.steps.0.choice',
      { processorName: 'choice' },
      {
        when: [
          { simple: '${header.foo} == 1', steps: [] },
          { simple: '${header.foo} == 2', steps: [] },
        ],
        otherwise: { steps: [] },
      },
    );

    const children = node.getChildren();
    for (const child of children) {
      expect(child.getNextNode()).toBeUndefined();
      expect(child.getPreviousNode()).toBeUndefined();
    }
  });

  it('when nodes should contain their steps as children', () => {
    const registry = setup();
    const mapper = registry.getMapper('choice');

    const node = mapper.map(
      'route.from.steps.0.choice',
      { processorName: 'choice' },
      {
        when: [
          {
            simple: '${header.foo} == 1',
            steps: [
              { log: { message: 'first' } },
              { log: { message: 'second' } },
            ],
          },
        ],
      },
    );

    const whenNode = node.getChildren()[0];
    expect(whenNode.nodeKind).toBe('group');
    expect(whenNode.getChildren()).toHaveLength(2);

    const steps = whenNode.getChildren();
    expect(steps[0].getNextNode()).toBe(steps[1]);
    expect(steps[1].getPreviousNode()).toBe(steps[0]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
yarn vitest run packages/camel/src/__tests__/choice-mapper.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement choice mapper**

Create `packages/camel/src/mappers/choice-mapper.ts`:

```typescript
import { DefaultTreeNode } from '@iron-bark/tree';
import type { TreeNode } from '@iron-bark/tree';
import type { CamelNodeMapper } from '../mapper-types.js';
import type { CamelMapperRegistry } from '../mapper-registry.js';
import type { CamelNodeData, CamelComponentLookup } from '../types.js';
import { camelAccessors } from '../camel-accessors.js';

export class ChoiceCamelMapper implements CamelNodeMapper {
  constructor(private readonly registry: CamelMapperRegistry) {}

  map(
    path: string,
    componentLookup: CamelComponentLookup,
    entityDefinition: unknown,
  ): TreeNode<CamelNodeData> {
    const def = entityDefinition as Record<string, unknown>;

    const node = new DefaultTreeNode<CamelNodeData>({
      id: path,
      nodeKind: 'group',
      data: { processorName: 'choice', path },
      accessors: camelAccessors,
    });

    const whenArray = def?.when;
    if (Array.isArray(whenArray)) {
      for (let i = 0; i < whenArray.length; i++) {
        const whenMapper = this.registry.getMapper('when');
        const whenNode = whenMapper.map(`${path}.when.${i}`, { processorName: 'when' }, whenArray[i]);
        node.addChild(whenNode);
      }
    }

    const otherwiseDef = def?.otherwise;
    if (otherwiseDef != null) {
      const otherwiseMapper = this.registry.getMapper('otherwise');
      const otherwiseNode = otherwiseMapper.map(`${path}.otherwise`, { processorName: 'otherwise' }, otherwiseDef);
      node.addChild(otherwiseNode);
    }

    return node;
  }
}
```

- [ ] **Step 4: Implement when mapper**

Create `packages/camel/src/mappers/when-mapper.ts`:

```typescript
import { DefaultCamelMapper } from './default-mapper.js';

export class WhenCamelMapper extends DefaultCamelMapper {}
```

The `when` processor has `steps: branch` in `processor-children.ts`, so the `DefaultCamelMapper` already handles it correctly — creates a group and processes its `steps` as a branch.

- [ ] **Step 5: Implement otherwise mapper**

Create `packages/camel/src/mappers/otherwise-mapper.ts`:

```typescript
import { DefaultCamelMapper } from './default-mapper.js';

export class OtherwiseCamelMapper extends DefaultCamelMapper {}
```

Same as `when` — the default mapper handles `otherwise` via its `steps: branch` definition.

- [ ] **Step 6: Run tests to verify they pass**

```bash
yarn vitest run packages/camel/src/__tests__/choice-mapper.test.ts
```

Expected: all tests PASS.

- [ ] **Step 7: Implement circuit-breaker mapper**

Create `packages/camel/src/mappers/circuit-breaker-mapper.ts`:

```typescript
import { DefaultCamelMapper } from './default-mapper.js';

export class CircuitBreakerCamelMapper extends DefaultCamelMapper {}
```

`circuitBreaker` is defined in `processor-children.ts` with `steps: branch` and `onFallback: single-clause`. The default mapper already handles both child types.

- [ ] **Step 8: Implement multicast mapper**

Create `packages/camel/src/mappers/multicast-mapper.ts`:

```typescript
import type { TreeNode } from '@iron-bark/tree';
import type { CamelNodeData, CamelComponentLookup } from '../types.js';
import type { CamelMapperRegistry } from '../mapper-registry.js';
import { DefaultCamelMapper } from './default-mapper.js';

export class MulticastCamelMapper extends DefaultCamelMapper {
  constructor(registry: CamelMapperRegistry) {
    super(registry);
  }

  map(
    path: string,
    componentLookup: CamelComponentLookup,
    entityDefinition: unknown,
  ): TreeNode<CamelNodeData> {
    const node = super.map(path, componentLookup, entityDefinition);

    for (const child of node.getChildren()) {
      child.setNextNode(undefined);
      child.setPreviousNode(undefined);
    }

    return node;
  }
}
```

- [ ] **Step 9: Implement load-balance mapper**

Create `packages/camel/src/mappers/load-balance-mapper.ts`:

```typescript
import { MulticastCamelMapper } from './multicast-mapper.js';

export class LoadBalanceCamelMapper extends MulticastCamelMapper {}
```

Same behavior as multicast — parallel branches with no sequential links.

- [ ] **Step 10: Commit**

```bash
git add packages/camel/src/mappers packages/camel/src/__tests__/choice-mapper.test.ts
git commit -m "feat(camel): add choice, when, otherwise, circuitBreaker, multicast, loadBalance mappers"
```

---

### Task 9: Camel Package — Tree Factory

**Files:**
- Create: `packages/camel/src/camel-tree-factory.ts`
- Create: `packages/camel/src/__tests__/camel-tree-factory.test.ts`
- Create: `packages/camel/src/index.ts`

- [ ] **Step 1: Write failing integration tests**

Create `packages/camel/src/__tests__/camel-tree-factory.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createCamelTree } from '../camel-tree-factory.js';

const SIMPLE_ROUTE = `
- route:
    id: my-route
    from:
      uri: timer:tick?period=1000
      steps:
        - log:
            message: "Hello World"
        - to:
            uri: direct:end
`;

const CHOICE_ROUTE = `
- route:
    id: choice-route
    from:
      uri: direct:start
      steps:
        - choice:
            when:
              - simple: "\${header.foo} == 1"
                steps:
                  - log:
                      message: "matched 1"
              - simple: "\${header.foo} == 2"
                steps:
                  - log:
                      message: "matched 2"
            otherwise:
              steps:
                - log:
                    message: "no match"
        - to:
            uri: direct:end
`;

describe('createCamelTree', () => {
  describe('simple route', () => {
    it('should create a tree with type camel', () => {
      const tree = createCamelTree(SIMPLE_ROUTE, 'yaml');
      expect(tree.type).toBe('camel');
    });

    it('should have a route group as root', () => {
      const tree = createCamelTree(SIMPLE_ROUTE, 'yaml');
      expect(tree.root.nodeKind).toBe('group');
      expect(tree.root.data.processorName).toBe('route');
    });

    it('should flatten from children to route level', () => {
      const tree = createCamelTree(SIMPLE_ROUTE, 'yaml');
      const children = tree.root.getChildren();

      expect(children.map((c) => c.data.processorName)).toEqual(['from', 'log', 'to']);
    });

    it('should make from a leaf after flattening', () => {
      const tree = createCamelTree(SIMPLE_ROUTE, 'yaml');
      const fromNode = tree.root.getChildren()[0];

      expect(fromNode.nodeKind).toBe('leaf');
      expect(fromNode.getChildren()).toEqual([]);
    });

    it('should wire sequential prev/next links', () => {
      const tree = createCamelTree(SIMPLE_ROUTE, 'yaml');
      const [from, log, to] = tree.root.getChildren();

      expect(from.getNextNode()).toBe(log);
      expect(log.getPreviousNode()).toBe(from);
      expect(log.getNextNode()).toBe(to);
      expect(to.getPreviousNode()).toBe(log);

      expect(from.getPreviousNode()).toBeUndefined();
      expect(to.getNextNode()).toBeUndefined();
    });

    it('should extract component name from URI', () => {
      const tree = createCamelTree(SIMPLE_ROUTE, 'yaml');
      const fromNode = tree.root.getChildren()[0];

      expect(fromNode.data.componentName).toBe('timer');
      expect(fromNode.getLabel()).toBe('timer');
    });

    it('should be walkable', () => {
      const tree = createCamelTree(SIMPLE_ROUTE, 'yaml');
      const ids = [...tree.walk()].map((n) => n.id);

      expect(ids).toHaveLength(4);
      expect(ids[0]).toContain('route');
    });
  });

  describe('choice route', () => {
    it('should create choice as a group with when/otherwise children', () => {
      const tree = createCamelTree(CHOICE_ROUTE, 'yaml');
      const children = tree.root.getChildren();

      const choiceNode = children.find((c) => c.data.processorName === 'choice');
      expect(choiceNode).toBeDefined();
      expect(choiceNode!.nodeKind).toBe('group');

      const choiceChildren = choiceNode!.getChildren();
      expect(choiceChildren.map((c) => c.data.processorName)).toEqual([
        'when', 'when', 'otherwise',
      ]);
    });

    it('should wire from → choice → to at route level', () => {
      const tree = createCamelTree(CHOICE_ROUTE, 'yaml');
      const [from, choice, to] = tree.root.getChildren();

      expect(from.data.processorName).toBe('from');
      expect(choice.data.processorName).toBe('choice');
      expect(to.data.processorName).toBe('to');

      expect(from.getNextNode()).toBe(choice);
      expect(choice.getNextNode()).toBe(to);
    });

    it('should have steps inside when nodes', () => {
      const tree = createCamelTree(CHOICE_ROUTE, 'yaml');
      const choiceNode = tree.root.getChildren().find((c) => c.data.processorName === 'choice')!;
      const firstWhen = choiceNode.getChildren()[0];

      expect(firstWhen.getChildren()).toHaveLength(1);
      expect(firstWhen.getChildren()[0].data.processorName).toBe('log');
    });
  });

  describe('generic API', () => {
    it('should work without any Camel-specific knowledge', () => {
      const tree = createCamelTree(SIMPLE_ROUTE, 'yaml');

      const labels: string[] = [];
      for (const node of tree.walk()) {
        labels.push(node.getLabel());
      }

      expect(labels).toContain('timer');
      expect(labels).toContain('log');
    });

    it('should find node by id', () => {
      const tree = createCamelTree(SIMPLE_ROUTE, 'yaml');
      const root = tree.root;
      const fromNode = root.getChildren()[0];

      const found = tree.findById(fromNode.id);
      expect(found).toBe(fromNode);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
yarn vitest run packages/camel/src/__tests__/camel-tree-factory.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement camel-tree-factory**

Create `packages/camel/src/camel-tree-factory.ts`:

```typescript
import { DefaultTreeNode, DefaultTree } from '@iron-bark/tree';
import type { Tree, TreeNode } from '@iron-bark/tree';
import { parse as parseYaml } from 'yaml';
import type { CamelNodeData } from './types.js';
import { CamelMapperRegistry } from './mapper-registry.js';
import { DefaultCamelMapper } from './mappers/default-mapper.js';
import { ChoiceCamelMapper } from './mappers/choice-mapper.js';
import { WhenCamelMapper } from './mappers/when-mapper.js';
import { OtherwiseCamelMapper } from './mappers/otherwise-mapper.js';
import { CircuitBreakerCamelMapper } from './mappers/circuit-breaker-mapper.js';
import { MulticastCamelMapper } from './mappers/multicast-mapper.js';
import { LoadBalanceCamelMapper } from './mappers/load-balance-mapper.js';
import { getComponentNameFromUri } from './uri-helper.js';
import { camelAccessors } from './camel-accessors.js';

function createRegistry(): CamelMapperRegistry {
  const registry = new CamelMapperRegistry();
  const defaultMapper = new DefaultCamelMapper(registry);

  registry.registerDefault(defaultMapper);
  registry.register('choice', new ChoiceCamelMapper(registry));
  registry.register('when', new WhenCamelMapper(registry));
  registry.register('otherwise', new OtherwiseCamelMapper(registry));
  registry.register('circuitBreaker', new CircuitBreakerCamelMapper(registry));
  registry.register('multicast', new MulticastCamelMapper(registry));
  registry.register('loadBalance', new LoadBalanceCamelMapper(registry));

  return registry;
}

export function createCamelTree(source: string, format: 'yaml'): Tree<CamelNodeData> {
  const parsed = parseYaml(source);
  const routes = Array.isArray(parsed) ? parsed : [parsed];
  const routeDef = routes[0]?.route ?? routes[0];

  const registry = createRegistry();

  const routeRoot = createRouteNode(routeDef, registry);

  return new DefaultTree<CamelNodeData>('camel', routeRoot);
}

function createRouteNode(
  routeDef: Record<string, unknown>,
  registry: CamelMapperRegistry,
): TreeNode<CamelNodeData> {
  const routeId = (routeDef.id as string) ?? 'route';
  const rootPath = 'route';

  const routeGroupNode = new DefaultTreeNode<CamelNodeData>({
    id: rootPath,
    nodeKind: 'group',
    data: { processorName: 'route', path: rootPath },
    accessors: camelAccessors,
  });

  const fromDef = routeDef.from as Record<string, unknown>;
  if (!fromDef) return routeGroupNode;

  const fromUri = typeof fromDef.uri === 'string' ? fromDef.uri : undefined;
  const fromComponentName = getComponentNameFromUri(fromUri);

  const fromMapper = registry.getMapper('from');
  const fromNode = fromMapper.map(
    `${rootPath}.from`,
    { processorName: 'from', componentName: fromComponentName },
    fromDef,
  );

  // Phase 2: Flatten — promote from's children to route level
  const fromChildren = [...fromNode.getChildren()];

  // Clear from's children and make it a leaf
  for (const child of fromChildren) {
    fromNode.removeChild(child);
  }

  // Re-create from as a leaf node
  const fromLeaf = new DefaultTreeNode<CamelNodeData>({
    id: fromNode.id,
    nodeKind: 'leaf',
    data: fromNode.data,
    accessors: camelAccessors,
  });

  routeGroupNode.addChild(fromLeaf);

  // Add promoted children and wire sequential links
  let previousNode: TreeNode<CamelNodeData> = fromLeaf;

  for (const child of fromChildren) {
    routeGroupNode.addChild(child);
    previousNode.setNextNode(child);
    child.setPreviousNode(previousNode);
    previousNode = child;
  }

  return routeGroupNode;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
yarn vitest run packages/camel/src/__tests__/camel-tree-factory.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Create camel index.ts**

Create `packages/camel/src/index.ts`:

```typescript
export { createCamelTree } from './camel-tree-factory.js';
export type { CamelNodeData, CamelComponentLookup } from './types.js';
```

- [ ] **Step 6: Verify full camel package compiles**

```bash
cd packages/camel && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Run all tests**

```bash
cd /path/to/repo && yarn vitest run
```

Expected: all tests across core and camel PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/camel
git commit -m "feat(camel): implement createCamelTree with two-phase construction"
```

---

### Task 10: Citrus Package — Scaffold

**Files:**
- Create: `packages/citrus/package.json`
- Create: `packages/citrus/tsconfig.json`
- Create: `packages/citrus/src/index.ts`

- [ ] **Step 1: Create citrus package.json**

Create `packages/citrus/package.json`:

```json
{
  "name": "@iron-bark/tree-citrus",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "test": "vitest run"
  },
  "dependencies": {
    "@iron-bark/tree": "workspace:*"
  }
}
```

- [ ] **Step 2: Create citrus tsconfig.json**

Create `packages/citrus/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "references": [
    { "path": "../core" }
  ]
}
```

- [ ] **Step 3: Create placeholder index.ts**

Create `packages/citrus/src/index.ts`:

```typescript
export {};
```

- [ ] **Step 4: Verify it compiles**

```bash
cd packages/citrus && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/citrus
git commit -m "feat(citrus): scaffold empty package"
```

---

### Task 11: Playground — Vite + React Setup

**Files:**
- Create: `packages/playground/package.json`
- Create: `packages/playground/tsconfig.json`
- Create: `packages/playground/vite.config.ts`
- Create: `packages/playground/index.html`
- Create: `packages/playground/src/main.tsx`
- Create: `packages/playground/src/App.tsx`
- Create: `packages/playground/src/App.css`

- [ ] **Step 1: Create playground package.json**

Create `packages/playground/package.json`:

```json
{
  "name": "@iron-bark/tree-playground",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build"
  },
  "dependencies": {
    "@iron-bark/tree": "workspace:*",
    "@iron-bark/tree-camel": "workspace:*",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@types/react": "^19.1.2",
    "@types/react-dom": "^19.1.2",
    "@vitejs/plugin-react": "^4.4.1",
    "vite": "^6.3.2"
  }
}
```

- [ ] **Step 2: Create playground tsconfig.json**

Create `packages/playground/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "jsx": "react-jsx",
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create vite.config.ts**

Create `packages/playground/vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
```

- [ ] **Step 4: Create index.html**

Create `packages/playground/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>@iron-bark/tree playground</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create main.tsx**

Create `packages/playground/src/main.tsx`:

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 6: Create App.tsx and App.css**

Create `packages/playground/src/App.css`:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: monospace;
  background: #1a1a2e;
  color: #e0e0e0;
}

.app {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto 1fr;
  height: 100vh;
  gap: 1px;
  background: #333;
}

.header {
  grid-column: 1 / -1;
  padding: 12px 16px;
  background: #16213e;
  font-size: 14px;
  font-weight: bold;
}

.input-pane, .output-pane {
  padding: 16px;
  background: #1a1a2e;
  overflow: auto;
}

textarea {
  width: 100%;
  height: calc(100% - 40px);
  background: #0f0f23;
  color: #e0e0e0;
  border: 1px solid #444;
  padding: 12px;
  font-family: monospace;
  font-size: 13px;
  resize: none;
}

button {
  margin-top: 8px;
  padding: 6px 16px;
  background: #0f3460;
  color: #e0e0e0;
  border: 1px solid #555;
  cursor: pointer;
  font-family: monospace;
}

button:hover {
  background: #16213e;
}

.error {
  color: #e94560;
  margin-top: 8px;
  white-space: pre-wrap;
}

.tree-line {
  cursor: pointer;
  padding: 2px 0;
}

.tree-line:hover {
  background: #16213e;
}

.tree-line.selected {
  background: #0f3460;
}

.node-details {
  margin-top: 16px;
  padding: 12px;
  background: #0f0f23;
  border: 1px solid #444;
  font-size: 13px;
}

.node-details dt {
  color: #888;
  margin-top: 8px;
}

.node-details dd {
  margin-left: 16px;
}
```

Create `packages/playground/src/App.tsx`:

```typescript
import { useState } from 'react';
import type { Tree, TreeNode } from '@iron-bark/tree';
import { createCamelTree } from '@iron-bark/tree-camel';
import type { CamelNodeData } from '@iron-bark/tree-camel';
import { TreeRenderer } from './components/TreeRenderer.js';
import { NodeDetails } from './components/NodeDetails.js';
import './App.css';

const SAMPLE_ROUTE = `- route:
    id: my-route
    from:
      uri: timer:tick?period=1000
      steps:
        - log:
            message: "Hello World"
        - choice:
            when:
              - simple: "\${header.foo} == 1"
                steps:
                  - log:
                      message: "matched"
            otherwise:
              steps:
                - to:
                    uri: direct:fallback
        - to:
            uri: direct:end`;

export function App() {
  const [source, setSource] = useState(SAMPLE_ROUTE);
  const [tree, setTree] = useState<Tree<CamelNodeData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function handleParse() {
    try {
      const result = createCamelTree(source, 'yaml');
      setTree(result);
      setError(null);
      setSelectedId(null);
    } catch (e) {
      setError(String(e));
      setTree(null);
    }
  }

  const selectedNode = tree && selectedId ? tree.findById(selectedId) : null;

  return (
    <div className="app">
      <div className="header">@iron-bark/tree playground</div>
      <div className="input-pane">
        <textarea value={source} onChange={(e) => setSource(e.target.value)} />
        <div>
          <button onClick={handleParse}>Parse</button>
        </div>
        {error && <div className="error">{error}</div>}
      </div>
      <div className="output-pane">
        {tree && (
          <>
            <TreeRenderer
              node={tree.root}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            {selectedNode && <NodeDetails node={selectedNode} />}
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Install dependencies**

```bash
cd /path/to/repo && yarn install
```

- [ ] **Step 8: Commit**

```bash
git add packages/playground
git commit -m "feat(playground): scaffold Vite + React app with route input"
```

---

### Task 12: Playground — Tree Renderer and Node Details

**Files:**
- Create: `packages/playground/src/components/TreeRenderer.tsx`
- Create: `packages/playground/src/components/NodeDetails.tsx`

- [ ] **Step 1: Create TreeRenderer component**

Create `packages/playground/src/components/TreeRenderer.tsx`:

```typescript
import type { TreeNode } from '@iron-bark/tree';

interface TreeRendererProps {
  node: TreeNode<unknown>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  depth?: number;
  isLast?: boolean;
  prefix?: string;
}

export function TreeRenderer({
  node,
  selectedId,
  onSelect,
  depth = 0,
  isLast = true,
  prefix = '',
}: TreeRendererProps) {
  const connector = depth === 0 ? '' : isLast ? '└── ' : '├── ';
  const kindTag = node.nodeKind === 'group' ? ' [group]' : '';
  const label = `${prefix}${connector}${node.getLabel()}${kindTag}`;

  const childPrefix = depth === 0 ? '' : prefix + (isLast ? '    ' : '│   ');
  const children = node.getChildren();

  return (
    <>
      <div
        className={`tree-line${node.id === selectedId ? ' selected' : ''}`}
        onClick={() => onSelect(node.id)}
      >
        {label}
      </div>
      {children.map((child, i) => (
        <TreeRenderer
          key={child.id}
          node={child}
          selectedId={selectedId}
          onSelect={onSelect}
          depth={depth + 1}
          isLast={i === children.length - 1}
          prefix={childPrefix}
        />
      ))}
    </>
  );
}
```

- [ ] **Step 2: Create NodeDetails component**

Create `packages/playground/src/components/NodeDetails.tsx`:

```typescript
import type { TreeNode } from '@iron-bark/tree';

interface NodeDetailsProps {
  node: TreeNode<unknown>;
}

export function NodeDetails({ node }: NodeDetailsProps) {
  return (
    <div className="node-details">
      <h3>Node Details</h3>
      <dl>
        <dt>ID</dt>
        <dd>{node.id}</dd>

        <dt>Label</dt>
        <dd>{node.getLabel()}</dd>

        <dt>Name</dt>
        <dd>{node.getName()}</dd>

        <dt>Description</dt>
        <dd>{node.getDescription()}</dd>

        <dt>Icon URL</dt>
        <dd>{node.getIconUrl() ?? '(none)'}</dd>

        <dt>Kind</dt>
        <dd>{node.nodeKind}</dd>

        <dt>Parent</dt>
        <dd>{node.getParent()?.id ?? '(none)'}</dd>

        <dt>Previous</dt>
        <dd>{node.getPreviousNode()?.id ?? '(none)'}</dd>

        <dt>Next</dt>
        <dd>{node.getNextNode()?.id ?? '(none)'}</dd>

        <dt>Children</dt>
        <dd>{node.getChildren().map((c) => c.id).join(', ') || '(none)'}</dd>

        <dt>Data</dt>
        <dd><pre>{JSON.stringify(node.data, null, 2)}</pre></dd>
      </dl>
    </div>
  );
}
```

- [ ] **Step 3: Start dev server and verify**

```bash
cd packages/playground && yarn dev
```

Open the URL shown (usually `http://localhost:5173`). Click "Parse" — you should see:

```
route [group]
├── timer
├── log
├── choice [group]
│   ├── when [group]
│   │   └── log
│   └── otherwise [group]
│       └── direct
└── direct
```

Click a node to see its details panel with label, description, navigation links, and raw data.

- [ ] **Step 4: Commit**

```bash
git add packages/playground/src/components
git commit -m "feat(playground): add tree renderer and node details panel"
```

---

### Task 13: Final Verification

- [ ] **Step 1: Run all tests from root**

```bash
cd /path/to/repo && yarn vitest run
```

Expected: all tests across core and camel PASS.

- [ ] **Step 2: Build all packages**

```bash
yarn build
```

Expected: `dist/` directories created in core, camel, citrus with compiled JS and declaration files.

- [ ] **Step 3: Verify playground works end-to-end**

```bash
cd packages/playground && yarn dev
```

Test the following:
1. Default sample route renders correctly
2. Paste a different route and click Parse
3. Click nodes to see details
4. Verify prev/next links show correctly for sequential steps
5. Verify choice children have no prev/next links

- [ ] **Step 4: Commit any final fixes**

```bash
git add -A && git commit -m "chore: final verification and cleanup"
```
