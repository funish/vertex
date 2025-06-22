<template>
  <div class="min-h-screen">
    <!-- Top Toolbar -->
    <Toolbar class="border-0">
      <template #start>
        <div class="flex items-center gap-2">
          <i class="i-mdi-hexagon-multiple text-2xl"></i>
          <span class="font-semibold text-xl">Funish Vertex</span>
        </div>
      </template>

      <template #center>
        <div class="flex items-center gap-2">
          <label class="text-sm"
            >{{ $t("dashboard.currentOrganization") }}:</label
          >
          <Dropdown
            v-model="selectedOrganization"
            :options="organizations"
            optionLabel="name"
            :placeholder="$t('dashboard.selectOrganization')"
            class="w-48"
            @change="switchOrganization"
          />
        </div>
      </template>

      <template #end>
        <div class="flex items-center gap-3">
          <Button
            icon="i-mdi-bell-outline"
            severity="secondary"
            variant="text"
            rounded
          />
          <Button
            icon="i-mdi-cog-outline"
            severity="secondary"
            variant="text"
            rounded
          />
          <div class="flex items-center gap-2">
            <Avatar :label="userInitials" shape="circle" size="small" />
            <div class="hidden md:block">
              <div class="text-sm font-medium">
                {{ user?.name || user?.email }}
              </div>
              <div class="text-xs">{{ userRole }}</div>
            </div>
          </div>
        </div>
      </template>
    </Toolbar>

    <!-- Main Layout with Splitter -->
    <Splitter class="h-[calc(100vh-4rem)]">
      <!-- Sidebar Panel -->
      <SplitterPanel :size="15" :minSize="15">
        <div class="h-full flex flex-col">
          <!-- Navigation Menu -->
          <div class="flex-1 p-2">
            <Menu :model="menuItems" class="w-full border-0">
              <template #item="{ item, props }">
                <NuxtLinkLocale
                  :to="item.route"
                  class="flex items-center p-3 rounded"
                  v-bind="props.action"
                >
                  <i :class="item.icon" class="mr-2"></i>
                  <span>{{ item.label }}</span>
                </NuxtLinkLocale>
              </template>
            </Menu>
          </div>

          <!-- Sign Out Button -->
          <div class="p-4">
            <Button
              :label="$t('auth.signOut')"
              icon="i-mdi-logout"
              @click="signOut"
              fluid
              severity="secondary"
              variant="outlined"
              size="small"
            />
          </div>
        </div>
      </SplitterPanel>

      <!-- Main Content Panel -->
      <SplitterPanel :size="80">
        <div class="h-full overflow-auto">
          <NuxtPage />
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { authClient } from "~/utils/auth";
import type { Organization } from "better-auth/plugins";
import { useI18n } from "vue-i18n";

// Auth is handled by global middleware

// Types for Organization are imported from better-auth/plugins

// Composables
const router = useRouter();
const { data: session } = await authClient.useSession(useFetch);
const { t } = useI18n();

// Reactive data
const selectedOrganization = ref<Organization | null>(null);
const organizations = ref<Organization[]>([]);

// Computed properties
const user = computed(() => session.value?.user);

const userInitials = computed(() => {
  if (user.value?.name) {
    return user.value.name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase();
  }
  if (user.value?.email) {
    return user.value.email.substring(0, 2).toUpperCase();
  }
  return "U";
});

const userRole = computed(() => {
  // This would come from organization membership
  return "Admin"; // Placeholder
});

// Menu items for PrimeVue Menu component
const menuItems = computed(() => [
  {
    label: t("nav.dashboard"),
    icon: "i-mdi-view-dashboard",
    route: "/dashboard",
  },
  {
    label: t("nav.organizations"),
    icon: "i-mdi-domain",
    route: "/dashboard/organizations",
  },
  {
    label: t("nav.users"),
    icon: "i-mdi-account-group",
    route: "/dashboard/users",
  },
  {
    label: t("nav.plugins"),
    icon: "i-mdi-puzzle",
    route: "/dashboard/plugins",
  },
  {
    label: t("nav.apiKeys"),
    icon: "i-mdi-key",
    route: "/dashboard/api-keys",
  },
  {
    label: t("nav.permissions"),
    icon: "i-mdi-shield-account",
    route: "/dashboard/permissions",
  },
  {
    label: t("nav.settings"),
    icon: "i-mdi-cog",
    route: "/dashboard/settings",
  },
]);

// Methods
const loadOrganizations = async () => {
  try {
    // Load mock organizations for now
    organizations.value = [
      {
        id: "org_1",
        name: "Default Organization",
        slug: "default-org",
        createdAt: new Date(),
      } as Organization,
    ];

    if (organizations.value.length > 0 && !selectedOrganization.value) {
      selectedOrganization.value = organizations.value[0] || null;
    }
  } catch (error) {
    console.error("Error loading organizations:", error);
  }
};

const switchOrganization = async (event: any) => {
  try {
    if (event.value) {
      selectedOrganization.value = event.value;
      // TODO: Implement organization switching API call
      console.log("Switching to organization:", event.value.id);
    }
  } catch (error) {
    console.error("Error switching organization:", error);
  }
};

const signOut = async () => {
  try {
    await authClient.signOut();
    router.push("/auth/signin");
  } catch (error) {
    console.error("Error signing out:", error);
  }
};

// Lifecycle
onMounted(() => {
  loadOrganizations();
});
</script>
