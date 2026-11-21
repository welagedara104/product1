import { NextResponse, type NextRequest } from "next/server";
import { REPORT_AUTH_COOKIE, verifyReportAccessToken } from "@/lib/report/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/report")) {
    return NextResponse.next();
  }

  const withNoIndex = (res: NextResponse) => {
    res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return res;
  };

  const match = pathname.match(/^\/report\/([^/]+)(\/.*)?$/);
  if (!match) return withNoIndex(NextResponse.next());

  const reportId = decodeURIComponent(match[1]!);
  const rest = match[2] ?? "";

  if (rest.startsWith("/login")) {
    return withNoIndex(NextResponse.next());
  }

  const token = request.cookies.get(REPORT_AUTH_COOKIE)?.value;
  if (!(await verifyReportAccessToken(token, reportId))) {
    const login = new URL(`/report/${reportId}/login`, request.url);
    login.searchParams.set("next", pathname);
    return withNoIndex(NextResponse.redirect(login));
  }

  return withNoIndex(NextResponse.next());
}

export const config = {
  matcher: ["/report/:path*"],
};
