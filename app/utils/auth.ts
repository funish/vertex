import {
  adminClient,
  magicLinkClient,
  multiSessionClient,
  organizationClient,
  passkeyClient,
  twoFactorClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/vue";
import { ac, roles } from "#shared/utils/access-control";
import { registryClientPlugin } from "../../packages/vertex/src/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000/api/v1",
  plugins: [
    // Admin functionality for user management
    adminClient({
      ac,
      roles,
    }),
    // Organization support for multi-tenant architecture
    organizationClient(),
    // Magic link authentication
    magicLinkClient(),
    // Passkey (WebAuthn) support
    passkeyClient(),
    // Multi-session support
    multiSessionClient(),
    // Two-factor authentication
    twoFactorClient(),
    // Plugin registry management
    registryClientPlugin(),
  ],
});

// Export common authentication methods
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  // Admin functionality
  admin,
} = authClient;
