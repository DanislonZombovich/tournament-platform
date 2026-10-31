import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/lib/db";
import { getCurrentUser, createSessionToken, setSessionCookie, UserSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/?auth_error=${encodeURIComponent(error || "no_code")}`);
  }

  const clientId = process.env.DISCORD_CLIENT_ID || "1566128752688373931";
  const clientSecret = process.env.DISCORD_CLIENT_SECRET || "ehmFf6x86jM-PMIQV2nodwHxxqnn4F4_";
  const redirectUri = `${appUrl}/api/auth/discord/callback`;

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Discord token error:", tokenData);
      return NextResponse.redirect(`${appUrl}/?auth_error=discord_token_failed`);
    }

    // 2. Fetch user profile from Discord
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const discordUser = await userRes.json();
    if (!userRes.ok || !discordUser.id) {
      console.error("Discord user fetch error:", discordUser);
      return NextResponse.redirect(`${appUrl}/?auth_error=discord_user_failed`);
    }

    const discordId = String(discordUser.id);
    const discordUsername = discordUser.username || discordUser.global_name || `DiscordUser_${discordId.slice(-4)}`;
    const discordAvatar = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordId}/${discordUser.avatar}.png`
      : `https://cdn.discordapp.com/embed/avatars/${Number(discordUser.discriminator || 0) % 5}.png`;
    const discordEmail = discordUser.email ? String(discordUser.email).toLowerCase() : null;

    // 3. Check if current user is already logged in (Link flow)
    const currentUser = await getCurrentUser();
    if (currentUser) {
      await query(
        `UPDATE users SET discord_id = $1, discord_username = $2, discord_avatar = $3, updated_at = NOW() WHERE id = $4`,
        [discordId, discordUsername, discordAvatar, currentUser.id]
      );
      return NextResponse.redirect(`${appUrl}/profile?discord_connected=1`);
    }

    // 4. Login or Register flow
    // A. Check by discord_id
    let userResDB = await query<UserSession>(
      `SELECT id, username, email, role, steam_id, steam_name, steam_avatar, discord_id, discord_username, discord_avatar, fantasy_tokens
       FROM users WHERE discord_id = $1`,
      [discordId]
    );

    let targetUser: UserSession | null = userResDB.rows[0] || null;

    // B. Check by email if not found by discord_id
    if (!targetUser && discordEmail) {
      const emailRes = await query<UserSession>(
        `SELECT id, username, email, role, steam_id, steam_name, steam_avatar, discord_id, discord_username, discord_avatar, fantasy_tokens
         FROM users WHERE email = $1`,
        [discordEmail]
      );
      if (emailRes.rows.length > 0) {
        targetUser = emailRes.rows[0];
        // Link Discord to this account
        await query(
          `UPDATE users SET discord_id = $1, discord_username = $2, discord_avatar = $3, updated_at = NOW() WHERE id = $4`,
          [discordId, discordUsername, discordAvatar, targetUser.id]
        );
        targetUser.discord_id = discordId;
        targetUser.discord_username = discordUsername;
        targetUser.discord_avatar = discordAvatar;
      }
    }

    // C. Register new user if not found
    if (!targetUser) {
      const newUserId = "usr_" + crypto.randomBytes(8).toString("hex");

      // Ensure username uniqueness
      let cleanUsername = discordUsername.replace(/[^\p{L}\p{N}_\-\. ]/gu, "").trim() || `Discord_${discordId.slice(-4)}`;
      const existingName = await query(`SELECT id FROM users WHERE username = $1`, [cleanUsername]);
      if (existingName.rows.length > 0) {
        cleanUsername = `${cleanUsername}_${crypto.randomInt(100, 999)}`;
      }

      await query(
        `INSERT INTO users (
          id, username, email, email_verified, role, discord_id, discord_username, discord_avatar, fantasy_tokens, created_at, updated_at
        ) VALUES ($1, $2, $3, true, 'user', $4, $5, $6, 20, NOW(), NOW())`,
        [newUserId, cleanUsername, discordEmail, discordId, discordUsername, discordAvatar]
      );

      targetUser = {
        id: newUserId,
        username: cleanUsername,
        email: discordEmail,
        role: "user",
        steam_id: null,
        steam_name: null,
        steam_avatar: null,
        discord_id: discordId,
        discord_username: discordUsername,
        discord_avatar: discordAvatar,
        fantasy_tokens: 20,
      };
    }

    // 5. Create and set session cookie
    const token = await createSessionToken(targetUser);
    await setSessionCookie(token);

    return NextResponse.redirect(`${appUrl}/?auth_success=discord`);
  } catch (err: any) {
    console.error("Discord auth exception:", err);
    return NextResponse.redirect(`${appUrl}/?auth_error=${encodeURIComponent(err.message || "internal")}`);
  }
}
