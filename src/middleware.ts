import { 
  convexAuthNextjsMiddleware, 
  createRouteMatcher, 
  isAuthenticatedNextjs, 
  nextjsMiddlewareRedirect 
} from "@convex-dev/auth/nextjs/server";
 
const isPublicPage = createRouteMatcher(["/auth/LogIn", "/auth/SignUp"]);

export default convexAuthNextjsMiddleware(async (request) => {
  const authenticated = await isAuthenticatedNextjs();

  if (!isPublicPage(request) && !authenticated) {
    return nextjsMiddlewareRedirect(request, "/auth/LogIn");
  }

  if (isPublicPage(request) && authenticated) {
    return nextjsMiddlewareRedirect(request, "/");
  }
});

export const config = {
  // The following matcher runs middleware on all routes
  // except static assets.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};