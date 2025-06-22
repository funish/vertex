<template>
  <div class="p-6">
    <!-- Page Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold mb-2">{{ $t("permissions.title") }}</h1>
      <p class="mb-6">{{ $t("permissions.description") }}</p>

      <div class="flex justify-between items-center mb-6">
        <div class="flex gap-3">
          <Button
            :label="$t('permissions.createRole')"
            icon="i-mdi-shield-plus"
            @click="showCreateRoleDialog = true"
          />
          <Button
            :label="$t('permissions.refresh')"
            icon="i-mdi-refresh"
            @click="loadPermissions"
            variant="outlined"
            :loading="isLoading"
          />
        </div>

        <div class="flex items-center gap-2">
          <InputText
            v-model="searchQuery"
            :placeholder="$t('permissions.search')"
            class="w-80"
          />
          <Button icon="i-mdi-magnify" @click="search" />
        </div>
      </div>
    </div>

    <!-- Roles & Permissions Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Roles Section -->
      <Card>
        <template #header>
          <div class="flex items-center justify-between p-4">
            <h2 class="text-xl font-semibold">{{ $t("permissions.roles") }}</h2>
            <Badge :value="filteredRoles.length" severity="secondary" />
          </div>
        </template>

        <template #content>
          <div class="space-y-3">
            <div
              v-for="role in filteredRoles"
              :key="role.id"
              class="flex items-center justify-between p-3 border rounded cursor-pointer"
              :class="{ 'border-primary': selectedRole?.id === role.id }"
              @click="selectRole(role)"
            >
              <div class="flex items-center gap-3">
                <i :class="getRoleIcon(role.name)" class="text-xl"></i>
                <div>
                  <div class="font-medium">{{ role.name }}</div>
                  <div class="text-sm">{{ role.description }}</div>
                  <div class="text-xs">
                    {{ $t("permissions.userCount", { count: role.userCount }) }}
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <Badge
                  :value="role.isDefault ? 'Default' : 'Custom'"
                  :severity="role.isDefault ? 'success' : 'secondary'"
                  size="small"
                />
                <Button
                  v-if="!role.isDefault"
                  icon="i-mdi-pencil"
                  @click.stop="editRole(role)"
                  variant="text"
                  size="small"
                  severity="secondary"
                />
                <Button
                  v-if="!role.isDefault && role.userCount === 0"
                  icon="i-mdi-delete"
                  @click.stop="deleteRole(role)"
                  variant="text"
                  size="small"
                  severity="secondary"
                />
              </div>
            </div>
          </div>
        </template>
      </Card>

      <!-- Permissions Section -->
      <Card>
        <template #header>
          <div class="flex items-center justify-between p-4">
            <h2 class="text-xl font-semibold">
              {{
                selectedRole
                  ? $t("permissions.permissionsFor", {
                      role: selectedRole.name,
                    })
                  : $t("permissions.selectRole")
              }}
            </h2>
            <Button
              v-if="selectedRole && !selectedRole.isDefault"
              :label="$t('permissions.saveChanges')"
              @click="savePermissions"
              :loading="isSaving"
              icon="i-mdi-content-save"
              size="small"
            />
          </div>
        </template>

        <template #content>
          <div v-if="selectedRole" class="space-y-4">
            <div v-for="category in permissionCategories" :key="category.name">
              <div class="flex items-center justify-between mb-3">
                <h3 class="font-medium flex items-center gap-2">
                  <i :class="category.icon" class="text-lg"></i>
                  {{ category.label }}
                </h3>
                <div class="flex items-center gap-2">
                  <Button
                    :label="$t('permissions.selectAll')"
                    @click="selectAllInCategory(category.name)"
                    variant="text"
                    size="small"
                  />
                  <Button
                    :label="$t('permissions.selectNone')"
                    @click="selectNoneInCategory(category.name)"
                    variant="text"
                    size="small"
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 gap-2 pl-6">
                <div
                  v-for="permission in category.permissions"
                  :key="permission.id"
                  class="flex items-center justify-between p-2 border rounded"
                >
                  <div class="flex items-center gap-3">
                    <Checkbox
                      v-model="selectedPermissions"
                      :value="permission.id"
                      :disabled="selectedRole.isDefault"
                      binary
                    />
                    <div>
                      <div class="font-medium text-sm">
                        {{ permission.name }}
                      </div>
                      <div class="text-xs">{{ permission.description }}</div>
                    </div>
                  </div>

                  <Badge
                    :value="permission.level"
                    :severity="getPermissionSeverity(permission.level)"
                    size="small"
                  />
                </div>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-8">
            <i class="i-mdi-shield-account text-4xl mb-4"></i>
            <p>{{ $t("permissions.selectRoleToEdit") }}</p>
          </div>
        </template>
      </Card>
    </div>

    <!-- Users with Custom Permissions -->
    <Card class="mt-6">
      <template #header>
        <div class="p-4">
          <h2 class="text-xl font-semibold">
            {{ $t("permissions.usersWithCustomPermissions") }}
          </h2>
        </div>
      </template>

      <template #content>
        <DataTable
          :value="usersWithCustomPermissions"
          :paginator="true"
          :rows="5"
          tableStyle="min-width: 50rem"
          class="p-datatable-sm"
        >
          <Column field="name" :header="$t('permissions.table.user')" sortable>
            <template #body="{ data }">
              <div class="flex items-center gap-3">
                <Avatar
                  :label="getUserInitials(data.name)"
                  shape="circle"
                  size="normal"
                />
                <div>
                  <div class="font-medium">{{ data.name }}</div>
                  <div class="text-sm">{{ data.email }}</div>
                </div>
              </div>
            </template>
          </Column>

          <Column
            field="role"
            :header="$t('permissions.table.baseRole')"
            sortable
          >
            <template #body="{ data }">
              <Badge :value="data.role" severity="secondary" />
            </template>
          </Column>

          <Column
            field="customPermissions"
            :header="$t('permissions.table.customPermissions')"
          >
            <template #body="{ data }">
              <div class="flex gap-1">
                <Badge
                  v-for="permission in data.customPermissions.slice(0, 3)"
                  :key="permission"
                  :value="permission"
                  severity="secondary"
                  size="small"
                />
                <Badge
                  v-if="data.customPermissions.length > 3"
                  :value="`+${data.customPermissions.length - 3}`"
                  severity="secondary"
                  size="small"
                />
              </div>
            </template>
          </Column>

          <Column :header="$t('permissions.table.actions')">
            <template #body="{ data }">
              <div class="flex items-center gap-2">
                <Button
                  icon="i-mdi-account-edit"
                  @click="editUserPermissions(data)"
                  variant="text"
                  size="small"
                  severity="secondary"
                />
                <Button
                  icon="i-mdi-restore"
                  @click="resetUserPermissions(data)"
                  variant="text"
                  size="small"
                  severity="secondary"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <!-- Create Role Dialog -->
    <Dialog
      v-model:visible="showCreateRoleDialog"
      modal
      :header="$t('permissions.createRoleDialog.title')"
      style="width: 500px"
    >
      <div class="p-4">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">
              {{ $t("permissions.createRoleDialog.name") }}
            </label>
            <InputText
              v-model="createRoleForm.name"
              :placeholder="$t('permissions.createRoleDialog.namePlaceholder')"
              fluid
              :class="{ 'p-invalid': createRoleErrors.name }"
              autofocus
            />
            <small v-if="createRoleErrors.name" class="p-error">{{
              createRoleErrors.name
            }}</small>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">
              {{ $t("permissions.createRoleDialog.description") }}
            </label>
            <Textarea
              v-model="createRoleForm.description"
              :placeholder="
                $t('permissions.createRoleDialog.descriptionPlaceholder')
              "
              rows="3"
              fluid
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">
              {{ $t("permissions.createRoleDialog.basedOn") }}
            </label>
            <Dropdown
              v-model="createRoleForm.basedOn"
              :options="baseRoleOptions"
              optionLabel="label"
              optionValue="value"
              :placeholder="$t('permissions.createRoleDialog.selectBaseRole')"
              fluid
            />
            <small class="text-sm">{{
              $t("permissions.createRoleDialog.basedOnHelp")
            }}</small>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <Button
            :label="$t('common.cancel')"
            @click="showCreateRoleDialog = false"
            variant="text"
          />
          <Button
            :label="$t('permissions.createRoleDialog.create')"
            @click="createRole"
            :loading="isCreatingRole"
            icon="i-mdi-shield-plus"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
// Page metadata
definePageMeta({
  title: "Permissions - Dashboard",
});

// Set page head
useHead({
  title: "Permissions - Funish Vertex Dashboard",
});

// Types
interface Role {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  userCount: number;
  permissions: string[];
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  level: "read" | "write" | "admin";
}

interface PermissionCategory {
  name: string;
  label: string;
  icon: string;
  permissions: Permission[];
}

interface UserWithCustomPermissions {
  id: string;
  name: string;
  email: string;
  role: string;
  customPermissions: string[];
}

// State
const isLoading = ref(false);
const isSaving = ref(false);
const isCreatingRole = ref(false);
const searchQuery = ref("");
const showCreateRoleDialog = ref(false);
const selectedRole = ref<Role | null>(null);
const selectedPermissions = ref<string[]>([]);

const roles = ref<Role[]>([
  {
    id: "role_admin",
    name: "Administrator",
    description: "Full access to all features and settings",
    isDefault: true,
    userCount: 2,
    permissions: ["*"], // All permissions
  },
  {
    id: "role_member",
    name: "Member",
    description: "Standard user with basic access",
    isDefault: true,
    userCount: 8,
    permissions: ["users.read", "organizations.read", "plugins.read"],
  },
  {
    id: "role_viewer",
    name: "Viewer",
    description: "Read-only access to most features",
    isDefault: true,
    userCount: 5,
    permissions: ["users.read", "organizations.read"],
  },
  {
    id: "role_custom1",
    name: "Plugin Manager",
    description: "Can manage plugins and configurations",
    isDefault: false,
    userCount: 3,
    permissions: ["plugins.read", "plugins.write", "plugins.admin"],
  },
]);

const allPermissions = ref<Permission[]>([
  // Users permissions
  {
    id: "users.read",
    name: "View Users",
    description: "View user list and profiles",
    category: "users",
    level: "read",
  },
  {
    id: "users.write",
    name: "Manage Users",
    description: "Invite, edit, and manage users",
    category: "users",
    level: "write",
  },
  {
    id: "users.admin",
    name: "User Administration",
    description: "Full user management including roles",
    category: "users",
    level: "admin",
  },

  // Organizations permissions
  {
    id: "organizations.read",
    name: "View Organizations",
    description: "View organization details",
    category: "organizations",
    level: "read",
  },
  {
    id: "organizations.write",
    name: "Manage Organizations",
    description: "Edit organization settings",
    category: "organizations",
    level: "write",
  },
  {
    id: "organizations.admin",
    name: "Organization Administration",
    description: "Create, delete organizations",
    category: "organizations",
    level: "admin",
  },

  // Plugins permissions
  {
    id: "plugins.read",
    name: "View Plugins",
    description: "View available plugins",
    category: "plugins",
    level: "read",
  },
  {
    id: "plugins.write",
    name: "Manage Plugins",
    description: "Install, configure plugins",
    category: "plugins",
    level: "write",
  },
  {
    id: "plugins.admin",
    name: "Plugin Administration",
    description: "Full plugin management",
    category: "plugins",
    level: "admin",
  },

  // API Keys permissions
  {
    id: "apikeys.read",
    name: "View API Keys",
    description: "View API key list",
    category: "apikeys",
    level: "read",
  },
  {
    id: "apikeys.write",
    name: "Manage API Keys",
    description: "Create, edit API keys",
    category: "apikeys",
    level: "write",
  },
  {
    id: "apikeys.admin",
    name: "API Key Administration",
    description: "Full API key management",
    category: "apikeys",
    level: "admin",
  },

  // System permissions
  {
    id: "system.read",
    name: "View System Info",
    description: "View system status and logs",
    category: "system",
    level: "read",
  },
  {
    id: "system.write",
    name: "System Configuration",
    description: "Configure system settings",
    category: "system",
    level: "write",
  },
  {
    id: "system.admin",
    name: "System Administration",
    description: "Full system administration",
    category: "system",
    level: "admin",
  },
]);

const usersWithCustomPermissions = ref<UserWithCustomPermissions[]>([
  {
    id: "user_1",
    name: "John Doe",
    email: "john@example.com",
    role: "Member",
    customPermissions: ["plugins.admin", "apikeys.write"],
  },
  {
    id: "user_2",
    name: "Jane Smith",
    email: "jane@example.com",
    role: "Viewer",
    customPermissions: ["users.write", "organizations.write", "plugins.read"],
  },
]);

// Form data
const createRoleForm = reactive({
  name: "",
  description: "",
  basedOn: "",
});

const createRoleErrors = reactive({
  name: "",
});

// Options
const baseRoleOptions = computed(() => [
  { label: "None (Empty role)", value: "" },
  ...roles.value
    .filter((r) => r.isDefault)
    .map((r) => ({
      label: r.name,
      value: r.id,
    })),
]);

// Computed
const filteredRoles = computed(() => {
  return roles.value.filter((role) => {
    const matchesSearch =
      !searchQuery.value ||
      role.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      role.description.toLowerCase().includes(searchQuery.value.toLowerCase());

    return matchesSearch;
  });
});

const permissionCategories = computed((): PermissionCategory[] => {
  const categories = [...new Set(allPermissions.value.map((p) => p.category))];

  return categories.map((category) => ({
    name: category,
    label: getCategoryLabel(category),
    icon: getCategoryIcon(category),
    permissions: allPermissions.value.filter((p) => p.category === category),
  }));
});

// Methods
const loadPermissions = async () => {
  isLoading.value = true;
  try {
    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Permissions loaded");
  } catch (err) {
    console.error("Error loading permissions:", err);
  } finally {
    isLoading.value = false;
  }
};

const search = () => {
  // Search functionality already handled by computed property
};

const getRoleIcon = (roleName: string): string => {
  const icons: Record<string, string> = {
    Administrator: "i-mdi-shield-crown",
    Member: "i-mdi-account",
    Viewer: "i-mdi-eye",
    "Plugin Manager": "i-mdi-puzzle",
  };
  return icons[roleName] || "i-mdi-shield-account";
};

const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    users: "User Management",
    organizations: "Organizations",
    plugins: "Plugins",
    apikeys: "API Keys",
    system: "System",
  };
  return labels[category] || category;
};

const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    users: "i-mdi-account-group",
    organizations: "i-mdi-domain",
    plugins: "i-mdi-puzzle",
    apikeys: "i-mdi-key",
    system: "i-mdi-cog",
  };
  return icons[category] || "i-mdi-shield";
};

const getPermissionSeverity = (level: string): string => {
  const severities: Record<string, string> = {
    read: "info",
    write: "warning",
    admin: "danger",
  };
  return severities[level] || "secondary";
};

const getUserInitials = (name: string): string => {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase();
};

const selectRole = (role: Role) => {
  selectedRole.value = role;
  selectedPermissions.value = [...role.permissions];
};

const selectAllInCategory = (category: string) => {
  const categoryPermissions = allPermissions.value
    .filter((p) => p.category === category)
    .map((p) => p.id);

  categoryPermissions.forEach((permId) => {
    if (!selectedPermissions.value.includes(permId)) {
      selectedPermissions.value.push(permId);
    }
  });
};

const selectNoneInCategory = (category: string) => {
  const categoryPermissions = allPermissions.value
    .filter((p) => p.category === category)
    .map((p) => p.id);

  selectedPermissions.value = selectedPermissions.value.filter(
    (permId) => !categoryPermissions.includes(permId),
  );
};

const savePermissions = async () => {
  if (!selectedRole.value) return;

  isSaving.value = true;

  try {
    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Update role permissions
    const roleIndex = roles.value.findIndex(
      (r) => r.id === selectedRole.value?.id,
    );
    if (roleIndex !== -1) {
      const role = roles.value[roleIndex];
      if (role) {
        role.permissions = [...selectedPermissions.value];
      }
    }

    console.log("Permissions saved for role:", selectedRole.value.name);
  } catch (err) {
    console.error("Error saving permissions:", err);
  } finally {
    isSaving.value = false;
  }
};

const editRole = (role: Role) => {
  // Open edit dialog or navigate to edit page
  console.log("Editing role:", role.name);
};

const deleteRole = (role: Role) => {
  // Implement delete functionality
  console.log("Deleting role:", role.name);
};

const editUserPermissions = (user: UserWithCustomPermissions) => {
  // Navigate to user permissions page
  navigateTo(`/dashboard/users/${user.id}/permissions`);
};

const resetUserPermissions = async (user: UserWithCustomPermissions) => {
  // Reset user to role-based permissions
  console.log("Resetting permissions for user:", user.name);
};

const validateCreateRole = (): boolean => {
  createRoleErrors.name = "";

  if (!createRoleForm.name.trim()) {
    createRoleErrors.name = "Role name is required";
    return false;
  }

  if (
    roles.value.some(
      (r) => r.name.toLowerCase() === createRoleForm.name.toLowerCase(),
    )
  ) {
    createRoleErrors.name = "Role name already exists";
    return false;
  }

  return true;
};

const createRole = async () => {
  if (!validateCreateRole()) {
    return;
  }

  isCreatingRole.value = true;

  try {
    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    let basePermissions: string[] = [];
    if (createRoleForm.basedOn) {
      const baseRole = roles.value.find((r) => r.id === createRoleForm.basedOn);
      if (baseRole) {
        basePermissions = [...baseRole.permissions];
      }
    }

    const newRole: Role = {
      id: `role_${Date.now()}`,
      name: createRoleForm.name,
      description:
        createRoleForm.description || `Custom role: ${createRoleForm.name}`,
      isDefault: false,
      userCount: 0,
      permissions: basePermissions,
    };

    roles.value.push(newRole);

    // Reset form
    createRoleForm.name = "";
    createRoleForm.description = "";
    createRoleForm.basedOn = "";
    showCreateRoleDialog.value = false;

    // Select the new role
    selectRole(newRole);

    console.log("Role created:", newRole.name);
  } catch (err) {
    console.error("Error creating role:", err);
  } finally {
    isCreatingRole.value = false;
  }
};

// Lifecycle
onMounted(() => {
  loadPermissions();
});
</script>
