import type { BetterAuthPlugin } from "better-auth";
import type { BetterAuthClientPlugin } from "better-auth/client";
import type { PackageJson } from "pkg-types";
/**
 * The configuration for a plugin specific to an organization.
 */
export interface OrganizationPluginConfig {
  organizationId: string;
  pluginId: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

/**
 * Defines the category of a plugin for organizational purposes.
 */
export type PluginCategory =
  | "auth"
  | "storage"
  | "database"
  | "ai"
  | "payment"
  | "communication"
  | "analytics"
  | "social"
  | "multimedia"
  | "security"
  | "utility"
  | "other";

/**
 * Defines the development status of a plugin.
 */
export type PluginStatus = "active" | "inactive" | "deprecated" | "beta";

/**
 * The core metadata for a plugin, used for discovery and UI rendering.
 * This information is typically provided manually when defining a plugin.
 */
export interface PluginMetadata extends PackageJson {
  category?: PluginCategory;
  status: PluginStatus;
  clientPlugin?: (options: Record<string, unknown>) => BetterAuthClientPlugin;
}

/**
 * Represents the complete definition of a plugin, combining automatically
 * inferred properties from its implementation with manually provided metadata.
 */
export interface PluginDefinition extends PluginMetadata {
  id: string;
  serverPlugin: (options: Record<string, unknown>) => BetterAuthPlugin;
  configSchema?: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

/**
 * Defines the schema for a plugin's configuration options (JSON Schema format).
 */
export interface PluginConfigSchema {
  type: "object";
  properties: Record<
    string,
    {
      type: string;
      description?: string;
      default?: unknown;
      required?: boolean;
    }
  >;
  required?: string[];
  additionalProperties?: boolean;
}

/**
 * Defines an API route exposed by a plugin.
 */
export interface PluginAPIRoute {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  description: string;
  requestSchema?: Record<string, unknown>;
  responseSchema?: Record<string, unknown>;
  requiresAuth?: boolean;
}
