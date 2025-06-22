import type { BetterAuthClientPlugin } from "better-auth/client";
import type { registryPlugin } from "./registry";

/**
 * Configuration options for the Registry Client Plugin.
 */
export interface RegistryClientOptions {
  /**
   * Base URL for registry operations.
   * @default "/registry"
   */
  baseURL?: string;
}

/**
 * Client-side plugin for Plugin Registry functionality.
 * Provides type-safe client methods for plugin discovery and management.
 */
export const registryClientPlugin = (
  options: RegistryClientOptions = {},
): BetterAuthClientPlugin => {
  const { baseURL = "/registry" } = options;

  return {
    id: "registry",
    $InferServerPlugin: {} as ReturnType<typeof registryPlugin>,
    getActions: ($fetch) => {
      return {
        /**
         * Get all available plugins from the registry.
         */
        getAvailablePlugins: async (filters?: {
          search?: string;
          status?: string;
        }) => {
          return $fetch(`${baseURL}/plugins`, {
            method: "GET",
            query: filters,
          });
        },

        /**
         * Get details of a specific plugin by its ID.
         */
        getPluginDetail: async (pluginId: string) => {
          return $fetch(`${baseURL}/plugins/${encodeURIComponent(pluginId)}`, {
            method: "GET",
          });
        },

        /**
         * Check if a plugin is available in the registry.
         */
        hasPlugin: async (pluginId: string) => {
          try {
            await $fetch(`${baseURL}/plugins/${encodeURIComponent(pluginId)}`, {
              method: "GET",
            });
            return true;
          } catch {
            return false;
          }
        },

        /**
         * Search plugins by query string.
         */
        searchPlugins: async (query: string) => {
          return $fetch(`${baseURL}/plugins`, {
            method: "GET",
            query: { search: query },
          });
        },

        /**
         * Get plugins by status.
         */
        getPluginsByStatus: async (
          status: "active" | "inactive" | "deprecated" | "beta",
        ) => {
          return $fetch(`${baseURL}/plugins`, {
            method: "GET",
            query: { status },
          });
        },
      };
    },
  } satisfies BetterAuthClientPlugin;
};
