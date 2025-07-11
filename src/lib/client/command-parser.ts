import { SchemaRegistry } from "./schema-registry";

export interface ParsedCommand {
  type: string;
  options?: any;
}

export interface ParsedQuery {
  resource: string;
  filter?: any;
  options?: any;
  parentId?: string;
}

export class CommandParser {
  constructor(private schemaRegistry: SchemaRegistry) {}

  parse(command: string): ParsedCommand {
    const parts = command.trim().split(/\s+/);
    const type = parts[0].toLowerCase();

    // Handle simple export commands
    if (['pages', 'databases', 'users', 'blocks'].includes(type)) {
      return {
        type,
        options: this.parseOptions(parts.slice(1))
      };
    }

    throw new Error(`Unknown command type: ${type}`);
  }

  parseQuery(command: string): ParsedQuery {
    // Parse queries like "users where type = 'person'"
    // or "pages where status = 'published' and priority > 5"
    const whereMatch = command.match(/^(\w+)(?:\s+where\s+(.+))?$/i);
    
    if (!whereMatch) {
      throw new Error(`Invalid query syntax: ${command}`);
    }

    const resource = whereMatch[1].toLowerCase();
    const whereClause = whereMatch[2];

    return {
      resource,
      filter: whereClause ? this.parseWhereClause(whereClause) : undefined,
      options: {}
    };
  }

  private parseWhereClause(clause: string): any {
    // Parse simple where clauses
    // This is a simplified parser - a real implementation would be more robust
    const conditions = clause.split(/\s+and\s+/i);
    
    if (conditions.length === 1) {
      return this.parseCondition(conditions[0]);
    }

    return {
      and: conditions.map(c => this.parseCondition(c))
    };
  }

  private parseCondition(condition: string): any {
    // Parse conditions like "status = 'published'" or "priority > 5"
    const match = condition.match(/^(\w+)\s*(=|!=|>|<|>=|<=|contains|starts_with|ends_with)\s*(.+)$/i);
    
    if (!match) {
      throw new Error(`Invalid condition: ${condition}`);
    }

    const [, property, operator, value] = match;
    const parsedValue = this.parseValue(value);

    switch (operator.toLowerCase()) {
      case '=':
        return { property, equals: parsedValue };
      case '!=':
        return { property, does_not_equal: parsedValue };
      case '>':
        return { property, greater_than: parsedValue };
      case '<':
        return { property, less_than: parsedValue };
      case '>=':
        return { property, greater_than_or_equal_to: parsedValue };
      case '<=':
        return { property, less_than_or_equal_to: parsedValue };
      case 'contains':
        return { property, contains: parsedValue };
      case 'starts_with':
        return { property, starts_with: parsedValue };
      case 'ends_with':
        return { property, ends_with: parsedValue };
      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  }

  private parseValue(value: string): any {
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }

    // Parse numbers
    if (/^\d+$/.test(value)) {
      return parseInt(value, 10);
    }

    if (/^\d+\.\d+$/.test(value)) {
      return parseFloat(value);
    }

    // Parse booleans
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Parse null
    if (value.toLowerCase() === 'null') return null;

    return value;
  }

  private parseOptions(parts: string[]): any {
    const options: any = {};

    for (let i = 0; i < parts.length; i += 2) {
      if (parts[i].startsWith('--')) {
        const key = parts[i].slice(2);
        const value = parts[i + 1];
        
        if (value) {
          options[key] = this.parseValue(value);
        }
      }
    }

    return options;
  }

  // Parse template literal queries
  parseTemplateLiteral(template: string, values: any[]): ParsedQuery {
    // This would handle template literal parsing for type-safe queries
    // For example: notion`pages where status = ${'published'}`
    let query = template;
    let valueIndex = 0;

    // Replace placeholders with actual values
    query = query.replace(/\$\{[^}]+\}/g, () => {
      const value = values[valueIndex++];
      return typeof value === 'string' ? `'${value}'` : String(value);
    });

    return this.parseQuery(query);
  }
}