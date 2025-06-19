import type { BetterAuthClientPlugin } from "better-auth/client";
import type { storagePlugin } from "./index";

/**
 * Configuration options for the Storage Client Plugin.
 */
export interface StorageClientOptions {
  /**
   * Base URL for storage operations.
   * @default "/storage"
   */
  baseURL?: string;
}

/**
 * Client-side plugin for Storage functionality.
 * Provides type-safe client methods for key-value storage operations.
 */
export const storageClientPlugin = (
  options: StorageClientOptions = {},
): BetterAuthClientPlugin => {
  const { baseURL = "/storage" } = options;

  return {
    id: "storage",
    $InferServerPlugin: {} as ReturnType<typeof storagePlugin>,
    getActions: ($fetch) => {
      return {
        /**
         * Store a value with the given key.
         */
        setItem: async (
          key: string,
          value: unknown,
          metadata?: Record<string, unknown>,
        ) => {
          return $fetch(`${baseURL}/${encodeURIComponent(key)}`, {
            method: "POST",
            body: { value, metadata },
          });
        },

        /**
         * Retrieve a value by its key.
         */
        getItem: async (key: string) => {
          return $fetch(`${baseURL}/${encodeURIComponent(key)}`, {
            method: "GET",
          });
        },

        /**
         * Remove a value by its key.
         */
        removeItem: async (key: string) => {
          return $fetch(`${baseURL}/${encodeURIComponent(key)}`, {
            method: "DELETE",
          });
        },

        /**
         * List all storage keys for the organization.
         */
        listKeys: async () => {
          return $fetch(baseURL, {
            method: "GET",
          });
        },

        /**
         * Get storage statistics and usage information.
         */
        getStorageStats: async () => {
          return $fetch(`${baseURL}/stats`, {
            method: "GET",
          });
        },

        /**
         * Check if a key exists in storage.
         */
        hasItem: async (key: string) => {
          try {
            await $fetch(`${baseURL}/${encodeURIComponent(key)}`, {
              method: "GET",
            });
            return true;
          } catch {
            return false;
          }
        },

        /**
         * Get multiple items at once.
         */
        getItems: async (keys: string[]) => {
          const results = await Promise.allSettled(
            keys.map((key) =>
              $fetch(`${baseURL}/${encodeURIComponent(key)}`, {
                method: "GET",
              }),
            ),
          );

          return keys.reduce(
            (acc, key, index) => {
              const result = results[index];
              if (result && result.status === "fulfilled") {
                acc[key] = result.value;
              } else {
                acc[key] = null;
              }
              return acc;
            },
            {} as Record<string, unknown>,
          );
        },

        /**
         * Set multiple items at once.
         */
        setItems: async (items: Record<string, unknown>) => {
          const results = await Promise.allSettled(
            Object.entries(items).map(([key, value]) =>
              $fetch(`${baseURL}/${encodeURIComponent(key)}`, {
                method: "POST",
                body: { value },
              }),
            ),
          );

          const keys = Object.keys(items);
          return results.map((result, index) => ({
            key: keys[index],
            success: result.status === "fulfilled",
            error: result.status === "rejected" ? String(result.reason) : null,
          }));
        },
      };
    },
  } satisfies BetterAuthClientPlugin;
};
