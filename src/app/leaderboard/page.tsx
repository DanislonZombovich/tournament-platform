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

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((res) => res.json())
      .then((data) => {
        setEntries(data.leaderboard || []);
        setCurrentUserRank(data.current_user_rank || null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin"></div>
        <p className="text-amber-300 font-bold tracking-wider text-sm">ЗАГРУЗКА ТАБЛИЦЫ ЛИДЕРОВ...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="relative rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-[#17130b] via-[#241a0d] to-[#121622] border-2 border-amber-500/50 shadow-2xl shadow-amber-500/10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-widest mb-3">
              <span>👑</span>
              <span>Hall of Fame The International 2026</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              ТАБЛИЦА ЛИДЕРОВ
            </h1>
            <p className="text-xs text-slate-300 mt-2 max-w-xl">
              Общий зачет по сумме очков фэнтези карточек и прогнозов на матчи сетки The International 2026.
            </p>
          </div>

          {currentUserRank && (
            <div className="flex items-center gap-4 p-4 rounded-xl bg-black/60 border-2 border-amber-400 shadow-xl shadow-amber-500/10">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black font-black text-xl shadow-lg shadow-amber-500/30">
                #{currentUserRank.rank}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">Ваше место</span>
                <span className="text-sm font-extrabold text-white">{currentUserRank.username}</span>
                <span className="text-xs font-bold text-amber-300 mt-0.5">
                  {currentUserRank.total_points} PTS
                  <span className="text-slate-400 font-normal text-[10px] ml-1">
                    (F: {currentUserRank.fantasy_points} | P: {currentUserRank.prediction_points})
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-[#0c1017]/90 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-black/40 text-[11px] font-black tracking-wider text-slate-400 uppercase">
                <th className="py-3.5 px-4 text-center w-16">Ранг</th>
                <th className="py-3.5 px-4">Участник</th>
                <th className="py-3.5 px-4 text-center">Steam ID</th>
                <th className="py-3.5 px-4 text-right">Очки фэнтези</th>
                <th className="py-3.5 px-4 text-right">Очки прогнозов</th>
                <th className="py-3.5 px-4 text-right">Всего очков</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {entries.map((entry) => {
                const isCurrent = currentUserRank?.user_id === entry.user_id;

                return (
                  <tr
                    key={entry.user_id}
                    className={`transition ${
                      isCurrent
                        ? "bg-amber-500/10 hover:bg-amber-500/15"
                        : "hover:bg-slate-800/30"
                    }`}
                  >
                    <td className="py-3.5 px-4 text-center">
                      {entry.rank === 1 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-black font-black text-xs shadow-md shadow-amber-500/30">
                          🥇
                        </span>
                      ) : entry.rank === 2 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300 text-black font-black text-xs">
                          🥈
                        </span>
                      ) : entry.rank === 3 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700 text-white font-black text-xs">
                          🥉
                        </span>
                      ) : (
                        <span className="font-bold text-slate-400">#{entry.rank}</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {entry.steam_avatar ? (
                          <img
                            src={entry.steam_avatar}
                            alt={entry.username}
                            className="w-8 h-8 rounded-lg object-cover border border-amber-500/30"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-amber-400">
                            {entry.username.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className={`font-extrabold ${isCurrent ? "text-amber-300" : "text-white"}`}>
                            {entry.username} {isCurrent && "(Вы)"}
                          </span>
                          {entry.steam_name && (
                            <span className="text-[10px] text-slate-400">{entry.steam_name}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {entry.steam_id ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-[10px] text-emerald-300 font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          {entry.steam_id}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-600">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-slate-300">
                      {entry.fantasy_points}
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-slate-300">
                      {entry.prediction_points}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span className="font-black text-sm text-amber-400">
                        {entry.total_points}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {entries.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Участники еще не зарегистрированы.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
