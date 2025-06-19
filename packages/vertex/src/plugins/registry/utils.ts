import type { AuthPluginSchema, BetterAuthPlugin } from "better-auth";
import { z } from "zod";
import { globalPluginRegistry } from "./registry";
import type {
  OrganizationPluginConfig,
  PluginDefinition,
  PluginMetadata,
} from "./types";

/**
 * Retrieves the enabled Better Auth plugin instances based on the
 * plugin configurations for a specific organization.
 * @param organizationId The ID of the organization.
 * @param allConfigs An array of all plugin configurations for all organizations.
 * @returns An object containing arrays of server and client Better Auth plugins.
 */
export function getEnabledPlugins(
  organizationId: string,
  allConfigs: OrganizationPluginConfig[],
) {
  // In a real-world application, `allConfigs` would likely be fetched
  // from a database or a configuration service.
  const enabledForOrg = allConfigs.filter(
    (c) => c.organizationId === organizationId && c.enabled,
  );

  return globalPluginRegistry.getBetterAuthPlugins(enabledForOrg);
}

/**
 * Creates a complete plugin definition by automatically inferring metadata
 * from the plugin's core implementation and its own `package.json`.
 *
 * @param pluginFactory The core factory function of the plugin.
 * @param metadata Supplemental metadata that cannot be inferred.
 * @param importMetaUrl The `import.meta.url` of the calling module.
 * @returns A promise that resolves to a complete PluginDefinition object.
 */
export function createPluginDefinition(
  pluginFactory: (options?: Record<string, unknown>) => BetterAuthPlugin,
  metadata: PluginMetadata,
): PluginDefinition {
  const defaultInstance = pluginFactory();
  const pluginId = defaultInstance.id;

  if (!pluginId) {
    throw new Error(
      `Plugin factory for '${metadata.name}' did not return an object with an 'id'.`,
    );
  }

  const configSchema = defaultInstance.schema
    ? {
        type: "object" as const,
        properties: defaultInstance.schema,
      }
    : undefined;

  return {
    ...metadata,
    id: pluginId,
    category: metadata.category ?? "other",
    status: metadata.status ?? "inactive",
    serverPlugin: pluginFactory,
    configSchema: configSchema,
  };
}

/**
 * Extract FieldAttribute type from AuthPluginSchema
 */
type FieldAttribute = AuthPluginSchema[string]["fields"][string];

/**
 * Utility function to convert Zod schema to AuthPluginSchema table definition.
 * This eliminates the need for duplicate schema definitions.
 *
 * @param zodSchema The Zod schema object to convert
 * @param options Optional configuration for schema conversion
 * @returns AuthPluginSchema compatible table definition
 */
export function zodToAuthPluginSchema<T extends z.ZodRawShape>(
  zodSchema: z.ZodObject<T>,
  options: {
    /** Custom foreign key mappings */
    foreignKeys?: Record<string, { model: string; field: string }>;
    /** Fields to exclude from conversion */
    excludeFields?: string[];
    /** Custom type mappings for specific fields */
    customTypes?: Record<string, "string" | "number" | "boolean" | "date">;
    /** Disable migration for this table */
    disableMigration?: boolean;
    /** Custom model name for the table */
    modelName?: string;
  } = {},
): AuthPluginSchema[string] {
  const {
    foreignKeys = {},
    excludeFields = [],
    customTypes = {},
    disableMigration,
    modelName,
  } = options;

  const shape = zodSchema.shape;
  const fields: Record<string, FieldAttribute> = {};

  for (const [key, value] of Object.entries(shape)) {
    // Skip excluded fields
    if (excludeFields.includes(key)) {
      continue;
    }

    const zodType = value as z.ZodTypeAny;

    // Extract the inner type for wrapped types (optional, nullable, etc.)
    let innerType = zodType;
    let required = true;
    let defaultValue: any;

    // Handle wrapped types (recursive unwrapping for chained calls)
    while (
      innerType instanceof z.ZodOptional ||
      innerType instanceof z.ZodNullable ||
      innerType instanceof z.ZodDefault
    ) {
      if (innerType instanceof z.ZodOptional) {
        innerType = innerType._def.innerType;
        required = false;
      } else if (innerType instanceof z.ZodNullable) {
        innerType = innerType._def.innerType;
        required = false;
      } else if (innerType instanceof z.ZodDefault) {
        innerType = innerType._def.innerType;
        defaultValue = innerType._def.defaultValue();
        required = false;
      }
    }

    // Check for custom type mapping first
    let betterAuthType: "string" | "number" | "boolean" | "date";
    if (customTypes[key]) {
      betterAuthType = customTypes[key];
    } else {
      // Map Zod types to Better Auth types
      if (innerType instanceof z.ZodString) {
        betterAuthType = "string";
      } else if (
        innerType instanceof z.ZodNumber ||
        innerType instanceof z.ZodBigInt
      ) {
        betterAuthType = "number";
      } else if (innerType instanceof z.ZodBoolean) {
        betterAuthType = "boolean";
      } else if (innerType instanceof z.ZodDate) {
        betterAuthType = "date";
      } else if (
        innerType instanceof z.ZodEnum ||
        innerType instanceof z.ZodNativeEnum
      ) {
        betterAuthType = "string"; // Enums are stored as strings
      } else if (innerType instanceof z.ZodLiteral) {
        // Literal types are stored as strings
        betterAuthType = "string";
      } else if (innerType instanceof z.ZodUnion) {
        // Union types default to string (can be overridden with customTypes)
        betterAuthType = "string";
      } else if (
        innerType instanceof z.ZodArray ||
        innerType instanceof z.ZodObject ||
        innerType instanceof z.ZodRecord
      ) {
        // Complex types are serialized as JSON strings
        betterAuthType = "string";
      } else {
        // Fallback for any other complex types
        console.warn(
          `Unknown Zod type for field '${key}', defaulting to string. Consider using customTypes option.`,
        );
        betterAuthType = "string";
      }
    }

    const fieldDef: FieldAttribute = {
      type: betterAuthType,
      required,
    };

    // Add default value if present
    if (defaultValue !== undefined) {
      fieldDef.defaultValue = defaultValue;
    }

    // Add foreign key references
    if (foreignKeys[key]) {
      fieldDef.references = foreignKeys[key];
    } else if (key === "organizationId") {
      // Default foreign key for organizationId
      fieldDef.references = {
        model: "organization",
        field: "id",
      };
    } else if (key.endsWith("Id") && key !== "id") {
      // Auto-detect potential foreign keys
      const referencedModel = key.slice(0, -2); // Remove "Id" suffix
      console.warn(
        `Potential foreign key detected: '${key}' -> '${referencedModel}'. Consider adding to foreignKeys option.`,
      );
    }

    fields[key] = fieldDef;
  }

  const result: AuthPluginSchema[string] = { fields };

  if (disableMigration !== undefined) {
    result.disableMigration = disableMigration;
  }

  if (modelName !== undefined) {
    result.modelName = modelName;
  }

  return result;
}
