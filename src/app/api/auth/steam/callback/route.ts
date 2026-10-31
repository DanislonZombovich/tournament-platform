import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
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

  const baseUsername = steam_name.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 15) || `Player_${steamId.slice(-4)}`;
  let finalUsername = baseUsername;
  let counter = 1;

  while (true) {
    const check = await query(`SELECT id FROM users WHERE LOWER(username) = LOWER($1)`, [finalUsername]);
    if (check.rows.length === 0) break;
    finalUsername = `${baseUsername}_${counter}`;
    counter++;
  }

  const newUserId = "usr_" + crypto.randomBytes(8).toString("hex");
  const userCount = await query<{ count: string }>(`SELECT COUNT(*) FROM users`);
  const isFirst = parseInt(userCount.rows[0].count, 10) === 0;
  const role = isFirst ? "admin" : "user";

  await query(
    `INSERT INTO users (id, username, role, steam_id, steam_name, steam_avatar, fantasy_tokens)
     VALUES ($1, $2, $3, $4, $5, $6, 20)`,
    [newUserId, finalUsername, role, steamId, steam_name, steam_avatar]
  );

  const newUserSession: UserSession = {
    id: newUserId,
    username: finalUsername,
    email: null,
    role,
    steam_id: steamId,
    steam_name,
    steam_avatar,
    fantasy_tokens: 20,
  };

  const token = await createSessionToken(newUserSession);
  await setSessionCookie(token);

  return NextResponse.redirect(`${baseUrl}/profile?signup=steam_success`);
}
