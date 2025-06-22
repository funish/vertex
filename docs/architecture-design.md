# Nuxt 4 + Better Auth Project Architecture

## Project Overview

This project is a modern full-stack application based on Nuxt 4 and Better Auth, utilizing TypeScript and a monorepo architecture. The project consists of a main application and an SDK package (`@funish/vertex`), designed to provide a seamless development experience for a multi-organization platform.

## Core Technologies

- **Framework**: Nuxt 4 (compatibilityVersion: 4)
- **Authentication**: Better Auth
- **Language**: TypeScript
- **Package Manager**: pnpm with workspaces
- **Build Tool**: tsdown (for the SDK package)
- **UI Framework**: PrimeVue + UnoCSS
- **Internationalization**: @nuxtjs/i18n
- **Testing**: Vitest

## Project File Structure

```
/
├── app/                          # Nuxt 4 main application
│   └── ... (Standard Nuxt 4 app structure)
│
├── server/                       # Main application server code
│   ├── api/
│   │   └── v1/
│   │       └── [...all].ts       # Catch-all for Better Auth
│   ├── plugins/
│   │   └── auth.ts               # Main Better Auth instance setup
│   └── utils/
│       └── auth.ts               # Better Auth server configuration
│
├── packages/                     # Monorepo packages
│   └── vertex/                   # @funish/vertex SDK package
│       ├── src/                  # Source code
│       │   ├── index.ts          # Main package entrypoint
│       │   ├── plugins/          # Re-usable Better Auth plugins
│       │   │   ├── ai-router/    # AI Router Plugin
│       │   │   ├── database/     # Database Plugin
│       │   │   ├── gateway/      # Gateway Plugin
│       │   │   ├── registry/     # Plugin Registry System
│       │   │   ├── storage/      # Storage Plugin
│       │   │   └── tenant/       # Tenant Plugin (Multi-Organization)
│       │   └── ...
│       ├── package.json
│       ├── tsdown.config.ts
│       └── tsconfig.json
│
├── docs/                         # Documentation
│   ├── README.md
│   ├── architecture-design.md
│   └── plugin-registry-implementation.md
│
├── ... (Other project configuration files)
│
└── pnpm-workspace.yaml
```

## Plugin System Example (`packages/vertex/src/plugins/storage/index.ts`)

Instead of a hypothetical `tenancy` plugin, here is the actual implementation of our `storage` plugin, which serves as a concrete example of our plugin architecture.

```typescript
// packages/vertex/src/plugins/storage/index.ts

// The server-side implementation of the Storage Plugin.
export const storagePlugin = (options: StoragePluginOptions = {}) => {
  // ... (implementation creates unstorage server) ...
  return {
    id: "storage",
    middlewares: [
      {
        path: serverPath,
        middleware: storageServer.handle,
      },
    ],
    // ... other hooks ...
  } satisfies BetterAuthPlugin;
};

// The plugin definition for the Storage Plugin.
export const storagePluginDefinition: PluginDefinition = {
  // Plugin-specific metadata
  id: "storage",
  name: "Storage Plugin",
  description:
    "Unified storage service based on unstorage, supporting multiple backends.",
  version: "1.0.0",
  author: "Funish Vertex Team",
  category: "storage",
  status: "active",

  // Factory functions
  serverPlugin: storagePlugin,
  clientPlugin: storageClientPlugin,

  // Metadata for UI and validation
  configSchema: {
    type: "object",
    properties: {
      defaultDriver: { type: "string", default: "memory" },
      // ... other properties
    },
  },
};
```

## Multi-Tenant Architecture Design

### Core Principle: Plugin Separation of Concerns

Our multi-tenant architecture follows a clear separation of concerns:

- **Core Plugins** (Storage, AI Router, Database, Gateway): Remain pure and organization-agnostic
- **Tenant Plugin**: Handles all multi-tenant logic, data isolation, and organization management
- **Plugin Registry**: Manages plugin discovery and instantiation

### Organization Identification Strategy

We use **Header-based Organization Identification** for API requests:

```http
POST /api/v1/storage/my-file
Headers:
  X-Organization-ID: acme-corp
  Authorization: Bearer org_api_key_xxx
  Content-Type: application/json
```

**Benefits:**

- Clean, unified URL structure
- Enhanced security (organization info not exposed in URLs)
- Simple implementation across all plugins
- Better caching and CDN compatibility

**Alternative Rejected Approaches:**

- Path-based organization identification (`/api/v1/org/{orgId}/storage/my-file`) was rejected due to URL complexity and security concerns
- Subdomain-based identification was rejected due to DNS complexity and certificate management overhead

### Data Isolation Strategy

Each organization's data is completely isolated using consistent naming patterns:

- **Storage Keys**: `org_{organizationId}:{userKey}`
  - Example: `org_acme-corp:user-avatar.jpg`
  - Implemented using unstorage's `prefixStorage()` utility
- **Database Schemas**: `org_{organizationSlug}_{uniqueId}`
  - Example: `org_acme_corp_a1b2c3d4`
  - Each organization gets its own database schema
- **API Keys**: `org_{organizationId}_api_{keyId}`
  - Example: `org_acme-corp_api_12345678`
  - Organization-specific API keys for authentication
- **Configuration**: Organization-specific plugin configurations stored in database

### Tenant Plugin Architecture

The Tenant Plugin acts as a foundation for multi-tenancy across all other plugins, using Better Auth's native hooks system:

```typescript
// Simplified Tenant Plugin implementation
export const tenantPlugin = (): BetterAuthPlugin => {
  return {
    id: "tenant",

    // Extend Better Auth's organization schema
    schema: {
      organization: {
        fields: {
          dbSchema: { type: "string", required: false },
          authConfig: { type: "string", required: false }, // JSON string
          pluginConfigs: { type: "string", required: false }, // JSON string
          customDomain: { type: "string", required: false },
        },
      },
    },

    // Use Better Auth hooks for organization context injection
    hooks: {
      before: [
        {
          matcher: (ctx) => ctx.path.startsWith("/api/v1/"),
          handler: async (ctx) => {
            const orgId = ctx.headers["x-organization-id"];
            if (orgId) {
              const organization = await getOrganizationFromDatabase(orgId);
              // Inject organization into Better Auth context
              (ctx.context as any).organization = organization;
            }
            return ctx;
          },
        },
      ],
    },

    // Organization management endpoints
    endpoints: {
      getConfig: "/tenant/config",
      updateConfig: "/tenant/config",
      initializeTenant: "/tenant/initialize",
      getStats: "/tenant/stats",
    },
  };
};

// Helper function for type-safe organization access
export const getOrganizationFromContext = (ctx: {
  context: unknown;
}): Tenant | undefined => {
  const context = ctx.context as { organization?: Tenant };
  return context.organization;
};
```

### Plugin Integration Pattern

Core plugins use the simplified helper function to access organization context:

```typescript
// Storage Plugin - clean organization context access
export const storagePlugin = (options) => {
  return {
    id: "storage",
    endpoints: {
      getItem: createAuthEndpoint(
        "/storage/:key",
        {
          method: "GET",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          // Get organization context using helper function
          const organization = getOrganizationFromContext(ctx);
          const organizationId = organization?.id;

          if (!organizationId) {
            return ctx.json(
              { error: "Organization context required" },
              { status: 400 },
            );
          }

          // Create organization-scoped storage
          const storage = await getOrganizationStorage(organizationId);
          const value = await storage.getItem(ctx.params.key);
          return ctx.json({ value });
        },
      ),
    },
  };
};
```

### Organization Context Interface

The simplified context approach uses a basic `Tenant` interface:

```typescript
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  // Extended tenant-specific fields
  dbSchema?: string;
  authConfig?: string; // JSON string for auth configuration
  pluginConfigs?: string; // JSON string for plugin configurations
  customDomain?: string;
  metadata?: any;
}

// Type-safe helper for context access
export interface ContextWithOrganization {
  organization?: Tenant;
}
```

## How Organizations Use Plugins (Updated Flow)

1.  **Installation**: The platform administrator installs the `@funish/vertex` package.
2.  **Registration**: On server startup, all plugin definitions are registered into the `globalPluginRegistry`.
3.  **Organization Setup**: When an organization is created, the Tenant Plugin:
    - Generates unique organization ID and database schema
    - Creates organization-specific API keys
    - Sets up data isolation boundaries
    - Initializes organization-specific storage namespace
4.  **Plugin Configuration**: Organization administrators configure plugins through the platform UI, with settings stored per-organization in the database.
5.  **Request Processing**: When a client makes a request:
    a. The Tenant Plugin middleware validates the `X-Organization-ID` header and API key.
    b. Organization context is injected into the request context via `TenantContext`.
    c. Core plugins access organization-scoped resources through the provided context methods.
    d. Data isolation is automatically maintained at the storage/database level.
6.  **Execution**: Users interact with organization-scoped plugin functionality, with complete data isolation between organizations.

## Integration with Better Auth Organization Plugin

Our tenant plugin is designed to work alongside Better Auth's official organization plugin:

- **Better Auth Organization Plugin**: Handles user-organization relationships, roles, and permissions
- **Our Tenant Plugin**: Provides infrastructure-level multi-tenancy (data isolation, API keys, resource management)
- **Combined Benefits**: Complete multi-organization solution with both user management and data isolation

### Type Integration

```typescript
// Extend Better Auth's organization types
interface ExtendedOrganization extends BetterAuthOrganization {
  // Infrastructure-specific fields
  dbSchema: string;
  storageQuota: number;
  storageUsed: number;
  apiKeys: OrganizationApiKey[];
  pluginConfigs: OrganizationPluginConfig[];
}
```

## Security Considerations

### API Key Management

- Organization API keys follow the pattern: `org_{organizationId}_api_{keyId}`
- Keys are hashed before storage using bcrypt
- Keys have configurable expiration dates
- Keys can be scoped to specific plugins or endpoints

### Data Isolation Validation

- All storage operations are automatically prefixed with organization ID
- Database queries are scoped to organization-specific schemas
- Cross-organization data access is prevented at the infrastructure level

### Rate Limiting

- Rate limits are applied per organization
- Different rate limits can be configured for different organization tiers
- Rate limiting is implemented at the API gateway level

## Performance Considerations

### Storage Optimization

- Organization-specific storage drivers can be configured
- Storage quotas are enforced at the plugin level
- Automatic cleanup of expired or deleted organization data

### Database Performance

- Organization schemas are indexed for optimal query performance
- Connection pooling is managed per organization
- Database migrations are applied per organization schema

### Caching Strategy

- Organization configurations are cached in memory
- API key validation results are cached with TTL
- Storage metadata is cached to reduce database queries

## 🚀 Development Progress

### Phase 1: Core Architecture (✅ Completed)

- [x] Project initialization and documentation design
- [x] Better Auth platform-level setup
- [x] Plugin Registry architecture design and implementation
- [x] Multi-organization dynamic schema management
- [x] Basic API framework

### Phase 2: Core Plugin Development (✅ Completed)

- [x] Storage Plugin (Unstorage integration)
- [x] Database Plugin (Kysely integration)
- [x] AI Router Plugin (Vercel AI SDK integration)
- [x] Gateway Plugin (Routing, Rate Limiting, API Keys)
- [x] Tenant Plugin (Multi-organization support)
- [x] Permission Plugin (Access control and role management)

### Phase 3: Backend Authentication Platform (✅ Completed)

- [x] **Multi-Tenant Authentication System**: Complete authentication-as-a-service platform backend
  - [x] Basic Authentication Framework with Better Auth
  - [x] OAuth Integration (Google, GitHub, Microsoft, etc.)
  - [x] Organization isolation and context injection
  - [x] Access Control Integration with Permission Plugin
  - [x] API Key authentication and validation

See [Multi-Tenant Authentication Platform Design](./multi-tenant-auth-platform-design.md) for detailed implementation details.

### Phase 4: Frontend Development (🔄 Current)

- [x] Better Auth Vue client integration
- [x] Basic authentication middleware
- [ ] Authentication UI components (Login, Register, OAuth)
- [ ] Organization management interface
- [ ] Plugin marketplace interface
- [ ] Dashboard and admin panels

### Phase 5: Platform Features (Planned)

- [ ] Advanced analytics and monitoring
- [ ] Enterprise features (SAML, MFA, etc.)
- [ ] Custom domain management UI
- [ ] Advanced role and permission management
