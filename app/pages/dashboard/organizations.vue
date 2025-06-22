<template>
  <div class="p-6">
    <!-- Page Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold mb-2">{{ $t("organizations.title") }}</h1>
      <p class="mb-6">{{ $t("organizations.description") }}</p>

      <div class="flex justify-between items-center mb-6">
        <div class="flex gap-3">
          <Button
            :label="$t('organizations.create')"
            icon="i-mdi-plus"
            @click="showCreateDialog = true"
          />
          <Button
            :label="$t('organizations.refresh')"
            icon="i-mdi-refresh"
            @click="loadOrganizations"
            variant="outlined"
            :loading="isLoading"
          />
        </div>

        <div class="flex items-center gap-2">
          <InputText
            v-model="searchQuery"
            :placeholder="$t('organizations.search')"
            class="w-80"
          />
          <Button icon="i-mdi-magnify" @click="search" />
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error" class="mb-6">
      <Message severity="secondary">
        {{ error }}
      </Message>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading && !organizations.length" class="text-center py-12">
      <ProgressSpinner />
      <p class="mt-4">{{ $t("common.loading") }}</p>
    </div>

    <!-- Organizations List -->
    <div v-else-if="filteredOrganizations.length > 0">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">{{ $t("organizations.list") }}</h2>
        <Badge :value="filteredOrganizations.length" severity="secondary" />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card v-for="org in filteredOrganizations" :key="org.id">
          <template #header>
            <div class="flex items-center justify-between p-4">
              <div class="flex items-center gap-3">
                <Avatar
                  :label="getOrgInitials(org.name)"
                  shape="circle"
                  size="large"
                />
                <div>
                  <h3 class="font-semibold">{{ org.name }}</h3>
                  <p class="text-sm">{{ org.slug }}</p>
                </div>
              </div>

              <Badge
                :value="org.status"
                :severity="getStatusSeverity(org.status)"
              />
            </div>
          </template>

          <template #content>
            <div class="p-4">
              <div class="space-y-2 mb-4">
                <div class="flex justify-between">
                  <span class="text-sm"
                    >{{ $t("organizations.members") }}:</span
                  >
                  <span class="font-medium">{{ org.memberCount || 0 }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-sm"
                    >{{ $t("organizations.created") }}:</span
                  >
                  <span class="text-sm">{{ formatDate(org.createdAt) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-sm">{{ $t("organizations.plan") }}:</span>
                  <span class="font-medium">{{ org.plan || "Free" }}</span>
                </div>
              </div>

              <div class="flex justify-between items-center">
                <div class="flex items-center gap-2">
                  <Button
                    icon="i-mdi-account-plus"
                    @click="inviteToOrg(org)"
                    variant="text"
                    size="small"
                    severity="secondary"
                  />
                  <Button
                    icon="i-mdi-cog"
                    @click="configureOrg(org)"
                    variant="text"
                    size="small"
                    severity="secondary"
                  />
                </div>

                <div class="flex items-center gap-2">
                  <Button
                    v-if="org.id !== currentOrgId"
                    :label="$t('organizations.switch')"
                    @click="switchToOrganization(org)"
                    size="small"
                  />
                  <Button
                    v-if="canDeleteOrg(org)"
                    icon="i-mdi-delete"
                    @click="deleteOrganization(org)"
                    variant="text"
                    size="small"
                    severity="secondary"
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
      <i class="i-mdi-domain text-6xl text-gray-400 mb-4"></i>
      <p class="text-lg mb-4">{{ $t("organizations.noOrganizations") }}</p>
      <Button
        :label="$t('organizations.createFirst')"
        @click="showCreateDialog = true"
        icon="i-mdi-plus"
      />
    </div>

    <!-- Create Organization Dialog -->
    <Dialog
      v-model:visible="showCreateDialog"
      modal
      :header="$t('organizations.createDialog.title')"
      style="width: 500px"
    >
      <div class="p-4">
        <form @submit.prevent="createOrganization" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">
              {{ $t("organizations.createDialog.name") }}
            </label>
            <InputText
              v-model="newOrg.name"
              :placeholder="$t('organizations.createDialog.namePlaceholder')"
              fluid
              :class="{ 'p-invalid': newOrgErrors.name }"
              autofocus
            />
            <small v-if="newOrgErrors.name" class="p-error">{{
              newOrgErrors.name
            }}</small>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">
              {{ $t("organizations.createDialog.slug") }}
            </label>
            <InputText
              v-model="newOrg.slug"
              :placeholder="$t('organizations.createDialog.slugPlaceholder')"
              fluid
              :class="{ 'p-invalid': newOrgErrors.slug }"
            />
            <small v-if="newOrgErrors.slug" class="p-error">{{
              newOrgErrors.slug
            }}</small>
            <small v-else class="text-sm">{{
              $t("organizations.createDialog.slugHelp")
            }}</small>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">
              {{ $t("organizations.createDialog.description") }}
            </label>
            <Textarea
              v-model="newOrg.description"
              :placeholder="
                $t('organizations.createDialog.descriptionPlaceholder')
              "
              rows="3"
              fluid
            />
          </div>
        </form>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <Button
            :label="$t('common.cancel')"
            @click="showCreateDialog = false"
            variant="text"
          />
          <Button
            :label="$t('organizations.createDialog.create')"
            @click="createOrganization"
            :loading="isCreating"
            icon="i-mdi-plus"
          />
        </div>
      </template>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <Dialog
      v-model:visible="showDeleteDialog"
      modal
      :header="$t('organizations.deleteDialog.title')"
      style="width: 400px"
    >
      <div class="p-4">
        <Message severity="secondary" class="mb-4">
          {{ $t("organizations.deleteDialog.warning") }}
        </Message>
        <p class="mb-4">
          {{
            $t("organizations.deleteDialog.confirmation", {
              name: selectedOrg?.name,
            })
          }}
        </p>
        <p class="text-sm">
          {{ $t("organizations.deleteDialog.typeToConfirm") }}
        </p>
        <InputText
          v-model="deleteConfirmation"
          :placeholder="selectedOrg?.name"
          fluid
          class="mt-2"
        />
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
            :disabled="deleteConfirmation !== selectedOrg?.name"
            severity="secondary"
            icon="i-mdi-delete"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import type { Organization } from "better-auth/plugins";

// Page metadata
definePageMeta({
  title: "Organizations - Dashboard",
});

// Set page head
useHead({
  title: "Organizations - Funish Vertex Dashboard",
});

// Types
interface OrganizationWithMetadata extends Organization {
  memberCount?: number;
  plan?: string;
  status: "active" | "inactive" | "suspended";
}

// State
const isLoading = ref(false);
const isCreating = ref(false);
const isDeleting = ref(false);
const error = ref<string | null>(null);
const organizations = ref<OrganizationWithMetadata[]>([]);
const searchQuery = ref("");
const showCreateDialog = ref(false);
const showDeleteDialog = ref(false);
const selectedOrg = ref<OrganizationWithMetadata | null>(null);
const deleteConfirmation = ref("");
const currentOrgId = ref("org_1"); // Would come from auth context

// New organization form
const newOrg = reactive({
  name: "",
  slug: "",
  description: "",
});

const newOrgErrors = reactive({
  name: "",
  slug: "",
});

// Computed
const filteredOrganizations = computed(() => {
  return organizations.value.filter((org) => {
    const matchesSearch =
      !searchQuery.value ||
      org.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      org.slug.toLowerCase().includes(searchQuery.value.toLowerCase());

    return matchesSearch;
  });
});

// Methods
const loadOrganizations = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    // Mock data - replace with actual API call
    organizations.value = [
      {
        id: "org_1",
        name: "Default Organization",
        slug: "default-org",
        createdAt: new Date("2024-01-15"),
        memberCount: 5,
        plan: "Pro",
        status: "active",
      },
      {
        id: "org_2",
        name: "Test Company",
        slug: "test-company",
        createdAt: new Date("2024-02-20"),
        memberCount: 12,
        plan: "Enterprise",
        status: "active",
      },
      {
        id: "org_3",
        name: "Demo Organization",
        slug: "demo-org",
        createdAt: new Date("2024-03-10"),
        memberCount: 3,
        plan: "Free",
        status: "inactive",
      },
    ] as OrganizationWithMetadata[];

    console.log(
      `[Organizations] Loaded ${organizations.value.length} organizations`,
    );
  } catch (err) {
    console.error("Error loading organizations:", err);
    error.value =
      err instanceof Error ? err.message : "Failed to load organizations";
  } finally {
    isLoading.value = false;
  }
};

const search = () => {
  // Implement search functionality if needed
};

const getOrgInitials = (name: string): string => {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
};

const getStatusSeverity = (status: string): string => {
  const severities: Record<string, string> = {
    active: "secondary",
    inactive: "secondary",
    suspended: "contrast",
  };
  return severities[status] || "secondary";
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const switchToOrganization = async (org: OrganizationWithMetadata) => {
  try {
    // Implement organization switching logic
    currentOrgId.value = org.id;
    console.log("Switched to organization:", org.name);
    // Reload the page or update context
  } catch (err) {
    console.error("Error switching organization:", err);
  }
};

const inviteToOrg = (org: OrganizationWithMetadata) => {
  // Navigate to invite page or open invite dialog
  navigateTo(`/dashboard/organizations/${org.id}/invite`);
};

const configureOrg = (org: OrganizationWithMetadata) => {
  // Navigate to organization settings
  navigateTo(`/dashboard/organizations/${org.id}/settings`);
};

const canDeleteOrg = (org: OrganizationWithMetadata): boolean => {
  // Can't delete current organization or if it has members
  return org.id !== currentOrgId.value && (org.memberCount || 0) <= 1;
};

const deleteOrganization = (org: OrganizationWithMetadata) => {
  selectedOrg.value = org;
  deleteConfirmation.value = "";
  showDeleteDialog.value = true;
};

const validateNewOrg = (): boolean => {
  newOrgErrors.name = "";
  newOrgErrors.slug = "";

  if (!newOrg.name.trim()) {
    newOrgErrors.name = "Organization name is required";
    return false;
  }

  if (!newOrg.slug.trim()) {
    newOrgErrors.slug = "Organization slug is required";
    return false;
  }

  if (!/^[a-z0-9-]+$/.test(newOrg.slug)) {
    newOrgErrors.slug =
      "Slug can only contain lowercase letters, numbers, and hyphens";
    return false;
  }

  return true;
};

const createOrganization = async () => {
  if (!validateNewOrg()) {
    return;
  }

  isCreating.value = true;

  try {
    // Mock API call
    const newOrgData: OrganizationWithMetadata = {
      id: `org_${Date.now()}`,
      name: newOrg.name,
      slug: newOrg.slug,
      createdAt: new Date(),
      memberCount: 1,
      plan: "Free",
      status: "active",
    };

    organizations.value.unshift(newOrgData);

    // Reset form
    newOrg.name = "";
    newOrg.slug = "";
    newOrg.description = "";
    showCreateDialog.value = false;

    console.log("Organization created:", newOrgData.name);
  } catch (err) {
    console.error("Error creating organization:", err);
    error.value = "Failed to create organization";
  } finally {
    isCreating.value = false;
  }
};

const confirmDelete = async () => {
  if (
    !selectedOrg.value ||
    deleteConfirmation.value !== selectedOrg.value.name
  ) {
    return;
  }

  isDeleting.value = true;

  try {
    // Mock API call
    organizations.value = organizations.value.filter(
      (org) => org.id !== selectedOrg.value?.id,
    );

    showDeleteDialog.value = false;
    selectedOrg.value = null;
    deleteConfirmation.value = "";

    console.log("Organization deleted");
  } catch (err) {
    console.error("Error deleting organization:", err);
    error.value = "Failed to delete organization";
  } finally {
    isDeleting.value = false;
  }
};

// Watch for slug generation
watch(
  () => newOrg.name,
  (newName) => {
    if (!newOrg.slug) {
      newOrg.slug = newName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .substring(0, 50);
    }
  },
);

// Lifecycle
onMounted(() => {
  loadOrganizations();
});
</script>
