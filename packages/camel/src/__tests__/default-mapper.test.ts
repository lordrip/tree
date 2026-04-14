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
