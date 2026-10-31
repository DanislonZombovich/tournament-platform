import { NextRequest, NextResponse } from "next/server";
import { buildSteamLoginUrl } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const protocol = req.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = `${protocol}://${host}`;

  const steamUrl = buildSteamLoginUrl(baseUrl);
  return NextResponse.redirect(steamUrl);
}
