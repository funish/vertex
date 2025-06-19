# Developer Quickstart Guide

## 🚀 Welcome to Funish Vertex

This guide will help you quickly understand the Funish Vertex project structure and start developing plugins for our multi-tenant Better Auth platform.

## 📋 Prerequisites

- Node.js 18+ with pnpm
- PostgreSQL database
- Basic understanding of TypeScript, Nuxt 4, and Better Auth

## 🏗️ Project Architecture Overview

Funish Vertex is a **multi-tenant developer platform** built on Better Auth with a plugin-based architecture:

```
Platform Layer (Global)
├── Plugin Registry (Discovers & manages plugins)
├── Tenant Plugin (Multi-organization logic)
└── Core Plugins (Storage, Database, AI Router, Gateway)

Organization Layer (Per-tenant)
├── Organization A (Isolated data & config)
├── Organization B (Isolated data & config)
└── Organization C (Isolated data & config)
```

### Key Concepts

1. **Plugin-First Architecture**: Everything is a plugin, including multi-tenancy
2. **Organization Isolation**: Complete data separation between organizations
3. **Header-based Identification**: Organizations identified via `X-Organization-ID` header
4. **Context Injection**: Tenant plugin injects organization context into all plugins

## 🛠️ Development Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd funish-vertex
pnpm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Configure DATABASE_URL and other environment variables
```

### 3. Database Setup

```bash
# Run migrations
npx @better-auth/cli migrate
```

### 4. Start Development

```bash
pnpm dev
```

## 🔌 Plugin Development

### Creating a New Plugin

1. **Create plugin directory**:

   ```
   packages/vertex/src/plugins/my-plugin/
   ├── index.ts      # Server plugin
   ├── client.ts     # Client plugin
   └── types.ts      # Type definitions
   ```

2. **Server Plugin Template**:

```typescript
// packages/vertex/src/plugins/my-plugin/index.ts
import { createAuthEndpoint } from "better-auth/api";
import type { BetterAuthPlugin } from "better-auth";
import { z } from "zod";
import {
  createPluginDefinition,
  zodToAuthPluginSchema,
} from "../registry/utils";
import type { TenantContext } from "../tenant";

// Define Zod schema for type inference
const myPluginDataSchema = z.object({
  id: z.string(),
  organizationId: z.string(), // ALWAYS REQUIRED for multi-tenant support
  name: z.string(),
  data: z.string(),
  createdAt: z.date(),
});

// Export TypeScript types
export type MyPluginData = z.infer<typeof myPluginDataSchema>;

export interface MyPluginOptions {
  maxItems?: number;
  allowedTypes?: string[];
}

export const myPlugin = (options: MyPluginOptions = {}): BetterAuthPlugin => {
  return {
    id: "my-plugin",

    // Convert Zod schema to Better Auth format
    schema: {
      myPluginData: zodToAuthPluginSchema(myPluginDataSchema),
    },

    // API endpoints
    endpoints: {
      createItem: createAuthEndpoint(
        "/my-plugin/items",
        {
          method: "POST",
          body: z.object({
            name: z.string(),
            data: z.string(),
          }),
        },
        async (ctx) => {
          // 1. Validate organization context
          if (!ctx.organization) {
            return ctx.json(
              { error: "Organization context required" },
              { status: 400 },
            );
          }

          // 2. Get organization-scoped configuration
          const tenantCtx = ctx as TenantContext;
          const config =
            tenantCtx.getOrganizationConfig?.("my-plugin") || options;

          // 3. Create item with organization scoping
          const item = (await ctx.context.adapter.create({
            model: "myPluginData",
            data: {
              organizationId: ctx.organization.id,
              name: ctx.body.name,
              data: ctx.body.data,
              createdAt: new Date(),
            },
          })) as MyPluginData;

          return ctx.json({ success: true, id: item.id });
        },
      ),

      getItems: createAuthEndpoint(
        "/my-plugin/items",
        { method: "GET" },
        async (ctx) => {
          if (!ctx.organization) {
            return ctx.json(
              { error: "Organization context required" },
              { status: 400 },
            );
          }

          const items = (await ctx.context.adapter.findMany({
            model: "myPluginData",
            where: [
              {
                field: "organizationId",
                operator: "eq",
                value: ctx.organization.id,
              },
            ],
          })) as MyPluginData[];

          return ctx.json({ items });
        },
      ),
    },
  } satisfies BetterAuthPlugin;
};

// Plugin definition for registry
export const myPluginDefinition = createPluginDefinition({
  id: "my-plugin",
  name: "My Plugin",
  description: "A sample plugin with multi-tenant support",
  version: "1.0.0",
  author: "Your Name",
  category: "utility",
  status: "active",

  configSchema: {
    type: "object",
    properties: {
      maxItems: { type: "number", default: 1000 },
      allowedTypes: {
        type: "array",
        items: { type: "string" },
        default: ["text", "json"],
      },
    },
  },

  serverPlugin: myPlugin,
  clientPlugin: myPluginClient,
});
```

3. **Client Plugin Template**:

```typescript
// packages/vertex/src/plugins/my-plugin/client.ts
import type { BetterAuthClientPlugin } from "better-auth/client";
import type { myPlugin } from "./index";

export const myPluginClient = () => {
  return {
    id: "my-plugin",
    $InferServerPlugin: {} as ReturnType<typeof myPlugin>,

    getActions: ($fetch) => ({
      createItem: async (
        data: { name: string; data: string },
        orgId: string,
        apiKey: string,
      ) => {
        return $fetch("/my-plugin/items", {
          method: "POST",
          body: data,
          headers: {
            "X-Organization-ID": orgId,
            Authorization: `Bearer ${apiKey}`,
          },
        });
      },

      getItems: async (orgId: string, apiKey: string) => {
        return $fetch("/my-plugin/items", {
          method: "GET",
          headers: {
            "X-Organization-ID": orgId,
            Authorization: `Bearer ${apiKey}`,
          },
        });
      },
    }),
  } satisfies BetterAuthClientPlugin;
};
```

4. **Register the Plugin**:

```typescript
// packages/vertex/src/plugins/registry/register.ts
import { myPluginDefinition } from "../my-plugin";

export function registerBuiltinPlugins() {
  globalPluginRegistry.register(storagePluginDefinition);
  globalPluginRegistry.register(databasePluginDefinition);
  globalPluginRegistry.register(aiRouterPluginDefinition);
  globalPluginRegistry.register(gatewayPluginDefinition);
  globalPluginRegistry.register(tenantPluginDefinition);
  globalPluginRegistry.register(myPluginDefinition); // Add your plugin
}
```

5. **Add Schema and Type Generation**:

```typescript
// packages/vertex/src/plugins/my-plugin/index.ts (continued)
import { z } from "zod";
import { zodToAuthPluginSchema } from "../registry/utils";

// Define Zod schema for type inference
const myPluginDataSchema = z.object({
  id: z.string(),
  organizationId: z.string(), // ALWAYS REQUIRED for multi-tenant support
  name: z.string(),
  data: z.string(),
  createdAt: z.date(),
});

// Export TypeScript types using z.infer
export type MyPluginData = z.infer<typeof myPluginDataSchema>;

// Update plugin to use schema conversion
export const myPlugin = (options: MyPluginOptions = {}): BetterAuthPlugin => {
  return {
    id: "my-plugin",

    // Convert Zod schema to Better Auth format
    schema: {
      myPluginData: zodToAuthPluginSchema(myPluginDataSchema, {
        // Optional: Add foreign key mappings
        foreignKeys: {
          organizationId: { model: "organization", field: "id" },
        },
        // Optional: Disable migration if needed
        disableMigration: false,
        // Optional: Custom model name
        modelName: "my_plugin_data",
      }),
    },

    // ... rest of plugin implementation
  } satisfies BetterAuthPlugin;
};
```

6. **Export the Plugin**:

```typescript
// packages/vertex/src/plugins/index.ts
export * from "./my-plugin";
```

## 🔐 Multi-Tenant Development Rules

### ✅ DO

1. **Always validate organization context**:

   ```typescript
   if (!ctx.organization) {
     return ctx.json(
       { error: "Organization context required" },
       { status: 400 },
     );
   }
   ```

2. **Use organization-scoped configuration and Better Auth adapter**:

   ```typescript
   const tenantCtx = ctx as TenantContext;
   const config = tenantCtx.getOrganizationConfig?.("my-plugin") || {};
   const storage = tenantCtx.getOrganizationStorage?.();
   // Use ctx.context.adapter for database operations
   ```

3. **Include organizationId in database schemas**:

   ```typescript
   schema: {
     myTable: {
       fields: {
         organizationId: { type: "string", required: true }, // REQUIRED
         // ... other fields
       },
     },
   }
   ```

4. **Scope all database queries**:

   ```typescript
   const items = (await ctx.context.adapter.findMany({
     model: "myTable",
     where: [
       {
         field: "organizationId",
         operator: "eq",
         value: ctx.organization.id, // Always scope
       },
     ],
   })) as MyTableData[];
   ```

5. **Use header-based organization identification**:
   ```http
   X-Organization-ID: acme-corp
   Authorization: Bearer org_acme-corp_api_{keyId}
   ```

### ❌ DON'T

1. **Don't hardcode organization logic in plugins**
2. **Don't use path-based organization identification** (`/org/{id}/endpoint`)
3. **Don't make unscoped database queries**
4. **Don't store organization data in global storage**
5. **Don't forget to test data isolation between organizations**

## 🧪 Testing Your Plugin

```typescript
// tests/my-plugin.test.ts
import { describe, it, expect } from "vitest";
import { myPlugin } from "../packages/vertex/src/plugins/my-plugin";

describe("My Plugin Multi-Tenant", () => {
  const org1 = { id: "org1", name: "Organization 1" };
  const org2 = { id: "org2", name: "Organization 2" };

  it("should isolate data between organizations", async () => {
    const ctx1 = createMockContext({ organization: org1 });
    const ctx2 = createMockContext({ organization: org2 });

    // Create items for each organization
    const ctx1 = createMockContext({
      organization: org1,
      body: { name: "Item 1", data: "Org 1 data" },
    });
    const ctx2 = createMockContext({
      organization: org2,
      body: { name: "Item 2", data: "Org 2 data" },
    });

    await myPlugin().endpoints.createItem(ctx1);
    await myPlugin().endpoints.createItem(ctx2);

    // Verify data isolation
    const org1Response = await myPlugin().endpoints.getItems(
      createMockContext({ organization: org1 }),
    );
    const org2Response = await myPlugin().endpoints.getItems(
      createMockContext({ organization: org2 }),
    );

    const org1Items = JSON.parse(org1Response.body).items as MyPluginData[];
    const org2Items = JSON.parse(org2Response.body).items as MyPluginData[];

    expect(org1Items).toHaveLength(1);
    expect(org2Items).toHaveLength(1);
    expect(org1Items[0].data).toBe("Org 1 data");
    expect(org2Items[0].data).toBe("Org 2 data");
  });
});
```

## 📚 API Usage Examples

### Making Organization-Scoped Requests

```typescript
// Client-side usage
const response = await fetch("/api/v1/my-plugin/items", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Organization-ID": "acme-corp",
    Authorization: "Bearer org_acme-corp_api_{keyId}",
  },
  body: JSON.stringify({
    name: "My Item",
    data: "Some data",
  }),
});
```

### Using the Better Auth Client

```typescript
// With Better Auth client
import { authClient } from "~/utils/auth-client";

const result = await authClient.myPlugin.createItem(
  { name: "My Item", data: "Some data" },
  "acme-corp",
  "org_acme-corp_api_{keyId}",
);
```

## 🔧 Debugging Tips

1. **Check organization context**: Ensure `ctx.organization` is available
2. **Verify API keys**: Use the correct format `org_{orgId}_api_{keyId}`
3. **Database queries**: Always include `organizationId` in WHERE clauses
4. **Storage keys**: Verify automatic prefixing with organization ID
5. **Headers**: Ensure `X-Organization-ID` and `Authorization` headers are set

## 📖 Further Reading

- [Architecture Design](./architecture-design.md) - Detailed system architecture
- [Plugin Registry Implementation](./plugin-registry-implementation.md) - Plugin system details
- [Multi-Tenant Plugin Development Rules](./.cursor/rules/multi-tenant-plugin-development.mdc) - Comprehensive development guidelines
- [Better Auth Plugin Structure](./.cursor/rules/better-auth-plugin-structure.mdc) - Plugin structure guidelines

## 🆘 Getting Help

1. Check the `.cursor/rules/` directory for development guidelines
2. Review existing plugins in `packages/vertex/src/plugins/` for examples
3. Ensure your plugin follows the multi-tenant patterns
4. Test data isolation between organizations thoroughly

Happy coding! 🎉
