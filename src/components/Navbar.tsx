"use client";

import Link from "next/navigation";
import { useEffect, useState } from "react";
import AuthModal from "./AuthModal";

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const loadUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setUser(data.user);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.reload();
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-amber-500/20 bg-[#090c13]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <a href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
                <span className="text-xl font-black text-black">TI</span>
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-lg tracking-wider text-white">THE INTERNATIONAL</span>
                <span className="text-[10px] tracking-widest text-amber-400 font-bold uppercase -mt-1">Compendium 2026</span>
              </div>
            </a>

            <nav className="hidden md:flex items-center gap-1">
              <a
                href="/"
                className="px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-amber-400 hover:bg-slate-800/40 rounded-md transition"
              >
                Сетка турнира
              </a>
              <a
                href="/fantasy"
                className="px-3 py-1.5 text-sm font-semibold text-amber-300 hover:text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-md transition flex items-center gap-1.5 shadow-sm shadow-amber-500/20"
              >
                <span>🏆</span>
                <span>Фэнтези TI 2026</span>
              </a>
              <a
                href="/predictions"
                className="px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-amber-400 hover:bg-slate-800/40 rounded-md transition"
              >
                Прогнозы (Pick&apos;ems)
              </a>
              <a
                href="/teams"
                className="px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-amber-400 hover:bg-slate-800/40 rounded-md transition"
              >
                Команды
              </a>
              <a
                href="/leaderboard"
                className="px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-amber-400 hover:bg-slate-800/40 rounded-md transition"
              >
                Таблица лидеров
              </a>
              {user?.role === "admin" && (
                <a
                  href="/admin"
                  className="px-3 py-1.5 text-sm font-bold text-red-400 hover:text-red-300 bg-red-950/40 border border-red-500/40 rounded-md transition flex items-center gap-1"
                >
                  <span>⚡</span>
                  <span>Админ-панель</span>
                </a>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <a
                  href="/fantasy"
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/40 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition"
                  title="Оставшиеся жетоны перековки фэнтези"
                >
                  <span className="text-sm">🪙</span>
                  <span>{user.fantasy_tokens ?? 20} жетонов</span>
                </a>

                <a
                  href="/profile"
                  className="flex items-center gap-2 p-1.5 pr-3 rounded-lg bg-slate-900 border border-slate-700/60 hover:border-amber-500/50 transition group"
                >
                  {user.steam_avatar ? (
                    <img
                      src={user.steam_avatar}
                      alt={user.username}
                      className="w-7 h-7 rounded object-cover border border-amber-500/40"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded bg-slate-800 flex items-center justify-center text-xs font-bold text-amber-400">
                      {user.username.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-200 group-hover:text-amber-400 transition leading-tight">
                      {user.username}
                    </span>
                    {user.steam_id ? (
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                        Steam
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Нет Steam</span>
                    )}
                  </div>
                </a>

                <button
                  onClick={handleLogout}
                  className="p-1.5 text-xs text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition"
                  title="Выйти"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setAuthMode("login");
                    setIsAuthOpen(true);
                  }}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-md border border-slate-700 transition"
                >
                  Вход
                </button>
                <button
                  onClick={() => {
                    setAuthMode("register");
                    setIsAuthOpen(true);
                  }}
                  className="px-3.5 py-1.5 text-xs font-bold text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-md shadow-md shadow-amber-500/20 transition"
                >
                  Регистрация
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {isAuthOpen && (
        <AuthModal
          mode={authMode}
          onClose={() => setIsAuthOpen(false)}
          onSuccess={() => {
            setIsAuthOpen(false);
            loadUser();
          }}
        />
      )}
    </>
  );
}
