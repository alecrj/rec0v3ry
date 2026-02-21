import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/login(.*)",
  "/register(.*)",
  "/api/webhooks/(.*)",
  "/api/health",
  "/setup",
  "/api/setup-user",
]);

export default clerkMiddleware(async (auth, req) => {
  // Public routes - no auth required
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // All other routes require Clerk auth
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    await auth.protect();
    return;
  }

  // Check if user has completed setup (has DB user + org in metadata)
  const metadata = (sessionClaims as any)?.publicMetadata || (sessionClaims as any)?.metadata || {};
  const hasDbUser = !!metadata.dbUserId;
  const hasOrg = !!metadata.orgId;

  // Allow bypass cookie (set during setup for the brief window before JWT refreshes)
  const bypassCookie = req.cookies.get("ros_setup_complete")?.value;

  if ((!hasDbUser || !hasOrg) && !bypassCookie) {
    // User is authenticated with Clerk but hasn't completed DB setup
    // Redirect to setup page
    const setupUrl = new URL("/setup", req.url);
    return NextResponse.redirect(setupUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
