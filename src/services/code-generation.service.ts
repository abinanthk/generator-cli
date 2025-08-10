import { join } from "path";
import { ensureDir } from "fs-extra";
import { kebabCase, camelCase, pascalCase } from "change-case";
import {
  ApiDocumentation,
  ModelDocumentation,
  OperationContext,
  ConstantContext,
  GeneratedFile,
  TemplateContext,
  Config,
} from "../types";
import {
  ExcelUtil,
  FileUtil,
  NamingUtil,
  TemplateUtil,
  logger,
} from "../utils";
import { ConfigurationService } from "./configuration.service";
import { TemplateService } from "./template.service";

export class CodeGenerationService {
  private configService = new ConfigurationService();
  private templateService = new TemplateService();

  async generateAll(
    apisPath: string,
    modelsPath: string,
    outputDir?: string
  ): Promise<void> {
    const config = await this.configService.getConfig();

    // Read data from Excel files
    const apis = await ExcelUtil.readApisFromExcel(apisPath);
    const models = await ExcelUtil.readModelsFromExcel(modelsPath);
    const _outputDir = outputDir ?? config.outputDir;

    logger.info(
      `Loaded ${apis.length} API endpoints and ${models.length} models`
    );

    // Generate all components
    if (config.generateConstants) {
      await this.generateConstants(apisPath, _outputDir);
    }

    if (config.generateTypes) {
      await this.generateModels(modelsPath, _outputDir);
    }

    if (config.generateServices) {
      await this.generateServices(apisPath, _outputDir);
    }

    if (config.generateQueries) {
      await this.generateQueries(apisPath, _outputDir);
    }

    // Generate index files
    await this.generateIndexFiles(_outputDir, apis, models);

    logger.info("All code generation completed successfully!");
  }

  async generateConstants(
    apisPath: string,
    outputDir: string,
    tagFilter?: string
  ): Promise<void> {
    const apis = await ExcelUtil.readApisFromExcel(apisPath);
    const config = await this.configService.getConfig();

    const constantsDir = join(outputDir, "constants");
    await ensureDir(constantsDir);

    // Group APIs by tag
    const apisByTag = this.groupApisByTag(apis);
    const tags = tagFilter ? [tagFilter] : Object.keys(apisByTag);

    const generatedFiles: GeneratedFile[] = [];

    for (const tag of tags) {
      const tagApis = apisByTag[tag] || [];
      if (tagApis.length === 0) continue;

      const constantContext: ConstantContext = {
        tag,
        endpoints: tagApis.map((api) => ({
          name: camelCase(api.operationId),
          path: api.endpoint,
          method: api.method,
        })),
      };

      const templateContext: TemplateContext = {
        apis: tagApis,
        tag,
        constants: [constantContext],
        config,
      };

      const content = await this.templateService.renderTemplate(
        "constants",
        templateContext
      );
      const filename = NamingUtil.generateConstantFilename(tag);
      const filePath = join(constantsDir, filename);

      await FileUtil.writeTextFile(filePath, content);

      generatedFiles.push({
        path: filePath,
        content,
        type: "constant",
      });

      logger.info(`Generated constants for tag: ${tag}`);
    }

    // Generate constants index file
    await this.generateConstantsIndex(constantsDir, tags);
  }

  async generateModels(
    modelsPath: string,
    outputDir: string,
    tagFilter?: string
  ): Promise<void> {
    const models = await ExcelUtil.readModelsFromExcel(modelsPath);
    const config = await this.configService.getConfig();

    const modelsDir = join(outputDir, "models");
    await ensureDir(modelsDir);

    // Group models by tag (extracted from usedInOperations or model name)
    const modelsByTag = this.groupModelsByTag(models);
    const tags = tagFilter ? [tagFilter] : Object.keys(modelsByTag);

    const generatedFiles: GeneratedFile[] = [];

    for (const tag of tags) {
      const tagModels = modelsByTag[tag] || [];
      if (tagModels.length === 0) continue;

      const tagDir = join(modelsDir, kebabCase(tag));
      await ensureDir(tagDir);

      // Generate individual model files
      for (const model of tagModels) {
        const templateContext: TemplateContext = {
          models: [model],
          tag,
          config,
        };

        const content = await this.templateService.renderTemplate(
          "models",
          templateContext
        );
        const filename = NamingUtil.generateModelFilename(model.modelName);
        const filePath = join(tagDir, filename);

        await FileUtil.writeTextFile(filePath, content);

        generatedFiles.push({
          path: filePath,
          content,
          type: "model",
        });
      }

      // Generate tag index file
      await this.generateTagModelIndex(tagDir, tagModels);
      logger.info(`Generated ${tagModels.length} models for tag: ${tag}`);
    }

    // Generate models index file
    await this.generateModelsIndex(modelsDir, tags);
  }

  async generateServices(
    apisPath: string,
    outputDir: string,
    tagFilter?: string
  ): Promise<void> {
    const apis = await ExcelUtil.readApisFromExcel(apisPath);
    const config = await this.configService.getConfig();

    const servicesDir = join(outputDir, "services");
    await ensureDir(servicesDir);

    // Group APIs by tag
    const apisByTag = this.groupApisByTag(apis);
    const tags = tagFilter ? [tagFilter] : Object.keys(apisByTag);

    const generatedFiles: GeneratedFile[] = [];

    for (const tag of tags) {
      const tagApis = apisByTag[tag] || [];
      if (tagApis.length === 0) continue;

      const operations = tagApis.map((api) => this.createOperationContext(api));

      const templateContext: TemplateContext = {
        apis: tagApis,
        operations,
        tag,
        config,
      };

      const content = await this.templateService.renderTemplate(
        "services",
        templateContext
      );
      const filename = NamingUtil.generateServiceFilename(tag);
      const filePath = join(servicesDir, filename);

      await FileUtil.writeTextFile(filePath, content);

      generatedFiles.push({
        path: filePath,
        content,
        type: "service",
      });

      logger.info(
        `Generated service for tag: ${tag} (${tagApis.length} operations)`
      );
    }

    // Generate services index file
    await this.generateServicesIndex(servicesDir, tags);
  }

  async generateQueries(
    apisPath: string,
    outputDir: string,
    tagFilter?: string
  ): Promise<void> {
    const apis = await ExcelUtil.readApisFromExcel(apisPath);
    const config = await this.configService.getConfig();

    const queriesDir = join(outputDir, "queries");
    await ensureDir(queriesDir);

    // Group APIs by tag
    const apisByTag = this.groupApisByTag(apis);
    const tags = tagFilter ? [tagFilter] : Object.keys(apisByTag);

    const generatedFiles: GeneratedFile[] = [];

    for (const tag of tags) {
      const tagApis = apisByTag[tag] || [];
      if (tagApis.length === 0) continue;

      const tagDir = join(queriesDir, kebabCase(tag));
      await ensureDir(tagDir);

      // Generate individual query/mutation files
      for (const api of tagApis) {
        const operation = this.createOperationContext(api);
        const isQuery =
          ["GET"].includes(api.method) || ["get"].includes(api.method);
        const isMutation =
          ["POST", "PUT", "PATCH", "DELETE"].includes(api.method) ||
          ["post", "put", "patch", "delete"].includes(api.method);

        if (isQuery) {
          const templateContext: TemplateContext = {
            apis: [api],
            operations: [operation],
            tag,
            config,
          };

          const content = await this.templateService.renderTemplate(
            "queries",
            templateContext
          );
          const filename = NamingUtil.generateQueryFilename(
            api.operationId,
            "query"
          );
          const filePath = join(tagDir, filename);

          await FileUtil.writeTextFile(filePath, content);

          generatedFiles.push({
            path: filePath,
            content,
            type: "query",
          });
        }

        if (isMutation) {
          const templateContext: TemplateContext = {
            apis: [api],
            operations: [operation],
            tag,
            config,
          };

          const content = await this.templateService.renderTemplate(
            "mutations",
            templateContext
          );
          const filename = NamingUtil.generateQueryFilename(
            api.operationId,
            "mutation"
          );
          const filePath = join(tagDir, filename);

          await FileUtil.writeTextFile(filePath, content);

          generatedFiles.push({
            path: filePath,
            content,
            type: "query",
          });
        }
      }

      // Generate tag queries index file
      await this.generateTagQueriesIndex(tagDir, tagApis);
      logger.info(
        `Generated queries for tag: ${tag} (${tagApis.length} operations)`
      );
    }

    // Generate queries index file
    await this.generateQueriesIndex(queriesDir, tags);
  }

  private groupApisByTag(
    apis: ApiDocumentation[]
  ): Record<string, ApiDocumentation[]> {
    return apis.reduce(
      (acc, api) => {
        const tag = api.tag || "default";
        if (!acc[tag]) acc[tag] = [];
        acc[tag].push(api);
        return acc;
      },
      {} as Record<string, ApiDocumentation[]>
    );
  }

  private groupModelsByTag(
    models: ModelDocumentation[]
  ): Record<string, ModelDocumentation[]> {
    return models.reduce(
      (acc, model) => {
        // Extract tag from model name or usedInOperations
        let tag = "default";

        if (model.usedInOperations) {
          // Try to extract tag from operation context
          // This is a simplified approach - in real scenarios, you might need to cross-reference with APIs
          const firstOperation = model.usedInOperations.split(",")[0];
          // Extract potential tag from operation name pattern
          const match = firstOperation.match(
            /^(get|post|put|patch|delete)([A-Z][a-z]+)/i
          );
          if (match) {
            tag = match[2].toLowerCase();
          }
        } else {
          // Extract tag from model name
          const match = model.modelName.match(/^([A-Z][a-z]+)/);
          if (match) {
            tag = match[1].toLowerCase();
          }
        }

        if (!acc[tag]) acc[tag] = [];
        acc[tag].push(model);
        return acc;
      },
      {} as Record<string, ModelDocumentation[]>
    );
  }

  private createOperationContext(api: ApiDocumentation): OperationContext {
    return {
      operationId: api.operationId,
      method: api.method,
      endpoint: api.endpoint,
      summary: api.summary,
      tag: api.tag,
      pathParams: api.pathParams ? JSON.parse(api.pathParams) : undefined,
      queryParamsRef: api.queryParamsRef,
      requestBodyRef: api.requestBodyRef,
      responseBodyRef: api.responseBodyRef,
      isPaginated: api.isPaginated,
      requiresAuth: api.requiresAuth,
      businessPurpose: api.businessPurpose,
      kebabCaseName: kebabCase(api.operationId),
      camelCaseName: camelCase(api.operationId),
      pascalCaseName: pascalCase(api.operationId),
    };
  }

  private async generateIndexFiles(
    outputDir: string,
    apis: ApiDocumentation[],
    models: ModelDocumentation[]
  ): Promise<void> {
    // Generate main index file
    const mainIndexContent = `// Auto-generated index file
// Export all constants
export * from './constants';

// Export all models
export * from './models';

// Export all services
export * from './services';

// Export all queries
export * from './queries';
`;

    await FileUtil.writeTextFile(join(outputDir, "index.ts"), mainIndexContent);
    logger.info("Generated main index file");
  }

  private async generateConstantsIndex(
    constantsDir: string,
    tags: string[]
  ): Promise<void> {
    const exports = tags
      .map((tag) => `export * from './${kebabCase(tag)}.constant';`)
      .join("\n");

    const content = `// Auto-generated constants index
${exports}
`;

    await FileUtil.writeTextFile(join(constantsDir, "index.ts"), content);
  }

  private async generateModelsIndex(
    modelsDir: string,
    tags: string[]
  ): Promise<void> {
    const exports = tags
      .map((tag) => `export * from './${kebabCase(tag)}';`)
      .join("\n");

    const content = `// Auto-generated models index
${exports}
`;

    await FileUtil.writeTextFile(join(modelsDir, "index.ts"), content);
  }

  private async generateTagModelIndex(
    tagDir: string,
    models: ModelDocumentation[]
  ): Promise<void> {
    const exports = models
      .map((model) => `export * from './${kebabCase(model.modelName)}.model';`)
      .join("\n");

    const content = `// Auto-generated tag models index
${exports}
`;

    await FileUtil.writeTextFile(join(tagDir, "index.ts"), content);
  }

  private async generateServicesIndex(
    servicesDir: string,
    tags: string[]
  ): Promise<void> {
    const exports = tags
      .map((tag) => `export * from './${kebabCase(tag)}.service';`)
      .join("\n");

    const content = `// Auto-generated services index
${exports}
`;

    await FileUtil.writeTextFile(join(servicesDir, "index.ts"), content);
  }

  private async generateQueriesIndex(
    queriesDir: string,
    tags: string[]
  ): Promise<void> {
    const exports = tags
      .map((tag) => `export * from './${kebabCase(tag)}';`)
      .join("\n");

    const content = `// Auto-generated queries index
${exports}
`;

    await FileUtil.writeTextFile(join(queriesDir, "index.ts"), content);
  }

  private async generateTagQueriesIndex(
    tagDir: string,
    apis: ApiDocumentation[]
  ): Promise<void> {
    const exports = apis
      .map((api) => {
        const kebabName = kebabCase(api.operationId);
        const isQuery = ["GET"].includes(api.method);
        const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(
          api.method
        );

        const lines = [];
        if (isQuery) {
          lines.push(`export * from './use-${kebabName}-query.query';`);
        }
        if (isMutation) {
          lines.push(`export * from './use-${kebabName}-mutation.query';`);
        }
        return lines.join("\n");
      })
      .filter(Boolean)
      .join("\n");

    const content = `// Auto-generated tag queries index
${exports}
`;

    await FileUtil.writeTextFile(join(tagDir, "index.ts"), content);
  }
}
