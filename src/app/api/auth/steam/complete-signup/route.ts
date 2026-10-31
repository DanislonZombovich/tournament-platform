import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { createSessionToken, setSessionCookie, UserSession } from "@/lib/auth";
import { query } from "@/lib/db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dota2-ti2026-super-secret-jwt-key-compendium"
);

export async function POST(req: NextRequest) {
  try {
    const { token, username } = await req.json();

    if (!username || typeof username !== "string" || username.trim().length < 3) {
      return NextResponse.json(
        { error: "Никнейм должен содержать минимум 3 символа" },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim();
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(cleanUsername)) {
      return NextResponse.json(
        { error: "Никнейм может содержать только латинские буквы, цифры, дефис и подчеркивание" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const signupToken = token || cookieStore.get("ti_pending_steam")?.value;

    if (!signupToken) {
      return NextResponse.json(
        { error: "Сессия регистрации через Steam истекла. Повторите попытку входа." },
        { status: 400 }
      );
    }

    let payload: any;
    try {
      const verified = await jwtVerify(signupToken, JWT_SECRET);
      payload = verified.payload;
    } catch {
      return NextResponse.json(
        { error: "Недействительный или истекший токен регистрации" },
        { status: 400 }
      );
    }

    const steamId = payload.steam_id as string;
    const steamName = (payload.steam_name as string) || `SteamUser_${steamId.slice(-4)}`;
    const steamAvatar = (payload.steam_avatar as string) || "";

    if (!steamId) {
      return NextResponse.json({ error: "Ошибка данных Steam" }, { status: 400 });
    }

    const existingUsername = await query(
      `SELECT id FROM users WHERE LOWER(username) = LOWER($1)`,
      [cleanUsername]
    );

    if (existingUsername.rows.length > 0) {
      return NextResponse.json(
        { error: "Данный никнейм уже занят другим игроком" },
        { status: 409 }
      );
    }

    const existingSteam = await query<UserSession>(
      `SELECT id, username, email, role, steam_id, steam_name, steam_avatar, fantasy_tokens
       FROM users WHERE steam_id = $1`,
      [steamId]
    );

    if (existingSteam.rows.length > 0) {
      const user = existingSteam.rows[0];
      const sessionToken = await createSessionToken(user);
      await setSessionCookie(sessionToken);
      cookieStore.delete("ti_pending_steam");
      return NextResponse.json({ success: true, user });
    }

    const newUserId = "usr_" + crypto.randomBytes(8).toString("hex");
    const countRes = await query<{ count: string }>(`SELECT COUNT(*) FROM users`);
    const isFirst = parseInt(countRes.rows[0].count, 10) === 0;
    const role = isFirst ? "admin" : "user";

    await query(
      `INSERT INTO users (id, username, role, steam_id, steam_name, steam_avatar, fantasy_tokens)
       VALUES ($1, $2, $3, $4, $5, $6, 20)`,
      [newUserId, cleanUsername, role, steamId, steamName, steamAvatar]
    );

    const newUserSession: UserSession = {
      id: newUserId,
      username: cleanUsername,
      email: null,
      role,
      steam_id: steamId,
      steam_name: steamName,
      steam_avatar: steamAvatar,
      fantasy_tokens: 20,
    };

    const sessionToken = await createSessionToken(newUserSession);
    await setSessionCookie(sessionToken);
    cookieStore.delete("ti_pending_steam");

    return NextResponse.json({ success: true, user: newUserSession });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Ошибка сервера" }, { status: 500 });
  }
}
