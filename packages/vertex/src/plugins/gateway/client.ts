import type { BetterAuthClientPlugin } from "better-auth/client";
import type { NitroRouteRules } from "nitropack";
import type { gatewayPlugin } from "./index";

/**
 * Client-side plugin for Gateway functionality.
 * Provides type-safe client methods for route management.
 */
export const gatewayClientPlugin = (): BetterAuthClientPlugin => {
  return {
    id: "gateway",
    $InferServerPlugin: {} as ReturnType<typeof gatewayPlugin>,
    getActions: ($fetch) => {
      return {
        /**
         * List all routes configured for the organization.
         */
        listRoutes: async () => {
          return $fetch("/gateway/routes", {
            method: "GET",
          });
        },

        /**
         * Create or update a route configuration.
         */
        createRoute: async (data: { path: string; rule: NitroRouteRules }) => {
          return $fetch("/gateway/routes", {
            method: "POST",
            body: data,
          });
        },

        /**
         * Get configuration for a specific route.
         */
        getRoute: async (path: string) => {
          return $fetch(`/gateway/routes/${encodeURIComponent(path)}`, {
            method: "GET",
          });
        },

        /**
         * Delete a route configuration.
         */
        deleteRoute: async (path: string) => {
          return $fetch(`/gateway/routes/${encodeURIComponent(path)}`, {
            method: "DELETE",
          });
        },

        /**
         * Get gateway status and statistics.
         */
        getGatewayStatus: async () => {
          return $fetch("/gateway/status", {
            method: "GET",
          });
        },
      };
    },
  } satisfies BetterAuthClientPlugin;
};
