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
