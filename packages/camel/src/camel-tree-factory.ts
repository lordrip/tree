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

  // Clear from's children
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
