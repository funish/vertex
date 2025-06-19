import { defineI18nConfig } from "#i18n";

export default defineI18nConfig(() => ({
  legacy: false,
  availableLocales: ["en-Latn", "zh-Hans"],
  flatJson: true,
  fallbackLocale: "en-Latn",
  fallbackWarn: false,
  silentFallbackWarn: true,
  silentTranslationWarn: true,
}));
