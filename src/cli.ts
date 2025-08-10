#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import {
  DocumentGenerationService,
  CodeGenerationService,
  ValidationService,
  ConfigurationService,
  TemplateService,
} from "./services";
import { createSpinner, logger } from "./utils";

const program = new Command();

program
  .name("generator-cli")
  .description(
    "CLI tool for generating API documentation spreadsheets and TypeScript code"
  )
  .version("1.0.0");

// Document Generation Commands
const generateCommand = program
  .command("generate")
  .description("Generate documentation and code");

generateCommand
  .command("documents")
  .description("Generate API documentation spreadsheets from Swagger")
  .option("--swagger-url <url>", "URL to fetch Swagger/OpenAPI specification")
  .option("--swagger-file <path>", "Path to local Swagger/OpenAPI file")
  .option(
    "--output <dir>",
    "Output directory for generated documents",
    "./documents"
  )
  .action(async (options) => {

    console.log( options);
    

    const spinner = createSpinner("Generating API documentation...");
    try {
      spinner.start();

      const documentService = new DocumentGenerationService();

      if (options.swaggerUrl) {
        await documentService.generateFromUrl(
          options.swaggerUrl,
          options.output
        );
      } else if (options.swaggerFile) {
        await documentService.generateFromFile(
          options.swaggerFile,
          options.output
        );
      } else {
        spinner.fail("Please provide either --swagger-url or --swagger-file");
        process.exit(1);
      }

      spinner.succeed("Documentation generated successfully!");
      logger.info(`Files created in: ${chalk.cyan(options.output)}`);
      logger.info(
        `  - ${chalk.green("apis.xlsx")} - API endpoints documentation`
      );
      logger.info(
        `  - ${chalk.green("models.xlsx")} - Schema and type definitions`
      );
    } catch (error) {
      spinner.fail("Failed to generate documentation");
      logger.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

generateCommand
  .command("all")
  .description("Generate all code components from documentation")
  .requiredOption("--apis <path>", "Path to APIs Excel file")
  .requiredOption("--models <path>", "Path to Models Excel file")
  .option("--output <dir>", "Output directory for generated code")
  .action(async (options) => {
    const spinner = createSpinner("Generating all code components...");
    try {
      spinner.start();

      const codeService = new CodeGenerationService();
      await codeService.generateAll(
        options.apis,
        options.models,
        options.output
      );

      spinner.succeed("All code components generated successfully!");
    } catch (error) {
      spinner.fail("Failed to generate code components");
      logger.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

generateCommand
  .command("constants")
  .description("Generate API constants")
  .requiredOption("--apis <path>", "Path to APIs Excel file")
  .option("--tag <tag>", "Generate constants for specific tag only")
  .option("--output <dir>", "Output directory")
  .action(async (options) => {
    const spinner = createSpinner("Generating constants...");
    try {
      spinner.start();

      const codeService = new CodeGenerationService();
      await codeService.generateConstants(
        options.apis,
        options.output,
        options.tag
      );

      spinner.succeed("Constants generated successfully!");
    } catch (error) {
      spinner.fail("Failed to generate constants");
      logger.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

generateCommand
  .command("models")
  .description("Generate TypeScript models")
  .requiredOption("--models <path>", "Path to Models Excel file")
  .option("--tag <tag>", "Generate models for specific tag only")
  .option("--output <dir>", "Output directory")
  .action(async (options) => {
    const spinner = createSpinner("Generating models...");
    try {
      spinner.start();

      const codeService = new CodeGenerationService();
      await codeService.generateModels(
        options.models,
        options.output,
        options.tag
      );

      spinner.succeed("Models generated successfully!");
    } catch (error) {
      spinner.fail("Failed to generate models");
      logger.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

generateCommand
  .command("services")
  .description("Generate API services")
  .requiredOption("--apis <path>", "Path to APIs Excel file")
  .option("--tag <tag>", "Generate services for specific tag only")
  .option("--output <dir>", "Output directory")
  .action(async (options) => {
    const spinner = createSpinner("Generating services...");
    try {
      spinner.start();

      const codeService = new CodeGenerationService();
      await codeService.generateServices(
        options.apis,
        options.output,
        options.tag
      );

      spinner.succeed("Services generated successfully!");
    } catch (error) {
      spinner.fail("Failed to generate services");
      logger.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

generateCommand
  .command("queries")
  .description("Generate React Query hooks")
  .requiredOption("--apis <path>", "Path to APIs Excel file")
  .option("--tag <tag>", "Generate queries for specific tag only")
  .option("--output <dir>", "Output directory")
  .action(async (options) => {
    const spinner = createSpinner("Generating React Query hooks...");
    try {
      spinner.start();

      const codeService = new CodeGenerationService();
      await codeService.generateQueries(
        options.apis,
        options.output,
        options.tag
      );

      spinner.succeed("React Query hooks generated successfully!");
    } catch (error) {
      spinner.fail("Failed to generate React Query hooks");
      logger.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Validation Commands
const validateCommand = program
  .command("validate")
  .description("Validate files and configurations");

validateCommand
  .command("swagger")
  .description("Validate Swagger/OpenAPI specification")
  .option("--swagger-file <path>", "Path to Swagger file")
  .option("--swagger-url <url>", "URL to Swagger specification")
  .action(async (options) => {
    const spinner = createSpinner("Validating Swagger specification...");
    try {
      spinner.start();

      const validationService = new ValidationService();

      if (options.swaggerFile) {
        await validationService.validateSwaggerFile(options.swaggerFile);
      } else if (options.swaggerUrl) {
        await validationService.validateSwaggerUrl(options.swaggerUrl);
      } else {
        spinner.fail("Please provide either --swagger-file or --swagger-url");
        process.exit(1);
      }

      spinner.succeed("Swagger specification is valid!");
    } catch (error) {
      spinner.fail("Swagger validation failed");
      logger.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Analysis Commands
const analyzeCommand = program
  .command("analyze")
  .description("Analyze generated documentation");

analyzeCommand
  .command("docs")
  .description("Analyze generated spreadsheets")
  .requiredOption("--apis <path>", "Path to APIs Excel file")
  .requiredOption("--models <path>", "Path to Models Excel file")
  .action(async (options) => {
    const spinner = createSpinner("Analyzing documentation...");
    try {
      spinner.start();

      const validationService = new ValidationService();
      const analysis = await validationService.analyzeDocumentation(
        options.apis,
        options.models
      );

      spinner.succeed("Analysis completed!");

      logger.info(chalk.bold("\n📊 Documentation Analysis:"));
      logger.info(
        `APIs: ${chalk.cyan(analysis.apiCount)} endpoints across ${chalk.cyan(analysis.tagCount)} tags`
      );
      logger.info(
        `Models: ${chalk.cyan(analysis.modelCount)} schema definitions`
      );
      logger.info(
        `Coverage: ${chalk.cyan(analysis.coverage.toFixed(1))}% of operations have complete documentation`
      );

      if (analysis.issues.length > 0) {
        logger.warn(chalk.yellow("\n⚠️  Issues found:"));
        analysis.issues.forEach((issue) => logger.warn(`  - ${issue}`));
      }
    } catch (error) {
      spinner.fail("Analysis failed");
      logger.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Template Commands
const templateCommand = program
  .command("template")
  .description("Manage code generation templates");

templateCommand
  .command("init")
  .description("Initialize template files")
  .requiredOption(
    "--type <type>",
    "Template type (constants, models, services, queries)"
  )
  .action(async (options) => {
    const spinner = createSpinner("Initializing templates...");
    try {
      spinner.start();

      const templateService = new TemplateService();
      await templateService.initializeTemplate(options.type);

      spinner.succeed(`${options.type} template initialized!`);
    } catch (error) {
      spinner.fail("Template initialization failed");
      logger.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

templateCommand
  .command("list")
  .description("List available templates")
  .action(async () => {
    try {
      const templateService = new TemplateService();
      const templates = await templateService.listTemplates();

      logger.info(chalk.bold("\n📋 Available Templates:"));
      templates.forEach((template) => {
        logger.info(
          `  ${chalk.green("✓")} ${template.name} - ${template.description}`
        );
      });
    } catch (error) {
      logger.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Configuration Commands
const configCommand = program
  .command("config")
  .description("Manage CLI configuration");

configCommand
  .command("init")
  .description("Initialize configuration")
  .option("--interactive", "Use interactive mode")
  .action(async (options) => {
    try {
      const configService = new ConfigurationService();

      if (options.interactive) {
        await configService.initializeInteractive();
      } else {
        await configService.initializeDefault();
      }

      logger.info(chalk.green("Configuration initialized successfully!"));
    } catch (error) {
      logger.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

configCommand
  .command("set")
  .description("Set configuration value")
  .argument("<key>", "Configuration key")
  .argument("<value>", "Configuration value")
  .action(async (key, value) => {
    try {
      const configService = new ConfigurationService();
      await configService.setConfig(key, value);

      logger.info(
        `Configuration updated: ${chalk.cyan(key)} = ${chalk.green(value)}`
      );
    } catch (error) {
      logger.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

configCommand
  .command("show")
  .description("Show current configuration")
  .action(async () => {
    try {
      const configService = new ConfigurationService();
      const config = await configService.getConfig();

      logger.info(chalk.bold("\n⚙️  Current Configuration:"));
      Object.entries(config).forEach(([key, value]) => {
        logger.info(`  ${chalk.cyan(key)}: ${chalk.green(String(value))}`);
      });
    } catch (error) {
      logger.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Error handling for unknown commands
program.on("command:*", () => {
  logger.error(`Unknown command: ${program.args.join(" ")}`);
  logger.info("Use --help to see available commands");
  process.exit(1);
});

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
