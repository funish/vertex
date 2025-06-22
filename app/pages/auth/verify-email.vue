<template>
  <div class="flex items-center justify-center min-h-screen p-4">
    <Card class="w-full max-w-md">
      <template #header>
        <div class="text-center p-6">
          <div class="flex justify-center mb-4">
            <i v-if="isLoading" class="i-mdi-loading animate-spin text-4xl"></i>
            <i
              v-else-if="error"
              class="i-mdi-email-alert text-4xl text-red-500"
            ></i>
            <i
              v-else-if="success"
              class="i-mdi-email-check text-4xl text-green-500"
            ></i>
            <i v-else class="i-mdi-email-outline text-4xl"></i>
          </div>
          <h1 class="text-2xl font-bold mb-2">
            {{ $t("auth.verifyEmail.title") }}
          </h1>
          <p>{{ $t("auth.verifyEmail.subtitle") }}</p>
        </div>
      </template>

      <template #content>
        <div class="p-6 pt-0">
          <div v-if="isLoading" class="text-center">
            <p>{{ $t("auth.verifyEmail.verifying") }}</p>
          </div>

          <div v-else-if="error" class="text-center">
            <Message severity="secondary">
              {{ error }}
            </Message>
            <Button
              :label="$t('auth.verifyEmail.resend')"
              @click="handleResend"
              class="mt-4"
              :loading="isResending"
            />
          </div>

          <div v-else-if="success" class="text-center">
            <Message severity="secondary">
              {{ $t("auth.verifyEmail.success") }}
            </Message>
            <Button
              :label="$t('auth.verifyEmail.continueToSignIn')"
              @click="handleSignIn"
              class="mt-4"
            />
          </div>

          <div v-else class="text-center">
            <p class="mb-4">{{ $t("auth.verifyEmail.instructions") }}</p>
            <Button
              :label="$t('auth.verifyEmail.resend')"
              @click="handleResend"
              :loading="isResending"
              variant="outlined"
            />
          </div>
        </div>
      </template>

      <template #footer>
        <div class="text-center p-6 pt-0">
          <p class="text-sm">
            {{ $t("auth.verifyEmail.backTo") }}
            <NuxtLinkLocale to="/auth/signin" class="font-medium">
              {{ $t("auth.verifyEmail.signIn") }}
            </NuxtLinkLocale>
          </p>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import Button from "primevue/button";
import Message from "primevue/message";
import { authClient } from "~/utils/auth";

// Define page metadata
definePageMeta({
  layout: false,
  auth: false,
});

// Set page head
useHead({
  title: "Verify Email - Funish Vertex",
});

// State
const isLoading = ref(false);
const isResending = ref(false);
const error = ref("");
const success = ref(false);

// Get token from query params
const route = useRoute();
const token = route.query.token as string;
const email = route.query.email as string;

// Verify email on mount if token is present
onMounted(async () => {
  if (token) {
    await handleVerify();
  }
});

// Handle email verification
const handleVerify = async () => {
  if (!token) {
    error.value = "No verification token provided";
    return;
  }

  isLoading.value = true;
  error.value = "";

  try {
    const result = await authClient.verifyEmail({
      query: {
        token: token,
      },
    });

    if (result.error) {
      error.value = result.error.message || "Email verification failed";
    } else {
      success.value = true;
    }
  } catch (err) {
    error.value = "An error occurred during verification";
  } finally {
    isLoading.value = false;
  }
};

// Handle resend verification email
const handleResend = async () => {
  if (!email) {
    error.value = "Email address is required to resend verification";
    return;
  }

  isResending.value = true;

  try {
    const result = await authClient.sendVerificationEmail({
      email: email,
    });

    if (result.error) {
      error.value =
        result.error.message || "Failed to resend verification email";
    } else {
      error.value = "";
      // Show a temporary success message
      const tempMessage = "Verification email sent successfully";
      error.value = tempMessage;
      setTimeout(() => {
        if (error.value === tempMessage) {
          error.value = "";
        }
      }, 3000);
    }
  } catch (err) {
    error.value = "An error occurred while sending verification email";
  } finally {
    isResending.value = false;
  }
};

// Handle continue to sign in
const handleSignIn = () => {
  navigateTo("/auth/signin");
};
</script>
