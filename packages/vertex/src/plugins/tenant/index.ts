import type { BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint, createAuthMiddleware } from "better-auth/api";
import type { Organization } from "better-auth/plugins";
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
  /**
   * Custom domain configurations for tenants
   */
  domainConfig: z
    .object({
      enabled: z.boolean(),
      sslConfig: z
        .object({
          autoSSL: z.boolean(),
          provider: z
            .union([z.literal("letsencrypt"), z.literal("custom")])
            .optional(),
        })
        .optional(),
    })
    .optional(),
  /**
   * Default configurations for new tenants
   */
  defaults: z
    .object({
      dbSchema: z.string().optional(),
      authConfig: z.record(z.unknown()).optional(),
      pluginConfigs: z.record(z.unknown()).optional(),
    })
    .optional(),
});

export type TenantPluginOptions = z.infer<typeof TenantPluginOptionsSchema>;

/**
 * Organization authentication configuration interface.
 */
export interface OrganizationAuthConfig {
  providers: {
    google?: { clientId: string; clientSecret: string; enabled: boolean };
    github?: { clientId: string; clientSecret: string; enabled: boolean };
    microsoft?: { clientId: string; clientSecret: string; enabled: boolean };
    oidc?: {
      issuer: string;
      clientId: string;
      clientSecret: string;
      enabled: boolean;
    };
  };
  settings: {
    allowSignup: boolean;
    requireEmailVerification: boolean;
    sessionExpiration: number; // in seconds
    redirectUrls: string[];
    customDomain?: string;
  };
}

export type Tenant = Organization & {
  dbSchema: string | null;
  authConfig: string | null;
  pluginConfigs: string | null;
  customDomain: string | null;
};

// Helper type for context with organization
export interface ContextWithOrganization {
  organization?: Tenant;
}

// Helper function to safely get organization from context
export const getOrganizationFromContext = (ctx: {
  context: unknown;
}): Tenant | undefined => {
  const context = ctx.context as ContextWithOrganization;
  return context.organization;
};

/**
 * The server-side implementation of the Tenant Plugin.
 * Provides multi-tenant data isolation and organization-specific configurations.
 * Works in conjunction with Better Auth's organization plugin.
 */
export const tenantPlugin = (
  options: TenantPluginOptions = {},
): BetterAuthPlugin => {
  const { organizationHeader = "X-Organization-ID" } = options;

  return {
    id: "tenant",

    // Extend Better Auth's organization table with tenant-specific fields
    schema: {
      organization: {
        fields: {
          dbSchema: {
            type: "string",
            required: false,
          },
          authConfig: {
            type: "string",
            required: false,
          },
          pluginConfigs: {
            type: "string",
            required: false,
          },
          customDomain: {
            type: "string",
            required: false,
          },
        },
      },
    },

    // Inject extended organization into context for all requests
    hooks: {
      before: [
        {
          matcher: () => true, // Apply to all requests
          handler: createAuthMiddleware(async (ctx) => {
            const organizationId = ctx.headers?.get(organizationHeader);

            if (organizationId && ctx.context.adapter) {
              const organization = (await ctx.context.adapter.findOne({
                model: "organization",
                where: [{ field: "id", operator: "eq", value: organizationId }],
              })) as Tenant | null;

              if (organization) {
                return {
                  context: {
                    ...ctx.context,
                    organization,
                  },
                };
              }
            }
          }),
        },
      ],
    },

    endpoints: {
      /**
       * Get current tenant configuration
       * GET /tenant/config
       */
      getConfig: createAuthEndpoint(
        "/tenant/config",
        {
          method: "GET",
        },
        async (ctx) => {
          const organization = getOrganizationFromContext(ctx);

          if (!organization) {
            return ctx.json(
              { success: false, error: "Organization context required" },
              { status: 401 },
            );
          }

          return ctx.json({
            success: true,
            result: {
              id: organization.id,
              name: organization.name,
              slug: organization.slug,
              createdAt: organization.createdAt,
              // Tenant-specific fields
              dbSchema: organization.dbSchema || null,
              authConfig: organization.authConfig
                ? JSON.parse(organization.authConfig)
                : null,
              pluginConfigs: organization.pluginConfigs
                ? JSON.parse(organization.pluginConfigs)
                : null,
              customDomain: organization.customDomain || null,
              metadata: organization.metadata || null,
            },
          });
        },
      ),

      /**
       * Update tenant configuration
       * PATCH /tenant/config
       */
      updateConfig: createAuthEndpoint(
        "/tenant/config",
        {
          method: "PATCH",
        },
        async (ctx) => {
          const organization = getOrganizationFromContext(ctx);

          if (!organization) {
            return ctx.json(
              { success: false, error: "Organization context required" },
              { status: 401 },
            );
          }

          const updateData = z
            .object({
              name: z.string().optional(),
              logo: z.string().optional(),
              metadata: z.record(z.unknown()).optional(),
              dbSchema: z.string().optional(),
              authConfig: z.record(z.unknown()).optional(),
              pluginConfigs: z.record(z.unknown()).optional(),
              customDomain: z.string().optional(),
            })
            .parse(ctx.body);

          // Prepare update object
          const updateObj: Partial<Tenant> = {};

          if (updateData.name !== undefined) updateObj.name = updateData.name;
          if (updateData.logo !== undefined) updateObj.logo = updateData.logo;
          if (updateData.metadata !== undefined)
            updateObj.metadata = JSON.stringify(updateData.metadata);
          if (updateData.dbSchema !== undefined)
            updateObj.dbSchema = updateData.dbSchema;
          if (updateData.authConfig !== undefined)
            updateObj.authConfig = JSON.stringify(updateData.authConfig);
          if (updateData.pluginConfigs !== undefined)
            updateObj.pluginConfigs = JSON.stringify(updateData.pluginConfigs);
          if (updateData.customDomain !== undefined)
            updateObj.customDomain = updateData.customDomain;

          // Update organization in database
          const updatedOrganization = (await ctx.context.adapter.update({
            model: "organization",
            where: [
              {
                field: "id",
                operator: "eq",
                value: organization.id,
              },
            ],
            update: updateObj,
          })) as Tenant;

          return ctx.json({
            success: true,
            result: {
              id: updatedOrganization.id,
              name: updatedOrganization.name,
              slug: updatedOrganization.slug,
              logo: updatedOrganization.logo,
              metadata: updatedOrganization.metadata,
              dbSchema: updatedOrganization.dbSchema,
              authConfig: updatedOrganization.authConfig
                ? JSON.parse(updatedOrganization.authConfig)
                : null,
              pluginConfigs: updatedOrganization.pluginConfigs
                ? JSON.parse(updatedOrganization.pluginConfigs)
                : null,
              customDomain: updatedOrganization.customDomain,
              createdAt: updatedOrganization.createdAt,
            },
          });
        },
      ),

      /**
       * Initialize tenant with default configurations
       * POST /tenant/initialize
       */
      initialize: createAuthEndpoint(
        "/tenant/initialize",
        {
          method: "POST",
        },
        async (ctx) => {
          const organization = getOrganizationFromContext(ctx);

          if (!organization) {
            return ctx.json(
              { success: false, error: "Organization context required" },
              { status: 401 },
            );
          }

          const initData = z
            .object({
              dbSchema: z.string().optional(),
              authConfig: z.record(z.unknown()).optional(),
              pluginConfigs: z.record(z.unknown()).optional(),
            })
            .parse(ctx.body);

          // Merge with defaults
          const defaultAuthConfig = options.defaults?.authConfig || {};
          const defaultPluginConfigs = options.defaults?.pluginConfigs || {};

          const finalAuthConfig = {
            ...defaultAuthConfig,
            ...initData.authConfig,
          };
          const finalPluginConfigs = {
            ...defaultPluginConfigs,
            ...initData.pluginConfigs,
          };

          // Update organization with initial configurations
          const updatedOrganization = (await ctx.context.adapter.update({
            model: "organization",
            where: [
              {
                field: "id",
                operator: "eq",
                value: organization.id,
              },
            ],
            update: {
              dbSchema: initData.dbSchema || options.defaults?.dbSchema,
              authConfig: JSON.stringify(finalAuthConfig),
              pluginConfigs: JSON.stringify(finalPluginConfigs),
            },
          })) as Tenant;

          return ctx.json({
            success: true,
            result: {
              id: updatedOrganization.id,
              name: updatedOrganization.name,
              initialized: true,
              dbSchema: updatedOrganization.dbSchema,
              authConfig: JSON.parse(updatedOrganization.authConfig || "{}"),
              pluginConfigs: JSON.parse(
                updatedOrganization.pluginConfigs || "{}",
              ),
            },
          });
        },
      ),

      /**
       * Get tenant statistics
       * GET /tenant/stats
       */
      getStats: createAuthEndpoint(
        "/tenant/stats",
        {
          method: "GET",
        },
        async (ctx) => {
          const organization = getOrganizationFromContext(ctx);

          if (!organization) {
            return ctx.json(
              { success: false, error: "Organization context required" },
              { status: 401 },
            );
          }

          // Get member count
          const memberCount = await ctx.context.adapter.count({
            model: "member",
            where: [
              {
                field: "organizationId",
                operator: "eq",
                value: organization.id,
              },
            ],
          });

          // Get invitation count
          const invitationCount = await ctx.context.adapter.count({
            model: "invitation",
            where: [
              {
                field: "organizationId",
                operator: "eq",
                value: organization.id,
              },
            ],
          });

          return ctx.json({
            success: true,
            result: {
              id: organization.id,
              name: organization.name,
              memberCount,
              invitationCount,
              hasCustomDomain: !!organization.customDomain,
              isConfigured: !!(
                organization.authConfig || organization.pluginConfigs
              ),
              createdAt: organization.createdAt,
            },
          });
        },
      ),
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
  status: "active",
  clientPlugin: tenantClientPlugin,
});
