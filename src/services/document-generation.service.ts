import SwaggerParser from '@apidevtools/swagger-parser';
import * as XLSX from 'xlsx';
import { ensureDir, writeFile } from 'fs-extra';
import { join } from 'path';
import { kebabCase, camelCase, pascalCase } from 'change-case';
import {
  SwaggerSpec,
  SwaggerOperation,
  SwaggerSchema,
  ApiDocumentation,
  ModelDocumentation,
  SwaggerParseError,
  FileOperationError,
  HttpMethod,
} from '../types';
import { logger } from '../utils';

export class DocumentGenerationService {
  async generateFromUrl(swaggerUrl: string, outputDir: string): Promise<void> {
    try {
      logger.info(`Fetching Swagger specification from: ${swaggerUrl}`);
      const api = await SwaggerParser.parse(swaggerUrl) as SwaggerSpec;
      await this.generateDocuments(api, outputDir);
    } catch (error) {
      throw new SwaggerParseError(
        `Failed to parse Swagger from URL: ${swaggerUrl}`,
        error
      );
    }
  }

  async generateFromFile(swaggerFile: string, outputDir: string): Promise<void> {
    try {
      logger.info(`Parsing Swagger specification from: ${swaggerFile}`);
      const api = await SwaggerParser.parse(swaggerFile) as SwaggerSpec;
      await this.generateDocuments(api, outputDir);
    } catch (error) {
      throw new SwaggerParseError(
        `Failed to parse Swagger from file: ${swaggerFile}`,
        error
      );
    }
  }

  private async generateDocuments(api: SwaggerSpec, outputDir: string): Promise<void> {
    await ensureDir(outputDir);

    const { apis, models } = this.extractDocumentationData(api);

    // Generate APIs spreadsheet
    await this.generateApisSpreadsheet(apis, join(outputDir, 'apis.xlsx'));

    // Generate Models spreadsheet
    await this.generateModelsSpreadsheet(models, join(outputDir, 'models.xlsx'));

    logger.info(`Generated ${apis.length} API endpoints`);
    logger.info(`Generated ${models.length} model definitions`);
  }

  private extractDocumentationData(api: SwaggerSpec): {
    apis: ApiDocumentation[];
    models: ModelDocumentation[];
  } {
    const apis: ApiDocumentation[] = [];
    const models: ModelDocumentation[] = [];
    const seenModels = new Set<string>();
    let apiIndex = 1;

    // Extract API endpoints
    for (const [path, pathItem] of Object.entries(api.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (!this.isValidHttpMethod(method)) continue;

        const apiDoc = this.createApiDocumentation(
          apiIndex++,
          path,
          method as HttpMethod,
          operation as SwaggerOperation,
          api
        );
        apis.push(apiDoc);

        // Extract models from this operation
        const operationModels = this.extractModelsFromOperation(
          operation as SwaggerOperation,
          api,
          seenModels
        );
        models.push(...operationModels);
      }
    }

    // Extract standalone models from components/definitions
    const standaloneModels = this.extractStandaloneModels(api, seenModels);
    models.push(...standaloneModels);

    // Assign sequential numbers to models
    models.forEach((model, index) => {
      model.sNo = index + 1;
    });

    return { apis, models };
  }

  private createApiDocumentation(
    sNo: number,
    path: string,
    method: HttpMethod,
    operation: SwaggerOperation,
    api: SwaggerSpec
  ): ApiDocumentation {
    const tag = operation.tags?.[0] || 'default';
    const operationId = operation.operationId || this.generateOperationId(method, path);

    // Extract path parameters
    const pathParams = this.extractPathParameters(path, operation, api);
    
    // Generate model references
    const queryParamsRef = this.hasQueryParams(operation) 
      ? `${pascalCase(operationId)}QueryParams` 
      : undefined;
    
    const requestBodyRef = operation.requestBody 
      ? `${pascalCase(operationId)}InData` 
      : undefined;
    
    const responseBodyRef = this.hasResponseBody(operation)
      ? `${pascalCase(operationId)}OutData`
      : undefined;

    // Check if endpoint is paginated
    const isPaginated = this.detectPagination(operation);

    // Check if endpoint requires authentication
    const requiresAuth = this.detectAuthentication(operation);

    // Generate business purpose from description/summary
    const businessPurpose = this.generateBusinessPurpose(operation, tag, method, path);

    return {
      sNo,
      endpoint: path,
      method,
      tag,
      operationId,
      summary: operation.summary || `${method} ${path}`,
      pathParams: pathParams ? JSON.stringify(pathParams) : undefined,
      queryParamsRef,
      requestBodyRef,
      responseBodyRef,
      isPaginated,
      requiresAuth,
      businessPurpose,
    };
  }

  private extractPathParameters(
    path: string,
    operation: SwaggerOperation,
    api: SwaggerSpec
  ): Record<string, any> | undefined {
    const pathParams: Record<string, any> = {};
    const pathParamMatches = path.match(/{([^}]+)}/g);

    if (!pathParamMatches) return undefined;

    pathParamMatches.forEach(match => {
      const paramName = match.slice(1, -1); // Remove { and }
      const param = operation.parameters?.find(p => p.name === paramName && p.in === 'path');
      
      if (param) {
        pathParams[paramName] = {
          type: this.getParameterType(param),
          required: param.required || true,
          description: param.description,
        };
      } else {
        // Default to string type if not found in parameters
        pathParams[paramName] = {
          type: 'string',
          required: true,
        };
      }
    });

    return Object.keys(pathParams).length > 0 ? pathParams : undefined;
  }

  private extractModelsFromOperation(
    operation: SwaggerOperation,
    api: SwaggerSpec,
    seenModels: Set<string>
  ): ModelDocumentation[] {
    const models: ModelDocumentation[] = [];

    // Extract query parameters model
    if (this.hasQueryParams(operation)) {
      const operationId = operation.operationId || 'unknown';
      const queryParamsModel = this.createQueryParamsModel(operation, operationId);
      if (queryParamsModel && !seenModels.has(queryParamsModel.modelName)) {
        models.push(queryParamsModel);
        seenModels.add(queryParamsModel.modelName);
      }
    }

    // Extract request body model
    if (operation.requestBody) {
      const requestModel = this.createRequestBodyModel(operation, api);
      if (requestModel && !seenModels.has(requestModel.modelName)) {
        models.push(requestModel);
        seenModels.add(requestModel.modelName);
      }
    }

    // Extract response models
    const responseModels = this.createResponseModels(operation, api);
    responseModels.forEach(model => {
      if (!seenModels.has(model.modelName)) {
        models.push(model);
        seenModels.add(model.modelName);
      }
    });

    return models;
  }

  private createQueryParamsModel(
    operation: SwaggerOperation,
    operationId: string
  ): ModelDocumentation | null {
    const queryParams = operation.parameters?.filter(p => p.in === 'query') || [];
    if (queryParams.length === 0) return null;

    const properties: Record<string, any> = {};
    const required: string[] = [];

    queryParams.forEach(param => {
      properties[param.name] = {
        type: this.getParameterType(param),
        description: param.description,
      };

      if (param.required) {
        required.push(param.name);
      }
    });

    return {
      sNo: 0, // Will be assigned later
      modelName: `${pascalCase(operationId)}QueryParams`,
      properties: JSON.stringify(properties),
      required: required.length > 0 ? JSON.stringify(required) : undefined,
      description: `Query parameters for ${operationId} operation`,
      usedInOperations: operationId,
    };
  }

  private createRequestBodyModel(
    operation: SwaggerOperation,
    api: SwaggerSpec
  ): ModelDocumentation | null {
    if (!operation.requestBody || !operation.operationId) return null;

    const content = operation.requestBody.content;
    const jsonContent = content['application/json'];
    if (!jsonContent?.schema) return null;

    const schema = this.resolveSchema(jsonContent.schema, api);
    const properties = this.extractSchemaProperties(schema, api);

    return {
      sNo: 0, // Will be assigned later
      modelName: `${pascalCase(operation.operationId)}InData`,
      properties: JSON.stringify(properties.properties),
      required: properties.required.length > 0 ? JSON.stringify(properties.required) : undefined,
      description: `Request body model for ${operation.operationId} operation`,
      usedInOperations: operation.operationId,
    };
  }

  private createResponseModels(
    // operation: SwaggerOperation,
    operation: any,
    api: SwaggerSpec
  ): ModelDocumentation[] {
    if (!operation.operationId) return [];

    const models: ModelDocumentation[] = [];
    const successResponses = Object.entries(operation.responses)
      .filter(([status]) => status.startsWith('2'));

    successResponses.forEach(([status, response] : [status: any, response: any]) => {
      const content = response.content;
      if (!content) return;

      const jsonContent = content['application/json'];
      if (!jsonContent?.schema) return;

      const schema = this.resolveSchema(jsonContent.schema, api);
      const properties = this.extractSchemaProperties(schema, api);

      // Check if this is a paginated response
      const isPaginated = this.isPaginatedSchema(schema);
      
      if (isPaginated) {
        // Create both the main response model and the record model
        models.push({
          sNo: 0,
          modelName: `${pascalCase(operation.operationId)}OutData`,
          properties: JSON.stringify(properties.properties),
          required: properties.required.length > 0 ? JSON.stringify(properties.required) : undefined,
          description: `Response model for ${operation.operationId} operation`,
          usedInOperations: operation.operationId,
        });

        // Extract record model if it's a paginated response
        const recordSchema = this.extractRecordSchema(schema, api);
        if (recordSchema) {
          const recordProperties = this.extractSchemaProperties(recordSchema, api);
          models.push({
            sNo: 0,
            modelName: `${pascalCase(operation.operationId)}RecordData`,
            properties: JSON.stringify(recordProperties.properties),
            required: recordProperties.required.length > 0 ? JSON.stringify(recordProperties.required) : undefined,
            description: `Record model for ${operation.operationId} paginated response`,
            usedInOperations: operation.operationId,
          });
        }
      } else {
        models.push({
          sNo: 0,
          modelName: `${pascalCase(operation.operationId)}OutData`,
          properties: JSON.stringify(properties.properties),
          required: properties.required.length > 0 ? JSON.stringify(properties.required) : undefined,
          description: `Response model for ${operation.operationId} operation`,
          usedInOperations: operation.operationId,
        });
      }
    });

    return models;
  }

  private extractStandaloneModels(
    api: SwaggerSpec,
    seenModels: Set<string>
  ): ModelDocumentation[] {
    const models: ModelDocumentation[] = [];
    const schemas = api.components?.schemas || api.definitions || {};

    Object.entries(schemas).forEach(([name, schema]) => {
      const modelName = `${pascalCase(name)}Data`;
      if (seenModels.has(modelName)) return;

      const properties = this.extractSchemaProperties(schema, api);

      models.push({
        sNo: 0, // Will be assigned later
        modelName,
        properties: JSON.stringify(properties.properties),
        required: properties.required.length > 0 ? JSON.stringify(properties.required) : undefined,
        description: schema.description || `${name} entity model`,
        usedInOperations: undefined,
      });

      seenModels.add(modelName);
    });

    return models;
  }

  private extractSchemaProperties(
    schema: SwaggerSchema,
    api: SwaggerSpec
  ): { properties: Record<string, any>; required: string[] } {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    if (schema.properties) {
      Object.entries(schema.properties).forEach(([propName, propSchema]) => {
        properties[propName] = this.convertSchemaToProperty(propSchema, api);
      });
    }

    if (schema.required) {
      required.push(...schema.required);
    }

    // Handle allOf, oneOf, anyOf
    if (schema.allOf) {
      schema.allOf.forEach(subSchema => {
        const resolved = this.resolveSchema(subSchema, api);
        const subProps = this.extractSchemaProperties(resolved, api);
        Object.assign(properties, subProps.properties);
        required.push(...subProps.required);
      });
    }

    return { properties, required: [...new Set(required)] };
  }

  private convertSchemaToProperty(schema: SwaggerSchema, api: SwaggerSpec): any {
    const resolved = this.resolveSchema(schema, api);

    if (resolved.type === 'array') {
      return {
        type: 'array',
        items: resolved.items ? this.convertSchemaToProperty(resolved.items, api) : { type: 'any' },
        description: resolved.description,
      };
    }

    if (resolved.type === 'object') {
      const subProps = this.extractSchemaProperties(resolved, api);
      return {
        type: 'object',
        properties: subProps.properties,
        required: subProps.required,
        description: resolved.description,
      };
    }

    return {
      type: this.mapSwaggerTypeToTypeScript(resolved.type || 'any', resolved.format),
      description: resolved.description,
      enum: resolved.enum,
      example: resolved.example,
    };
  }

  private resolveSchema(schema: SwaggerSchema, api: SwaggerSpec): SwaggerSchema {
    if (schema.$ref) {
      const refPath = schema.$ref.replace('#/', '').split('/');
      let resolved: any = api;
      
      for (const segment of refPath) {
        resolved = resolved[segment];
        if (!resolved) break;
      }
      
      return resolved || schema;
    }
    
    return schema;
  }

  private mapSwaggerTypeToTypeScript(type: string, format?: string): string {
    switch (type) {
      case 'integer':
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'string':
        if (format === 'date' || format === 'date-time') return 'Date';
        return 'string';
      case 'array':
        return 'array';
      case 'object':
        return 'object';
      default:
        return 'any';
    }
  }

  private getParameterType(param: any): string {
    if (param.schema) {
      return this.mapSwaggerTypeToTypeScript(param.schema.type, param.schema.format);
    }
    // OpenAPI 2.0 style
    return this.mapSwaggerTypeToTypeScript(param.type, param.format);
  }

  private generateOperationId(method: string, path: string): string {
    const cleanPath = path
      .replace(/{[^}]+}/g, 'By')
      .replace(/[^a-zA-Z0-9]/g, '')
      .replace(/By$/, 'ById');
    
    return camelCase(`${method}_${cleanPath}`);
  }

  private hasQueryParams(operation: SwaggerOperation): boolean {
    return operation.parameters?.some(p => p.in === 'query') || false;
  }

  private hasResponseBody(operation: SwaggerOperation): boolean {
    return Object.values(operation.responses).some(response => 
      response.content?.['application/json']?.schema || response.schema
    );
  }

  private detectPagination(operation: SwaggerOperation): boolean {
    // Look for pagination indicators in parameters
    const hasPageParams = operation.parameters?.some(p => 
      ['page', 'offset', 'limit', 'size', 'pageSize', 'pageNumber'].includes(p.name.toLowerCase())
    );

    // Look for pagination in response schema
    const responses = Object.values(operation.responses);
    const hasPaginatedResponse = responses.some(response => {
      const schema = response.content?.['application/json']?.schema || response.schema;
      return this.isPaginatedSchema(schema);
    });

    return hasPageParams || hasPaginatedResponse;
  }

  private isPaginatedSchema(schema?: SwaggerSchema): boolean {
    if (!schema || !schema.properties) return false;

    const paginationFields = ['totalCount', 'totalPages', 'page', 'pageSize', 'hasNext', 'hasPrevious'];
    const schemaFields = Object.keys(schema.properties).map(f => f.toLowerCase());
    
    return paginationFields.some(field => schemaFields.includes(field.toLowerCase()));
  }

  private extractRecordSchema(schema: SwaggerSchema, api: SwaggerSpec): SwaggerSchema | null {
    const resolved = this.resolveSchema(schema, api);
    
    // Look for data/records/items array
    if (resolved.properties) {
      const dataProps = ['data', 'records', 'items', 'results'];
      for (const prop of dataProps) {
        const property = resolved.properties[prop];
        if (property?.type === 'array' && property.items) {
          return this.resolveSchema(property.items, api);
        }
      }
    }

    return null;
  }

  private detectAuthentication(operation: SwaggerOperation): boolean {
    return !!(operation.security && operation.security.length > 0);
  }

  private generateBusinessPurpose(
    operation: SwaggerOperation,
    tag: string,
    method: string,
    path: string
  ): string {
    if (operation.description) {
      return operation.description;
    }

    if (operation.summary) {
      return `${operation.summary} - Used for ${tag} management in the application`;
    }

    // Generate based on method and path
    const entity = tag.replace(/s$/, ''); // Remove plural 's'
    const action = this.getActionFromMethod(method);
    
    return `${action} ${entity} data for ${tag} management functionality`;
  }

  private getActionFromMethod(method: string): string {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'Retrieve';
      case 'POST':
        return 'Create';
      case 'PUT':
        return 'Update';
      case 'PATCH':
        return 'Modify';
      case 'DELETE':
        return 'Remove';
      default:
        return 'Process';
    }
  }

  private isValidHttpMethod(method: string): method is HttpMethod {
    return ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
  }

  private async generateApisSpreadsheet(apis: ApiDocumentation[], filePath: string): Promise<void> {
    try {
      const worksheet = XLSX.utils.json_to_sheet(apis);
      
      // Set column widths
      worksheet['!cols'] = [
        { wch: 5 },  // sNo
        { wch: 30 }, // endpoint
        { wch: 8 },  // method
        { wch: 15 }, // tag
        { wch: 25 }, // operationId
        { wch: 40 }, // summary
        { wch: 25 }, // pathParams
        { wch: 25 }, // queryParamsRef
        { wch: 25 }, // requestBodyRef
        { wch: 25 }, // responseBodyRef
        { wch: 12 }, // isPaginated
        { wch: 12 }, // requiresAuth
        { wch: 50 }, // businessPurpose
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'APIs');
      
      XLSX.writeFile(workbook, filePath);
      logger.info(`APIs spreadsheet saved to: ${filePath}`);
    } catch (error) {
      throw new FileOperationError(`Failed to generate APIs spreadsheet: ${filePath}`, error);
    }
  }

  private async generateModelsSpreadsheet(models: ModelDocumentation[], filePath: string): Promise<void> {
    try {
      const worksheet = XLSX.utils.json_to_sheet(models);
      
      // Set column widths
      worksheet['!cols'] = [
        { wch: 5 },  // sNo
        { wch: 30 }, // modelName
        { wch: 50 }, // properties
        { wch: 20 }, // required
        { wch: 40 }, // description
        { wch: 30 }, // usedInOperations
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Models');
      
      XLSX.writeFile(workbook, filePath);
      logger.info(`Models spreadsheet saved to: ${filePath}`);
    } catch (error) {
      throw new FileOperationError(`Failed to generate Models spreadsheet: ${filePath}`, error);
    }
  }
}