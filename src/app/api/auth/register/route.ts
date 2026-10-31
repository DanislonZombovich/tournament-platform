import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/lib/db";
import { createSessionToken, hashPassword, setSessionCookie, UserSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Standard direct registration without verification code requirement
    const username = body.username || (body.email ? body.email.split("@")[0] : null);
    const email = body.email;
    const password = body.password;

    if (!username || typeof username !== "string" || username.trim().length < 3) {
      return NextResponse.json(
        { error: "Имя пользователя должно содержать не менее 3 символов" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Пароль должен содержать не менее 6 символов" },
        { status: 400 }
      );
    }

    const trimmedUser = username.trim();
    const cleanEmail = email && typeof email === "string" && email.trim().length > 0 ? email.trim().toLowerCase() : null;

    const existingUser = await query(
      `SELECT id FROM users WHERE LOWER(username) = LOWER($1) OR (email IS NOT NULL AND email = $2)`,
      [trimmedUser, cleanEmail]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: "Пользователь с таким именем или email уже существует" },
        { status: 409 }
      );
    }

    const userId = "usr_" + crypto.randomBytes(8).toString("hex");
    const passwordHash = await hashPassword(password);

    const userCount = await query<{ count: string }>(`SELECT COUNT(*) FROM users`);
    const isFirstUser = parseInt(userCount.rows[0].count, 10) === 0;
    const role = isFirstUser ? "admin" : "user";

    await query(
      `INSERT INTO users (id, username, email, password_hash, role, email_verified)
       VALUES ($1, $2, $3, $4, $5, true)`,
      [userId, trimmedUser, cleanEmail, passwordHash, role]
    );

    const sessionUser: UserSession = {
      id: userId,
      username: trimmedUser,
      email: cleanEmail,
      role,
      steam_id: null,
      steam_name: null,
      steam_avatar: null,
    };

    const token = await createSessionToken(sessionUser);
    await setSessionCookie(token);

    return NextResponse.json({ user: sessionUser, success: true }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Ошибка сервера" }, { status: 500 });
  }
}
