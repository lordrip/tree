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
