import type { CamelProcessorStepsProperty } from './types.js';

const BRANCH_STEPS: CamelProcessorStepsProperty[] = [{ name: 'steps', type: 'branch' }];

const PROCESSOR_CHILDREN: Record<string, CamelProcessorStepsProperty[]> = {
  from: BRANCH_STEPS,
  when: BRANCH_STEPS,
  otherwise: BRANCH_STEPS,
  doCatch: BRANCH_STEPS,
  doFinally: BRANCH_STEPS,
  onFallback: BRANCH_STEPS,
  filter: BRANCH_STEPS,
  split: BRANCH_STEPS,
  multicast: BRANCH_STEPS,
  loop: BRANCH_STEPS,
  pipeline: BRANCH_STEPS,
  aggregate: BRANCH_STEPS,
  step: BRANCH_STEPS,

  choice: [
    { name: 'when', type: 'array-clause' },
    { name: 'otherwise', type: 'single-clause' },
  ],

  circuitBreaker: [
    { name: 'steps', type: 'branch' },
    { name: 'onFallback', type: 'single-clause' },
  ],

  doTry: [
    { name: 'steps', type: 'branch' },
    { name: 'doCatch', type: 'array-clause' },
    { name: 'doFinally', type: 'single-clause' },
  ],

  loadBalance: BRANCH_STEPS,
};

export function getProcessorStepsProperties(processorName: string): CamelProcessorStepsProperty[] {
  return PROCESSOR_CHILDREN[processorName] ?? [];
}
