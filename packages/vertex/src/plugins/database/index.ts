import type { Adapter, BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint, sessionMiddleware } from "better-auth/api";
import type { Organization } from "better-auth/plugins/organization";
import { z } from "zod";
import {
  createPluginDefinition,
  zodToAuthPluginSchema,
} from "../registry/utils";
import { getOrganizationFromContext } from "../tenant";
import { databaseClientPlugin } from "./client";

/**
 * Zod schema for Database Plugin configuration options.
 */
export const DatabasePluginOptionsSchema = z.object({
  /**
   * A prefix for the generated database schema names.
   * @default "org_"
   */
  schemaPrefix: z.string().optional(),
  /**
   * Supported database types
   */
  supportedDatabases: z
    .array(z.enum(["postgresql", "mysql", "sqlite"]))
    .optional(),
});

export type DatabasePluginOptions = z.infer<typeof DatabasePluginOptionsSchema>;

// Database schemas using Zod (for type inference only)
export const dbQuerySchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  databaseId: z.string(),
  query: z.string(),
  params: z.string().optional(), // JSON string
  executedAt: z.date(),
  duration: z.number().optional(), // milliseconds
  status: z.enum(["success", "error", "timeout"]),
  error: z.string().nullable().optional(),
  rowCount: z.number().optional(),
  createdAt: z.date(),
  updatedAt: z.date().nullable().optional(),
});

export const dbTableSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  databaseId: z.string(),
  name: z.string(),
  schema: z.string(), // JSON string for table schema
  createdAt: z.date(),
  updatedAt: z.date().nullable().optional(),
});

export const dbConnectionSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  type: z.enum(["postgresql", "mysql", "sqlite", "mongodb"]),
  connectionConfig: z.string(), // Encrypted JSON configuration
  isActive: z.boolean(),
  lastSyncAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date().nullable().optional(),
});

// Export types using z.infer (Better Auth style)
export type DbQuery = z.infer<typeof dbQuerySchema>;
export type DbTable = z.infer<typeof dbTableSchema>;
export type DbConnection = z.infer<typeof dbConnectionSchema>;

// Database provider interfaces
export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  executionTime: number;
}

export interface TableInfo {
  name: string;
  type: string;
  columns: ColumnInfo[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  primary: boolean;
  unique: boolean;
  defaultValue?: unknown;
}

export interface DatabaseProvider {
  readonly type: "internal" | "external";
  readonly id: string;
  readonly name: string;

  executeQuery(query: string, params?: unknown[]): Promise<QueryResult>;
  getTables(): Promise<TableInfo[]>;
  getTableSchema(tableName: string): Promise<ColumnInfo[]>;
  createTable(name: string, columns: ColumnInfo[]): Promise<void>;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<boolean>;
}

// Internal database provider (uses Better Auth's database with schema isolation)
class InternalDatabaseProvider implements DatabaseProvider {
  readonly type = "internal" as const;
  readonly id = "internal";
  readonly name = "Internal Database";

  constructor(
    private organizationId: string,
    private schemaName: string,
    private betterAuthAdapter: Adapter,
  ) {}

  async executeQuery(
    _query: string,
    _params?: unknown[],
  ): Promise<QueryResult> {
    // For the internal database provider, we should not allow arbitrary SQL queries
    // as Better Auth adapter doesn't provide a direct query method
    // Instead, we should guide users to use the structured methods
    throw new Error(
      "Direct SQL queries are not supported on internal database. Please use the structured table operations instead.",
    );
  }

  async getTables(): Promise<TableInfo[]> {
    // For internal database, we get tables from our metadata store
    try {
      const tables = await this.betterAuthAdapter.findMany({
        model: "dbTable",
        where: [
          {
            field: "organizationId",
            operator: "eq",
            value: this.organizationId,
          },
        ],
      });

      return (tables as DbTable[]).map((table) => ({
        name: table.name,
        type: "TABLE",
        columns: JSON.parse(table.schema || "{}").columns || [],
      }));
    } catch (error) {
      console.error("Failed to get tables from metadata store:", error);
      return [];
    }
  }

  async getTableSchema(tableName: string): Promise<ColumnInfo[]> {
    try {
      const table = await this.betterAuthAdapter.findOne({
        model: "dbTable",
        where: [
          {
            field: "organizationId",
            operator: "eq",
            value: this.organizationId,
          },
          { field: "name", operator: "eq", value: tableName },
        ],
      });

      if (!table) {
        return [];
      }

      const schema = JSON.parse((table as DbTable).schema || "{}");
      return schema.columns || [];
    } catch (error) {
      console.error(`Failed to get schema for table ${tableName}:`, error);
      return [];
    }
  }

  async createTable(name: string, columns: ColumnInfo[]): Promise<void> {
    // For internal database, we only create metadata records
    // The actual table creation would be handled by Better Auth's schema management
    try {
      await this.betterAuthAdapter.create({
        model: "dbTable",
        data: {
          organizationId: this.organizationId,
          databaseId: "internal",
          name,
          schema: JSON.stringify({ columns }),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      throw new Error(
        `Failed to create table metadata: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async connect(): Promise<void> {
    // Already connected through Better Auth adapter
  }

  async disconnect(): Promise<void> {
    // Better Auth manages the connection
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Test adapter connectivity by trying to query organization info
      await this.betterAuthAdapter.findOne({
        model: "organization",
        where: [{ field: "id", operator: "eq", value: this.organizationId }],
      });
      return true;
    } catch {
      return false;
    }
  }
}

// Organization database manager
class OrganizationDatabaseManager {
  private providers: Map<string, DatabaseProvider> = new Map();

  constructor(
    private betterAuthAdapter: Adapter,
    private schemaPrefix = "org_",
  ) {}

  async getDatabaseProvider(
    organizationId: string,
    databaseId = "internal",
  ): Promise<DatabaseProvider> {
    const cacheKey = `${organizationId}:${databaseId}`;

    const cachedProvider = this.providers.get(cacheKey);
    if (cachedProvider) {
      return cachedProvider;
    }

    let provider: DatabaseProvider;

    if (databaseId === "internal") {
      provider = await this.createInternalProvider(organizationId);
    } else {
      provider = await this.createExternalProvider(organizationId, databaseId);
    }

    this.providers.set(cacheKey, provider);
    return provider;
  }

  private async createInternalProvider(
    organizationId: string,
  ): Promise<InternalDatabaseProvider> {
    const org = await this.getOrganization(organizationId);

    // Generate schema name dynamically based on organization
    const schemaName = `${this.schemaPrefix}${org.slug}_${organizationId.substring(0, 8)}`;

    return new InternalDatabaseProvider(
      organizationId,
      schemaName,
      this.betterAuthAdapter,
    );
  }

  private async createExternalProvider(
    _organizationId: string,
    _connectionId: string,
  ): Promise<DatabaseProvider> {
    // TODO: Implement external database provider creation
    // This will be implemented in the second phase
    throw new Error("External database connections not yet implemented");
  }

  private async getOrganization(organizationId: string): Promise<Organization> {
    const org = await this.betterAuthAdapter.findOne({
      model: "organization",
      where: [{ field: "id", operator: "eq", value: organizationId }],
    });

    if (!org) {
      throw new Error(`Organization ${organizationId} not found`);
    }

    return org as Organization;
  }

  async getAvailableDatabases(organizationId: string): Promise<{
    internal: { id: string; name: string; schema: string; status: string };
    external: Array<{ id: string; name: string; type: string; status: string }>;
    defaultId: string;
  }> {
    const org = await this.getOrganization(organizationId);

    // Generate schema name for internal database
    const internalSchemaName = `${this.schemaPrefix}${org.slug}_${organizationId.substring(0, 8)}`;

    // Get internal database info
    const internal = {
      id: "internal",
      name: "Internal Database",
      schema: internalSchemaName,
      status: "active",
    };

    // Get external database connections
    const externalConnections = await this.betterAuthAdapter.findMany({
      model: "dbConnection",
      where: [
        { field: "organizationId", operator: "eq", value: organizationId },
      ],
    });

    const external = (externalConnections as DbConnection[]).map((conn) => ({
      id: conn.id,
      name: conn.name,
      type: conn.type,
      status: conn.isActive ? "active" : "inactive",
    }));

    // Find default database from connections, fallback to "internal"
    const defaultConnection = (externalConnections as DbConnection[]).find(
      (conn) => conn.isActive,
    );
    const defaultId = defaultConnection?.id || "internal";

    return {
      internal,
      external,
      defaultId,
    };
  }

  async logQuery(
    organizationId: string,
    databaseId: string,
    query: string,
    result: QueryResult,
    error?: string,
  ): Promise<void> {
    try {
      await this.betterAuthAdapter.create({
        model: "dbQuery",
        data: {
          organizationId,
          databaseId,
          query,
          executedAt: new Date(),
          duration: result.executionTime,
          status: error ? "error" : "success",
          error: error || null,
          rowCount: result.rowCount,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (logError) {
      console.error("[Database] Failed to log query:", logError);
      // Don't throw here to avoid affecting the main query execution
    }
  }
}

/**
 * The server-side implementation of the Database Plugin.
 * Provides hybrid database management with Better Auth integration.
 */
export const databasePlugin = (
  options: DatabasePluginOptions = {},
): BetterAuthPlugin => {
  const {
    schemaPrefix = "org_",
    supportedDatabases: _supportedDatabases = ["postgresql", "mysql", "sqlite"], // Reserved for future use
  } = options;

  // Create database manager instance
  let databaseManager: OrganizationDatabaseManager;

  // Helper function to ensure database manager is initialized
  const ensureDatabaseManager = (adapter: Adapter) => {
    if (!databaseManager) {
      databaseManager = new OrganizationDatabaseManager(adapter, schemaPrefix);
    }
    return databaseManager;
  };

  return {
    id: "database",

    // Better Auth schema definitions using converted Zod schemas
    schema: {
      // Database connection configuration (create first, no dependencies)
      dbConnection: zodToAuthPluginSchema(dbConnectionSchema),

      // Database query logs (references dbConnection)
      dbQuery: zodToAuthPluginSchema(dbQuerySchema, {
        foreignKeys: {
          databaseId: { model: "dbConnection", field: "id" },
        },
      }),

      // Database table metadata (references dbConnection)
      dbTable: zodToAuthPluginSchema(dbTableSchema, {
        foreignKeys: {
          databaseId: { model: "dbConnection", field: "id" },
        },
      }),
    },

    // Initialize database manager with Better Auth adapter
    hooks: {
      before: [
        {
          matcher: () => true,
          handler: async (ctx) => {
            // Database manager will be initialized in endpoints when ctx.context.adapter is available
            return ctx;
          },
        },
      ],
      after: [
        {
          matcher: (ctx) =>
            ctx.path.includes("organization") && ctx.method === "POST",
          handler: async (ctx) => {
            console.log(
              "[Database] Organization creation detected, schema will be created on first use",
            );
            return ctx;
          },
        },
      ],
    },

    endpoints: {
      /**
       * Get available database sources for the organization.
       * GET /database/sources
       */
      getDatabaseSources: createAuthEndpoint(
        "/database/sources",
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
            const manager = ensureDatabaseManager(
              ctx.context.adapter as Adapter,
            );
            const sources = await manager.getAvailableDatabases(organizationId);

            return ctx.json({
              success: true,
              result: sources,
            });
          } catch (error) {
            return ctx.json(
              {
                success: false,
                error: "Failed to get database sources",
                details:
                  error instanceof Error ? error.message : "Unknown error",
              },
              { status: 500 },
            );
          }
        },
      ),

      /**
       * Execute a SQL query on the specified database.
       * POST /database/query
       */
      executeQuery: createAuthEndpoint(
        "/database/query",
        {
          method: "POST",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          const body = z
            .object({
              query: z.string(),
              params: z.array(z.unknown()).optional(),
              databaseId: z.string().optional(), // defaults to organization's default
            })
            .parse(ctx.body);

          const organization = getOrganizationFromContext(ctx);
          const organizationId = organization?.id;

          if (!organizationId) {
            return ctx.json(
              { success: false, error: "Organization context required" },
              { status: 400 },
            );
          }

          try {
            const provider = await databaseManager.getDatabaseProvider(
              organizationId,
              body.databaseId,
            );

            const result = await provider.executeQuery(body.query, body.params);

            // Log query execution
            await databaseManager.logQuery(
              organizationId,
              body.databaseId || "internal",
              body.query,
              result,
            );

            console.log(
              `[Database] Query executed for org ${organizationId} on ${provider.name}: ${body.query.substring(0, 100)}...`,
            );

            return ctx.json({
              success: true,
              result,
            });
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";

            // Log failed query
            try {
              await databaseManager.logQuery(
                organizationId,
                body.databaseId || "internal",
                body.query,
                { columns: [], rows: [], rowCount: 0, executionTime: 0 },
                errorMessage,
              );
            } catch (logError) {
              console.error("[Database] Failed to log error:", logError);
            }

            console.error(
              `[Database] Query failed for org ${organizationId}:`,
              error,
            );

            return ctx.json(
              {
                success: false,
                error: "Query execution failed",
                details: errorMessage,
              },
              { status: 500 },
            );
          }
        },
      ),

      /**
       * List all tables in the specified database.
       * GET /database/tables
       */
      listTables: createAuthEndpoint(
        "/database/tables",
        {
          method: "GET",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          const databaseId = ctx.request
            ? new URL(ctx.request.url).searchParams.get("databaseId") ||
              "internal"
            : "internal";

          const organization = getOrganizationFromContext(ctx);
          const organizationId = organization?.id;

          if (!organizationId) {
            return ctx.json(
              { success: false, error: "Organization context required" },
              { status: 400 },
            );
          }

          try {
            const provider = await databaseManager.getDatabaseProvider(
              organizationId,
              databaseId,
            );

            const tables = await provider.getTables();

            return ctx.json({
              success: true,
              result: {
                tables,
                total: tables.length,
                organizationId,
                databaseId,
              },
            });
          } catch (error) {
            return ctx.json(
              {
                success: false,
                error: "Failed to list tables",
                details:
                  error instanceof Error ? error.message : "Unknown error",
              },
              { status: 500 },
            );
          }
        },
      ),

      /**
       * Get table schema information.
       * GET /database/tables/:tableName
       */
      getTable: createAuthEndpoint(
        "/database/tables/:tableName",
        {
          method: "GET",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          const { tableName } = ctx.params;
          const databaseId = ctx.request
            ? new URL(ctx.request.url).searchParams.get("databaseId") ||
              "internal"
            : "internal";

          const organization = getOrganizationFromContext(ctx);
          const organizationId = organization?.id;

          if (!organizationId) {
            return ctx.json(
              { success: false, error: "Organization context required" },
              { status: 400 },
            );
          }

          try {
            const provider = await databaseManager.getDatabaseProvider(
              organizationId,
              databaseId,
            );

            const columns = await provider.getTableSchema(tableName);

            return ctx.json({
              success: true,
              result: {
                name: tableName,
                columns,
                organizationId,
                databaseId,
              },
            });
          } catch (error) {
            return ctx.json(
              {
                success: false,
                error: "Failed to retrieve table information",
                details:
                  error instanceof Error ? error.message : "Unknown error",
              },
              { status: 500 },
            );
          }
        },
      ),

      /**
       * Create a new table in the specified database.
       * POST /database/tables
       */
      createTable: createAuthEndpoint(
        "/database/tables",
        {
          method: "POST",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          const body = z
            .object({
              name: z.string(),
              columns: z.array(
                z.object({
                  name: z.string(),
                  type: z.string(),
                  nullable: z.boolean().default(true),
                  primary: z.boolean().default(false),
                  unique: z.boolean().default(false),
                  defaultValue: z.unknown().optional(),
                }),
              ),
              databaseId: z.string().optional(),
            })
            .parse(ctx.body);

          const organization = getOrganizationFromContext(ctx);
          const organizationId = organization?.id;

          if (!organizationId) {
            return ctx.json(
              { success: false, error: "Organization context required" },
              { status: 400 },
            );
          }

          try {
            const provider = await databaseManager.getDatabaseProvider(
              organizationId,
              body.databaseId || "internal",
            );

            await provider.createTable(body.name, body.columns);

            // Store table metadata in our system
            await ctx.context.adapter.create({
              model: "dbTable",
              data: {
                organizationId,
                databaseId: body.databaseId || "internal",
                name: body.name,
                schema: JSON.stringify({ columns: body.columns }),
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            });

            console.log(
              `[Database] Table ${body.name} created for org ${organizationId} in ${provider.name}`,
            );

            return ctx.json({
              success: true,
              result: {
                name: body.name,
                columns: body.columns,
                organizationId,
                databaseId: body.databaseId || "internal",
                createdAt: new Date().toISOString(),
              },
            });
          } catch (error) {
            return ctx.json(
              {
                success: false,
                error: "Table creation failed",
                details:
                  error instanceof Error ? error.message : "Unknown error",
              },
              { status: 500 },
            );
          }
        },
      ),

      /**
       * Get database connection information and query history.
       * GET /database/info
       */
      getInfo: createAuthEndpoint(
        "/database/info",
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
            const sources =
              await databaseManager.getAvailableDatabases(organizationId);

            // Get recent queries
            const recentQueries = await ctx.context.adapter.findMany({
              model: "dbQuery",
              where: [
                {
                  field: "organizationId",
                  operator: "eq",
                  value: organizationId,
                },
              ],
              limit: 10,
              sortBy: { field: "executedAt", direction: "desc" },
            });

            return ctx.json({
              success: true,
              result: {
                databases: sources,
                recentQueries: (recentQueries as DbQuery[]).map((q) => ({
                  id: q.id,
                  databaseId: q.databaseId,
                  query:
                    q.query.substring(0, 100) +
                    (q.query.length > 100 ? "..." : ""),
                  status: q.status,
                  duration: q.duration,
                  rowCount: q.rowCount,
                  executedAt: q.executedAt,
                })),
                organizationId,
              },
            });
          } catch (error) {
            return ctx.json(
              {
                success: false,
                error: "Failed to get database info",
                details:
                  error instanceof Error ? error.message : "Unknown error",
              },
              { status: 500 },
            );
          }
        },
      ),

      /**
       * Test database connection health.
       * POST /database/test
       */
      testConnection: createAuthEndpoint(
        "/database/test",
        {
          method: "POST",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          const body = z
            .object({
              databaseId: z.string().optional(),
            })
            .parse(ctx.body);

          const organization = getOrganizationFromContext(ctx);
          const organizationId = organization?.id;

          if (!organizationId) {
            return ctx.json(
              { success: false, error: "Organization context required" },
              { status: 400 },
            );
          }

          try {
            const provider = await databaseManager.getDatabaseProvider(
              organizationId,
              body.databaseId || "internal",
            );

            const isHealthy = await provider.healthCheck();

            return ctx.json({
              success: true,
              result: {
                databaseId: body.databaseId || "internal",
                status: isHealthy ? "healthy" : "unhealthy",
                timestamp: new Date().toISOString(),
              },
            });
          } catch (error) {
            return ctx.json(
              {
                success: false,
                error: "Connection test failed",
                details:
                  error instanceof Error ? error.message : "Unknown error",
              },
              { status: 500 },
            );
          }
        },
      ),
    },

    // Type inference for plugin consumers
    $Infer: {
      DbQuery: {} as DbQuery,
      DbTable: {} as DbTable,
      DbConnection: {} as DbConnection,
    },
  } satisfies BetterAuthPlugin;
};

/**
 * The plugin definition for the Database Plugin.
 */
export const databasePluginDefinition = createPluginDefinition(databasePlugin, {
  name: "Database",
  description:
    "Provides hybrid database management with Better Auth integration. Supports both internal schema isolation and external database connections.",

  status: "active",
  clientPlugin: databaseClientPlugin,
});
