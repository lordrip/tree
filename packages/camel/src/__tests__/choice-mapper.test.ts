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
