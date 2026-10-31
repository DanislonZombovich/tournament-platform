import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/lib/db";
import { createSessionToken, getCurrentUser, setSessionCookie, UserSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { provider = "steam", username: customUsername } = await req.json().catch(() => ({}));
    const currentUser = await getCurrentUser();

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const steamId = `76561198${Math.floor(10000000 + Math.random() * 90000000)}`;

    const avatar = "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80";
    const persona = customUsername?.trim() || (currentUser ? `${currentUser.username}_Steam` : `EsportsPro_${steamId.slice(-4)}`);
    const providerEmail: string | null = null;

    if (currentUser) {
      // Link steam ID if steam provider, or update user
      if (provider === "steam") {
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
        return NextResponse.json({ user: updatedUser, message: "Steam аккаунт успешно привязан!" });
      }

      return NextResponse.json({ user: currentUser, message: `${provider.toUpperCase()} успешно подключен!` });
    }

    const newUserId = "usr_" + crypto.randomBytes(8).toString("hex");
    const userCount = await query<{ count: string }>(`SELECT COUNT(*) FROM users`);
    const isFirst = parseInt(userCount.rows[0].count, 10) === 0;
    const role = isFirst ? "admin" : "user";

    let baseUsername = customUsername?.trim() || persona;
    let finalUsername = baseUsername;
    let counter = 1;
    while (true) {
      const check = await query(`SELECT id FROM users WHERE LOWER(username) = LOWER($1)`, [finalUsername]);
      if (check.rows.length === 0) break;
      finalUsername = `${baseUsername}_${counter}`;
      counter++;
    }

    const assignedSteamId = provider === "steam" ? steamId : null;
    const assignedSteamName = provider === "steam" ? persona : null;
    const assignedSteamAvatar = provider === "steam" ? avatar : null;

    await query(
      `INSERT INTO users (id, username, email, role, steam_id, steam_name, steam_avatar, email_verified, fantasy_tokens)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, 20)`,
      [newUserId, finalUsername, providerEmail, role, assignedSteamId, assignedSteamName, assignedSteamAvatar]
    );

    const newUserSession: UserSession = {
      id: newUserId,
      username: finalUsername,
      email: providerEmail,
      role,
      steam_id: assignedSteamId,
      steam_name: assignedSteamName,
      steam_avatar: assignedSteamAvatar,
      fantasy_tokens: 20,
    };

    const token = await createSessionToken(newUserSession);
    await setSessionCookie(token);

    return NextResponse.json({
      user: newUserSession,
      success: true,
      message: `Быстрый вход через ${provider.toUpperCase()} выполнен!`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Ошибка сервера" }, { status: 500 });
  }
}
