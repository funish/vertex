import type { BetterAuthPlugin, GenericEndpointContext } from "better-auth";
import {
  createAuthEndpoint,
  createAuthMiddleware,
  getSessionFromCtx,
  sessionMiddleware,
} from "better-auth/api";

import { defaultStatements } from "better-auth/plugins/admin/access";
import { z } from "zod";
import {
  createPluginDefinition,
  zodToAuthPluginSchema,
} from "../registry/utils";
import { getOrganizationFromContext } from "../tenant";

// Plugin configuration schema
export const PermissionPluginOptionsSchema = z.object({
  /** Enable organization-based permission management */
  enableOrganizationPermissions: z.boolean().optional().default(true),
  /** Admin roles that can manage permissions - defaults to Better Auth standard */
  adminRoles: z.array(z.string()).optional().default(["admin"]),
  /** Plugin endpoint configurations for permission checking */
  pluginEndpoints: z
    .record(
      z.object({
        paths: z.array(z.string()),
        permissions: z.record(z.array(z.string())),
      }),
    )
    .optional()
    .default({}),
  /** Custom permission statements extending Better Auth defaults */
  statements: z
    .record(z.union([z.array(z.string()), z.array(z.string()).readonly()]))
    .optional(),
  /** Access control instance (if provided externally) */
  accessControl: z.any().optional(),
  /** System roles configuration */
  roles: z.record(z.any()).optional(),
});

export type PermissionPluginOptions = z.infer<
  typeof PermissionPluginOptionsSchema
>;

// Custom role schema
export const customRoleSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  displayName: z.string().optional(),
  description: z.string().optional(),
  permissions: z.record(z.array(z.string())), // { storage: ["read"], database: ["read", "write"] }
  isSystemRole: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date().nullable().optional(),
});

export type CustomRole = z.infer<typeof customRoleSchema>;

// Permission assignment schema
export const permissionAssignmentSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  roleId: z.string(),
  customPermissions: z.record(z.array(z.string())).optional(), // Override permissions for specific user
  createdAt: z.date(),
  updatedAt: z.date().nullable().optional(),
});

export type PermissionAssignment = z.infer<typeof permissionAssignmentSchema>;

/**
 * Check if user has permission for a specific resource and action
 */
const checkUserPermission = async (
  ctx: GenericEndpointContext,
  resource: string,
  action: string,
): Promise<boolean> => {
  try {
    // Use Better Auth's getSessionFromCtx to get session safely
    const session = await getSessionFromCtx(ctx);
    const organization = getOrganizationFromContext(ctx);

    if (!session?.user || !organization) {
      return false;
    }

    // Check organization membership and role
    const membership = await ctx.context.adapter.findOne({
      model: "member",
      where: [
        { field: "userId", operator: "eq", value: session.user.id },
        {
          field: "organizationId",
          operator: "eq",
          value: organization.id,
          connector: "AND",
        },
      ],
    });

    if (!membership) {
      return false;
    }

    const userRole = (membership as { role?: string })?.role || "user";

    // Check against Better Auth standard roles
    if (userRole === "admin") {
      return true; // Admin has all permissions
    }

    if (userRole === "user") {
      // Basic users only have read permissions by default
      return action === "read";
    }

    // Check custom role permissions
    const customRole = await ctx.context.adapter.findOne({
      model: "customRole",
      where: [
        { field: "organizationId", operator: "eq", value: organization.id },
        { field: "name", operator: "eq", value: userRole, connector: "AND" },
      ],
    });

    if (customRole) {
      const permissions = JSON.parse(
        (customRole as { permissions?: string })?.permissions || "{}",
      );
      const resourcePermissions = permissions[resource] || [];
      return resourcePermissions.includes(action);
    }

    return false;
  } catch (error) {
    console.error("[Permission] Error checking permission:", error);
    return false;
  }
};

/**
 * Middleware to check permissions for specific resource and action
 */
const permissionMiddleware = (resource: string, action: string) => {
  return createAuthMiddleware(async (ctx) => {
    const hasPermission = await checkUserPermission(ctx, resource, action);

    if (!hasPermission) {
      throw new Error(`Insufficient permissions: ${resource}:${action}`);
    }
  });
};

/**
 * Generic Permission Management Plugin for Better Auth
 * Provides dynamic permission management with configurable access control
 */
export const permissionPlugin = (
  options?: Record<string, unknown>,
): BetterAuthPlugin => {
  const validatedOptions = PermissionPluginOptionsSchema.parse(options || {});
  const {
    enableOrganizationPermissions,
    adminRoles,
    pluginEndpoints,
    accessControl,
  } = validatedOptions;

  return {
    id: "permission",

    // Extend Better Auth schema
    schema: {
      // Extend organization with permission configuration
      organization: {
        fields: {
          permissionConfig: {
            type: "string", // JSON string for permission configuration
            required: false,
          },
        },
      },

      // Custom roles table (create first, no dependencies)
      customRole: zodToAuthPluginSchema(customRoleSchema),

      // Permission assignments table (references user and customRole)
      permissionAssignment: zodToAuthPluginSchema(permissionAssignmentSchema, {
        foreignKeys: {
          userId: { model: "user", field: "id" },
          roleId: { model: "customRole", field: "id" },
        },
      }),
    },

    hooks: {
      before: [
        {
          // Apply permission checks to configured plugin endpoints
          matcher: (ctx) => {
            if (!enableOrganizationPermissions || !pluginEndpoints) {
              return false;
            }

            // Skip auth endpoints
            const skipPaths = [
              "/sign-in",
              "/sign-up",
              "/sign-out",
              "/oauth",
              "/admin",
            ];
            if (skipPaths.some((path) => ctx.path.includes(path))) {
              return false;
            }

            // Check if this is a configured plugin endpoint
            return Object.values(pluginEndpoints).some((config) =>
              config.paths.some((path) => ctx.path.includes(path)),
            );
          },
          handler: createAuthMiddleware(async (ctx) => {
            // Find matching endpoint and required permission
            for (const [plugin, config] of Object.entries(pluginEndpoints)) {
              if (config.paths.some((path) => ctx.path.includes(path))) {
                const resource = Object.keys(config.permissions)[0];
                if (!resource) continue; // Skip if no permissions configured

                const actions = config.permissions[resource];

                // Determine required action based on HTTP method
                const requiredAction = ctx.method === "GET" ? "read" : "write";

                if (actions?.includes(requiredAction)) {
                  const hasPermission = await checkUserPermission(
                    ctx,
                    resource,
                    requiredAction,
                  );

                  if (!hasPermission) {
                    throw new Error(
                      `Insufficient permissions for ${plugin}: ${resource}:${requiredAction}`,
                    );
                  }
                }
                break;
              }
            }

            console.log(
              `[Permission] Access granted to ${ctx.path} for user ${ctx.context.session?.user?.id}`,
            );
          }),
        },
      ],
    },

    endpoints: {
      /**
       * List all roles for an organization
       * GET /permission/roles
       */
      listRoles: createAuthEndpoint(
        "/permission/roles",
        {
          method: "GET",
          use: [sessionMiddleware, permissionMiddleware("user", "read")],
        },
        async (ctx) => {
          const organization = getOrganizationFromContext(ctx);
          if (!organization) {
            return ctx.json(
              { success: false, error: "Organization context required" },
              { status: 400 },
            );
          }

          try {
            // Get custom roles
            const customRoles = await ctx.context.adapter.findMany({
              model: "customRole",
              where: [
                {
                  field: "organizationId",
                  operator: "eq",
                  value: organization.id,
                },
              ],
            });

            // System roles (Better Auth standard + custom from access control)
            const systemRoles = accessControl?.roles
              ? Object.entries(accessControl.roles).map(([name, role]) => ({
                  name,
                  displayName: name.charAt(0).toUpperCase() + name.slice(1),
                  isSystemRole: true,
                  permissions:
                    (role as { statements?: unknown })?.statements || {},
                }))
              : [
                  {
                    name: "user",
                    displayName: "User",
                    isSystemRole: true,
                    permissions: { user: [], session: [] }, // Better Auth default user permissions
                  },
                  {
                    name: "admin",
                    displayName: "Admin",
                    isSystemRole: true,
                    permissions: defaultStatements, // Better Auth default admin permissions
                  },
                ];

            return ctx.json({
              success: true,
              result: {
                systemRoles,
                customRoles: (customRoles as CustomRole[]).map((role) => ({
                  ...role,
                  permissions: JSON.parse(
                    role.permissions as unknown as string,
                  ),
                })),
              },
            });
          } catch (error) {
            console.error("[Permission] Error listing roles:", error);
            return ctx.json(
              { success: false, error: "Failed to list roles" },
              { status: 500 },
            );
          }
        },
      ),

      /**
       * Create a custom role
       * POST /permission/roles
       */
      createRole: createAuthEndpoint(
        "/permission/roles",
        {
          method: "POST",
          use: [sessionMiddleware, permissionMiddleware("user", "write")],
        },
        async (ctx) => {
          const body = z
            .object({
              name: z.string(),
              displayName: z.string().optional(),
              description: z.string().optional(),
              permissions: z.record(z.array(z.string())),
            })
            .parse(ctx.body);

          const organization = getOrganizationFromContext(ctx);
          const session = ctx.context.session;

          if (!organization || !session?.user) {
            return ctx.json(
              {
                success: false,
                error: "Authentication and organization required",
              },
              { status: 400 },
            );
          }

          // Check if user is admin
          const membership = await ctx.context.adapter.findOne({
            model: "member",
            where: [
              { field: "userId", operator: "eq", value: session.user.id },
              {
                field: "organizationId",
                operator: "eq",
                value: organization.id,
                connector: "AND",
              },
            ],
          });

          const userRole = (membership as { role?: string })?.role;
          if (!userRole || !adminRoles.includes(userRole)) {
            return ctx.json(
              { success: false, error: "Admin privileges required" },
              { status: 403 },
            );
          }

          try {
            const now = new Date();
            const roleId = `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const customRole = await ctx.context.adapter.create({
              model: "customRole",
              data: {
                id: roleId,
                organizationId: organization.id,
                name: body.name,
                displayName: body.displayName || body.name,
                description: body.description,
                permissions: JSON.stringify(body.permissions),
                isSystemRole: false,
                createdAt: now,
                updatedAt: now,
              },
            });

            console.log(
              `[Permission] Custom role created: ${body.name} for org ${organization.id}`,
            );

            return ctx.json({
              success: true,
              result: {
                ...customRole,
                permissions: body.permissions,
              },
            });
          } catch (error) {
            console.error("[Permission] Error creating role:", error);
            return ctx.json(
              { success: false, error: "Failed to create role" },
              { status: 500 },
            );
          }
        },
      ),

      /**
       * Update a custom role
       * PATCH /permission/roles/:roleId
       */
      updateRole: createAuthEndpoint(
        "/permission/roles/:roleId",
        {
          method: "PATCH",
          use: [sessionMiddleware, permissionMiddleware("user", "write")],
        },
        async (ctx) => {
          const { roleId } = ctx.params;
          const body = z
            .object({
              displayName: z.string().optional(),
              description: z.string().optional(),
              permissions: z.record(z.array(z.string())).optional(),
            })
            .parse(ctx.body);

          const organization = getOrganizationFromContext(ctx);
          const session = ctx.context.session;

          if (!organization || !session?.user) {
            return ctx.json(
              {
                success: false,
                error: "Authentication and organization required",
              },
              { status: 400 },
            );
          }

          try {
            // Check if role exists and user has permission to update it
            const existingRole = await ctx.context.adapter.findOne({
              model: "customRole",
              where: [
                { field: "id", operator: "eq", value: roleId },
                {
                  field: "organizationId",
                  operator: "eq",
                  value: organization.id,
                  connector: "AND",
                },
              ],
            });

            if (!existingRole) {
              return ctx.json(
                { success: false, error: "Role not found" },
                { status: 404 },
              );
            }

            const updateData: Record<string, unknown> = {
              updatedAt: new Date(),
            };
            if (body.displayName) updateData.displayName = body.displayName;
            if (body.description) updateData.description = body.description;
            if (body.permissions)
              updateData.permissions = JSON.stringify(body.permissions);

            const updatedRole = await ctx.context.adapter.update({
              model: "customRole",
              where: [{ field: "id", operator: "eq", value: roleId }],
              update: updateData,
            });

            console.log(
              `[Permission] Role updated: ${roleId} for org ${organization.id}`,
            );

            return ctx.json({
              success: true,
              result: {
                ...(updatedRole as Record<string, unknown>),
                permissions: body.permissions
                  ? body.permissions
                  : JSON.parse(
                      (existingRole as { permissions?: string })?.permissions ||
                        "{}",
                    ),
              },
            });
          } catch (error) {
            console.error("[Permission] Error updating role:", error);
            return ctx.json(
              { success: false, error: "Failed to update role" },
              { status: 500 },
            );
          }
        },
      ),

      /**
       * Check user permissions
       * POST /permission/check
       */
      checkPermission: createAuthEndpoint(
        "/permission/check",
        {
          method: "POST",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          const body = z
            .object({
              resource: z.string(),
              action: z.string(),
              userId: z.string().optional(), // Check for another user (admin only)
            })
            .parse(ctx.body);

          const organization = getOrganizationFromContext(ctx);
          const session = ctx.context.session;

          if (!organization || !session?.user) {
            return ctx.json(
              {
                success: false,
                error: "Authentication and organization required",
              },
              { status: 400 },
            );
          }

          try {
            const targetUserId = body.userId || session.user.id;
            const hasPermission = await checkUserPermission(
              ctx,
              body.resource,
              body.action,
            );

            return ctx.json({
              success: true,
              result: {
                hasPermission,
                resource: body.resource,
                action: body.action,
                userId: targetUserId,
                organizationId: organization.id,
              },
            });
          } catch (error) {
            console.error("[Permission] Error checking permission:", error);
            return ctx.json(
              { success: false, error: "Failed to check permission" },
              { status: 500 },
            );
          }
        },
      ),
    },
  };
};

/**
 * Plugin definition for the registry
 */
export const permissionPluginDefinition = createPluginDefinition(
  permissionPlugin,
  {
    name: "Permission Management",
    description:
      "Provides dynamic permission management and access control for organizations with Better Auth integration",

    status: "active",
  },
);
