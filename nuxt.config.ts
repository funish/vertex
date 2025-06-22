import { defineNuxtConfig } from "nuxt/config";
import { FunishVertexTheme } from "./app/utils/theme";

export default defineNuxtConfig({
  future: {
    compatibilityVersion: 4,
  },

  nitro: {
    experimental: {
      database: true,
    },
  },

  modules: [
    "@nuxt/test-utils/module",
    "@nuxtjs/i18n",
    "@primevue/nuxt-module",
    "@unocss/nuxt",
    "nuxt-mcp",
  ],

  // Internationalization configuration
  i18n: {
    vueI18n: "./i18n.config.ts",
    defaultLocale: "en-Latn", // Changed to English as default
    langDir: "locales",
    lazy: false,
    locales: [
      {
        code: "en-Latn",
        language: "en-Latn",
        file: "en-Latn.json",
        name: "English",
      },
      {
        code: "zh-Hans",
        language: "zh-Hans",
        file: "zh-Hans.json",
        name: "简体中文",
      },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "i18n_redirected",
      cookieCrossOrigin: true,
      cookieSecure: true,
      fallbackLocale: "en-Latn",
    },
    bundle: {
      optimizeTranslationDirective: false,
    },
  },

  primevue: {
    options: {
      theme: {
        preset: FunishVertexTheme,
        options: {
          darkModeSelector: ".app-dark",
          cssLayer: false,
        },
      },
    },
  },

  css: ["@unocss/reset/normalize.css"],
});
