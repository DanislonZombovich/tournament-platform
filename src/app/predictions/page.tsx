"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

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
  team1_logo: string | null;
  team2_name: string | null;
  team2_tag: string | null;
  team2_logo: string | null;
  user_prediction: {
    predicted_winner_id: string;
    predicted_team1_score: number;
    predicted_team2_score: number;
    points_awarded: number;
    is_calculated: boolean;
  } | null;
}

interface TournamentOption {
  id: string;
  title: string;
}

function PredictionsContent() {
  const searchParams = useSearchParams();
  const initialTournamentId = searchParams.get("tournament_id") || "ti-2026-main";

  const [currentTournId, setCurrentTournId] = useState(initialTournamentId);
  const [tournaments, setTournaments] = useState<TournamentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    tournament: any;
    is_predictions_locked: boolean;
    matches: MatchItem[];
  } | null>(null);

  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);
  const [pendingSelections, setPendingSelections] = useState<
    Record<string, { winnerId: string; s1: number; s2: number }>
  >({});
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchTournaments = async () => {
    try {
      const res = await fetch("/api/tournaments");
      const json = await res.json();
      if (json.tournaments) {
        setTournaments(json.tournaments.map((t: any) => ({ id: t.id, title: t.title })));
      }
    } catch {}
  };

  const fetchPredictions = async (tournId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/predictions?tournament_id=${encodeURIComponent(tournId)}`);
      const json = await res.json();
      if (res.ok) {
        const predMap = new Map((json.user_predictions || []).map((p: any) => [p.match_id, p]));
        const matchesWithUserPreds = (json.matches || []).map((m: any) => ({
          ...m,
          user_prediction: predMap.get(m.id) || null,
        }));

        setData({
          tournament: json.tournament,
          is_predictions_locked: json.is_predictions_locked,
          matches: matchesWithUserPreds,
        });

        const initialPending: Record<string, { winnerId: string; s1: number; s2: number }> = {};
        for (const m of matchesWithUserPreds) {
          if (m.user_prediction) {
            initialPending[m.id] = {
              winnerId: m.user_prediction.predicted_winner_id,
              s1: m.user_prediction.predicted_team1_score,
              s2: m.user_prediction.predicted_team2_score,
            };
          } else {
            initialPending[m.id] = {
              winnerId: m.team1_id || "",
              s1: 2,
              s2: 0,
            };
          }
        }
        setPendingSelections(initialPending);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    fetchPredictions(currentTournId);
  }, [currentTournId]);

  const handleSavePrediction = async (matchId: string) => {
    const sel = pendingSelections[matchId];
    if (!sel || !sel.winnerId) return;

    setSavingMatchId(matchId);
    setMessage(null);

    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_id: matchId,
          predicted_winner_id: sel.winnerId,
          predicted_team1_score: sel.s1,
          predicted_team2_score: sel.s2,
          tournament_id: currentTournId,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Ошибка сохранения прогноза");

      setMessage({ text: "Прогноз успешно сохранен!", type: "success" });
      await fetchPredictions(currentTournId);
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setSavingMatchId(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-cyan-400 animate-spin"></div>
        <p className="text-cyan-300 font-bold tracking-wider text-sm">ЗАГРУЗКА ПРОГНОЗОВ...</p>
      </div>
    );
  }

  const isLocked = data?.is_predictions_locked ?? false;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Tournament Selector */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#0a1324] border border-blue-900/50">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Прогнозы для турнира:</span>
          <select
            value={currentTournId}
            onChange={(e) => setCurrentTournId(e.target.value)}
            className="px-3.5 py-1.5 rounded-xl bg-[#0e1a33] border border-blue-500/40 text-xs font-bold text-cyan-300 focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>

        <div className="px-3.5 py-1.5 rounded-xl bg-blue-950/70 border border-blue-500/30 text-xs font-bold text-cyan-300">
          🎯 Линейная шкала: 1-й угаданный: 500 (+500 за счет) • 2-й: 1000 (+1000) • 3-й: 1500 (+1500)...
        </div>
      </div>

      {/* Hero Header */}
      <div className="relative rounded-3xl overflow-hidden border border-blue-500/30 bg-[#081020] p-6 sm:p-10 shadow-2xl shadow-blue-500/10">
        <div className="absolute inset-0 opacity-25">
          <img src="/banner.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#060a14] via-[#081020]/90 to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider">
            <span>🎯</span>
            <span>Pick&apos;ems & Bracket Predictions</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            ПРОГНОЗЫ НА <span className="cyber-blue-text">МАТЧИ ТУРНИРА</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Делайте прогнозы на исходы матчей и точный счет серии. Очки растут линейно за каждый правильно угаданный матч (500, 1000, 1500... и столько же бонусом за точный счет) и суммируются с очками фэнтези в таблице лидеров.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold ${
            message.type === "success"
              ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-200"
              : "bg-red-950/80 border-red-500/40 text-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Matches List */}
      <div className="space-y-4">
        {(data?.matches || []).map((m) => {
          const isCompleted = m.status === "completed";
          const currentSel = pendingSelections[m.id] || { winnerId: "", s1: 2, s2: 0 };
          const userPred = m.user_prediction;

          return (
            <div
              key={m.id}
              className="p-5 rounded-2xl bg-[#091122] border border-blue-900/50 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg hover:border-blue-500/40 transition"
            >
              <div className="space-y-1 text-center md:text-left min-w-[180px]">
                <span className="text-xs font-mono font-bold text-cyan-400 block">{m.match_code}</span>
                <span className="font-extrabold text-sm text-white block">{m.round_name}</span>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                    isCompleted
                      ? "bg-slate-800 text-slate-300"
                      : "bg-blue-950 text-cyan-300 border border-blue-500/40"
                  }`}
                >
                  {isCompleted ? "Матч завершен" : "Ожидает начала"}
                </span>
              </div>

              {/* Teams & Score Predictor */}
              <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-6 w-full">
                {/* Team 1 */}
                <div
                  onClick={() => {
                    if (!isCompleted && !isLocked && m.team1_id) {
                      setPendingSelections((prev) => ({
                        ...prev,
                        [m.id]: { winnerId: m.team1_id!, s1: 2, s2: 1 },
                      }));
                    }
                  }}
                  className={`flex-1 p-3 rounded-xl border transition cursor-pointer text-center sm:text-left flex items-center justify-between gap-3 ${
                    currentSel.winnerId === m.team1_id
                      ? "bg-blue-950/70 border-cyan-400 shadow-md shadow-cyan-500/10"
                      : "bg-[#0d182e] border-blue-900/60 hover:border-blue-500/40"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {m.team1_logo ? (
                      <img src={m.team1_logo} alt="" className="w-7 h-7 rounded object-contain" />
                    ) : (
                      <div className="w-7 h-7 rounded bg-blue-900/60 flex items-center justify-center text-xs font-bold text-cyan-300">
                        {m.team1_tag || "?"}
                      </div>
                    )}
                    <span className="font-extrabold text-xs text-white truncate">{m.team1_name || "TBD"}</span>
                  </div>

                  {!isCompleted && !isLocked ? (
                    <select
                      value={currentSel.s1}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setPendingSelections((prev) => ({
                          ...prev,
                          [m.id]: {
                            ...currentSel,
                            s1: val,
                            winnerId: val > currentSel.s2 ? m.team1_id || "" : currentSel.winnerId,
                          },
                        }));
                      }}
                      className="px-2 py-1 rounded bg-[#070d18] border border-blue-800 font-mono text-xs font-bold text-cyan-300"
                    >
                      <option value={0}>0</option>
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                    </select>
                  ) : (
                    <span className="font-mono font-bold text-sm text-cyan-300">{m.team1_score}</span>
                  )}
                </div>

                <span className="font-mono text-slate-500 text-xs font-bold">VS</span>

                {/* Team 2 */}
                <div
                  onClick={() => {
                    if (!isCompleted && !isLocked && m.team2_id) {
                      setPendingSelections((prev) => ({
                        ...prev,
                        [m.id]: { winnerId: m.team2_id!, s1: 1, s2: 2 },
                      }));
                    }
                  }}
                  className={`flex-1 p-3 rounded-xl border transition cursor-pointer text-center sm:text-left flex items-center justify-between gap-3 ${
                    currentSel.winnerId === m.team2_id
                      ? "bg-blue-950/70 border-cyan-400 shadow-md shadow-cyan-500/10"
                      : "bg-[#0d182e] border-blue-900/60 hover:border-blue-500/40"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {m.team2_logo ? (
                      <img src={m.team2_logo} alt="" className="w-7 h-7 rounded object-contain" />
                    ) : (
                      <div className="w-7 h-7 rounded bg-blue-900/60 flex items-center justify-center text-xs font-bold text-cyan-300">
                        {m.team2_tag || "?"}
                      </div>
                    )}
                    <span className="font-extrabold text-xs text-white truncate">{m.team2_name || "TBD"}</span>
                  </div>

                  {!isCompleted && !isLocked ? (
                    <select
                      value={currentSel.s2}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setPendingSelections((prev) => ({
                          ...prev,
                          [m.id]: {
                            ...currentSel,
                            s2: val,
                            winnerId: val > currentSel.s1 ? m.team2_id || "" : currentSel.winnerId,
                          },
                        }));
                      }}
                      className="px-2 py-1 rounded bg-[#070d18] border border-blue-800 font-mono text-xs font-bold text-cyan-300"
                    >
                      <option value={0}>0</option>
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                    </select>
                  ) : (
                    <span className="font-mono font-bold text-sm text-cyan-300">{m.team2_score}</span>
                  )}
                </div>
              </div>

              {/* Action / Result */}
              <div className="min-w-[140px] text-center md:text-right">
                {isCompleted ? (
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-emerald-400 block">
                      +{userPred?.points_awarded || 0} pts
                    </span>
                    <span className="text-[10px] text-slate-500 block">Матч завершен</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleSavePrediction(m.id)}
                    disabled={isLocked || savingMatchId === m.id || !m.team1_id || !m.team2_id}
                    className="w-full sm:w-auto py-2 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-xs uppercase tracking-wider shadow-md shadow-blue-500/20 transition disabled:opacity-40"
                  >
                    {savingMatchId === m.id ? "Запись..." : userPred ? "Обновить" : "Сохранить"}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {(data?.matches || []).length === 0 && (
          <div className="p-12 text-center rounded-2xl bg-[#091122] border border-blue-900/40 text-xs text-slate-400">
            В этом турнире пока нет матчей для прогнозирования.
          </div>
        )}
      </div>
    </div>
  );
}

export default function PredictionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-cyan-400 animate-spin"></div>
        </div>
      }
    >
      <PredictionsContent />
    </Suspense>
  );
}
