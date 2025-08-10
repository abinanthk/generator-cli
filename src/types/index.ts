import { z } from 'zod';

// Configuration Schema
export const ConfigSchema = z.object({
  outputDir: z.string().default('./output'),
  templateDir: z.string().default('./templates'),
  documentsDir: z.string().default('./documents'),
  namingConvention: z.enum(['kebab-case', 'camelCase', 'PascalCase']).default('kebab-case'),
  generateTypes: z.boolean().default(true),
  generateServices: z.boolean().default(true),
  generateQueries: z.boolean().default(true),
  generateConstants: z.boolean().default(true),
});

export type Config = z.infer<typeof ConfigSchema>;

// API Documentation Schema
export const ApiDocumentationSchema = z.object({
  sNo: z.number(),
  endpoint: z.string(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  tag: z.string(),
  operationId: z.string(),
  summary: z.string(),
  pathParams: z.string().optional(), // JSON string
  queryParamsRef: z.string().optional(),
  requestBodyRef: z.string().optional(),
  responseBodyRef: z.string().optional(),
  isPaginated: z.boolean().default(false),
  requiresAuth: z.boolean().default(false),
  businessPurpose: z.string().optional(),
});

export type ApiDocumentation = z.infer<typeof ApiDocumentationSchema>;

// Model Documentation Schema
export const ModelDocumentationSchema = z.object({
  sNo: z.number(),
  modelName: z.string(),
  properties: z.string(), // JSON string
  required: z.string().optional(), // JSON array as string
  description: z.string().optional(),
  usedInOperations: z.string().optional(), // Comma-separated operation IDs
});

export type ModelDocumentation = z.infer<typeof ModelDocumentationSchema>;

// Swagger/OpenAPI Types
export interface SwaggerSpec {
  openapi?: string;
  swagger?: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, Record<string, SwaggerOperation>>;
  components?: {
    schemas?: Record<string, SwaggerSchema>;
    parameters?: Record<string, SwaggerParameter>;
    responses?: Record<string, SwaggerResponse>;
  };
  definitions?: Record<string, SwaggerSchema>; // OpenAPI 2.0
  parameters?: Record<string, SwaggerParameter>; // OpenAPI 2.0
}

export interface SwaggerOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: SwaggerParameter[];
  requestBody?: SwaggerRequestBody;
  responses: Record<string, SwaggerResponse>;
  security?: Array<Record<string, string[]>>;
}

export interface SwaggerSchema {
  type?: string;
  format?: string;
  properties?: Record<string, SwaggerSchema>;
  required?: string[];
  items?: SwaggerSchema;
  allOf?: SwaggerSchema[];
  oneOf?: SwaggerSchema[];
  anyOf?: SwaggerSchema[];
  $ref?: string;
  enum?: any[];
  description?: string;
  example?: any;
  default?: any;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  additionalProperties?: boolean | SwaggerSchema;
}

export interface SwaggerParameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  required?: boolean;
  schema?: SwaggerSchema;
  type?: string; // OpenAPI 2.0
  format?: string; // OpenAPI 2.0
  description?: string;
  example?: any;
}

export interface SwaggerRequestBody {
  required?: boolean;
  content: Record<string, {
    schema: SwaggerSchema;
    examples?: Record<string, any>;
  }>;
  description?: string;
}

export interface SwaggerResponse {
  description: string;
  content?: Record<string, {
    schema: SwaggerSchema;
    examples?: Record<string, any>;
  }>;
  headers?: Record<string, SwaggerParameter>;
  schema?: SwaggerSchema; // OpenAPI 2.0
}

// Template Context Types
export interface TemplateContext {
  apis?: ApiDocumentation[];
  models?: ModelDocumentation[];
  tag?: string;
  operations?: OperationContext[];
  constants?: ConstantContext[];
  config: Config;
}

export interface OperationContext {
  operationId: string;
  method: string;
  endpoint: string;
  summary: string;
  tag: string;
  pathParams?: Record<string, any>;
  queryParamsRef?: string;
  requestBodyRef?: string;
  responseBodyRef?: string;
  isPaginated: boolean;
  requiresAuth: boolean;
  businessPurpose?: string;
  kebabCaseName: string;
  camelCaseName: string;
  pascalCaseName: string;
}

export interface ConstantContext {
  tag: string;
  endpoints: Array<{
    name: string;
    path: string;
    method: string;
  }>;
}

// Analysis Types
export interface DocumentationAnalysis {
  apiCount: number;
  modelCount: number;
  tagCount: number;
  coverage: number;
  issues: string[];
}

// Code Generation Types
export interface GeneratedFile {
  path: string;
  content: string;
  type: 'constant' | 'model' | 'service' | 'query';
}

// Template Types
export interface TemplateInfo {
  name: string;
  type: 'constants' | 'models' | 'services' | 'queries';
  description: string;
  path: string;
}

// Utility Types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface PathParameter {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface QueryParameter {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  enum?: string[];
}

// Error Types
export class CLIError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'CLIError';
  }
}

export class SwaggerParseError extends CLIError {
  constructor(message: string, details?: any) {
    super(message, 'SWAGGER_PARSE_ERROR', details);
  }
}

export class FileOperationError extends CLIError {
  constructor(message: string, details?: any) {
    super(message, 'FILE_OPERATION_ERROR', details);
  }
}

export class ValidationError extends CLIError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

export class TemplateError extends CLIError {
  constructor(message: string, details?: any) {
    super(message, 'TEMPLATE_ERROR', details);
  }
}