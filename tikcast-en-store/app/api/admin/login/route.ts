import { NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_TTL_SECONDS, checkPassword, createSessionValue } from "@/lib/admin";

export async function POST(req: Request) {
  const form = await req.formData();
  const password = String(form.get("password") || "");
  const origin = new URL(req.url).origin;
  if (!checkPassword(password)) {
    return NextResponse.redirect(`${origin}/admin?error=1`, 303);
  }
  const session = createSessionValue();
  if (!session) {
    return NextResponse.redirect(`${origin}/admin?error=config`, 303);
  }
  const res = NextResponse.redirect(`${origin}/admin`, 303);
  res.cookies.set(ADMIN_COOKIE, session, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_TTL_SECONDS,
  });
  return res;
}
