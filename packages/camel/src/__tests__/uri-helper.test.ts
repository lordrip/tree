import { describe, it, expect } from 'vitest';
import { getComponentNameFromUri } from '../uri-helper.js';

describe('getComponentNameFromUri', () => {
  it('should extract component name from simple URI', () => {
    expect(getComponentNameFromUri('timer:foo')).toBe('timer');
  });

  it('should extract component name from URI with query params', () => {
    expect(getComponentNameFromUri('timer:foo?period=1000')).toBe('timer');
  });

  it('should extract component name from URI without path', () => {
    expect(getComponentNameFromUri('log:myLogger')).toBe('log');
  });

  it('should handle direct component', () => {
    expect(getComponentNameFromUri('direct:start')).toBe('direct');
  });

  it('should handle kafka with params', () => {
    expect(getComponentNameFromUri('kafka:topic?brokers=localhost:9092')).toBe('kafka');
  });

  it('should return undefined for empty string', () => {
    expect(getComponentNameFromUri('')).toBeUndefined();
  });

  it('should return undefined for undefined', () => {
    expect(getComponentNameFromUri(undefined)).toBeUndefined();
  });
});
