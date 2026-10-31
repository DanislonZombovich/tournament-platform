"use client";

import { useEffect, useState } from "react";

export default function ProfilePage() {
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
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("steam_linked") === "success") {
      setMessage("Steam аккаунт успешно привязан к вашему профилю!");
    } else if (urlParams.get("error") === "steam_already_linked") {
      setMessage("Этот Steam аккаунт уже привязан к другому профилю на платформе.");
    }
  }, []);

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
        <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin"></div>
        <p className="text-amber-300 font-bold tracking-wider text-sm">ЗАГРУЗКА ПРОФИЛЯ...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto p-8 rounded-2xl bg-[#0e121b] border border-amber-500/30 text-center space-y-4">
        <span className="text-4xl">🔒</span>
        <h2 className="text-xl font-black text-white">Требуется авторизация</h2>
        <p className="text-xs text-slate-400">Войдите в свой аккаунт или зарегистрируйтесь для просмотра профиля.</p>
        <a
          href="/"
          className="inline-block px-5 py-2.5 rounded-lg bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider"
        >
          На главную
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="relative rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-[#17130b] via-[#241a0d] to-[#121622] border-2 border-amber-500/50 shadow-2xl shadow-amber-500/10">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative">
            {user.steam_avatar ? (
              <img
                src={user.steam_avatar}
                alt={user.username}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-amber-400 shadow-xl"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-slate-800 border-2 border-amber-500/40 flex items-center justify-center text-3xl font-black text-amber-400">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
            )}
            {user.role === "admin" && (
              <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded bg-red-600 text-white text-[9px] font-black uppercase tracking-wider shadow">
                ADMIN
              </span>
            )}
          </div>

          <div className="flex flex-col text-center sm:text-left flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <span className="text-xs font-black text-amber-400 uppercase tracking-widest">Профиль игрока</span>
              {user.steam_id && (
                <span className="px-2 py-0.2 rounded bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-bold text-emerald-300">
                  Steam подтвержден ✓
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">{user.username}</h1>
            <p className="text-xs text-slate-400 mt-1">{user.email || "Email не указан"}</p>
          </div>

          <div className="flex flex-col items-center sm:items-end gap-2 shrink-0">
            <div className="px-4 py-2 rounded-xl bg-black/60 border border-amber-500/30 flex items-center gap-2">
              <span className="text-xl">🪙</span>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Жетоны фэнтези</span>
                <span className="text-base font-black text-amber-400">{user.fantasy_tokens ?? 20} / 20</span>
              </div>
            </div>
          </div>
        </div>

        {message && (
          <div className="mt-4 p-3 rounded-lg bg-amber-950/80 border border-amber-500/40 text-amber-200 text-xs font-bold">
            {message}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-[#0e121b]/95 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
                <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.005.105.005.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.704L.436 15.07C1.829 20.279 6.541 24 12.127 24c6.627 0 12-5.373 12-12S18.605 0 11.979 0z" />
              </svg>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">Привязка Steam</h2>
            </div>
            {user.steam_id ? (
              <span className="text-[10px] font-black text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/40">
                Привязан
              </span>
            ) : (
              <span className="text-[10px] font-black text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40">
                Не привязан
              </span>
            )}
          </div>

          {user.steam_id ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-slate-800">
                {user.steam_avatar && (
                  <img
                    src={user.steam_avatar}
                    alt={user.steam_name}
                    className="w-12 h-12 rounded-lg object-cover border border-amber-500/30"
                  />
                )}
                <div className="flex flex-col">
                  <span className="text-sm font-extrabold text-white">{user.steam_name}</span>
                  <span className="text-xs text-slate-400 font-mono">SteamID64: {user.steam_id}</span>
                  <a
                    href={`https://steamcommunity.com/profiles/${user.steam_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-amber-400 hover:underline mt-0.5"
                  >
                    Открыть профиль в Steam Community →
                  </a>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Ваш Steam верифицирован. Вы имеете право выступать в основном составе команд турнира.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Привязка Steam обязательна для игроков турнирного ростера (все 5 позиций). Для зрителей и участников фэнтези привязка опциональна.
              </p>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleSteamRedirect}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#171d25] hover:bg-[#1b2838] border border-[#2a475e] text-white text-xs font-extrabold flex items-center justify-center gap-2 transition"
                >
                  <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
                    <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.005.105.005.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.704L.436 15.07C1.829 20.279 6.541 24 12.127 24c6.627 0 12-5.373 12-12S18.605 0 11.979 0z" />
                  </svg>
                  <span>Войти через Steam OpenID</span>
                </button>

                <button
                  type="button"
                  disabled={demoLoading}
                  onClick={handleDemoSteamLink}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <span>⚡</span>
                  <span>Привязать тестовый Steam ID (Быстрый тест)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0e121b]/95 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span>🛡️</span>
              <span>Команда и турнир</span>
            </h2>
            {team ? (
              <span className="text-[10px] font-black text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40">
                В составе
              </span>
            ) : (
              <span className="text-[10px] font-black text-slate-500 bg-slate-900 px-2 py-0.5 rounded">
                Свободный агент
              </span>
            )}
          </div>

          {team ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-slate-800">
                {team.team_logo && (
                  <img
                    src={team.team_logo}
                    alt={team.team_tag}
                    className="w-12 h-12 rounded-lg object-contain bg-slate-900 p-1 border border-amber-500/30"
                  />
                )}
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-extrabold text-white">{team.team_name}</span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase">
                      {team.team_tag}
                    </span>
                  </div>
                  <span className="text-xs text-amber-300 font-bold mt-1">
                    Роль: {team.role_slot.toUpperCase()}
                  </span>
                </div>
              </div>
              <a
                href="/teams"
                className="inline-block text-xs font-bold text-amber-400 hover:underline"
              >
                Посмотреть команду в списке ростеров →
              </a>
            </div>
          ) : (
            <div className="space-y-3 text-xs text-slate-400">
              <p>Вы еще не состоите ни в одной команде турнира.</p>
              <div className="flex items-center gap-3">
                <a
                  href="/teams"
                  className="px-4 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold transition"
                >
                  Создать команду
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
