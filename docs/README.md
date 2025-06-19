# Funish Vertex - A Multi-Organization Developer Platform with Better Auth

> **For AI Developers**: This document is the core reference for the Funish Vertex project. Please read it thoroughly before starting development.

## 🎯 Project Overview

### Project Positioning

Funish Vertex is an enterprise-grade, multi-organization developer platform built on Better Auth. It leverages a plugin-based architecture to provide a complete infrastructure solution for modern applications. The platform features a dual-layer authentication architecture: a platform layer manages organizations and users, while each organization is provided with its own independent, configurable Better Auth instance and plugin ecosystem.

### Core Features

- **Dual-Layer Authentication**: Platform management + isolated Better Auth instances for each organization.
- **Plugin-Powered Ecosystem**: Functional extensions based on the Better Auth plugin system.
- **Multi-Organization Isolation**: Complete isolation of data, storage, and configuration between organizations.
- **Flexible Configuration**: Organizations can freely enable, disable, and configure the plugins they need.
- **Unified API**: Standardized RESTful API design.

### Technology Stack

- **Authentication Framework**: Better Auth (Core) + Custom Plugin Ecosystem
- **Frontend**: Nuxt 4 + Vue 3 + UnoCSS + PrimeVue
- **Backend**: Nitro (API Gateway) + Better Auth (Authentication)
- **Database**: Kysely (ORM) + PostgreSQL + Dynamic Schema Management
- **Storage**: Unstorage (Multi-Driver Abstraction) + Storage Server
- **AI Integration**: Vercel AI SDK + Provider Registry

## 🏗️ System Architecture

### Architectural Layers

```
┌──────────────────────────────────────────────────────────────┐
│                     Platform Layer                          │
│  ┌─────────────────┐    ┌─────────────────────────────────┐  │
│  │  Platform       │    │     Universal Plugin Registry   │  │
│  │  Configuration  │    │  ✓ Storage Plugin               │  │
│  │  - Base Plugins │    │  ✓ Database Plugin              │  │
│  │  - Global Rules │    │  ✓ AI Router Plugin             │  │
│  │  - Rate Limits  │    │  ✓ ...and other official plugins  │  │
│  └─────────────────┘    └─────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                                │ (Provides)
                                ▼
┌──────────────────────────────────────────────────────────────┐
│                    Organization Layer                        │
│  Organization A         Organization B      Organization C   │
│  ┌─────────────────┐   ┌─────────────────┐  ┌──────────────┐ │
│  │ Org A Config    │   │ Org B Config    │  │ Org C Config │ │
│  │ ├ + Storage(S3) │   │ ├ + Storage(R2) │  │ ├ + Database │ │
│  │ └ + AI Router   │   │ └ + Analytics   │  │ └ + AI Router│ │
│  └─────────────────┘   └─────────────────┘  └──────────────┘ │
└──────────────────────────────────────────────────────────────┘
                                │ (Configures)
                                ▼
┌──────────────────────────────────────────────────────────────┐
│                  Runtime Instances                          │
│    Better Auth Instance A   Better Auth Instance B  etc.     │
│  (Platform + Org A Config) (Platform + Org B Config)         │
└──────────────────────────────────────────────────────────────┘
```

### Plugin Ecosystem

Our platform is built around a powerful plugin system, managed by our **Plugin Registry**. This registry allows administrators to discover, enable, and configure plugins for each organization.

- **Gateway Plugin**: A comprehensive API gateway that provides routing, rate limiting, and API key authentication.
- **Storage Plugin**: Based on `unstorage`, providing multi-driver support (S3, R2, etc.) and tenant-isolated storage.
- **Database Plugin**: Based on `Kysely`, allowing for dynamic, isolated database schemas per organization.
- **AI Router Plugin**: Based on the `Vercel AI SDK`, enabling routing to multiple AI providers like OpenAI, Anthropic, and Groq.
- ...and many more, including official Better Auth plugins for payments, analytics, etc.

## 🗄️ Data Architecture

- **Platform-Level Data**: Manages core tables for `user`, `session`, `organization`, and `organization_plugin_config`.
- **Organization-Level Data**: Each organization gets its own database schema (e.g., `org_123_schema`), ensuring complete data isolation. Plugin-specific tables are created within this schema when a plugin is enabled.

## 📚 Documentation

### For Developers

- **[Developer Quickstart Guide](./developer-quickstart.md)** - Quick start guide for new developers
- **[Architecture Design](./architecture-design.md)** - Detailed system architecture
- **[Plugin Registry Implementation](./plugin-registry-implementation.md)** - Plugin system details

### For Contributors

- **[Multi-Tenant Plugin Development](./.cursor/rules/multi-tenant-plugin-development.mdc)** - Comprehensive development guidelines
- **[Better Auth Plugin Structure](./.cursor/rules/better-auth-plugin-structure.mdc)** - Plugin structure guidelines

## 📚 API Design

```
/api/v1/
├── platform/          # Platform Management API
│   ├── auth/          # Platform-level authentication
│   └── plugins/       # Plugin Registry discovery
└── {orgId}/           # Organization-specific API
    ├── auth/          # Organization-level authentication
    └── ...            # Plugin-specific routes (e.g., /storage/*)
```

## 🚀 Development Progress

### Phase 1: Core Architecture (In Progress)

- [x] Project initialization and documentation design
- [x] Better Auth platform-level setup
- [x] Plugin Registry architecture design and implementation
- [ ] Multi-organization dynamic schema management
- [ ] Basic API framework

### Phase 2: Core Plugin Development (Planned)

- [x] Storage Plugin (Unstorage integration)
- [x] Database Plugin (Kysely integration)
- [x] AI Router Plugin (Vercel AI SDK integration)
- [x] Gateway Plugin (Routing, Rate Limiting, API Keys)
- [ ] Basic organization management UI

## ⚠️ Development Guidelines

1.  **Align with Better Auth**: All plugins must be compatible with the `BetterAuthPlugin` interface.
2.  **Type Safety**: Use TypeScript strict mode and avoid `any`.
3.  **Organization Isolation**: Ensure complete data and configuration isolation between organizations.
4.  **API Versioning**: Maintain stable and versioned APIs.

### Key Implementation Concepts

#### 1. Dynamic `betterAuth` Instance Creation

```typescript
// Simplified example from server/utils/auth.ts

import { betterAuth } from "better-auth";
import { getEnabledPlugins } from "@funish/vertex/plugins/registry";

// Factory function to create a Better Auth instance for a specific organization
export const createAuthForOrganization = async (orgId: string) => {
  const allPluginConfigs = await loadAllOrgPluginConfigsFromDB();
  const { server: serverPlugins } = getEnabledPlugins(orgId, allPluginConfigs);

  return betterAuth({
    // ... base config
    plugins: serverPlugins, // Pass the dynamically instantiated plugins
  });
};
```

#### 2. Plugin Registration

```typescript
// Simplified example from packages/vertex/src/plugins/registry/register.ts

import { globalPluginRegistry } from "./registry";
import { storagePluginDefinition } from "../storage";

// Register all built-in plugins on startup
export function registerBuiltinPlugins() {
  globalPluginRegistry.register(storagePluginDefinition);
  // ... register other plugins
}
```
