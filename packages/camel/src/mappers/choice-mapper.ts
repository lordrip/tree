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
