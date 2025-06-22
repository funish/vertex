<template>
  <div class="flex items-center justify-center min-h-screen p-4">
    <Card class="w-full max-w-md">
      <template #content>
        <div class="text-center p-6">
          <div class="flex justify-center mb-4">
            <i v-if="error" class="i-mdi-alert-circle text-4xl"></i>
            <i v-else class="i-mdi-check-circle text-4xl"></i>
          </div>
          <h1 class="text-2xl font-bold mb-2">
            {{
              error ? $t("auth.callback.error") : $t("auth.callback.success")
            }}
          </h1>
          <p v-if="isLoading">{{ $t("auth.callback.processing") }}</p>
          <p v-else-if="error">
            {{ error }}
          </p>
          <p v-else>{{ $t("auth.callback.redirecting") }}</p>

          <Button
            v-if="error"
            :label="$t('auth.callback.tryAgain')"
            @click="handleRetry"
            class="mt-4"
            severity="secondary"
          />
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import Button from "primevue/button";
import { authClient } from "~/utils/auth";

// Define page metadata
definePageMeta({
  layout: false,
  auth: false,
});

// Set page head
useHead({
  title: "Authentication Callback - Funish Vertex",
});

// State
const isLoading = ref(true);
const error = ref("");

// Handle OAuth callback
const handleCallback = async () => {
  try {
    const route = useRoute();

    // Get callback parameters
    const code = route.query.code as string;
    const state = route.query.state as string;
    const error_param = route.query.error as string;

    if (error_param) {
      throw new Error(`OAuth error: ${error_param}`);
    }

    if (!code) {
      throw new Error("No authorization code received");
    }

    // Handle the OAuth callback with Better Auth
    const result = await authClient.signIn.social({
      provider: state || "github", // Default to github if no state
      code: code,
    });

    if (result.error) {
      throw new Error(result.error.message || "OAuth sign in failed");
    }

    // Redirect to dashboard on success
    await navigateTo("/dashboard");
  } catch (err) {
    console.error("OAuth callback error:", err);
    error.value = err instanceof Error ? err.message : "Authentication failed";
  } finally {
    isLoading.value = false;
  }
};

// Retry function
const handleRetry = () => {
  navigateTo("/auth/signin");
};

// Process callback on mount
onMounted(() => {
  handleCallback();
});
</script>
