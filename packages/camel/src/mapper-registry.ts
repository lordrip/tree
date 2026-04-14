import type { CamelNodeMapper } from './mapper-types.js';

export class CamelMapperRegistry {
  private readonly mappers = new Map<string, CamelNodeMapper>();
  private defaultMapper: CamelNodeMapper | undefined;

  registerDefault(mapper: CamelNodeMapper): void {
    this.defaultMapper = mapper;
  }

  register(processorName: string, mapper: CamelNodeMapper): void {
    this.mappers.set(processorName, mapper);
  }

  getMapper(processorName: string): CamelNodeMapper {
    const mapper = this.mappers.get(processorName) ?? this.defaultMapper;
    if (!mapper) {
      throw new Error(`No mapper found for processor "${processorName}" and no default mapper registered`);
    }
    return mapper;
  }
}
