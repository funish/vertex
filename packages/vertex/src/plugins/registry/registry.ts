import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import type { BetterAuthClientPlugin } from "better-auth/client";
import { z } from "zod";
import type {
  OrganizationPluginConfig,
  PluginCategory,
  PluginDefinition,
  PluginStatus,
} from "./types";

/**
 * A central registry for managing all available Vertex plugins.
 * It allows registering new plugins and retrieving them.
 */
export class PluginRegistry {
  private plugins: Map<string, PluginDefinition> = new Map();

  /**
   * Registers a new plugin definition.
   * @param plugin The plugin definition to register.
   */
  register(plugin: PluginDefinition): void {
    this.validatePlugin(plugin);
    this.plugins.set(plugin.id, plugin);
  }

  /**
   * Retrieves a plugin definition by its ID.
   * @param id The ID of the plugin to retrieve.
   * @returns The plugin definition, or undefined if not found.
   */
  get(id: string): PluginDefinition | undefined {
    return this.plugins.get(id);
  }

  /**
   * Retrieves all registered plugin definitions.
   * @returns An array of all plugin definitions.
   */
  getAll(): PluginDefinition[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Filters the registered plugins based on provided criteria.
   * @param criteria The filter criteria (category, status, search term).
   * @returns An array of matching plugin definitions.
   */
  filter(criteria: {
    category?: PluginCategory;
    status?: PluginStatus;
    search?: string;
  }): PluginDefinition[] {
    let result = this.getAll();

    if (criteria.category) {
      result = result.filter((p) => p.category === criteria.category);
    }
    if (criteria.status) {
      result = result.filter((p) => p.status === criteria.status);
    }
    if (criteria.search) {
      const searchTerm = criteria.search.toLowerCase();
      result = result.filter(
        (p) =>
          (p.name?.toLowerCase().includes(searchTerm) ?? false) ||
          (p.description?.toLowerCase().includes(searchTerm) ?? false),
      );
    }

    return result;
  }

  /**
   * Gets the instantiated Better Auth plugins for a given set of enabled configurations.
   * @param enabledConfigs The configurations for enabled plugins.
   * @returns An object containing arrays of server and client Better Auth plugins.
   */
  getBetterAuthPlugins(enabledConfigs: OrganizationPluginConfig[]): {
    server: BetterAuthPlugin[];
    client: BetterAuthClientPlugin[];
  } {
    const serverPlugins: BetterAuthPlugin[] = [];
    const clientPlugins: BetterAuthClientPlugin[] = [];

    for (const config of enabledConfigs) {
      const definition = this.get(config.pluginId);

      if (definition && config.enabled) {
        if (definition.serverPlugin) {
          serverPlugins.push(definition.serverPlugin(config.config || {}));
        }
        if (definition.clientPlugin) {
          clientPlugins.push(definition.clientPlugin(config.config || {}));
        }
      }
    }

    return { server: serverPlugins, client: clientPlugins };
  }

  /**
   * Validates a plugin definition to ensure it meets the required format.
   * @param plugin The plugin definition to validate.
   */
  private validatePlugin(plugin: PluginDefinition): void {
    if (!plugin.id) {
      throw new Error("Plugin must have an id");
    }

    // Optional validation for version format if provided
    if (plugin.version && !/^\d+\.\d+\.\d+/.test(plugin.version)) {
      throw new Error(
        `Plugin version for '${plugin.id}' must follow semver format (e.g., '1.0.0')`,
      );
    }
  }
}

// Create a global instance of the plugin registry.
export const globalPluginRegistry = new PluginRegistry();

/**
 * A Better Auth plugin to manage the plugin registry itself.
 * It exposes endpoints to list available plugins and their details.
 */
export const platformRegistryPlugin = () => {
  return {
    id: "platform-registry",

    endpoints: {
      // Get all available plugins, with optional filtering.
      getAvailablePlugins: createAuthEndpoint(
        "/platform/plugins",
        {
          method: "GET",
          query: z
            .object({
              category: z.string().optional(),
              status: z.string().optional(),
              search: z.string().optional(),
            })
            .optional(),
        },
        async (ctx) => {
          const { category, status, search } = ctx.query || {};

          const plugins = globalPluginRegistry.filter({
            category: category as PluginCategory,
            status: status as PluginStatus,
            search,
          });

          return ctx.json({ plugins });
        },
      ),

      // Get the details of a single plugin by its ID.
      getPluginDetail: createAuthEndpoint(
        "/platform/plugins/:id",
        {
          method: "GET",
        },
        async (ctx) => {
          const { id } = ctx.params;
          const plugin = globalPluginRegistry.get(id);

          if (!plugin) {
            throw new APIError(404, { message: "Plugin not found" });
          }

          return ctx.json({ plugin });
        },
      ),
    },

    schema: {
      // This plugin itself does not require any database tables.
      // It serves metadata about other plugins.
    },
  } satisfies BetterAuthPlugin;
};
