import { InterfaceDeclaration, SourceFile, TypeAliasDeclaration } from "ts-morph";

/**
 * Extracts type names from TypeScript source files.
 */
export class TypeExtractor {
  /**
   * Extracts all type alias and interface names from a source file.
   */
  public extractTypeNames(sourceFile: SourceFile): string[] {
    const typeNames: string[] = [];

    const typeAliases = sourceFile.getTypeAliases();
    for (const typeAlias of typeAliases) {
      const name = typeAlias.getName();
      if (this.isValidTypeName(name)) {
        typeNames.push(name);
      }
    }

    const interfaces = sourceFile.getInterfaces();
    for (const interface_ of interfaces) {
      const name = interface_.getName();
      if (this.isValidTypeName(name)) {
        typeNames.push(name);
      }
    }

    return typeNames;
  }

  /**
   * Extracts type names that match specific patterns or filters.
   */
  public extractFilteredTypeNames(
    sourceFile: SourceFile,
    options: {
      includePatterns?: RegExp[];
      excludePatterns?: RegExp[];
      maxTypes?: number;
    } = {}
  ): string[] {
    const allTypeNames = this.extractTypeNames(sourceFile);
    let filteredNames = allTypeNames;

    if (options.includePatterns && options.includePatterns.length > 0) {
      filteredNames = filteredNames.filter((name) => options.includePatterns!.some((pattern) => pattern.test(name)));
    }

    if (options.excludePatterns && options.excludePatterns.length > 0) {
      filteredNames = filteredNames.filter((name) => !options.excludePatterns!.some((pattern) => pattern.test(name)));
    }

    if (options.maxTypes && filteredNames.length > options.maxTypes) {
      filteredNames = filteredNames.slice(0, options.maxTypes);
    }

    return filteredNames;
  }

  /**
   * Gets detailed information about a specific type.
   */
  public getTypeInfo(
    sourceFile: SourceFile,
    typeName: string
  ): {
    name: string;
    kind: "type" | "interface";
    declaration: TypeAliasDeclaration | InterfaceDeclaration;
  } | null {
    const typeAlias = sourceFile.getTypeAlias(typeName);
    if (typeAlias) {
      return {
        name: typeName,
        kind: "type",
        declaration: typeAlias
      };
    }

    const interface_ = sourceFile.getInterface(typeName);
    if (interface_) {
      return {
        name: typeName,
        kind: "interface",
        declaration: interface_
      };
    }

    return null;
  }

  /**
   * Validates if a type name is suitable for schema generation.
   */
  private isValidTypeName(name: string): boolean {
    if (name.startsWith("__")) {
      return false;
    }

    return ![/^T$/, /^U$/, /^K$/, /^V$/, /^Args$/, /^Props$/, /^State$/].some((pattern) => pattern.test(name));
  }
}
