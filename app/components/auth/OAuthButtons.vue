<template>
  <div class="space-y-3">
    <Button
      v-for="provider in oauthProviders"
      :key="provider.id"
      :label="$t(`auth.oauth.${provider.id}`)"
      :icon="provider.icon"
      fluid
      severity="secondary"
      variant="outlined"
      @click="handleOAuthSignIn(provider.id)"
      :loading="loadingProvider === provider.id"
      :disabled="isLoading"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { authClient } from "~/utils/auth";

// Loading state
const isLoading = ref(false);
const loadingProvider = ref("");

// OAuth providers configuration
const oauthProviders = [
  {
    id: "google",
    icon: "i-mdi-google",
  },
  {
    id: "github",
    icon: "i-mdi-github",
  },
  {
    id: "microsoft",
    icon: "i-mdi-microsoft",
  },
];

// Handle OAuth sign in
const handleOAuthSignIn = async (providerId: string) => {
  isLoading.value = true;
  loadingProvider.value = providerId;

  try {
    // Use Better Auth's social sign in with proper callback URL
    await authClient.signIn.social({
      provider: providerId,
      callbackURL: "/auth/callback",
    });
  } catch (error) {
    console.error("OAuth login error:", error);

    // Show error message to user
    const errorMessage =
      error instanceof Error
        ? error.message
        : `OAuth login with ${providerId} failed`;

    // You could emit an event or use a toast notification here
    console.error(errorMessage);
  } finally {
    isLoading.value = false;
    loadingProvider.value = "";
  }
};
</script>
