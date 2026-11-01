import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/lib/db";
import { getCurrentUser, createSessionToken, setSessionCookie, UserSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    "localhost:3000";
  const protocol =
    req.headers.get("x-forwarded-proto") ||
    (host.startsWith("localhost") ? "http" : "https");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

  if (error || !code) {
    return NextResponse.redirect(
      `${appUrl}/?auth_error=${encodeURIComponent(error || "no_google_code")}`
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Google token error:", tokenData);
      return NextResponse.redirect(`${appUrl}/?auth_error=google_token_failed`);
    }

    // 2. Fetch user profile from Google
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const googleUser = await userRes.json();
    if (!userRes.ok || !googleUser.id) {
      console.error("Google user fetch error:", googleUser);
      return NextResponse.redirect(`${appUrl}/?auth_error=google_user_failed`);
    }

    const googleId = String(googleUser.id);
    const googleEmail = googleUser.email ? String(googleUser.email).toLowerCase() : null;
    const googleName = googleUser.name || googleUser.given_name || (googleEmail ? googleEmail.split("@")[0] : `GoogleUser_${googleId.slice(-4)}`);
    const googleAvatar = googleUser.picture || null;

    // 3. Link flow if user is already logged in
    const currentUser = await getCurrentUser();
    if (currentUser) {
      await query(
        `UPDATE users 
         SET google_id = $1, google_email = $2, google_avatar = $3, updated_at = NOW() 
         WHERE id = $4`,
        [googleId, googleEmail, googleAvatar, currentUser.id]
      );
      return NextResponse.redirect(`${appUrl}/profile?google_connected=1`);
    }

    // 4. Login flow: Check by google_id
    let existingUserRes = await query<any>(
      `SELECT id, username, email, role, steam_id, steam_name, steam_avatar, discord_id, discord_username, discord_avatar, google_id, google_email, google_avatar
       FROM users WHERE google_id = $1`,
      [googleId]
    );

    let user: any = null;

    if (existingUserRes.rows.length > 0) {
      user = existingUserRes.rows[0];
    } else if (googleEmail) {
      // Check by matching email
      const emailUserRes = await query<any>(
        `SELECT id, username, email, role, steam_id, steam_name, steam_avatar, discord_id, discord_username, discord_avatar, google_id, google_email, google_avatar
         FROM users WHERE email = $1`,
        [googleEmail]
      );

      if (emailUserRes.rows.length > 0) {
        user = emailUserRes.rows[0];
        await query(
          `UPDATE users 
           SET google_id = $1, google_email = $2, google_avatar = COALESCE(google_avatar, $3), updated_at = NOW() 
           WHERE id = $4`,
          [googleId, googleEmail, googleAvatar, user.id]
        );
      }
    }

    // 5. Register flow if user does not exist
    if (!user) {
      const userId = "usr_" + crypto.randomBytes(8).toString("hex");

      // Generate unique username based on Google name
      let baseUsername = googleName.replace(/[^a-zA-Z0-9_\-\. \u0400-\u04FF]/g, "").trim();
      if (!baseUsername || baseUsername.length < 3) {
        baseUsername = `Player_${crypto.randomBytes(3).toString("hex")}`;
      }
      if (baseUsername.length > 20) {
        baseUsername = baseUsername.slice(0, 20);
      }

      let chosenUsername = baseUsername;
      let counter = 1;
      while (true) {
        const check = await query(`SELECT id FROM users WHERE LOWER(username) = LOWER($1)`, [chosenUsername]);
        if (check.rows.length === 0) break;
        chosenUsername = `${baseUsername.slice(0, 16)}_${counter++}`;
      }

      const userCountRes = await query<{ count: string }>(`SELECT COUNT(*) FROM users`);
      const isFirstUser = parseInt(userCountRes.rows[0]?.count || "0", 10) === 0;
      const role = isFirstUser ? "admin" : "user";

      await query(
        `INSERT INTO users (
           id, username, email, email_verified, role, google_id, google_email, google_avatar, created_at, updated_at
         ) VALUES ($1, $2, $3, true, $4, $5, $6, $7, NOW(), NOW())`,
        [userId, chosenUsername, googleEmail, role, googleId, googleEmail, googleAvatar]
      );

      user = {
        id: userId,
        username: chosenUsername,
        email: googleEmail,
        role,
        steam_id: null,
        steam_name: null,
        steam_avatar: null,
        discord_id: null,
        discord_username: null,
        discord_avatar: null,
        google_id: googleId,
        google_email: googleEmail,
        google_avatar: googleAvatar,
      };
    }

    // 6. Create session and set cookie
    const sessionUser: UserSession = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      steam_id: user.steam_id,
      steam_name: user.steam_name,
      steam_avatar: user.steam_avatar,
      discord_id: user.discord_id,
      discord_username: user.discord_username,
      discord_avatar: user.discord_avatar,
      google_id: user.google_id,
      google_email: user.google_email,
      google_avatar: user.google_avatar,
    };

    const token = await createSessionToken(sessionUser);
    await setSessionCookie(token);

    return NextResponse.redirect(`${appUrl}/profile?login=google_success`);
  } catch (err) {
    console.error("Google OAuth error:", err);
    return NextResponse.redirect(`${appUrl}/?auth_error=google_auth_failed`);
  }
}
