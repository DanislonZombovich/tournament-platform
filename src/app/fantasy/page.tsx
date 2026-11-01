"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  FantasyEmblem,
  ROLE_CONFIGS,
  VALVE_FANTASY_EMBLEMS,
} from "@/lib/fantasy";

interface FantasyPlayer {
  player_id: string;
  username: string;
  steam_id: string | null;
  steam_name: string | null;
  steam_avatar: string | null;
  team_id: string;
  team_name: string;
  team_tag: string;
  team_logo: string | null;
}

interface FantasyCardData {
  id: string;
  role_slot: string;
  selected_player_id: string | null;
  emblems: string[];
  emblem_details: FantasyEmblem[];
  points_earned: number;
  games_played: number;
  game_scores: number[];
  selected_player: FantasyPlayer | null;
}

interface TournamentOption {
  id: string;
  title: string;
}

function FantasyContent() {
  const searchParams = useSearchParams();
  const initialTournamentId = searchParams.get("tournament_id") || "ti-2026-main";

  const [currentTournId, setCurrentTournId] = useState(initialTournamentId);
  const [tournaments, setTournaments] = useState<TournamentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    tournament: any;
    is_fantasy_locked: boolean;
    fantasy_tokens: number;
    cards: FantasyCardData[];
    players_by_role: Record<string, FantasyPlayer[]>;
    all_emblems: FantasyEmblem[];
  } | null>(null);

  const [activePlayerModalRole, setActivePlayerModalRole] = useState<string | null>(null);
  const [activeEmblemModalRole, setActiveEmblemModalRole] = useState<string | null>(null);
  const [tempEmblems, setTempEmblems] = useState<string[]>([]);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
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

  const fetchFantasy = async (tournId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/fantasy?tournament_id=${encodeURIComponent(tournId)}`);
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
    fetchTournaments();
  }, []);

  useEffect(() => {
    fetchFantasy(currentTournId);
  }, [currentTournId]);

  const handleSelectPlayer = async (roleSlot: string, playerId: string | null) => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/fantasy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "select_player",
          role_slot: roleSlot,
          player_id: playerId,
          tournament_id: currentTournId,
        }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Ошибка сохранения игрока");

      setMessage({ text: resJson.message || "Игрок назначен!", type: "success" });
      setActivePlayerModalRole(null);
      await fetchFantasy(currentTournId);
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEmblemModal = (roleSlot: string, currentEmblems: string[]) => {
    setActiveEmblemModalRole(roleSlot);
    setTempEmblems([...currentEmblems]);
  };

  const handleToggleEmblem = (emblemId: string) => {
    if (tempEmblems.includes(emblemId)) {
      setTempEmblems(tempEmblems.filter((id) => id !== emblemId));
    } else {
      if (tempEmblems.length >= 3) {
        setMessage({ text: "Можно выбрать не более 3 эмблем для одного игрока", type: "error" });
        return;
      }
      setTempEmblems([...tempEmblems, emblemId]);
    }
  };

  const handleSaveEmblems = async () => {
    if (!activeEmblemModalRole) return;
    if (tempEmblems.length !== 3) {
      setMessage({ text: "Необходимо выбрать ровно 3 эмблемы", type: "error" });
      return;
    }

    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/fantasy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_emblems",
          role_slot: activeEmblemModalRole,
          emblems: tempEmblems,
          tournament_id: currentTournId,
        }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Ошибка сохранения эмблем");

      setMessage({ text: resJson.message || "Эмблемы сохранены!", type: "success" });
      setActiveEmblemModalRole(null);
      await fetchFantasy(currentTournId);
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const totalFantasyPoints = (data?.cards || []).reduce(
    (acc, card) => acc + (card.points_earned || 0),
    0
  );

  const allEmblemsList = data?.all_emblems || Object.values(VALVE_FANTASY_EMBLEMS);
  const redEmblems = allEmblemsList.filter((e) => e.color === "red");
  const blueEmblems = allEmblemsList.filter((e) => e.color === "blue");
  const greenEmblems = allEmblemsList.filter((e) => e.color === "green");

  return (
    <div className="min-h-screen bg-[#060c18] text-slate-100 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-900/40 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-3xl">🏆</span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-wider text-white uppercase">
                Фэнтези-лига Valve Compendium
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Поставьте 3 эмблемы каждому игроку. Очки начисляются по формуле Valve за{" "}
              <span className="text-cyan-400 font-bold">лучшую игру</span> турнира с обычным модификатором 100%.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={currentTournId}
              onChange={(e) => setCurrentTournId(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-[#0d1a33] border border-blue-500/30 text-white text-xs sm:text-sm font-semibold focus:outline-none focus:border-cyan-400 transition"
            >
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>

            <button
              onClick={() => setRulesOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-blue-950/60 hover:bg-blue-900/60 border border-blue-500/40 text-cyan-300 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition shadow-sm"
            >
              <span>📜</span>
              <span>Правила и формула</span>
            </button>
          </div>
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl border text-sm font-medium flex items-center justify-between transition animate-fade-in ${
              message.type === "success"
                ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-200"
                : "bg-rose-950/70 border-rose-500/50 text-rose-200"
            }`}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="text-xs opacity-75 hover:opacity-100">
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#091224] border border-blue-900/50 shadow-lg relative overflow-hidden">
            <div className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">
              Сумма очков фэнтези
            </div>
            <div className="text-3xl font-black text-cyan-400 tracking-tight">
              {totalFantasyPoints.toLocaleString("ru-RU")}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Идет напрямую в глобальный лидерборд</div>
          </div>

          <div className="p-5 rounded-2xl bg-[#091224] border border-blue-900/50 shadow-lg">
            <div className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">
              Модификатор эмблем
            </div>
            <div className="text-3xl font-black text-emerald-400 tracking-tight">
              100%
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Обычный модификатор для всех показателей</div>
          </div>

          <div className="p-5 rounded-2xl bg-[#091224] border border-blue-900/50 shadow-lg">
            <div className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">
              Правило подсчета
            </div>
            <div className="text-2xl font-black text-amber-400 tracking-tight">
              Лучшая игра
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Наибольший результат среди всех сыгранных матчей</div>
          </div>

          <div className="p-5 rounded-2xl bg-[#091224] border border-blue-900/50 shadow-lg">
            <div className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">
              Статус ростера
            </div>
            <div className="text-2xl font-black text-white tracking-tight">
              {data?.is_fantasy_locked ? (
                <span className="text-rose-400">Заблокирован 🔒</span>
              ) : (
                <span className="text-emerald-400">Открыт ⚡</span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {data?.is_fantasy_locked ? "Матчи идут, составы зафиксированы" : "Вы можете менять игроков и эмблемы"}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm text-slate-400">Загрузка данных фэнтези...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-slate-200">
                Ваш фэнтези-ростер (5 позиций)
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
              {(data?.cards || []).map((card) => {
                const roleConfig = ROLE_CONFIGS[card.role_slot] || {
                  label: card.role_slot.toUpperCase(),
                  group: "core",
                  order: 1,
                };
                const player = card.selected_player;

                return (
                  <div
                    key={card.id}
                    className="flex flex-col justify-between rounded-2xl bg-[#0a1428] border border-blue-900/60 p-5 shadow-xl hover:border-cyan-500/50 transition relative overflow-hidden"
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-blue-950 pb-3 mb-4">
                        <span className="text-xs font-black uppercase tracking-wider text-cyan-400">
                          {roleConfig.label}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800/40">
                          3 эмблемы
                        </span>
                      </div>

                      <div className="mb-4">
                        {player ? (
                          <div className="p-3 rounded-xl bg-[#070e1c] border border-blue-900/40 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-11 h-11 rounded-lg bg-slate-800 border border-cyan-500/30 overflow-hidden flex-shrink-0 flex items-center justify-center font-black text-cyan-300">
                                {player.steam_avatar ? (
                                  <img
                                    src={player.steam_avatar}
                                    alt={player.username}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  player.username.slice(0, 2).toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-white truncate">
                                  {player.username}
                                </div>
                                <div className="text-[11px] text-cyan-400 font-semibold truncate">
                                  [{player.team_tag}] {player.team_name}
                                </div>
                              </div>
                            </div>

                            {!data?.is_fantasy_locked && (
                              <button
                                onClick={() => setActivePlayerModalRole(card.role_slot)}
                                className="text-xs text-slate-400 hover:text-white underline flex-shrink-0"
                              >
                                Сменить
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => setActivePlayerModalRole(card.role_slot)}
                            disabled={data?.is_fantasy_locked}
                            className="w-full py-4 rounded-xl border border-dashed border-blue-700/50 bg-[#070e1c]/60 hover:bg-[#070e1c] hover:border-cyan-400/70 text-xs font-bold text-cyan-300 transition flex flex-col items-center justify-center gap-1.5"
                          >
                            <span className="text-xl">➕</span>
                            <span>Выбрать игрока на слот</span>
                          </button>
                        )}
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
                          <span>Выбранные эмблемы</span>
                          <span className="text-emerald-400 text-[10px]">100% модификатор</span>
                        </div>

                        <div className="space-y-1.5">
                          {card.emblems.map((emblemId) => {
                            const emblem = VALVE_FANTASY_EMBLEMS[emblemId];
                            if (!emblem) return null;
                            const colorClass =
                              emblem.color === "red"
                                ? "border-red-500/40 bg-red-950/30 text-red-300"
                                : emblem.color === "blue"
                                ? "border-sky-500/40 bg-sky-950/30 text-sky-300"
                                : "border-emerald-500/40 bg-emerald-950/30 text-emerald-300";

                            return (
                              <div
                                key={emblem.id}
                                className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center justify-between ${colorClass}`}
                              >
                                <div className="flex items-center gap-1.5 font-bold truncate">
                                  <span className="w-2 h-2 rounded-full bg-current flex-shrink-0" />
                                  <span className="truncate">{emblem.label}</span>
                                </div>
                                <span className="text-[10px] font-semibold opacity-90 ml-2 flex-shrink-0">
                                  {emblem.unit}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {!data?.is_fantasy_locked && (
                          <button
                            onClick={() => handleOpenEmblemModal(card.role_slot, card.emblems)}
                            className="w-full mt-2 py-1.5 px-3 rounded-lg bg-blue-950/70 hover:bg-blue-900 border border-blue-500/30 text-cyan-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
                          >
                            <span>⚙️</span>
                            <span>Настроить 3 эмблемы</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-blue-950 mt-2">
                      <div className="text-[11px] text-slate-400 font-semibold flex items-center justify-between mb-1">
                        <span>Очки лучшей игры</span>
                        <span className="text-cyan-400 font-bold">
                          {card.games_played > 0 ? `${card.games_played} ${card.games_played === 1 ? "игра" : "игры"}` : "0 игр"}
                        </span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-amber-400">
                        {card.points_earned.toLocaleString("ru-RU")}
                      </div>

                      {card.game_scores && card.game_scores.length > 1 && (
                        <div className="text-[10px] text-slate-500 mt-1 truncate">
                          Игры: {card.game_scores.map((sc) => sc.toLocaleString("ru-RU")).join(" | ")}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activePlayerModalRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-xl bg-[#091224] border border-blue-500/40 rounded-2xl p-6 shadow-2xl">
              <button
                onClick={() => setActivePlayerModalRole(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
              >
                ✕
              </button>

              <h3 className="text-lg font-black text-white uppercase tracking-wider mb-2">
                Выбор игрока: {ROLE_CONFIGS[activePlayerModalRole]?.label || activePlayerModalRole}
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Выберите игрока, участвующего в этом турнире. За него будут начисляться очки по формуле лучшей игры.
              </p>

              <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                {(data?.players_by_role[activePlayerModalRole] || []).map((p) => (
                  <div
                    key={p.player_id}
                    className="p-3 rounded-xl bg-[#060c18] border border-blue-900/40 hover:border-cyan-500/60 flex items-center justify-between gap-3 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-800 border border-cyan-500/30 overflow-hidden flex items-center justify-center font-bold text-cyan-300">
                        {p.steam_avatar ? (
                          <img src={p.steam_avatar} alt={p.username} className="w-full h-full object-cover" />
                        ) : (
                          p.username.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{p.username}</div>
                        <div className="text-xs text-cyan-400 font-semibold">
                          [{p.team_tag}] {p.team_name}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSelectPlayer(activePlayerModalRole, p.player_id)}
                      disabled={actionLoading}
                      className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition shadow-sm"
                    >
                      Выбрать
                    </button>
                  </div>
                ))}

                {(data?.players_by_role[activePlayerModalRole] || []).length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-500">
                    На данную роль пока нет зарегистрированных игроков в турнире.
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center">
                <button
                  onClick={() => handleSelectPlayer(activePlayerModalRole, null)}
                  disabled={actionLoading}
                  className="text-xs text-rose-400 hover:text-rose-300 font-bold"
                >
                  Очистить слот игрока
                </button>
                <button
                  onClick={() => setActivePlayerModalRole(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        )}

        {activeEmblemModalRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-3xl bg-[#091224] border border-blue-500/40 rounded-2xl p-6 shadow-2xl max-h-[90vh] flex flex-col">
              <button
                onClick={() => setActiveEmblemModalRole(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
              >
                ✕
              </button>

              <div className="mb-4">
                <h3 className="text-lg font-black text-white uppercase tracking-wider">
                  Выбор 3 эмблем: {ROLE_CONFIGS[activeEmblemModalRole]?.label || activeEmblemModalRole}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Выберите ровно <span className="text-cyan-400 font-bold">3 эмблемы</span> из официального списка Valve.
                  У всех эмблем действует обычный модификатор 100%. Очки за матч начисляются по формуле Valve.
                </p>
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-950/80 border border-blue-600/30 text-xs font-bold text-cyan-300">
                  <span>Выбрано эмблем:</span>
                  <span className={tempEmblems.length === 3 ? "text-emerald-400 font-black" : "text-amber-400 font-black"}>
                    {tempEmblems.length} / 3
                  </span>
                </div>
              </div>

              <div className="overflow-y-auto space-y-5 pr-2 flex-1">
                <div>
                  <div className="text-xs font-black uppercase text-red-400 tracking-wider mb-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span>Красные эмблемы (Бой и экономика)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {redEmblems.map((emblem) => {
                      const isSelected = tempEmblems.includes(emblem.id);
                      return (
                        <button
                          key={emblem.id}
                          type="button"
                          onClick={() => handleToggleEmblem(emblem.id)}
                          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                            isSelected
                              ? "bg-red-950/70 border-red-500 text-white shadow-md shadow-red-500/20"
                              : "bg-[#060c18] border-red-900/30 text-slate-300 hover:border-red-500/50"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-red-300">{emblem.label}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950 border border-red-700/40 text-red-400 font-bold">
                              100%
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">{emblem.description}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-black uppercase text-sky-400 tracking-wider mb-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                    <span>Синие эмблемы (Обзор и карта)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {blueEmblems.map((emblem) => {
                      const isSelected = tempEmblems.includes(emblem.id);
                      return (
                        <button
                          key={emblem.id}
                          type="button"
                          onClick={() => handleToggleEmblem(emblem.id)}
                          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                            isSelected
                              ? "bg-sky-950/70 border-sky-500 text-white shadow-md shadow-sky-500/20"
                              : "bg-[#060c18] border-sky-900/30 text-slate-300 hover:border-sky-500/50"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-sky-300">{emblem.label}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 border border-sky-700/40 text-sky-400 font-bold">
                              100%
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">{emblem.description}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-black uppercase text-emerald-400 tracking-wider mb-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Зеленые эмблемы (Команда и контроль)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {greenEmblems.map((emblem) => {
                      const isSelected = tempEmblems.includes(emblem.id);
                      return (
                        <button
                          key={emblem.id}
                          type="button"
                          onClick={() => handleToggleEmblem(emblem.id)}
                          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                            isSelected
                              ? "bg-emerald-950/70 border-emerald-500 text-white shadow-md shadow-emerald-500/20"
                              : "bg-[#060c18] border-emerald-900/30 text-slate-300 hover:border-emerald-500/50"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-emerald-300">{emblem.label}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-700/40 text-emerald-400 font-bold">
                              100%
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">{emblem.description}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {tempEmblems.length === 3 ? "Готово к сохранению" : "Выберите ровно 3 эмблемы"}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveEmblemModalRole(null)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleSaveEmblems}
                    disabled={actionLoading || tempEmblems.length !== 3}
                    className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-xs font-bold text-white transition shadow-md shadow-cyan-500/20"
                  >
                    {actionLoading ? "Сохранение..." : "Сохранить 3 эмблемы"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {rulesOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-2xl bg-[#091224] border border-blue-500/40 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setRulesOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
              >
                ✕
              </button>

              <h3 className="text-xl font-black text-white uppercase tracking-wider mb-4">
                Правила фэнтези The International
              </h3>

              <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
                <div className="p-3.5 rounded-xl bg-[#060c18] border border-blue-900/40">
                  <h4 className="font-bold text-cyan-300 text-sm mb-1">1. Выбор игроков и 3 эмблем</h4>
                  <p>
                    Для каждой из 5 ролей (Керри, Мидлейнер, Оффлейнер, Частичная поддержка, Полная поддержка)
                    пользователь выбирает одного игрока и ставит ему три эмблемы.
                    У всех эмблем модификатор обычный (100%).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#060c18] border border-blue-900/40">
                  <h4 className="font-bold text-cyan-300 text-sm mb-1">2. Формула лучшей игры (Best Game)</h4>
                  <p>
                    Если игрок отыграл несколько игр или карт в турнире, пользователю начисляются очки за
                    фэнтези лучшей игры, которая была.
                    Лучшая игра определяется как наибольшее количество очков фэнтези по выбранным трем эмблемам.
                    Например, если в первой игре связка дала 10 000 очков, а во второй 20 000 — в зачет пойдет 20 000.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#060c18] border border-blue-900/40">
                  <h4 className="font-bold text-cyan-300 text-sm mb-1">3. Все 18 официальных эмблем Valve</h4>
                  <ul className="list-disc pl-5 space-y-1 mt-1 text-slate-400">
                    <li><strong className="text-red-300">Крипы:</strong> 3 очка за крипа</li>
                    <li><strong className="text-red-300">З/М:</strong> 2 очка за единицу GPM</li>
                    <li><strong className="text-red-300">Смерти:</strong> 1950 очков базово минус 195 за каждую смерть</li>
                    <li><strong className="text-red-300">Башни:</strong> 352 очка за башню</li>
                    <li><strong className="text-red-300">Убийства:</strong> 107 очков за килл</li>
                    <li><strong className="text-red-300">Безумруды:</strong> 13 очков за безумруд</li>
                    <li><strong className="text-sky-300">Стак лагерей:</strong> 234 очка за стак</li>
                    <li><strong className="text-sky-300">Руны:</strong> 141 очко за руну</li>
                    <li><strong className="text-sky-300">Лотосы:</strong> 176 очков за лотос</li>
                    <li><strong className="text-sky-300">Смотрители:</strong> 147 очков за смотрителя</li>
                    <li><strong className="text-sky-300">Варды:</strong> 117 очков за Observer Ward</li>
                    <li><strong className="text-sky-300">Смоки:</strong> 293 очка за Smoke of Deceit</li>
                    <li><strong className="text-emerald-300">Командные драки:</strong> до 2124 очков за 100% участие</li>
                    <li><strong className="text-emerald-300">Оглушения:</strong> 10 очков за секунду</li>
                    <li><strong className="text-emerald-300">Первая кровь:</strong> 1934 очка</li>
                    <li><strong className="text-emerald-300">Терзатели:</strong> 879 очков за Терзателя</li>
                    <li><strong className="text-emerald-300">Рошан:</strong> 1172 очка за Рошана</li>
                    <li><strong className="text-emerald-300">Курьеры:</strong> 703 очка за курьера</li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-[#060c18] border border-blue-900/40">
                  <h4 className="font-bold text-cyan-300 text-sm mb-1">4. Лидерборд и сетка прогнозов</h4>
                  <p>
                    Все набранные очки фэнтези отображаются в общем лидерборде.
                    Дополнительные очки также начисляются за верные прогнозы исходов матчей турнирной сетки.
                  </p>
                </div>
              </div>

              <div className="mt-5 text-right">
                <button
                  onClick={() => setRulesOpen(false)}
                  className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
                >
                  Понятно
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FantasyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#060c18] flex items-center justify-center text-slate-400 text-sm">
          Загрузка фэнтези...
        </div>
      }
    >
      <FantasyContent />
    </Suspense>
  );
}
