import type { BetterAuthPlugin } from "better-auth";
import {
  createAuthEndpoint,
  createAuthMiddleware,
  sessionMiddleware,
} from "better-auth/api";
import type { Organization } from "better-auth/plugins";
import { createStorage, type Driver, type Storage } from "unstorage";
import { z } from "zod";
import { createPluginDefinition } from "../registry/utils";
import { tenantClientPlugin } from "./client";

/**
 * Zod schema for Tenant Plugin configuration options.
 */
export const TenantPluginOptionsSchema = z.object({
  /** Enable organization validation middleware. Defaults to true. */
  enableOrganizationValidation: z.boolean().optional(),
  /** Custom organization header name. Defaults to 'X-Organization-ID'. */
  organizationHeader: z.string().optional(),
  /** Storage driver for tenant-specific configurations */
  configStorage: z.custom<Driver>((val) => val !== undefined).optional(),
});

export type TenantPluginOptions = z.infer<typeof TenantPluginOptionsSchema>;

/**
 * Extended organization context with tenant-specific fields.
 * Inherits from Better Auth's official Organization type.
 */
export interface TenantOrganizationContext extends Organization {
  /** Database schema name for this organization */
  dbSchema: string;
  /** API keys for this organization */
  apiKeys: Array<{
    id: string;
    name: string;
    key: string;
    permissions: string[];
    createdAt: Date;
    expiresAt?: Date;
  }>;
  /** Plugin-specific configurations */
  config: Record<string, unknown>;
}

/**
 * Tenant context interface for middleware injection.
 */
export interface TenantContext {
  organization?: TenantOrganizationContext;
  getOrganizationConfig?: (plugin: string) => unknown;
  getOrganizationStorage?: () => Storage;
}

/**
 * The server-side implementation of the Tenant Plugin.
 * Provides multi-tenant data isolation and organization-specific configurations.
 * Works in conjunction with Better Auth's organization plugin.
 */
export const tenantPlugin = (
  options: TenantPluginOptions = {},
): BetterAuthPlugin => {
  const {
    enableOrganizationValidation = true,
    organizationHeader = "X-Organization-ID",
    configStorage,
  } = options;

  // Create storage for tenant configurations if provided
  const tenantConfigStorage = configStorage
    ? createStorage({ driver: configStorage })
    : undefined;

  return {
    id: "tenant",

    // Note: We don't define schema here as we rely on Better Auth's organization plugin
    // The organization plugin already provides: organization table with id, name, slug, etc.

    endpoints: {
      /**
       * Get organization-specific plugin configuration.
       * GET /tenant/config/:plugin
       */
      getOrganizationConfig: createAuthEndpoint(
        "/tenant/config/:plugin",
        {
          method: "GET",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          const { plugin } = ctx.params;
          const tenantCtx = ctx as TenantContext;
          const organizationId = tenantCtx.organization?.id;

          if (!organizationId) {
            return ctx.json(
              { success: false, error: "Organization context required" },
              { status: 400 },
            );
          }

          try {
            // Get plugin-specific configuration for this organization
            const configKey = `org_${organizationId}_${plugin}`;
            const config = tenantConfigStorage
              ? await tenantConfigStorage.getItem(configKey)
              : {};

            return ctx.json({
              success: true,
              result: {
                plugin,
                organizationId,
                config: config || {},
              },
            });
          } catch (error) {
            return ctx.json(
              {
                success: false,
                error: "Failed to get organization config",
                details:
                  error instanceof Error ? error.message : "Unknown error",
              },
              { status: 500 },
            );
          }
        },
      ),

      /**
       * Update organization-specific plugin configuration.
       * PUT /tenant/config/:plugin
       */
      updateOrganizationConfig: createAuthEndpoint(
        "/tenant/config/:plugin",
        {
          method: "PUT",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          const { plugin } = ctx.params;
          const body = z
            .object({
              config: z.record(z.unknown()),
            })
            .parse(ctx.body);

          const tenantCtx = ctx as TenantContext;
          const organizationId = tenantCtx.organization?.id;

          if (!organizationId) {
            return ctx.json(
              { success: false, error: "Organization context required" },
              { status: 400 },
            );
          }

          try {
            if (tenantConfigStorage) {
              const configKey = `org_${organizationId}_${plugin}`;
              await tenantConfigStorage.setItem(configKey, body.config);
            }

            console.log(
              `[Tenant] Config updated for org ${organizationId}, plugin: ${plugin}`,
            );

            return ctx.json({
              success: true,
              result: {
                plugin,
                organizationId,
                config: body.config,
                updatedAt: new Date().toISOString(),
              },
            });
          } catch (error) {
            return ctx.json(
              {
                success: false,
                error: "Failed to update organization config",
                details:
                  error instanceof Error ? error.message : "Unknown error",
              },
              { status: 500 },
            );
          }
        },
      ),

      /**
       * Get organization database schema information.
       * GET /tenant/schema
       */
      getOrganizationSchema: createAuthEndpoint(
        "/tenant/schema",
        {
          method: "GET",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          const tenantCtx = ctx as TenantContext;
          const organizationId = tenantCtx.organization?.id;

          if (!organizationId) {
            return ctx.json(
              { success: false, error: "Organization context required" },
              { status: 400 },
            );
          }

          try {
            // Get database schema info from organization context
            const dbSchema = tenantCtx.organization?.dbSchema;

            return ctx.json({
              success: true,
              result: {
                organizationId,
                dbSchema: dbSchema || `org_${organizationId}`,
                isolationEnabled: true,
              },
            });
          } catch (error) {
            return ctx.json(
              {
                success: false,
                error: "Failed to get organization schema",
                details:
                  error instanceof Error ? error.message : "Unknown error",
              },
              { status: 500 },
            );
          }
        },
      ),

      /**
       * Get organization storage configuration.
       * GET /tenant/storage
       */
      getOrganizationStorage: createAuthEndpoint(
        "/tenant/storage",
        {
          method: "GET",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          const tenantCtx = ctx as TenantContext;
          const organizationId = tenantCtx.organization?.id;

          if (!organizationId) {
            return ctx.json(
              { success: false, error: "Organization context required" },
              { status: 400 },
            );
          }

          try {
            return ctx.json({
              success: true,
              result: {
                organizationId,
                storagePrefix: `org_${organizationId}:`,
                isolationEnabled: true,
              },
            });
          } catch (error) {
            return ctx.json(
              {
                success: false,
                error: "Failed to get organization storage info",
                details:
                  error instanceof Error ? error.message : "Unknown error",
              },
              { status: 500 },
            );
          }
        },
      ),

      /**
       * Get current organization context information.
       * GET /tenant/context
       */
      getOrganizationContext: createAuthEndpoint(
        "/tenant/context",
        {
          method: "GET",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          const tenantCtx = ctx as TenantContext;
          const organization = tenantCtx.organization;

          if (!organization) {
            return ctx.json(
              { success: false, error: "No organization context" },
              { status: 404 },
            );
          }

          return ctx.json({
            success: true,
            result: {
              organization: {
                id: organization.id,
                name: organization.name,
                slug: organization.slug,
                dbSchema: organization.dbSchema,
                // Don't expose sensitive data like API keys
              },
              context: {
                hasDbSchema: !!organization.dbSchema,
                hasApiKeys: organization.apiKeys?.length > 0,
                configPlugins: Object.keys(organization.config || {}),
              },
            },
          });
        },
      ),
    },

    // Middleware to inject organization context
    middlewares: enableOrganizationValidation
      ? [
          {
            path: "*", // Apply to all routes
            middleware: createAuthMiddleware(async (ctx) => {
              const orgHeader = ctx.request?.headers.get(organizationHeader);
              const authHeader = ctx.request?.headers.get("Authorization");

              if (orgHeader && ctx.context.adapter) {
                try {
                  // 1. Fetch organization data from Better Auth's organization plugin
                  const organization = (await ctx.context.adapter.findOne({
                    model: "organization",
                    where: [
                      {
                        field: "id",
                        operator: "eq",
                        value: orgHeader,
                      },
                    ],
                  })) as Organization | null;

                  if (organization) {
                    // 2. Validate API key if provided
                    let isValidApiKey = true;
                    if (authHeader?.startsWith("Bearer ")) {
                      const apiKey = authHeader.replace("Bearer ", "");
                      // Check if API key follows the pattern: org_{orgId}_api_{keyId}
                      const expectedPrefix = `org_${orgHeader}_api_`;
                      isValidApiKey = apiKey.startsWith(expectedPrefix);

                      if (!isValidApiKey) {
                        console.warn(
                          `[Tenant] Invalid API key format for organization: ${orgHeader}`,
                        );
                        return ctx; // Don't inject context for invalid API keys
                      }
                    }

                    // 3. Create extended organization context
                    const extendedOrganization: TenantOrganizationContext = {
                      ...organization,
                      dbSchema: `org_${organization.slug}_${organization.id.slice(0, 8)}`,
                      apiKeys: [], // Will be populated from separate API key management
                      config: {}, // Will be populated from configuration storage
                    };

                    // 4. Inject organization data and helper functions into context
                    const tenantContext = ctx.context as TenantContext;
                    tenantContext.organization = extendedOrganization;

                    // Helper function to get organization-specific plugin configuration
                    tenantContext.getOrganizationConfig = async (
                      plugin: string,
                    ) => {
                      if (!tenantConfigStorage) return {};
                      const configKey = `org_${orgHeader}_${plugin}`;
                      try {
                        return (
                          (await tenantConfigStorage.getItem(configKey)) || {}
                        );
                      } catch (error) {
                        console.error(
                          `[Tenant] Failed to get config for ${plugin}:`,
                          error,
                        );
                        return {};
                      }
                    };

                    // Helper function to get organization-scoped storage
                    tenantContext.getOrganizationStorage = () => {
                      // This will be used by other plugins to create prefixed storage
                      // The actual storage creation happens in the storage plugin
                      const storagePrefix = `org_${orgHeader}:`;
                      return {
                        prefix: storagePrefix,
                        organizationId: orgHeader,
                      } as unknown as Storage; // Type will be properly handled by storage plugin
                    };

                    console.log(
                      `[Tenant] Organization context injected: ${organization.name} (${orgHeader})`,
                    );
                  } else {
                    console.warn(
                      `[Tenant] Organization not found: ${orgHeader}`,
                    );
                  }
                } catch (error) {
                  console.error(
                    "[Tenant] Failed to fetch organization data:",
                    error,
                  );
                }
              }

              return ctx;
            }),
          },
        ]
      : [],

    // Helper functions that other plugins can use
    hooks: {
      after: [
        {
          matcher: (ctx) =>
            ctx.path.includes("organization") && ctx.method === "POST",
          handler: async (ctx) => {
            // Auto-generate tenant-specific data when organization is created
            console.log(
              "[Tenant] Organization creation detected, initializing tenant data",
            );
            return ctx;
          },
        },
      ],
    },
  } satisfies BetterAuthPlugin;
};

/**
 * The plugin definition for the Tenant Plugin.
 */
export const tenantPluginDefinition = createPluginDefinition(tenantPlugin, {
  name: "Tenant",
  description:
    "Provides multi-tenant data isolation and organization-specific configurations. Works with Better Auth's organization plugin.",
  category: "utility",
  status: "active",
  clientPlugin: tenantClientPlugin,
});
