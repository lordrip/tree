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
