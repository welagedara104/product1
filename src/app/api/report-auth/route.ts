import { NextResponse } from "next/server";
import {
  REPORT_AUTH_COOKIE,
  mintReportAccessToken,
  passwordMatches,
} from "@/lib/report/auth";
import { getPublishableReport } from "@/lib/report/registry";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    reportId?: string;
    password?: string;
  } | null;

  const reportId = body?.reportId?.trim();
  const password = body?.password ?? "";

  if (!reportId) {
    return NextResponse.json({ error: "Missing reportId" }, { status: 400 });
  }

  const { report, errors } = await getPublishableReport(reportId);
  if (!report) {
    return NextResponse.json(
      { error: "Report unavailable", details: errors },
      { status: 404 },
    );
  }

  if (!passwordMatches(password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  // Token is scoped to the URL id the client used (canonical or alias).
  const token = await mintReportAccessToken(reportId);
  const response = NextResponse.json({
    ok: true,
    reportId,
    canonicalId: report.report_id,
  });
  response.cookies.set(REPORT_AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
