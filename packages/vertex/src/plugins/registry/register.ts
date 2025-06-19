import { aiRouterPluginDefinition } from "../ai-router";
import { databasePluginDefinition } from "../database";
import { gatewayPluginDefinition } from "../gateway";
import { storagePluginDefinition } from "../storage";
import { tenantPluginDefinition } from "../tenant";
import { globalPluginRegistry } from "./registry";

/**
 * Registers all built-in plugins with the global registry.
 * This function is now async to handle the asynchronous creation of plugin definitions.
 */
export function registerBuiltinPlugins() {
  // The definitions are now created within their own modules.
  // We just need to import and register them.
  const definitions = [
    tenantPluginDefinition,
    storagePluginDefinition,
    databasePluginDefinition,
    aiRouterPluginDefinition,
    gatewayPluginDefinition,
  ];

  for (const definition of definitions) {
    globalPluginRegistry.register(definition);
  }

  console.log(
    "Built-in plugins registered:",
    globalPluginRegistry.getAll().length,
  );
}

/**
 * Initializes the plugin system by registering the built-in plugins.
 */
export function initializePluginSystem() {
  registerBuiltinPlugins();
}

// Auto-register plugins on server startup.
if (typeof process !== "undefined" && process.release?.name === "node") {
  initializePluginSystem();
}
