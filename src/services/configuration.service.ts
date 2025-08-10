import { cosmiconfigSync } from "cosmiconfig";
import { join } from "path";
import inquirer from "inquirer";
import { Config, ConfigSchema } from "../types";
import { FileUtil, logger } from "../utils";

export class ConfigurationService {
  private readonly configName = "generator-cli";
  private readonly explorer = cosmiconfigSync(this.configName);

  async getConfig(): Promise<Config> {
    const result = this.explorer.search();

    if (result) {
      logger.debug(`Configuration loaded from: ${result.filepath}`);
      return ConfigSchema.parse(result.config);
    }

    logger.debug("Using default configuration");
    return ConfigSchema.parse({});
  }

  async setConfig(key: string, value: string): Promise<void> {
    const currentConfig = await this.getConfig();
    const configPath = join(process.cwd(), ".generator-cli.json");

    // Parse value based on the key type
    const parsedValue = this.parseConfigValue(key, value);
    const updatedConfig = { ...currentConfig, [key]: parsedValue };

    // Validate the updated configuration
    const validatedConfig = ConfigSchema.parse(updatedConfig);

    await FileUtil.writeJsonFile(configPath, validatedConfig);
    logger.info(`Configuration updated: ${key} = ${value}`);
  }

  async initializeDefault(): Promise<void> {
    const defaultConfig = ConfigSchema.parse({});
    const configPath = join(process.cwd(), ".generator-cli.json");

    await FileUtil.writeJsonFile(configPath, defaultConfig);
    logger.info(`Default configuration created: ${configPath}`);
  }

  async initializeInteractive(): Promise<void> {
    const questions: any = [
      {
        type: "input",
        name: "outputDir",
        message: "Output directory for generated code:",
        default: "./output",
        validate: (input: string) =>
          input.length > 0 || "Output directory is required",
      },
      {
        type: "input",
        name: "templateDir",
        message: "Custom templates directory:",
        default: "./templates",
      },
      {
        type: "input",
        name: "documentsDir",
        message: "Documents directory:",
        default: "./documents",
      },
      {
        type: "list",
        name: "namingConvention",
        message: "Naming convention for generated files:",
        choices: [
          { name: "kebab-case", value: "kebab-case" },
          { name: "camelCase", value: "camelCase" },
          { name: "PascalCase", value: "PascalCase" },
        ],
        default: "kebab-case",
      },
      {
        type: "confirm",
        name: "generateTypes",
        message: "Generate TypeScript model interfaces?",
        default: true,
      },
      {
        type: "confirm",
        name: "generateServices",
        message: "Generate API service classes?",
        default: true,
      },
      {
        type: "confirm",
        name: "generateQueries",
        message: "Generate React Query hooks?",
        default: true,
      },
      {
        type: "confirm",
        name: "generateConstants",
        message: "Generate API endpoint constants?",
        default: true,
      },
    ];

    const answers = await inquirer.prompt(questions);
    const config = ConfigSchema.parse(answers);
    const configPath = join(process.cwd(), ".generator-cli.json");

    await FileUtil.writeJsonFile(configPath, config);
    logger.info(`Interactive configuration created: ${configPath}`);
  }

  private parseConfigValue(key: string, value: string): any {
    const configSchema = ConfigSchema.shape;
    const fieldSchema = configSchema[key as keyof typeof configSchema];

    if (!fieldSchema) {
      throw new Error(`Unknown configuration key: ${key}`);
    }

    // Handle different types
    if (
      key === "generateTypes" ||
      key === "generateServices" ||
      key === "generateQueries" ||
      key === "generateConstants"
    ) {
      return value.toLowerCase() === "true";
    }

    if (key === "namingConvention") {
      const validValues = ["kebab-case", "camelCase", "PascalCase"];
      if (!validValues.includes(value)) {
        throw new Error(
          `Invalid naming convention. Must be one of: ${validValues.join(", ")}`
        );
      }
    }

    return value;
  }
}
