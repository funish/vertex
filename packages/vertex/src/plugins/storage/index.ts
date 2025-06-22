import type { BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint, sessionMiddleware } from "better-auth/api";
import {
  createStorage,
  type Driver,
  prefixStorage,
  type StorageValue,
  type StorageMeta as UnstorageMeta,
} from "unstorage";
import { z } from "zod";
import {
  createPluginDefinition,
  zodToAuthPluginSchema,
} from "../registry/utils";
import { getOrganizationFromContext } from "../tenant";
import { storageClientPlugin } from "./client";

/**
 * Zod schema for Storage Plugin configuration options.
 */
export const StoragePluginOptionsSchema = z.object({
  /**
   * The storage driver to use.
   * If not provided, defaults to memory driver.
   * @see https://unstorage.unjs.io/drivers
   */
  driver: z.custom<Driver>((val) => val !== undefined).optional(),
  /**
   * Base prefix for all storage keys.
   * @default "vertex:"
   */
  basePrefix: z.string().optional(),
});

export type StoragePluginOptions = z.infer<typeof StoragePluginOptionsSchema>;

// Storage schema using Zod (for type inference only)
export const storageItemSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  key: z.string(),
  metadata: z.string().optional(), // JSON string for user-defined metadata
  accessedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date().nullable().optional(),
});

// Export types using z.infer (Better Auth style)
export type StorageItem = z.infer<typeof storageItemSchema>;

/**
 * metadata stored in unstorage (for fast access, no DB queries needed)
 */
interface StorageMeta extends UnstorageMeta {
  mimeType: string;
  isRaw: boolean;
  storedAt: string;
  size: number;
}

/**
 * Helper function to detect if data is binary
 */
const isBinaryData = (data: unknown): boolean => {
  return (
    data instanceof ArrayBuffer ||
    data instanceof Uint8Array ||
    data instanceof Buffer ||
    (typeof data === "object" && data !== null && "buffer" in data)
  );
};

/**
 * Helper function to get MIME type from data or headers
 */
const getMimeType = (data: unknown, contentType?: string): string => {
  if (contentType) {
    return contentType;
  }

  if (isBinaryData(data)) {
    return "application/octet-stream";
  }

  if (typeof data === "string") {
    // Try to detect if it's JSON
    try {
      JSON.parse(data);
      return "application/json";
    } catch {
      return "text/plain";
    }
  }

  if (typeof data === "object") {
    return "application/json";
  }

  return "text/plain";
};

/**
 * Helper function to calculate data size in bytes
 */
const calculateDataSize = (data: unknown, isRaw: boolean): number => {
  if (isRaw && isBinaryData(data)) {
    if (data instanceof ArrayBuffer) {
      return data.byteLength;
    }
    if (data instanceof Uint8Array || data instanceof Buffer) {
      return data.length;
    }
  }

  // For non-binary data, calculate JSON string size
  const serialized = JSON.stringify(data);
  return new TextEncoder().encode(serialized).length;
};

/**
 * Store metadata using unstorage's native setMeta
 */
const setStorageMeta = async (
  storage: ReturnType<typeof createStorage>,
  key: string,
  meta: StorageMeta,
) => {
  await storage.setMeta(key, meta);
};

/**
 * Get metadata using unstorage's native getMeta
 */
const getStorageMeta = async (
  storage: ReturnType<typeof createStorage>,
  key: string,
): Promise<StorageMeta | null> => {
  const meta = await storage.getMeta(key);
  return meta as StorageMeta | null;
};

/**
 * The server-side implementation of the Storage Plugin.
 * Provides organization-scoped storage management with Better Auth integration.
 */
export const storagePlugin = (
  options: StoragePluginOptions = {},
): BetterAuthPlugin => {
  const { driver, basePrefix = "vertex:" } = options;

  // Create the base storage instance with driver or default to memory
  const baseStorage = createStorage(driver ? { driver } : {});

  return {
    id: "storage",

    // Better Auth schema definitions using converted Zod schemas
    schema: {
      // Extend organization with storage configuration
      organization: {
        fields: {
          storageQuota: {
            type: "number", // bytes
            required: false,
          },
          storageUsed: {
            type: "number", // bytes
            required: false,
          },
          storageConfig: {
            type: "string", // JSON string for storage settings
            required: false,
          },
        },
      },

      // Convert Zod schema to Better Auth format
      storageItem: zodToAuthPluginSchema(storageItemSchema),
    },

    endpoints: {
      /**
       * Store a value with intelligent binary/text detection.
       * POST /storage/:key
       */
      setItem: createAuthEndpoint(
        "/storage/:key",
        {
          method: "POST",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          const { key } = ctx.params;
          const organization = getOrganizationFromContext(ctx);
          const organizationId = organization?.id;

          if (!organizationId) {
            return ctx.json(
              { success: false, error: "Organization context required" },
              { status: 400 },
            );
          }

          try {
            // Create organization-scoped storage
            const orgStorage = prefixStorage(
              baseStorage,
              `${basePrefix}org_${organizationId}:`,
            );

            const contentType = ctx.request?.headers?.get("content-type") || "";
            const forceRaw = ctx.request
              ? new URL(ctx.request.url).searchParams.get("raw") === "true"
              : false;

            let isRaw: boolean;
            let mimeType: string;
            let data: unknown;
            let itemSize: number;

            // Handle binary data (raw request body)
            if (
              forceRaw ||
              contentType.startsWith("application/octet-stream") ||
              contentType.startsWith("image/") ||
              contentType.startsWith("video/") ||
              contentType.startsWith("audio/")
            ) {
              // Get raw binary data
              data = (await ctx.request?.arrayBuffer?.()) || new ArrayBuffer(0);
              isRaw = true;
              mimeType = contentType || "application/octet-stream";
              itemSize = (data as ArrayBuffer).byteLength;

              // Store binary data using setItemRaw
              await orgStorage.setItemRaw(key, data);
            } else {
              // Handle text/JSON data
              const body = z
                .object({
                  value: z.unknown(),
                  metadata: z.record(z.unknown()).optional(),
                })
                .parse(ctx.body);

              data = body.value;
              isRaw = false;
              mimeType = getMimeType(data, contentType);
              itemSize = calculateDataSize(data, false);

              // Store data using setItem
              await orgStorage.setItem(key, data as StorageValue);
            }

            // Store metadata using unstorage's native setMeta
            const meta: StorageMeta = {
              mimeType,
              isRaw,
              storedAt: new Date().toISOString(),
              size: itemSize,
            };

            await setStorageMeta(orgStorage, key, meta);

            // Create database record for management purposes (async, non-blocking)
            const existingItem = (await ctx.context.adapter.findOne({
              model: "storageItem",
              where: [
                {
                  field: "organizationId",
                  operator: "eq",
                  value: organizationId,
                },
                {
                  field: "key",
                  operator: "eq",
                  value: key,
                  connector: "AND",
                },
              ],
            })) as StorageItem | null;

            if (!existingItem) {
              // Create new database record for management
              ctx.context.adapter
                .create({
                  model: "storageItem",
                  data: {
                    organizationId,
                    key,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                })
                .catch(console.error);
            }

            console.log(
              `[Storage] Item stored for org ${organizationId}: ${key} (${itemSize} bytes, ${isRaw ? "binary" : "text"})`,
            );

            return ctx.json({
              success: true,
              result: {
                key,
                organizationId,
                size: itemSize,
                mimeType,
                isRaw,
                storedAt: new Date().toISOString(),
              },
            });
          } catch (error) {
            return ctx.json(
              {
                success: false,
                error: "Failed to store item",
                details:
                  error instanceof Error ? error.message : "Unknown error",
              },
              { status: 500 },
            );
          }
        },
      ),

      /**
       * Retrieve a value with intelligent binary/text detection.
       * GET /storage/:key
       */
      getItem: createAuthEndpoint(
        "/storage/:key",
        {
          method: "GET",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          const { key } = ctx.params;
          const organization = getOrganizationFromContext(ctx);
          const organizationId = organization?.id;

          if (!organizationId) {
            return ctx.json(
              { success: false, error: "Organization context required" },
              { status: 400 },
            );
          }

          try {
            const orgStorage = prefixStorage(
              baseStorage,
              `${basePrefix}org_${organizationId}:`,
            );

            const forceRaw = ctx.request
              ? new URL(ctx.request.url).searchParams.get("raw") === "true"
              : false;

            // Get metadata first using unstorage's native getMeta
            const meta = await getStorageMeta(orgStorage, key);

            if (!meta) {
              return ctx.json(
                { success: false, error: "Item not found" },
                { status: 404 },
              );
            }

            let actualData: unknown;

            // Get data based on metadata
            if (meta.isRaw) {
              actualData = await orgStorage.getItemRaw(key);
            } else {
              actualData = await orgStorage.getItem(key);
            }

            if (actualData === null) {
              return ctx.json(
                { success: false, error: "Item not found" },
                { status: 404 },
              );
            }

            // Async update access time (non-blocking)
            ctx.context.adapter
              .update({
                model: "storageItem",
                where: [
                  {
                    field: "organizationId",
                    operator: "eq",
                    value: organizationId,
                  },
                  {
                    field: "key",
                    operator: "eq",
                    value: key,
                    connector: "AND",
                  },
                ],
                update: { accessedAt: new Date() },
              })
              .catch(console.error);

            console.log(
              `[Storage] Item retrieved for org ${organizationId}: ${key} (${meta.isRaw ? "binary" : "text"})`,
            );

            // Return binary data as Response with proper headers
            if (meta.isRaw && !forceRaw) {
              return new Response(actualData as ArrayBuffer, {
                headers: {
                  "Content-Type": meta.mimeType,
                  "Cache-Control": "public, max-age=3600",
                },
              });
            }

            // Return JSON response for text data or when raw=true is forced
            return ctx.json({
              success: true,
              result: {
                key,
                value: actualData,
                mimeType: meta.mimeType,
                isRaw: meta.isRaw,
                organizationId,
                accessedAt: new Date().toISOString(),
              },
            });
          } catch (error) {
            return ctx.json(
              {
                success: false,
                error: "Failed to retrieve item",
                details:
                  error instanceof Error ? error.message : "Unknown error",
              },
              { status: 500 },
            );
          }
        },
      ),

      /**
       * Delete a value (handles both text and binary data).
       * DELETE /storage/:key
       */
      removeItem: createAuthEndpoint(
        "/storage/:key",
        {
          method: "DELETE",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          const { key } = ctx.params;
          const organization = getOrganizationFromContext(ctx);
          const organizationId = organization?.id;

          if (!organizationId) {
            return ctx.json(
              { success: false, error: "Organization context required" },
              { status: 400 },
            );
          }

          try {
            const orgStorage = prefixStorage(
              baseStorage,
              `${basePrefix}org_${organizationId}:`,
            );

            // Check if item exists by trying to get metadata
            const meta = await getStorageMeta(orgStorage, key);

            if (!meta) {
              return ctx.json(
                { success: false, error: "Item not found" },
                { status: 404 },
              );
            }

            // Remove the item and its metadata
            await orgStorage.removeItem(key, { removeMeta: true });

            // Remove metadata from database (async, non-blocking)
            ctx.context.adapter
              .delete({
                model: "storageItem",
                where: [
                  {
                    field: "organizationId",
                    operator: "eq",
                    value: organizationId,
                  },
                  {
                    field: "key",
                    operator: "eq",
                    value: key,
                    connector: "AND",
                  },
                ],
              })
              .catch(console.error);

            console.log(
              `[Storage] Item removed for org ${organizationId}: ${key}`,
            );

            return ctx.json({
              success: true,
              result: {
                key,
                organizationId,
                removedAt: new Date().toISOString(),
              },
            });
          } catch (error) {
            return ctx.json(
              {
                success: false,
                error: "Failed to remove item",
                details:
                  error instanceof Error ? error.message : "Unknown error",
              },
              { status: 500 },
            );
          }
        },
      ),

      /**
       * List all keys.
       * GET /storage
       */
      listKeys: createAuthEndpoint(
        "/storage",
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
            const orgStorage = prefixStorage(
              baseStorage,
              `${basePrefix}org_${organizationId}:`,
            );

            const keys = await orgStorage.getKeys();

            // Get database records for management metadata
            const dbRecords = (await ctx.context.adapter.findMany({
              model: "storageItem",
              where: [
                {
                  field: "organizationId",
                  operator: "eq",
                  value: organizationId,
                },
              ],
            })) as StorageItem[];

            // Get metadata from unstorage for each key
            const enrichedKeys = await Promise.all(
              keys.map(async (key) => {
                const storageMeta = await getStorageMeta(orgStorage, key);
                const dbRecord = dbRecords.find((r) => r.key === key);

                return {
                  key,
                  size: storageMeta?.size || 0,
                  mimeType: storageMeta?.mimeType || "unknown",
                  isRaw: storageMeta?.isRaw || false,
                  storedAt: storageMeta?.storedAt || null,
                  metadata: dbRecord?.metadata
                    ? JSON.parse(dbRecord.metadata)
                    : {},
                  createdAt: dbRecord?.createdAt?.toISOString() || null,
                  updatedAt: dbRecord?.updatedAt?.toISOString() || null,
                  accessedAt: dbRecord?.accessedAt?.toISOString() || null,
                };
              }),
            );

            return ctx.json({
              success: true,
              result: {
                keys: enrichedKeys,
                total: keys.length,
                organizationId,
                listedAt: new Date().toISOString(),
              },
            });
          } catch (error) {
            return ctx.json(
              {
                success: false,
                error: "Failed to list keys",
                details:
                  error instanceof Error ? error.message : "Unknown error",
              },
              { status: 500 },
            );
          }
        },
      ),

      /**
       * Get storage statistics.
       * GET /storage/stats
       */
      getStats: createAuthEndpoint(
        "/storage/stats",
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
            const orgStorage = prefixStorage(
              baseStorage,
              `${basePrefix}org_${organizationId}:`,
            );

            const keys = await orgStorage.getKeys();

            // Get metadata from unstorage for statistics
            const storageMetadata = await Promise.all(
              keys.map(async (key) => {
                const meta = await getStorageMeta(orgStorage, key);
                return meta;
              }),
            );

            // Filter out null metadata and calculate statistics
            const validMetadata = storageMetadata.filter(
              (meta) => meta !== null,
            ) as StorageMeta[];
            const totalUsage = validMetadata.reduce(
              (sum, meta) => sum + meta.size,
              0,
            );
            const binaryItems = validMetadata.filter((meta) => meta.isRaw);
            const textItems = validMetadata.filter((meta) => !meta.isRaw);
            const binaryUsage = binaryItems.reduce(
              (sum, meta) => sum + meta.size,
              0,
            );
            const textUsage = textItems.reduce(
              (sum, meta) => sum + meta.size,
              0,
            );

            const organization = (await ctx.context.adapter.findOne({
              model: "organization",
              where: [
                {
                  field: "id",
                  operator: "eq",
                  value: organizationId,
                },
              ],
            })) as { storageQuota?: number; storageUsed?: number } | null;

            return ctx.json({
              success: true,
              result: {
                totalKeys: keys.length,
                totalItems: validMetadata.length,
                binaryItems: binaryItems.length,
                textItems: textItems.length,
                storageUsed: totalUsage,
                binaryUsage,
                textUsage,
                storageQuota: organization?.storageQuota || null,
                usagePercentage: organization?.storageQuota
                  ? Math.round((totalUsage / organization.storageQuota) * 100)
                  : null,
                organizationId,
                calculatedAt: new Date().toISOString(),
              },
            });
          } catch (error) {
            return ctx.json(
              {
                success: false,
                error: "Failed to get storage stats",
                details:
                  error instanceof Error ? error.message : "Unknown error",
              },
              { status: 500 },
            );
          }
        },
      ),
    },
  } satisfies BetterAuthPlugin;
};

/**
 * The plugin definition for the Storage Plugin.
 */
export const storagePluginDefinition = createPluginDefinition(
  (options?: Record<string, unknown>) => {
    // Validation will happen at runtime when the plugin is actually used
    return storagePlugin(options as StoragePluginOptions);
  },
  {
    name: "Storage",
    description:
      "Provides organization-scoped key-value storage with Better Auth integration and unstorage backend.",

    status: "active",
    clientPlugin: storageClientPlugin,
  },
);
