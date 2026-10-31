"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function ProfileContent() {
  const searchParams = useSearchParams();

  const [user, setUser] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [demoLoading, setDemoLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadProfile = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setUser(data.user);
      setTeam(data.team);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    const steamLinked = searchParams.get("steam_linked");
    const errorParam = searchParams.get("error");

    if (steamLinked === "success") {
      setMessage("Steam аккаунт успешно привязан к вашему профилю!");
    } else if (errorParam === "steam_already_linked") {
      setMessage("Этот Steam аккаунт уже привязан к другому профилю на платформе.");
    }
  }, [searchParams]);

  const handleSteamRedirect = () => {
    window.location.href = "/api/auth/steam/login";
  };

  const handleDemoSteamLink = async () => {
    setDemoLoading(true);
    try {
      const res = await fetch("/api/auth/steam/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || "Steam успешно привязан (Тестовый режим)");
        await loadProfile();
      }
    } finally {
      setDemoLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-cyan-400 animate-spin"></div>
        <p className="text-cyan-300 font-bold tracking-wider text-sm">ЗАГРУЗКА ПРОФИЛЯ...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto p-8 rounded-2xl bg-[#091122] border border-blue-500/30 text-center space-y-4">
        <span className="text-4xl">🔒</span>
        <h2 className="text-xl font-black text-white">Требуется авторизация</h2>
        <p className="text-xs text-slate-400">Войдите в свой аккаунт или зарегистрируйтесь для просмотра профиля.</p>
        <a
          href="/"
          className="inline-block px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs uppercase tracking-wider transition"
        >
          На главную
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Profile Header Card */}
      <div className="relative rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-[#091325] via-[#0d1b36] to-[#070e1c] border border-blue-500/40 shadow-2xl shadow-blue-500/10">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative">
            {user.steam_avatar ? (
              <img
                src={user.steam_avatar}
                alt={user.username}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-cyan-400 shadow-xl"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-blue-900 border-2 border-blue-400/50 flex items-center justify-center text-3xl font-black text-cyan-300">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
            )}
            {user.role === "admin" && (
              <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider shadow">
                ADMIN
              </span>
            )}
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white">{user.username}</h1>
              {user.steam_id ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold w-fit mx-auto sm:mx-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Steam верифицирован
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-bold w-fit mx-auto sm:mx-0">
                  Steam не привязан
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400">
              {user.email ? `Email: ${user.email} (подтвержден)` : "Регистрация через Steam"}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
              <div className="px-3 py-1.5 rounded-xl bg-blue-950/70 border border-blue-500/30 text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <span>🪙</span>
                <span>{user.fantasy_tokens ?? 20} жетонов фэнтези</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300">
                Роль: <span className="font-bold text-white capitalize">{user.role}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-blue-950/80 border border-blue-400/50 text-cyan-200 text-xs font-bold shadow-md">
          {message}
        </div>
      )}

      {/* Steam Integration Card */}
      <div className="p-6 sm:p-7 rounded-2xl bg-[#0a1324] border border-blue-900/50 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎮</span>
          <h2 className="text-base font-black text-white uppercase tracking-wider">
            Привязка учетной записи Steam
          </h2>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Для участия в турнирах платформы в составе команд каждый игрок обязан иметь привязанный Steam-аккаунт.
          Это необходимо для верификации официального Dota 2 аккаунта и честного начисления фэнтези-очков.
        </p>

        {user.steam_id ? (
          <div className="p-4 rounded-xl bg-[#0d1a33] border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {user.steam_avatar && (
                <img src={user.steam_avatar} alt="" className="w-10 h-10 rounded-lg object-cover" />
              )}
              <div>
                <span className="font-bold text-white text-sm block">{user.steam_name}</span>
                <span className="text-xs text-slate-400 font-mono">SteamID64: {user.steam_id}</span>
              </div>
            </div>
            <span className="px-3 py-1 rounded-lg bg-emerald-950 text-emerald-300 text-xs font-bold border border-emerald-500/40">
              ✓ Активен и допущен к турнирам
            </span>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[#0d1a33] border border-blue-500/30 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSteamRedirect}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#14233c] hover:bg-[#1a2f52] border border-blue-500/40 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <svg className="w-4 h-4 fill-current text-cyan-400" viewBox="0 0 24 24">
                  <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.005.105.005.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.704L.436 15.07C1.829 20.279 6.541 24 12.127 24c6.627 0 12-5.373 12-12S18.605 0 11.979 0z" />
                </svg>
                <span>Привязать Steam через OpenID</span>
              </button>

              <button
                onClick={handleDemoSteamLink}
                disabled={demoLoading}
                className="py-2.5 px-4 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 text-cyan-300 font-bold text-xs transition"
              >
                {demoLoading ? "Привязка..." : "⚡ Быстрая тестовая привязка (Mock)"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Team Info Card */}
      <div className="p-6 sm:p-7 rounded-2xl bg-[#0a1324] border border-blue-900/50 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">👥</span>
            <h2 className="text-base font-black text-white uppercase tracking-wider">
              Ваша киберспортивная команда
            </h2>
          </div>
          <a
            href="/teams"
            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition"
          >
            Управление командами →
          </a>
        </div>

        {team ? (
          <div className="p-4 rounded-xl bg-[#0d1a33] border border-blue-900/60 flex items-center justify-between">
            <div>
              <span className="font-bold text-white text-sm">
                [{team.tag}] {team.name}
              </span>
              <span className="text-xs text-slate-400 block mt-0.5">
                Инвайт-код: <code className="text-cyan-300 font-mono">{team.invite_code}</code>
              </span>
            </div>
            <a
              href={`/teams`}
              className="py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition"
            >
              Ростер
            </a>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[#0d1a33] border border-dashed border-blue-900/60 text-center space-y-2">
            <p className="text-xs text-slate-400">Вы пока не состоите ни в одной команде.</p>
            <a
              href="/teams"
              className="inline-block py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition"
            >
              Создать или вступить в команду
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-cyan-400 animate-spin"></div>
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
