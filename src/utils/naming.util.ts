// src/utils/naming.util.ts
import { kebabCase, camelCase, pascalCase } from 'change-case';

export class NamingUtil {
  static toKebabCase(str: string): string {
    return kebabCase(str);
  }

  static toCamelCase(str: string): string {
    return camelCase(str);
  }

  static toPascalCase(str: string): string {
    return pascalCase(str);
  }

  static generateFilename(operationId: string, suffix: string, extension = 'ts'): string {
    return `${this.toKebabCase(operationId)}-${suffix}.${extension}`;
  }

  static generateModelFilename(modelName: string): string {
    return `${this.toKebabCase(modelName)}.model.ts`;
  }

  static generateServiceFilename(tag: string): string {
    return `${this.toKebabCase(tag)}.service.ts`;
  }

  static generateQueryFilename(operationId: string, type: 'query' | 'mutation'): string {
    return `use-${this.toKebabCase(operationId)}-${type}.query.ts`;
  }

  static generateConstantFilename(tag: string): string {
    return `${this.toKebabCase(tag)}.constant.ts`;
  }
}

