"use client";

import { useState } from "react";

interface AuthModalProps {
  mode: "login" | "register";
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ mode: initialMode, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [registerStep, setRegisterStep] = useState<"credentials" | "verify">("credentials");

  // Form states
  const [loginField, setLoginField] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [username, setUsername] = useState("");

  const [receivedCodeTip, setReceivedCodeTip] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Step 1: Request email verification code
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_code", email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось отправить код");

      if (data.demo_code) {
        setReceivedCodeTip(data.demo_code);
        setVerificationCode(data.demo_code);
      }
      setRegisterStep("verify");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Confirm email and complete registration with chosen username
  const handleConfirmAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm_and_register",
          email,
          code: verificationCode,
          username,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка подтверждения");

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

  const handleQuickLogin = async (provider: string) => {
    setLoading(true);
    setError(null);
    try {
      const chosenName = (mode === "register" ? username : loginField).trim();
      const res = await fetch("/api/auth/quick-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, username: chosenName || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка быстрого входа");
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSteamLogin = async () => {
    return handleQuickLogin("steam");
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
            {mode === "login"
              ? "Авторизация в турнирной платформе"
              : registerStep === "credentials"
              ? "Регистрация через Email"
              : "Подтверждение Email и выбор никнейма"}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {mode === "login"
              ? "Войдите для управления турнирами, командами и фэнтези"
              : registerStep === "credentials"
              ? "Шаг 1 из 2: Укажите почту для отправки кода подтверждения"
              : "Шаг 2 из 2: Введите полученный код и ваш уникальный никнейм"}
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
              setRegisterStep("credentials");
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

        {receivedCodeTip && registerStep === "verify" && (
          <div className="mb-4 p-3 rounded-lg bg-blue-950/70 border border-blue-500/40 text-blue-200 text-xs">
            <span className="font-bold">✉️ Тестовый код подтверждения:</span>{" "}
            <span className="font-mono text-cyan-300 font-bold text-sm ml-1">{receivedCodeTip}</span>
            <span className="block text-[10px] text-slate-400 mt-0.5">В реальной среде код приходит на указанный email.</span>
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
        ) : registerStep === "credentials" ? (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Email для подтверждения <span className="text-blue-400">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="player@dota.gg"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0d182e] border border-blue-900/60 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Пароль <span className="text-blue-400">*</span>
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
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-sm shadow-lg shadow-blue-500/20 transition disabled:opacity-50"
            >
              {loading ? "Отправка кода..." : "Получить код подтверждения"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirmAndRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                6-значный код из письма <span className="text-cyan-400">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="123456"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0d182e] border border-blue-900/60 text-center font-mono text-lg tracking-widest text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Желаемый никнейм на платформе <span className="text-cyan-400">*</span>
              </label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={25}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Например: Miracle, Dendi, CyberTitan"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0d182e] border border-blue-900/60 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Steam можно будет привязать в любой момент в личном профиле.
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRegisterStep("credentials")}
                className="py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Назад
              </button>
              <button
                type="submit"
                disabled={loading || !username.trim()}
                className="flex-1 py-2.5 px-4 rounded-lg bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-sm shadow-lg shadow-blue-500/20 transition disabled:opacity-50"
              >
                {loading ? "Создание..." : "Завершить регистрацию"}
              </button>
            </div>
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
            onClick={handleSteamLogin}
            className="w-full py-2.5 px-4 rounded-lg bg-[#14233c] hover:bg-[#1a2f52] border border-blue-500/30 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm"
          >
            <svg className="w-4 h-4 fill-current text-cyan-400" viewBox="0 0 24 24">
              <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.005.105.005.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.704L.436 15.07C1.829 20.279 6.541 24 12.127 24c6.627 0 12-5.373 12-12S18.605 0 11.979 0z" />
            </svg>
            <span>Войти через Steam OpenID</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin("discord")}
              disabled={loading}
              className="py-2 px-3 rounded-lg bg-[#5865F2]/20 hover:bg-[#5865F2]/30 border border-[#5865F2]/40 text-[#a5b4fc] text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <span>🎮</span>
              <span>Discord</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin("google")}
              disabled={loading}
              className="py-2 px-3 rounded-lg bg-red-950/30 hover:bg-red-900/40 border border-red-500/30 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <span>🌐</span>
              <span>Google</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleDemoSteamLogin}
            disabled={loading}
            className="w-full py-2 px-3 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <span>⚡</span>
            <span>Быстрый тест-вход (Steam Pro Mock)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
