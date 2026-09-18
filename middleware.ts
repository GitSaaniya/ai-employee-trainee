import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "skillsim_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  let role: string | null = null;
  if (raw) {
    try {
      role = JSON.parse(decodeURIComponent(raw)).role;
    } catch {
      role = null;
    }
  }

  if (pathname.startsWith("/admin")) {
    if (role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }
  if (pathname.startsWith("/employee")) {
    if (role !== "employee") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/employee/:path*"],
};
