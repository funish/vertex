<template>
  <div class="min-h-screen flex flex-col">
    <!-- Hero Section -->
    <div class="flex-1 flex items-center justify-center p-6">
      <div class="w-full max-w-4xl text-center">
        <!-- Logo and Brand -->
        <div class="mb-8">
          <div class="flex justify-center items-center gap-3 mb-6">
            <i class="i-mdi-hexagon-multiple text-4xl"></i>
            <span class="text-3xl font-bold">Funish Vertex</span>
          </div>

          <h1 class="text-5xl font-bold mb-4">
            {{ $t("landing.subtitle") }}
          </h1>

          <p class="text-xl mb-8 max-w-2xl mx-auto">
            {{ $t("landing.description") }}
          </p>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-center gap-4 mb-12">
          <NuxtLinkLocale to="/auth/signin">
            <Button :label="$t('auth.signin.title')" icon="i-mdi-login" />
          </NuxtLinkLocale>

          <NuxtLinkLocale to="/auth/signup">
            <Button
              :label="$t('auth.signup.title')"
              icon="i-mdi-account-plus"
              severity="secondary"
              variant="outlined"
            />
          </NuxtLinkLocale>
        </div>

        <!-- Features Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="text-center">
            <div
              class="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-lg bg-surface-100 dark:bg-surface-800"
            >
              <i class="i-mdi-database text-2xl"></i>
            </div>
            <h3 class="font-semibold mb-2">{{ $t("landing.database") }}</h3>
            <p class="text-sm">{{ $t("landing.databaseDescription") }}</p>
          </div>

          <div class="text-center">
            <div
              class="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-lg bg-surface-100 dark:bg-surface-800"
            >
              <i class="i-mdi-api text-2xl"></i>
            </div>
            <h3 class="font-semibold mb-2">{{ $t("landing.api") }}</h3>
            <p class="text-sm">{{ $t("landing.apiDescription") }}</p>
          </div>

          <div class="text-center">
            <div
              class="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-lg bg-surface-100 dark:bg-surface-800"
            >
              <i class="i-mdi-puzzle text-2xl"></i>
            </div>
            <h3 class="font-semibold mb-2">{{ $t("landing.plugins") }}</h3>
            <p class="text-sm">{{ $t("landing.pluginsDescription") }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer
      class="py-6 text-center text-sm border-surface-200 dark:border-surface-700"
    >
      <p>
        &copy; {{ new Date().getFullYear() }} Funish Vertex.
        {{ $t("landing.rights") }}
      </p>
    </footer>
  </div>
</template>

<script setup lang="ts">
// Set page title
useHead({
  title: "Funish Vertex - Low-Code Backend Platform",
});
</script>
