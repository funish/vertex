<template>
  <form @submit="onSubmit" class="space-y-4">
    <div>
      <InputText
        id="name"
        v-model="name"
        type="text"
        :placeholder="$t('auth.signup.name')"
        fluid
        :class="{ 'p-invalid': nameError }"
        autofocus
      />
      <small v-if="nameError" class="p-error">{{ nameError }}</small>
    </div>

    <div>
      <InputText
        id="email"
        v-model="email"
        type="email"
        :placeholder="$t('auth.signup.email')"
        fluid
        :class="{ 'p-invalid': emailError }"
      />
      <small v-if="emailError" class="p-error">{{ emailError }}</small>
    </div>

    <div>
      <Password
        id="password"
        v-model="password"
        :placeholder="$t('auth.signup.password')"
        fluid
        :class="{ 'p-invalid': passwordError }"
        :feedback="true"
        toggle-mask
      />
      <small v-if="passwordError" class="p-error">{{ passwordError }}</small>
    </div>

    <div>
      <Password
        id="confirmPassword"
        v-model="confirmPassword"
        :placeholder="$t('auth.signup.confirmPassword')"
        fluid
        :class="{ 'p-invalid': confirmPasswordError }"
        :feedback="false"
        toggle-mask
      />
      <small v-if="confirmPasswordError" class="p-error">{{
        confirmPasswordError
      }}</small>
    </div>

    <div class="flex items-center">
      <Checkbox
        id="terms"
        v-model="acceptTerms"
        binary
        :class="{ 'p-invalid': termsError }"
      />
      <label for="terms" class="ml-2 text-sm">
        {{ $t("auth.signup.terms") }}
        <NuxtLinkLocale to="/terms" class="font-medium">
          {{ $t("auth.signup.termsLink") }}
        </NuxtLinkLocale>
        {{ $t("auth.signup.and") }}
        <NuxtLinkLocale to="/privacy" class="font-medium">
          {{ $t("auth.signup.privacyLink") }}
        </NuxtLinkLocale>
      </label>
    </div>
    <small v-if="termsError" class="p-error block">{{ termsError }}</small>

    <Button
      type="submit"
      :label="$t('auth.signup.submit')"
      fluid
      :loading="isLoading"
      :disabled="isLoading"
      icon="i-mdi-account-plus"
    />

    <Message v-if="error" severity="error">
      {{ error }}
    </Message>

    <Message v-if="success" severity="success">
      {{ success }}
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

// Access i18n for translations
const { t } = useI18n();

// Form reactive state
const name = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const acceptTerms = ref(false);
const isLoading = ref(false);
const error = ref("");
const success = ref("");

// Form validation errors
const nameError = ref("");
const emailError = ref("");
const passwordError = ref("");
const confirmPasswordError = ref("");
const termsError = ref("");

// Form validation
const validateForm = () => {
  nameError.value = "";
  emailError.value = "";
  passwordError.value = "";
  confirmPasswordError.value = "";
  termsError.value = "";

  let isValid = true;

  if (!name.value.trim()) {
    nameError.value = t("auth.signup.error.nameRequired");
    isValid = false;
  }

  if (!email.value) {
    emailError.value = t("auth.signup.error.emailRequired");
    isValid = false;
  } else if (!email.value.includes("@")) {
    emailError.value = t("auth.signup.error.emailInvalid");
    isValid = false;
  }

  if (!password.value) {
    passwordError.value = t("auth.signup.error.passwordRequired");
    isValid = false;
  } else if (password.value.length < 8) {
    passwordError.value = t("auth.signup.error.passwordShort");
    isValid = false;
  }

  if (!confirmPassword.value) {
    confirmPasswordError.value = t("auth.signup.error.confirmRequired");
    isValid = false;
  } else if (password.value !== confirmPassword.value) {
    confirmPasswordError.value = t("auth.signup.error.passwordMismatch");
    isValid = false;
  }

  if (!acceptTerms.value) {
    termsError.value = t("auth.signup.error.termsRequired");
    isValid = false;
  }

  return isValid;
};

// Handle form submission
const onSubmit = async (event: Event) => {
  event.preventDefault();

  if (!validateForm()) {
    return;
  }

  isLoading.value = true;
  error.value = "";
  success.value = "";

  try {
    const result = await authClient.signUp.email({
      email: email.value,
      password: password.value,
      name: name.value,
    });

    if (result.error) {
      error.value = result.error.message || t("auth.signup.error.signupFailed");
    } else {
      success.value = t("auth.signup.success");
      setTimeout(() => {
        navigateTo("/auth/signin");
      }, 3000);
    }
  } catch (err) {
    error.value = t("auth.signup.error.general");
  } finally {
    isLoading.value = false;
  }
};
</script>
