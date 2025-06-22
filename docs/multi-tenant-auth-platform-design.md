# Multi-Tenant Authentication Platform Design

## 🎯 Overview

Funish Vertex provides **Authentication-as-a-Service** for multi-tenant applications, built on Better Auth. Organizations can configure their own OAuth providers and authentication settings while maintaining complete data isolation.

## 🏗️ Core Design Principles

### 1. Architecture Consistency

- **Better-Auth Instance Management**: Single instance + organization isolation (consistent with existing plugin architecture)
- **Tenant Identification**: Header-based primary, domain-based secondary
- **Endpoint Design**: Follow Better Auth standards, no additional nesting under `/api/v1/`

### 2. Data Isolation Strategy

- **Configuration Storage**: Utilize existing tenant plugin configuration system
- **Default Authentication**: Use platform OAuth config when tenant hasn't configured
- **Access Control**: Based on Better Auth's organization plugin

## 📡 API Endpoint Design

### 2.1 Platform Domain Endpoints (Header Mode)

```
example.com/api/v1/
├── signin/
│   ├── email              # Email/password login
│   └── oauth/{provider}   # OAuth login
├── signup/
│   ├── email              # Email registration
│   └── oauth/{provider}   # OAuth registration
├── signout                # Logout
├── user                   # User information
├── session                # Session management
├── verification/          # Verification flows
├── reset-password         # Password reset
├── authorize              # OAuth authorization
├── token                  # OAuth token exchange
└── callback/{provider}    # OAuth callbacks
```

**Request Format**:

```http
POST /api/v1/signin/oauth/google
Headers:
  X-Organization-ID: acme-corp
  Authorization: Bearer org_acme-corp_api_abc123
  Content-Type: application/json
Body:
{
  "redirectUri": "https://acme-app.com/auth/callback"
}
```

### 2.2 Custom Domain Endpoints (Domain Recognition)

```
custom.com/api/v1/
├── signin/email           # Same structure as platform domain
├── signin/oauth/google    # But auto-recognized organization
├── signup/email
├── signout
├── user
└── ...                    # Complete authentication API
```

**Request Format**:

```http
POST https://custom.com/api/v1/signin/oauth/google
Headers:
  Content-Type: application/json
Body:
{
  "redirectUri": "https://custom.com/dashboard"
}
```

## 🔧 Technical Implementation

### 3.1 Better-Auth Instance Management

**Single Instance + Organization Isolation**:

```typescript
// Consistent with existing plugin architecture
const auth = betterAuth({
  plugins: [
    organization(),
    // Dynamically load tenant-enabled auth plugins
    ...(await getTenantEnabledAuthPlugins(organizationId)),
  ],
});
```

### 3.2 OAuth Provider Plugin Wrapping

Wrap Better Auth official plugins as Vertex plugin definitions:

```typescript
// Google OAuth Plugin Definition
export const googleOAuthPluginDefinition = createPluginDefinition({
  id: "google-oauth",
  name: "Google OAuth",
  description: "Google social login authentication",
  category: "auth",
  configSchema: {
    type: "object",
    properties: {
      clientId: { type: "string", required: true },
      clientSecret: { type: "string", required: true },
      redirectUri: { type: "string", required: true },
      scope: { type: "array", default: ["email", "profile"] },
    },
  },
  serverPlugin: (config) => google(config),
  clientPlugin: () => googleClient(),
});
```

### 3.3 Unified Authentication Middleware

```typescript
const requireAuth = (options?: {
  optional?: boolean; // Optional authentication
  organizationRequired?: boolean; // Requires organization context
  permissions?: string[]; // Required permissions
}) => {
  // 1. Validate JWT token
  // 2. Inject user and organization context
  // 3. Check organization permissions
  // 4. Validate API permissions
};
```

### 3.4 Gateway Plugin Domain Support

Extend Gateway plugin for custom domain support:

```typescript
// Gateway plugin handles domain routing
const gatewayPlugin = (options) => {
  return {
    id: "gateway",
    middlewares: [
      {
        path: "/*",
        middleware: async (ctx) => {
          const domain = ctx.request.headers.get("host");
          const organization = await resolveOrganizationByDomain(domain);

          if (organization) {
            // Inject organization context for custom domains
            ctx.organization = organization;
          }
        },
      },
    ],
  };
};
```

### 3.5 Configuration Storage

Use existing tenant plugin configuration system:

```typescript
interface OrganizationAuthConfig extends OrganizationPluginConfig {
  pluginId: "auth-config";
  config: {
    providers: {
      google?: { clientId: string; clientSecret: string; enabled: boolean };
      github?: { clientId: string; clientSecret: string; enabled: boolean };
      microsoft?: { clientId: string; clientSecret: string; enabled: boolean };
    };
    settings: {
      allowSignup: boolean;
      requireEmailVerification: boolean;
      sessionExpiration: number;
      redirectUrls: string[];
    };
  };
}
```

## 🚀 Implementation Status

### Phase 1: Basic Authentication Framework (✅ Completed)

1. ✅ Extended tenant plugin to support dynamic Better-Auth instance management
2. ✅ Implemented unified authentication middleware
3. ✅ Wrapped core authentication plugins (email/password, email verification, password reset)
4. ✅ Implemented basic tenant authentication endpoints: `/api/v1/signin/*`, `/api/v1/signup/*`

### Phase 2: OAuth Integration (✅ Completed)

1. ✅ Wrapped major OAuth providers (Google, GitHub, Microsoft)
2. ✅ Implemented tenant OAuth configuration management API
3. ✅ End-to-end authentication flows tested and working

### Phase 3: Domain and Gateway Integration (✅ Completed)

1. ✅ Extended gateway plugin to support custom domains
2. ✅ Implemented SSL certificate management foundation
3. ✅ Domain routing to tenant authentication instances

### Phase 4: Access Control Integration (✅ Completed)

1. ✅ Added authentication support to all existing plugins
2. ✅ Implemented fine-grained permission configuration via Permission Plugin
3. ✅ Organization-based data isolation strategy fully implemented

### Phase 5: Advanced Features (🔄 Available)

1. ✅ MFA support (via Better Auth twoFactor plugin)
2. ✅ Enterprise SSO/SAML (via Better Auth sso plugin)
3. ✅ Magic link login (via Better Auth magicLink plugin)
4. ✅ Advanced permission management (via Permission Plugin)

### Next Steps: Frontend Development

- [ ] Authentication UI components
- [ ] Organization management interface
- [ ] Plugin configuration interface
- [ ] Dashboard and analytics

## 📋 Key Implementation Details

### 4.1 Tenant Context Extension

The current implementation uses a simplified approach with helper functions:

```typescript
// Current simplified Tenant interface
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  // Extended tenant-specific fields
  dbSchema?: string;
  authConfig?: string; // JSON string for auth configuration
  pluginConfigs?: string; // JSON string for plugin configurations
  customDomain?: string;
  metadata?: any;
}

// Helper function for type-safe organization access
export const getOrganizationFromContext = (ctx: {
  context: unknown;
}): Tenant | undefined => {
  const context = ctx.context as { organization?: Tenant };
  return context.organization;
};

// Helper function to get plugin configuration
export const getOrganizationPluginConfig = (
  organization: Tenant | undefined,
  pluginId: string,
): any => {
  if (!organization?.pluginConfigs) {
    return {};
  }

  try {
    const pluginConfigs = JSON.parse(organization.pluginConfigs);
    return pluginConfigs[pluginId] || {};
  } catch (error) {
    console.error("[Plugin] Failed to parse plugin configs:", error);
    return {};
  }
};
```

### 4.2 Default Platform OAuth

When tenants haven't configured OAuth:

```typescript
// Use platform-level OAuth configuration as fallback
const getOAuthConfig = (organizationId: string, provider: string) => {
  const tenantConfig = getTenantOAuthConfig(organizationId, provider);
  if (tenantConfig?.enabled) {
    return tenantConfig;
  }

  // Fallback to platform configuration
  return getPlatformOAuthConfig(provider);
};
```

### 4.3 Plugin Integration Pattern

All plugins use the simplified helper function for organization context access:

```typescript
// Example: AI Router Plugin with authentication configuration
export const aiRouterPlugin = (options: AIRouterPluginOptions = {}) => {
  return {
    id: "ai-router",
    endpoints: {
      chatCompletions: createAuthEndpoint(
        "/ai/chat/completions",
        {
          method: "POST",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          // Get organization context
          const organization = getOrganizationFromContext(ctx);
          const orgConfig = getOrganizationPluginConfig(
            organization,
            "ai-router",
          );

          // Use organization-specific or platform OAuth configuration
          const authConfig = getAuthConfig(organization);
          // ... rest of implementation
        },
      ),
    },
  };
};
```

## 🔒 Security Considerations

1. **API Key Validation**: `org_{organizationId}_api_{keyId}` format validation
2. **Organization Isolation**: Complete data separation at all levels
3. **OAuth Security**: Secure client secret storage and validation
4. **Session Management**: Organization-scoped session isolation
5. **Rate Limiting**: Per-organization rate limiting

## 📊 Success Metrics

1. **Complete OAuth Provider Support**: Google, GitHub, Microsoft, Custom OIDC
2. **Custom Domain Support**: SSL certificates and domain routing
3. **Data Isolation**: 100% separation between organizations
4. **API Compatibility**: All existing plugins support authentication
5. **Performance**: < 100ms authentication validation overhead

## 🎯 Expected Outcomes

After implementation, organizations will be able to:

1. **Configure OAuth Providers**: Set up Google, GitHub, Microsoft login for their applications
2. **Custom Domains**: Use their own domains for authentication endpoints
3. **Complete API Access**: All platform plugins support authenticated access
4. **Data Isolation**: Complete separation of user data and configurations
5. **Seamless Integration**: Simple SDK integration for client applications

This design transforms Funish Vertex into a complete Authentication-as-a-Service platform while maintaining consistency with the existing plugin architecture.
