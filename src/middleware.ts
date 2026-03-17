import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

// Routes that need NextAuth protection
const protectedPaths = ["/account", "/admin", "/api/scrape"];

export default async function middleware(req: NextRequest) {
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
