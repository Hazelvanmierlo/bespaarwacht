import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const SITE_PASSWORD_ENABLED = process.env.SITE_PASSWORD_ENABLED === "true";
const SITE_USER = process.env.SITE_USER || "admin";
const SITE_PASS = process.env.SITE_PASS || "admin";

function checkBasicAuth(req: NextRequest): NextResponse | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const [scheme, encoded] = authHeader.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = atob(encoded);
      const [user, pass] = decoded.split(":");
      if (user === SITE_USER && pass === SITE_PASS) {
        return null; // Auth OK
      }
    }
  }
  return new NextResponse("Toegang geweigerd", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Site in ontwikkeling"' },
  });
}

// Routes that need NextAuth protection
const protectedPaths = ["/account", "/admin", "/api/scrape"];

export default async function middleware(req: NextRequest) {
  // Basic auth gate for entire site (when enabled)
  if (SITE_PASSWORD_ENABLED) {
    // Skip basic auth for webhook endpoints that need to be publicly accessible
    const path = req.nextUrl.pathname;
    if (!path.startsWith("/api/whatsapp") && !path.startsWith("/api/cron")) {
      const blocked = checkBasicAuth(req);
      if (blocked) return blocked;
    }
  }

  // NextAuth protection for specific routes
  const path = req.nextUrl.pathname;
  if (protectedPaths.some((p) => path.startsWith(p))) {
    // @ts-expect-error — NextAuth middleware signature
    return auth(req);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|standard_fonts|sw.js).*)"],
};
