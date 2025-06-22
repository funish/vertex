<template>
  <div class="flex items-center justify-center min-h-screen p-4">
    <Card class="w-full max-w-md">
      <template #header>
        <div class="text-center p-6">
          <div class="flex justify-center mb-4">
            <i class="i-mdi-key-change text-4xl"></i>
          </div>
          <h1 class="text-2xl font-bold mb-2">
            {{ $t("auth.resetPassword.title") }}
          </h1>
          <p>{{ $t("auth.resetPassword.subtitle") }}</p>
        </div>
      </template>

      <template #content>
        <div class="p-6 pt-0">
          <form @submit="onSubmit" class="space-y-4">
            <div>
              <Password
                id="password"
                v-model="password"
                :placeholder="$t('auth.resetPassword.newPassword')"
                fluid
                :class="{ 'p-invalid': passwordError }"
                toggle-mask
                :feedback="true"
              />
              <small v-if="passwordError" class="p-error">{{
                passwordError
              }}</small>
            </div>

            <div>
              <Password
                id="confirmPassword"
                v-model="confirmPassword"
                :placeholder="$t('auth.resetPassword.confirmPassword')"
                fluid
                :class="{ 'p-invalid': confirmPasswordError }"
                toggle-mask
                :feedback="false"
              />
              <small v-if="confirmPasswordError" class="p-error">{{
                confirmPasswordError
              }}</small>
            </div>

            <Button
              type="submit"
              :label="$t('auth.resetPassword.submit')"
              fluid
              :loading="isLoading"
              :disabled="isLoading"
              icon="i-mdi-key"
            />

            <Message v-if="error" severity="secondary">
              {{ error }}
            </Message>

            <Message v-if="success" severity="secondary">
              {{ $t("auth.resetPassword.success") }}
            </Message>
          </form>
        </div>
      </template>

      <template #footer>
        <div class="text-center p-6 pt-0">
          <p class="text-sm">
            {{ $t("auth.resetPassword.backTo") }}
            <NuxtLinkLocale to="/auth/signin" class="font-medium">
              {{ $t("auth.resetPassword.signIn") }}
            </NuxtLinkLocale>
          </p>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import Password from "primevue/password";
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
  title: "Reset Password - Funish Vertex",
});

// Get token from query params
const route = useRoute();
const token = route.query.token as string;

// Redirect if no token
if (!token) {
  await navigateTo("/auth/forgot-password");
}

// Form reactive state
const password = ref("");
const confirmPassword = ref("");
const isLoading = ref(false);
const error = ref("");
const passwordError = ref("");
const confirmPasswordError = ref("");
const success = ref(false);

// Form validation
const validateForm = () => {
  passwordError.value = "";
  confirmPasswordError.value = "";

  if (!password.value) {
    passwordError.value = "Please enter your new password";
    return false;
  }

  if (password.value.length < 8) {
    passwordError.value = "Password must be at least 8 characters";
    return false;
  }

  if (!confirmPassword.value) {
    confirmPasswordError.value = "Please confirm your password";
    return false;
  }

  if (password.value !== confirmPassword.value) {
    confirmPasswordError.value = "Passwords do not match";
    return false;
  }

  return true;
};

// Handle form submission
const onSubmit = async (event: Event) => {
  event.preventDefault();

  if (!validateForm()) {
    return;
  }

  isLoading.value = true;
  error.value = "";
  success.value = false;

  try {
    const result = await authClient.resetPassword({
      token: token,
      newPassword: password.value,
    });

    if (result.error) {
      error.value = result.error.message || "Failed to reset password";
    } else {
      success.value = true;
      // Redirect to sign in after success
      setTimeout(() => {
        navigateTo("/auth/signin");
      }, 2000);
    }
  } catch (err) {
    error.value = "An error occurred, please try again later";
  } finally {
    isLoading.value = false;
  }
};
</script>
