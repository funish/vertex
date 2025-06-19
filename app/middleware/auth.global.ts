export default defineNuxtRouteMiddleware(async (to, _from) => {
  const { data: session } = await authClient.useSession(useFetch);
  if (!session.value) {
    if (to.path === "/dashboard") {
      return navigateTo("/");
    }
  }
});
