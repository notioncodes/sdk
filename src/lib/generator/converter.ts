import { Node, SyntaxKind, TypeNode } from "ts-morph";

/**
 * Converts TypeScript type nodes to ArkType schema strings with robust circular reference handling.
 */
export class TypeToArkTypeConverter {
  private readonly visitedTypes = new Set<string>();
  private readonly processingStack = new Set<string>();
  private readonly typeCache = new Map<string, string>();
  private readonly maxDepth = 20;
  private currentDepth = 0;

  /**
   * Converts a TypeScript type node to an ArkType schema string.
   */
  public convertType(typeNode: TypeNode, typeName?: string): string {
    this.currentDepth++;

    try {
      // Prevent infinite recursion
      if (this.currentDepth > this.maxDepth) {
        return "unknown";
      }

      // Handle circular references
      if (typeName && this.processingStack.has(typeName)) {
        return `() => ${typeName}Schema`;
      }

      if (typeName) {
        this.processingStack.add(typeName);
      }

      const result = this.convertTypeInternal(typeNode, typeName);

      if (typeName) {
        this.processingStack.delete(typeName);
      }

      return result;
    } finally {
      this.currentDepth--;
    }
  }

  private convertTypeInternal(typeNode: TypeNode, typeName?: string): string {
    const kind = typeNode.getKind();

    switch (kind) {
      case SyntaxKind.StringKeyword:
        return "string";

      case SyntaxKind.NumberKeyword:
        return "number";

      case SyntaxKind.BooleanKeyword:
        return "boolean";

      case SyntaxKind.NullKeyword:
        return "null";

      case SyntaxKind.UndefinedKeyword:
        return "undefined";

      case SyntaxKind.UnknownKeyword:
      case SyntaxKind.AnyKeyword:
        return "unknown";

      case SyntaxKind.LiteralType:
        return this.convertLiteralType(typeNode);

      case SyntaxKind.ArrayType:
        return this.convertArrayType(typeNode);

      case SyntaxKind.UnionType:
        return this.convertUnionType(typeNode, typeName);

      case SyntaxKind.IntersectionType:
        return this.convertIntersectionType(typeNode, typeName);

      case SyntaxKind.TypeReference:
        return this.convertTypeReference(typeNode);

      case SyntaxKind.TypeLiteral:
        return this.convertTypeLiteral(typeNode);

      case SyntaxKind.MappedType:
        return this.convertMappedType(typeNode);

      case SyntaxKind.SyntaxList:
        return this.convertSyntaxList(typeNode);

      case SyntaxKind.ParenthesizedType:
        return this.convertParenthesizedType(typeNode);

      case SyntaxKind.BarToken:
      case SyntaxKind.AmpersandToken:
        // These are just separators, ignore them
        return "unknown";

      default:
        console.warn(`Unhandled type kind: ${SyntaxKind[kind]} for type: ${typeName || "unknown"}`);
        return "unknown";
    }
  }

  private convertLiteralType(typeNode: TypeNode): string {
    const literal =
      typeNode.getFirstChildByKind(SyntaxKind.StringLiteral) ||
      typeNode.getFirstChildByKind(SyntaxKind.NumericLiteral) ||
      typeNode.getFirstChildByKind(SyntaxKind.TrueKeyword) ||
      typeNode.getFirstChildByKind(SyntaxKind.FalseKeyword);

    if (!literal) {
      return "unknown";
    }

    const text = literal.getText();

    // Handle string literals - return the raw string with quotes
    if (literal.getKind() === SyntaxKind.StringLiteral) {
      return text; // Keep the quotes as they are
    }

    // Handle numeric literals
    if (literal.getKind() === SyntaxKind.NumericLiteral) {
      return text;
    }

    // Handle boolean literals
    if (literal.getKind() === SyntaxKind.TrueKeyword) {
      return "true";
    }

    if (literal.getKind() === SyntaxKind.FalseKeyword) {
      return "false";
    }

    return "unknown";
  }

  private convertArrayType(typeNode: TypeNode): string {
    // For simplicity, just return unknown[] for array types
    // This avoids complex type resolution issues
    return "unknown[]";
  }

  private convertUnionType(typeNode: TypeNode, typeName?: string): string {
    const unionTypes = typeNode
      .getChildren()
      .filter((child) => child.getKind() !== SyntaxKind.BarToken)
      .filter((child) => child instanceof Node && "getKind" in child);

    if (unionTypes.length === 0) {
      return "unknown";
    }

    // Handle large unions (like EmojiRequest) by simplifying them
    if (unionTypes.length > 50) {
      // Check if it's all string literals
      const allStringLiterals = unionTypes.every((type) => {
        const literal = type.getFirstChildByKind?.(SyntaxKind.StringLiteral);
        return literal !== undefined;
      });

      if (allStringLiterals) {
        return "string"; // Simplify large string literal unions
      }
    }

    // Handle reasonable-sized unions
    if (unionTypes.length <= 10) {
      const convertedTypes = unionTypes
        .map((type) => this.convertType(type as TypeNode))
        .filter((type) => type !== "unknown");

      if (convertedTypes.length > 0) {
        // For ArkType, unions should be separated by | without extra quotes
        return convertedTypes.join(" | ");
      }
    }

    return "unknown";
  }

  private convertIntersectionType(typeNode: TypeNode, typeName?: string): string {
    const intersectionTypes = typeNode
      .getChildren()
      .filter((child) => child.getKind() !== SyntaxKind.AmpersandToken)
      .filter((child) => child instanceof Node && "getKind" in child);

    if (intersectionTypes.length === 0) {
      return "unknown";
    }

    // For now, simplify intersection types to the first type
    // This is a pragmatic approach for complex Notion API types
    const firstType = intersectionTypes[0] as TypeNode;
    return this.convertType(firstType);
  }

  private convertParenthesizedType(typeNode: TypeNode): string {
    // Extract the type inside the parentheses
    const children = typeNode.getChildren();

    for (const child of children) {
      if (child instanceof Node && "getKind" in child) {
        const kind = child.getKind();
        if (kind !== SyntaxKind.OpenParenToken && kind !== SyntaxKind.CloseParenToken) {
          try {
            return this.convertType(child as TypeNode);
          } catch {
            continue;
          }
        }
      }
    }

    return "unknown";
  }

  private convertSyntaxList(typeNode: TypeNode): string {
    // SyntaxList is a container node, extract the actual type
    const children = typeNode.getChildren();

    if (children.length === 1) {
      const child = children[0];
      if (child instanceof Node && "getKind" in child) {
        try {
          return this.convertType(child as any);
        } catch {
          return "unknown";
        }
      }
    }

    // If multiple children, treat as union
    if (children.length > 1) {
      const types: string[] = [];
      for (const child of children) {
        if (child instanceof Node && "getKind" in child) {
          try {
            const convertedType = this.convertType(child as any);
            if (convertedType !== "unknown") {
              types.push(convertedType);
            }
          } catch {
            // Skip this child if conversion fails
            continue;
          }
        }
      }

      if (types.length > 0) {
        return types.join(" | ");
      }
    }

    return "unknown";
  }

  private convertTypeReference(typeNode: TypeNode): string {
    const typeName = typeNode.getText();

    // Handle built-in types
    const builtInMappings: Record<string, string> = {
      string: "string",
      number: "number",
      boolean: "boolean",
      Date: "Date",
      "Record<string, never>": "{}",
      EmptyObject: "{}"
    };

    if (builtInMappings[typeName]) {
      return builtInMappings[typeName];
    }

    // Handle generic Record types
    if (typeName.startsWith("Record<")) {
      return "Record<string, unknown>";
    }

    // Handle Array types
    if (typeName.startsWith("Array<")) {
      const innerType = typeName.slice(6, -1);
      return `${this.simplifyTypeName(innerType)}[]`;
    }

    // Reference to another schema - return without quotes for ArkType
    const cleanTypeName = this.simplifyTypeName(typeName);
    return `${cleanTypeName}Schema`;
  }

  private convertTypeLiteral(typeNode: TypeNode): string {
    const properties: string[] = [];

    const propertySignatures = typeNode
      .getChildren()
      .filter((child) => child.getKind() === SyntaxKind.PropertySignature);

    for (const prop of propertySignatures) {
      const name = this.getPropertyName(prop);
      const type = this.getPropertyType(prop);
      const optional = this.isPropertyOptional(prop);

      if (name && type) {
        const convertedType = this.convertType(type);
        const propertyDef = optional ? `"${name}?"` : `"${name}"`;
        properties.push(`${propertyDef}: ${convertedType}`);
      }
    }

    if (properties.length === 0) {
      return "{}";
    }

    return `{ ${properties.join(", ")} }`;
  }

  private convertMappedType(typeNode: TypeNode): string {
    // Simplify mapped types to Record
    return "Record<string, unknown>";
  }

  private getPropertyName(propNode: Node): string | null {
    const identifier = propNode.getFirstChildByKind(SyntaxKind.Identifier);
    if (identifier) {
      return identifier.getText();
    }

    const stringLiteral = propNode.getFirstChildByKind(SyntaxKind.StringLiteral);
    if (stringLiteral) {
      const text = stringLiteral.getText();
      return text.slice(1, -1); // Remove quotes
    }

    return null;
  }

  private getPropertyType(propNode: Node): TypeNode | null {
    // Look for type annotation after colon
    const children = propNode.getChildren();
    const colonIndex = children.findIndex((child) => child.getKind() === SyntaxKind.ColonToken);

    if (colonIndex >= 0 && colonIndex < children.length - 1) {
      const typeNode = children[colonIndex + 1];
      if (typeNode instanceof Node && "getKind" in typeNode) {
        return typeNode as TypeNode;
      }
    }

    return null;
  }

  private isPropertyOptional(propNode: Node): boolean {
    return propNode.getChildren().some((child) => child.getKind() === SyntaxKind.QuestionToken);
  }

  private simplifyTypeName(typeName: string): string {
    // Remove type parameters and clean up the name
    return typeName
      .replace(/<.*>$/, "") // Remove generic parameters
      .replace(/\s+/g, "") // Remove whitespace
      .replace(/[^a-zA-Z0-9_]/g, ""); // Keep only valid identifier characters
  }

  /**
   * Resets the converter state for a new conversion session.
   */
  public reset(): void {
    this.visitedTypes.clear();
    this.processingStack.clear();
    this.typeCache.clear();
    this.currentDepth = 0;
  }
}
