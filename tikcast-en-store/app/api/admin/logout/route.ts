import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin";

export async function POST(req: Request) {
  const origin = new URL(req.url).origin;
  const res = NextResponse.redirect(`${origin}/admin`, 303);
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, secure: true, path: "/", maxAge: 0 });
  return res;
}
