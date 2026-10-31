"use client";

import { useState } from "react";

interface AuthModalProps {
  mode: "login" | "register";
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ mode: initialMode, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [username, setUsername] = useState("");
  const [loginField, setLoginField] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "register") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Ошибка регистрации");
        onSuccess();
      } else {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ login: loginField, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Ошибка входа");
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSteamLogin = () => {
    window.location.href = "/api/auth/steam/login";
  };

  const handleDemoSteamLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const chosenName = (mode === "register" ? username : loginField).trim();
      const res = await fetch("/api/auth/steam/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: chosenName || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка демо-входа");
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0e121b] border border-amber-500/40 rounded-xl p-6 shadow-2xl shadow-amber-500/10">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <div className="inline-block p-2 bg-amber-500/10 rounded-lg border border-amber-500/30 mb-2">
            <span className="text-2xl">🛡️</span>
          </div>
          <h2 className="text-xl font-extrabold text-white">
            {mode === "login" ? "Вход в Compendium 2026" : "Регистрация участника"}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {mode === "login"
              ? "Авторизуйтесь для управления фэнтези и прогнозами"
              : "Создайте профиль игрока или прогнозиста"}
          </p>
        </div>

        <div className="flex border-b border-slate-800 mb-5">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`flex-1 pb-2.5 text-xs font-bold uppercase tracking-wider transition border-b-2 ${
              mode === "login"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-300"
            }`}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={`flex-1 pb-2.5 text-xs font-bold uppercase tracking-wider transition border-b-2 ${
              mode === "register"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-300"
            }`}
          >
            Регистрация
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded bg-red-950/60 border border-red-500/40 text-red-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === "register" ? (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Никнейм на платформе <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Например: Miracle, Dendi, CyberCat"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Email (необязательно)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="player@esports.gg"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Никнейм или Email
              </label>
              <input
                type="text"
                required
                value={loginField}
                onChange={(e) => setLoginField(e.target.value)}
                placeholder="Ваш логин"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Пароль
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 6 символов"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 mt-2 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-extrabold text-sm shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
          >
            {loading ? "Загрузка..." : mode === "login" ? "Войти в аккаунт" : "Зарегистрироваться"}
          </button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
            <span className="bg-[#0e121b] px-2 text-slate-500">Или войти через</span>
          </div>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={handleSteamLogin}
            className="w-full py-2.5 px-4 rounded-lg bg-[#171d25] hover:bg-[#1b2838] border border-[#2a475e] text-white text-xs font-bold flex items-center justify-center gap-2 transition"
          >
            <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
              <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.005.105.005.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.704L.436 15.07C1.829 20.279 6.541 24 12.127 24c6.627 0 12-5.373 12-12S18.605 0 11.979 0z" />
            </svg>
            <span>Войти через Steam OpenID</span>
          </button>

          <button
            type="button"
            onClick={handleDemoSteamLogin}
            disabled={loading}
            className="w-full py-2 px-3 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <span>⚡</span>
            <span>Быстрый тест-вход (Steam Pro Mock)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
