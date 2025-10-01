// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = [/^\/$/, /^\/auth(\/.*)?$/];

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  if (PUBLIC_PATHS.some((r) => r.test(pathname))) {
    return NextResponse.next();
  }

  const token = req.cookies.get("access_token")?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth";
    if (pathname !== "/")
      url.searchParams.set(
        "next",
        pathname + (searchParams.size ? `?${searchParams}` : "")
      );
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Match ALL routes except Next assets and common files
export const config = {
  matcher: [
    "/((?!_next|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map)).*)",
  ],
};
