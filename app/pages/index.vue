<template>
  <div
    class="min-h-screen flex flex-col justify-center items-center"
    style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
  >
    <div class="text-center text-white mb-8">
      <h1 class="text-5xl font-bold mb-4">Funish Vertex</h1>
      <p class="text-xl mb-8 opacity-90">
        {{ $t("landing.subtitle") }}
      </p>
    </div>

    <div class="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
      <div class="text-center mb-6">
        <h2 class="text-2xl font-semibold mb-2" style="color: #111827">
          {{ $t("landing.welcome") }}
        </h2>
        <p class="text-sm" style="color: #6b7280">
          {{ $t("landing.description") }}
        </p>
      </div>

      <div class="space-y-4">
        <NuxtLinkLocale to="/auth/signin">
          <Button
            :label="$t('auth.signin.title')"
            icon="mdi mdi-login"
            class="w-full"
            size="large"
          />
        </NuxtLinkLocale>

        <NuxtLinkLocale to="/auth/signup">
          <Button
            :label="$t('auth.signup.title')"
            icon="mdi mdi-account-plus"
            class="w-full"
            severity="secondary"
            outlined
            size="large"
          />
        </NuxtLinkLocale>
      </div>

      <div class="mt-6 pt-6 border-t border-gray-200">
        <p class="text-xs text-center" style="color: #6b7280">
          {{ $t("landing.features") }}
        </p>
        <div class="flex justify-center space-x-6 mt-3">
          <div class="flex items-center space-x-1">
            <i class="mdi mdi-shield-check text-sm" style="color: #16a34a"></i>
            <span class="text-xs" style="color: #6b7280">{{
              $t("landing.secure")
            }}</span>
          </div>
          <div class="flex items-center space-x-1">
            <i
              class="mdi mdi-lightning-bolt text-sm"
              style="color: #f59e0b"
            ></i>
            <span class="text-xs" style="color: #6b7280">{{
              $t("landing.fast")
            }}</span>
          </div>
          <div class="flex items-center space-x-1">
            <i class="mdi mdi-puzzle text-sm" style="color: #3b82f6"></i>
            <span class="text-xs" style="color: #6b7280">{{
              $t("landing.extensible")
            }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-8 text-center text-white text-sm opacity-75">
      <p>
        &copy; {{ new Date().getFullYear() }} Funish Vertex.
        {{ $t("landing.rights") }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
// Set page title
useHead({
  title: "Funish Vertex - Multi-Tenant Authentication Platform",
});
</script>
