<template>
  <div class="p-6">
    <!-- Page Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold mb-2">{{ $t("users.title") }}</h1>
      <p class="mb-6">{{ $t("users.description") }}</p>

      <div class="flex justify-between items-center mb-6">
        <div class="flex gap-3">
          <Button
            :label="$t('users.invite')"
            icon="i-mdi-account-plus"
            @click="showInviteDialog = true"
          />
          <Button
            :label="$t('users.refresh')"
            icon="i-mdi-refresh"
            @click="loadUsers"
            variant="outlined"
            :loading="isLoading"
          />
        </div>

        <div class="flex items-center gap-2">
          <Dropdown
            v-model="roleFilter"
            :options="roleOptions"
            optionLabel="label"
            optionValue="value"
            :placeholder="$t('users.filterByRole')"
            class="w-48"
            @change="filterUsers"
          />
          <InputText
            v-model="searchQuery"
            :placeholder="$t('users.search')"
            class="w-80"
          />
          <Button icon="i-mdi-magnify" @click="search" />
        </div>
      </div>
    </div>

    <!-- Users Table -->
    <div v-if="filteredUsers.length > 0">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">{{ $t("users.list") }}</h2>
        <Badge :value="filteredUsers.length" severity="secondary" />
      </div>

      <Card>
        <template #content>
          <DataTable
            :value="filteredUsers"
            :paginator="true"
            :rows="10"
            :rowsPerPageOptions="[5, 10, 20, 50]"
            tableStyle="min-width: 50rem"
            class="p-datatable-sm"
          >
            <Column field="name" :header="$t('users.table.name')" sortable>
              <template #body="{ data }">
                <div class="flex items-center gap-3">
                  <Avatar
                    :image="data.avatar"
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

            <Column field="role" :header="$t('users.table.role')" sortable>
              <template #body="{ data }">
                <Badge
                  :value="data.role"
                  :severity="getRoleSeverity(data.role)"
                />
              </template>
            </Column>

            <Column field="status" :header="$t('users.table.status')" sortable>
              <template #body="{ data }">
                <Badge
                  :value="data.status"
                  :severity="getStatusSeverity(data.status)"
                />
              </template>
            </Column>

            <Column
              field="lastActive"
              :header="$t('users.table.lastActive')"
              sortable
            >
              <template #body="{ data }">
                <span>{{ formatDate(data.lastActive) }}</span>
              </template>
            </Column>

            <Column
              field="joinedAt"
              :header="$t('users.table.joined')"
              sortable
            >
              <template #body="{ data }">
                <span>{{ formatDate(data.joinedAt) }}</span>
              </template>
            </Column>

            <Column :header="$t('users.table.actions')">
              <template #body="{ data }">
                <div class="flex items-center gap-2">
                  <Button
                    icon="i-mdi-account-edit"
                    @click="editUser(data)"
                    variant="text"
                    size="small"
                    severity="secondary"
                  />
                  <Button
                    icon="i-mdi-cog"
                    @click="manageUser(data)"
                    variant="text"
                    size="small"
                    severity="secondary"
                  />
                  <Button
                    v-if="canDeleteUser(data)"
                    icon="i-mdi-delete"
                    @click="deleteUser(data)"
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
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12">
      <i class="i-mdi-account-group text-6xl mb-4"></i>
      <p class="text-lg mb-4">{{ $t("users.noUsers") }}</p>
      <Button
        :label="$t('users.inviteFirst')"
        @click="showInviteDialog = true"
        icon="i-mdi-account-plus"
      />
    </div>

    <!-- Invite User Dialog -->
    <Dialog
      v-model:visible="showInviteDialog"
      modal
      :header="$t('users.inviteDialog.title')"
      style="width: 500px"
    >
      <div class="p-4">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">
              {{ $t("users.inviteDialog.email") }}
            </label>
            <InputText
              v-model="inviteForm.email"
              :placeholder="$t('users.inviteDialog.emailPlaceholder')"
              fluid
              :class="{ 'p-invalid': inviteErrors.email }"
              autofocus
            />
            <small v-if="inviteErrors.email" class="p-error">{{
              inviteErrors.email
            }}</small>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">
              {{ $t("users.inviteDialog.role") }}
            </label>
            <Dropdown
              v-model="inviteForm.role"
              :options="roleOptions.filter((r) => r.value !== 'all')"
              optionLabel="label"
              optionValue="value"
              :placeholder="$t('users.inviteDialog.selectRole')"
              fluid
              :class="{ 'p-invalid': inviteErrors.role }"
            />
            <small v-if="inviteErrors.role" class="p-error">{{
              inviteErrors.role
            }}</small>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">
              {{ $t("users.inviteDialog.message") }}
            </label>
            <Textarea
              v-model="inviteForm.message"
              :placeholder="$t('users.inviteDialog.messagePlaceholder')"
              rows="3"
              fluid
            />
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <Button
            :label="$t('common.cancel')"
            @click="showInviteDialog = false"
            variant="text"
          />
          <Button
            :label="$t('users.inviteDialog.send')"
            @click="sendInvite"
            :loading="isSendingInvite"
            icon="i-mdi-send"
          />
        </div>
      </template>
    </Dialog>

    <!-- Edit User Dialog -->
    <Dialog
      v-model:visible="showEditDialog"
      modal
      :header="$t('users.editDialog.title')"
      style="width: 500px"
    >
      <div class="p-4" v-if="selectedUser">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">
              {{ $t("users.editDialog.name") }}
            </label>
            <InputText
              v-model="editForm.name"
              :placeholder="$t('users.editDialog.namePlaceholder')"
              fluid
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">
              {{ $t("users.editDialog.role") }}
            </label>
            <Dropdown
              v-model="editForm.role"
              :options="roleOptions.filter((r) => r.value !== 'all')"
              optionLabel="label"
              optionValue="value"
              fluid
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">
              {{ $t("users.editDialog.status") }}
            </label>
            <Dropdown
              v-model="editForm.status"
              :options="statusOptions"
              optionLabel="label"
              optionValue="value"
              fluid
            />
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <Button
            :label="$t('common.cancel')"
            @click="showEditDialog = false"
            variant="text"
          />
          <Button
            :label="$t('common.save')"
            @click="saveUser"
            :loading="isSaving"
            icon="i-mdi-content-save"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
// Page metadata
definePageMeta({
  title: "Users - Dashboard",
});

// Set page head
useHead({
  title: "Users - Funish Vertex Dashboard",
});

// Types
interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: "admin" | "member" | "viewer";
  status: "active" | "inactive" | "pending";
  lastActive: Date;
  joinedAt: Date;
}

// State
const isLoading = ref(false);
const isSendingInvite = ref(false);
const isSaving = ref(false);
const searchQuery = ref("");
const roleFilter = ref("all");
const showInviteDialog = ref(false);
const showEditDialog = ref(false);
const selectedUser = ref<User | null>(null);

const users = ref<User[]>([
  {
    id: "user_1",
    name: "John Doe",
    email: "john@example.com",
    role: "admin",
    status: "active",
    lastActive: new Date("2024-12-21"),
    joinedAt: new Date("2024-01-15"),
  },
  {
    id: "user_2",
    name: "Jane Smith",
    email: "jane@example.com",
    role: "member",
    status: "active",
    lastActive: new Date("2024-12-20"),
    joinedAt: new Date("2024-02-10"),
  },
  {
    id: "user_3",
    name: "Bob Wilson",
    email: "bob@example.com",
    role: "viewer",
    status: "inactive",
    lastActive: new Date("2024-12-15"),
    joinedAt: new Date("2024-03-05"),
  },
  {
    id: "user_4",
    name: "Alice Johnson",
    email: "alice@example.com",
    role: "member",
    status: "pending",
    lastActive: new Date("2024-12-19"),
    joinedAt: new Date("2024-12-19"),
  },
]);

// Form data
const inviteForm = reactive({
  email: "",
  role: "member",
  message: "",
});

const inviteErrors = reactive({
  email: "",
  role: "",
});

const editForm = reactive({
  name: "",
  role: "",
  status: "",
});

// Options
const roleOptions = ref([
  { label: "All Roles", value: "all" },
  { label: "Admin", value: "admin" },
  { label: "Member", value: "member" },
  { label: "Viewer", value: "viewer" },
]);

const statusOptions = ref([
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Pending", value: "pending" },
]);

// Computed
const filteredUsers = computed(() => {
  return users.value.filter((user) => {
    const matchesSearch =
      !searchQuery.value ||
      user.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.value.toLowerCase());

    const matchesRole =
      roleFilter.value === "all" || user.role === roleFilter.value;

    return matchesSearch && matchesRole;
  });
});

// Methods
const loadUsers = async () => {
  isLoading.value = true;
  try {
    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Users loaded");
  } catch (err) {
    console.error("Error loading users:", err);
  } finally {
    isLoading.value = false;
  }
};

const search = () => {
  // Search functionality already handled by computed property
};

const filterUsers = () => {
  // Filter functionality already handled by computed property
};

const getUserInitials = (name: string): string => {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase();
};

const getRoleSeverity = (role: string): string => {
  const severities: Record<string, string> = {
    admin: "danger",
    member: "success",
    viewer: "secondary",
  };
  return severities[role] || "secondary";
};

const getStatusSeverity = (status: string): string => {
  const severities: Record<string, string> = {
    active: "secondary",
    inactive: "secondary",
    pending: "secondary",
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

const editUser = (user: User) => {
  selectedUser.value = user;
  editForm.name = user.name;
  editForm.role = user.role;
  editForm.status = user.status;
  showEditDialog.value = true;
};

const manageUser = (user: User) => {
  // Navigate to user management page
  navigateTo(`/dashboard/users/${user.id}`);
};

const canDeleteUser = (user: User): boolean => {
  // Can't delete admin users or yourself
  return user.role !== "admin";
};

const deleteUser = (user: User) => {
  // Implement delete functionality
  console.log("Deleting user:", user.name);
};

const validateInvite = (): boolean => {
  inviteErrors.email = "";
  inviteErrors.role = "";

  if (!inviteForm.email) {
    inviteErrors.email = "Email is required";
    return false;
  }

  if (!inviteForm.email.includes("@")) {
    inviteErrors.email = "Please enter a valid email";
    return false;
  }

  if (!inviteForm.role) {
    inviteErrors.role = "Please select a role";
    return false;
  }

  return true;
};

const sendInvite = async () => {
  if (!validateInvite()) {
    return;
  }

  isSendingInvite.value = true;

  try {
    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Add pending user
    const emailParts = inviteForm.email.split("@");
    const newUser: User = {
      id: `user_${Date.now()}`,
      name: emailParts[0] || inviteForm.email,
      email: inviteForm.email,
      role: inviteForm.role as User["role"],
      status: "pending",
      lastActive: new Date(),
      joinedAt: new Date(),
    };

    users.value.unshift(newUser);

    // Reset form
    inviteForm.email = "";
    inviteForm.role = "member";
    inviteForm.message = "";
    showInviteDialog.value = false;

    console.log("Invite sent to:", inviteForm.email);
  } catch (err) {
    console.error("Error sending invite:", err);
  } finally {
    isSendingInvite.value = false;
  }
};

const saveUser = async () => {
  if (!selectedUser.value) return;

  isSaving.value = true;

  try {
    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Update user
    const userIndex = users.value.findIndex(
      (u) => u.id === selectedUser.value?.id,
    );
    if (userIndex !== -1 && users.value[userIndex]) {
      const existingUser = users.value[userIndex];
      users.value[userIndex] = {
        ...existingUser,
        name: editForm.name,
        role: editForm.role as User["role"],
        status: editForm.status as User["status"],
      };
    }

    showEditDialog.value = false;
    selectedUser.value = null;

    console.log("User updated");
  } catch (err) {
    console.error("Error updating user:", err);
  } finally {
    isSaving.value = false;
  }
};

// Lifecycle
onMounted(() => {
  loadUsers();
});
</script>
