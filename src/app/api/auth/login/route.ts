import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { comparePassword, createSessionToken, setSessionCookie, UserSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { login, password } = await req.json();

    if (!login || !password) {
      return NextResponse.json(
        { error: "Введите логин или email и пароль" },
        { status: 400 }
      );
    }

    const cleanLogin = login.trim();

    const userRes = await query<UserSession & { password_hash: string }>(
      `SELECT id, username, email, password_hash, role, steam_id, steam_name, steam_avatar, fantasy_tokens
       FROM users
       WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)`,
      [cleanLogin]
    );

    if (userRes.rows.length === 0) {
      return NextResponse.json(
        { error: "Неверный логин или пароль" },
        { status: 401 }
      );
    }

    const user = userRes.rows[0];
    if (!user.password_hash) {
      return NextResponse.json(
        { error: "Для этого аккаунта настроен только вход через Steam" },
        { status: 400 }
      );
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Неверный логин или пароль" },
        { status: 401 }
      );
    }

    const sessionUser: UserSession = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      steam_id: user.steam_id,
      steam_name: user.steam_name,
      steam_avatar: user.steam_avatar,
    };

    const token = await createSessionToken(sessionUser);
    await setSessionCookie(token);

    return NextResponse.json({ user: sessionUser });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Ошибка сервера" }, { status: 500 });
  }
}
