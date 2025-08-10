import SwaggerParser from "@apidevtools/swagger-parser";
import {
  SwaggerSpec,
  ApiDocumentation,
  ModelDocumentation,
  DocumentationAnalysis,
  SwaggerParseError,
  ValidationError,
} from "../types";
import { ExcelUtil, FileUtil, logger } from "../utils";

export class ValidationService {
  async validateSwaggerFile(filePath: string): Promise<SwaggerSpec> {
    try {
      logger.info(`Validating Swagger file: ${filePath}`);
      const api = (await SwaggerParser.validate(filePath)) as SwaggerSpec;
      logger.info("Swagger validation completed successfully");
      return api;
    } catch (error) {
      throw new SwaggerParseError(`Invalid Swagger file: ${filePath}`, error);
    }
  }

  async validateSwaggerUrl(url: string): Promise<SwaggerSpec> {
    try {
      logger.info(`Validating Swagger from URL: ${url}`);
      const api = (await SwaggerParser.validate(url)) as SwaggerSpec;
      logger.info("Swagger validation completed successfully");
      return api;
    } catch (error) {
      throw new SwaggerParseError(`Invalid Swagger URL: ${url}`, error);
    }
  }

  async analyzeDocumentation(
    apisPath: string,
    modelsPath: string
  ): Promise<DocumentationAnalysis> {
    try {
      const apis = await ExcelUtil.readApisFromExcel(apisPath);
      const models = await ExcelUtil.readModelsFromExcel(modelsPath);

      return this.performAnalysis(apis, models);
    } catch (error) {
      throw new ValidationError("Failed to analyze documentation", error);
    }
  }

  private performAnalysis(
    apis: ApiDocumentation[],
    models: ModelDocumentation[]
  ): DocumentationAnalysis {
    const issues: string[] = [];

    // Count basic metrics
    const apiCount = apis.length;
    const modelCount = models.length;
    const tags = new Set(apis.map((api) => api.tag)).size;

    // Analyze API completeness
    let completeApis = 0;

    apis.forEach((api, index) => {
      const apiIssues = this.validateApiDocumentation(api, index + 1);
      issues.push(...apiIssues);

      if (apiIssues.length === 0) {
        completeApis++;
      }
    });

    // Analyze model completeness
    models.forEach((model, index) => {
      const modelIssues = this.validateModelDocumentation(model, index + 1);
      issues.push(...modelIssues);
    });

    // Cross-reference validation
    const crossRefIssues = this.validateCrossReferences(apis, models);
    issues.push(...crossRefIssues);

    // Calculate coverage
    const coverage = apiCount > 0 ? (completeApis / apiCount) * 100 : 0;

    return {
      apiCount,
      modelCount,
      tagCount: tags,
      coverage,
      issues: [...new Set(issues)], // Remove duplicates
    };
  }

  private validateApiDocumentation(
    api: ApiDocumentation,
    lineNumber: number
  ): string[] {
    const issues: string[] = [];
    const prefix = `API #${lineNumber} (${api.operationId})`;

    // Required fields validation
    if (!api.endpoint) {
      issues.push(`${prefix}: Missing endpoint`);
    }

    if (!api.method) {
      issues.push(`${prefix}: Missing HTTP method`);
    }

    if (!api.operationId) {
      issues.push(`${prefix}: Missing operationId`);
    }

    if (!api.summary) {
      issues.push(`${prefix}: Missing summary`);
    }

    if (!api.tag) {
      issues.push(`${prefix}: Missing tag`);
    }

    // Business context validation
    if (!api.businessPurpose) {
      issues.push(
        `${prefix}: Missing business purpose - AI context will be limited`
      );
    }

    // Endpoint format validation
    if (api.endpoint && !api.endpoint.startsWith("/")) {
      issues.push(`${prefix}: Endpoint should start with '/'`);
    }

    // HTTP method validation
    const validMethods = ["GET", "POST", "PUT", "PATCH", "DELETE"];
    if (api.method && !validMethods.includes(api.method)) {
      issues.push(`${prefix}: Invalid HTTP method '${api.method}'`);
    }

    // Path parameters validation
    if (api.pathParams) {
      try {
        const pathParams = JSON.parse(api.pathParams);
        if (typeof pathParams !== "object") {
          issues.push(`${prefix}: pathParams must be a JSON object`);
        }
      } catch {
        issues.push(`${prefix}: Invalid JSON in pathParams`);
      }
    }

    // Check for path parameters in endpoint but missing pathParams
    const hasPathParams =
      api.endpoint?.includes("{") && api.endpoint?.includes("}");
    if (hasPathParams && !api.pathParams) {
      issues.push(
        `${prefix}: Endpoint has path parameters but pathParams field is empty`
      );
    }

    // Pagination validation
    if (api.isPaginated && api.method !== "GET") {
      issues.push(
        `${prefix}: Only GET operations should be marked as paginated`
      );
    }

    return issues;
  }

  private validateModelDocumentation(
    model: ModelDocumentation,
    lineNumber: number
  ): string[] {
    const issues: string[] = [];
    const prefix = `Model #${lineNumber} (${model.modelName})`;

    // Required fields validation
    if (!model.modelName) {
      issues.push(`${prefix}: Missing model name`);
    }

    if (!model.properties) {
      issues.push(`${prefix}: Missing properties`);
    }

    // Model naming convention validation
    if (model.modelName && !model.modelName.match(/^[A-Z][a-zA-Z0-9]*Data$/)) {
      issues.push(
        `${prefix}: Model name should follow PascalCase and end with 'Data'`
      );
    }

    // Properties JSON validation
    if (model.properties) {
      try {
        const properties = JSON.parse(model.properties);
        if (typeof properties !== "object" || Array.isArray(properties)) {
          issues.push(`${prefix}: properties must be a JSON object`);
        } else {
          // Validate individual properties
          Object.entries(properties).forEach(
            ([propName, propDef]: [string, any]) => {
              if (!propDef.type) {
                issues.push(`${prefix}: Property '${propName}' missing type`);
              }
            }
          );
        }
      } catch {
        issues.push(`${prefix}: Invalid JSON in properties`);
      }
    }

    // Required fields validation
    if (model.required) {
      try {
        const required = JSON.parse(model.required);
        if (!Array.isArray(required)) {
          issues.push(`${prefix}: required field must be a JSON array`);
        }
      } catch {
        issues.push(`${prefix}: Invalid JSON in required field`);
      }
    }

    // Description validation for AI context
    if (!model.description) {
      issues.push(
        `${prefix}: Missing description - AI context will be limited`
      );
    }

    return issues;
  }

  private validateCrossReferences(
    apis: ApiDocumentation[],
    models: ModelDocumentation[]
  ): string[] {
    const issues: string[] = [];
    const modelNames = new Set(models.map((m) => m.modelName));

    // Check if referenced models exist
    apis.forEach((api) => {
      if (api.queryParamsRef && !modelNames.has(api.queryParamsRef)) {
        issues.push(
          `API ${api.operationId}: Referenced query params model '${api.queryParamsRef}' not found`
        );
      }

      if (api.requestBodyRef && !modelNames.has(api.requestBodyRef)) {
        issues.push(
          `API ${api.operationId}: Referenced request body model '${api.requestBodyRef}' not found`
        );
      }

      if (api.responseBodyRef && !modelNames.has(api.responseBodyRef)) {
        issues.push(
          `API ${api.operationId}: Referenced response body model '${api.responseBodyRef}' not found`
        );
      }
    });

    // Check for unused models
    const usedModels = new Set<string>();
    apis.forEach((api) => {
      if (api.queryParamsRef) usedModels.add(api.queryParamsRef);
      if (api.requestBodyRef) usedModels.add(api.requestBodyRef);
      if (api.responseBodyRef) usedModels.add(api.responseBodyRef);
    });

    models.forEach((model) => {
      if (!usedModels.has(model.modelName) && !model.usedInOperations) {
        issues.push(
          `Model ${model.modelName}: Appears to be unused and has no usedInOperations reference`
        );
      }
    });

    // Validate operation ID uniqueness
    const operationIds = apis.map((api) => api.operationId).filter(Boolean);
    const duplicateIds = operationIds.filter(
      (id, index) => operationIds.indexOf(id) !== index
    );
    if (duplicateIds.length > 0) {
      issues.push(
        `Duplicate operation IDs found: ${[...new Set(duplicateIds)].join(", ")}`
      );
    }

    // Validate model name uniqueness
    const modelNamesList = models
      .map((model) => model.modelName)
      .filter(Boolean);
    const duplicateModels = modelNamesList.filter(
      (name, index) => modelNamesList.indexOf(name) !== index
    );
    if (duplicateModels.length > 0) {
      issues.push(
        `Duplicate model names found: ${[...new Set(duplicateModels)].join(", ")}`
      );
    }

    // Validate tag consistency
    const apiTags = [...new Set(apis.map((api) => api.tag))];
    const modelsWithOperations = models.filter((m) => m.usedInOperations);

    modelsWithOperations.forEach((model) => {
      if (model.usedInOperations) {
        const operations = model.usedInOperations
          .split(",")
          .map((op) => op.trim());
        operations.forEach((opId) => {
          const api = apis.find((a) => a.operationId === opId);
          if (!api) {
            issues.push(
              `Model ${model.modelName}: References unknown operation '${opId}'`
            );
          }
        });
      }
    });

    return issues;
  }

  async validateExcelFiles(
    apisPath: string,
    modelsPath: string
  ): Promise<void> {
    try {
      // Validate APIs file structure
      const apis = await ExcelUtil.readApisFromExcel(apisPath);
      if (apis.length === 0) {
        throw new ValidationError(
          "APIs file contains no data or has invalid structure"
        );
      }

      // Validate Models file structure
      const models = await ExcelUtil.readModelsFromExcel(modelsPath);
      if (models.length === 0) {
        throw new ValidationError(
          "Models file contains no data or has invalid structure"
        );
      }

      logger.info(`Validated ${apis.length} APIs and ${models.length} models`);
    } catch (error) {
      throw new ValidationError("Excel file validation failed", error);
    }
  }

  async generateValidationReport(
    apisPath: string,
    modelsPath: string,
    outputPath?: string
  ): Promise<DocumentationAnalysis> {
    const analysis = await this.analyzeDocumentation(apisPath, modelsPath);

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalAPIs: analysis.apiCount,
        totalModels: analysis.modelCount,
        totalTags: analysis.tagCount,
        completionPercentage: analysis.coverage,
      },
      issues: analysis.issues,
      recommendations: this.generateRecommendations(analysis),
    };

    if (outputPath) {
      await FileUtil.writeJsonFile(outputPath, report);
      logger.info(`Validation report saved to: ${outputPath}`);
    }

    return analysis;
  }

  private generateRecommendations(analysis: DocumentationAnalysis): string[] {
    const recommendations: string[] = [];

    if (analysis.coverage < 80) {
      recommendations.push(
        "Consider adding more detailed documentation to improve AI understanding"
      );
    }

    if (
      analysis.issues.some((issue) =>
        issue.includes("Missing business purpose")
      )
    ) {
      recommendations.push(
        "Add business purpose descriptions to enhance AI context and code generation quality"
      );
    }

    if (
      analysis.issues.some((issue) => issue.includes("Missing description"))
    ) {
      recommendations.push(
        "Add descriptions to models to improve AI-generated code documentation"
      );
    }

    if (analysis.issues.some((issue) => issue.includes("unused"))) {
      recommendations.push(
        "Review and remove unused models to keep codebase clean"
      );
    }

    if (analysis.issues.some((issue) => issue.includes("Duplicate"))) {
      recommendations.push(
        "Resolve duplicate names to avoid conflicts in generated code"
      );
    }

    return recommendations;
  }
}
