import { describe, it, expect } from 'vitest';
import { createCamelTree } from '../camel-tree-factory.js';

// Based on real Kaoto fixture: packages/ui-tests/cypress/fixtures/flows/camelRoute/basic.yaml
const SIMPLE_ROUTE = `
- route:
    id: camel-route
    from:
      uri: timer:test
      steps:
        - setHeader:
            constant: test
            name: test
        - marshal:
            id: marshal-3801
        - to:
            uri: log:test
`;

// Based on real Kaoto fixture: packages/ui/src/stubs/yaml/choice.yaml
const CHOICE_ROUTE = `
- route:
    from:
      uri: direct:start
      steps:
        - choice:
            when:
              - simple:
                  expression: "\${body} contains 'Apple'"
                steps:
                  - log:
                      message: Apple branch
                  - to:
                      uri: mock:result
              - simple:
                  expression: "\${body} contains 'Banana'"
                steps:
                  - log:
                      message: Banana branch
            otherwise:
              steps:
                - log:
                    message: Other fruits
        - to:
            uri: mock:result
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

      expect(children.map((c) => c.data.processorName)).toEqual([
        'from', 'setHeader', 'marshal', 'to',
      ]);
    });

    it('should make from a leaf after flattening', () => {
      const tree = createCamelTree(SIMPLE_ROUTE, 'yaml');
      const fromNode = tree.root.getChildren()[0];

      expect(fromNode.nodeKind).toBe('leaf');
      expect(fromNode.getChildren()).toEqual([]);
    });

    it('should wire sequential prev/next links', () => {
      const tree = createCamelTree(SIMPLE_ROUTE, 'yaml');
      const [from, setHeader, marshal, to] = tree.root.getChildren();

      expect(from.getNextNode()).toBe(setHeader);
      expect(setHeader.getPreviousNode()).toBe(from);
      expect(setHeader.getNextNode()).toBe(marshal);
      expect(marshal.getPreviousNode()).toBe(setHeader);
      expect(marshal.getNextNode()).toBe(to);
      expect(to.getPreviousNode()).toBe(marshal);

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

      expect(ids).toHaveLength(5); // route + from + 3 steps
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

      expect(firstWhen.getChildren()).toHaveLength(2);
      expect(firstWhen.getChildren()[0].data.processorName).toBe('log');
      expect(firstWhen.getChildren()[1].data.processorName).toBe('to');
    });

    it('should link steps within a when branch sequentially', () => {
      const tree = createCamelTree(CHOICE_ROUTE, 'yaml');
      const choiceNode = tree.root.getChildren().find((c) => c.data.processorName === 'choice')!;
      const firstWhen = choiceNode.getChildren()[0];
      const [log, to] = firstWhen.getChildren();

      expect(log.getNextNode()).toBe(to);
      expect(to.getPreviousNode()).toBe(log);
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
      expect(labels).toContain('setHeader');
      expect(labels).toContain('marshal');
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
