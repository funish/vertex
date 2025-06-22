import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { type CoreMessage, embed, streamText } from "ai";
import type { BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint, sessionMiddleware } from "better-auth/api";
import { z } from "zod";
import {
  createPluginDefinition,
  zodToAuthPluginSchema,
} from "../registry/utils";
import type { Tenant } from "../tenant";
import { getOrganizationFromContext } from "../tenant";
import { aiRouterClientPlugin } from "./client";

/**
 * Defines the shape of a single AI provider's configuration.
 */
const AIProviderConfigSchema = z.object({
  apiKey: z.string().optional(),
  baseURL: z.string().optional(),
  headers: z.record(z.string()).optional(),
  models: z.array(z.string()).optional(),
});

type AIProviderConfig = z.infer<typeof AIProviderConfigSchema>;

/**
 * Defines the configuration options for the AI Router Plugin.
 */
export const AIRouterPluginOptionsSchema = z.object({
  providers: z.record(AIProviderConfigSchema).optional(),
});

type AIRouterPluginOptions = z.infer<typeof AIRouterPluginOptionsSchema>;

/**
 * Organization-specific AI router configuration
 */
interface OrganizationAIConfig {
  providers?: Record<string, AIProviderConfig>;
}

/**
 * Helper function to get AI configuration from organization context
 */
const getOrganizationAIConfig = (
  organization: Tenant | undefined,
): OrganizationAIConfig => {
  if (!organization?.pluginConfigs) {
    return {};
  }

  try {
    const pluginConfigs = JSON.parse(organization.pluginConfigs);
    return pluginConfigs["ai-router"] || {};
  } catch (error) {
    console.error("[AI Router] Failed to parse plugin configs:", error);
    return {};
  }
};

// AI Router schema using Zod (for type inference only)
export const aiRequestSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  provider: z.string(), // openai, anthropic, etc.
  model: z.string(),
  endpoint: z.string(), // chat, embeddings, etc.
  inputTokens: z.number().optional(),
  outputTokens: z.number().optional(),
  cost: z.number().optional(), // in cents
  duration: z.number().optional(), // milliseconds
  status: z.enum(["success", "error", "timeout"]),
  error: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date().nullable().optional(),
});

// Export types using z.infer (Better Auth style)
export type AIRequest = z.infer<typeof aiRequestSchema>;

/**
 * Simple cost calculation function based on model and tokens.
 * This is a basic implementation - in production you'd want more sophisticated pricing.
 */
const calculateCost = (
  model: string,
  inputTokens: number,
  outputTokens: number,
): number => {
  // Basic pricing in cents per 1000 tokens (rough estimates)
  const pricingMap: Record<string, { input: number; output: number }> = {
    "gpt-4": { input: 3, output: 6 },
    "gpt-4-turbo": { input: 1, output: 3 },
    "gpt-3.5-turbo": { input: 0.05, output: 0.15 },
    "claude-3-opus": { input: 1.5, output: 7.5 },
    "claude-3-sonnet": { input: 0.3, output: 1.5 },
    "claude-3-haiku": { input: 0.025, output: 0.125 },
  };

  // Extract base model name (remove provider prefix)
  const baseModel = model.split("/").pop() || model;
  const pricing = pricingMap[baseModel] || { input: 0.1, output: 0.2 }; // Default pricing

  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;

  return Math.round((inputCost + outputCost) * 100) / 100; // Round to 2 decimal places
};

/**
 * The server-side implementation of the AI Router Plugin.
 * Provides organization-scoped AI provider routing with Better Auth integration.
 */
export const aiRouterPlugin = (
  options: AIRouterPluginOptions = {},
): BetterAuthPlugin => {
  const { providers = {} } = options;

  return {
    id: "ai-router",

    // Better Auth schema definitions
    schema: {
      // Extend organization with AI configuration
      organization: {
        fields: {
          aiConfig: {
            type: "string", // JSON string for AI provider configuration
            required: false,
          },
          aiQuota: {
            type: "number", // API calls per month
            required: false,
          },
          aiUsage: {
            type: "number", // Current usage count
            required: false,
          },
        },
      },

      // Convert Zod schema to Better Auth format
      aiRequest: zodToAuthPluginSchema(aiRequestSchema),
    },

    endpoints: {
      /**
       * Chat completions endpoint (OpenAI-compatible).
       * POST /ai/chat/completions
       */
      chatCompletions: createAuthEndpoint(
        "/ai/chat/completions",
        {
          method: "POST",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          const body = ctx.body as Record<string, unknown>;
          const modelId = (body.model as string) || "";

          // Route: modelId is expected to be in "providerName/modelName" format.
          const [providerName, ...modelNameParts] = modelId.split("/");
          const modelName = modelNameParts.join("/");

          if (!providerName || !modelName) {
            throw new Error("Invalid model format. Expected 'provider/model'.");
          }

          // Get organization-specific configuration if available
          const organization = getOrganizationFromContext(ctx);
          const orgConfig = getOrganizationAIConfig(organization);
          const orgProviders = orgConfig.providers || {};

          // Use organization-specific provider config or fall back to global config
          const providerConfig =
            orgProviders[providerName] || providers[providerName];
          if (!providerConfig) {
            throw new Error(
              `Provider '${providerName}' is not configured for this organization.`,
            );
          }

          const apiKey =
            providerConfig.apiKey ??
            process.env[`${providerName.toUpperCase()}_API_KEY`];
          if (!apiKey) {
            throw new Error(
              `API key for provider '${providerName}' is not configured.`,
            );
          }

          const baseURL = providerConfig.baseURL;
          if (!baseURL) {
            throw new Error(
              `Base URL for provider '${providerName}' is not configured.`,
            );
          }

          const aiProvider = createOpenAICompatible({
            name: providerName,
            apiKey,
            baseURL,
            headers: providerConfig.headers,
          });

          const startTime = Date.now();
          const organizationId = organization?.id;

          try {
            console.log(
              `[AI Router] Chat completion for org ${organizationId}, model: ${modelId}`,
            );

            const result = streamText({
              model: aiProvider(modelName),
              messages: body.messages as CoreMessage[],
              temperature: body.temperature as number | undefined,
              maxTokens: body.max_tokens as number | undefined,
            });

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Get usage information after streaming is complete
            const usage = await result.usage;
            const inputTokens = usage?.promptTokens || 0;
            const outputTokens = usage?.completionTokens || 0;

            // Log successful request to database
            if (organizationId) {
              const cost = calculateCost(modelId, inputTokens, outputTokens);

              await ctx.context.adapter.create({
                model: "aiRequest",
                data: {
                  organizationId,
                  provider: providerName,
                  model: modelId,
                  endpoint: "chat",
                  inputTokens,
                  outputTokens,
                  cost,
                  duration,
                  status: "success",
                  createdAt: new Date(),
                },
              });

              console.log(
                `[AI Router] Chat completion logged: ${inputTokens}+${outputTokens} tokens, $${cost / 100} cost, ${duration}ms`,
              );
            }

            return result.toDataStreamResponse();
          } catch (error) {
            const endTime = Date.now();
            const duration = endTime - startTime;

            // Log failed request to database
            if (organizationId) {
              await ctx.context.adapter.create({
                model: "aiRequest",
                data: {
                  organizationId,
                  provider: providerName,
                  model: modelId,
                  endpoint: "chat",
                  duration,
                  status: "error",
                  error:
                    error instanceof Error ? error.message : "Unknown error",
                  createdAt: new Date(),
                },
              });
            }

            console.error(
              `[AI Router] Chat completion failed for org ${organizationId}:`,
              error,
            );
            throw error;
          }
        },
      ),

      /**
       * List available models.
       * GET /ai/models
       */
      listModels: createAuthEndpoint(
        "/ai/models",
        {
          method: "GET",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          // Get organization-specific configuration if available
          const organization = getOrganizationFromContext(ctx);
          const orgConfig = getOrganizationAIConfig(organization);
          const orgProviders = orgConfig.providers || {};

          // Merge organization providers with global providers
          const allProviders: Record<string, AIProviderConfig> = {
            ...providers,
            ...orgProviders,
          };

          const modelList = Object.entries(allProviders).flatMap(
            ([providerName, providerConfig]) =>
              (providerConfig.models || []).map((modelName: string) => ({
                id: `${providerName}/${modelName}`,
                object: "model",
                created: Math.floor(Date.now() / 1000),
                owned_by: providerName,
              })),
          );

          console.log(`[AI Router] Models listed for org ${organization?.id}`);

          return ctx.json({
            object: "list",
            data: modelList,
          });
        },
      ),

      /**
       * Create embeddings.
       * POST /ai/embeddings
       */
      createEmbeddings: createAuthEndpoint(
        "/ai/embeddings",
        {
          method: "POST",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          const body = ctx.body as Record<string, unknown>;
          const modelId = (body.model as string) || "";
          const input = body.input as string;

          // Route: modelId is expected to be in "providerName/modelName" format.
          const [providerName, ...modelNameParts] = modelId.split("/");
          const modelName = modelNameParts.join("/");

          if (!providerName || !modelName) {
            throw new Error("Invalid model format. Expected 'provider/model'.");
          }

          // Get organization-specific configuration if available
          const organization = getOrganizationFromContext(ctx);
          const orgConfig = getOrganizationAIConfig(organization);
          const orgProviders = orgConfig.providers || {};

          // Use organization-specific provider config or fall back to global config
          const providerConfig =
            orgProviders[providerName] || providers[providerName];
          if (!providerConfig) {
            throw new Error(
              `Provider '${providerName}' is not configured for this organization.`,
            );
          }

          const apiKey =
            providerConfig.apiKey ??
            process.env[`${providerName.toUpperCase()}_API_KEY`];
          if (!apiKey) {
            throw new Error(
              `API key for provider '${providerName}' is not configured.`,
            );
          }

          const baseURL = providerConfig.baseURL;
          if (!baseURL) {
            throw new Error(
              `Base URL for provider '${providerName}' is not configured.`,
            );
          }

          const aiProvider = createOpenAICompatible({
            name: providerName,
            apiKey,
            baseURL,
            headers: providerConfig.headers,
          });

          const startTime = Date.now();
          const organizationId = organization?.id;

          try {
            console.log(
              `[AI Router] Embeddings created for org ${organizationId}, model: ${modelId}`,
            );

            const result = await embed({
              model: aiProvider.textEmbeddingModel(modelName),
              value: input,
            });

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Log successful request to database
            if (organizationId) {
              const inputTokens = result.usage?.tokens || 0;
              const cost = calculateCost(modelId, inputTokens, 0); // Embeddings only have input tokens

              await ctx.context.adapter.create({
                model: "aiRequest",
                data: {
                  organizationId,
                  provider: providerName,
                  model: modelId,
                  endpoint: "embeddings",
                  inputTokens,
                  outputTokens: 0, // Embeddings don't have output tokens
                  cost,
                  duration,
                  status: "success",
                  createdAt: new Date(),
                },
              });

              console.log(
                `[AI Router] Embeddings logged: ${inputTokens} tokens, $${cost / 100} cost, ${duration}ms`,
              );
            }

            return ctx.json({
              object: "list",
              data: [
                {
                  object: "embedding",
                  embedding: result.embedding,
                  index: 0,
                },
              ],
              model: modelId,
              usage: result.usage,
            });
          } catch (error) {
            const endTime = Date.now();
            const duration = endTime - startTime;

            // Log failed request to database
            if (organizationId) {
              await ctx.context.adapter.create({
                model: "aiRequest",
                data: {
                  organizationId,
                  provider: providerName,
                  model: modelId,
                  endpoint: "embeddings",
                  duration,
                  status: "error",
                  error:
                    error instanceof Error ? error.message : "Unknown error",
                  createdAt: new Date(),
                },
              });
            }

            console.error(
              `[AI Router] Embeddings failed for org ${organizationId}:`,
              error,
            );
            throw error;
          }
        },
      ),

      /**
       * Get AI usage statistics.
       * GET /ai/usage
       */
      getUsage: createAuthEndpoint(
        "/ai/usage",
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
            // Get actual usage from database
            const usage = (await ctx.context.adapter.findMany({
              model: "aiRequest",
              where: [
                {
                  field: "organizationId",
                  operator: "eq",
                  value: organizationId,
                },
              ],
            })) as AIRequest[];

            const totalInputTokens = usage.reduce(
              (sum, req) => sum + (req.inputTokens || 0),
              0,
            );
            const totalOutputTokens = usage.reduce(
              (sum, req) => sum + (req.outputTokens || 0),
              0,
            );
            const totalCost = usage.reduce(
              (sum, req) => sum + (req.cost || 0),
              0,
            );
            const successful = usage.filter(
              (req) => req.status === "success",
            ).length;
            const failed = usage.filter((req) => req.status === "error").length;
            const chatRequests = usage.filter(
              (req) => req.endpoint === "chat",
            ).length;
            const embeddingRequests = usage.filter(
              (req) => req.endpoint === "embeddings",
            ).length;

            // Get organization quota from organization table
            const organization = (await ctx.context.adapter.findOne({
              model: "organization",
              where: [
                {
                  field: "id",
                  operator: "eq",
                  value: organizationId,
                },
              ],
            })) as { aiQuota?: number } | null;

            return ctx.json({
              success: true,
              result: {
                organizationId,
                currentUsage: usage.length,
                quota: organization?.aiQuota || null,
                requests: {
                  total: usage.length,
                  chat: chatRequests,
                  embeddings: embeddingRequests,
                  successful,
                  failed,
                },
                tokens: {
                  input: totalInputTokens,
                  output: totalOutputTokens,
                  total: totalInputTokens + totalOutputTokens,
                },
                cost: {
                  total: totalCost / 100, // Convert cents to dollars
                  currency: "USD",
                },
                period: {
                  start: new Date(
                    Date.now() - 30 * 24 * 60 * 60 * 1000,
                  ).toISOString(), // Last 30 days
                  end: new Date().toISOString(),
                },
              },
            });
          } catch (error) {
            return ctx.json(
              {
                success: false,
                error: "Failed to get usage statistics",
                details:
                  error instanceof Error ? error.message : "Unknown error",
              },
              { status: 500 },
            );
          }
        },
      ),

      /**
       * Update AI configuration for organization.
       * POST /ai/config
       */
      updateConfig: createAuthEndpoint(
        "/ai/config",
        {
          method: "POST",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          const body = z
            .object({
              providers: z.record(AIProviderConfigSchema).optional(),
              quota: z.number().optional(),
              settings: z.record(z.unknown()).optional(),
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
            // Update organization AI configuration in database
            await ctx.context.adapter.update({
              model: "organization",
              where: [
                {
                  field: "id",
                  operator: "eq",
                  value: organizationId,
                },
              ],
              update: {
                aiConfig: JSON.stringify(body),
                aiQuota: body.quota,
                updatedAt: new Date(),
              },
            });

            console.log(`[AI Router] Config updated for org ${organizationId}`);

            return ctx.json({
              success: true,
              result: {
                organizationId,
                config: body,
                updatedAt: new Date().toISOString(),
              },
            });
          } catch (error) {
            return ctx.json(
              {
                success: false,
                error: "Failed to update AI configuration",
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
 * The plugin definition for the AI Router Plugin.
 */
export const aiRouterPluginDefinition = createPluginDefinition(aiRouterPlugin, {
  name: "AI Router",
  description:
    "Provides organization-scoped AI provider routing with Better Auth integration and OpenAI-compatible API.",

  status: "active",
  clientPlugin: aiRouterClientPlugin,
});
