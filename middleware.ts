import { convexAuthNextjsMiddleware, createRouteMatcher, isAuthenticatedNextjs, nextjsMiddlewareRedirect } from "@convex-dev/auth/nextjs/server";
 
const isPublicPage = createRouteMatcher(["/auth", "/auth/LogIn"]);

export default convexAuthNextjsMiddleware(async (request) => {
    const authenticated = await isAuthenticatedNextjs();
    console.log("Authentication status:", authenticated);
    console.log("Current path:", request.nextUrl.pathname);
  
    if (!isPublicPage(request) && !authenticated) {
      console.log("Redirecting to login...");
      return nextjsMiddlewareRedirect(request, "/auth/LogIn");
    }
    
    if(isPublicPage(request) && authenticated) {
      console.log("Redirecting to home...");
      return nextjsMiddlewareRedirect(request, "/");
    }
});

export const config = {
  // The following matcher runs middleware on all routes
  // except static assets.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};