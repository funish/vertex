<template>
  <div class="p-6">
    <!-- Page Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold mb-2">{{ $t("apiKeys.title") }}</h1>
      <p class="mb-6">{{ $t("apiKeys.description") }}</p>

      <div class="flex justify-between items-center mb-6">
        <div class="flex gap-3">
          <Button
            :label="$t('apiKeys.create')"
            icon="i-mdi-key-plus"
            @click="showCreateDialog = true"
          />
          <Button
            :label="$t('apiKeys.refresh')"
            icon="i-mdi-refresh"
            @click="loadApiKeys"
            variant="outlined"
            :loading="isLoading"
          />
        </div>

        <div class="flex items-center gap-2">
          <Dropdown
            v-model="statusFilter"
            :options="statusFilterOptions"
            optionLabel="label"
            optionValue="value"
            :placeholder="$t('apiKeys.filterByStatus')"
            class="w-48"
          />
          <InputText
            v-model="searchQuery"
            :placeholder="$t('apiKeys.search')"
            class="w-80"
          />
          <Button icon="i-mdi-magnify" @click="search" />
        </div>
      </div>
    </div>

    <!-- API Keys List -->
    <div v-if="filteredApiKeys.length > 0">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">{{ $t("apiKeys.list") }}</h2>
        <Badge :value="filteredApiKeys.length" severity="secondary" />
      </div>

      <div class="space-y-4">
        <Card v-for="apiKey in filteredApiKeys" :key="apiKey.id">
          <template #content>
            <div class="flex items-center justify-between p-4">
              <div class="flex items-center gap-4 flex-1">
                <div
                  class="w-12 h-12 flex items-center justify-center rounded-lg"
                >
                  <i class="i-mdi-key text-2xl"></i>
                </div>

                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <h3 class="font-semibold text-lg">{{ apiKey.name }}</h3>
                    <Badge
                      :value="apiKey.status"
                      :severity="getStatusSeverity(apiKey.status)"
                    />
                    <Badge
                      :value="apiKey.environment"
                      :severity="getEnvironmentSeverity(apiKey.environment)"
                    />
                  </div>

                  <div class="flex items-center gap-4 text-sm mb-2">
                    <span>
                      <strong>{{ $t("apiKeys.keyId") }}:</strong>
                      {{ apiKey.keyId }}
                    </span>
                    <span>
                      <strong>{{ $t("apiKeys.lastUsed") }}:</strong>
                      {{
                        apiKey.lastUsed ? formatDate(apiKey.lastUsed) : "Never"
                      }}
                    </span>
                    <span>
                      <strong>{{ $t("apiKeys.created") }}:</strong>
                      {{ formatDate(apiKey.createdAt) }}
                    </span>
                  </div>

                  <div class="flex items-center gap-2 text-sm">
                    <span>
                      <strong>{{ $t("apiKeys.permissions") }}:</strong>
                    </span>
                    <div class="flex gap-1">
                      <Badge
                        v-for="permission in apiKey.permissions"
                        :key="permission"
                        :value="permission"
                        severity="secondary"
                        size="small"
                      />
                    </div>
                  </div>

                  <div v-if="apiKey.description" class="mt-2">
                    <p class="text-sm">{{ apiKey.description }}</p>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <Button
                  icon="i-mdi-eye"
                  @click="viewApiKey(apiKey)"
                  variant="text"
                  severity="secondary"
                  v-tooltip="$t('apiKeys.view')"
                />
                <Button
                  icon="i-mdi-content-copy"
                  @click="copyApiKey(apiKey)"
                  variant="text"
                  severity="secondary"
                  v-tooltip="$t('apiKeys.copy')"
                />
                <Button
                  icon="i-mdi-pencil"
                  @click="editApiKey(apiKey)"
                  variant="text"
                  severity="secondary"
                  v-tooltip="$t('apiKeys.edit')"
                />
                <Button
                  icon="i-mdi-refresh"
                  @click="regenerateApiKey(apiKey)"
                  variant="text"
                  severity="secondary"
                  v-tooltip="$t('apiKeys.regenerate')"
                />
                <Button
                  icon="i-mdi-delete"
                  @click="deleteApiKey(apiKey)"
                  variant="text"
                  severity="secondary"
                  v-tooltip="$t('apiKeys.delete')"
                />
              </div>
            </div>
          </template>
        </Card>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12">
      <i class="i-mdi-key text-6xl mb-4"></i>
      <p class="text-lg mb-4">{{ $t("apiKeys.noApiKeys") }}</p>
      <Button
        :label="$t('apiKeys.createFirst')"
        @click="showCreateDialog = true"
        icon="i-mdi-key-plus"
      />
    </div>

    <!-- Create API Key Dialog -->
    <Dialog
      v-model:visible="showCreateDialog"
      modal
      :header="$t('apiKeys.createDialog.title')"
      style="width: 600px"
    >
      <div class="p-4">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">
              {{ $t("apiKeys.createDialog.name") }}
            </label>
            <InputText
              v-model="createForm.name"
              :placeholder="$t('apiKeys.createDialog.namePlaceholder')"
              fluid
              :class="{ 'p-invalid': createErrors.name }"
              autofocus
            />
            <small v-if="createErrors.name" class="p-error">{{
              createErrors.name
            }}</small>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">
              {{ $t("apiKeys.createDialog.description") }}
            </label>
            <Textarea
              v-model="createForm.description"
              :placeholder="$t('apiKeys.createDialog.descriptionPlaceholder')"
              rows="3"
              fluid
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">
              {{ $t("apiKeys.createDialog.environment") }}
            </label>
            <Dropdown
              v-model="createForm.environment"
              :options="environmentOptions"
              optionLabel="label"
              optionValue="value"
              :placeholder="$t('apiKeys.createDialog.selectEnvironment')"
              fluid
              :class="{ 'p-invalid': createErrors.environment }"
            />
            <small v-if="createErrors.environment" class="p-error">{{
              createErrors.environment
            }}</small>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">
              {{ $t("apiKeys.createDialog.permissions") }}
            </label>
            <MultiSelect
              v-model="createForm.permissions"
              :options="permissionOptions"
              optionLabel="label"
              optionValue="value"
              :placeholder="$t('apiKeys.createDialog.selectPermissions')"
              fluid
              :class="{ 'p-invalid': createErrors.permissions }"
            />
            <small v-if="createErrors.permissions" class="p-error">{{
              createErrors.permissions
            }}</small>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">
              {{ $t("apiKeys.createDialog.expiresAt") }}
            </label>
            <Calendar
              v-model="createForm.expiresAt"
              :placeholder="$t('apiKeys.createDialog.expiresAtPlaceholder')"
              :minDate="new Date()"
              dateFormat="yy-mm-dd"
              fluid
            />
            <small class="text-sm">{{
              $t("apiKeys.createDialog.expiresAtHelp")
            }}</small>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <Button
            :label="$t('common.cancel')"
            @click="showCreateDialog = false"
            variant="text"
          />
          <Button
            :label="$t('apiKeys.createDialog.create')"
            @click="createApiKey"
            :loading="isCreating"
            icon="i-mdi-key-plus"
          />
        </div>
      </template>
    </Dialog>

    <!-- View API Key Dialog -->
    <Dialog
      v-model:visible="showViewDialog"
      modal
      :header="$t('apiKeys.viewDialog.title')"
      style="width: 600px"
    >
      <div class="p-4" v-if="selectedApiKey">
        <Message severity="secondary" class="mb-4">
          {{ $t("apiKeys.viewDialog.warning") }}
        </Message>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">
              {{ $t("apiKeys.viewDialog.fullKey") }}
            </label>
            <div class="flex gap-2">
              <InputText
                :value="
                  selectedApiKey.fullKey || '••••••••••••••••••••••••••••••••'
                "
                readonly
                fluid
                class="font-mono text-sm"
              />
              <Button
                icon="i-mdi-content-copy"
                @click="copyToClipboard(selectedApiKey.fullKey)"
                variant="outlined"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">
              {{ $t("apiKeys.viewDialog.curlExample") }}
            </label>
            <div class="bg-gray-100 p-3 rounded border text-sm font-mono">
              <code
                >curl -H "Authorization: Bearer {{ selectedApiKey.fullKey }}"
                {{ baseUrl }}/api/v1/example</code
              >
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end">
          <Button
            :label="$t('common.close')"
            @click="showViewDialog = false"
            variant="text"
          />
        </div>
      </template>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <Dialog
      v-model:visible="showDeleteDialog"
      modal
      :header="$t('apiKeys.deleteDialog.title')"
      style="width: 400px"
    >
      <div class="p-4">
        <Message severity="secondary" class="mb-4">
          {{ $t("apiKeys.deleteDialog.warning") }}
        </Message>
        <p>
          {{
            $t("apiKeys.deleteDialog.confirmation", {
              name: selectedApiKey?.name,
            })
          }}
        </p>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <Button
            :label="$t('common.cancel')"
            @click="showDeleteDialog = false"
            variant="text"
          />
          <Button
            :label="$t('common.delete')"
            @click="confirmDelete"
            :loading="isDeleting"
            severity="secondary"
            icon="i-mdi-delete"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
// Page metadata
definePageMeta({
  title: "API Keys - Dashboard",
});

// Set page head
useHead({
  title: "API Keys - Funish Vertex Dashboard",
});

// Types
interface ApiKey {
  id: string;
  name: string;
  description?: string;
  keyId: string;
  fullKey?: string;
  environment: "development" | "staging" | "production";
  status: "active" | "inactive" | "expired";
  permissions: string[];
  lastUsed?: Date;
  createdAt: Date;
  expiresAt?: Date;
  usageCount: number;
}

// State
const isLoading = ref(false);
const isCreating = ref(false);
const isDeleting = ref(false);
const searchQuery = ref("");
const statusFilter = ref("all");
const showCreateDialog = ref(false);
const showViewDialog = ref(false);
const showDeleteDialog = ref(false);
const selectedApiKey = ref<ApiKey | null>(null);
const baseUrl = ref("https://api.funishvertex.com");

const apiKeys = ref<ApiKey[]>([
  {
    id: "key_1",
    name: "Production API Key",
    description: "Main production API key for web application",
    keyId: "fv_prod_1234567890abcdef",
    fullKey: "fv_prod_1234567890abcdef_full_secret_key_here",
    environment: "production",
    status: "active",
    permissions: ["read", "write", "admin"],
    lastUsed: new Date("2024-12-21"),
    createdAt: new Date("2024-01-15"),
    expiresAt: new Date("2025-01-15"),
    usageCount: 15420,
  },
  {
    id: "key_2",
    name: "Development Key",
    description: "For local development and testing",
    keyId: "fv_dev_0987654321fedcba",
    environment: "development",
    status: "active",
    permissions: ["read", "write"],
    lastUsed: new Date("2024-12-20"),
    createdAt: new Date("2024-02-10"),
    usageCount: 892,
  },
  {
    id: "key_3",
    name: "Legacy Integration",
    description: "Old integration key - to be deprecated",
    keyId: "fv_legacy_abcd1234",
    environment: "production",
    status: "inactive",
    permissions: ["read"],
    lastUsed: new Date("2024-11-15"),
    createdAt: new Date("2023-12-01"),
    expiresAt: new Date("2024-12-31"),
    usageCount: 5432,
  },
]);

// Form data
const createForm = reactive({
  name: "",
  description: "",
  environment: "development",
  permissions: [],
  expiresAt: null as Date | null,
});

const createErrors = reactive({
  name: "",
  environment: "",
  permissions: "",
});

// Options
const statusFilterOptions = ref([
  { label: "All Status", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Expired", value: "expired" },
]);

const environmentOptions = ref([
  { label: "Development", value: "development" },
  { label: "Staging", value: "staging" },
  { label: "Production", value: "production" },
]);

const permissionOptions = ref([
  { label: "Read", value: "read" },
  { label: "Write", value: "write" },
  { label: "Delete", value: "delete" },
  { label: "Admin", value: "admin" },
  { label: "Users", value: "users" },
  { label: "Organizations", value: "organizations" },
]);

// Computed
const filteredApiKeys = computed(() => {
  return apiKeys.value.filter((key) => {
    const matchesSearch =
      !searchQuery.value ||
      key.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      key.keyId.toLowerCase().includes(searchQuery.value.toLowerCase());

    const matchesStatus =
      statusFilter.value === "all" || key.status === statusFilter.value;

    return matchesSearch && matchesStatus;
  });
});

// Methods
const loadApiKeys = async () => {
  isLoading.value = true;
  try {
    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("API keys loaded");
  } catch (err) {
    console.error("Error loading API keys:", err);
  } finally {
    isLoading.value = false;
  }
};

const search = () => {
  // Search functionality already handled by computed property
};

const getStatusSeverity = (status: string): string => {
  const severities: Record<string, string> = {
    active: "secondary",
    inactive: "secondary",
    expired: "contrast",
  };
  return severities[status] || "secondary";
};

const getEnvironmentSeverity = (environment: string): string => {
  const severities: Record<string, string> = {
    production: "contrast",
    staging: "secondary",
    development: "secondary",
  };
  return severities[environment] || "secondary";
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const viewApiKey = (apiKey: ApiKey) => {
  selectedApiKey.value = apiKey;
  showViewDialog.value = true;
};

const copyApiKey = async (apiKey: ApiKey) => {
  try {
    await navigator.clipboard.writeText(apiKey.fullKey || apiKey.keyId);
    console.log("API key copied to clipboard");
  } catch (err) {
    console.error("Failed to copy:", err);
  }
};

const copyToClipboard = async (text: string | undefined) => {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    console.log("Copied to clipboard");
  } catch (err) {
    console.error("Failed to copy:", err);
  }
};

const editApiKey = (apiKey: ApiKey) => {
  // Navigate to edit page or open edit dialog
  console.log("Editing API key:", apiKey.name);
};

const regenerateApiKey = (apiKey: ApiKey) => {
  // Implement regenerate functionality
  console.log("Regenerating API key:", apiKey.name);
};

const deleteApiKey = (apiKey: ApiKey) => {
  selectedApiKey.value = apiKey;
  showDeleteDialog.value = true;
};

const validateCreate = (): boolean => {
  createErrors.name = "";
  createErrors.environment = "";
  createErrors.permissions = "";

  if (!createForm.name.trim()) {
    createErrors.name = "API key name is required";
    return false;
  }

  if (!createForm.environment) {
    createErrors.environment = "Environment is required";
    return false;
  }

  if (!createForm.permissions.length) {
    createErrors.permissions = "At least one permission is required";
    return false;
  }

  return true;
};

const generateKeyId = (environment: string): string => {
  const prefix = `fv_${environment.substring(0, 4)}`;
  const random = Math.random().toString(36).substring(2, 18);
  return `${prefix}_${random}`;
};

const createApiKey = async () => {
  if (!validateCreate()) {
    return;
  }

  isCreating.value = true;

  try {
    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const keyId = generateKeyId(createForm.environment);
    const newApiKey: ApiKey = {
      id: `key_${Date.now()}`,
      name: createForm.name,
      description: createForm.description,
      keyId,
      fullKey: `${keyId}_${Math.random().toString(36).substring(2, 32)}`,
      environment: createForm.environment as ApiKey["environment"],
      status: "active",
      permissions: createForm.permissions,
      createdAt: new Date(),
      expiresAt: createForm.expiresAt || undefined,
      usageCount: 0,
    };

    apiKeys.value.unshift(newApiKey);

    // Reset form
    createForm.name = "";
    createForm.description = "";
    createForm.environment = "development";
    createForm.permissions = [];
    createForm.expiresAt = null;
    showCreateDialog.value = false;

    // Show the new key
    selectedApiKey.value = newApiKey;
    showViewDialog.value = true;

    console.log("API key created:", newApiKey.name);
  } catch (err) {
    console.error("Error creating API key:", err);
  } finally {
    isCreating.value = false;
  }
};

const confirmDelete = async () => {
  if (!selectedApiKey.value) return;

  isDeleting.value = true;

  try {
    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    apiKeys.value = apiKeys.value.filter(
      (key) => key.id !== selectedApiKey.value?.id,
    );

    showDeleteDialog.value = false;
    selectedApiKey.value = null;

    console.log("API key deleted");
  } catch (err) {
    console.error("Error deleting API key:", err);
  } finally {
    isDeleting.value = false;
  }
};

// Lifecycle
onMounted(() => {
  loadApiKeys();
});
</script>
