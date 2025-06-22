<template>
  <div class="p-6">
    <!-- Page Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold mb-2">{{ $t("plugins.title") }}</h1>
      <p class="mb-6">{{ $t("plugins.description") }}</p>

      <div class="flex justify-between items-center mb-6">
        <div class="flex gap-3">
          <Button
            :label="$t('plugins.refresh')"
            icon="i-mdi-refresh"
            @click="loadPlugins"
            variant="outlined"
            :loading="isLoading"
          />
        </div>

        <div class="flex items-center gap-2">
          <InputText
            v-model="searchQuery"
            :placeholder="$t('plugins.search')"
            class="w-80"
          />
          <Button icon="i-mdi-magnify" @click="loadPlugins" />
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error" class="mb-6">
      <Message severity="secondary">
        {{ error }}
      </Message>
      <div class="mt-2">
        <Button
          :label="$t('plugins.retry')"
          @click="loadPlugins"
          variant="text"
          size="small"
        />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading && !plugins.length" class="text-center py-12">
      <ProgressSpinner />
      <p class="mt-4">{{ $t("common.loading") }}</p>
    </div>

    <!-- Available Plugins from Registry -->
    <div v-else-if="filteredPlugins.length > 0">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">{{ $t("plugins.available") }}</h2>
        <Badge :value="filteredPlugins.length" severity="secondary" />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card v-for="plugin in filteredPlugins" :key="plugin.id">
          <template #header>
            <div class="flex items-center justify-between p-4">
              <div class="flex items-center gap-3">
                <Avatar
                  :label="getPluginInitials(plugin.name || plugin.id)"
                  shape="circle"
                  size="large"
                />
                <div>
                  <h3 class="font-semibold">{{ plugin.name || plugin.id }}</h3>
                  <p class="text-sm">v{{ plugin.version || "1.0.0" }}</p>
                </div>
              </div>

              <Badge
                :value="plugin.status"
                :severity="getStatusSeverity(plugin.status)"
              />
            </div>
          </template>

          <template #content>
            <div class="p-4">
              <p class="mb-4">
                {{ plugin.description || "No description available" }}
              </p>

              <div class="flex justify-between items-center">
                <span class="text-sm">{{ plugin.author || "Vertex" }}</span>

                <div class="flex items-center gap-2">
                  <Button
                    v-if="isPluginEnabled(plugin.id)"
                    icon="i-mdi-cog"
                    @click="configurePlugin(plugin)"
                    variant="text"
                    size="small"
                    severity="secondary"
                  />
                  <Button
                    v-if="isPluginEnabled(plugin.id)"
                    icon="i-mdi-power"
                    @click="togglePlugin(plugin, false)"
                    variant="text"
                    size="small"
                    severity="danger"
                  />
                  <Button
                    v-else
                    :label="$t('plugins.enable')"
                    @click="togglePlugin(plugin, true)"
                    size="small"
                    :loading="enablingPlugins.has(plugin.id)"
                  />
                </div>
              </div>
            </div>
          </template>
        </Card>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!isLoading" class="text-center py-12">
      <i class="i-mdi-puzzle text-6xl text-gray-400 mb-4"></i>
      <p class="text-lg mb-4">{{ $t("plugins.noAvailable") }}</p>
      <Button
        :label="$t('plugins.refresh')"
        @click="loadPlugins"
        variant="outlined"
      />
    </div>

    <!-- Plugin Configuration Dialog -->
    <Dialog
      v-model:visible="showConfigDialog"
      modal
      :header="
        $t('plugins.configure') +
        ': ' +
        (selectedPlugin?.name || selectedPlugin?.id || 'Unknown')
      "
      style="width: 600px"
    >
      <div v-if="selectedPlugin" class="p-4">
        <Message severity="secondary" class="mb-4">
          <h4 class="font-semibold mb-2">{{ $t("plugins.configInfo") }}</h4>
          <p class="text-sm">
            {{
              selectedPlugin.description || $t("plugins.noConfigDescription")
            }}
          </p>
        </Message>

        <div class="text-center py-8">
          <i class="i-mdi-cog text-6xl text-gray-400 mb-2"></i>
          <p>{{ $t("plugins.configurationComingSoon") }}</p>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <Button
            :label="$t('common.cancel')"
            @click="showConfigDialog = false"
            variant="text"
          />
          <Button
            :label="$t('common.save')"
            @click="savePluginConfig"
            :disabled="true"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { authClient } from "~/utils/auth";

// Page metadata
definePageMeta({
  title: "Plugins - Dashboard",
});

// Set page head
useHead({
  title: "Plugins - Funish Vertex Dashboard",
});

// Types
interface RegistryPlugin {
  id: string;
  name: string;
  description: string;
  version: string;
  status: "active" | "inactive" | "deprecated" | "beta";
  author: string;
  homepage?: string;
  repository?: string;
  configSchema?: any;
}

// State
const isLoading = ref(false);
const error = ref<string | null>(null);
const plugins = ref<RegistryPlugin[]>([]);
const searchQuery = ref("");
const enablingPlugins = ref(new Set<string>());
const enabledPlugins = ref(new Set<string>());
const showConfigDialog = ref(false);
const selectedPlugin = ref<RegistryPlugin | null>(null);

// Computed
const filteredPlugins = computed(() => {
  return plugins.value.filter((plugin) => {
    const matchesSearch =
      !searchQuery.value ||
      plugin.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      plugin.description
        .toLowerCase()
        .includes(searchQuery.value.toLowerCase());

    return matchesSearch;
  });
});

// Methods
const loadPlugins = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    // Call registry API directly
    const response = await $fetch<{ plugins?: RegistryPlugin[] }>(
      "/api/v1/registry/plugins",
      {
        query: {
          ...(searchQuery.value && { search: searchQuery.value }),
        },
      },
    );

    if (response?.plugins) {
      plugins.value = response.plugins;
    } else {
      plugins.value = [];
    }

    // TODO: Load enabled plugin configurations for current organization
    enabledPlugins.value = new Set(["tenant", "storage", "database"]);

    console.log(
      `[Plugins] Loaded ${plugins.value.length} plugins from registry`,
    );
  } catch (err) {
    console.error("Error loading plugins:", err);
    error.value = err instanceof Error ? err.message : "Failed to load plugins";
  } finally {
    isLoading.value = false;
  }
};

const togglePlugin = async (plugin: RegistryPlugin, enable: boolean) => {
  enablingPlugins.value.add(plugin.id);

  try {
    // TODO: Call organization plugin configuration API
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (enable) {
      enabledPlugins.value.add(plugin.id);
    } else {
      enabledPlugins.value.delete(plugin.id);
    }

    console.log(
      `[Plugins] Plugin ${plugin.id} ${enable ? "enabled" : "disabled"}`,
    );
  } catch (err) {
    console.error(`Error ${enable ? "enabling" : "disabling"} plugin:`, err);
    error.value = `Failed to ${enable ? "enable" : "disable"} plugin: ${plugin.name}`;
  } finally {
    enablingPlugins.value.delete(plugin.id);
  }
};

const configurePlugin = (plugin: RegistryPlugin) => {
  selectedPlugin.value = plugin;
  showConfigDialog.value = true;
};

const savePluginConfig = async () => {
  showConfigDialog.value = false;
};

const isPluginEnabled = (pluginId: string): boolean => {
  return enabledPlugins.value.has(pluginId);
};

const getPluginInitials = (name: string): string => {
  return name.substring(0, 2).toUpperCase();
};

const getStatusSeverity = (status: string): string => {
  const severities: Record<string, string> = {
    active: "secondary",
    inactive: "secondary",
    deprecated: "contrast",
    beta: "secondary",
  };
  return severities[status] || "secondary";
};

// Watchers
watch(searchQuery, () => {
  loadPlugins();
});

// Lifecycle
onMounted(() => {
  loadPlugins();
});
</script>
