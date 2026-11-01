"use client";

interface AuthModalProps {
  mode?: "login" | "register";
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google/login";
  };

  const handleDiscordLogin = () => {
    window.location.href = "/api/auth/discord/login";
  };

  const handleSteamLogin = () => {
    window.location.href = "/api/auth/steam/login";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#091122] border border-blue-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-blue-500/20">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition text-lg w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10"
        >
          ✕
        </button>

        <div className="text-center mb-7">
          <div className="inline-block p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 rounded-2xl border border-blue-500/30 mb-3 shadow-inner">
            <span className="text-3xl">🛡️</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
            Вход в Danislon Tournaments
          </h2>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-xs mx-auto">
            Авторизуйтесь через один из официальных сервисов для участия в турнирах, составах и фэнтези
          </p>
        </div>

        <div className="space-y-3">
          {/* GOOGLE AUTH BUTTON */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-3 transition shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Продолжить с Google</span>
          </button>

          {/* DISCORD AUTH BUTTON */}
          <button
            type="button"
            onClick={handleDiscordLogin}
            className="w-full py-3 px-4 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-3 transition shadow-lg shadow-[#5865F2]/25 hover:scale-[1.01] active:scale-[0.99]"
          >
            <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            <span>Войти через Discord</span>
          </button>

          {/* STEAM AUTH BUTTON */}
          <button
            type="button"
            onClick={handleSteamLogin}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#171a21] via-[#1e2837] to-[#121620] hover:from-[#1e232d] hover:to-[#171c28] border border-cyan-500/30 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-3 transition shadow-lg shadow-black/40 hover:scale-[1.01] active:scale-[0.99]"
          >
            <svg className="w-5 h-5 fill-current text-cyan-400 shrink-0" viewBox="0 0 24 24">
              <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.005.105.005.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.704L.436 15.07C1.829 20.279 6.541 24 12.127 24c6.627 0 12-5.373 12-12S18.605 0 11.979 0z" />
            </svg>
            <span>Войти через Steam OpenID</span>
          </button>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center space-y-2">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            🔒 Вход осуществляется безопасно через официальные OAuth протоколы Google, Discord и Valve Steam. Пароли не хранятся на сайте.
          </p>
        </div>
      </div>
    </div>
  );
}
