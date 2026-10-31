"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function SetupUsernameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const steamId = searchParams.get("steam_id") || "";
  const steamName = searchParams.get("steam_name") || "Steam игрок";
  const token = searchParams.get("token") || "";

  const [username, setUsername] = useState(
    steamName.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 15) || ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Укажите никнейм на платформе");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/steam/complete-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, username: username.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка сохранения никнейма");

      router.push("/profile?signup=steam_success");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0e121b] border-2 border-amber-500/50 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-amber-500/15 animate-fade-in space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-widest mb-3">
            <span>🛡️</span>
            <span>Добро пожаловать в Compendium 2026</span>
          </div>
          <h1 className="text-2xl font-black text-white">Завершение регистрации</h1>
          <p className="text-xs text-slate-400 mt-1">
            Вы успешно авторизовались через Steam. Укажите ваш уникальный никнейм на платформе для участия в турнире и таблице лидеров.
          </p>
        </div>

        {steamId && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-black/60 border border-amber-500/30">
            <div className="w-12 h-12 rounded-lg bg-slate-800 border border-amber-400/50 flex items-center justify-center font-black text-amber-400 text-sm">
              <svg className="w-6 h-6 fill-current text-amber-400" viewBox="0 0 24 24">
                <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.005.105.005.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.704L.436 15.07C1.829 20.279 6.541 24 12.127 24c6.627 0 12-5.373 12-12S18.605 0 11.979 0z" />
              </svg>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white truncate">{steamName}</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                  Steam ✓
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono truncate">SteamID64: {steamId}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-950/80 border border-red-500/40 text-red-300 text-xs font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
              Ваш никнейм на платформе <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={25}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Например: Miracle, Dendi, Shadow"
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 font-bold focus:outline-none focus:border-amber-400 text-sm transition"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              От 3 до 25 символов (буквы латиницы, цифры, дефис, подчеркивание).
            </span>
          </div>

          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
          >
            {loading ? "Сохранение..." : "Подтвердить никнейм и войти"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SetupUsernamePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-400 rounded-full animate-spin"></div>
        </div>
      }
    >
      <SetupUsernameContent />
    </Suspense>
  );
}
