import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/lib/db";
import { createSessionToken, hashPassword, setSessionCookie, UserSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Step 1: Send verification code to email
    if (body.action === "send_code") {
      const { email, password } = body;
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return NextResponse.json({ error: "Укажите корректный email адрес" }, { status: 400 });
      }
      if (!password || typeof password !== "string" || password.length < 6) {
        return NextResponse.json({ error: "Пароль должен содержать минимум 6 символов" }, { status: 400 });
      }

      const cleanEmail = email.trim().toLowerCase();

      const existing = await query(`SELECT id FROM users WHERE email = $1`, [cleanEmail]);
      if (existing.rows.length > 0) {
        return NextResponse.json({ error: "Пользователь с таким email уже зарегистрирован" }, { status: 409 });
      }

      // Generate 6-digit verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const passwordHash = await hashPassword(password);

      await query(
        `INSERT INTO email_verifications (email, code, password_hash, expires_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '15 minutes')
         ON CONFLICT (email) DO UPDATE SET
           code = EXCLUDED.code,
           password_hash = EXCLUDED.password_hash,
           expires_at = EXCLUDED.expires_at`,
        [cleanEmail, code, passwordHash]
      );

      return NextResponse.json({
        success: true,
        message: `Код подтверждения сформирован и отправлен на ${cleanEmail}`,
        demo_code: code, // For convenient UI preview and automated tests
      });
    }

    // Step 2: Confirm code and complete registration with chosen username
    if (body.action === "confirm_and_register") {
      const { email, code, username } = body;

      if (!email || !code || !username) {
        return NextResponse.json({ error: "Заполните email, код подтверждения и желаемый никнейм" }, { status: 400 });
      }

      const cleanEmail = email.trim().toLowerCase();
      const trimmedUser = username.trim();

      if (trimmedUser.length < 3) {
        return NextResponse.json({ error: "Никнейм должен быть от 3 символов" }, { status: 400 });
      }

      const pendingRes = await query<{ code: string; password_hash: string; expires_at: string | Date }>(
        `SELECT code, password_hash, expires_at FROM email_verifications WHERE email = $1`,
        [cleanEmail]
      );

      if (pendingRes.rows.length === 0) {
        return NextResponse.json({ error: "Код подтверждения не найден или истек. Запросите код заново." }, { status: 400 });
      }

      const pending = pendingRes.rows[0];
      if (new Date(pending.expires_at).getTime() < Date.now()) {
        await query(`DELETE FROM email_verifications WHERE email = $1`, [cleanEmail]);
        return NextResponse.json({ error: "Срок действия кода истек" }, { status: 400 });
      }

      if (pending.code !== String(code).trim()) {
        return NextResponse.json({ error: "Неверный код подтверждения" }, { status: 400 });
      }

      const existingUser = await query(
        `SELECT id FROM users WHERE LOWER(username) = LOWER($1) OR (email IS NOT NULL AND email = $2)`,
        [trimmedUser, cleanEmail]
      );

      if (existingUser.rows.length > 0) {
        return NextResponse.json({ error: "Пользователь с таким никнеймом или email уже существует" }, { status: 409 });
      }

      const userId = "usr_" + crypto.randomBytes(8).toString("hex");
      const userCount = await query<{ count: string }>(`SELECT COUNT(*) FROM users`);
      const isFirstUser = parseInt(userCount.rows[0].count, 10) === 0;
      const role = isFirstUser ? "admin" : "user";

      await query(
        `INSERT INTO users (id, username, email, password_hash, role, email_verified, fantasy_tokens)
         VALUES ($1, $2, $3, $4, $5, true, 20)`,
        [userId, trimmedUser, cleanEmail, pending.password_hash, role]
      );

      await query(`DELETE FROM email_verifications WHERE email = $1`, [cleanEmail]);

      const sessionUser: UserSession = {
        id: userId,
        username: trimmedUser,
        email: cleanEmail,
        role,
        steam_id: null,
        steam_name: null,
        steam_avatar: null,
        fantasy_tokens: 20,
      };

      const token = await createSessionToken(sessionUser);
      await setSessionCookie(token);

      return NextResponse.json({ user: sessionUser, success: true }, { status: 201 });
    }

    // Direct / legacy registration for backwards compatibility
    const { username, email, password } = body;

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
      `INSERT INTO users (id, username, email, password_hash, role, email_verified, fantasy_tokens)
       VALUES ($1, $2, $3, $4, $5, true, 20)`,
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
      fantasy_tokens: 20,
    };

    const token = await createSessionToken(sessionUser);
    await setSessionCookie(token);

    return NextResponse.json({ user: sessionUser }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Ошибка сервера" }, { status: 500 });
  }
}
