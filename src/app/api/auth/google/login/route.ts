import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    "localhost:3000";
  const protocol =
    req.headers.get("x-forwarded-proto") ||
    (host.startsWith("localhost") ? "http" : "https");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
  });

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return NextResponse.redirect(googleAuthUrl);
}
