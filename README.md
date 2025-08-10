# Generator CLI Documentation

A powerful CLI tool for generating API documentation spreadsheets and TypeScript code from Swagger/OpenAPI specifications.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Commands](#commands)
  - [Generate Commands](#generate-commands)
  - [Validation Commands](#validation-commands)
  - [Analysis Commands](#analysis-commands)
  - [Template Commands](#template-commands)
  - [Configuration Commands](#configuration-commands)
- [Workflows](#workflows)
- [Examples](#examples)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

## Installation

```bash
npm install -g generator-cli
```

Or run directly with npx:
```bash
npx generator-cli --help
```

## Quick Start

1. **Generate documentation from Swagger**:
   ```bash
   generator-cli generate documents --swagger-url https://api.example.com/swagger.json
   ```

2. **Generate all TypeScript code**:
   ```bash
   generator-cli generate all --apis ./documents/apis.xlsx --models ./documents/models.xlsx
   ```

3. **Validate your Swagger specification**:
   ```bash
   generator-cli validate swagger --swagger-url https://api.example.com/swagger.json
   ```

## Commands

### Generate Commands

The `generate` command group creates documentation and code from Swagger specifications.

#### `generate documents`

Generate API documentation spreadsheets from Swagger/OpenAPI specifications.

```bash
generator-cli generate documents [options]
```

**Options:**
- `--swagger-url <url>` - URL to fetch Swagger/OpenAPI specification
- `--swagger-file <path>` - Path to local Swagger/OpenAPI file
- `--output <dir>` - Output directory for generated documents (default: `./documents`)

**Output:**
- `apis.xlsx` - API endpoints documentation
- `models.xlsx` - Schema and type definitions

**Example:**
```bash
# From URL
generator-cli generate documents --swagger-url https://petstore.swagger.io/v2/swagger.json

# From local file
generator-cli generate documents --swagger-file ./swagger.json --output ./docs
```

#### `generate all`

Generate all TypeScript code components from documentation spreadsheets.

```bash
generator-cli generate all --apis <path> --models <path> [options]
```

**Required Options:**
- `--apis <path>` - Path to APIs Excel file
- `--models <path>` - Path to Models Excel file

**Optional:**
- `--output <dir>` - Output directory for generated code (default: `./src`)

**Example:**
```bash
generator-cli generate all --apis ./documents/apis.xlsx --models ./documents/models.xlsx --output ./src
```

#### `generate constants`

Generate API constants from APIs documentation.

```bash
generator-cli generate constants --apis <path> [options]
```

**Options:**
- `--apis <path>` - Path to APIs Excel file (required)
- `--tag <tag>` - Generate constants for specific tag only
- `--output <dir>` - Output directory (default: `./src`)

**Example:**
```bash
# Generate all constants
generator-cli generate constants --apis ./documents/apis.xlsx

# Generate constants for specific tag
generator-cli generate constants --apis ./documents/apis.xlsx --tag "user-management"
```

#### `generate models`

Generate TypeScript models/interfaces from Models documentation.

```bash
generator-cli generate models --models <path> [options]
```

**Options:**
- `--models <path>` - Path to Models Excel file (required)
- `--tag <tag>` - Generate models for specific tag only
- `--output <dir>` - Output directory (default: `./src`)

**Example:**
```bash
# Generate all models
generator-cli generate models --models ./documents/models.xlsx

# Generate models for specific tag
generator-cli generate models --models ./documents/models.xlsx --tag "authentication"
```

#### `generate services`

Generate API service classes with HTTP client methods.

```bash
generator-cli generate services --apis <path> [options]
```

**Options:**
- `--apis <path>` - Path to APIs Excel file (required)
- `--tag <tag>` - Generate services for specific tag only
- `--output <dir>` - Output directory (default: `./src`)

**Example:**
```bash
# Generate all services
generator-cli generate services --apis ./documents/apis.xlsx

# Generate services for specific tag
generator-cli generate services --apis ./documents/apis.xlsx --tag "user-api"
```

#### `generate queries`

Generate React Query hooks for API endpoints.

```bash
generator-cli generate queries --apis <path> [options]
```

**Options:**
- `--apis <path>` - Path to APIs Excel file (required)
- `--tag <tag>` - Generate queries for specific tag only
- `--output <dir>` - Output directory (default: `./src`)

**Example:**
```bash
# Generate all React Query hooks
generator-cli generate queries --apis ./documents/apis.xlsx

# Generate queries for specific tag
generator-cli generate queries --apis ./documents/apis.xlsx --tag "data-fetching"
```

### Validation Commands

#### `validate swagger`

Validate Swagger/OpenAPI specification for correctness and completeness.

```bash
generator-cli validate swagger [options]
```

**Options:**
- `--swagger-file <path>` - Path to Swagger file
- `--swagger-url <url>` - URL to Swagger specification

**Example:**
```bash
# Validate local file
generator-cli validate swagger --swagger-file ./api-spec.json

# Validate remote specification
generator-cli validate swagger --swagger-url https://api.example.com/swagger.json
```

### Analysis Commands

#### `analyze docs`

Analyze generated documentation spreadsheets for completeness and issues.

```bash
generator-cli analyze docs --apis <path> --models <path>
```

**Options:**
- `--apis <path>` - Path to APIs Excel file (required)
- `--models <path>` - Path to Models Excel file (required)

**Output includes:**
- Number of API endpoints and tags
- Number of model definitions
- Documentation coverage percentage
- List of identified issues

**Example:**
```bash
generator-cli analyze docs --apis ./documents/apis.xlsx --models ./documents/models.xlsx
```

### Template Commands

Manage code generation templates for customizing output.

#### `template init`

Initialize template files for customizing code generation.

```bash
generator-cli template init --type <type>
```

**Options:**
- `--type <type>` - Template type: `constants`, `models`, `services`, or `queries`

**Example:**
```bash
# Initialize service template
generator-cli template init --type services

# Initialize model template
generator-cli template init --type models
```

#### `template list`

List all available templates with descriptions.

```bash
generator-cli template list
```

### Configuration Commands

Manage CLI configuration settings.

#### `config init`

Initialize CLI configuration.

```bash
generator-cli config init [options]
```

**Options:**
- `--interactive` - Use interactive mode for configuration

**Example:**
```bash
# Initialize with defaults
generator-cli config init

# Interactive setup
generator-cli config init --interactive
```

#### `config set`

Set a configuration value.

```bash
generator-cli config set <key> <value>
```

**Example:**
```bash
generator-cli config set outputDirectory ./generated
generator-cli config set defaultTemplate modern
```

#### `config show`

Display current configuration.

```bash
generator-cli config show
```

## Workflows

### Complete API Integration Workflow

1. **Generate Documentation**:
   ```bash
   generator-cli generate documents --swagger-url https://api.example.com/swagger.json
   ```

2. **Validate and Analyze**:
   ```bash
   generator-cli validate swagger --swagger-url https://api.example.com/swagger.json
   generator-cli analyze docs --apis ./documents/apis.xlsx --models ./documents/models.xlsx
   ```

3. **Generate All Code**:
   ```bash
   generator-cli generate all --apis ./documents/apis.xlsx --models ./documents/models.xlsx
   ```

### Incremental Development Workflow

1. **Generate specific components**:
   ```bash
   # Start with models
   generator-cli generate models --models ./documents/models.xlsx --tag "core"
   
   # Add services
   generator-cli generate services --apis ./documents/apis.xlsx --tag "user-api"
   
   # Add React Query hooks
   generator-cli generate queries --apis ./documents/apis.xlsx --tag "user-api"
   ```

2. **Customize templates** (optional):
   ```bash
   generator-cli template init --type services
   # Edit the generated template files
   # Regenerate with custom templates
   ```

### Team Collaboration Workflow

1. **Initialize project configuration**:
   ```bash
   generator-cli config init --interactive
   ```

2. **Generate documentation** (shared across team):
   ```bash
   generator-cli generate documents --swagger-file ./api-spec.json --output ./shared-docs
   ```

3. **Each developer generates needed code**:
   ```bash
   generator-cli generate services --apis ./shared-docs/apis.xlsx --tag "my-feature"
   ```

## Examples

### Basic Usage

```bash
# Generate everything from a Swagger URL
generator-cli generate documents --swagger-url https://petstore.swagger.io/v2/swagger.json
generator-cli generate all --apis ./documents/apis.xlsx --models ./documents/models.xlsx

# Generate only what you need
generator-cli generate models --models ./documents/models.xlsx --tag "authentication"
generator-cli generate services --apis ./documents/apis.xlsx --tag "user-management"
```

### Advanced Usage

```bash
# Custom output directories
generator-cli generate documents --swagger-file ./specs/api.json --output ./documentation
generator-cli generate all --apis ./documentation/apis.xlsx --models ./documentation/models.xlsx --output ./src/generated

# Tag-specific generation
generator-cli generate services --apis ./docs/apis.xlsx --tag "payments" --output ./src/payments
generator-cli generate queries --apis ./docs/apis.xlsx --tag "analytics" --output ./src/hooks

# Analysis and validation
generator-cli validate swagger --swagger-file ./specs/api.json
generator-cli analyze docs --apis ./docs/apis.xlsx --models ./docs/models.xlsx
```

### CI/CD Integration

```bash
#!/bin/bash
# In your CI/CD pipeline

# Validate API specification
generator-cli validate swagger --swagger-url $API_SPEC_URL

# Generate documentation
generator-cli generate documents --swagger-url $API_SPEC_URL --output ./docs

# Generate code
generator-cli generate all --apis ./docs/apis.xlsx --models ./docs/models.xlsx --output ./src/generated

# Analyze for completeness
generator-cli analyze docs --apis ./docs/apis.xlsx --models ./docs/models.xlsx
```

## Configuration

The CLI supports configuration through a config file and command-line options. Use `generator-cli config init --interactive` to set up initial configuration.

Common configuration options:
- `outputDirectory` - Default output directory
- `swaggerUrl` - Default Swagger specification URL
- `templatePath` - Custom template directory
- `fileNamingConvention` - Naming convention for generated files

## Troubleshooting

### Common Issues

**"Please provide either --swagger-url or --swagger-file"**
- Ensure you specify exactly one source for Swagger specification

**"Failed to generate documentation"**
- Verify the Swagger specification is valid JSON/YAML
- Check network connectivity for remote URLs
- Ensure file paths are correct for local files

**"Swagger validation failed"**
- Use `generator-cli validate swagger` to identify specific validation errors
- Common issues include missing required fields, invalid references, or malformed JSON

**Template initialization failed**
- Ensure the template type is one of: `constants`, `models`, `services`, `queries`
- Check write permissions in the target directory

### Getting Help

- Use `--help` with any command for detailed options
- Use `generator-cli --help` for general help
- Use `generator-cli <command> --help` for command-specific help

### Debug Mode

Add `--verbose` or set `DEBUG=generator-cli:*` environment variable for detailed logging:

```bash
DEBUG=generator-cli:* generator-cli generate documents --swagger-url https://api.example.com/swagger.json
```

---

## Support

For issues and feature requests, please refer to the project repository or contact the development team.