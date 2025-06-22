import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

// Define Funish Vertex specific permission resources and actions
export const vertexStatements = {
  ...defaultStatements, // Include Better Auth default user and session permissions
  storage: ["read", "write"],
  database: ["read", "write"],
  gateway: ["read", "write"],
  ai: ["read", "write"],
  tenant: ["admin"],
};

// Create access control system with Vertex statements
export const ac = createAccessControl(vertexStatements);

// Define Vertex-specific roles following Better Auth standards
export const roles = {
  user: ac.newRole({
    // Basic user permissions: read-only access to plugins
    storage: ["read"],
    database: ["read"],
    gateway: ["read"],
    ai: ["read"],
    // Basic user operations (view own information, etc.) - Better Auth defaults
    user: [],
    session: [],
  }),
  admin: ac.newRole({
    // Admin permissions: full plugin operation permissions
    storage: ["read", "write"],
    database: ["read", "write"],
    gateway: ["read", "write"],
    ai: ["read", "write"],
    tenant: ["admin"],
    // Include all default admin permissions (user management, session management, etc.)
    ...adminAc.statements,
  }),
};

// Plugin endpoint configurations for permission checking
export const VERTEX_PLUGIN_ENDPOINTS = {
  storage: {
    paths: ["/storage/"],
    permissions: { storage: ["read", "write"] },
  },
  database: {
    paths: ["/database/"],
    permissions: { database: ["read", "write"] },
  },
  gateway: {
    paths: ["/gateway/"],
    permissions: { gateway: ["read", "write"] },
  },
  ai: {
    paths: ["/ai/"],
    permissions: { ai: ["read", "write"] },
  },
  tenant: {
    paths: ["/tenant/"],
    permissions: { tenant: ["admin"] },
  },
};

// Permission middleware configuration for Vertex plugins
export const vertexPermissionConfig = {
  statements: vertexStatements,
  roles,
  pluginEndpoints: VERTEX_PLUGIN_ENDPOINTS,
  adminRoles: ["admin"], // Better Auth standard admin role
  defaultRole: "user", // Better Auth standard user role
};
