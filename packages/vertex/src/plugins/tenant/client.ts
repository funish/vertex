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
         * Get organization-specific plugin configuration.
         */
        getOrganizationConfig: async (plugin: string) => {
          return $fetch(`/tenant/config/${encodeURIComponent(plugin)}`, {
            method: "GET",
          });
        },

        /**
         * Update organization-specific plugin configuration.
         */
        updateOrganizationConfig: async (
          plugin: string,
          config: Record<string, unknown>,
        ) => {
          return $fetch(`/tenant/config/${encodeURIComponent(plugin)}`, {
            method: "PUT",
            body: { config },
          });
        },

        /**
         * Get organization database schema information.
         */
        getOrganizationSchema: async () => {
          return $fetch("/tenant/schema", {
            method: "GET",
          });
        },

        /**
         * Get organization storage configuration.
         */
        getOrganizationStorage: async () => {
          return $fetch("/tenant/storage", {
            method: "GET",
          });
        },

        /**
         * Get current organization context information.
         */
        getOrganizationContext: async () => {
          return $fetch("/tenant/context", {
            method: "GET",
          });
        },
      };
    },
  } satisfies BetterAuthClientPlugin;
};
