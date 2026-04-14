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
