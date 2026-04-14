import { describe, it, expect } from 'vitest';
import { getProcessorStepsProperties } from '../processor-children.js';

describe('getProcessorStepsProperties', () => {
  it('should return steps branch for from', () => {
    expect(getProcessorStepsProperties('from')).toEqual([
      { name: 'steps', type: 'branch' },
    ]);
  });

  it('should return when + otherwise for choice', () => {
    expect(getProcessorStepsProperties('choice')).toEqual([
      { name: 'when', type: 'array-clause' },
      { name: 'otherwise', type: 'single-clause' },
    ]);
  });

  it('should return steps + onFallback for circuitBreaker', () => {
    expect(getProcessorStepsProperties('circuitBreaker')).toEqual([
      { name: 'steps', type: 'branch' },
      { name: 'onFallback', type: 'single-clause' },
    ]);
  });

  it('should return steps + doCatch + doFinally for doTry', () => {
    expect(getProcessorStepsProperties('doTry')).toEqual([
      { name: 'steps', type: 'branch' },
      { name: 'doCatch', type: 'array-clause' },
      { name: 'doFinally', type: 'single-clause' },
    ]);
  });

  it('should return steps branch for processors with steps', () => {
    for (const name of ['filter', 'split', 'multicast', 'loop', 'pipeline', 'aggregate', 'step']) {
      expect(getProcessorStepsProperties(name)).toEqual([
        { name: 'steps', type: 'branch' },
      ]);
    }
  });

  it('should return steps branch for when and otherwise', () => {
    expect(getProcessorStepsProperties('when')).toEqual([
      { name: 'steps', type: 'branch' },
    ]);
    expect(getProcessorStepsProperties('otherwise')).toEqual([
      { name: 'steps', type: 'branch' },
    ]);
  });

  it('should return steps branch for doCatch and onFallback', () => {
    expect(getProcessorStepsProperties('doCatch')).toEqual([
      { name: 'steps', type: 'branch' },
    ]);
    expect(getProcessorStepsProperties('onFallback')).toEqual([
      { name: 'steps', type: 'branch' },
    ]);
  });

  it('should return empty array for leaf processors', () => {
    expect(getProcessorStepsProperties('log')).toEqual([]);
    expect(getProcessorStepsProperties('to')).toEqual([]);
    expect(getProcessorStepsProperties('setHeader')).toEqual([]);
    expect(getProcessorStepsProperties('setBody')).toEqual([]);
    expect(getProcessorStepsProperties('marshal')).toEqual([]);
  });
});
