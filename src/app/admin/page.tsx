"use client";

import { useEffect, useState } from "react";

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
  match_order: number;
  team1_name: string | null;
  team1_tag: string | null;
  team2_name: string | null;
  team2_tag: string | null;
}

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [selectedMatch, setSelectedMatch] = useState<MatchItem | null>(null);
  const [t1Score, setT1Score] = useState<number>(2);
  const [t2Score, setT2Score] = useState<number>(0);
  const [winnerId, setWinnerId] = useState<string>("");

  const loadData = async () => {
    try {
      const [tournRes, meRes] = await Promise.all([
        fetch("/api/tournaments"),
        fetch("/api/auth/me"),
      ]);

      const tournJson = await tournRes.json();
      const meJson = await meRes.json();

      setTournament(tournJson.tournament);
      setTeams(tournJson.registered_teams || []);
      setMatches(tournJson.matches || []);
      setCurrentUser(meJson.user);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePublishBracket = async () => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish_bracket" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка генерации сетки");
      setMessage({ text: data.message, type: "success" });
      await loadData();
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleLock = async (fLock: boolean, pLock: boolean) => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_lock",
          is_fantasy_locked: fLock,
          is_predictions_locked: pLock,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка переключения блокировки");
      setMessage({ text: data.message, type: "success" });
      await loadData();
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSeedDemoData = async () => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed_demo_data" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка заполнения данных");
      setMessage({ text: data.message, type: "success" });
      await loadData();
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetTournament = async () => {
    if (!confirm("Вы уверены, что хотите сбросить сетку и результаты турнира?")) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_tournament" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка сброса");
      setMessage({ text: data.message, type: "success" });
      await loadData();
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
          winner_id: winnerId || selectedMatch.team1_id,
          generate_realistic_stats: generateStats,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка сохранения результата матча");

      setMessage({ text: data.message, type: "success" });
      setSelectedMatch(null);
      await loadData();
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin"></div>
        <p className="text-amber-300 font-bold tracking-wider text-sm">ПРОВЕРКА ПРАВ АДМИНИСТРАТОРА...</p>
      </div>
    );
  }

  if (currentUser?.role !== "admin") {
    return (
      <div className="max-w-md mx-auto p-8 rounded-2xl bg-[#0e121b] border border-red-500/40 text-center space-y-4">
        <span className="text-4xl">🚫</span>
        <h2 className="text-xl font-black text-white">Доступ ограничен</h2>
        <p className="text-xs text-slate-400">
          Данный раздел доступен только для организаторов и администраторов турнира.
        </p>
        <a
          href="/"
          className="inline-block px-4 py-2 rounded-lg bg-slate-800 text-xs font-bold text-white hover:bg-slate-700"
        >
          На главную
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="relative rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-[#170e0e] via-[#241313] to-[#121622] border-2 border-red-500/50 shadow-2xl shadow-red-500/10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-black uppercase tracking-widest mb-3">
              <span>⚡</span>
              <span>Панель управления The International 2026</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              АДМИН-ПАНЕЛЬ ТУРНИРА
            </h1>
            <p className="text-xs text-slate-300 mt-2 max-w-xl">
              Управление стадиями регистрации, публикация сетки (Double Elimination Bo3), блокировка фэнтези и ввода матчей с автоматическим начислением очков.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleSeedDemoData}
              className="px-4 py-2.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 border border-purple-500/40 text-purple-200 text-xs font-black uppercase tracking-wider transition disabled:opacity-50"
            >
              👥 4 Команды TI (Демо-сид)
            </button>

            <button
              type="button"
              disabled={actionLoading}
              onClick={handleResetTournament}
              className="px-4 py-2.5 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-300 text-xs font-black uppercase tracking-wider transition disabled:opacity-50"
            >
              Сброс турнира
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-[#0e121b]/95 p-6 shadow-xl space-y-4">
          <span className="text-xs font-black uppercase text-amber-400 tracking-wider">Шаг 1: Команды</span>
          <h2 className="text-base font-black text-white">Регистрация (4 команды)</h2>
          <p className="text-xs text-slate-400">
            Зарегистрировано: {teams.length} из 4 команд.
          </p>

          <div className="space-y-2">
            {teams.map((t, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-slate-800 text-xs">
                <span className="font-bold text-white">{t.name} [{t.tag}]</span>
                <span className="text-[10px] text-emerald-400 font-mono">Слот #{t.seed || idx + 1}</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            disabled={actionLoading || teams.length < 4}
            onClick={handlePublishBracket}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition disabled:opacity-40"
          >
            ⚡ Выложить сетку турнира
          </button>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0e121b]/95 p-6 shadow-xl space-y-4">
          <span className="text-xs font-black uppercase text-amber-400 tracking-wider">Шаг 2: Блокировка</span>
          <h2 className="text-base font-black text-white">Фэнтези и Прогнозы</h2>
          <p className="text-xs text-slate-400">
            Закрывайте прием прогнозов и изменений фэнтези перед стартом матчей турнира.
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/40 border border-slate-800 text-xs">
              <span className="text-slate-300">Фэнтези:</span>
              <span className={`font-bold ${tournament?.is_fantasy_locked ? "text-red-400" : "text-emerald-400"}`}>
                {tournament?.is_fantasy_locked ? "Заблокировано" : "Открыто"}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/40 border border-slate-800 text-xs">
              <span className="text-slate-300">Прогнозы (Pick&apos;ems):</span>
              <span className={`font-bold ${tournament?.is_predictions_locked ? "text-red-400" : "text-emerald-400"}`}>
                {tournament?.is_predictions_locked ? "Заблокировано" : "Открыто"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => handleToggleLock(true, true)}
              className="py-2 px-3 rounded-lg bg-red-950 hover:bg-red-900 border border-red-500/40 text-red-200 text-xs font-bold transition"
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

        <div className="rounded-2xl border border-slate-800 bg-[#0e121b]/95 p-6 shadow-xl space-y-4">
          <span className="text-xs font-black uppercase text-amber-400 tracking-wider">Шаг 3: Автоматизация</span>
          <h2 className="text-base font-black text-white">Статус турнира</h2>
          <div className="p-3 rounded-xl bg-black/40 border border-slate-800 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Стадия:</span>
              <span className="font-bold text-amber-400 uppercase">{tournament?.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Матчей в сетке:</span>
              <span className="font-bold text-white">{matches.length} / 6</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Сыграно:</span>
              <span className="font-bold text-emerald-400">
                {matches.filter((m) => m.status === "completed").length} / 6
              </span>
            </div>
          </div>

          <a
            href="/"
            className="block text-center py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition"
          >
            Посмотреть live-сетку →
          </a>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-[#0e121b]/95 p-6 shadow-xl space-y-5">
        <div className="border-b border-slate-800 pb-3">
          <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
            <span>🎮</span>
            <span>Матчи сетки и ввод результатов</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Выберите матч для ввода счета (Bo3) и статистики игроков. Система автоматически начислит очки фэнтези карточкам, рассчитает прогнозы пользователей и продвинет победителей по сетке.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches.map((m) => {
            const hasTeams = !!(m.team1_id && m.team2_id);
            const isCompleted = m.status === "completed";

            return (
              <div
                key={m.id}
                className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition ${
                  isCompleted
                    ? "bg-slate-900/40 border-slate-800"
                    : hasTeams
                    ? "bg-[#141a27] border-amber-500/40 hover:border-amber-400"
                    : "bg-black/20 border-slate-800/60"
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-amber-400">{m.match_code}</span>
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
                    <span className="text-amber-400 font-extrabold text-sm">
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
                        : "bg-amber-500 hover:bg-amber-400 text-black shadow-md shadow-amber-500/20"
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
              Сетка еще не создана. Нажмите &quot;Выложить сетку турнира&quot; выше.
            </div>
          )}
        </div>
      </div>

      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#0e121b] border-2 border-amber-500/50 rounded-2xl p-6 shadow-2xl space-y-5">
            <button
              onClick={() => setSelectedMatch(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
            >
              ✕
            </button>

            <div className="text-center">
              <span className="text-xs font-black text-amber-400 uppercase tracking-widest">
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
                        ? "bg-amber-400 text-black border-amber-400"
                        : "bg-slate-900 border-slate-800 text-slate-300"
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
                        ? "bg-amber-400 text-black border-amber-400"
                        : "bg-slate-900 border-slate-800 text-slate-300"
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
                        ? "bg-amber-400 text-black border-amber-400"
                        : "bg-slate-900 border-slate-800 text-slate-300"
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
                        ? "bg-amber-400 text-black border-amber-400"
                        : "bg-slate-900 border-slate-800 text-slate-300"
                    }`}
                  >
                    {selectedMatch.team2_tag} (1 : 2)
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1">
                <span className="font-bold text-amber-300 block">⚡ Автоматический расчет очков:</span>
                <p className="text-slate-300 text-[11px]">
                  При завершении будут сгенерированы реалистичные показатели TI 2026 для всех 10 игроков матча (Kills, Deaths, CS, GPM, Wards, Roshan, FB). Бонусы перекованных карточек пользователей умножат и начислят очки в реальном времени!
                </p>
              </div>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleSubmitMatchResult(true)}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
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
