"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthModal from "./AuthModal";

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      <header className="sticky top-0 z-40 border-b border-blue-500/20 bg-[#070d1a]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-7">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-blue-400/50 shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform flex items-center justify-center bg-[#0d1b34]">
                <img src="/logo.jpg" alt="Aegis" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-wider text-white">DANISLON TOURNAMENTS</span>
                <span className="text-[10px] tracking-widest text-cyan-400 font-bold uppercase -mt-0.5">Dota 2 Esports & Fantasy</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/tournaments"
                className="px-3 py-1.5 text-xs font-bold text-cyan-300 hover:text-white bg-blue-950/40 border border-blue-500/30 rounded-lg transition shadow-sm"
              >
                🏆 Все турниры
              </Link>
              <Link
                href="/"
                className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-cyan-400 hover:bg-blue-900/20 rounded-lg transition"
              >
                Сетка матчей
              </Link>
              <Link
                href="/fantasy"
                className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-cyan-400 hover:bg-blue-900/20 rounded-lg transition flex items-center gap-1.5"
              >
                <span>⚔️</span>
                <span>Фэнтези TI 2026</span>
              </Link>
              <Link
                href="/predictions"
                className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-cyan-400 hover:bg-blue-900/20 rounded-lg transition"
              >
                Прогнозы (Pick&apos;ems)
              </Link>
              <Link
                href="/teams"
                className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-cyan-400 hover:bg-blue-900/20 rounded-lg transition"
              >
                Команды
              </Link>
              <Link
                href="/leaderboard"
                className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-cyan-400 hover:bg-blue-900/20 rounded-lg transition"
              >
                Лидерборд
              </Link>
              {user?.role === "admin" && (
                <Link
                  href="/admin"
                  className="px-3 py-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-950/40 border border-rose-500/40 rounded-lg transition flex items-center gap-1"
                >
                  <span>⚡</span>
                  <span>Админ</span>
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  href="/fantasy"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-500/40 text-xs font-bold text-cyan-300 hover:bg-blue-900/50 transition"
                  title="Фэнтези лиги турниров"
                >
                  <span className="text-sm">⚔️</span>
                  <span>Фэнтези</span>
                </Link>

                <Link
                  href="/profile"
                  className="flex items-center gap-2 p-1.5 pr-2 sm:pr-3 rounded-xl bg-[#0d182e] border border-blue-800/60 hover:border-blue-400/80 transition group shadow-sm"
                >
                  {user.steam_avatar ? (
                    <img
                      src={user.steam_avatar}
                      alt={user.username}
                      className="w-7 h-7 rounded-lg object-cover border border-cyan-400/50"
                    />
                  ) : user.discord_avatar ? (
                    <img
                      src={user.discord_avatar}
                      alt={user.username}
                      className="w-7 h-7 rounded-lg object-cover border border-[#5865F2]"
                    />
                  ) : user.google_avatar ? (
                    <img
                      src={user.google_avatar}
                      alt={user.username}
                      className="w-7 h-7 rounded-lg object-cover border border-emerald-400/50"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-blue-900 flex items-center justify-center text-xs font-bold text-cyan-300">
                      {user.username.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="hidden xs:flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-400 transition leading-tight">
                      {user.username}
                    </span>
                    {user.steam_id ? (
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                        Steam
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-400 font-medium">Нет Steam</span>
                    )}
                  </div>
                </Link>

                <button
                  onClick={handleLogout}
                  className="p-1.5 text-xs text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                  title="Выйти"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAuthOpen(true)}
                  className="px-4 py-1.5 text-xs font-extrabold text-white bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-lg shadow-md shadow-blue-500/25 transition flex items-center gap-1.5"
                >
                  <span>Войти</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-blue-900/40 border border-blue-900/60 transition"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-blue-900/50 bg-[#081024]/95 backdrop-blur-lg px-4 py-3 space-y-1">
            <Link
              href="/tournaments"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-bold text-cyan-300 hover:bg-blue-950/60 rounded-lg transition"
            >
              🏆 Все турниры
            </Link>
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-semibold text-slate-300 hover:text-cyan-400 hover:bg-blue-900/20 rounded-lg transition"
            >
              🎮 Сетка матчей
            </Link>
            <Link
              href="/fantasy"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-semibold text-slate-300 hover:text-cyan-400 hover:bg-blue-900/20 rounded-lg transition"
            >
              ⚔️ Фэнтези TI 2026
            </Link>
            <Link
              href="/predictions"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-semibold text-slate-300 hover:text-cyan-400 hover:bg-blue-900/20 rounded-lg transition"
            >
              🎯 Прогнозы (Pick&apos;ems)
            </Link>
            <Link
              href="/teams"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-semibold text-slate-300 hover:text-cyan-400 hover:bg-blue-900/20 rounded-lg transition"
            >
              👥 Команды
            </Link>
            <Link
              href="/leaderboard"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-semibold text-slate-300 hover:text-cyan-400 hover:bg-blue-900/20 rounded-lg transition"
            >
              🏅 Лидерборд
            </Link>
            {user?.role === "admin" && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-sm font-bold text-rose-400 hover:bg-rose-950/30 rounded-lg transition"
              >
                ⚡ Админ-панель
              </Link>
            )}

            <div className="pt-2 border-t border-blue-900/40 mt-2">
              {user ? (
                <div className="space-y-1">
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2 text-sm font-semibold text-slate-200 hover:text-cyan-300 hover:bg-blue-900/30 rounded-lg transition"
                  >
                    <span>👤 Профиль ({user.username})</span>
                    {user.steam_id ? (
                      <span className="text-[10px] text-emerald-400">Steam ✓</span>
                    ) : (
                      <span className="text-[10px] text-amber-400">Нет Steam</span>
                    )}
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-3 py-2 text-sm font-semibold text-rose-400 hover:bg-rose-950/30 rounded-lg transition"
                  >
                    🚪 Выйти
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsAuthOpen(true);
                  }}
                  className="w-full text-center py-2 px-3 rounded-lg text-sm font-black uppercase tracking-wider text-white bg-gradient-to-r from-blue-600 to-cyan-500 shadow-md transition"
                >
                  Войти на платформу
                </button>
              )}
            </div>
          </div>
        )}
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
