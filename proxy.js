import { NextResponse } from "next/server";
import { auth } from "./auth";
import { getSetupStatus } from "@/lib/security/credentials";

// Proxy always runs on the Node.js runtime (unlike the old Edge-default
// Middleware), which is required here since credential resolution touches
// node:sqlite / node:crypto.
export const config = {
  matcher: ["/((?!setup|api|_next/static|_next/image|favicon.ico).*)"]
};

export const proxy = auth(async (request) => {
  const isSignInPage = request.nextUrl.pathname === "/admin/sign-in";
  if (request.nextUrl.pathname.startsWith("/admin") && !isSignInPage && !request.auth?.user?.isAdmin) {
    const signInUrl = new URL("/admin/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(signInUrl);
  }

  const skipped = request.cookies.get("tvguide_setup_skipped");
  if (skipped) return NextResponse.next();

  const status = await getSetupStatus();
  if (!status.anyConfigured) {
    const url = request.nextUrl.clone();
    url.pathname = "/setup";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});
