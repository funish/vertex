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

### 2. Component Usage Rules

**Layout Components (Required):**

- Use PrimeVue layout components exclusively:
  - `Toolbar` for top navigation
  - `Splitter` for layout division
  - `Menu`/`MenuBar`/`PanelMenu` for navigation
  - `Card` with proper header/content/footer slots

**Form Components:**

- Always use PrimeVue form components (`InputText`, `Password`, `Button`)
- Use semantic variants: `variant="outlined"` (default), `variant="filled"`
- Use severity levels: `severity="secondary"`, `severity="primary"`, etc.

### 3. Icon System

**Required Format:**

- Use MDI (Material Design Icons) with format: `i-mdi-*`
- Examples: `i-mdi-account`, `i-mdi-home`, `i-mdi-cog`

**❌ Never Use:**

- PrimeIcons format (`pi pi-*`)
- Custom icon formats (`mdi mdi-*`)

### 4. Spacing & Layout

**Required Patterns:**

- Page containers: `class="p-6"` for main content areas
- Component spacing: Use `gap-*` classes for consistent spacing
- Grid layouts: Use CSS Grid with `grid-cols-*` classes
- Card spacing: Use PrimeVue Card's built-in padding structure

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
    "settings": "Settings"
  },
  "auth": {
    "signin": {
      "title": "Sign In",
      "email": "Email",
      "password": "Password",
      "submit": "Sign In"
    }
  },
  "dashboard": {
    "title": "Dashboard",
    "welcome": "Welcome back, {org}!"
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

## Summary

This documentation serves as the definitive guide for maintaining design consistency and following PrimeVue best practices in the Funish Vertex project. Key principles:

1. **Pure PrimeVue**: Use only PrimeVue components and semantic properties
2. **No Custom Colors**: Rely on PrimeVue's design tokens and surface colors
3. **MDI Icons**: Consistent icon system using `i-mdi-*` format
4. **Layout Components**: Proper use of Toolbar, Splitter, Menu, and Card
5. **Semantic Markup**: Accessibility-first approach with proper HTML structure
6. **i18n Integration**: Complete internationalization support
7. **Performance**: Optimized loading and component usage

Following these guidelines ensures a consistent, accessible, and maintainable codebase that leverages PrimeVue's full potential while meeting the project's design requirements.
