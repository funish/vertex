// Import Funish Vertex plugins

import { betterAuth } from "better-auth";
import {
  admin,
  anonymous,
  apiKey,
  bearer,
  // captcha,
  emailOTP,
  genericOAuth,
  haveIBeenPwned,
  jwt,
  magicLink,
  mcp,
  multiSession,
  oAuthProxy,
  oidcProvider,
  oneTap,
  oneTimeToken,
  openAPI,
  organization,
  phoneNumber,
  twoFactor,
  username,
} from "better-auth/plugins";
import { passkey } from "better-auth/plugins/passkey";
import { sso } from "better-auth/plugins/sso";
import type { H3Event } from "h3";
import { Pool } from "pg";
import memoryDriver from "unstorage/drivers/memory";
import {
  aiRouterPlugin,
  databasePlugin,
  gatewayPlugin,
  initializePluginSystem,
  permissionPlugin,
  registryPlugin,
  storagePlugin,
  tenantPlugin,
} from "../../packages/vertex/src/plugins";
import {
  ac,
  roles,
  vertexPermissionConfig,
} from "../../shared/utils/access-control";

// Initialize plugin system to register built-in plugins
initializePluginSystem();

export const auth = betterAuth({
  // Database configuration
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
    // Connection pool configuration
    max: 20, // Max connections
    min: 5, // Min connections
    idleTimeoutMillis: 30000, // Idle connection timeout (30 seconds)
    connectionTimeoutMillis: 10000, // Connection timeout (10 seconds)

    // Query timeout configuration
    query_timeout: 30000, // 30 seconds query timeout
    statement_timeout: 60000, // 60 seconds statement timeout

    // Connection configuration
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,

    // SSL configuration (enable in production)
    ssl:
      process.env.NODE_ENV === "production"
        ? {
            rejectUnauthorized: false, // Adjust based on your SSL certificate settings
          }
        : false,

    // Application name, for database monitoring
    application_name: "funish-vertex-auth",
  }),

  // Extend user model
  user: {
    additionalFields: {
      timezone: { type: "string", required: false, defaultValue: "UTC" },
      locale: { type: "string", required: false, defaultValue: "en" },
      avatar: { type: "string", required: false },
      bio: { type: "string", required: false },
    },
  },

  // Email & Password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to false for development
    sendResetPassword: async ({ user, url }) => {
      // TODO: Implement password reset email sending
      console.log(`Password reset for ${user.email}: ${url}`);
    },
  },

  // Email verification configuration (optional, for when requireEmailVerification is true)
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      // TODO: Implement email verification sending
      console.log(`Email verification for ${user.email}: ${url}`);
    },
  },

  // Social providers (optional)
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    },
  },

  // Better Auth Official Plugins
  plugins: [
    // Core Authentication Plugins
    admin({
      ac,
      roles,
      defaultRole: "user", // Better Auth standard
      adminRoles: ["admin"], // Better Auth standard
    }),
    organization({
      teams: { enabled: true },
    }),

    // API Access Plugins
    apiKey(),
    bearer(),
    jwt(),

    // Authentication Methods
    twoFactor(),
    username(),
    anonymous(),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        // TODO: Implement magic link email sending
        console.log(`Magic link for ${email}: ${url}`);
      },
    }),
    emailOTP({
      sendVerificationOTP: async ({ email, otp, type }) => {
        // TODO: Implement OTP email sending
        console.log(`OTP for ${email}: ${otp} (${type})`);
      },
    }),
    passkey(),
    phoneNumber(),

    // Social Authentication
    genericOAuth({
      config: [], // Will be configured via environment
    }),
    sso(),

    // Security Plugins
    haveIBeenPwned(),
    oneTimeToken(),
    oneTap(),
    mcp({
      loginPage: "/sign-in",
    }),
    // Development Tools
    openAPI(),

    oidcProvider({
      loginPage: "/sign-in", // path to the login page
    }),
    multiSession(),
    oAuthProxy(),

    // Funish Vertex Built-in Plugins
    registryPlugin(),
    permissionPlugin({
      enableOrganizationPermissions: true,
      adminRoles: vertexPermissionConfig.adminRoles,
      pluginEndpoints: vertexPermissionConfig.pluginEndpoints,
      statements: vertexPermissionConfig.statements,
      accessControl: ac,
    }),
    tenantPlugin({
      enableOrganizationValidation: true,
      organizationHeader: "X-Organization-ID",
    }),
    storagePlugin({
      driver: memoryDriver(),
      basePrefix: "vertex:",
    }),
    databasePlugin({
      schemaPrefix: "org_",
      supportedDatabases: ["postgresql", "mysql", "sqlite"],
    }),
    gatewayPlugin({
      routeRules: {
        // Example routes can be added here or managed via API
        // "/proxy-example/**": { proxy: "https://example.com" },
      },
    }),
    aiRouterPlugin({
      providers: {
        openai: {
          baseURL: "https://api.openai.com/v1",
          models: ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
        },
        groq: {
          baseURL: "https://api.groq.com/openai/v1",
          models: ["llama3-70b-8192", "gemma-7b-it", "mixtral-8x7b-32768"],
        },
        anthropic: {
          baseURL: "https://api.anthropic.com/v1",
          models: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
        },
      },
    }),
  ],

  // Advanced configuration
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    cookiePrefix: "funish-vertex",
    crossSubDomainCookies: {
      enabled: false,
    },
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },

  // Security
  secret:
    process.env.BETTER_AUTH_SECRET ||
    "your-super-secret-key-change-in-production",

  // Base URL
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000/api/v1",
});

export const getAuthSession = async (event: H3Event) => {
  const headers = event.headers;
  const session = await auth.api.getSession({
    headers,
  });
  return session;
};

export const requireAuth = async (event: H3Event) => {
  const session = await getAuthSession(event);
  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }
  // Save the session to the event context for later use
  event.context.auth = session;
  return session;
};
