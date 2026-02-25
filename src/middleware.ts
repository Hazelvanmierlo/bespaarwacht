export { auth as middleware } from "@/auth";

export const config = {
  matcher: ["/account/:path*", "/admin/:path*", "/api/scrape/:path*"],
};
