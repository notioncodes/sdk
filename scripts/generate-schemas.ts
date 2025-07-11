#!/usr/bin/env tsx

/**
 * CLI script for generating ArkType schemas from Notion API endpoint types.
 *
 * This script uses the generator infrastructure to convert TypeScript types
 * from @api-endpoints.d.ts into ArkType schemas for runtime validation.
 *
 * Usage:
 *   npm run generate:schemas
 *   tsx scripts/generate-schemas.ts [options]
 *
 * Options:
 *   --input <path>      Input TypeScript file (default: .notion/api-endpoints.d.ts)
 *   --output <path>     Output schema file (default: src/generated/schemas.ts)
 *   --max-types <num>   Maximum number of types to process (default: unlimited)
 *   --skip-complex      Skip overly complex types
 *   --validate          Validate generated schemas
 *   --verbose           Enable verbose logging
 *   --help              Show this help message
 */

import ansis from "ansis";
import { existsSync } from "fs";
import { resolve } from "path";
import { parseArgs } from "util";
import { SchemaGenerator } from "../src/lib/generator/generator";

interface CliOptions {
  input: string;
  output: string;
  maxTypes?: number;
  skipComplex: boolean;
  validate: boolean;
  verbose: boolean;
  help: boolean;
}

/**
 * Parses command line arguments and returns CLI options.
 */
function parseCliArgs(): CliOptions {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      input: {
        type: "string",
        short: "i",
        default: ".notion/api-endpoints.d.ts"
      },
      output: {
        type: "string",
        short: "o",
        default: "src/generated/schemas.ts"
      },
      "max-types": {
        type: "string",
        short: "m"
      },
      "skip-complex": {
        type: "boolean",
        short: "s",
        default: false
      },
      validate: {
        type: "boolean",
        short: "v",
        default: false
      },
      verbose: {
        type: "boolean",
        default: false
      },
      help: {
        type: "boolean",
        short: "h",
        default: false
      }
    },
    allowPositionals: true
  });

  return {
    input: resolve(process.cwd(), values.input as string),
    output: resolve(process.cwd(), values.output as string),
    maxTypes: values["max-types"] ? parseInt(values["max-types"] as string, 10) : undefined,
    skipComplex: values["skip-complex"] as boolean,
    validate: values.validate as boolean,
    verbose: values.verbose as boolean,
    help: values.help as boolean
  };
}

/**
 * Displays help information.
 */
function showHelp(): void {
  console.log(ansis.bold.cyan("NotionKit Schema Generator"));
  console.log(ansis.gray("Generates ArkType schemas from Notion API TypeScript definitions"));
  console.log();
  console.log(ansis.bold("Usage:"));
  console.log("  npm run generate:schemas");
  console.log("  tsx scripts/generate-schemas.ts [options]");
  console.log();
  console.log(ansis.bold("Options:"));
  console.log("  -i, --input <path>      Input TypeScript file (default: .notion/api-endpoints.d.ts)");
  console.log("  -o, --output <path>     Output schema file (default: src/generated/schemas.ts)");
  console.log("  -m, --max-types <num>   Maximum number of types to process");
  console.log("  -s, --skip-complex      Skip overly complex types");
  console.log("  -v, --validate          Validate generated schemas");
  console.log("      --verbose           Enable verbose logging");
  console.log("  -h, --help              Show this help message");
  console.log();
  console.log(ansis.bold("Examples:"));
  console.log("  # Generate all schemas");
  console.log("  npm run generate:schemas");
  console.log();
  console.log("  # Generate first 50 schemas with validation");
  console.log("  tsx scripts/generate-schemas.ts --max-types 50 --validate");
  console.log();
  console.log("  # Skip complex types and use verbose output");
  console.log("  tsx scripts/generate-schemas.ts --skip-complex --verbose");
}

/**
 * Validates that the input file exists and is readable.
 */
function validateInputFile(inputPath: string): void {
  if (!existsSync(inputPath)) {
    console.error(ansis.red.bold("❌ Error:"), `Input file not found: ${inputPath}`);
    console.error(ansis.yellow("💡 Tip:"), "Make sure the Notion API types file exists");
    process.exit(1);
  }

  console.log(ansis.green("✅"), `Input file found: ${ansis.dim(inputPath)}`);
}

/**
 * Logs verbose information if verbose mode is enabled.
 */
function logVerbose(verbose: boolean, message: string, ...args: any[]): void {
  if (verbose) {
    console.log(ansis.dim("🔍"), ansis.dim(message), ...args);
  }
}

/**
 * Displays a summary of the generation process.
 */
function displaySummary(options: CliOptions, startTime: number, success: boolean): void {
  const duration = Date.now() - startTime;
  const durationStr = duration > 1000 ? `${(duration / 1000).toFixed(1)}s` : `${duration}ms`;

  console.log();
  console.log(ansis.bold("📊 Generation Summary"));
  console.log(ansis.gray("─".repeat(50)));
  console.log(`${ansis.bold("Input:")}     ${options.input}`);
  console.log(`${ansis.bold("Output:")}    ${options.output}`);
  console.log(`${ansis.bold("Max Types:")} ${options.maxTypes || "unlimited"}`);
  console.log(`${ansis.bold("Duration:")}  ${durationStr}`);
  console.log(`${ansis.bold("Status:")}    ${success ? ansis.green("✅ Success") : ansis.red("❌ Failed")}`);

  if (success) {
    console.log();
    console.log(ansis.green.bold("🎉 Schema generation completed successfully!"));
    console.log(ansis.yellow("📝 Next steps:"));
    console.log("  • Run tests:", ansis.cyan("npm run test"));
    console.log("  • Check types:", ansis.cyan("npm run check"));
    console.log("  • Build project:", ansis.cyan("npm run build"));
  }
}

/**
 * Main CLI function.
 */
async function main(): Promise<void> {
  const startTime = Date.now();
  let success = false;
  let options: CliOptions = parseCliArgs();

  try {
    // Show help if requested
    if (options.help) {
      showHelp();
      return;
    }

    // Display banner
    console.log(ansis.bold.cyan("🚀 NotionKit Schema Generator"));
    console.log(ansis.gray("Converting Notion API types to ArkType schemas..."));
    console.log();

    // Validate input file
    validateInputFile(options.input);

    logVerbose(options.verbose, "CLI options:", options);

    // Initialize the schema generator
    const generator = new SchemaGenerator();

    logVerbose(options.verbose, "Initializing schema generator...");

    // Generate schemas
    console.log(ansis.blue("⚙️"), "Generating schemas...");

    await generator.generateSchemas({
      inputFile: options.input,
      outputFile: options.output,
      maxTypes: options.maxTypes,
      skipComplexTypes: options.skipComplex
    });

    // Validate schemas if requested
    if (options.validate) {
      console.log(ansis.blue("🔍"), "Validating generated schemas...");

      const isValid = await generator.validateSchemas(options.output);

      if (!isValid) {
        console.error(ansis.red("❌"), "Schema validation failed");
        process.exit(1);
      }

      console.log(ansis.green("✅"), "Schema validation passed");
    }

    success = true;
  } catch (error) {
    console.error();
    console.error(ansis.red.bold("💥 Schema generation failed:"));

    if (error instanceof Error) {
      console.error(ansis.red("Error:"), error.message);

      console.error(ansis.dim("Stack trace:"));
      console.error(ansis.dim(error.stack));
    } else {
      console.error(ansis.red("Unknown error:"), error);
    }

    console.error();
    console.error(ansis.yellow("💡 Troubleshooting tips:"));
    console.error("  • Check that the input file exists and is valid TypeScript");
    console.error("  • Try using --max-types to limit the number of types processed");
    console.error("  • Use --skip-complex to avoid problematic complex types");
    console.error("  • Enable --verbose for more detailed error information");

    process.exit(1);
  } finally {
    // Always display summary
    displaySummary(options, startTime, success);
  }
}

// Enhanced error handling
process.on("uncaughtException", (error) => {
  console.error();
  console.error(ansis.red.bold("💥 Uncaught exception:"));
  console.error(ansis.red(error.message));
  if (error.stack) {
    console.error(ansis.dim(error.stack));
  }
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error();
  console.error(ansis.red.bold("💥 Unhandled rejection:"));
  console.error(ansis.red(String(reason)));
  process.exit(1);
});

// Handle SIGINT (Ctrl+C) gracefully
process.on("SIGINT", () => {
  console.log();
  console.log(ansis.yellow("⚠️  Generation interrupted by user"));
  process.exit(0);
});

// Run the CLI
main().catch((error) => {
  console.error(ansis.red.bold("💥 Main function failed:"), error);
  process.exit(1);
});
