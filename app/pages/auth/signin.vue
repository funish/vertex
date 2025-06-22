<template>
  <div class="flex items-center justify-center min-h-screen p-4">
    <Card class="w-full max-w-md">
      <template #header>
        <div class="text-center p-6">
          <div class="flex justify-center mb-4">
            <i class="i-mdi-hexagon-multiple text-4xl"></i>
          </div>
          <h1 class="text-2xl font-bold mb-2">{{ $t("auth.signin.title") }}</h1>
          <p>{{ $t("auth.signin.subtitle") }}</p>
        </div>
      </template>

      <template #content>
        <div class="p-6 pt-0">
          <!-- Sign In Form -->
          <AuthSignInForm />

          <!-- OAuth Providers -->
          <div class="mt-6">
            <div class="flex items-center mb-4">
              <div class="flex-1 border-t"></div>
              <span class="px-2 text-sm">{{
                $t("auth.signin.orContinueWith")
              }}</span>
              <div class="flex-1 border-t"></div>
            </div>

            <AuthOAuthButtons />
          </div>
        </div>
      </template>

      <template #footer>
        <div class="text-center p-6 pt-0">
          <p class="text-sm">
            {{ $t("auth.signin.noAccount") }}
            <NuxtLinkLocale to="/auth/signup" class="font-medium">
              {{ $t("auth.signin.signUp") }}
            </NuxtLinkLocale>
          </p>
          <div class="mt-2">
            <NuxtLinkLocale
              to="/auth/forgot-password"
              class="text-sm font-medium"
            >
              {{ $t("auth.signin.forgotPassword") }}
            </NuxtLinkLocale>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { authClient } from "~/utils/auth";

// Define page metadata
definePageMeta({
  layout: false,
  auth: false,
});

// Set page head
useHead({
  title: "Sign In - Funish Vertex",
});

// Check if already logged in, redirect to dashboard
const { data: session } = await authClient.useSession(useFetch);
if (session.value) {
  await navigateTo("/dashboard");
}
</script>
