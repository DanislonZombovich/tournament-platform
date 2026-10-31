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

export default function PredictionsPage() {
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

  const fetchPredictions = async () => {
    try {
      const res = await fetch("/api/predictions");
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, []);

  const handleScoreSelect = (matchId: string, winnerId: string, s1: number, s2: number) => {
    setPendingSelections((prev) => ({
      ...prev,
      [matchId]: { winnerId, s1, s2 },
    }));
  };

  const handleSavePrediction = async (matchId: string) => {
    const sel = pendingSelections[matchId];
    if (!sel) return;

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
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Ошибка сохранения прогноза");
      setMessage({ text: resData.message || "Прогноз успешно сохранен!", type: "success" });
      await fetchPredictions();
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setSavingMatchId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin"></div>
        <p className="text-amber-300 font-bold tracking-wider text-sm">ЗАГРУЗКА ПРОГНОЗОВ...</p>
      </div>
    );
  }

  const isLocked = data?.is_predictions_locked ?? false;
  const matches = data?.matches || [];
  const totalPredictionPoints = matches.reduce(
    (acc, m) => acc + (m.user_prediction?.points_awarded || 0),
    0
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="relative rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-[#17130b] via-[#241a0d] to-[#121622] border-2 border-amber-500/50 shadow-2xl shadow-amber-500/10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-widest mb-3">
              <span>🎯</span>
              <span>Pick&apos;ems The International 2026</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              ПРОГНОЗЫ НА МАТЧИ
            </h1>
            <p className="text-xs text-slate-300 mt-2 max-w-xl">
              Угадайте победителя матча (+5 очков) и точный счет серии Bo3 (+5 очков). За каждый матч можно получить до 10 очков в таблицу лидеров!
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center px-5 py-3 rounded-xl bg-black/60 border border-amber-500/40">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Набрано очков</span>
              <span className="text-2xl font-black text-amber-400 mt-0.5">{totalPredictionPoints} PTS</span>
            </div>

            <div className="flex flex-col items-center px-5 py-3 rounded-xl bg-black/60 border border-amber-500/40">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Статус</span>
              <span
                className={`text-xs font-black uppercase px-2.5 py-1 rounded mt-1.5 ${
                  isLocked
                    ? "bg-red-950/80 text-red-300 border border-red-500/40"
                    : "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                }`}
              >
                {isLocked ? "Заблокировано" : "Прием открыт"}
              </span>
            </div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {matches.map((m) => {
          const hasTeams = !!(m.team1_id && m.team2_id);
          const currentPred = m.user_prediction;
          const pending = pendingSelections[m.id];
          const activeWinner = pending ? pending.winnerId : currentPred?.predicted_winner_id;
          const activeS1 = pending ? pending.s1 : currentPred?.predicted_team1_score;
          const activeS2 = pending ? pending.s2 : currentPred?.predicted_team2_score;
          const hasPendingChange = !!pending;

          return (
            <div
              key={m.id}
              className={`rounded-xl border p-5 bg-[#0e131d]/90 backdrop-blur-md flex flex-col justify-between gap-4 transition shadow-xl ${
                m.status === "completed"
                  ? "border-slate-800"
                  : "border-amber-500/30 hover:border-amber-500/60"
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-black text-xs">
                    {m.match_code}
                  </span>
                  <span className="text-xs font-bold text-slate-300">{m.round_name}</span>
                </div>

                <div className="flex items-center gap-2">
                  {m.status === "completed" && (
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold">
                      Завершен ({m.team1_score} : {m.team2_score})
                    </span>
                  )}
                  {currentPred?.is_calculated && (
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-black">
                      +{currentPred.points_awarded} PTS
                    </span>
                  )}
                </div>
              </div>

              {hasTeams ? (
                <div className="flex items-center justify-between gap-4 py-2">
                  <div
                    className={`flex-1 flex flex-col items-center p-3 rounded-xl border text-center transition ${
                      activeWinner === m.team1_id
                        ? "bg-amber-500/10 border-amber-400"
                        : "bg-black/30 border-slate-800"
                    }`}
                  >
                    {m.team1_logo && (
                      <img src={m.team1_logo} alt={m.team1_tag || ""} className="w-12 h-12 object-contain mb-2" />
                    )}
                    <span className="text-xs font-black text-white">{m.team1_tag}</span>
                    <span className="text-[10px] text-slate-400">{m.team1_name}</span>
                  </div>

                  <div className="flex flex-col items-center justify-center shrink-0">
                    <span className="text-xs font-black text-amber-500/80">VS</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase mt-1">Best of 3</span>
                  </div>

                  <div
                    className={`flex-1 flex flex-col items-center p-3 rounded-xl border text-center transition ${
                      activeWinner === m.team2_id
                        ? "bg-amber-500/10 border-amber-400"
                        : "bg-black/30 border-slate-800"
                    }`}
                  >
                    {m.team2_logo && (
                      <img src={m.team2_logo} alt={m.team2_tag || ""} className="w-12 h-12 object-contain mb-2" />
                    )}
                    <span className="text-xs font-black text-white">{m.team2_tag}</span>
                    <span className="text-[10px] text-slate-400">{m.team2_name}</span>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                  Команды определятся по итогам предыдущих раундов
                </div>
              )}

              {hasTeams && !isLocked && m.status === "pending" && (
                <div className="space-y-3 pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                    Выберите точный счет серии Bo3:
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleScoreSelect(m.id, m.team1_id!, 2, 0)}
                      className={`p-2 rounded-lg border text-xs font-extrabold transition ${
                        activeWinner === m.team1_id && activeS1 === 2 && activeS2 === 0
                          ? "bg-amber-400 text-black border-amber-400 shadow-md shadow-amber-500/20"
                          : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      {m.team1_tag} (2 : 0)
                    </button>

                    <button
                      type="button"
                      onClick={() => handleScoreSelect(m.id, m.team1_id!, 2, 1)}
                      className={`p-2 rounded-lg border text-xs font-extrabold transition ${
                        activeWinner === m.team1_id && activeS1 === 2 && activeS2 === 1
                          ? "bg-amber-400 text-black border-amber-400 shadow-md shadow-amber-500/20"
                          : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      {m.team1_tag} (2 : 1)
                    </button>

                    <button
                      type="button"
                      onClick={() => handleScoreSelect(m.id, m.team2_id!, 0, 2)}
                      className={`p-2 rounded-lg border text-xs font-extrabold transition ${
                        activeWinner === m.team2_id && activeS1 === 0 && activeS2 === 2
                          ? "bg-amber-400 text-black border-amber-400 shadow-md shadow-amber-500/20"
                          : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      {m.team2_tag} (0 : 2)
                    </button>

                    <button
                      type="button"
                      onClick={() => handleScoreSelect(m.id, m.team2_id!, 1, 2)}
                      className={`p-2 rounded-lg border text-xs font-extrabold transition ${
                        activeWinner === m.team2_id && activeS1 === 1 && activeS2 === 2
                          ? "bg-amber-400 text-black border-amber-400 shadow-md shadow-amber-500/20"
                          : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      {m.team2_tag} (1 : 2)
                    </button>
                  </div>

                  {hasPendingChange && (
                    <button
                      type="button"
                      disabled={savingMatchId === m.id}
                      onClick={() => handleSavePrediction(m.id)}
                      className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 text-black font-black text-xs uppercase tracking-wider transition hover:from-amber-300 hover:to-amber-400 shadow-lg shadow-amber-500/20"
                    >
                      {savingMatchId === m.id ? "Сохранение..." : "Сохранить прогноз"}
                    </button>
                  )}
                </div>
              )}

              {currentPred && !hasPendingChange && (
                <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800 text-xs flex items-center justify-between">
                  <span className="text-slate-400">Ваш текущий прогноз:</span>
                  <span className="font-extrabold text-amber-400">
                    {currentPred.predicted_winner_id === m.team1_id ? m.team1_tag : m.team2_tag}{" "}
                    ({currentPred.predicted_team1_score} : {currentPred.predicted_team2_score})
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {matches.length === 0 && (
          <div className="col-span-2 p-12 text-center text-slate-400 text-sm bg-slate-900/50 rounded-2xl border border-slate-800">
            Сетка турнира еще не сформирована администратором.
          </div>
        )}
      </div>
    </div>
  );
}
