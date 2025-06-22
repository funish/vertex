<template>
  <div class="flex items-center justify-center min-h-screen p-4">
    <Card class="w-full max-w-md">
      <template #header>
        <div class="text-center p-6">
          <div class="flex justify-center mb-4">
            <i class="i-mdi-lock-reset text-4xl"></i>
          </div>
          <h1 class="text-2xl font-bold mb-2">
            {{ $t("auth.forgotPassword.title") }}
          </h1>
          <p>{{ $t("auth.forgotPassword.subtitle") }}</p>
        </div>
      </template>

      <template #content>
        <div class="p-6 pt-0">
          <form @submit="onSubmit" class="space-y-4">
            <div>
              <InputText
                id="email"
                v-model="email"
                type="email"
                :placeholder="$t('auth.forgotPassword.email')"
                fluid
                :class="{ 'p-invalid': emailError }"
                autofocus
              />
              <small v-if="emailError" class="p-error">{{ emailError }}</small>
            </div>

            <Button
              type="submit"
              :label="$t('auth.forgotPassword.submit')"
              fluid
              :loading="isLoading"
              :disabled="isLoading"
              icon="i-mdi-email-send"
            />

            <Message v-if="error" severity="secondary">
              {{ error }}
            </Message>

            <Message v-if="success" severity="secondary">
              {{ $t("auth.forgotPassword.success") }}
            </Message>
          </form>
        </div>
      </template>

      <template #footer>
        <div class="text-center p-6 pt-0">
          <p class="text-sm">
            {{ $t("auth.forgotPassword.rememberPassword") }}
            <NuxtLinkLocale to="/auth/signin" class="font-medium">
              {{ $t("auth.forgotPassword.backToSignIn") }}
            </NuxtLinkLocale>
          </p>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import InputText from "primevue/inputtext";
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
  title: "Forgot Password - Funish Vertex",
});

// Form reactive state
const email = ref("");
const isLoading = ref(false);
const error = ref("");
const emailError = ref("");
const success = ref(false);

// Form validation
const validateForm = () => {
  emailError.value = "";

  if (!email.value) {
    emailError.value = "Please enter your email address";
    return false;
  }

  if (!email.value.includes("@")) {
    emailError.value = "Please enter a valid email address";
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
    const result = await authClient.forgetPassword({
      email: email.value,
      redirectTo: "/auth/reset-password",
    });

    if (result.error) {
      error.value =
        result.error.message || "Failed to send password reset email";
    } else {
      success.value = true;
    }
  } catch (err) {
    error.value = "An error occurred, please try again later";
  } finally {
    isLoading.value = false;
  }
};
</script>
