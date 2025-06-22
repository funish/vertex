<template>
  <form @submit="onSubmit" class="space-y-4">
    <div>
      <InputText
        id="email"
        v-model="email"
        type="email"
        :placeholder="$t('auth.signin.email')"
        fluid
        :class="{ 'p-invalid': emailError }"
        autofocus
      />
      <small v-if="emailError" class="p-error">{{ emailError }}</small>
    </div>

    <div>
      <Password
        id="password"
        v-model="password"
        :placeholder="$t('auth.signin.password')"
        fluid
        :class="{ 'p-invalid': passwordError }"
        :feedback="false"
        toggle-mask
      />
      <small v-if="passwordError" class="p-error">{{ passwordError }}</small>
    </div>

    <div class="flex items-center justify-between">
      <div class="flex items-center">
        <Checkbox id="remember" v-model="remember" binary />
        <label for="remember" class="ml-2 text-sm">
          {{ $t("auth.signin.remember") }}
        </label>
      </div>
    </div>

    <Button
      type="submit"
      :label="$t('auth.signin.submit')"
      fluid
      :loading="isLoading"
      :disabled="isLoading"
      icon="i-mdi-login"
    />

    <Message v-if="error" severity="error">
      {{ error }}
    </Message>
  </form>
</template>

<script setup lang="ts">
import { ref } from "vue";
import InputText from "primevue/inputtext";
import Password from "primevue/password";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import Message from "primevue/message";
import { authClient } from "~/utils/auth";
import { useI18n } from "vue-i18n";

// Access i18n for translations
const { t } = useI18n();

// Form reactive state
const email = ref("");
const password = ref("");
const remember = ref(false);
const isLoading = ref(false);
const error = ref("");
const emailError = ref("");
const passwordError = ref("");

// Form validation
const validateForm = () => {
  emailError.value = "";
  passwordError.value = "";

  if (!email.value) {
    emailError.value = t("auth.signin.error.required");
    return false;
  }

  if (!email.value.includes("@")) {
    emailError.value = t("auth.signin.error.invalid");
    return false;
  }

  if (!password.value) {
    passwordError.value = t("auth.signin.error.passwordRequired");
    return false;
  }

  if (password.value.length < 6) {
    passwordError.value = t("auth.signin.error.passwordShort");
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

  try {
    const result = await authClient.signIn.email({
      email: email.value,
      password: password.value,
    });

    if (result.error) {
      error.value = result.error.message || t("auth.signin.error.loginFailed");
    } else {
      await navigateTo("/dashboard");
    }
  } catch (err) {
    error.value = t("auth.signin.error.general");
  } finally {
    isLoading.value = false;
  }
};
</script>
