import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/lib/db";
import { createSessionToken, getCurrentUser, setSessionCookie, UserSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { customSteamId, customPersona } = await req.json().catch(() => ({}));
    const currentUser = await getCurrentUser();

    const randomSuffix = Math.floor(10000000 + Math.random() * 90000000);
    const steamId = customSteamId || `76561198${randomSuffix}`;
    const persona = customPersona || (currentUser ? `${currentUser.username}_Steam` : `EsportsPro_${steamId.slice(-4)}`);
    const avatar = `https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80`;

    if (currentUser) {
      await query(
        `UPDATE users
         SET steam_id = $1, steam_name = $2, steam_avatar = $3, updated_at = NOW()
         WHERE id = $4`,
        [steamId, persona, avatar, currentUser.id]
      );

      const updatedUser: UserSession = {
        ...currentUser,
        steam_id: steamId,
        steam_name: persona,
        steam_avatar: avatar,
      };

      const token = await createSessionToken(updatedUser);
      await setSessionCookie(token);

      return NextResponse.json({ user: updatedUser, message: "Steam аккаунт успешно привязан (Тестовый режим)" });
    }

    const newUserId = "usr_" + crypto.randomBytes(8).toString("hex");
    const userCount = await query<{ count: string }>(`SELECT COUNT(*) FROM users`);
    const isFirst = parseInt(userCount.rows[0].count, 10) === 0;
    const role = isFirst ? "admin" : "user";
    const username = `Player_${steamId.slice(-4)}`;

    await query(
      `INSERT INTO users (id, username, role, steam_id, steam_name, steam_avatar, fantasy_tokens)
       VALUES ($1, $2, $3, $4, $5, $6, 20)`,
      [newUserId, username, role, steamId, persona, avatar]
    );

    const newUserSession: UserSession = {
      id: newUserId,
      username,
      email: null,
      role,
      steam_id: steamId,
      steam_name: persona,
      steam_avatar: avatar,
      fantasy_tokens: 20,
    };

    const token = await createSessionToken(newUserSession);
    await setSessionCookie(token);

    return NextResponse.json({ user: newUserSession, message: "Создан аккаунт с привязанным Steam (Тестовый режим)" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Ошибка сервера" }, { status: 500 });
  }
}
