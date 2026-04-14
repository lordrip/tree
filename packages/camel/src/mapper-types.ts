import type { TreeNode } from '@iron-bark/tree';
import type { CamelNodeData, CamelComponentLookup } from './types.js';

export interface CamelNodeMapper {
  map(
    path: string,
    componentLookup: CamelComponentLookup,
    entityDefinition: unknown,
  ): TreeNode<CamelNodeData>;
}
