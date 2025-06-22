import type { BetterAuthClientPlugin } from "better-auth/client";
import type { tenantPlugin } from "./index";

/**
 * Client-side plugin for Tenant functionality.
 * Provides type-safe client methods for tenant-specific features like multi-tenant configurations.
 * Use Better Auth's organizationClient plugin for basic organization management.
 */
export const tenantClientPlugin = (): BetterAuthClientPlugin => {
  return {
    id: "tenant",
    $InferServerPlugin: {} as ReturnType<typeof tenantPlugin>,
    getActions: ($fetch) => {
      return {
        /**
         * Get current tenant configuration.
         */
        getConfig: async () => {
          return $fetch("/tenant/config", {
            method: "GET",
          });
        },

        /**
         * Update tenant configuration.
         */
        updateConfig: async (config: {
          name?: string;
          logo?: string;
          metadata?: Record<string, unknown>;
          dbSchema?: string;
          authConfig?: Record<string, unknown>;
          pluginConfigs?: Record<string, unknown>;
          customDomain?: string;
        }) => {
          return $fetch("/tenant/config", {
            method: "PATCH",
            body: config,
          });
        },

        /**
         * Initialize tenant with default configurations.
         */
        initialize: async (config?: {
          dbSchema?: string;
          authConfig?: Record<string, unknown>;
          pluginConfigs?: Record<string, unknown>;
        }) => {
          return $fetch("/tenant/initialize", {
            method: "POST",
            body: config || {},
          });
        },

        /**
         * Get tenant statistics.
         */
        getStats: async () => {
          return $fetch("/tenant/stats", {
            method: "GET",
          });
        },
      };
    },
  } satisfies BetterAuthClientPlugin;
};
