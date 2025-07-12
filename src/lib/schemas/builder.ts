import { relationDatabasePropertySchema } from "./types";

export class PropertiesBuilder {
  properties: Map<string, typeof relationDatabasePropertySchema.infer> = new Map();

  relation(name: string, id: string): this {
    this.properties.set(name, {
      type: "relation",
      has_more: false,
      relation: [
        {
          id
        }
      ]
    });
    return this;
  }

  build(): Map<string, typeof relationDatabasePropertySchema.infer> {
    return this.properties;
  }
}

export class DatabaseRecordBuilder {
  properties: PropertiesBuilder;

  constructor() {
    this.properties = new PropertiesBuilder();
  }

  build(): Map<string, typeof relationDatabasePropertySchema.infer> {
    return this.properties.build();
  }
}

export const builder = new DatabaseRecordBuilder();
