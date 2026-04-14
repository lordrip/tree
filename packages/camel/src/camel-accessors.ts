import type { NodeAccessors } from '@iron-bark/tree';
import type { CamelNodeData } from './types.js';

export const camelAccessors: NodeAccessors<CamelNodeData> = {
  getLabel: (data) => data.componentName ?? data.processorName,
  getDescription: (data) => data.uri ?? data.processorName,
  getName: (data) => data.processorName,
  getIconUrl: (data) => `/icons/${data.processorName}.svg`,
};
