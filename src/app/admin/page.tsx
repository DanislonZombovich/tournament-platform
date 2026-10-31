"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface TeamItem {
  id: string;
  name: string;
  tag: string;
  logo_url: string;
  seed: number | null;
}

interface MatchItem {
  id: string;
  match_code: string;
  bracket_type: string;
  round_name: string;
  team1_id: string | null;
  team2_id: string | null;
  team1_score: number;
  team2_score: number;
  winner_id: string | null;
  status: string;
  team1_name: string | null;
  team1_tag: string | null;
  team2_name: string | null;
  team2_tag: string | null;
}

interface TournamentSummary {
  id: string;
  title: string;
  status: string;
  format: string;
  teams_count: string;
  max_teams: number;
}

function AdminContent() {
  const searchParams = useSearchParams();
  const initialTournamentId = searchParams.get("tournament_id") || "ti-2026-main";

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentTournId, setCurrentTournId] = useState<string>(initialTournamentId);
  const [tournamentsList, setTournamentsList] = useState<TournamentSummary[]>([]);
  const [tournament, setTournament] = useState<any>(null);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Match modal
  const [selectedMatch, setSelectedMatch] = useState<MatchItem | null>(null);
  const [t1Score, setT1Score] = useState<number>(2);
  const [t2Score, setT2Score] = useState<number>(0);
  const [winnerId, setWinnerId] = useState<string>("");

  const loadData = async (targetId?: string) => {
    const tId = targetId || currentTournId;
    try {
      const [authRes, tournRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch(`/api/tournaments?id=${encodeURIComponent(tId)}`),
      ]);

      const authData = await authRes.json();
      const tournData = await tournRes.json();

      setCurrentUser(authData.user);
      setTournamentsList(tournData.tournaments || []);

      if (tournData.tournament) {
        setTournament(tournData.tournament);
        setCurrentTournId(tournData.tournament.id);
      }
      setTeams(tournData.registered_teams || []);
      setMatches(tournData.matches || []);
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(currentTournId);
  }, [currentTournId]);

  const handleSwitchTournament = (newId: string) => {
    setCurrentTournId(newId);
    setLoading(true);
    setMessage(null);
  };

  const handleSeedDemoData = async () => {
    if (!tournament) return;
    if (!confirm(`Заполнить демо-команды (Liquid, Gladiators, Spirit, BetBoom) для турнира "${tournament.title}"?`)) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "seed_demo_data",
          tournament_id: currentTournId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка сидирования");
      setMessage({ text: data.message, type: "success" });
      await loadData(currentTournId);
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublishBracket = async () => {
    if (!tournament) return;
    if (!confirm(`Опубликовать сетку турнира "${tournament.title}" и перевести в статус ongoing?`)) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish_bracket",
          tournament_id: currentTournId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка публикации сетки");
      setMessage({ text: data.message, type: "success" });
      await loadData(currentTournId);
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleLock = async (fantasyLocked: boolean, predictionsLocked: boolean) => {
    if (!tournament) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_locks",
          tournament_id: currentTournId,
          is_fantasy_locked: fantasyLocked,
          is_predictions_locked: predictionsLocked,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка переключения блокировок");
      setMessage({ text: data.message, type: "success" });
      await loadData(currentTournId);
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeStatus = async (status: string) => {
    if (!tournament) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change_status",
          tournament_id: currentTournId,
          new_status: status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка смены статуса");
      setMessage({ text: data.message, type: "success" });
      await loadData(currentTournId);
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetTournament = async () => {
    if (!tournament) return;
    if (!confirm(`ВНИМАНИЕ: Сбросить результаты всех матчей турнира "${tournament.title}" и вернуть регистрацию?`)) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_tournament",
          tournament_id: currentTournId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка сброса турнира");
      setMessage({ text: data.message, type: "success" });
      await loadData(currentTournId);
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitMatchResult = async (generateStats = true) => {
    if (!selectedMatch) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/match-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_id: selectedMatch.id,
          team1_score: t1Score,
          team2_score: t2Score,
          winner_id: winnerId,
          generate_stats: generateStats,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка сохранения результата матча");
      setMessage({ text: data.message, type: "success" });
      setSelectedMatch(null);
      await loadData(currentTournId);
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !tournament) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-cyan-400 animate-spin"></div>
        <p className="text-cyan-300 font-bold tracking-wider text-sm">ПРОВЕРКА ПРАВ АДМИНИСТРАТОРА...</p>
      </div>
    );
  }

  const isAdmin = currentUser && (currentUser.role === "admin" || currentUser.id === "usr_d98221e7ed837829");

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto p-8 rounded-2xl bg-[#091122] border border-rose-500/40 text-center space-y-4">
        <span className="text-4xl">🚫</span>
        <h2 className="text-xl font-black text-white">Доступ ограничен</h2>
        <p className="text-xs text-slate-400">
          Данный раздел доступен только для организатора платформы (Danislon_Zombovich) и администраторов.
        </p>
        <a
          href="/"
          className="inline-block px-4 py-2 rounded-lg bg-blue-600 text-xs font-bold text-white hover:bg-blue-500 transition"
        >
          На главную
        </a>
      </div>
    );
  }

  const completedMatchesCount = matches.filter((m) => m.status === "completed").length;
  const participantCap = tournament?.participant_cap || tournament?.max_teams || 8;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* TOURNAMENT SELECTOR BAR */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0d172e] border border-blue-500/40 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <span className="text-xs font-black uppercase text-cyan-400 tracking-wider">
              Выберите турнир для управления:
            </span>
          </div>

          <select
            value={currentTournId}
            onChange={(e) => handleSwitchTournament(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#070e1c] border border-cyan-500/50 text-xs font-extrabold text-white focus:outline-none focus:border-cyan-300 cursor-pointer shadow-inner"
          >
            {tournamentsList.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} [{t.status === "registration" ? "Регистрация" : t.status === "ongoing" ? "Идет" : "Завершен"}]
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tournament && (
            <a
              href={`/tournaments?edit=${tournament.id}`}
              className="px-3.5 py-2 rounded-xl bg-orange-600/30 hover:bg-orange-600/50 border border-orange-500/50 text-orange-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              title="Открыть регламент и настройки Challonge"
            >
              <span>⚙️</span>
              <span>Настройки Challonge</span>
            </a>
          )}

          <a
            href={`/?tournament_id=${currentTournId}`}
            className="px-3.5 py-2 rounded-xl bg-blue-950/70 hover:bg-blue-900 border border-blue-500/40 text-cyan-300 text-xs font-bold transition flex items-center gap-1.5"
          >
            <span>👀</span>
            <span>Открыть live-сетку</span>
          </a>

          <a
            href="/tournaments"
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-extrabold transition flex items-center gap-1.5 shadow-md shadow-blue-500/20"
          >
            <span>➕</span>
            <span>Все турниры / Создать</span>
          </a>
        </div>
      </div>

      {/* TOURNAMENT SIGNUP SECRET LINK */}
      {tournament && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#091122] border border-amber-500/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-amber-400 text-sm">🔑</span>
              <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                Уникальная ссылка регистрации на «{tournament.title}» (доступна только вам)
              </span>
            </div>
            <input
              type="text"
              readOnly
              value={`${typeof window !== "undefined" ? window.location.origin : ""}/tournaments/signup/${tournament.signup_token || "ti26_70344573f2a1"}`}
              className="mt-1.5 w-full bg-black/70 border border-amber-900/70 rounded px-2.5 py-1 text-xs text-amber-200 font-mono select-all truncate"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Регистрация закрыта от посторонних. Передайте эту ссылку капитанам команд, которых вы приглашаете в сетку.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/tournaments/signup/${tournament.signup_token || "ti26_70344573f2a1"}`);
              setMessage({ text: "Уникальная ссылка для регистрации участников скопирована в буфер!", type: "success" });
              setTimeout(() => setMessage(null), 3000);
            }}
            className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 text-xs font-bold transition shrink-0 self-start sm:self-center shadow-sm"
          >
            Скопировать ссылку
          </button>
        </div>
      )}

      {/* Hero Header */}
      <div className="relative rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-[#091325] via-[#0d1c3a] to-[#070e1c] border border-blue-500/40 shadow-2xl shadow-blue-500/10">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-widest">
              <span>👑</span>
              <span>Панель администратора: Danislon_Zombovich</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              УПРАВЛЕНИЕ ТУРНИРОМ: <span className="cyber-blue-text">{tournament?.title}</span>
            </h1>

            <p className="text-xs text-slate-300 leading-relaxed">
              Формат: <b className="text-white">{tournament?.format === "double_elimination" ? "Double Elimination" : tournament?.format === "single_elimination" ? "Single Elimination" : tournament?.format}</b> • 
              Слотов команд: <b className="text-cyan-400">{participantCap}</b> • 
              Гранд Финал: <b className="text-white">{tournament?.grand_final_format || "1-2 matches"}</b> • 
              Жетонов перековки на участника: <b className="text-amber-400">{tournament?.initial_rerolls || 20}</b>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleSeedDemoData}
              className="px-4 py-2.5 rounded-xl bg-blue-900/60 hover:bg-blue-800 border border-blue-500/40 text-cyan-200 text-xs font-bold uppercase tracking-wider transition disabled:opacity-50"
            >
              👥 4 Команды TI (Демо-сид)
            </button>

            <button
              type="button"
              disabled={actionLoading}
              onClick={handleResetTournament}
              className="px-4 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-xs font-bold uppercase tracking-wider transition disabled:opacity-50"
            >
              🔄 Сброс турнира
            </button>
          </div>
        </div>

        {message && (
          <div
            className={`mt-4 p-3 rounded-lg text-xs font-bold flex items-center justify-between ${
              message.type === "success"
                ? "bg-emerald-950/80 border border-emerald-500/40 text-emerald-300"
                : "bg-red-950/80 border border-red-500/40 text-red-300"
            }`}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="text-xs opacity-70 hover:opacity-100">✕</button>
          </div>
        )}
      </div>

      {/* Control Grid: 3 Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Step 1: Teams */}
        <div className="rounded-2xl border border-blue-900/50 bg-[#091122]/95 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-cyan-400 tracking-wider">Шаг 1: Команды</span>
            <span className="text-xs font-mono font-bold text-slate-300 bg-black/50 px-2 py-0.5 rounded border border-blue-900">
              {teams.length} / {participantCap}
            </span>
          </div>

          <h2 className="text-base font-black text-white">Участники турнира</h2>
          <p className="text-xs text-slate-400">
            Зарегистрированные команды и сиды для генерации сетки.
          </p>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {teams.map((t, idx) => (
              <div key={t.id || idx} className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-blue-900/60 text-xs">
                <span className="font-bold text-white truncate max-w-[150px]">{t.name} [{t.tag}]</span>
                <span className="text-[10px] text-cyan-400 font-mono">Слот #{t.seed || idx + 1}</span>
              </div>
            ))}
            {teams.length === 0 && (
              <div className="p-3 text-center text-xs text-slate-500 bg-black/30 rounded-lg">
                В турнире пока нет зарегистрированных команд. Нажмите «4 Команды TI» выше для демо.
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={actionLoading || teams.length < 2}
            onClick={handlePublishBracket}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 transition disabled:opacity-40"
          >
            ⚡ Сформировать и выложить сетку
          </button>
        </div>

        {/* Step 2: Locks */}
        <div className="rounded-2xl border border-blue-900/50 bg-[#091122]/95 p-6 shadow-xl space-y-4">
          <span className="text-xs font-black uppercase text-cyan-400 tracking-wider">Шаг 2: Блокировка</span>
          <h2 className="text-base font-black text-white">Фэнтези и Прогнозы</h2>
          <p className="text-xs text-slate-400">
            Закрывайте прием прогнозов и изменений карточек фэнтези перед началом игр.
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/40 border border-blue-900/60 text-xs">
              <span className="text-slate-300">Фэнтези:</span>
              <span className={`font-bold ${tournament?.is_fantasy_locked ? "text-rose-400" : "text-emerald-400"}`}>
                {tournament?.is_fantasy_locked ? "🔒 Заблокировано" : "🟢 Открыто"}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/40 border border-blue-900/60 text-xs">
              <span className="text-slate-300">Прогнозы (Pick&apos;ems):</span>
              <span className={`font-bold ${tournament?.is_predictions_locked ? "text-rose-400" : "text-emerald-400"}`}>
                {tournament?.is_predictions_locked ? "🔒 Заблокировано" : "🟢 Открыто"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => handleToggleLock(true, true)}
              className="py-2 px-3 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-500/40 text-rose-200 text-xs font-bold transition"
            >
              🔒 Закрыть оба
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => handleToggleLock(false, false)}
              className="py-2 px-3 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-200 text-xs font-bold transition"
            >
              🔓 Открыть оба
            </button>
          </div>
        </div>

        {/* Step 3: Stage Management */}
        <div className="rounded-2xl border border-blue-900/50 bg-[#091122]/95 p-6 shadow-xl space-y-4">
          <span className="text-xs font-black uppercase text-cyan-400 tracking-wider">Шаг 3: Стадия турнира</span>
          <h2 className="text-base font-black text-white">Статус и прогресс</h2>

          <div className="p-3 rounded-xl bg-black/40 border border-blue-900/60 text-xs space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Текущий статус:</span>
              <span className={`font-extrabold uppercase px-2 py-0.5 rounded text-[10px] ${
                tournament?.status === "registration"
                  ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                  : tournament?.status === "ongoing"
                  ? "bg-blue-950 text-cyan-300 border border-blue-500/40"
                  : "bg-slate-800 text-slate-300"
              }`}>
                {tournament?.status === "registration" ? "Регистрация" : tournament?.status === "ongoing" ? "Идет турнир" : "Завершен"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Матчей в сетке:</span>
              <span className="font-bold text-white">{matches.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Сыграно матчей:</span>
              <span className="font-bold text-emerald-400">
                {completedMatchesCount} / {matches.length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleChangeStatus("registration")}
              disabled={actionLoading || tournament?.status === "registration"}
              className="flex-1 py-1.5 px-2 rounded-lg bg-[#0e1c38] hover:bg-blue-900/50 border border-blue-900 text-[11px] font-bold text-slate-300 disabled:opacity-40"
            >
              Регистрация
            </button>
            <button
              type="button"
              onClick={() => handleChangeStatus("ongoing")}
              disabled={actionLoading || tournament?.status === "ongoing"}
              className="flex-1 py-1.5 px-2 rounded-lg bg-blue-900/50 hover:bg-blue-800 border border-blue-500/40 text-[11px] font-bold text-cyan-300 disabled:opacity-40"
            >
              Идет
            </button>
            <button
              type="button"
              onClick={() => handleChangeStatus("completed")}
              disabled={actionLoading || tournament?.status === "completed"}
              className="flex-1 py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-bold text-slate-300 disabled:opacity-40"
            >
              Завершен
            </button>
          </div>
        </div>
      </div>

      {/* Matches Grid and Result Entry */}
      <div className="rounded-2xl border border-blue-900/50 bg-[#091122]/95 p-6 shadow-xl space-y-5">
        <div className="border-b border-blue-900/60 pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span>🎮</span>
              <span>Матчи сетки: {tournament?.title}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Кликните по матчу для завершения серии Bo3, расчета очков фэнтези и продвижения команд по турнирной сетке.
            </p>
          </div>

          <span className="text-xs font-mono font-bold text-cyan-400 bg-blue-950/80 px-2.5 py-1 rounded-lg border border-cyan-500/30">
            {matches.length} матчей
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches.map((m) => {
            const hasTeams = Boolean(m.team1_id && m.team2_id);
            const isCompleted = m.status === "completed";

            return (
              <div
                key={m.id}
                className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition ${
                  isCompleted
                    ? "bg-slate-900/40 border-blue-950"
                    : hasTeams
                    ? "bg-[#0d182e] border-blue-500/40 hover:border-cyan-400 shadow-md"
                    : "bg-black/20 border-blue-950"
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-cyan-400">{m.match_code}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isCompleted ? "bg-slate-800 text-slate-400" : "bg-emerald-950 text-emerald-300"
                    }`}
                  >
                    {isCompleted ? "Завершен" : "Готов к игре"}
                  </span>
                </div>

                <div className="text-center py-1">
                  <span className="text-xs text-slate-400 block">{m.round_name}</span>
                  <div className="flex items-center justify-center gap-3 mt-2">
                    <span className="font-black text-white text-sm">
                      {m.team1_tag || "TBD"}
                    </span>
                    <span className="text-cyan-400 font-extrabold text-sm">
                      {isCompleted ? `${m.team1_score} : ${m.team2_score}` : "vs"}
                    </span>
                    <span className="font-black text-white text-sm">
                      {m.team2_tag || "TBD"}
                    </span>
                  </div>
                </div>

                {hasTeams && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMatch(m);
                      setT1Score(2);
                      setT2Score(0);
                      setWinnerId(m.team1_id || "");
                    }}
                    className={`w-full py-1.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                      isCompleted
                        ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        : "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20"
                    }`}
                  >
                    {isCompleted ? "Пересчитать матч" : "Завершить матч"}
                  </button>
                )}
              </div>
            );
          })}

          {matches.length === 0 && (
            <div className="col-span-3 p-8 text-center text-slate-500 text-xs">
              Для турнира &laquo;{tournament?.title}&raquo; сетка еще не сформирована. Нажмите &laquo;Сформировать и выложить сетку&raquo; выше.
            </div>
          )}
        </div>
      </div>

      {/* Match Result Entry Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#091122] border border-blue-500/50 rounded-2xl p-6 shadow-2xl space-y-5">
            <button
              onClick={() => setSelectedMatch(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition text-lg"
            >
              ✕
            </button>

            <div className="text-center">
              <span className="text-xs font-black text-cyan-400 uppercase tracking-widest">
                Результат матча {selectedMatch.match_code}
              </span>
              <h3 className="text-xl font-black text-white mt-1">
                {selectedMatch.team1_tag} против {selectedMatch.team2_tag}
              </h3>
              <p className="text-xs text-slate-400 mt-1">{selectedMatch.round_name}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  Точный счет серии Bo3:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setT1Score(2);
                      setT2Score(0);
                      setWinnerId(selectedMatch.team1_id!);
                    }}
                    className={`p-2.5 rounded-lg border text-xs font-black transition ${
                      t1Score === 2 && t2Score === 0
                        ? "bg-cyan-500 text-black border-cyan-400"
                        : "bg-[#0d182e] border-blue-900/60 text-slate-300"
                    }`}
                  >
                    {selectedMatch.team1_tag} (2 : 0)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setT1Score(2);
                      setT2Score(1);
                      setWinnerId(selectedMatch.team1_id!);
                    }}
                    className={`p-2.5 rounded-lg border text-xs font-black transition ${
                      t1Score === 2 && t2Score === 1
                        ? "bg-cyan-500 text-black border-cyan-400"
                        : "bg-[#0d182e] border-blue-900/60 text-slate-300"
                    }`}
                  >
                    {selectedMatch.team1_tag} (2 : 1)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setT1Score(0);
                      setT2Score(2);
                      setWinnerId(selectedMatch.team2_id!);
                    }}
                    className={`p-2.5 rounded-lg border text-xs font-black transition ${
                      t1Score === 0 && t2Score === 2
                        ? "bg-cyan-500 text-black border-cyan-400"
                        : "bg-[#0d182e] border-blue-900/60 text-slate-300"
                    }`}
                  >
                    {selectedMatch.team2_tag} (0 : 2)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setT1Score(1);
                      setT2Score(2);
                      setWinnerId(selectedMatch.team2_id!);
                    }}
                    className={`p-2.5 rounded-lg border text-xs font-black transition ${
                      t1Score === 1 && t2Score === 2
                        ? "bg-cyan-500 text-black border-cyan-400"
                        : "bg-[#0d182e] border-blue-900/60 text-slate-300"
                    }`}
                  >
                    {selectedMatch.team2_tag} (1 : 2)
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-950/70 border border-blue-500/30 text-xs space-y-1">
                <span className="font-bold text-cyan-300 block">⚡ Автоматический расчет очков:</span>
                <p className="text-slate-300 text-[11px]">
                  При завершении будут сгенерированы реалистичные показатели TI 2026 для всех 10 игроков матча (Kills, Deaths, CS, GPM, Wards, Roshan, FB). Бонусы перекованных карточек пользователей умножат и начислят очки в реальном времени!
                </p>
              </div>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleSubmitMatchResult(true)}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 transition disabled:opacity-50"
              >
                {actionLoading ? "Расчет и сохранение..." : "Подтвердить победу и рассчитать очки"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-4 border-blue-500/20 border-t-cyan-400 rounded-full animate-spin"></div>
        </div>
      }
    >
      <AdminContent />
    </Suspense>
  );
}
