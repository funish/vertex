import type { UserWithRole } from "better-auth/plugins";
import { requireAuth } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const path = event.path;

  if (path?.startsWith("/api/admin")) {
    const session = await requireAuth(event);
    if (!session.user || (session.user as UserWithRole).role !== "admin") {
      throw createError({
        statusCode: 403,
        statusMessage: "Forbidden",
        message: "Admin access required.",
      });
    }
  }
});
