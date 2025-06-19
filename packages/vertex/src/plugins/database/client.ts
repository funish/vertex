import type { BetterAuthClientPlugin } from "better-auth/client";
import type { databasePlugin } from "./index";

/**
 * Client-side plugin for Database functionality.
 * Provides type-safe client methods for database operations.
 */
export const databaseClientPlugin = (): BetterAuthClientPlugin => {
  return {
    id: "database",
    $InferServerPlugin: {} as ReturnType<typeof databasePlugin>,
    getActions: ($fetch) => {
      return {
        /**
         * Get available database sources for the organization.
         */
        getDatabaseSources: async () => {
          return $fetch("/database/sources", {
            method: "GET",
          });
        },

        /**
         * Execute a SQL query on the organization's database schema.
         */
        executeQuery: async (data: { sql: string; params?: unknown[] }) => {
          return $fetch("/database/query", {
            method: "POST",
            body: data,
          });
        },

        /**
         * List all tables in the organization's schema.
         */
        listTables: async () => {
          return $fetch("/database/tables", {
            method: "GET",
          });
        },

        /**
         * Get detailed information about a specific table.
         */
        getTable: async (tableName: string) => {
          return $fetch(`/database/tables/${encodeURIComponent(tableName)}`, {
            method: "GET",
          });
        },

        /**
         * Create a new table in the organization's schema.
         */
        createTable: async (data: {
          name: string;
          columns: Array<{
            name: string;
            type: string;
            nullable?: boolean;
            primary_key?: boolean;
            unique?: boolean;
            default_value?: string;
          }>;
        }) => {
          return $fetch("/database/tables", {
            method: "POST",
            body: data,
          });
        },

        /**
         * Get database connection information and statistics.
         */
        getDatabaseInfo: async () => {
          return $fetch("/database/info", {
            method: "GET",
          });
        },

        /**
         * Test database connection health.
         */
        testConnection: async (data?: { databaseId?: string }) => {
          return $fetch("/database/test", {
            method: "POST",
            body: data || {},
          });
        },
      };
    },
  } satisfies BetterAuthClientPlugin;
};
