# Plugin Registry Implementation

## Overview

This document details the architecture and implementation of the plugin registry system within the Funish Vertex project. The system is designed to be lightweight, robust, and fully compatible with the Better Auth plugin ecosystem.

## Core Principles

- **Simplicity**: We have removed all custom dependency management and complex logic. The registry is now a simple, in-memory map of available plugins.
- **Better Auth Alignment**: The system is designed to work _with_ BetterAuth, not replace its core functionality. Our registry acts as a metadata layer for discovering and instantiating plugins, which are then managed by the Better Auth runtime.
- **Focus on Metadata**: Our `PluginDefinition` interface serves as a descriptor for plugins, decorating them with metadata (like name, category, version, config schema) needed for platform features like a plugin marketplace UI, without interfering with the plugin's core logic.
- **Multi-Tenant Support**: The registry works seamlessly with the Tenant Plugin to provide organization-scoped plugin configurations and data isolation, while keeping core plugins organization-agnostic.

## Core Components

### 1. Type Definitions (`types.ts`)

- **`PluginDefinition`**: The central interface. It defines the metadata for a plugin and contains optional `serverPlugin` and `clientPlugin` factory functions.
- **`OrganizationPluginConfig`**: Defines the shape of the configuration for a specific plugin enabled for a specific organization.
- **`PluginCategory` & `PluginStatus`**: Enums used for organizing and filtering plugins in the UI.
- **`TenantContext`**: Interface for organization context injection into plugin endpoints.

### 2. Registry Implementation (`registry.ts`)

- **`PluginRegistry` Class**: A singleton class (`globalPluginRegistry`) that holds all available `PluginDefinition`s in a `Map`.

  - `register(plugin)`: Adds a new `PluginDefinition` to the registry.
  - `get(id)`: Retrieves a plugin definition by its ID.
  - `getAll()`: Returns an array of all registered plugin definitions.
  - `filter(...)`: Filters plugins based on category, status, or a search term.
  - `getBetterAuthPlugins(configs)`: Takes an array of `OrganizationPluginConfig` and returns `{ server, client }` arrays of instantiated Better Auth plugins, ready to be passed to the main `betterAuth` instance.

- **`platformRegistryPlugin`**: A built-in Better Auth plugin that exposes the registry's `filter` and `get` capabilities via API endpoints (`/platform/plugins` and `/platform/plugins/:id`). This allows a frontend application to query for available plugins.

### 3. Plugin Registration (`register.ts`)

- **`registerBuiltinPlugins()`**: A simple function that imports the definitions of all our built-in plugins (like `storagePluginDefinition`, `tenantPluginDefinition`) and calls `globalPluginRegistry.register()` on them.
- **`initializePluginSystem()`**: Calls `registerBuiltinPlugins()`. This is executed automatically on server startup.

### 4. Tenant Plugin Integration

The **Tenant Plugin** is a special plugin that provides multi-tenant capabilities to all other plugins:

#### 4.1 Organization Context Injection

The Tenant Plugin automatically injects organization context into request contexts for all API endpoints:

```typescript
// Tenant Plugin middleware
{
  path: "/api/v1/*",
  middleware: async (ctx) => {
    const orgId = ctx.request.headers.get("X-Organization-ID");
    const authHeader = ctx.request.headers.get("Authorization");
    const apiKey = authHeader?.replace("Bearer ", "");

    // Validate organization access
    const organization = await validateOrganizationAccess(orgId, apiKey);

    if (!organization) {
      return ctx.json({ error: "Invalid organization or API key" }, { status: 401 });
    }

    // Inject organization context
    ctx.organization = organization;
    ctx.getOrganizationStorage = () => createOrgStorage(organization.id);
    ctx.getOrganizationDatabase = () => getOrgDatabase(organization.dbSchema);
    ctx.getOrganizationConfig = (pluginId) => getPluginConfig(organization.id, pluginId);
    ctx.validateApiKey = (key) => validateOrgApiKey(organization.id, key);
  },
}
```

#### 4.2 Data Isolation Implementation

**Storage Isolation:**

```typescript
// Storage Plugin using organization context
const orgStorage = ctx.getOrganizationStorage?.() || defaultStorage;
// This creates a prefixed storage: `org_{organizationId}:${userKey}`
await orgStorage.setItem("user-avatar.jpg", data);
// Actual storage key: "org_acme-corp:user-avatar.jpg"
```

**Database Isolation:**

```typescript
// Database Plugin using organization schema
const orgDb = ctx.getOrganizationDatabase?.() || defaultDb;
// This connects to organization-specific schema: `org_acme_corp_a1b2c3d4`
await orgDb.selectFrom("users").selectAll().execute();
```

#### 4.3 Header-based Organization Resolution

The Tenant Plugin uses a header-based approach for organization identification:

```http
POST /api/v1/storage/my-file
Headers:
  X-Organization-ID: acme-corp
  Authorization: Bearer org_acme-corp_api_12345678
  Content-Type: application/json
```

**Validation Process:**

1. Extract organization ID from `X-Organization-ID` header
2. Extract API key from `Authorization` header
3. Validate that the API key belongs to the specified organization
4. Inject organization context into the request

#### 4.4 Transparent Integration

Core plugins remain organization-agnostic while gaining multi-tenant capabilities:

```typescript
// Storage Plugin - no organization-specific code
export const storagePlugin = (options) => {
  return {
    id: "storage",
    endpoints: {
      getItem: createAuthEndpoint(
        "/storage/:key",
        { method: "GET" },
        async (ctx) => {
          // Automatically gets organization-scoped storage if tenant plugin is active
          const storage = ctx.getOrganizationStorage?.() || defaultStorage;
          const value = await storage.getItem(ctx.params.key);
          return ctx.json({ value });
        },
      ),
    },
  };
};
```

### 5. Organization Plugin Configuration

#### 5.1 Configuration Schema

```typescript
interface OrganizationPluginConfig {
  id: string; // Unique config ID
  organizationId: string; // Organization identifier
  pluginId: string; // Plugin identifier
  enabled: boolean; // Whether plugin is enabled
  config: Record<string, any>; // Plugin-specific configuration
  createdAt: Date;
  updatedAt: Date;
}
```

#### 5.2 Configuration Management

```typescript
// Get enabled plugins for an organization
export const getEnabledPlugins = async (organizationId: string) => {
  const configs = await db
    .selectFrom("organizationPluginConfig")
    .selectAll()
    .where("organizationId", "=", organizationId)
    .where("enabled", "=", true)
    .execute();

  return globalPluginRegistry.getBetterAuthPlugins(configs);
};
```

### 6. Utility Functions (`utils.ts`)

- **`getEnabledPlugins(organizationId, configs)`**: A helper function that filters a list of all organization plugin configs to find the ones enabled for a specific organization, then uses the registry's `getBetterAuthPlugins` method to get the instantiated plugins.
- **`createPluginDefinition(config)`**: A utility function to create standardized plugin definitions with proper typing.
- **`validateOrganizationAccess(orgId, apiKey)`**: Validates organization access using API key authentication.

### 7. Schema Definition and Type Generation

Our plugin system includes a powerful type generation mechanism that automatically creates TypeScript types from Zod schema definitions and converts them to Better Auth compatible format.

#### 7.1 Schema Definition Pattern

All plugins should define their database schema using Zod for type inference, then use our utility function to convert to Better Auth format:

```typescript
import { z } from "zod";
import { zodToAuthPluginSchema } from "../registry/utils";

// 1. Define Zod schema for type inference
export const myPluginDataSchema = z.object({
  id: z.string(),
  organizationId: z.string(), // Always required for multi-tenant support
  name: z.string(),
  description: z.string().optional(),
  isActive: z.boolean(),
  metadata: z.string().optional(), // JSON string
  createdAt: z.date(),
  updatedAt: z.date().nullable().optional(),
});

// 2. Export TypeScript types using z.infer
export type MyPluginData = z.infer<typeof myPluginDataSchema>;

// 3. Use in Better Auth plugin schema
export const myPlugin = (options: MyPluginOptions = {}) => {
  return {
    id: "my-plugin",

    schema: {
      // Convert Zod schema to Better Auth format
      myPluginData: zodToAuthPluginSchema(myPluginDataSchema),

      // Extend existing tables
      organization: {
        fields: {
          myPluginConfig: {
            type: "string",
            required: false,
          },
        },
      },
    },

    // ... rest of plugin implementation
  } satisfies BetterAuthPlugin;
};
```

**Supported Zod Types:**

- `z.string()` → `"string"`
- `z.number()` → `"number"`
- `z.boolean()` → `"boolean"`
- `z.date()` → `"date"`
- `z.enum()` → `"string"` (stored as string)
- `z.optional()` → `required: false`
- `z.nullable()` → `required: false`

**Important Notes:**

- Always include `organizationId` field for multi-tenant support
- The utility function automatically adds foreign key references for `organizationId`
- Complex types (arrays, objects) are stored as JSON strings (`"string"` type)

#### 7.2 The zodToAuthPluginSchema Utility

The `zodToAuthPluginSchema` utility function is located in `packages/vertex/src/plugins/registry/utils.ts`:

```typescript
/**
 * Utility function to convert Zod schema to Better Auth schema format.
 * This eliminates the need for duplicate schema definitions.
 */
export function zodToAuthPluginSchema<T extends z.ZodRawShape>(zodSchema: z.ZodObject<T>) {
  // Automatically converts Zod types to Better Auth field definitions
  // Handles optional fields, foreign keys, and type mapping
  return { fields: /* ... converted fields ... */ };
}
```

**Benefits:**

- **No Duplication**: Define schema once in Zod, use everywhere
- **Type Safety**: Full TypeScript inference from Zod schemas
- **Consistency**: Automatic conversion ensures compatible formats
- **Maintainability**: Single source of truth for schema definitions

#### 7.3 Advanced Usage Examples

**Complex Schema with References:**

```typescript
export const userProfileSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string(), // Will automatically get foreign key reference
  profileData: z.string(), // JSON string for complex data
  preferences: z.string().optional(),
  isPublic: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date().nullable().optional(),
});

// The utility function will generate:
// {
//   fields: {
//     id: { type: "string", required: true },
//     organizationId: { type: "string", required: true, references: { model: "organization", field: "id" } },
//     userId: { type: "string", required: true },
//     profileData: { type: "string", required: true },
//     preferences: { type: "string", required: false },
//     isPublic: { type: "boolean", required: true },
//     createdAt: { type: "date", required: true },
//     updatedAt: { type: "date", required: false },
//   }
// }
```

**Runtime Validation with Zod:**

```typescript
// Use the same Zod schema for API validation
const createDataEndpoint = createAuthEndpoint(
  "/my-plugin/data",
  {
    method: "POST",
    body: myPluginDataSchema.omit({
      id: true,
      createdAt: true,
      updatedAt: true,
    }),
  },
  async (ctx) => {
    // ctx.body is now fully type-safe and validated
    const { organizationId, name, description, isActive } = ctx.body;

    // Database operations with type safety
    const newRecord: Partial<MyPluginData> = {
      id: generateId(),
      organizationId,
      name,
      description: description || null,
      isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // ... implementation
  },
);
```

#### 7.4 Migration and Schema Updates

**Development Workflow:**

```bash
# 1. Update Zod schema in your plugin
# 2. Generate TypeScript types and Better Auth schema
npx @better-auth/cli generate

# 3. Apply database migrations
npx @better-auth/cli migrate

# 4. Test your changes
pnpm test
```

**Schema Evolution:**

```typescript
// Before (v1)
export const myDataSchemaV1 = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  createdAt: z.date(),
});

// After (v2) - Adding new optional field
export const myDataSchemaV2 = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  description: z.string().optional(), // New optional field
  createdAt: z.date(),
  updatedAt: z.date().nullable().optional(), // New optional field
});

// The utility handles backward compatibility automatically
export type MyData = z.infer<typeof myDataSchemaV2>;
```

This approach ensures that all plugins follow consistent patterns while maintaining full type safety and eliminating code duplication.

## Architecture and Flow

The new architecture follows a clean, decoupled flow:

1.  **Initialization**: On server start, `initializePluginSystem` is called, registering all built-in `PluginDefinition`s into the `globalPluginRegistry`.
2.  **Discovery (Optional)**: A frontend admin panel can call the `/platform/plugins` endpoint (provided by `platformRegistryPlugin`) to get a list of all available plugins and render a marketplace or settings UI.
3.  **Configuration**: An organization admin enables and configures plugins via the UI. These settings are saved as `OrganizationPluginConfig` records in the database (this logic is handled by the main application, not the registry).
4.  **Instantiation**: When a request for a specific organization arrives, the main application:
    a. Fetches all `OrganizationPluginConfig` records from the database.
    b. Calls `getEnabledPlugins(orgId, configs)`.
    c. This utility filters the configs for the current organization and passes them to `globalPluginRegistry.getBetterAuthPlugins()`.
    d. The registry iterates through the enabled plugins, finds their `PluginDefinition`, calls the `serverPlugin` factory function with the organization's specific config, and returns an array of fully instantiated plugins.
5.  **Execution**: This array of plugins is passed to the main `betterAuth({ plugins: [...] })` instance for that request, which then handles everything else (routing, hooks, database access via its adapter, etc.).

## Multi-Tenant Plugin Development Guidelines

### 1. Plugin Organization-Agnostic Design

Plugins should not contain organization-specific logic directly:

```typescript
// ✅ Good - Organization-agnostic
export const storagePlugin = (options) => {
  return {
    id: "storage",
    endpoints: {
      upload: createAuthEndpoint(
        "/storage/upload",
        { method: "POST" },
        async (ctx) => {
          // Use organization context if available, fallback to default
          const storage =
            ctx.getOrganizationStorage?.() || createDefaultStorage(options);
          // ... plugin logic
        },
      ),
    },
  };
};

// ❌ Bad - Organization-specific logic in plugin
export const storagePlugin = (options) => {
  return {
    id: "storage",
    endpoints: {
      upload: createAuthEndpoint(
        "/storage/upload",
        { method: "POST" },
        async (ctx) => {
          // Don't hardcode organization logic
          const orgId = ctx.headers.get("X-Organization-ID");
          const storage = createOrgStorage(orgId);
          // ...
        },
      ),
    },
  };
};
```

### 2. Context Injection Pattern

Use the injected context methods for organization-scoped resources:

```typescript
// Available context methods from Tenant Plugin
interface TenantContext {
  organization: Organization;
  getOrganizationStorage: () => Storage;
  getOrganizationDatabase: () => Database;
  getOrganizationConfig: (pluginId: string) => PluginConfig | null;
  validateApiKey: (key: string) => Promise<boolean>;
}
```

### 3. Configuration Schema Design

Design plugin configurations to be organization-specific:

```typescript
export const myPluginDefinition = createPluginDefinition({
  id: "my-plugin",
  configSchema: {
    type: "object",
    properties: {
      // Organization-specific settings
      maxItems: { type: "number", default: 1000 },
      allowedFileTypes: { type: "array", items: { type: "string" } },
      customDomain: { type: "string", optional: true },
    },
  },
  serverPlugin: (config) => myPlugin(config),
});
```

This design is simple, robust, and aligns perfectly with Better Auth's intended use, allowing for easy integration of both official and custom plugins while maintaining complete organization isolation.
