export interface CamelNodeData {
  processorName: string;
  componentName?: string;
  uri?: string;
  path: string;
}

export interface CamelComponentLookup {
  processorName: string;
  componentName?: string;
}

export type CamelProcessorChildType = 'branch' | 'single-clause' | 'array-clause';

export interface CamelProcessorStepsProperty {
  name: string;
  type: CamelProcessorChildType;
}
