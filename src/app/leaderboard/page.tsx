"use client";

import { useEffect, useState } from "react";

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  steam_id: string | null;
  steam_name: string | null;
  steam_avatar: string | null;
  fantasy_points: number;
  prediction_points: number;
  total_points: number;
}

export default function LeaderboardPage() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardEntry | null>(null);
  const [tournaments, setTournaments] = useState<{ id: string; title: string }[]>([]);
  const [selectedTournId, setSelectedTournId] = useState<string>("ti-2026-main");

  useEffect(() => {
    fetch("/api/tournaments")
      .then((res) => res.json())
      .then((data) => {
        if (data.tournaments) {
          setTournaments(data.tournaments.map((t: any) => ({ id: t.id, title: t.title })));
        }
      })
      .catch(() => {});
  }, []);

  const fetchLeaderboard = (tournId: string) => {
    setLoading(true);
    fetch(`/api/leaderboard?tournament_id=${encodeURIComponent(tournId)}`)
      .then((res) => res.json())
      .then((data) => {
        setEntries(data.leaderboard || []);
        setCurrentUserRank(data.current_user_rank || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLeaderboard(selectedTournId);
  }, [selectedTournId]);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="relative rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-[#091325] via-[#0d1c3a] to-[#070e1c] border border-blue-500/40 shadow-2xl shadow-blue-500/10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-cyan-300 text-xs font-bold uppercase tracking-widest mb-3">
              <span>👑</span>
              <span>Danislon Tournaments Hall of Fame</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              ТАБЛИЦА ЛИДЕРОВ
            </h1>
            <p className="text-xs text-slate-300 mt-2 max-w-xl">
              Общий зачет по сумме очков ролевого фэнтези и прогнозов на матчи турниров платформы.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto justify-end">
            <div className="flex items-center gap-2 bg-[#091122]/90 border border-blue-500/30 rounded-xl px-3 py-2">
              <span className="text-[11px] font-bold uppercase text-slate-400">Турнир:</span>
              <select
                value={selectedTournId}
                onChange={(e) => setSelectedTournId(e.target.value)}
                className="bg-transparent text-xs font-extrabold text-cyan-300 focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-[#091122] text-white">Все турниры</option>
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id} className="bg-[#091122] text-white">
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            {currentUserRank && (
              <div className="flex items-center gap-4 p-3.5 rounded-xl bg-black/60 border border-cyan-400 shadow-xl shadow-cyan-500/10">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-cyan-500/30">
                  #{currentUserRank.rank}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Ваша позиция</span>
                  <span className="text-sm font-black text-white">{currentUserRank.username}</span>
                  <span className="text-xs font-mono font-bold text-cyan-400">{currentUserRank.total_points} очков</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-cyan-400 animate-spin"></div>
          <p className="text-cyan-300 font-bold tracking-wider text-sm">ОБНОВЛЕНИЕ ТАБЛИЦЫ ЛИДЕРОВ...</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-blue-900/50 bg-[#091122]/95 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0c162b] text-slate-400 uppercase tracking-wider font-bold border-b border-blue-900/60">
                <tr>
                  <th className="py-3.5 px-4 w-16 text-center">Ранг</th>
                  <th className="py-3.5 px-4">Участник</th>
                  <th className="py-3.5 px-4 text-right">Фэнтези</th>
                  <th className="py-3.5 px-4 text-right">Прогнозы</th>
                  <th className="py-3.5 px-4 text-right font-black text-white">Всего</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-950">
                {entries.map((entry) => {
                  const isTop1 = entry.rank === 1;
                  const isTop3 = entry.rank <= 3;

                  return (
                    <tr
                      key={entry.user_id}
                      className={`hover:bg-blue-950/40 transition ${
                        isTop1
                          ? "bg-cyan-950/20"
                          : isTop3
                          ? "bg-blue-950/10"
                          : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center font-black">
                        {isTop1 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-cyan-400 text-black font-black text-xs shadow-md shadow-cyan-400/30">
                            1
                          </span>
                        ) : entry.rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300 text-black font-black text-xs shadow-md">
                            2
                          </span>
                        ) : entry.rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-400 text-black font-black text-xs shadow-md">
                            3
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">#{entry.rank}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {entry.steam_avatar ? (
                            <img
                              src={entry.steam_avatar}
                              alt={entry.username}
                              className="w-8 h-8 rounded-lg object-cover border border-blue-900"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-blue-900/60 flex items-center justify-center text-xs font-black text-cyan-300">
                              {entry.username.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="font-extrabold text-sm text-white flex items-center gap-2">
                              {entry.username}
                              {entry.steam_id && (
                                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 px-1 rounded border border-emerald-500/30">
                                  Steam ✓
                                </span>
                              )}
                            </span>
                            {entry.steam_name && (
                              <span className="text-[10px] text-slate-400">{entry.steam_name}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-300">
                        {entry.fantasy_points} pts
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-300">
                        {entry.prediction_points} pts
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-black text-sm text-cyan-300">
                        {entry.total_points}
                      </td>
                    </tr>
                  );
                })}

                {entries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      Участники пока не набрали очков.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
