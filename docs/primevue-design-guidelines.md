# PrimeVue Design Guidelines & Best Practices

## Project Overview

This document outlines the design guidelines, user preferences, and PrimeVue best practices for the Funish Vertex multi-tenant authentication platform.

## User Design Preferences

### 1. Color & Styling Philosophy

**❌ NEVER Use:**

- Custom color classes (e.g., `text-primary`, `bg-blue-50`, `text-blue-600`)
- Custom background colors or text colors
- Any color-related CSS classes beyond PrimeVue's semantic tokens

**✅ ALWAYS Use:**

- Pure PrimeVue component defaults and semantic properties
- Black and white color scheme following PrimeVue official website style
- PrimeVue's built-in `severity` and `variant` properties
- Surface color tokens when needed: `{surface.0}`, `{surface.50}`, etc.
- UnoCSS utility classes for spacing and layout only

### 2. Component Usage Rules

**Layout Components (Required):**

- Use PrimeVue layout components exclusively:
  - `Toolbar` for top navigation
  - `Splitter` for layout division
  - `Menu`/`MenuBar`/`PanelMenu` for navigation
  - `Card` with proper header/content/footer slots
  - `DataTable` for data display with pagination and sorting

**Form Components:**

- Always use PrimeVue form components (`InputText`, `Password`, `Button`, `Dropdown`, `MultiSelect`)
- Use semantic variants: `variant="outlined"` (default), `variant="filled"`
- Use severity levels: `severity="secondary"`, `severity="primary"`, etc.

**Data Display Components:**

- Use `DataTable` for tabular data with built-in features
- Use `Tag` for status indicators and labels
- Use `Chip` for removable items and filters

### 3. Icon System

**Required Format:**

- Use MDI (Material Design Icons) with format: `i-mdi-*`
- Examples: `i-mdi-account`, `i-mdi-home`, `i-mdi-cog`, `i-mdi-puzzle`, `i-mdi-toggle-switch`

**❌ Never Use:**

- PrimeIcons format (`pi pi-*`)
- Custom icon formats (`mdi mdi-*`)

### 4. Spacing & Layout

**Required Patterns:**

- Page containers: `class="p-6"` for main content areas
- Component spacing: Use `gap-*` classes for consistent spacing
- Grid layouts: Use CSS Grid with `grid-cols-*` classes
- Card spacing: Use PrimeVue Card's built-in padding structure
- Use `space-y-*` for vertical spacing between elements

## PrimeVue Design System Integration

### 1. Theme Configuration

```typescript
// nuxt.config.ts
import PrimeVue from "primevue/config";
import Aura from "@primeuix/themes/aura";

export default defineNuxtConfig({
  modules: ["@primevue/nuxt-module"],
  primevue: {
    options: {
      theme: {
        preset: Aura,
        options: {
          prefix: "p",
          darkModeSelector: "system",
          cssLayer: false,
        },
      },
    },
  },
});
```

### 2. Surface Color System

PrimeVue uses a comprehensive surface color system:

```css
/* Available Surface Tokens */
{surface.0}    /* Pure white */
{surface.50}   /* Lightest gray */
{surface.100}  /* Very light gray */
{surface.200}  /* Light gray */
{surface.300}  /* Light-medium gray */
{surface.400}  /* Medium gray */
{surface.500}  /* Medium-dark gray */
{surface.600}  /* Dark gray */
{surface.700}  /* Darker gray */
{surface.800}  /* Very dark gray */
{surface.900}  /* Almost black */
{surface.950}  /* Darkest gray */
```

### 3. Semantic Properties

**Button Variants:**

```vue
<!-- Preferred semantic approach -->
<Button label="Submit" />
<Button label="Cancel" severity="secondary" />
<Button label="Delete" severity="danger" />
<Button label="Info" severity="info" />
<Button label="Success" severity="success" />

<!-- Variant options -->
<Button label="Outlined" variant="outlined" />
<Button label="Text" variant="text" />
```

**Component Severity Levels:**

- `primary` (default)
- `secondary`
- `success`
- `info`
- `warn`
- `danger`
- `contrast`

### 4. Layout Components Best Practices

**Toolbar Structure:**

```vue
<Toolbar class="border-0">
  <template #start>
    <!-- Brand/Logo -->
  </template>
  <template #center>
    <!-- Main navigation/search -->
  </template>
  <template #end>
    <!-- User actions -->
  </template>
</Toolbar>
```

**Card Structure:**

```vue
<Card>
  <template #header>
    <!-- Title, metadata -->
  </template>
  <template #content>
    <!-- Main content -->
  </template>
  <template #footer>
    <!-- Actions, links -->
  </template>
</Card>
```

**Menu Structure:**

```vue
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
```

## Design Token Usage

### 1. Accessing Design Tokens

**CSS Variables:**

```css
/* Direct token access */
color: var(--p-primary-color);
background: var(--p-surface-0);
border-color: var(--p-surface-200);
```

**JavaScript Access:**

```typescript
import { $dt } from "@primeuix/themes";

const primaryColor = $dt("primary.color").value;
const surfaceColor = $dt("surface.100").value;
```

### 2. Component-Specific Tokens

**Using `dt` Property:**

```vue
<ScrollPanel
  :dt="{
    bar: {
      background: '{primary.color}',
    },
  }"
/>
```

### 3. Form Component Styling

**Input Components:**

```vue
<!-- Use semantic variants -->
<InputText variant="filled" />
<Password variant="outlined" />
<Dropdown variant="filled" />

<!-- Use severity for validation states -->
<InputText :class="{ 'p-invalid': hasError }" />
<Message severity="error" v-if="hasError">Error message</Message>
```

## Layout Architecture

### 1. Application Structure

```
app/
├── layouts/
│   └── default.vue        # Global layout wrapper
├── pages/
│   ├── dashboard.vue      # Dashboard layout (Toolbar + Splitter)
│   ├── dashboard/
│   │   ├── index.vue      # Dashboard content
│   │   └── plugins.vue    # Feature pages
│   └── auth/
│       ├── signin.vue     # Authentication pages
│       └── signup.vue
└── components/
    ├── layout/
    │   ├── AppHeader.vue  # Reusable header
    │   └── AppSidebar.vue # Reusable sidebar
    └── ui/                # UI components
```

### 2. Dashboard Layout Pattern

```vue
<template>
  <div class="min-h-screen">
    <!-- Top Toolbar -->
    <Toolbar class="border-0">
      <!-- Toolbar content -->
    </Toolbar>

    <!-- Main Layout with Splitter -->
    <Splitter class="h-[calc(100vh-4rem)]">
      <!-- Sidebar Panel -->
      <SplitterPanel :size="20" :minSize="15">
        <div class="h-full flex flex-col">
          <!-- Navigation Menu -->
          <div class="flex-1 p-2">
            <Menu :model="menuItems" class="w-full border-0" />
          </div>
          <!-- Actions -->
          <div class="p-4">
            <Button label="Sign Out" fluid />
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
```

### 3. Content Page Pattern

```vue
<template>
  <div class="p-6">
    <!-- Page Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold mb-2">{{ $t("page.title") }}</h1>
      <p>{{ $t("page.description") }}</p>
    </div>

    <!-- Main Content -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <template #content>
          <!-- Content -->
        </template>
      </Card>
    </div>
  </div>
</template>
```

## Internationalization (i18n) Integration

### 1. Translation Keys Structure

```json
{
  "nav": {
    "dashboard": "Dashboard",
    "plugins": "Plugins",
    "users": "Users",
    "organizations": "Organizations",
    "settings": "Settings"
  },
  "plugins": {
    "title": "Plugin Management",
    "description": "Manage and configure system plugins",
    "name": "Name",
    "description": "Description",
    "version": "Version",
    "status": "Status",
    "actions": "Actions",
    "enabled": "Enabled",
    "disabled": "Disabled",
    "enable": "Enable",
    "disable": "Disable",
    "type": {
      "core": "Core",
      "extension": "Extension"
    }
  },
  "dashboard": {
    "title": "Dashboard",
    "welcome": "Welcome to Funish Vertex",
    "overview": "System overview and statistics",
    "stats": {
      "totalUsers": "Total Users",
      "activeOrganizations": "Active Organizations",
      "enabledPlugins": "Enabled Plugins",
      "apiRequests": "API Requests"
    }
  },
  "auth": {
    "signOut": "Sign Out",
    "signin": {
      "title": "Sign In",
      "email": "Email",
      "password": "Password",
      "submit": "Sign In"
    }
  },
  "common": {
    "name": "Name",
    "status": "Status",
    "actions": "Actions",
    "loading": "Loading...",
    "error": "Error",
    "success": "Success"
  }
}
```

### 2. Usage in Components

```vue
<script setup>
const { t } = useI18n();

const menuItems = computed(() => [
  {
    label: t("nav.dashboard"),
    icon: "i-mdi-view-dashboard",
    route: "/dashboard",
  },
]);
</script>

<template>
  <h1>{{ $t("dashboard.title") }}</h1>
  <Button :label="$t('auth.signin.submit')" />
</template>
```

## Form Development Patterns

### 1. Form Component Structure

```vue
<template>
  <form @submit="onSubmit" class="space-y-4">
    <div>
      <InputText
        v-model="email"
        :placeholder="$t('auth.email')"
        fluid
        :class="{ 'p-invalid': emailError }"
      />
      <small v-if="emailError" class="p-error">{{ emailError }}</small>
    </div>

    <Button
      type="submit"
      :label="$t('auth.submit')"
      fluid
      :loading="isLoading"
      icon="i-mdi-login"
    />

    <Message v-if="error" severity="error">
      {{ error }}
    </Message>
  </form>
</template>
```

### 2. Form Validation Pattern

```typescript
const validateForm = () => {
  emailError.value = "";

  if (!email.value) {
    emailError.value = t("auth.error.required");
    return false;
  }

  if (!email.value.includes("@")) {
    emailError.value = t("auth.error.invalid");
    return false;
  }

  return true;
};
```

## Component Development Guidelines

### 1. Component Props Definition

```typescript
interface Props {
  title: string;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "primary",
  disabled: false,
});
```

### 2. Component Events

```typescript
const emit = defineEmits<{
  click: [event: MouseEvent];
  change: [value: string];
}>();
```

### 3. Computed Properties for Styling

```typescript
const computedClass = computed(() => ({
  "component--primary": props.variant === "primary",
  "component--disabled": props.disabled,
}));
```

## Accessibility Considerations

### 1. Semantic HTML

- Use proper heading hierarchy (`h1`, `h2`, `h3`)
- Use semantic elements (`main`, `nav`, `section`, `article`)
- Provide proper labels for form inputs

### 2. ARIA Attributes

```vue
<Button aria-label="Close dialog" icon="i-mdi-close" />

<InputText aria-describedby="email-help" :aria-invalid="hasError" />
```

### 3. Focus Management

- Ensure all interactive elements are keyboard accessible
- Use proper focus indicators (PrimeVue provides these)
- Test with screen readers

## Performance Best Practices

### 1. Lazy Loading

```typescript
// Use useLazyFetch for better performance
const { data: plugins } = useLazyFetch("/api/v1/plugins");
```

### 2. Component Import Optimization

```typescript
// Import only needed components
import InputText from "primevue/inputtext";
import Button from "primevue/button";
```

### 3. Image Optimization

```vue
<img
  :src="optimizedImageUrl"
  :alt="imageAlt"
  loading="lazy"
  class="w-full h-auto"
/>
```

## Testing Patterns

### 1. Component Testing

```typescript
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import MyComponent from "~/components/MyComponent.vue";

describe("MyComponent", () => {
  it("renders properly", () => {
    const wrapper = mount(MyComponent, {
      props: { title: "Test" },
    });

    expect(wrapper.text()).toContain("Test");
  });
});
```

### 2. Playwright E2E Testing

```typescript
import { test, expect } from "@playwright/test";

test("navigation works correctly", async ({ page }) => {
  await page.goto("/dashboard");
  await page.click("text=Plugins");
  await expect(page).toHaveURL("/dashboard/plugins");
});
```

## Error Handling

### 1. Global Error Handling

```vue
<!-- error.vue -->
<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <Card class="w-full max-w-md">
      <template #content>
        <div class="text-center p-6">
          <h1 class="text-4xl font-bold mb-4">{{ error.statusCode }}</h1>
          <p class="mb-6">{{ error.statusMessage }}</p>
          <Button label="Back to Home" @click="navigateTo('/')" />
        </div>
      </template>
    </Card>
  </div>
</template>
```

### 2. API Error Handling

```typescript
const handleApiError = (error: any) => {
  if (error.statusCode === 401) {
    navigateTo("/auth/signin");
    return;
  }

  console.error("API Error:", error);
  throw createError({
    statusCode: error.statusCode || 500,
    statusMessage: error.message || "An error occurred",
  });
};
```

## Plugin Management Patterns

### 1. Plugin Registry Interface

**DataTable Structure for Plugins:**

```vue
<template>
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-3xl font-bold mb-2">{{ $t("plugins.title") }}</h1>
      <p>{{ $t("plugins.description") }}</p>
    </div>

    <Card>
      <template #content>
        <DataTable :value="plugins" :loading="loading" class="p-datatable-sm">
          <Column field="name" :header="$t('plugins.name')" />
          <Column field="description" :header="$t('plugins.description')" />
          <Column field="version" :header="$t('plugins.version')" />
          <Column field="status" :header="$t('plugins.status')">
            <template #body="{ data }">
              <Tag
                :value="
                  data.enabled ? $t('plugins.enabled') : $t('plugins.disabled')
                "
                :severity="data.enabled ? 'success' : 'secondary'"
              />
            </template>
          </Column>
          <Column field="actions" :header="$t('plugins.actions')">
            <template #body="{ data }">
              <Button
                :label="
                  data.enabled ? $t('plugins.disable') : $t('plugins.enable')
                "
                :severity="data.enabled ? 'secondary' : 'primary'"
                size="small"
                @click="togglePlugin(data)"
              />
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>
  </div>
</template>
```

### 2. Plugin State Management

**Reactive Plugin State:**

```typescript
const plugins = ref<Plugin[]>([]);
const loading = ref(false);

const fetchPlugins = async () => {
  loading.value = true;
  try {
    const response = await $fetch<{ plugins: Plugin[] }>(
      "/api/v1/registry/plugins",
    );
    plugins.value = response.plugins;
  } catch (error) {
    console.error("Failed to fetch plugins:", error);
  } finally {
    loading.value = false;
  }
};

const togglePlugin = async (plugin: Plugin) => {
  try {
    const action = plugin.enabled ? "disable" : "enable";
    await $fetch(`/api/v1/registry/plugins/${plugin.id}/${action}`, {
      method: "POST",
    });

    // Update local state
    plugin.enabled = !plugin.enabled;
  } catch (error) {
    console.error(`Failed to ${action} plugin:`, error);
  }
};
```

### 3. Plugin Status Indicators

**Tag Component Usage:**

```vue
<!-- Plugin status with semantic colors -->
<Tag
  :value="plugin.enabled ? 'Enabled' : 'Disabled'"
  :severity="plugin.enabled ? 'success' : 'secondary'"
/>

<!-- Plugin type indicators -->
<Tag
  :value="plugin.type"
  :severity="plugin.type === 'core' ? 'primary' : 'info'"
/>
```

## API Development Guidelines

### 1. Endpoint Naming Conventions

**RESTful API Structure:**

```
/api/v1/registry/plugins          # GET: List all plugins
/api/v1/registry/plugins/:id      # GET: Get specific plugin
/api/v1/registry/plugins/:id/enable   # POST: Enable plugin
/api/v1/registry/plugins/:id/disable  # POST: Disable plugin

/api/v1/tenant/organizations      # Tenant management
/api/v1/storage/files            # Storage operations
/api/v1/auth/users               # User management
```

### 2. API Response Patterns

**Standard Response Format:**

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Plugin list response
interface PluginListResponse {
  plugins: Plugin[];
  total: number;
  page?: number;
  limit?: number;
}
```

### 3. Error Handling Patterns

**API Error Response:**

```typescript
const handleApiCall = async <T>(call: () => Promise<T>): Promise<T> => {
  try {
    return await call();
  } catch (error: any) {
    console.error("API Error:", error);

    if (error.statusCode === 401) {
      await navigateTo("/auth/signin");
      throw error;
    }

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || "An unexpected error occurred",
    });
  }
};
```

## Better Auth Plugin Integration

### 1. Plugin System Architecture

**Plugin Registration Pattern:**

```typescript
// packages/vertex/src/plugins/registry/register.ts
import { type Plugin } from "./types";

export const builtInPlugins: Plugin[] = [
  {
    id: "tenant",
    name: "Multi-Tenant Management",
    description: "Core tenant and organization management",
    version: "1.0.0",
    type: "core",
    enabled: true,
  },
  {
    id: "storage",
    name: "File Storage",
    description: "File upload and storage management",
    version: "1.0.0",
    type: "core",
    enabled: true,
  },
  // ... other plugins
];

export function initializePluginSystem() {
  builtInPlugins.forEach((plugin) => {
    globalRegistry.register(plugin);
  });
}
```

### 2. Better Auth Plugin Configuration

**Server Configuration:**

```typescript
// server/utils/auth.ts
import { betterAuth } from "better-auth";
import { initializePluginSystem } from "~/packages/vertex/src/plugins";

// Initialize plugin system before Better Auth
initializePluginSystem();

export const auth = betterAuth({
  database: useDatabase(),
  plugins: [
    // Registry plugin for plugin management
    registryPlugin({
      baseURL: "/registry",
    }),
    // Other plugins...
  ],
});
```

### 3. Plugin Client Integration

**Client-side Plugin Access:**

```typescript
// Use direct API calls instead of authClient methods
const { data: plugins } = await useFetch<PluginListResponse>(
  "/api/v1/registry/plugins",
);

// Plugin actions
const enablePlugin = async (pluginId: string) => {
  await $fetch(`/api/v1/registry/plugins/${pluginId}/enable`, {
    method: "POST",
  });
};
```

## Dashboard Layout Architecture

### 1. Layout-Page Separation Pattern

**Dashboard Layout (pages/dashboard.vue):**

```vue
<template>
  <div class="min-h-screen">
    <!-- Toolbar Header -->
    <Toolbar class="border-0">
      <template #start>
        <h2 class="text-xl font-semibold">{{ $t("dashboard.title") }}</h2>
      </template>
      <template #end>
        <Button
          :label="$t('auth.signOut')"
          severity="secondary"
          @click="signOut"
        />
      </template>
    </Toolbar>

    <!-- Main Layout -->
    <Splitter class="h-[calc(100vh-4rem)]">
      <!-- Sidebar Navigation -->
      <SplitterPanel :size="20" :minSize="15">
        <div class="h-full flex flex-col">
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
        </div>
      </SplitterPanel>

      <!-- Content Area -->
      <SplitterPanel :size="80">
        <div class="h-full overflow-auto">
          <NuxtPage />
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
```

**Child Page Pattern (pages/dashboard/index.vue):**

```vue
<template>
  <div class="p-6">
    <!-- Page Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold mb-2">{{ $t("dashboard.welcome") }}</h1>
      <p>{{ $t("dashboard.overview") }}</p>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card v-for="stat in stats" :key="stat.label">
        <template #content>
          <div class="flex items-center justify-between p-4">
            <div>
              <p class="text-2xl font-bold">{{ stat.value }}</p>
              <p class="text-sm">{{ stat.label }}</p>
            </div>
            <i :class="stat.icon" class="text-2xl"></i>
          </div>
        </template>
      </Card>
    </div>

    <!-- Content Sections -->
    <!-- ... rest of page content -->
  </div>
</template>
```

### 2. Navigation Menu Pattern

**Menu Configuration:**

```typescript
const menuItems = computed(() => [
  {
    label: t("nav.dashboard"),
    icon: "i-mdi-view-dashboard",
    route: "/dashboard",
  },
  {
    label: t("nav.plugins"),
    icon: "i-mdi-puzzle",
    route: "/dashboard/plugins",
  },
  {
    label: t("nav.users"),
    icon: "i-mdi-account-group",
    route: "/dashboard/users",
  },
  {
    label: t("nav.organizations"),
    icon: "i-mdi-domain",
    route: "/dashboard/organizations",
  },
  {
    label: t("nav.settings"),
    icon: "i-mdi-cog",
    route: "/dashboard/settings",
  },
]);
```

## Data Management Patterns

### 1. Reactive State Management

**Composable Pattern:**

```typescript
// composables/usePlugins.ts
export const usePlugins = () => {
  const plugins = ref<Plugin[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchPlugins = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await $fetch<PluginListResponse>(
        "/api/v1/registry/plugins",
      );
      plugins.value = response.plugins;
    } catch (err: any) {
      error.value = err.message || "Failed to fetch plugins";
    } finally {
      loading.value = false;
    }
  };

  const togglePlugin = async (pluginId: string) => {
    const plugin = plugins.value.find((p) => p.id === pluginId);
    if (!plugin) return;

    const action = plugin.enabled ? "disable" : "enable";

    try {
      await $fetch(`/api/v1/registry/plugins/${pluginId}/${action}`, {
        method: "POST",
      });

      plugin.enabled = !plugin.enabled;
    } catch (err: any) {
      error.value = `Failed to ${action} plugin: ${err.message}`;
    }
  };

  return {
    plugins: readonly(plugins),
    loading: readonly(loading),
    error: readonly(error),
    fetchPlugins,
    togglePlugin,
  };
};
```

### 2. Data Table Configuration

**DataTable Best Practices:**

```vue
<DataTable
  :value="data"
  :loading="loading"
  :paginator="data.length > 10"
  :rows="10"
  :sortField="'name'"
  :sortOrder="1"
  class="p-datatable-sm"
  responsiveLayout="scroll"
>
  <!-- Column definitions with proper typing -->
  <Column 
    field="name" 
    :header="$t('common.name')"
    :sortable="true"
  />
  
  <!-- Status column with Tag component -->
  <Column field="status" :header="$t('common.status')">
    <template #body="{ data }">
      <Tag 
        :value="getStatusLabel(data.status)"
        :severity="getStatusSeverity(data.status)"
      />
    </template>
  </Column>
  
  <!-- Actions column -->
  <Column :header="$t('common.actions')">
    <template #body="{ data }">
      <div class="flex gap-2">
        <Button
          icon="i-mdi-pencil"
          size="small"
          severity="secondary"
          @click="editItem(data)"
        />
        <Button
          icon="i-mdi-delete"
          size="small"
          severity="danger"
          @click="deleteItem(data)"
        />
      </div>
    </template>
  </Column>
</DataTable>
```

## TypeScript Integration Patterns

### 1. Plugin Type Definitions

**Type-safe Plugin Interfaces:**

```typescript
// packages/vertex/src/plugins/registry/types.ts
export interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  type: "core" | "extension";
  enabled: boolean;
  dependencies?: string[];
  metadata?: Record<string, any>;
}

export interface PluginRegistry {
  plugins: Map<string, Plugin>;
  register: (plugin: Plugin) => void;
  unregister: (pluginId: string) => void;
  enable: (pluginId: string) => Promise<void>;
  disable: (pluginId: string) => Promise<void>;
  list: () => Plugin[];
}
```

### 2. API Route Types

**Server Route Type Safety:**

```typescript
// server/api/v1/registry/plugins/index.get.ts
export default defineEventHandler(async (): Promise<{ plugins: Plugin[] }> => {
  const plugins = globalRegistry.list();
  return { plugins };
});

// server/api/v1/registry/plugins/[id]/[action].post.ts
export default defineEventHandler(async (event) => {
  const { id, action } = getRouterParams(event);

  if (!["enable", "disable"].includes(action)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid action",
    });
  }

  if (action === "enable") {
    await globalRegistry.enable(id);
  } else {
    await globalRegistry.disable(id);
  }

  return { success: true };
});
```

## Summary

This updated documentation serves as the definitive guide for maintaining design consistency and following PrimeVue best practices in the Funish Vertex project. Key principles:

1. **Pure PrimeVue**: Use only PrimeVue components and semantic properties
2. **No Custom Colors**: Rely on PrimeVue's design tokens and surface colors
3. **MDI Icons**: Consistent icon system using `i-mdi-*` format
4. **Layout Components**: Proper use of Toolbar, Splitter, Menu, Card, and DataTable
5. **Plugin Architecture**: Modular plugin system with Better Auth integration
6. **API Consistency**: RESTful endpoints with proper naming conventions
7. **Layout-Page Separation**: Clear separation between layout and content components
8. **Type Safety**: Comprehensive TypeScript integration throughout
9. **Semantic Markup**: Accessibility-first approach with proper HTML structure
10. **i18n Integration**: Complete internationalization support
11. **Performance**: Optimized loading and component usage

Following these guidelines ensures a consistent, accessible, and maintainable codebase that leverages PrimeVue's full potential while supporting a robust plugin architecture and multi-tenant authentication platform.
