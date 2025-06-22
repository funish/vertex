<template>
  <div class="p-6">
    <!-- Page Header -->
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-4xl font-bold mb-2">{{ $t("dashboard.welcome") }}</h1>
          <p class="text-surface-600 dark:text-surface-300">
            {{ $t("dashboard.overview") }}
          </p>
        </div>
        <div class="flex gap-2">
          <Button
            icon="i-mdi-refresh"
            severity="secondary"
            variant="outlined"
            @click="refreshData"
            :loading="loading"
          />
          <Button
            icon="i-mdi-cog"
            severity="secondary"
            variant="outlined"
            @click="$router.push('/dashboard/settings')"
          />
        </div>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card
        v-for="stat in stats"
        :key="stat.key"
        class="hover:shadow-lg transition-shadow duration-300"
      >
        <template #content>
          <div class="flex items-center justify-between p-4">
            <div>
              <p class="text-3xl font-bold mb-1">{{ stat.value }}</p>
              <p class="text-sm">{{ stat.label }}</p>
              <div class="flex items-center gap-1 mt-2">
                <i
                  :class="[
                    stat.trend === 'up'
                      ? 'i-mdi-trending-up'
                      : 'i-mdi-trending-down',
                  ]"
                  class="text-sm"
                ></i>
                <span class="text-xs font-medium"> {{ stat.change }}% </span>
              </div>
            </div>
            <div
              class="w-16 h-16 rounded-full flex items-center justify-center bg-surface-100 dark:bg-surface-800"
            >
              <i :class="stat.icon" class="text-2xl"></i>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
      <!-- Recent Activity -->
      <Card class="xl:col-span-2">
        <template #header>
          <div class="p-6 pb-0">
            <div class="flex items-center justify-between">
              <h3 class="text-xl font-semibold">
                {{ $t("dashboard.recentActivity") }}
              </h3>
              <Button
                :label="$t('dashboard.viewAll')"
                variant="text"
                size="small"
                icon="i-mdi-arrow-right"
                iconPos="right"
              />
            </div>
          </div>
        </template>

        <template #content>
          <div class="p-6 pt-0">
            <div class="space-y-4">
              <div
                v-for="activity in activities"
                :key="activity.id"
                class="flex items-center gap-4 p-4 rounded-lg bg-surface-50 dark:bg-surface-900"
              >
                <Avatar :icon="activity.icon" shape="circle" size="large" />
                <div class="flex-1">
                  <p class="font-medium mb-1">{{ activity.title }}</p>
                  <p class="text-sm">{{ activity.description }}</p>
                </div>
                <div class="text-right">
                  <p class="text-xs text-surface-500">{{ activity.time }}</p>
                </div>
              </div>
            </div>
          </div>
        </template>
      </Card>

      <!-- Quick Actions -->
      <Card>
        <template #header>
          <div class="p-6 pb-0">
            <h3 class="text-xl font-semibold">
              {{ $t("dashboard.quickActions") }}
            </h3>
          </div>
        </template>

        <template #content>
          <div class="p-6 pt-0">
            <div class="space-y-3">
              <Button
                v-for="action in quickActions"
                :key="action.label"
                :label="action.label"
                :icon="action.icon"
                :severity="action.severity"
                :variant="action.variant"
                fluid
                class="justify-start"
                @click="action.action"
              />
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- System Status -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Plugin Status -->
      <Card>
        <template #header>
          <div class="p-6 pb-0">
            <div class="flex items-center justify-between">
              <h3 class="text-xl font-semibold">{{ $t("plugins.title") }}</h3>
              <Button
                :label="$t('nav.plugins')"
                variant="text"
                size="small"
                icon="i-mdi-arrow-right"
                iconPos="right"
                @click="$router.push('/dashboard/plugins')"
              />
            </div>
          </div>
        </template>

        <template #content>
          <div class="p-6 pt-0">
            <div class="space-y-3">
              <div
                v-for="plugin in pluginStatus"
                :key="plugin.name"
                class="flex items-center justify-between p-3 rounded border border-surface-200 dark:border-surface-700"
              >
                <div class="flex items-center gap-3">
                  <i :class="plugin.icon" class="text-lg"></i>
                  <span class="font-medium">{{ plugin.name }}</span>
                </div>
                <Tag
                  :value="
                    plugin.enabled
                      ? $t('plugins.enabled')
                      : $t('plugins.disabled')
                  "
                  :severity="plugin.enabled ? 'success' : 'secondary'"
                />
              </div>
            </div>
          </div>
        </template>
      </Card>

      <!-- System Health -->
      <Card>
        <template #header>
          <div class="p-6 pb-0">
            <h3 class="text-xl font-semibold">System Health</h3>
          </div>
        </template>

        <template #content>
          <div class="p-6 pt-0">
            <div class="space-y-4">
              <div
                v-for="metric in systemHealth"
                :key="metric.name"
                class="flex items-center justify-between"
              >
                <span class="font-medium">{{ metric.name }}</span>
                <div class="flex items-center gap-2">
                  <div
                    class="w-24 h-2 bg-surface-200 dark:bg-surface-700 rounded-full"
                  >
                    <div
                      class="h-full rounded-full transition-all duration-300 bg-surface-400 dark:bg-surface-600"
                      :style="{ width: metric.value + '%' }"
                    ></div>
                  </div>
                  <span class="text-sm font-medium">{{ metric.value }}%</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

const { t } = useI18n();
const router = useRouter();
const loading = ref(false);

// Stats data
const stats = computed(() => [
  {
    key: "users",
    label: t("dashboard.stats.totalUsers"),
    value: "1,247",
    change: 12,
    trend: "up",
    icon: "i-mdi-account-group",
  },
  {
    key: "organizations",
    label: t("dashboard.stats.activeOrganizations"),
    value: "23",
    change: 5,
    trend: "up",
    icon: "i-mdi-domain",
  },
  {
    key: "plugins",
    label: t("dashboard.stats.enabledPlugins"),
    value: "5",
    change: 0,
    trend: "up",
    icon: "i-mdi-puzzle",
  },
  {
    key: "requests",
    label: t("dashboard.stats.apiRequests"),
    value: "45.2K",
    change: 8,
    trend: "up",
    icon: "i-mdi-api",
  },
]);

// Recent activities
const activities = ref([
  {
    id: 1,
    title: "New user registered",
    description: "john.doe@example.com joined Default Organization",
    time: "2 minutes ago",
    icon: "i-mdi-account-plus",
  },
  {
    id: 2,
    title: "Plugin enabled",
    description: "Storage plugin was enabled",
    time: "15 minutes ago",
    icon: "i-mdi-puzzle",
  },
  {
    id: 3,
    title: "API key created",
    description: "New API key generated for production",
    time: "1 hour ago",
    icon: "i-mdi-key",
  },
  {
    id: 4,
    title: "Organization updated",
    description: "Default Organization settings modified",
    time: "2 hours ago",
    icon: "i-mdi-cog",
  },
]);

// Quick actions
const quickActions = computed(() => [
  {
    label: "Invite User",
    icon: "i-mdi-account-plus",
    severity: "primary",
    variant: "outlined",
    action: () => router.push("/dashboard/users"),
  },
  {
    label: "Add Plugin",
    icon: "i-mdi-puzzle-plus",
    severity: "secondary",
    variant: "outlined",
    action: () => router.push("/dashboard/plugins"),
  },
  {
    label: "Create API Key",
    icon: "i-mdi-key-plus",
    severity: "secondary",
    variant: "outlined",
    action: () => router.push("/dashboard/api-keys"),
  },
  {
    label: "View Settings",
    icon: "i-mdi-cog",
    severity: "secondary",
    variant: "outlined",
    action: () => router.push("/dashboard/settings"),
  },
]);

// Plugin status
const pluginStatus = ref([
  {
    name: "Multi-Tenant Management",
    enabled: true,
    icon: "i-mdi-domain",
  },
  {
    name: "File Storage",
    enabled: true,
    icon: "i-mdi-folder",
  },
  {
    name: "Database",
    enabled: true,
    icon: "i-mdi-database",
  },
  {
    name: "AI Router",
    enabled: false,
    icon: "i-mdi-robot",
  },
  {
    name: "API Gateway",
    enabled: true,
    icon: "i-mdi-gateway",
  },
]);

// System health metrics
const systemHealth = ref([
  {
    name: "CPU Usage",
    value: 45,
  },
  {
    name: "Memory",
    value: 62,
  },
  {
    name: "Storage",
    value: 28,
  },
  {
    name: "Network",
    value: 91,
  },
]);

// Methods
const refreshData = async () => {
  loading.value = true;
  // Simulate API call
  setTimeout(() => {
    loading.value = false;
  }, 1000);
};

// Lifecycle
onMounted(() => {
  // Load dashboard data
});
</script>
