<template>
  <div class="p-6">
    <!-- Page Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold mb-2">{{ $t("settings.title") }}</h1>
      <p class="text-surface-500">{{ $t("settings.description") }}</p>
    </div>

    <!-- Quick Settings -->
    <Card class="mb-6">
      <template #header>
        <div class="p-6 pb-0">
          <h2 class="text-xl font-semibold">
            {{ $t("settings.quickSettings") }}
          </h2>
        </div>
      </template>
      <template #content>
        <div class="flex flex-wrap gap-6 p-6 pt-0">
          <!-- Dark Mode Toggle -->
          <div class="flex items-center gap-3">
            <i class="i-mdi-weather-night text-lg text-surface-500"></i>
            <span>{{ $t("settings.darkMode") }}</span>
            <ToggleSwitch v-model="isDarkMode" @change="toggleDarkMode" />
          </div>

          <!-- Two Factor Authentication -->
          <div class="flex items-center gap-3">
            <i class="i-mdi-shield-account text-lg text-surface-500"></i>
            <span>{{ $t("settings.twoFactor") }}</span>
            <ToggleSwitch
              v-model="isTwoFactorEnabled"
              @change="toggleTwoFactor"
            />
          </div>

          <!-- Email Notifications -->
          <div class="flex items-center gap-3">
            <i class="i-mdi-email-outline text-lg text-surface-500"></i>
            <span>{{ $t("settings.emailNotifications") }}</span>
            <ToggleSwitch v-model="isEmailNotificationsEnabled" />
          </div>
        </div>
      </template>
    </Card>

    <!-- General Settings -->
    <Card class="mb-6">
      <template #header>
        <div class="p-6 pb-0">
          <h2 class="text-xl font-semibold flex items-center gap-2">
            <i class="i-mdi-cog text-xl text-primary"></i>
            {{ $t("settings.general.title") }}
          </h2>
        </div>
      </template>
      <template #content>
        <div class="p-6 pt-0 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-2">{{
                $t("settings.general.organizationName")
              }}</label>
              <InputText
                v-model="generalSettings.organizationName"
                :placeholder="
                  $t('settings.general.organizationNamePlaceholder')
                "
                fluid
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">{{
                $t("settings.general.timezone")
              }}</label>
              <Dropdown
                v-model="generalSettings.timezone"
                :options="timezoneOptions"
                optionLabel="label"
                optionValue="value"
                :placeholder="$t('settings.general.timezonePlaceholder')"
                fluid
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">{{
                $t("settings.general.language")
              }}</label>
              <Dropdown
                v-model="generalSettings.language"
                :options="languageOptions"
                optionLabel="label"
                optionValue="value"
                :placeholder="$t('settings.general.languagePlaceholder')"
                fluid
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">{{
                $t("settings.general.dateFormat")
              }}</label>
              <Dropdown
                v-model="generalSettings.dateFormat"
                :options="dateFormatOptions"
                optionLabel="label"
                optionValue="value"
                :placeholder="$t('settings.general.dateFormatPlaceholder')"
                fluid
              />
            </div>
          </div>
        </div>
      </template>
    </Card>

    <!-- Security Settings -->
    <Card class="mb-6">
      <template #header>
        <div class="p-6 pb-0">
          <h2 class="text-xl font-semibold flex items-center gap-2">
            <i class="i-mdi-shield-check text-xl"></i>
            <span class="font-medium">Security Settings</span>
          </h2>
        </div>
      </template>
      <template #content>
        <div class="p-6 pt-0 space-y-4">
          <div class="flex items-center justify-between p-4 border rounded">
            <div>
              <div class="font-medium">
                {{ $t("settings.security.passwordRequirements") }}
              </div>
              <div class="text-sm text-surface-500">
                {{ $t("settings.security.passwordRequirementsDescription") }}
              </div>
            </div>
            <Button
              :label="$t('settings.security.configure')"
              variant="outlined"
              size="small"
              @click="configurePasswordPolicy"
            />
          </div>

          <div class="flex items-center justify-between p-4 border rounded">
            <div>
              <div class="font-medium">
                {{ $t("settings.security.sessionTimeout") }}
              </div>
              <div class="text-sm text-surface-500">
                {{ $t("settings.security.sessionTimeoutDescription") }}
              </div>
            </div>
            <Dropdown
              v-model="securitySettings.sessionTimeout"
              :options="sessionTimeoutOptions"
              optionLabel="label"
              optionValue="value"
              class="w-48"
            />
          </div>

          <div class="flex items-center justify-between p-4 border rounded">
            <div>
              <div class="font-medium">
                {{ $t("settings.security.apiAccessLogs") }}
              </div>
              <div class="text-sm text-surface-500">
                {{ $t("settings.security.apiAccessLogsDescription") }}
              </div>
            </div>
            <ToggleSwitch v-model="securitySettings.apiLogging" />
          </div>
        </div>
      </template>
    </Card>

    <!-- Notification Settings -->
    <Card class="mb-6">
      <template #header>
        <div class="p-6 pb-0">
          <h2 class="text-xl font-semibold flex items-center gap-2">
            <i class="i-mdi-bell text-xl"></i>
            {{ $t("settings.notifications.title") }}
          </h2>
        </div>
      </template>
      <template #content>
        <div class="p-6 pt-0 space-y-4">
          <div class="flex items-center justify-between p-4 border rounded">
            <div>
              <div class="font-medium">
                {{ $t("settings.notifications.email") }}
              </div>
              <div class="text-sm text-surface-500">
                {{ $t("settings.notifications.emailDescription") }}
              </div>
            </div>
            <ToggleSwitch v-model="notificationSettings.email" />
          </div>

          <div class="flex items-center justify-between p-4 border rounded">
            <div>
              <div class="font-medium">
                {{ $t("settings.notifications.securityAlerts") }}
              </div>
              <div class="text-sm text-surface-500">
                {{ $t("settings.notifications.securityAlertsDescription") }}
              </div>
            </div>
            <ToggleSwitch v-model="notificationSettings.security" />
          </div>

          <div class="flex items-center justify-between p-4 border rounded">
            <div>
              <div class="font-medium">
                {{ $t("settings.notifications.systemUpdates") }}
              </div>
              <div class="text-sm text-surface-500">
                {{ $t("settings.notifications.systemUpdatesDescription") }}
              </div>
            </div>
            <ToggleSwitch v-model="notificationSettings.system" />
          </div>

          <div class="flex items-center justify-between p-4 border rounded">
            <div>
              <div class="font-medium">
                {{ $t("settings.notifications.weeklyReports") }}
              </div>
              <div class="text-sm text-surface-500">
                {{ $t("settings.notifications.weeklyReportsDescription") }}
              </div>
            </div>
            <ToggleSwitch v-model="notificationSettings.reports" />
          </div>
        </div>
      </template>
    </Card>

    <!-- Save Actions -->
    <Card>
      <template #content>
        <div class="flex justify-end gap-3 p-6">
          <Button
            :label="$t('settings.actions.resetToDefaults')"
            variant="outlined"
            severity="secondary"
            @click="resetSettings"
          />
          <Button
            :label="$t('settings.actions.saveChanges')"
            icon="i-mdi-content-save"
            @click="saveSettings"
            :loading="isSaving"
          />
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
// Define page metadata
definePageMeta({
  title: "Settings",
  description: "Manage your account settings and preferences",
});

// Head configuration
useHead({
  title: "Settings",
});

// State
const isDarkMode = ref(false);
const isTwoFactorEnabled = ref(false);
const isEmailNotificationsEnabled = ref(true);
const isSaving = ref(false);

// Settings forms
const generalSettings = reactive({
  organizationName: "Default Organization",
  timezone: "UTC",
  language: "en",
  dateFormat: "MM/DD/YYYY",
});

const securitySettings = reactive({
  sessionTimeout: "30",
  apiLogging: true,
});

const notificationSettings = reactive({
  email: true,
  security: true,
  system: false,
  reports: true,
});

// Options
const timezoneOptions = ref([
  { label: "UTC", value: "UTC" },
  { label: "America/New_York", value: "America/New_York" },
  { label: "America/Los_Angeles", value: "America/Los_Angeles" },
  { label: "Europe/London", value: "Europe/London" },
  { label: "Asia/Tokyo", value: "Asia/Tokyo" },
  { label: "Asia/Shanghai", value: "Asia/Shanghai" },
]);

const languageOptions = ref([
  { label: "English", value: "en" },
  { label: "简体中文", value: "zh" },
]);

const dateFormatOptions = ref([
  { label: "MM/DD/YYYY", value: "MM/DD/YYYY" },
  { label: "DD/MM/YYYY", value: "DD/MM/YYYY" },
  { label: "YYYY-MM-DD", value: "YYYY-MM-DD" },
]);

const sessionTimeoutOptions = ref([
  { label: "15 minutes", value: "15" },
  { label: "30 minutes", value: "30" },
  { label: "1 hour", value: "60" },
  { label: "8 hours", value: "480" },
  { label: "Never", value: "0" },
]);

// Initialize dark mode state from localStorage or system preference
onMounted(() => {
  // Check if dark mode class exists on document
  isDarkMode.value = document.documentElement.classList.contains("app-dark");

  // Or check localStorage preference
  const storedPreference = localStorage.getItem("theme");
  if (storedPreference === "dark") {
    isDarkMode.value = true;
    document.documentElement.classList.add("app-dark");
  } else if (storedPreference === "light") {
    isDarkMode.value = false;
    document.documentElement.classList.remove("app-dark");
  } else {
    // Check system preference
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    isDarkMode.value = prefersDark;
    if (prefersDark) {
      document.documentElement.classList.add("app-dark");
    }
  }
});

// Methods
const toggleDarkMode = () => {
  if (isDarkMode.value) {
    document.documentElement.classList.add("app-dark");
    localStorage.setItem("theme", "dark");
  } else {
    document.documentElement.classList.remove("app-dark");
    localStorage.setItem("theme", "light");
  }
};

const toggleTwoFactor = () => {
  if (isTwoFactorEnabled.value) {
    // Show success message
    console.log("Two-factor authentication enabled");
  } else {
    // Show setup dialog or navigate to setup
    console.log("Two-factor authentication disabled");
  }
};

const configurePasswordPolicy = () => {
  console.log("Configure password policy");
};

const saveSettings = async () => {
  isSaving.value = true;
  try {
    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log("Settings saved:", {
      general: generalSettings,
      security: securitySettings,
      notifications: notificationSettings,
    });
  } catch (error) {
    console.error("Error saving settings:", error);
  } finally {
    isSaving.value = false;
  }
};

const resetSettings = () => {
  // Reset to default values
  generalSettings.organizationName = "Default Organization";
  generalSettings.timezone = "UTC";
  generalSettings.language = "en";
  generalSettings.dateFormat = "MM/DD/YYYY";

  securitySettings.sessionTimeout = "30";
  securitySettings.apiLogging = true;

  notificationSettings.email = true;
  notificationSettings.security = true;
  notificationSettings.system = false;
  notificationSettings.reports = true;

  console.log("Settings reset to defaults");
};
</script>

<style scoped>
/* Card spacing */
:deep(.p-card) {
  box-shadow:
    0 1px 3px 0 rgba(0, 0, 0, 0.1),
    0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

:deep(.p-card:hover) {
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.3s ease;
}
</style>
