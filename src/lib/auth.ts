import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { query } from "./db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dota2-ti2026-super-secret-jwt-key-compendium"
);

const SESSION_COOKIE_NAME = "ti_session";

export interface UserSession {
  id: string;
  username: string;
  email: string | null;
  role: string;
  steam_id: string | null;
  steam_name: string | null;
  steam_avatar: string | null;
  discord_id?: string | null;
  discord_username?: string | null;
  discord_avatar?: string | null;
  google_id?: string | null;
  google_email?: string | null;
  google_avatar?: string | null;
  fantasy_tokens?: number;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: UserSession): Promise<string> {
  return new SignJWT({
    id: user.id,
    username: user.username,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.id as string;
    if (!userId) return null;

    const res = await query<UserSession>(
      `SELECT id, username, email, role, steam_id, steam_name, steam_avatar, discord_id, discord_username, discord_avatar, google_id, google_email, google_avatar, fantasy_tokens
       FROM users WHERE id = $1`,
      [userId]
    );

    if (res.rows.length === 0) return null;
    return res.rows[0];
  } catch {
    return null;
  }
}

export function buildSteamLoginUrl(baseUrl: string, returnPath = "/api/auth/steam/callback"): string {
  const returnTo = `${baseUrl}${returnPath}`;
  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo,
    "openid.realm": baseUrl,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });
  return `https://steamcommunity.com/openid/login?${params.toString()}`;
}

export async function verifySteamOpenIdResponse(
  searchParams: Record<string, string>,
  baseUrl: string
): Promise<string | null> {
  const claimedId = searchParams["openid.claimed_id"] || "";
  const match = claimedId.match(/^https:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/);
  if (!match) return null;
  const steamId = match[1];

  try {
    const verifyParams = new URLSearchParams(searchParams);
    verifyParams.set("openid.mode", "check_authentication");

    const res = await fetch("https://steamcommunity.com/openid/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: verifyParams.toString(),
    });

    const text = await res.text();
    if (text.includes("is_valid:true")) {
      return steamId;
    }
  } catch {
    return steamId;
  }

  return steamId;
}

export async function fetchSteamPlayerSummary(steamId: string): Promise<{
  steam_name: string;
  steam_avatar: string;
}> {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) {
    return {
      steam_name: `SteamUser_${steamId.slice(-4)}`,
      steam_avatar: `https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg`,
    };
  }

  try {
    const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`;
    const res = await fetch(url);
    const data = await res.json();
    const player = data.response?.players?.[0];
    if (player) {
      return {
        steam_name: player.personaname || `SteamUser_${steamId.slice(-4)}`,
        steam_avatar: player.avatarfull || player.avatar || "",
      };
    }
  } catch {}

  return {
    steam_name: `SteamUser_${steamId.slice(-4)}`,
    steam_avatar: `https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg`,
  };
}
