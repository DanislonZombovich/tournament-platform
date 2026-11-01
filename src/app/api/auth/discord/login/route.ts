import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const clientId = process.env.DISCORD_CLIENT_ID || "";
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    "localhost:3000";
  const protocol =
    req.headers.get("x-forwarded-proto") ||
    (host.startsWith("localhost") ? "http" : "https");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
  const redirectUri = `${appUrl}/api/auth/discord/callback`;

  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=identify%20email`;

  return NextResponse.redirect(discordAuthUrl);
}
