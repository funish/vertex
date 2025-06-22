<template>
  <div class="p-6">
    <!-- Page Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold mb-2">{{ $t("dashboard.title") }}</h1>
      <p>
        {{
          $t("dashboard.welcome", {
            org: selectedOrganization?.name || "your organization",
          })
        }}
      </p>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card>
        <template #content>
          <div class="flex items-center justify-between p-4">
            <div>
              <p class="mb-2">{{ $t("dashboard.stats.totalUsers") }}</p>
              <p class="text-2xl font-bold">{{ stats.totalUsers }}</p>
            </div>
            <div class="w-12 h-12 flex items-center justify-center rounded-lg">
              <i class="i-mdi-account-group text-2xl"></i>
            </div>
          </div>
        </template>
      </Card>

      <Card>
        <template #content>
          <div class="flex items-center justify-between p-4">
            <div>
              <p class="mb-2">{{ $t("dashboard.stats.activePlugins") }}</p>
              <p class="text-2xl font-bold">{{ stats.activePlugins }}</p>
            </div>
            <div class="w-12 h-12 flex items-center justify-center rounded-lg">
              <i class="i-mdi-puzzle text-2xl"></i>
            </div>
          </div>
        </template>
      </Card>

      <Card>
        <template #content>
          <div class="flex items-center justify-between p-4">
            <div>
              <p class="mb-2">{{ $t("dashboard.stats.apiCalls") }}</p>
              <p class="text-2xl font-bold">
                {{ stats.apiCalls.toLocaleString() }}
              </p>
            </div>
            <div class="w-12 h-12 flex items-center justify-center rounded-lg">
              <i class="i-mdi-api text-2xl"></i>
            </div>
          </div>
        </template>
      </Card>

      <Card>
        <template #content>
          <div class="flex items-center justify-between p-4">
            <div>
              <p class="mb-2">{{ $t("dashboard.stats.uptime") }}</p>
              <p class="text-2xl font-bold">{{ stats.uptime }}</p>
            </div>
            <div class="w-12 h-12 flex items-center justify-center rounded-lg">
              <i class="i-mdi-server text-2xl"></i>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Recent Activity -->
      <Card>
        <template #header>
          <div class="flex items-center justify-between p-4">
            <h3 class="text-lg font-semibold">
              {{ $t("dashboard.recentActivity.title") }}
            </h3>
            <Button
              :label="$t('dashboard.recentActivity.viewAll')"
              variant="text"
              size="small"
            />
          </div>
        </template>

        <template #content>
          <div class="p-4 pt-0">
            <div class="space-y-4">
              <div
                v-for="activity in recentActivities"
                :key="activity.id"
                class="flex items-center justify-between"
              >
                <div class="flex-1">
                  <p class="font-medium">{{ activity.description }}</p>
                  <p class="text-sm">{{ activity.timestamp }}</p>
                </div>
                <Badge :value="activity.type" severity="secondary" />
              </div>
            </div>
          </div>
        </template>
      </Card>

      <!-- Quick Actions -->
      <Card>
        <template #header>
          <div class="p-4">
            <h3 class="text-lg font-semibold">
              {{ $t("dashboard.quickActions.title") }}
            </h3>
          </div>
        </template>

        <template #content>
          <div class="p-4 pt-0">
            <div class="grid grid-cols-2 gap-3">
              <Button
                :label="$t('dashboard.quickActions.inviteUser')"
                icon="i-mdi-account-plus"
                severity="secondary"
                variant="outlined"
                size="small"
              />
              <Button
                :label="$t('dashboard.quickActions.addPlugin')"
                icon="i-mdi-puzzle-plus"
                severity="secondary"
                variant="outlined"
                size="small"
              />
              <Button
                :label="$t('dashboard.quickActions.createApiKey')"
                icon="i-mdi-key-plus"
                severity="secondary"
                variant="outlined"
                size="small"
              />
              <Button
                :label="$t('dashboard.quickActions.viewSettings')"
                icon="i-mdi-cog"
                severity="secondary"
                variant="outlined"
                size="small"
              />
            </div>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Organization } from "better-auth/plugins";

// Define page metadata
definePageMeta({
  title: "Dashboard",
});

// Set page head
useHead({
  title: "Dashboard - Funish Vertex",
});

// Mock organization (would come from auth context in real app)
const selectedOrganization = ref<Organization | null>({
  id: "org_1",
  name: "Default Organization",
  slug: "default-org",
  createdAt: new Date(),
} as Organization);

// Mock statistics
const stats = reactive({
  totalUsers: 142,
  activePlugins: 5,
  apiCalls: 2847,
  uptime: "99.9%",
});

// Mock recent activities
const recentActivities = ref([
  {
    id: 1,
    description: "John Doe joined the organization",
    timestamp: "30 minutes ago",
    type: "User",
  },
  {
    id: 2,
    description: "Storage Plugin plugin enabled",
    timestamp: "2 hours ago",
    type: "Plugin",
  },
  {
    id: 3,
    description: "API key prod-api-*** created",
    timestamp: "1 day ago",
    type: "API",
  },
]);
</script>
