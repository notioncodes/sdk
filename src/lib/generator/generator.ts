import { mkdir, writeFile } from "fs/promises";
import { dirname } from "path";
import { Project, SourceFile } from "ts-morph";
import { TypeToArkTypeConverter } from "./converter.js";
import { TypeExtractor } from "./extractor.js";

export interface GeneratorOptions {
  inputFile: string;
  outputFile: string;
  maxTypes?: number;
  skipComplexTypes?: boolean;
}

export class SchemaGenerator {
  private readonly converter = new TypeToArkTypeConverter();
  private readonly extractor = new TypeExtractor();
  private readonly project = new Project({
    useInMemoryFileSystem: false,
    compilerOptions: {
      target: 99, // Latest
      lib: ["es2022", "dom"],
      moduleResolution: 99, // Bundler
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: true
    }
  });

  /**
   * Generates ArkType schemas from TypeScript definitions.
   */
  public async generateSchemas(options: GeneratorOptions): Promise<void> {
    try {
      console.log(`🔍 Reading TypeScript definitions from: ${options.inputFile}`);

      const sourceFile = this.project.addSourceFileAtPath(options.inputFile);
      const typeNames = this.extractor.extractTypeNames(sourceFile);

      console.log(`📊 Found ${typeNames.length} type definitions`);

      // Limit the number of types if specified
      const typesToProcess = options.maxTypes ? typeNames.slice(0, options.maxTypes) : typeNames;

      if (options.maxTypes && typeNames.length > options.maxTypes) {
        console.log(`⚡ Processing first ${options.maxTypes} types for performance`);
      }

      const schemas = this.generateSchemasFromTypes(sourceFile, typesToProcess, options);

      console.log(`✅ Generated ${schemas.length} schemas`);

      await this.writeSchemaFile(schemas, options.outputFile);

      console.log(`📝 Schemas written to: ${options.outputFile}`);
    } catch (error) {
      console.error("❌ Schema generation failed:", error);
      throw error;
    }
  }

  private generateSchemasFromTypes(
    sourceFile: SourceFile,
    typeNames: string[],
    options: GeneratorOptions
  ): Array<{ name: string; schema: string }> {
    const schemas: Array<{ name: string; schema: string }> = [];
    const processedTypes = new Set<string>();

    for (const typeName of typeNames) {
      if (processedTypes.has(typeName)) {
        continue;
      }

      try {
        // Reset converter state for each type
        this.converter.reset();

        const typeAlias = sourceFile.getTypeAlias(typeName);
        const interface_ = sourceFile.getInterface(typeName);

        let schema: string;

        if (typeAlias) {
          const typeNode = typeAlias.getTypeNode();
          if (!typeNode) {
            console.warn(`⚠️  Type alias ${typeName} has no type node, skipping`);
            continue;
          }

          schema = this.converter.convertType(typeNode, typeName);
        } else if (interface_) {
          // Convert interface to type literal
          const properties: string[] = [];

          for (const prop of interface_.getProperties()) {
            const name = prop.getName();
            const type = prop.getTypeNode();
            const optional = prop.hasQuestionToken();

            if (type) {
              const convertedType = this.converter.convertType(type);
              const propertyDef = optional ? `"${name}?"` : `"${name}"`;
              properties.push(`${propertyDef}: ${convertedType}`);
            }
          }

          schema = properties.length > 0 ? `{ ${properties.join(", ")} }` : "{}";
        } else {
          console.warn(`⚠️  Type ${typeName} not found, skipping`);
          continue;
        }

        // Skip overly complex schemas if requested
        if (options.skipComplexTypes && this.isSchemaComplex(schema)) {
          console.log(`⏭️  Skipping complex type: ${typeName}`);
          continue;
        }

        schemas.push({ name: typeName, schema });
        processedTypes.add(typeName);

        if (schemas.length % 10 === 0) {
          console.log(`📈 Processed ${schemas.length} schemas...`);
        }
      } catch (error) {
        console.warn(`⚠️  Failed to process type ${typeName}:`, error);
        // Continue with other types instead of failing completely
        continue;
      }
    }

    return schemas;
  }

  private isSchemaComplex(schema: string): boolean {
    // Consider a schema complex if it's very long or has deep nesting
    return schema.length > 5000 || (schema.match(/\{/g) || []).length > 20;
  }

  private async writeSchemaFile(schemas: Array<{ name: string; schema: string }>, outputFile: string): Promise<void> {
    const imports = ["import { type } from 'arktype';", ""];

    const schemaDefinitions = schemas.map(({ name, schema }) => {
      const schemaName = `${name}Schema`;
      return `export const ${schemaName} = type(${this.formatSchema(schema)});`;
    });

    const typeExports = schemas.map(({ name }) => {
      const schemaName = `${name}Schema`;
      return `export type ${name} = typeof ${schemaName}.infer;`;
    });

    const content = [
      ...imports,
      "// Generated ArkType schemas",
      "// Do not edit this file manually",
      "",
      ...schemaDefinitions,
      "",
      "// Type exports",
      ...typeExports,
      ""
    ].join("\n");

    // Ensure output directory exists
    await mkdir(dirname(outputFile), { recursive: true });

    await writeFile(outputFile, content, "utf-8");
  }

  private formatSchema(schema: string): string {
    // For ArkType, we need to be careful about quoting

    // If it's a simple type or built-in, quote it
    const simpleTypes = ["string", "number", "boolean", "unknown", "null", "undefined", "{}"];
    if (simpleTypes.includes(schema)) {
      return `"${schema}"`;
    }

    // If it's an array type, quote it
    if (schema.endsWith("[]")) {
      return `"${schema}"`;
    }

    // If it's a schema reference (ends with Schema), don't quote it
    if (schema.endsWith("Schema")) {
      return schema;
    }

    // If it contains unions with schema references, don't quote the whole thing
    if (schema.includes("Schema") && schema.includes("|")) {
      return schema;
    }

    // If it's a literal union or contains quotes, don't add extra quotes
    if (schema.includes('"') || schema.includes("'")) {
      return schema;
    }

    // Default: quote it
    return `"${schema}"`;
  }

  /**
   * Validates that the generated schemas are syntactically correct.
   */
  public async validateSchemas(outputFile: string): Promise<boolean> {
    try {
      console.log(`🔍 Validating generated schemas...`);

      // Check if file exists first
      try {
        const { readFile } = await import("fs/promises");
        await readFile(outputFile, "utf-8");
      } catch (error) {
        console.error(`❌ Generated file not found: ${outputFile}`);
        return false;
      }

      // Try to parse the generated file
      const validationProject = new Project({
        useInMemoryFileSystem: false,
        compilerOptions: {
          target: 99,
          lib: ["es2022"],
          moduleResolution: 99,
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
          skipLibCheck: true,
          strict: true
        }
      });

      const sourceFile = validationProject.addSourceFileAtPath(outputFile);

      const diagnostics = validationProject.getPreEmitDiagnostics();

      if (diagnostics.length > 0) {
        console.error("❌ Schema validation failed:");
        for (const diagnostic of diagnostics) {
          console.error(`  ${diagnostic.getMessageText()}`);
        }
        return false;
      }

      console.log("✅ Schema validation passed");
      return true;
    } catch (error) {
      console.error("❌ Schema validation error:", error);
      return false;
    }
  }
}
