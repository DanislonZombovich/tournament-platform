import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { query } from "@/lib/db";
import {
  createSessionToken,
  fetchSteamPlayerSummary,
  getCurrentUser,
  setSessionCookie,
  UserSession,
  verifySteamOpenIdResponse,
} from "@/lib/auth";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const searchParams: Record<string, string> = {};
  url.searchParams.forEach((val, key) => {
    searchParams[key] = val;
  });

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const protocol = req.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = `${protocol}://${host}`;

  const steamId = await verifySteamOpenIdResponse(searchParams, baseUrl);

  if (!steamId) {
    return NextResponse.redirect(`${baseUrl}/profile?error=steam_auth_failed`);
  }

  const { steam_name, steam_avatar } = await fetchSteamPlayerSummary(steamId);
  const currentUser = await getCurrentUser();

  if (currentUser) {
    const existing = await query<{ id: string }>(
      `SELECT id FROM users WHERE steam_id = $1 AND id != $2`,
      [steamId, currentUser.id]
    );

    if (existing.rows.length > 0) {
      return NextResponse.redirect(`${baseUrl}/profile?error=steam_already_linked`);
    }

    await query(
      `UPDATE users
       SET steam_id = $1, steam_name = $2, steam_avatar = $3, updated_at = NOW()
       WHERE id = $4`,
      [steamId, steam_name, steam_avatar, currentUser.id]
    );

    const updatedUser: UserSession = {
      ...currentUser,
      steam_id: steamId,
      steam_name,
      steam_avatar,
    };

    const token = await createSessionToken(updatedUser);
    await setSessionCookie(token);

    return NextResponse.redirect(`${baseUrl}/profile?steam_linked=success`);
  }

  const existingSteamUser = await query<UserSession>(
    `SELECT id, username, email, role, steam_id, steam_name, steam_avatar, fantasy_tokens
     FROM users WHERE steam_id = $1`,
    [steamId]
  );

  if (existingSteamUser.rows.length > 0) {
    const user = existingSteamUser.rows[0];
    await query(
      `UPDATE users SET steam_name = $1, steam_avatar = $2, updated_at = NOW() WHERE id = $3`,
      [steam_name, steam_avatar, user.id]
    );
    user.steam_name = steam_name;
    user.steam_avatar = steam_avatar;

    const token = await createSessionToken(user);
    await setSessionCookie(token);

    return NextResponse.redirect(`${baseUrl}/profile?login=success`);
  }

  const pendingToken = await new SignJWT({
    steam_id: steamId,
    steam_name,
    steam_avatar,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(process.env.AUTH_SECRET || "dota2-ti2026-super-secret-jwt-key-compendium"));

  const cookieStore = await cookies();
  cookieStore.set("ti_pending_steam", pendingToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 3600,
  });

  const redirectUrl = `${baseUrl}/auth/setup-username?steam_id=${steamId}&steam_name=${encodeURIComponent(
    steam_name
  )}&token=${encodeURIComponent(pendingToken)}`;

  return NextResponse.redirect(redirectUrl);
}
