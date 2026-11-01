"use client";

import { useState } from "react";

interface AuthModalProps {
  mode: "login" | "register";
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ mode: initialMode, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);

  // Form states
  const [loginField, setLoginField] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Direct registration handler (no verification code required)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim() || undefined,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка регистрации");

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: loginField, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка входа");
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSteamLogin = () => {
    window.location.href = "/api/auth/steam/login";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#091122] border border-blue-500/40 rounded-2xl p-6 sm:p-7 shadow-2xl shadow-blue-500/15">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition text-lg"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <div className="inline-block p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/30 mb-2 shadow-inner">
            <span className="text-2xl">🛡️</span>
          </div>
          <h2 className="text-xl font-black text-white tracking-wide">
            {mode === "login" ? "Авторизация в Danislon Tournaments" : "Быстрая регистрация"}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {mode === "login"
              ? "Войдите для управления турнирами, командами и фэнтези"
              : "Создайте аккаунт моментально без кодов подтверждения"}
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
                ? "border-blue-400 text-blue-400"
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
                ? "border-blue-400 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-300"
            }`}
          >
            Регистрация
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/70 border border-red-500/40 text-red-300 text-xs font-semibold">
            {error}
          </div>
        )}

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Никнейм или Email
              </label>
              <input
                type="text"
                required
                value={loginField}
                onChange={(e) => setLoginField(e.target.value)}
                placeholder="Ваш никнейм или почта"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0d182e] border border-blue-900/60 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Пароль
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ваш пароль"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0d182e] border border-blue-900/60 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-sm shadow-lg shadow-blue-500/20 transition disabled:opacity-50"
            >
              {loading ? "Авторизация..." : "Войти в аккаунт"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Желаемый никнейм <span className="text-cyan-400">*</span>
              </label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={25}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Например: Miracle, CyberTitan, Danislon"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0d182e] border border-blue-900/60 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
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
                placeholder="player@dota.gg"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0d182e] border border-blue-900/60 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Пароль <span className="text-cyan-400">*</span>
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0d182e] border border-blue-900/60 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-sm shadow-lg shadow-blue-500/20 transition disabled:opacity-50"
            >
              {loading ? "Создание аккаунта..." : "Зарегистрироваться"}
            </button>
          </form>
        )}

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
            <span className="bg-[#091122] px-2 text-slate-500">Или войти через</span>
          </div>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              window.location.href = "/api/auth/discord/login";
            }}
            className="w-full py-2.5 px-4 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-md shadow-[#5865F2]/20"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            <span>Войти через Discord</span>
          </button>

          <button
            type="button"
            onClick={handleSteamLogin}
            className="w-full py-2.5 px-4 rounded-lg bg-[#14233c] hover:bg-[#1a2f52] border border-blue-500/30 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm"
          >
            <svg className="w-4 h-4 fill-current text-cyan-400" viewBox="0 0 24 24">
              <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.005.105.005.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.704L.436 15.07C1.829 20.279 6.541 24 12.127 24c6.627 0 12-5.373 12-12S18.605 0 11.979 0z" />
            </svg>
            <span>Войти через Steam OpenID</span>
          </button>
        </div>
      </div>
    </div>
  );
}
