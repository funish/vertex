import type { BetterAuthClientPlugin } from "better-auth/client";
import type { aiRouterPlugin } from "./index";

/**
 * Client-side plugin for AI Router functionality.
 * Provides type-safe client methods for AI operations with OpenAI-compatible API.
 */
export const aiRouterClientPlugin = (): BetterAuthClientPlugin => {
  return {
    id: "ai-router",
    $InferServerPlugin: {} as ReturnType<typeof aiRouterPlugin>,
    getActions: ($fetch) => {
      return {
        /**
         * Create a chat completion using the organization's AI providers.
         */
        createChatCompletion: async (data: {
          model: string;
          messages: Array<{
            role: "system" | "user" | "assistant";
            content: string;
          }>;
          temperature?: number;
          max_tokens?: number;
          stream?: boolean;
        }) => {
          return $fetch("/ai/chat/completions", {
            method: "POST",
            body: data,
          });
        },

        /**
         * List all available AI models for the organization.
         */
        listModels: async () => {
          return $fetch("/ai/models", {
            method: "GET",
          });
        },

        /**
         * Create embeddings for the given input.
         */
        createEmbeddings: async (data: {
          model: string;
          input: string | string[];
          encoding_format?: "float" | "base64";
        }) => {
          return $fetch("/ai/embeddings", {
            method: "POST",
            body: data,
          });
        },

        /**
         * Get AI usage statistics for the organization.
         */
        getUsage: async () => {
          return $fetch("/ai/usage", {
            method: "GET",
          });
        },

        /**
         * Update AI configuration for the organization.
         */
        updateConfig: async (data: {
          providers?: Record<
            string,
            {
              apiKey?: string;
              baseURL?: string;
              headers?: Record<string, string>;
              models?: string[];
            }
          >;
          quota?: number;
          settings?: Record<string, unknown>;
        }) => {
          return $fetch("/ai/config", {
            method: "POST",
            body: data,
          });
        },

        /**
         * Stream a chat completion (for real-time responses).
         */
        streamChatCompletion: async (data: {
          model: string;
          messages: Array<{
            role: "system" | "user" | "assistant";
            content: string;
          }>;
          temperature?: number;
          max_tokens?: number;
        }) => {
          return $fetch("/ai/chat/completions", {
            method: "POST",
            body: { ...data, stream: true },
          });
        },

        /**
         * Get information about a specific model.
         */
        getModel: async (modelId: string) => {
          const models = (await $fetch("/ai/models", { method: "GET" })) as {
            object: string;
            data: Array<{
              id: string;
              object: string;
              created: number;
              owned_by: string;
            }>;
          };
          return models?.data?.find((model) => model.id === modelId);
        },

        /**
         * Test connectivity to an AI provider.
         */
        testProvider: async (providerName: string) => {
          return $fetch(`/ai/test/${encodeURIComponent(providerName)}`, {
            method: "POST",
          });
        },
      };
    },
  } satisfies BetterAuthClientPlugin;
};
