import { authClient } from "~/utils/auth";

export default defineNuxtRouteMiddleware(async (to, _from) => {
  const { data: session } = await authClient.useSession(useFetch);

  // Define protected routes that require authentication
  const protectedRoutes = [
    "/dashboard",
    "/organizations",
    "/users",
    "/plugins",
    "/api-keys",
    "/permissions",
    "/settings",
  ];
  const authRoutes = ["/auth/signin", "/auth/signup"];

  if (!session.value) {
    // If user is not authenticated and trying to access protected route
    if (protectedRoutes.some((route) => to.path.startsWith(route))) {
      return navigateTo("/auth/signin");
    }
  } else {
    // If user is authenticated and trying to access auth routes, redirect to dashboard
    if (authRoutes.includes(to.path)) {
      return navigateTo("/dashboard");
    }
  }
});
