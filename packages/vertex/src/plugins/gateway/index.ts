import type { BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint, sessionMiddleware } from "better-auth/api";
import {
  defineEventHandler,
  type EventHandler,
  proxyRequest,
  sendRedirect,
} from "h3";
import type { NitroRouteRules } from "nitropack";
import { z } from "zod";
import {
  createPluginDefinition,
  zodToAuthPluginSchema,
} from "../registry/utils";
import { getOrganizationFromContext } from "../tenant";
import { gatewayClientPlugin } from "./client";

// --- Type Definitions ---

/**
 * Zod schema for Gateway Plugin configuration options.
 */
export const GatewayPluginOptionsSchema = z.object({
  /**
   * A map of route patterns to their corresponding rules.
   * This structure is directly compatible with Nitro's `routeRules`.
   * @see https://nitro.unjs.io/config#routerules
   */
  routeRules: z.record(z.custom<NitroRouteRules>()).optional(),
});

export type GatewayPluginOptions = z.infer<typeof GatewayPluginOptionsSchema>;

// Gateway route schema using Zod (for type inference only)
export const routeSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  path: z.string(),
  method: z.string().optional(),
  target: z.string(),
  config: z.string().optional(), // JSON string
  enabled: z.boolean().optional(),
  createdAt: z.date(),
  updatedAt: z.date().nullable().optional(),
});

// Export types using z.infer (Better Auth style)
export type RouteRecord = z.infer<typeof routeSchema>;

// --- Main Plugin Implementation ---

export const gatewayPlugin = (
  options: GatewayPluginOptions = {},
): BetterAuthPlugin => {
  const { routeRules = {} } = options;
  const middlewares: BetterAuthPlugin["middlewares"] = [];

  // Store route rules for dynamic management
  const dynamicRouteRules = new Map<string, NitroRouteRules>();

  // Initialize with default route rules
  for (const path in routeRules) {
    const rule = routeRules[path];
    if (rule) {
      dynamicRouteRules.set(path, rule);
    }
  }

  // Create middlewares from route rules
  const createMiddlewareFromRule = (
    _path: string,
    rule: NitroRouteRules,
  ): EventHandler | undefined => {
    if (typeof rule !== "object" || rule === null) return undefined;

    let handler: EventHandler | undefined;

    if ("proxy" in rule && rule.proxy) {
      const proxyTarget =
        typeof rule.proxy === "string"
          ? rule.proxy
          : (rule.proxy as { to: string }).to;
      handler = defineEventHandler((event) =>
        proxyRequest(event, proxyTarget, { fetch }),
      );
    } else if ("redirect" in rule && rule.redirect) {
      const redirect =
        typeof rule.redirect === "string"
          ? { to: rule.redirect, statusCode: 302 }
          : rule.redirect;
      handler = defineEventHandler((event) =>
        sendRedirect(event, redirect.to, redirect.statusCode),
      );
    }

    return handler;
  };

  // Add initial middlewares
  for (const [path, rule] of dynamicRouteRules) {
    const handler = createMiddlewareFromRule(path, rule);
    if (handler) {
      middlewares.push({ path, middleware: handler });
    }
  }

  return {
    id: "gateway",
    middlewares,

    // Better Auth schema definitions
    schema: {
      // Extend organization with route configuration
      organization: {
        fields: {
          routeConfig: {
            type: "string", // JSON string for route configuration
            required: false,
          },
        },
      },

      // Convert Zod schema to Better Auth format
      route: zodToAuthPluginSchema(routeSchema),
    },

    endpoints: {
      /**
       * List all routes.
       * GET /gateway/routes
       */
      listRoutes: createAuthEndpoint(
        "/gateway/routes",
        {
          method: "GET",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          const organization = getOrganizationFromContext(ctx);
          const organizationId = organization?.id;

          if (!organizationId) {
            return ctx.json(
              { success: false, error: "Organization context required" },
              { status: 400 },
            );
          }

          try {
            // Use Better Auth's adapter API for database operations
            const routes = await ctx.context.adapter.findMany({
              model: "route",
              where: [
                {
                  field: "organizationId",
                  operator: "eq",
                  value: organizationId,
                },
              ],
            });

            console.log(
              `[Gateway] Listed ${routes.length} routes for org ${organizationId}`,
            );

            return ctx.json({
              success: true,
              result: (routes as RouteRecord[]).map((route) => ({
                id: route.id,
                path: route.path,
                method: route.method,
                target: route.target,
                config: route.config ? JSON.parse(route.config) : {},
                enabled: route.enabled ?? true,
                organizationId: route.organizationId,
                createdAt: route.createdAt,
                updatedAt: route.updatedAt,
              })),
            });
          } catch (error) {
            console.error("[Gateway] Error listing routes:", error);
            return ctx.json(
              {
                success: false,
                error: "Failed to list routes",
                details:
                  error instanceof Error ? error.message : "Unknown error",
              },
              { status: 500 },
            );
          }
        },
      ),

      /**
       * Create or update a route.
       * POST /gateway/routes
       */
      createRoute: createAuthEndpoint(
        "/gateway/routes",
        {
          method: "POST",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          const body = z
            .object({
              path: z.string(),
              method: z.string().optional(),
              target: z.string(),
              config: z.custom<NitroRouteRules>().optional(),
              enabled: z.boolean().optional(),
            })
            .parse(ctx.body);

          const organization = getOrganizationFromContext(ctx);
          const organizationId = organization?.id;

          if (!organizationId) {
            return ctx.json(
              { success: false, error: "Organization context required" },
              { status: 400 },
            );
          }

          try {
            const now = new Date();

            // Check if route already exists for this organization
            const existingRoute =
              await ctx.context.adapter.findOne<RouteRecord>({
                model: "route",
                where: [
                  {
                    field: "organizationId",
                    operator: "eq",
                    value: organizationId,
                  },
                  {
                    field: "path",
                    operator: "eq",
                    value: body.path,
                    connector: "AND",
                  },
                ],
              });

            let route: RouteRecord;
            if (existingRoute) {
              // Update existing route
              route = (await ctx.context.adapter.update({
                model: "route",
                where: [
                  {
                    field: "id",
                    operator: "eq",
                    value: existingRoute.id,
                  },
                ],
                update: {
                  method: body.method,
                  target: body.target,
                  config: body.config ? JSON.stringify(body.config) : null,
                  enabled: body.enabled ?? true,
                  updatedAt: now,
                },
              })) as RouteRecord;
            } else {
              // Create new route
              route = (await ctx.context.adapter.create({
                model: "route",
                data: {
                  organizationId,
                  path: body.path,
                  method: body.method,
                  target: body.target,
                  config: body.config ? JSON.stringify(body.config) : null,
                  enabled: body.enabled ?? true,
                  createdAt: now,
                  updatedAt: now,
                },
              })) as RouteRecord;
            }

            // Update runtime configuration if config provided
            if (body.config) {
              dynamicRouteRules.set(body.path, body.config);
            }

            console.log(
              `[Gateway] Route ${existingRoute ? "updated" : "created"} for org ${organizationId}, path ${body.path}`,
            );

            return ctx.json({
              success: true,
              result: {
                id: route.id,
                path: body.path,
                method: body.method,
                target: body.target,
                config: body.config || {},
                enabled: body.enabled ?? true,
                organizationId,
                createdAt: route.createdAt,
                updatedAt: route.updatedAt,
              },
            });
          } catch (error) {
            console.error("[Gateway] Error creating/updating route:", error);
            return ctx.json(
              {
                success: false,
                error: "Failed to create/update route",
                details:
                  error instanceof Error ? error.message : "Unknown error",
              },
              { status: 500 },
            );
          }
        },
      ),

      /**
       * Get a specific route.
       * GET /gateway/routes/:path
       */
      getRoute: createAuthEndpoint(
        "/gateway/routes/:path",
        {
          method: "GET",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          const { path } = ctx.params;
          const decodedPath = decodeURIComponent(path);
          const organization = getOrganizationFromContext(ctx);
          const organizationId = organization?.id;

          if (!organizationId) {
            return ctx.json(
              { success: false, error: "Organization context required" },
              { status: 400 },
            );
          }

          try {
            // Get route from database using Better Auth adapter
            const route = await ctx.context.adapter.findOne<RouteRecord>({
              model: "route",
              where: [
                {
                  field: "organizationId",
                  operator: "eq",
                  value: organizationId,
                },
                {
                  field: "path",
                  operator: "eq",
                  value: decodedPath,
                  connector: "AND",
                },
              ],
            });

            if (!route) {
              return ctx.json(
                { success: false, error: "Route not found" },
                { status: 404 },
              );
            }

            console.log(
              `[Gateway] Route retrieved for org ${organizationId}: ${decodedPath}`,
            );

            return ctx.json({
              success: true,
              result: {
                id: route.id,
                path: route.path,
                method: route.method,
                target: route.target,
                config: route.config ? JSON.parse(route.config) : {},
                enabled: route.enabled ?? true,
                organizationId: route.organizationId,
                createdAt: route.createdAt,
                updatedAt: route.updatedAt,
              },
            });
          } catch (error) {
            console.error("[Gateway] Error retrieving route:", error);
            return ctx.json(
              {
                success: false,
                error: "Failed to retrieve route",
                details:
                  error instanceof Error ? error.message : "Unknown error",
              },
              { status: 500 },
            );
          }
        },
      ),

      /**
       * Delete a route.
       * DELETE /gateway/routes/:path
       */
      deleteRoute: createAuthEndpoint(
        "/gateway/routes/:path",
        {
          method: "DELETE",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          const { path } = ctx.params;
          const decodedPath = decodeURIComponent(path);
          const organization = getOrganizationFromContext(ctx);
          const organizationId = organization?.id;

          if (!organizationId) {
            return ctx.json(
              { success: false, error: "Organization context required" },
              { status: 400 },
            );
          }

          try {
            // Check if route exists first
            const existingRoute =
              await ctx.context.adapter.findOne<RouteRecord>({
                model: "route",
                where: [
                  {
                    field: "organizationId",
                    operator: "eq",
                    value: organizationId,
                  },
                  {
                    field: "path",
                    operator: "eq",
                    value: decodedPath,
                    connector: "AND",
                  },
                ],
              });

            if (!existingRoute) {
              return ctx.json(
                { success: false, error: "Route not found" },
                { status: 404 },
              );
            }

            // Delete from database using Better Auth adapter
            await ctx.context.adapter.delete({
              model: "route",
              where: [
                {
                  field: "id",
                  operator: "eq",
                  value: existingRoute.id,
                },
              ],
            });

            // Remove from runtime configuration
            dynamicRouteRules.delete(decodedPath);

            console.log(
              `[Gateway] Route deleted for org ${organizationId}: ${decodedPath}`,
            );

            return ctx.json({
              success: true,
              result: {
                path: decodedPath,
                organizationId,
                deletedAt: new Date().toISOString(),
              },
            });
          } catch (error) {
            console.error("[Gateway] Error deleting route:", error);
            return ctx.json(
              {
                success: false,
                error: "Failed to delete route",
                details:
                  error instanceof Error ? error.message : "Unknown error",
              },
              { status: 500 },
            );
          }
        },
      ),

      /**
       * Get gateway status and statistics.
       * GET /gateway/status
       */
      getStatus: createAuthEndpoint(
        "/gateway/status",
        {
          method: "GET",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          const organization = getOrganizationFromContext(ctx);
          const organizationId = organization?.id;

          try {
            let totalRoutes = 0;
            let organizationRoutes = 0;

            if (organizationId) {
              // Count routes for this organization
              const routes = await ctx.context.adapter.findMany({
                model: "route",
                where: [
                  {
                    field: "organizationId",
                    operator: "eq",
                    value: organizationId,
                  },
                ],
              });
              organizationRoutes = routes.length;
            }

            // Count total routes across all organizations
            const allRoutes = await ctx.context.adapter.findMany({
              model: "route",
              where: [],
            });
            totalRoutes = allRoutes.length;

            return ctx.json({
              success: true,
              result: {
                total_routes: totalRoutes,
                organization_routes: organizationRoutes,
                runtime_routes: dynamicRouteRules.size,
                organizationId,
                uptime: process.uptime(),
                memory_usage: process.memoryUsage(),
                timestamp: new Date().toISOString(),
              },
            });
          } catch (error) {
            console.error("[Gateway] Error getting status:", error);
            return ctx.json({
              success: true,
              result: {
                total_routes: 0,
                organization_routes: 0,
                runtime_routes: dynamicRouteRules.size,
                organizationId,
                uptime: process.uptime(),
                memory_usage: process.memoryUsage(),
                timestamp: new Date().toISOString(),
                error: "Database query failed",
              },
            });
          }
        },
      ),
    },
  } satisfies BetterAuthPlugin;
};

export const gatewayPluginDefinition = createPluginDefinition(gatewayPlugin, {
  name: "API Gateway",
  description:
    "Provides edge routing gateway with dynamic route management and organization-scoped routing, following Better Auth patterns.",

  status: "active",
  clientPlugin: gatewayClientPlugin,
});
