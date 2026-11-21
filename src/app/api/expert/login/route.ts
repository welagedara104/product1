import { NextResponse } from "next/server";
import {
  EXPERT_AUTH_COOKIE,
  createExpertToken,
  expectedExpertPassword,
} from "@/lib/expert/auth";

export async function POST(req: Request) {
  const body = (await req.json()) as { password?: string; expert_id?: string };
  if (!body.password || body.password !== expectedExpertPassword()) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }
  const expertId = body.expert_id?.trim() || "expert_kavinda";
  const token = createExpertToken(expertId);
  const res = NextResponse.json({ ok: true, expert_id: expertId });
  res.cookies.set(EXPERT_AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}
